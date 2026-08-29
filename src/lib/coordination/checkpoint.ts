// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G6B-I1 — Coordination Lane checkpoint persistence core.
//
// Checkpoint currentness is a U2 lineage property only. OPEN_ITEMS and the
// versioned continuity payload are checkpoint-owned evidence used by writes,
// complete-snapshot reads, and authoritative resume; they never select a
// different CURRENT checkpoint.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const CHECKPOINT_CONTINUITY_SCHEMA_VERSION =
    "coordination-checkpoint-continuity.v1" as const;

export const OPEN_ITEM_CONTINUITY_KINDS = ["RETAINED", "ADDED"] as const;
export const OPEN_ITEM_EXIT_DISPOSITIONS = [
    "RESOLVED",
    "WITHDRAWN",
    "REPLACED",
] as const;

export type OpenItemContinuityKind = (typeof OPEN_ITEM_CONTINUITY_KINDS)[number];
export type OpenItemExitDisposition = (typeof OPEN_ITEM_EXIT_DISPOSITIONS)[number];

export type JsonValue =
    | null
    | boolean
    | number
    | string
    | JsonValue[]
    | { [key: string]: JsonValue };

export type CoordinationCheckpointContinuityPayload = {
    blocker: JsonValue;
    cross_lane_pending: JsonValue;
    do_not_reopen: JsonValue;
    next_exact_action: JsonValue;
};

export type CoordinationLaneCheckpoint = {
    id: string;
    laneId: string;
    seq: number;
    supersedesCheckpointId: string | null;
    continuitySchemaVersion: string;
    continuityPayloadJson: string;
    provenance: string;
    createdAt: string;
};

export type CoordinationCheckpointOpenItem = {
    checkpointId: string;
    openItemId: string;
    itemOrdinal: number;
    summary: string;
    continuityKind: OpenItemContinuityKind;
};

export type CoordinationCheckpointOpenItemExit = {
    checkpointId: string;
    openItemId: string;
    exitDisposition: OpenItemExitDisposition;
    exitNote: string;
    replacementOpenItemId: string | null;
};

export type CoordinationCheckpointSnapshot = {
    checkpoint: CoordinationLaneCheckpoint;
    openItems: CoordinationCheckpointOpenItem[];
    openItemExits: CoordinationCheckpointOpenItemExit[];
};

export type NewCheckpointOpenItem = Omit<CoordinationCheckpointOpenItem, "checkpointId">;
export type NewCheckpointOpenItemExit = Omit<
    CoordinationCheckpointOpenItemExit,
    "checkpointId"
>;

export type NewInitialLaneCheckpoint = {
    id: string;
    laneId: string;
    continuity: CoordinationCheckpointContinuityPayload;
    openItems: NewCheckpointOpenItem[];
    provenance: string;
};

export type NewSuccessorLaneCheckpoint = NewInitialLaneCheckpoint & {
    expectedPredecessorCheckpointId: string;
    openItemExits: NewCheckpointOpenItemExit[];
};

export const COORDINATION_CHECKPOINT_INVALID = "COORDINATION_CHECKPOINT_INVALID" as const;
export const COORDINATION_CHECKPOINT_NOT_FOUND =
    "COORDINATION_CHECKPOINT_NOT_FOUND" as const;
export const COORDINATION_CHECKPOINT_STALE_SUCCESSOR =
    "COORDINATION_CHECKPOINT_STALE_SUCCESSOR" as const;
export const COORDINATION_CHECKPOINT_CURRENTNESS_UNRESOLVABLE =
    "COORDINATION_CHECKPOINT_CURRENTNESS_UNRESOLVABLE" as const;
export const COORDINATION_CHECKPOINT_EVIDENCE_INVALID =
    "COORDINATION_CHECKPOINT_EVIDENCE_INVALID" as const;

export class CoordinationCheckpointError extends Error {
    readonly code = COORDINATION_CHECKPOINT_INVALID;

    constructor(detail: string) {
        super(`${COORDINATION_CHECKPOINT_INVALID}: ${detail}`);
        this.name = "CoordinationCheckpointError";
    }
}

