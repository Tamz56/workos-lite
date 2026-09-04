import type Database from "better-sqlite3";
import {
    createInitialLaneCheckpoint,
    createSuccessorLaneCheckpoint,
    type CoordinationCheckpointContinuityPayload,
    type CoordinationCheckpointSnapshot,
    type NewCheckpointOpenItem,
    type NewCheckpointOpenItemExit,
} from "./checkpoint";
import { resolveCoordinationProjectLane } from "./laneResolver";

export const COORDINATION_CHECKPOINT_WRITER_INVALID =
    "COORDINATION_CHECKPOINT_WRITER_INVALID" as const;

export class CoordinationCheckpointWriterError extends Error {
    readonly code = COORDINATION_CHECKPOINT_WRITER_INVALID;

    constructor(detail: string) {
        super(`${COORDINATION_CHECKPOINT_WRITER_INVALID}: ${detail}`);
        this.name = "CoordinationCheckpointWriterError";
    }
}

export type GovernedInitialCheckpointRequest = {
    projectSlug: string;
    laneKey: string;
    id: string;
    continuity: CoordinationCheckpointContinuityPayload;
    openItems: NewCheckpointOpenItem[];
    provenance: string;
};

export type GovernedSuccessorCheckpointRequest = {
    projectSlug: string;
    laneKey: string;
    id: string;
    expectedPredecessorCheckpointId: string;
    continuity: CoordinationCheckpointContinuityPayload;
    openItems: NewCheckpointOpenItem[];
    openItemExits: NewCheckpointOpenItemExit[];
    provenance: string;
};

const REQUEST_KEYS = new Set([
    "projectSlug",
    "laneKey",
    "id",
    "continuity",
    "openItems",
    "provenance",
]);

const SUCCESSOR_REQUEST_KEYS = new Set([
    "projectSlug",
    "laneKey",
    "id",
    "expectedPredecessorCheckpointId",
    "continuity",
    "openItems",
    "openItemExits",
    "provenance",
]);
const CONTINUITY_KEYS = new Set([
    "blocker",
    "cross_lane_pending",
    "do_not_reopen",
    "next_exact_action",
]);
const OPEN_ITEM_KEYS = new Set(["openItemId", "itemOrdinal", "summary", "continuityKind"]);
const OPEN_ITEM_EXIT_KEYS = new Set([
    "openItemId",
    "exitDisposition",
    "exitNote",
    "replacementOpenItemId",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, allowed: Set<string>): boolean {
    return Object.keys(value).every((key) => allowed.has(key));
}

function isJsonValue(value: unknown): boolean {
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(isJsonValue);
    return isRecord(value) && Object.values(value).every(isJsonValue);
}

function requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new CoordinationCheckpointWriterError(`${field} must be a non-empty string`);
    }
    return value;
}

function parseContinuity(value: unknown): CoordinationCheckpointContinuityPayload {
    if (!isRecord(value) || !hasExactKeys(value, CONTINUITY_KEYS)) {
        throw new CoordinationCheckpointWriterError("continuity contains unsupported fields");
    }
    for (const key of CONTINUITY_KEYS) {
        if (!(key in value) || !isJsonValue(value[key])) {
            throw new CoordinationCheckpointWriterError(`continuity.${key} must be a JSON value`);
        }
    }
    return value as CoordinationCheckpointContinuityPayload;
}

function parseOpenItems(value: unknown): NewCheckpointOpenItem[] {
    if (!Array.isArray(value)) {
        throw new CoordinationCheckpointWriterError("openItems must be an array");
    }
    return value.map((item, index) => {
        if (!isRecord(item) || !hasExactKeys(item, OPEN_ITEM_KEYS)) {
            throw new CoordinationCheckpointWriterError(`openItems[${index}] contains unsupported fields`);
        }
        const openItemId = requireNonEmptyString(item.openItemId, `openItems[${index}].openItemId`);
        const summary = requireNonEmptyString(item.summary, `openItems[${index}].summary`);
        if (!Number.isInteger(item.itemOrdinal) || (item.itemOrdinal as number) <= 0) {
            throw new CoordinationCheckpointWriterError(`openItems[${index}].itemOrdinal must be a positive integer`);
        }
        if (item.continuityKind !== "ADDED") {
            throw new CoordinationCheckpointWriterError(`openItems[${index}].continuityKind must be ADDED for an initial checkpoint`);
        }
        return {
            openItemId,
            itemOrdinal: item.itemOrdinal as number,
            summary,
            continuityKind: "ADDED",
        };
    });
}

function parseSuccessorOpenItems(value: unknown): NewCheckpointOpenItem[] {
    if (!Array.isArray(value)) {
        throw new CoordinationCheckpointWriterError("openItems must be an array");
    }

    return value.map((item, index) => {
        if (!isRecord(item) || !hasExactKeys(item, OPEN_ITEM_KEYS)) {
            throw new CoordinationCheckpointWriterError(`openItems[${index}] contains unsupported fields`);
        }

        const openItemId = requireNonEmptyString(item.openItemId, `openItems[${index}].openItemId`);
        const summary = requireNonEmptyString(item.summary, `openItems[${index}].summary`);

        if (!Number.isInteger(item.itemOrdinal) || (item.itemOrdinal as number) <= 0) {
            throw new CoordinationCheckpointWriterError(
                `openItems[${index}].itemOrdinal must be a positive integer`,
            );
        }

        if (item.continuityKind !== "ADDED" && item.continuityKind !== "RETAINED") {
            throw new CoordinationCheckpointWriterError(
                `openItems[${index}].continuityKind must be ADDED or RETAINED`,
            );
        }

        return {
            openItemId,
            itemOrdinal: item.itemOrdinal as number,
            summary,
            continuityKind: item.continuityKind,
        };
    });
}

