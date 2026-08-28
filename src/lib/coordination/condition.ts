// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G4B — Coordination condition primitive: durable identity +
// authoritative append-only lifecycle history.
//
// A condition is a first-class coordination signal on a Lane (kind bounded to
// blocker | waiting | attention) with immutable identity (id, lane_id,
// signal_kind, dependency_id, reason). Current lifecycle state is DERIVED as
// the highest-seq durable history record per condition identity; there is no
// materialized current-state column anywhere, so there is no competing
// authority and no silent state promotion exists.
//
// A condition is effective iff its current lifecycle state is 'active'.
// Effective conditions for a Lane/kind are aggregated only AFTER per-condition
// resolution — never by highest seq across (lane_id, signal_kind).
//
// Frozen P2-G4B-R2 contract:
//  - when dependency_id is non-null the condition Lane MUST be the source Lane
//    of the referenced Directional Dependency (endpoint rule),
//  - createCondition atomically writes identity + initial history seq 1 active
//    and rolls back all persistence on failure,
//  - provenance is attribution only (never condition semantic meaning).
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import {
    COORDINATION_CONDITION_SIGNAL_KINDS,
    COORDINATION_CONDITION_STATES,
} from "./conditionSchema";

export type CoordinationConditionSignalKind =
    (typeof COORDINATION_CONDITION_SIGNAL_KINDS)[number];

export type CoordinationConditionState =
    (typeof COORDINATION_CONDITION_STATES)[number];

export type CoordinationCondition = {
    id: string;
    laneId: string;
    signalKind: CoordinationConditionSignalKind;
    dependencyId: string | null;
    reason: string;
    createdAt: string;
};

export type CoordinationConditionHistoryRecord = {
    conditionId: string;
    seq: number;
    state: CoordinationConditionState;
    recordedAt: string;
    provenance: string;
};

export type NewCoordinationCondition = {
    id: string;
    laneId: string;
    signalKind: CoordinationConditionSignalKind;
    dependencyId?: string;
    reason: string;
    provenance: string;
};

export type NewCoordinationConditionHistory = {
    conditionId: string;
    state: CoordinationConditionState;
    provenance: string;
};

export const COORDINATION_CONDITION_INVALID = "COORDINATION_CONDITION_INVALID" as const;
export const COORDINATION_CONDITION_NOT_FOUND = "COORDINATION_CONDITION_NOT_FOUND" as const;

export class CoordinationConditionError extends Error {
    readonly code = COORDINATION_CONDITION_INVALID;

    constructor(detail: string) {
        super(`${COORDINATION_CONDITION_INVALID}: ${detail}`);
        this.name = "CoordinationConditionError";
    }
}

export class CoordinationConditionNotFoundError extends Error {
    readonly code = COORDINATION_CONDITION_NOT_FOUND;

    constructor(conditionId: string) {
        super(`${COORDINATION_CONDITION_NOT_FOUND}: ${conditionId}`);
        this.name = "CoordinationConditionNotFoundError";
    }
}

function requireNonEmpty(value: string, field: string): void {
    if (!value || value.trim().length === 0) {
        throw new CoordinationConditionError(`${field} must be non-empty`);
    }
}

function isSignalKind(value: string): value is CoordinationConditionSignalKind {
    return (COORDINATION_CONDITION_SIGNAL_KINDS as readonly string[]).includes(value);
}

function isConditionState(value: string): value is CoordinationConditionState {
    return (COORDINATION_CONDITION_STATES as readonly string[]).includes(value);
}

function conditionExists(db: Database.Database, conditionId: string): boolean {
    return (
        db.prepare("SELECT 1 FROM coordination_conditions WHERE id = ?").get(conditionId) !==
        undefined
    );
}

function readCondition(db: Database.Database, conditionId: string): CoordinationCondition {
    return db
        .prepare(
            `SELECT id, lane_id AS laneId, signal_kind AS signalKind,
                    dependency_id AS dependencyId, reason, created_at AS createdAt
             FROM coordination_conditions
             WHERE id = ?`,
        )
        .get(conditionId) as CoordinationCondition;
}

function readHistoryRecord(
    db: Database.Database,
    conditionId: string,
    seq: number,
): CoordinationConditionHistoryRecord {
    return db
        .prepare(
            `SELECT condition_id AS conditionId, seq, state,
                    recorded_at AS recordedAt, provenance
             FROM coordination_condition_history
             WHERE condition_id = ? AND seq = ?`,
        )
        .get(conditionId, seq) as CoordinationConditionHistoryRecord;
}

function resolveDependencySourceLane(
    db: Database.Database,
    dependencyId: string,
): string | null {
    const row = db
        .prepare(
            `SELECT source_lane_id AS sourceLaneId
             FROM coordination_dependencies
             WHERE id = ?`,
        )
        .get(dependencyId) as { sourceLaneId: string } | undefined;
    return row?.sourceLaneId ?? null;
}