export class CoordinationCheckpointNotFoundError extends Error {
    readonly code = COORDINATION_CHECKPOINT_NOT_FOUND;

    constructor(detail: string) {
        super(`${COORDINATION_CHECKPOINT_NOT_FOUND}: ${detail}`);
        this.name = "CoordinationCheckpointNotFoundError";
    }
}

export class CoordinationCheckpointStaleSuccessorError extends Error {
    readonly code = COORDINATION_CHECKPOINT_STALE_SUCCESSOR;

    constructor(expected: string, actual: string) {
        super(
            `${COORDINATION_CHECKPOINT_STALE_SUCCESSOR}: expected predecessor ${expected}; validated CURRENT is ${actual}`,
        );
        this.name = "CoordinationCheckpointStaleSuccessorError";
    }
}

export class CoordinationCheckpointCurrentnessError extends Error {
    readonly code = COORDINATION_CHECKPOINT_CURRENTNESS_UNRESOLVABLE;

    constructor(detail: string) {
        super(`${COORDINATION_CHECKPOINT_CURRENTNESS_UNRESOLVABLE}: ${detail}`);
        this.name = "CoordinationCheckpointCurrentnessError";
    }
}

export class CoordinationCheckpointEvidenceError extends Error {
    readonly code = COORDINATION_CHECKPOINT_EVIDENCE_INVALID;

    constructor(detail: string) {
        super(`${COORDINATION_CHECKPOINT_EVIDENCE_INVALID}: ${detail}`);
        this.name = "CoordinationCheckpointEvidenceError";
    }
}

function requireNonEmpty(value: string, field: string): void {
    if (!value || value.trim().length === 0) {
        throw new CoordinationCheckpointError(`${field} must be non-empty`);
    }
}

function requireEvidenceNonEmpty(value: string, field: string): void {
    if (!value || value.trim().length === 0) {
        throw new CoordinationCheckpointEvidenceError(`${field} must be non-empty`);
    }
}

export function coordinationLaneExists(db: Database.Database, laneId: string): boolean {
    return db.prepare("SELECT 1 FROM coordination_lanes WHERE id = ?").get(laneId) !== undefined;
}

function requireLane(db: Database.Database, laneId: string): void {
    requireNonEmpty(laneId, "laneId");
    if (!coordinationLaneExists(db, laneId)) {
        throw new CoordinationCheckpointNotFoundError(`Lane ${laneId} does not exist`);
    }
}

function normalizeJsonValue(value: unknown, path: string): JsonValue {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new CoordinationCheckpointEvidenceError(`${path} must contain finite JSON numbers`);
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item, index) => normalizeJsonValue(item, `${path}[${index}]`));
    }
    if (typeof value === "object") {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
            throw new CoordinationCheckpointEvidenceError(`${path} must contain plain JSON objects`);
        }
        const input = value as Record<string, unknown>;
        const output: Record<string, JsonValue> = {};
        for (const key of Object.keys(input).sort()) {
            if (input[key] === undefined) {
                throw new CoordinationCheckpointEvidenceError(`${path}.${key} must not be undefined`);
            }
            output[key] = normalizeJsonValue(input[key], `${path}.${key}`);
        }
        return output;
    }
    throw new CoordinationCheckpointEvidenceError(`${path} must be JSON-compatible`);
}

export function validateContinuityPayload(
    payload: unknown,
): CoordinationCheckpointContinuityPayload {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new CoordinationCheckpointEvidenceError("continuity payload must be an object");
    }
    const normalized = normalizeJsonValue(payload, "continuity");
    if (!normalized || Array.isArray(normalized) || typeof normalized !== "object") {
        throw new CoordinationCheckpointEvidenceError("continuity payload must be an object");
    }
    const requiredKeys = [
        "blocker",
        "cross_lane_pending",
        "do_not_reopen",
        "next_exact_action",
    ];
    const actualKeys = Object.keys(normalized).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify([...requiredKeys].sort())) {
        throw new CoordinationCheckpointEvidenceError(
            `continuity payload keys must be exactly ${requiredKeys.join(", ")}`,
        );
    }
    return normalized as CoordinationCheckpointContinuityPayload;
}