function parseOpenItemExits(value: unknown): NewCheckpointOpenItemExit[] {
    if (!Array.isArray(value)) {
        throw new CoordinationCheckpointWriterError("openItemExits must be an array");
    }

    return value.map((exit, index) => {
        if (!isRecord(exit) || !hasExactKeys(exit, OPEN_ITEM_EXIT_KEYS)) {
            throw new CoordinationCheckpointWriterError(
                `openItemExits[${index}] contains unsupported fields`,
            );
        }

        const openItemId = requireNonEmptyString(
            exit.openItemId,
            `openItemExits[${index}].openItemId`,
        );
        const exitNote = requireNonEmptyString(
            exit.exitNote,
            `openItemExits[${index}].exitNote`,
        );

        if (
            exit.exitDisposition !== "RESOLVED"
            && exit.exitDisposition !== "WITHDRAWN"
            && exit.exitDisposition !== "REPLACED"
        ) {
            throw new CoordinationCheckpointWriterError(
                `openItemExits[${index}].exitDisposition is unsupported`,
            );
        }

        if (exit.exitDisposition === "REPLACED") {
            return {
                openItemId,
                exitDisposition: "REPLACED",
                exitNote,
                replacementOpenItemId: requireNonEmptyString(
                    exit.replacementOpenItemId,
                    `openItemExits[${index}].replacementOpenItemId`,
                ),
            };
        }

        if (
            exit.replacementOpenItemId !== undefined
            && exit.replacementOpenItemId !== null
        ) {
            throw new CoordinationCheckpointWriterError(
                `openItemExits[${index}].replacementOpenItemId is only allowed for REPLACED`,
            );
        }

        return {
            openItemId,
            exitDisposition: exit.exitDisposition,
            exitNote,
            replacementOpenItemId: null,
        };
    });
}

export function parseGovernedInitialCheckpointRequest(raw: unknown): GovernedInitialCheckpointRequest {
    if (!isRecord(raw) || !hasExactKeys(raw, REQUEST_KEYS)) {
        throw new CoordinationCheckpointWriterError("request contains unsupported fields");
    }
    for (const key of REQUEST_KEYS) {
        if (!(key in raw)) {
            throw new CoordinationCheckpointWriterError(`${key} is required`);
        }
    }
    return {
        projectSlug: requireNonEmptyString(raw.projectSlug, "projectSlug"),
        laneKey: requireNonEmptyString(raw.laneKey, "laneKey"),
        id: requireNonEmptyString(raw.id, "id"),
        continuity: parseContinuity(raw.continuity),
        openItems: parseOpenItems(raw.openItems),
        provenance: requireNonEmptyString(raw.provenance, "provenance"),
    };
}

export function parseGovernedSuccessorCheckpointRequest(
    raw: unknown,
): GovernedSuccessorCheckpointRequest {
    if (!isRecord(raw) || !hasExactKeys(raw, SUCCESSOR_REQUEST_KEYS)) {
        throw new CoordinationCheckpointWriterError("request contains unsupported fields");
    }

    for (const key of SUCCESSOR_REQUEST_KEYS) {
        if (!(key in raw)) {
            throw new CoordinationCheckpointWriterError(`${key} is required`);
        }
    }

    return {
        projectSlug: requireNonEmptyString(raw.projectSlug, "projectSlug"),
        laneKey: requireNonEmptyString(raw.laneKey, "laneKey"),
        id: requireNonEmptyString(raw.id, "id"),
        expectedPredecessorCheckpointId: requireNonEmptyString(
            raw.expectedPredecessorCheckpointId,
            "expectedPredecessorCheckpointId",
        ),
        continuity: parseContinuity(raw.continuity),
        openItems: parseSuccessorOpenItems(raw.openItems),
        openItemExits: parseOpenItemExits(raw.openItemExits),
        provenance: requireNonEmptyString(raw.provenance, "provenance"),
    };
}

/**
 * Bounded Human-governed writer: it resolves the Lane server-side and delegates
 * all checkpoint persistence/currentness semantics to the frozen core.
 */
export function createGovernedInitialLaneCheckpoint(
    db: Database.Database,
    rawRequest: unknown,
): CoordinationCheckpointSnapshot {
    const request = parseGovernedInitialCheckpointRequest(rawRequest);
    const lane = resolveCoordinationProjectLane(db, request.projectSlug, request.laneKey);
    return createInitialLaneCheckpoint(db, {
        id: request.id,
        laneId: lane.laneId,
        continuity: request.continuity,
        openItems: request.openItems,
        provenance: request.provenance,
    });
}

/**
 * Bounded Human-governed successor writer: Project/Lane identity is resolved
 * server-side; lineage mutation remains exclusively owned by the frozen core.
 */
export function createGovernedSuccessorLaneCheckpoint(
    db: Database.Database,
    rawRequest: unknown,
): CoordinationCheckpointSnapshot {
    const request = parseGovernedSuccessorCheckpointRequest(rawRequest);
    const lane = resolveCoordinationProjectLane(db, request.projectSlug, request.laneKey);

    return createSuccessorLaneCheckpoint(db, {
        id: request.id,
        laneId: lane.laneId,
        expectedPredecessorCheckpointId: request.expectedPredecessorCheckpointId,
        continuity: request.continuity,
        openItems: request.openItems,
        openItemExits: request.openItemExits,
        provenance: request.provenance,
    });
}
