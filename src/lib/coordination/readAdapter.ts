import type Database from "better-sqlite3";
import { CHECKPOINT_CONTINUITY_SCHEMA_VERSION } from "./checkpoint";
import {
    lookupLaneCheckpoint,
    readLaneCheckpointHistory,
    resolveCurrentLaneCheckpoint,
    resumeLaneFromValidatedCurrentCheckpoint,
    type CheckpointLookupSelector,
} from "./checkpointService";
import {
    COORDINATION_LANE_KEY,
    COORDINATION_PROJECT_SLUG,
    CoordinationLaneResolutionError,
    resolveCoordinationProjectLane,
} from "./laneResolver";

export const COORDINATION_READ_SCHEMA_VERSION = "coordination-read.v1" as const;

export const COORDINATION_READ_OPERATIONS = [
    "LOOKUP",
    "HISTORY_ACCESS",
    "CURRENT_RESOLUTION",
    "RESUME",
] as const;

export type CoordinationReadOperation = (typeof COORDINATION_READ_OPERATIONS)[number];
export type CoordinationReadAuthorityClass =
    | "NONE"
    | "HISTORICAL_ONLY"
    | "CURRENT"
    | "AUTHORITATIVE_RESUME";

export type CoordinationReadStatus =
    | "FOUND"
    | "NOT_FOUND"
    | "HISTORY"
    | "CURRENT"
    | "RESUMED"
    | "NO_CHECKPOINT_YET"
    | "PROJECT_NOT_FOUND"
    | "LANE_NOT_FOUND"
    | "EVIDENCE_UNAVAILABLE"
    | "CURRENTNESS_UNRESOLVABLE"
    | "CHECKPOINT_EVIDENCE_INVALID"
    | "UNSUPPORTED_VERSION"
    | "INVALID_ARGUMENT"
    | "UNSUPPORTED_OPERATION";

export type CoordinationReadSelector =
    | { by: "checkpoint_id"; checkpointId: string; seq?: never }
    | { by: "seq"; seq: number; checkpointId?: never };

export interface CoordinationReadRequest {
    operation: string;
    projectSlug: string;
    laneKey: string;
    selector?: CoordinationReadSelector;
}

export interface CoordinationReadIdentity {
    projectSlug: string;
    laneKey: string;
    laneId: string | null;
}

export interface CoordinationReadResult {
    schemaVersion: typeof COORDINATION_READ_SCHEMA_VERSION;
    operation: string;
    status: CoordinationReadStatus;
    authorityClass: CoordinationReadAuthorityClass;
    identity: CoordinationReadIdentity;
    data?: Record<string, unknown>;
    detail?: string;
}

type ResolvedLane = ReturnType<typeof resolveCoordinationProjectLane>;

type LaneResolution =
    | { lane: ResolvedLane }
    | { result: CoordinationReadResult };

function detailFromError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isUnsupportedContinuityDetail(detail: string): boolean {
    return detail.includes("unsupported continuity schema version");
}

export class CoordinationReadAdapter {
    constructor(private readonly db: Database.Database) {}

    execute(request: CoordinationReadRequest): CoordinationReadResult {
        const inputError = this.validateRequest(request);
        if (inputError) return inputError;

        switch (request.operation) {
            case "LOOKUP":
                return this.lookup(request.projectSlug, request.laneKey, request.selector);
            case "HISTORY_ACCESS":
                return this.history(request.projectSlug, request.laneKey);
            case "CURRENT_RESOLUTION":
                return this.current(request.projectSlug, request.laneKey);
            case "RESUME":
                return this.resume(request.projectSlug, request.laneKey);
            default:
                return this.result(
                    request.operation,
                    "UNSUPPORTED_OPERATION",
                    "NONE",
                    request.projectSlug,
                    request.laneKey,
                    null,
                    undefined,
                    `Unsupported Coordination read operation ${request.operation}`,
                );
        }
    }

    lookup(
        projectSlug: string,
        laneKey: string,
        selector: CoordinationReadSelector | undefined,
    ): CoordinationReadResult {
        const operation = "LOOKUP";
        const selectorError = this.validateSelector(projectSlug, laneKey, selector);
        if (selectorError) return selectorError;
        const resolved = this.resolveLane(operation, projectSlug, laneKey);
        if ("result" in resolved) return resolved.result;

        const coreSelector: CheckpointLookupSelector = selector?.by === "checkpoint_id"
            ? { checkpointId: selector.checkpointId }
            : { seq: selector?.seq as number };
        const result = lookupLaneCheckpoint(this.db, resolved.lane.laneId, coreSelector);
        if (result.status === "FOUND") {
            return this.result(
                operation,
                "FOUND",
                "HISTORICAL_ONLY",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
                { snapshot: result.snapshot },
            );
        }
        if (result.status === "NOT_FOUND") {
            return this.result(
                operation,
                "NOT_FOUND",
                "HISTORICAL_ONLY",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
            );
        }
        return this.result(
            operation,
            "EVIDENCE_UNAVAILABLE",
            "HISTORICAL_ONLY",
            projectSlug,
            laneKey,
            resolved.lane.laneId,
            undefined,
            result.detail,
        );
    }