export function serializeContinuityPayload(
    payload: CoordinationCheckpointContinuityPayload,
): string {
    return JSON.stringify(validateContinuityPayload(payload));
}

export function decodeContinuityPayload(
    checkpoint: CoordinationLaneCheckpoint,
): CoordinationCheckpointContinuityPayload {
    if (checkpoint.continuitySchemaVersion !== CHECKPOINT_CONTINUITY_SCHEMA_VERSION) {
        throw new CoordinationCheckpointEvidenceError(
            `unsupported continuity schema version ${checkpoint.continuitySchemaVersion}`,
        );
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(checkpoint.continuityPayloadJson) as unknown;
    } catch {
        throw new CoordinationCheckpointEvidenceError(
            `checkpoint ${checkpoint.id} continuity payload is not valid JSON`,
        );
    }
    return validateContinuityPayload(parsed);
}

export function readLaneCheckpointCores(
    db: Database.Database,
    laneId: string,
): CoordinationLaneCheckpoint[] {
    return db
        .prepare(
            `SELECT id, lane_id AS laneId, seq,
                    supersedes_checkpoint_id AS supersedesCheckpointId,
                    continuity_schema_version AS continuitySchemaVersion,
                    continuity_payload_json AS continuityPayloadJson,
                    provenance, created_at AS createdAt
             FROM coordination_lane_checkpoints
             WHERE lane_id = ?
             ORDER BY seq ASC, id ASC`,
        )
        .all(laneId) as CoordinationLaneCheckpoint[];
}

function readOpenItems(
    db: Database.Database,
    checkpointId: string,
): CoordinationCheckpointOpenItem[] {
    return db
        .prepare(
            `SELECT checkpoint_id AS checkpointId, open_item_id AS openItemId,
                    item_ordinal AS itemOrdinal, summary,
                    continuity_kind AS continuityKind
             FROM coordination_lane_checkpoint_open_items
             WHERE checkpoint_id = ?
             ORDER BY item_ordinal ASC, open_item_id ASC`,
        )
        .all(checkpointId) as CoordinationCheckpointOpenItem[];
}

function readOpenItemExits(
    db: Database.Database,
    checkpointId: string,
): CoordinationCheckpointOpenItemExit[] {
    return db
        .prepare(
            `SELECT checkpoint_id AS checkpointId, open_item_id AS openItemId,
                    exit_disposition AS exitDisposition, exit_note AS exitNote,
                    replacement_open_item_id AS replacementOpenItemId
             FROM coordination_lane_checkpoint_open_item_exits
             WHERE checkpoint_id = ?
             ORDER BY open_item_id ASC`,
        )
        .all(checkpointId) as CoordinationCheckpointOpenItemExit[];
}

export function readCheckpointSnapshot(
    db: Database.Database,
    checkpoint: CoordinationLaneCheckpoint,
): CoordinationCheckpointSnapshot {
    return {
        checkpoint,
        openItems: readOpenItems(db, checkpoint.id),
        openItemExits: readOpenItemExits(db, checkpoint.id),
    };
}

export function readLaneCheckpointSnapshots(
    db: Database.Database,
    laneId: string,
): CoordinationCheckpointSnapshot[] {
    return readLaneCheckpointCores(db, laneId).map((checkpoint) =>
        readCheckpointSnapshot(db, checkpoint),
    );
}