export function createCoordinationCondition(
    db: Database.Database,
    input: NewCoordinationCondition,
): {
    condition: CoordinationCondition;
    initialHistory: CoordinationConditionHistoryRecord;
} {
    const { id, laneId, signalKind, dependencyId, reason, provenance } = input;
    requireNonEmpty(id, "id");
    requireNonEmpty(laneId, "laneId");
    if (!isSignalKind(signalKind)) {
        throw new CoordinationConditionError(
            `signalKind must be one of ${COORDINATION_CONDITION_SIGNAL_KINDS.join(", ")}`,
        );
    }
    requireNonEmpty(reason, "reason");
    requireNonEmpty(provenance, "provenance");

    const create = db.transaction(() => {
        const laneExists = db
            .prepare("SELECT 1 FROM coordination_lanes WHERE id = ?")
            .get(laneId);
        if (laneExists === undefined) {
            throw new CoordinationConditionError(`Lane ${laneId} does not exist`);
        }

        if (dependencyId !== undefined) {
            const sourceLaneId = resolveDependencySourceLane(db, dependencyId);
            if (sourceLaneId === null) {
                throw new CoordinationConditionError(
                    `referenced Dependency ${dependencyId} does not exist`,
                );
            }
            if (sourceLaneId !== laneId) {
                throw new CoordinationConditionError(
                    `condition Lane ${laneId} must be the source Lane ${sourceLaneId} of Dependency ${dependencyId}`,
                );
            }
        }

        db.prepare(
            `INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
             VALUES (?, ?, ?, ?, ?)`,
        ).run(id, laneId, signalKind, dependencyId ?? null, reason);
        db.prepare(
            `INSERT INTO coordination_condition_history (condition_id, seq, state, provenance)
             VALUES (?, 1, 'active', ?)`,
        ).run(id, provenance);

        return {
            condition: readCondition(db, id),
            initialHistory: readHistoryRecord(db, id, 1),
        };
    });

    return create.immediate();
}

export function appendCoordinationConditionState(
    db: Database.Database,
    input: NewCoordinationConditionHistory,
): CoordinationConditionHistoryRecord {
    const { conditionId, state, provenance } = input;
    requireNonEmpty(conditionId, "conditionId");
    if (!isConditionState(state)) {
        throw new CoordinationConditionError(
            `state must be one of ${COORDINATION_CONDITION_STATES.join(", ")}`,
        );
    }
    requireNonEmpty(provenance, "provenance");

    const append = db.transaction(() => {
        if (!conditionExists(db, conditionId)) {
            throw new CoordinationConditionNotFoundError(conditionId);
        }
        const { next } = db
            .prepare(
                `SELECT COALESCE(MAX(seq), 0) + 1 AS next
                 FROM coordination_condition_history
                 WHERE condition_id = ?`,
            )
            .get(conditionId) as { next: number };
        db.prepare(
            `INSERT INTO coordination_condition_history (condition_id, seq, state, provenance)
             VALUES (?, ?, ?, ?)`,
        ).run(conditionId, next, state, provenance);
        return readHistoryRecord(db, conditionId, next);
    });

    return append.immediate();
}

export function resolveCoordinationCondition(
    db: Database.Database,
    conditionId: string,
): CoordinationCondition | null {
    const row = db
        .prepare(
            `SELECT id, lane_id AS laneId, signal_kind AS signalKind,
                    dependency_id AS dependencyId, reason, created_at AS createdAt
             FROM coordination_conditions
             WHERE id = ?`,
        )
        .get(conditionId) as CoordinationCondition | undefined;
    return row ?? null;
}

export function resolveCoordinationConditionHistory(
    db: Database.Database,
    conditionId: string,
): CoordinationConditionHistoryRecord[] {
    return db
        .prepare(
            `SELECT condition_id AS conditionId, seq, state,
                    recorded_at AS recordedAt, provenance
             FROM coordination_condition_history
             WHERE condition_id = ?
             ORDER BY seq ASC`,
        )
        .all(conditionId) as CoordinationConditionHistoryRecord[];
}

export function resolveCurrentCoordinationConditionState(
    db: Database.Database,
    conditionId: string,
): CoordinationConditionHistoryRecord | null {
    const row = db
        .prepare(
            `SELECT condition_id AS conditionId, seq, state,
                    recorded_at AS recordedAt, provenance
             FROM coordination_condition_history
             WHERE condition_id = ?
             ORDER BY seq DESC
             LIMIT 1`,
        )
        .get(conditionId) as CoordinationConditionHistoryRecord | undefined;
    return row ?? null;
}

export function resolveCurrentEffectiveCoordinationConditions(
    db: Database.Database,
    laneId: string,
    signalKind: CoordinationConditionSignalKind,
): CoordinationCondition[] {
    const conditions = db
        .prepare(
            `SELECT id, lane_id AS laneId, signal_kind AS signalKind,
                    dependency_id AS dependencyId, reason, created_at AS createdAt
             FROM coordination_conditions
             WHERE lane_id = ? AND signal_kind = ?`,
        )
        .all(laneId, signalKind) as CoordinationCondition[];
    return conditions.filter((condition) => {
        const current = resolveCurrentCoordinationConditionState(db, condition.id);
        return current !== null && current.state === "active";
    });
}
