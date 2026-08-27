// ---------------------------------------------------------------------------
// WorkOS-Lite P1-G2A — minimal Lane state storage + deterministic currentness
// primitives.
//
// `coordination_lane_state_history` (append-only) is the authoritative record.
// Current Lane state is DERIVED as the highest-seq durable record; there is no
// materialized current-state row anywhere, so there is no independent competing
// authority and no silent state promotion exists.
//
// The `state` value is treated as opaque non-empty text: the approved Lane
// lifecycle vocabulary is UNKNOWN / NOT_PROVEN in this runtime and is not
// invented here.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { assertProjectOwnsSource } from "@/lib/project-curator/knowledgeIndex";
import {
    CoordinationBindingError,
    reconstructCoordinationLaneStateBinding,
    toPersistedBindingRow,
    validateCoordinationLaneStateBinding,
    type CoordinationLaneStateBinding,
    type PersistedBindingRow,
} from "./binding";

export type LaneStateRecord = {
    laneId: string;
    seq: number;
    state: string;
    recordedAt: string;
    provenance: string;
};

export type NewLaneState = {
    laneId: string;
    state: string;
    provenance: string;
    binding?: CoordinationLaneStateBinding;
};

export const COORDINATION_LANE_NOT_FOUND = "COORDINATION_LANE_NOT_FOUND" as const;

export class CoordinationLaneNotFoundError extends Error {
    readonly code = COORDINATION_LANE_NOT_FOUND;

    constructor(laneId: string) {
        super(`${COORDINATION_LANE_NOT_FOUND}: ${laneId}`);
        this.name = "CoordinationLaneNotFoundError";
    }
}

export function laneStateExists(db: Database.Database, laneId: string): boolean {
    return (
        db.prepare("SELECT 1 FROM coordination_lanes WHERE id = ?").get(laneId) !==
        undefined
    );
}

export function appendLaneState(
    db: Database.Database,
    input: NewLaneState,
): LaneStateRecord {
    const { laneId, state, provenance, binding } = input;

    const run = db.transaction((): LaneStateRecord => {
        if (!laneStateExists(db, laneId)) {
            throw new CoordinationLaneNotFoundError(laneId);
        }

        if (binding !== undefined) {
            validateCoordinationLaneStateBinding(binding);
        }

        if (binding?.evaluatedStateRef) {
            const ref = binding.evaluatedStateRef;
            if (ref.laneId !== laneId) {
                throw new CoordinationBindingError(
                    `evaluatedStateRef.laneId ${ref.laneId} does not match lane ${laneId}`,
                );
            }
            const exists = db
                .prepare(
                    `SELECT 1 FROM coordination_lane_state_history WHERE lane_id = ? AND seq = ?`,
                )
                .get(ref.laneId, ref.seq);
            if (exists === undefined) {
                throw new CoordinationBindingError(
                    `evaluated state record (${ref.laneId}, ${ref.seq}) does not exist`,
                );
            }
        }

        if (binding?.sourceRef) {
            const laneRow = db
                .prepare("SELECT project_id FROM coordination_lanes WHERE id = ?")
                .get(laneId) as { project_id: string } | undefined;
            if (!laneRow) {
                throw new CoordinationLaneNotFoundError(laneId);
            }
            assertProjectOwnsSource(db, laneRow.project_id, binding.sourceRef);
        }

        const { next } = db
            .prepare(
                `SELECT COALESCE(MAX(seq), 0) + 1 AS next
                 FROM coordination_lane_state_history
                 WHERE lane_id = ?`,
            )
            .get(laneId) as { next: number };

        const persisted = toPersistedBindingRow(binding);
        db.prepare(
            `INSERT INTO coordination_lane_state_history (
                 lane_id, seq, state, provenance,
                 source_ref_kind, source_ref_id,
                 evaluated_state_lane_id, evaluated_state_seq,
                 evaluated_baseline_kind, evaluated_baseline_id, evaluated_baseline_fingerprint
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
            laneId,
            next,
            state,
            provenance,
            persisted.source_ref_kind,
            persisted.source_ref_id,
            persisted.evaluated_state_lane_id,
            persisted.evaluated_state_seq,
            persisted.evaluated_baseline_kind,
            persisted.evaluated_baseline_id,
            persisted.evaluated_baseline_fingerprint,
        );

        const row = db
            .prepare(
                `SELECT lane_id AS laneId, seq, state, recorded_at AS recordedAt, provenance
                 FROM coordination_lane_state_history
                 WHERE lane_id = ? AND seq = ?`,
            )
            .get(laneId, next) as LaneStateRecord;

        return row;
    });

    return run.immediate();
}

export function resolveCurrentLaneState(
    db: Database.Database,
    laneId: string,
): LaneStateRecord | null {
    const row = db
        .prepare(
            `SELECT lane_id AS laneId, seq, state, recorded_at AS recordedAt, provenance
             FROM coordination_lane_state_history
             WHERE lane_id = ?
             ORDER BY seq DESC
             LIMIT 1`,
        )
        .get(laneId) as LaneStateRecord | undefined;
    return row ?? null;
}

export function resolveLaneStateHistory(
    db: Database.Database,
    laneId: string,
): LaneStateRecord[] {
    return db
        .prepare(
            `SELECT lane_id AS laneId, seq, state, recorded_at AS recordedAt, provenance
             FROM coordination_lane_state_history
             WHERE lane_id = ?
             ORDER BY seq ASC`,
        )
        .all(laneId) as LaneStateRecord[];
}

/**
 * P1-G2B — deterministic binding read for round-trip/recovery. Applies the
 * approved persisted reconstruction rules and fails visibly on malformed
 * partial data. Returns null when the record or its binding is absent.
 */
export function resolveLaneStateBinding(
    db: Database.Database,
    laneId: string,
    seq: number,
): CoordinationLaneStateBinding | null {
    const row = db
        .prepare(
            `SELECT source_ref_kind, source_ref_id,
                    evaluated_state_lane_id, evaluated_state_seq,
                    evaluated_baseline_kind, evaluated_baseline_id, evaluated_baseline_fingerprint
             FROM coordination_lane_state_history
             WHERE lane_id = ? AND seq = ?`,
        )
        .get(laneId, seq) as PersistedBindingRow | undefined;
    if (!row) return null;
    return reconstructCoordinationLaneStateBinding(row);
}