export function validateCheckpointCoreLineage(
    laneId: string,
    checkpoints: CoordinationLaneCheckpoint[],
): CoordinationLaneCheckpoint | null {
    if (checkpoints.length === 0) return null;

    const seenIds = new Set<string>();
    const seenSeq = new Set<number>();
    const successorCounts = new Map<string, number>();

    for (const checkpoint of checkpoints) {
        if (checkpoint.laneId !== laneId) {
            throw new CoordinationCheckpointCurrentnessError(
                `checkpoint ${checkpoint.id} belongs to Lane ${checkpoint.laneId}, not ${laneId}`,
            );
        }
        if (!Number.isInteger(checkpoint.seq) || checkpoint.seq <= 0) {
            throw new CoordinationCheckpointCurrentnessError(
                `checkpoint ${checkpoint.id} has invalid seq ${checkpoint.seq}`,
            );
        }
        if (seenIds.has(checkpoint.id)) {
            throw new CoordinationCheckpointCurrentnessError(`duplicate checkpoint id ${checkpoint.id}`);
        }
        if (seenSeq.has(checkpoint.seq)) {
            throw new CoordinationCheckpointCurrentnessError(`duplicate seq ${checkpoint.seq}`);
        }
        seenIds.add(checkpoint.id);
        seenSeq.add(checkpoint.seq);
        if (checkpoint.supersedesCheckpointId) {
            successorCounts.set(
                checkpoint.supersedesCheckpointId,
                (successorCounts.get(checkpoint.supersedesCheckpointId) ?? 0) + 1,
            );
        }
    }

    const root = checkpoints[0];
    if (root.seq !== 1 || root.supersedesCheckpointId !== null) {
        throw new CoordinationCheckpointCurrentnessError(
            "first checkpoint must be seq=1 with NULL predecessor",
        );
    }

    for (let index = 1; index < checkpoints.length; index += 1) {
        const previous = checkpoints[index - 1];
        const current = checkpoints[index];
        if (current.seq !== previous.seq + 1) {
            throw new CoordinationCheckpointCurrentnessError(
                `seq gap or collision between ${previous.id} and ${current.id}`,
            );
        }
        if (current.supersedesCheckpointId !== previous.id) {
            throw new CoordinationCheckpointCurrentnessError(
                `checkpoint ${current.id} does not supersede immediate predecessor ${previous.id}`,
            );
        }
    }

    for (const [predecessorId, count] of successorCounts) {
        if (count !== 1) {
            throw new CoordinationCheckpointCurrentnessError(
                `checkpoint ${predecessorId} has ${count} canonical successors`,
            );
        }
    }

    const terminal = checkpoints[checkpoints.length - 1];
    if ((successorCounts.get(terminal.id) ?? 0) !== 0) {
        throw new CoordinationCheckpointCurrentnessError(
            `terminal checkpoint ${terminal.id} unexpectedly has a successor`,
        );
    }

    return terminal;
}

function validateCurrentItemsShape(items: CoordinationCheckpointOpenItem[]): void {
    const ids = new Set<string>();
    const ordinals = new Set<number>();
    const sortedOrdinals: number[] = [];
    for (const item of items) {
        requireEvidenceNonEmpty(item.openItemId, "openItemId");
        requireEvidenceNonEmpty(item.summary, "summary");
        if (!OPEN_ITEM_CONTINUITY_KINDS.includes(item.continuityKind)) {
            throw new CoordinationCheckpointEvidenceError(
                `OPEN_ITEM ${item.openItemId} has invalid continuity kind`,
            );
        }
        if (!Number.isInteger(item.itemOrdinal) || item.itemOrdinal <= 0) {
            throw new CoordinationCheckpointEvidenceError(
                `OPEN_ITEM ${item.openItemId} must have a positive integer itemOrdinal`,
            );
        }
        if (ids.has(item.openItemId)) {
            throw new CoordinationCheckpointEvidenceError(
                `duplicate OPEN_ITEM identity ${item.openItemId}`,
            );
        }
        if (ordinals.has(item.itemOrdinal)) {
            throw new CoordinationCheckpointEvidenceError(
                `duplicate OPEN_ITEM ordinal ${item.itemOrdinal}`,
            );
        }
        ids.add(item.openItemId);
        ordinals.add(item.itemOrdinal);
        sortedOrdinals.push(item.itemOrdinal);
    }
    sortedOrdinals.sort((a, b) => a - b);
    sortedOrdinals.forEach((ordinal, index) => {
        if (ordinal !== index + 1) {
            throw new CoordinationCheckpointEvidenceError(
                "OPEN_ITEM ordinals must be contiguous from 1..N",
            );
        }
    });
}