    history(projectSlug: string, laneKey: string): CoordinationReadResult {
        const operation = "HISTORY_ACCESS";
        const inputError = this.validateIdentity(operation, projectSlug, laneKey);
        if (inputError) return inputError;
        const resolved = this.resolveLane(operation, projectSlug, laneKey);
        if ("result" in resolved) return resolved.result;

        const result = readLaneCheckpointHistory(this.db, resolved.lane.laneId);
        if (result.status === "HISTORY") {
            if (result.checkpoints.length === 0) {
                return this.result(
                    operation,
                    "NO_CHECKPOINT_YET",
                    "HISTORICAL_ONLY",
                    projectSlug,
                    laneKey,
                    resolved.lane.laneId,
                    { checkpoints: [] },
                );
            }
            return this.result(
                operation,
                "HISTORY",
                "HISTORICAL_ONLY",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
                { checkpoints: result.checkpoints },
            );
        }
        return this.result(
            operation,
            "EVIDENCE_UNAVAILABLE",
            "HISTORICAL_ONLY",
            projectSlug,
            laneKey,
            resolved.lane.laneId,
            undefined,
            result.detail,
        );
    }

    current(projectSlug: string, laneKey: string): CoordinationReadResult {
        const operation = "CURRENT_RESOLUTION";
        const inputError = this.validateIdentity(operation, projectSlug, laneKey);
        if (inputError) return inputError;
        const resolved = this.resolveLane(operation, projectSlug, laneKey);
        if ("result" in resolved) return resolved.result;

        // Canonical currentness is delegated exclusively to the frozen G6B core.
        const result = resolveCurrentLaneCheckpoint(this.db, resolved.lane.laneId);
        if (result.status === "CURRENT") {
            return this.result(
                operation,
                "CURRENT",
                "CURRENT",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
                {
                    checkpoint: result.checkpoint,
                    continuityCompatibility:
                        result.checkpoint.continuitySchemaVersion === CHECKPOINT_CONTINUITY_SCHEMA_VERSION
                            ? "SUPPORTED"
                            : "UNSUPPORTED_VERSION",
                },
            );
        }
        if (result.status === "NO_CHECKPOINT_YET") {
            return this.result(
                operation,
                "NO_CHECKPOINT_YET",
                "NONE",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
            );
        }
        if (result.status === "CURRENTNESS_UNRESOLVABLE") {
            return this.result(
                operation,
                "CURRENTNESS_UNRESOLVABLE",
                "NONE",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
                undefined,
                result.detail,
            );
        }
        return this.result(
            operation,
            "EVIDENCE_UNAVAILABLE",
            "NONE",
            projectSlug,
            laneKey,
            resolved.lane.laneId,
            undefined,
            result.detail,
        );
    }

    resume(projectSlug: string, laneKey: string): CoordinationReadResult {
        const operation = "RESUME";
        const inputError = this.validateIdentity(operation, projectSlug, laneKey);
        if (inputError) return inputError;
        const resolved = this.resolveLane(operation, projectSlug, laneKey);
        if ("result" in resolved) return resolved.result;

        // AUTHORITATIVE_RESUME is validated-current-only in the frozen G6B core.
        const result = resumeLaneFromValidatedCurrentCheckpoint(this.db, resolved.lane.laneId);
        if (result.status === "RESUMED") {
            return this.result(
                operation,
                "RESUMED",
                "AUTHORITATIVE_RESUME",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
                {
                    checkpoint: result.checkpoint,
                    continuity: result.continuity,
                    openItems: result.openItems,
                    openItemExits: result.openItemExits,
                },
            );
        }
        if (result.status === "NO_CHECKPOINT_YET") {
            return this.result(
                operation,
                "NO_CHECKPOINT_YET",
                "NONE",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
            );
        }
        if (result.status === "CURRENTNESS_UNRESOLVABLE") {
            return this.result(
                operation,
                "CURRENTNESS_UNRESOLVABLE",
                "NONE",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
                undefined,
                result.detail,
            );
        }
        if (result.status === "CHECKPOINT_EVIDENCE_INVALID") {
            return this.result(
                operation,
                isUnsupportedContinuityDetail(result.detail)
                    ? "UNSUPPORTED_VERSION"
                    : "CHECKPOINT_EVIDENCE_INVALID",
                "NONE",
                projectSlug,
                laneKey,
                resolved.lane.laneId,
                undefined,
                result.detail,
            );
        }
        return this.result(
            operation,
            "EVIDENCE_UNAVAILABLE",
            "NONE",
            projectSlug,
            laneKey,
            resolved.lane.laneId,
            undefined,
            result.detail,
        );
    }

