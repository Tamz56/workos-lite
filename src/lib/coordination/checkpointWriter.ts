import type Database from "better-sqlite3";
import {
    createInitialLaneCheckpoint,
    type CoordinationCheckpointContinuityPayload,
    type CoordinationCheckpointSnapshot,
    type NewCheckpointOpenItem,
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

const REQUEST_KEYS = new Set([
    "projectSlug",
    "laneKey",
    "id",
    "continuity",
    "openItems",
    "provenance",
]);
const CONTINUITY_KEYS = new Set([
    "blocker",
    "cross_lane_pending",
    "do_not_reopen",
    "next_exact_action",
]);
const OPEN_ITEM_KEYS = new Set(["openItemId", "itemOrdinal", "summary", "continuityKind"]);

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