function validateExitShape(exit: CoordinationCheckpointOpenItemExit): void {
    requireEvidenceNonEmpty(exit.openItemId, "exit.openItemId");
    requireEvidenceNonEmpty(exit.exitNote, "exit.exitNote");
    if (!OPEN_ITEM_EXIT_DISPOSITIONS.includes(exit.exitDisposition)) {
        throw new CoordinationCheckpointEvidenceError(
            `OPEN_ITEM ${exit.openItemId} has invalid exit disposition`,
        );
    }
    if (exit.exitDisposition === "REPLACED") {
        if (!exit.replacementOpenItemId || exit.replacementOpenItemId.trim().length === 0) {
            throw new CoordinationCheckpointEvidenceError(
                `REPLACED OPEN_ITEM ${exit.openItemId} requires replacement_open_item_id`,
            );
        }
    } else if (exit.replacementOpenItemId !== null) {
        throw new CoordinationCheckpointEvidenceError(
            `${exit.exitDisposition} OPEN_ITEM ${exit.openItemId} must not identify a replacement`,
        );
    }
}

export function validateCheckpointOpenItemsTransition(
    predecessor: CoordinationCheckpointSnapshot | null,
    current: CoordinationCheckpointSnapshot,
    historicalOpenItemIds: ReadonlySet<string>,
): void {
    validateCurrentItemsShape(current.openItems);
    const exitIds = new Set<string>();
    for (const exit of current.openItemExits) {
        validateExitShape(exit);
        if (exitIds.has(exit.openItemId)) {
            throw new CoordinationCheckpointEvidenceError(
                `duplicate EXITED evidence for OPEN_ITEM ${exit.openItemId}`,
            );
        }
        exitIds.add(exit.openItemId);
    }

    if (predecessor === null) {
        if (current.openItemExits.length !== 0) {
            throw new CoordinationCheckpointEvidenceError(
                "initial checkpoint must not contain EXITED evidence",
            );
        }
        for (const item of current.openItems) {
            if (item.continuityKind !== "ADDED") {
                throw new CoordinationCheckpointEvidenceError(
                    `initial OPEN_ITEM ${item.openItemId} must be ADDED`,
                );
            }
        }
        return;
    }

    const predecessorById = new Map(
        predecessor.openItems.map((item) => [item.openItemId, item] as const),
    );
    const currentById = new Map(
        current.openItems.map((item) => [item.openItemId, item] as const),
    );
    const exitsById = new Map(
        current.openItemExits.map((exit) => [exit.openItemId, exit] as const),
    );

    for (const item of current.openItems) {
        if (item.continuityKind === "RETAINED") {
            if (!predecessorById.has(item.openItemId)) {
                throw new CoordinationCheckpointEvidenceError(
                    `RETAINED OPEN_ITEM ${item.openItemId} is absent from immediate predecessor`,
                );
            }
            if (exitsById.has(item.openItemId)) {
                throw new CoordinationCheckpointEvidenceError(
                    `RETAINED OPEN_ITEM ${item.openItemId} cannot also be EXITED`,
                );
            }
        } else if (historicalOpenItemIds.has(item.openItemId)) {
            throw new CoordinationCheckpointEvidenceError(
                `ADDED OPEN_ITEM ${item.openItemId} reuses a prior Lane identity; reopen is not authorized in v1`,
            );
        }
    }

    for (const predecessorItem of predecessor.openItems) {
        const retained = currentById.get(predecessorItem.openItemId);
        const exited = exitsById.get(predecessorItem.openItemId);
        if (retained) {
            if (retained.continuityKind !== "RETAINED") {
                throw new CoordinationCheckpointEvidenceError(
                    `predecessor OPEN_ITEM ${predecessorItem.openItemId} must be RETAINED, not ADDED`,
                );
            }
            if (exited) {
                throw new CoordinationCheckpointEvidenceError(
                    `OPEN_ITEM ${predecessorItem.openItemId} cannot be both RETAINED and EXITED`,
                );
            }
        } else if (!exited) {
            throw new CoordinationCheckpointEvidenceError(
                `absence of predecessor OPEN_ITEM ${predecessorItem.openItemId} requires explicit EXITED evidence`,
            );
        }
    }

    for (const exit of current.openItemExits) {
        if (!predecessorById.has(exit.openItemId)) {
            throw new CoordinationCheckpointEvidenceError(
                `EXITED OPEN_ITEM ${exit.openItemId} is absent from immediate predecessor`,
            );
        }
        if (currentById.has(exit.openItemId)) {
            throw new CoordinationCheckpointEvidenceError(
                `EXITED OPEN_ITEM ${exit.openItemId} must not remain current`,
            );
        }
        if (exit.exitDisposition === "REPLACED") {
            const replacement = currentById.get(exit.replacementOpenItemId as string);
            if (!replacement || replacement.continuityKind !== "ADDED") {
                throw new CoordinationCheckpointEvidenceError(
                    `replacement for OPEN_ITEM ${exit.openItemId} must be an ADDED current item in the same successor`,
                );
            }
        }
    }
}