    private validateRequest(request: CoordinationReadRequest): CoordinationReadResult | undefined {
        const identityError = this.validateIdentity(
            request.operation,
            request.projectSlug,
            request.laneKey,
        );
        if (identityError) return identityError;
        if (request.operation === "LOOKUP") {
            return this.validateSelector(request.projectSlug, request.laneKey, request.selector);
        }
        if (request.selector !== undefined) {
            return this.result(
                request.operation,
                "INVALID_ARGUMENT",
                "NONE",
                request.projectSlug,
                request.laneKey,
                null,
                undefined,
                `${request.operation} does not accept a checkpoint selector`,
            );
        }
        return undefined;
    }

    private validateIdentity(
        operation: string,
        projectSlug: string,
        laneKey: string,
    ): CoordinationReadResult | undefined {
        if (!COORDINATION_PROJECT_SLUG.test(projectSlug)) {
            return this.result(
                operation,
                "INVALID_ARGUMENT",
                "NONE",
                projectSlug,
                laneKey,
                null,
                undefined,
                "projectSlug must be a canonical lowercase slug",
            );
        }
        if (!COORDINATION_LANE_KEY.test(laneKey)) {
            return this.result(
                operation,
                "INVALID_ARGUMENT",
                "NONE",
                projectSlug,
                laneKey,
                null,
                undefined,
                "laneKey must be a canonical lowercase Lane key",
            );
        }
        return undefined;
    }

    private validateSelector(
        projectSlug: string,
        laneKey: string,
        selector: CoordinationReadSelector | undefined,
    ): CoordinationReadResult | undefined {
        if (!selector) {
            return this.result(
                "LOOKUP",
                "INVALID_ARGUMENT",
                "NONE",
                projectSlug,
                laneKey,
                null,
                undefined,
                "LOOKUP requires one selector",
            );
        }
        if (selector.by === "checkpoint_id") {
            if (!selector.checkpointId || selector.checkpointId.trim().length === 0) {
                return this.result(
                    "LOOKUP",
                    "INVALID_ARGUMENT",
                    "NONE",
                    projectSlug,
                    laneKey,
                    null,
                    undefined,
                    "checkpointId must be non-empty",
                );
            }
            return undefined;
        }
        if (!Number.isInteger(selector.seq) || selector.seq <= 0) {
            return this.result(
                "LOOKUP",
                "INVALID_ARGUMENT",
                "NONE",
                projectSlug,
                laneKey,
                null,
                undefined,
                "seq must be a positive integer",
            );
        }
        return undefined;
    }

    private resolveLane(
        operation: string,
        projectSlug: string,
        laneKey: string,
    ): LaneResolution {
        try {
            return { lane: resolveCoordinationProjectLane(this.db, projectSlug, laneKey) };
        } catch (error) {
            if (error instanceof CoordinationLaneResolutionError) {
                const status = error.code === "COORDINATION_PROJECT_NOT_FOUND"
                    ? "PROJECT_NOT_FOUND"
                    : error.code === "COORDINATION_LANE_NOT_FOUND"
                        ? "LANE_NOT_FOUND"
                        : "EVIDENCE_UNAVAILABLE";
                return {
                    result: this.result(
                        operation,
                        status,
                        "NONE",
                        projectSlug,
                        laneKey,
                        null,
                        undefined,
                        status === "EVIDENCE_UNAVAILABLE" ? detailFromError(error) : undefined,
                    ),
                };
            }
            return {
                result: this.result(
                    operation,
                    "EVIDENCE_UNAVAILABLE",
                    "NONE",
                    projectSlug,
                    laneKey,
                    null,
                    undefined,
                    detailFromError(error),
                ),
            };
        }
    }

    private result(
        operation: string,
        status: CoordinationReadStatus,
        authorityClass: CoordinationReadAuthorityClass,
        projectSlug: string,
        laneKey: string,
        laneId: string | null,
        data?: Record<string, unknown>,
        detail?: string,
    ): CoordinationReadResult {
        return {
            schemaVersion: COORDINATION_READ_SCHEMA_VERSION,
            operation,
            status,
            authorityClass,
            identity: { projectSlug, laneKey, laneId },
            ...(data ? { data } : {}),
            ...(detail ? { detail } : {}),
        };
    }
}