export function validateLaneCheckpointSnapshotEvidence(
    db: Database.Database,
    laneId: string,
    checkpoints: CoordinationLaneCheckpoint[] = readLaneCheckpointCores(db, laneId),
): CoordinationCheckpointSnapshot[] {
    const snapshots: CoordinationCheckpointSnapshot[] = [];
    const historicalOpenItemIds = new Set<string>();
    let predecessor: CoordinationCheckpointSnapshot | null = null;

    for (const checkpoint of checkpoints) {
        const snapshot = readCheckpointSnapshot(db, checkpoint);
        validateCheckpointOpenItemsTransition(predecessor, snapshot, historicalOpenItemIds);
        snapshots.push(snapshot);
        for (const item of snapshot.openItems) historicalOpenItemIds.add(item.openItemId);
        predecessor = snapshot;
    }
    return snapshots;
}

function toPersistedOpenItem(
    checkpointId: string,
    input: NewCheckpointOpenItem,
): CoordinationCheckpointOpenItem {
    return { checkpointId, ...input };
}

function toPersistedExit(
    checkpointId: string,
    input: NewCheckpointOpenItemExit,
): CoordinationCheckpointOpenItemExit {
    return {
        checkpointId,
        openItemId: input.openItemId,
        exitDisposition: input.exitDisposition,
        exitNote: input.exitNote,
        replacementOpenItemId: input.replacementOpenItemId ?? null,
    };
}

function persistCheckpointSnapshot(
    db: Database.Database,
    input: {
        id: string;
        laneId: string;
        seq: number;
        supersedesCheckpointId: string | null;
        continuityPayloadJson: string;
        openItems: NewCheckpointOpenItem[];
        openItemExits: NewCheckpointOpenItemExit[];
        provenance: string;
    },
): CoordinationCheckpointSnapshot {
    for (const item of [...input.openItems].sort((a, b) => a.itemOrdinal - b.itemOrdinal)) {
        db.prepare(
            `INSERT INTO coordination_lane_checkpoint_open_items
                 (checkpoint_id, open_item_id, item_ordinal, summary, continuity_kind)
             VALUES (?, ?, ?, ?, ?)`,
        ).run(input.id, item.openItemId, item.itemOrdinal, item.summary, item.continuityKind);
    }
    for (const exit of input.openItemExits) {
        db.prepare(
            `INSERT INTO coordination_lane_checkpoint_open_item_exits
                 (checkpoint_id, open_item_id, exit_disposition, exit_note, replacement_open_item_id)
             VALUES (?, ?, ?, ?, ?)`,
        ).run(
            input.id,
            exit.openItemId,
            exit.exitDisposition,
            exit.exitNote,
            exit.replacementOpenItemId ?? null,
        );
    }
    db.prepare(
        `INSERT INTO coordination_lane_checkpoints
             (id, lane_id, seq, supersedes_checkpoint_id,
              continuity_schema_version, continuity_payload_json, provenance)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
        input.id,
        input.laneId,
        input.seq,
        input.supersedesCheckpointId,
        CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
        input.continuityPayloadJson,
        input.provenance,
    );

    const checkpoint = readLaneCheckpointCores(db, input.laneId).find(
        (candidate) => candidate.id === input.id,
    );
    if (!checkpoint) {
        throw new CoordinationCheckpointEvidenceError(
            `checkpoint ${input.id} was not readable after persistence`,
        );
    }
    return readCheckpointSnapshot(db, checkpoint);
}

export function createInitialLaneCheckpoint(
    db: Database.Database,
    input: NewInitialLaneCheckpoint,
): CoordinationCheckpointSnapshot {
    requireNonEmpty(input.id, "id");
    requireNonEmpty(input.provenance, "provenance");

    const create = db.transaction(() => {
        requireLane(db, input.laneId);
        const existing = readLaneCheckpointCores(db, input.laneId);
        if (existing.length !== 0) {
            throw new CoordinationCheckpointError(
                `Lane ${input.laneId} already has checkpoint history`,
            );
        }
        const continuityPayloadJson = serializeContinuityPayload(input.continuity);
        const candidate: CoordinationCheckpointSnapshot = {
            checkpoint: {
                id: input.id,
                laneId: input.laneId,
                seq: 1,
                supersedesCheckpointId: null,
                continuitySchemaVersion: CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
                continuityPayloadJson,
                provenance: input.provenance,
                createdAt: "",
            },
            openItems: input.openItems.map((item) => toPersistedOpenItem(input.id, item)),
            openItemExits: [],
        };
        validateCheckpointOpenItemsTransition(null, candidate, new Set());
        return persistCheckpointSnapshot(db, {
            id: input.id,
            laneId: input.laneId,
            seq: 1,
            supersedesCheckpointId: null,
            continuityPayloadJson,
            openItems: input.openItems,
            openItemExits: [],
            provenance: input.provenance,
        });
    });

    return create.immediate();
}

export function createSuccessorLaneCheckpoint(
    db: Database.Database,
    input: NewSuccessorLaneCheckpoint,
): CoordinationCheckpointSnapshot {
    requireNonEmpty(input.id, "id");
    requireNonEmpty(input.expectedPredecessorCheckpointId, "expectedPredecessorCheckpointId");
    requireNonEmpty(input.provenance, "provenance");

    const create = db.transaction(() => {
        requireLane(db, input.laneId);
        const cores = readLaneCheckpointCores(db, input.laneId);
        const current = validateCheckpointCoreLineage(input.laneId, cores);
        if (!current) {
            throw new CoordinationCheckpointError(
                `Lane ${input.laneId} has no checkpoint to supersede`,
            );
        }
        if (current.id !== input.expectedPredecessorCheckpointId) {
            throw new CoordinationCheckpointStaleSuccessorError(
                input.expectedPredecessorCheckpointId,
                current.id,
            );
        }

        // Advancing a checkpoint requires understanding the authoritative
        // predecessor continuity contract, but does not require decoding every
        // historical payload version. U3 lifetime evidence is validated across
        // history independently below.
        decodeContinuityPayload(current);
        const existingSnapshots = validateLaneCheckpointSnapshotEvidence(
            db,
            input.laneId,
            cores,
        );
        const predecessor = existingSnapshots[existingSnapshots.length - 1];
        const historicalOpenItemIds = new Set<string>();
        for (const snapshot of existingSnapshots) {
            for (const item of snapshot.openItems) historicalOpenItemIds.add(item.openItemId);
        }

        const continuityPayloadJson = serializeContinuityPayload(input.continuity);
        const seq = current.seq + 1;
        const candidate: CoordinationCheckpointSnapshot = {
            checkpoint: {
                id: input.id,
                laneId: input.laneId,
                seq,
                supersedesCheckpointId: current.id,
                continuitySchemaVersion: CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
                continuityPayloadJson,
                provenance: input.provenance,
                createdAt: "",
            },
            openItems: input.openItems.map((item) => toPersistedOpenItem(input.id, item)),
            openItemExits: input.openItemExits.map((exit) => toPersistedExit(input.id, exit)),
        };
        validateCheckpointOpenItemsTransition(
            predecessor,
            candidate,
            historicalOpenItemIds,
        );

        return persistCheckpointSnapshot(db, {
            id: input.id,
            laneId: input.laneId,
            seq,
            supersedesCheckpointId: current.id,
            continuityPayloadJson,
            openItems: input.openItems,
            openItemExits: input.openItemExits,
            provenance: input.provenance,
        });
    });

    return create.immediate();
}
