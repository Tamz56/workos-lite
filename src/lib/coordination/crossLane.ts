// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G5B — Cross-Lane Impact primitive: durable source items,
// append-only source item lifecycle, and append-only target relations.
//
// Currentness is DERIVED (never materialized):
//   - source item state     : highest durable seq per source_item_id,
//   - target relation state : highest durable seq per (source_item_id, target_lane_id).
// A target relation is EFFECTIVE iff the current Source Item is applicable AND
// the current Target Relation is applicable.
//
// Frozen P2-G5B-I1 guards:
//   - NONE is an explicit classification, never an absent relation,
//   - self-relation is prohibited (DB + application fail-closed),
//   - same-project only in v1 (DB + application fail-closed),
//   - no direct target-Lane authority/state mutation.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { CROSS_LANE_IMPACT_CLASSIFICATIONS } from "./crossLaneSchema";

export type CrossLaneImpactClassification =
    (typeof CROSS_LANE_IMPACT_CLASSIFICATIONS)[number];

export type CrossLaneSourceItem = {
    id: string;
    sourceLaneId: string;
    summary: string;
    createdAt: string;
};

export type CrossLaneSourceItemHistoryRecord = {
    sourceItemId: string;
    seq: number;
    applicable: boolean;
    recordedAt: string;
    sourceProvenance: string;
};

export type CrossLaneTargetRelationHistoryRecord = {
    sourceItemId: string;
    targetLaneId: string;
    seq: number;
    impactClassification: CrossLaneImpactClassification;
    applicable: boolean;
    recordedAt: string;
    relationProvenance: string;
};

export type NewCrossLaneSourceItem = {
    id: string;
    sourceLaneId: string;
    summary: string;
    applicable: boolean;
    provenance: string;
};

export type NewCrossLaneSourceItemHistory = {
    sourceItemId: string;
    applicable: boolean;
    provenance: string;
};

export type NewCrossLaneTargetRelation = {
    sourceItemId: string;
    targetLaneId: string;
    impactClassification: CrossLaneImpactClassification;
    applicable: boolean;
    provenance: string;
};

export type NewCrossLaneTargetRelationHistory = {
    sourceItemId: string;
    targetLaneId: string;
    impactClassification: CrossLaneImpactClassification;
    applicable: boolean;
    provenance: string;
};

export const COORDINATION_CROSS_LANE_INVALID = "COORDINATION_CROSS_LANE_INVALID" as const;
export const COORDINATION_CROSS_LANE_NOT_FOUND = "COORDINATION_CROSS_LANE_NOT_FOUND" as const;

export class CoordinationCrossLaneError extends Error {
    readonly code = COORDINATION_CROSS_LANE_INVALID;

    constructor(detail: string) {
        super(`${COORDINATION_CROSS_LANE_INVALID}: ${detail}`);
        this.name = "CoordinationCrossLaneError";
    }
}

export class CoordinationCrossLaneNotFoundError extends Error {
    readonly code = COORDINATION_CROSS_LANE_NOT_FOUND;

    constructor(detail: string) {
        super(`${COORDINATION_CROSS_LANE_NOT_FOUND}: ${detail}`);
        this.name = "CoordinationCrossLaneNotFoundError";
    }
}

function requireNonEmpty(value: string, field: string): void {
    if (!value || value.trim().length === 0) {
        throw new CoordinationCrossLaneError(`${field} must be non-empty`);
    }
}

function toSourceItemHistoryRecord(row: {
    sourceItemId: string;
    seq: number;
    applicable: number;
    recordedAt: string;
    sourceProvenance: string;
}): CrossLaneSourceItemHistoryRecord {
    return {
        sourceItemId: row.sourceItemId,
        seq: row.seq,
        applicable: row.applicable === 1,
        recordedAt: row.recordedAt,
        sourceProvenance: row.sourceProvenance,
    };
}

function toRelationHistoryRecord(row: {
    sourceItemId: string;
    targetLaneId: string;
    seq: number;
    impactClassification: CrossLaneImpactClassification;
    applicable: number;
    recordedAt: string;
    relationProvenance: string;
}): CrossLaneTargetRelationHistoryRecord {
    return {
        sourceItemId: row.sourceItemId,
        targetLaneId: row.targetLaneId,
        seq: row.seq,
        impactClassification: row.impactClassification,
        applicable: row.applicable === 1,
        recordedAt: row.recordedAt,
        relationProvenance: row.relationProvenance,
    };
}

function isClassification(
    value: string,
): value is CrossLaneImpactClassification {
    return (CROSS_LANE_IMPACT_CLASSIFICATIONS as readonly string[]).includes(value);
}

function sourceItemExists(db: Database.Database, sourceItemId: string): boolean {
    return (
        db
            .prepare("SELECT 1 FROM coordination_cross_lane_source_items WHERE id = ?")
            .get(sourceItemId) !== undefined
    );
}

function readSourceItem(
    db: Database.Database,
    sourceItemId: string,
): CrossLaneSourceItem {
    return db
        .prepare(
            `SELECT id, source_lane_id AS sourceLaneId, summary, created_at AS createdAt
             FROM coordination_cross_lane_source_items
             WHERE id = ?`,
        )
        .get(sourceItemId) as CrossLaneSourceItem;
}

function readSourceItemHistoryRecord(
    db: Database.Database,
    sourceItemId: string,
    seq: number,
): CrossLaneSourceItemHistoryRecord {
    const row = db
        .prepare(
            `SELECT source_item_id AS sourceItemId, seq, applicable,
                    recorded_at AS recordedAt, source_provenance AS sourceProvenance
             FROM coordination_cross_lane_source_item_history
             WHERE source_item_id = ? AND seq = ?`,
        )
        .get(sourceItemId, seq) as {
        sourceItemId: string;
        seq: number;
        applicable: number;
        recordedAt: string;
        sourceProvenance: string;
    };
    return toSourceItemHistoryRecord(row);
}

function readRelationHistoryRecord(
    db: Database.Database,
    sourceItemId: string,
    targetLaneId: string,
    seq: number,
): CrossLaneTargetRelationHistoryRecord {
    const row = db
        .prepare(
            `SELECT source_item_id AS sourceItemId, target_lane_id AS targetLaneId,
                    seq, impact_classification AS impactClassification, applicable,
                    recorded_at AS recordedAt, relation_provenance AS relationProvenance
             FROM coordination_cross_lane_target_relation_history
             WHERE source_item_id = ? AND target_lane_id = ? AND seq = ?`,
        )
        .get(sourceItemId, targetLaneId, seq) as {
        sourceItemId: string;
        targetLaneId: string;
        seq: number;
        impactClassification: CrossLaneImpactClassification;
        applicable: number;
        recordedAt: string;
        relationProvenance: string;
    };
    return toRelationHistoryRecord(row);
}

function resolveLaneProject(
    db: Database.Database,
    laneId: string,
    endpoint: string,
): string {
    const row = db
        .prepare("SELECT project_id AS projectId FROM coordination_lanes WHERE id = ?")
        .get(laneId) as { projectId: string } | undefined;
    if (!row) {
        throw new CoordinationCrossLaneError(`${endpoint} Lane ${laneId} does not exist`);
    }
    return row.projectId;
}

function resolveSourceItemLane(
    db: Database.Database,
    sourceItemId: string,
): { sourceLaneId: string; projectId: string } {
    const row = db
        .prepare(
            `SELECT item.source_lane_id AS sourceLaneId, lane.project_id AS projectId
             FROM coordination_cross_lane_source_items AS item
             JOIN coordination_lanes AS lane ON lane.id = item.source_lane_id
             WHERE item.id = ?`,
        )
        .get(sourceItemId) as { sourceLaneId: string; projectId: string } | undefined;
    if (!row) {
        throw new CoordinationCrossLaneNotFoundError(
            `source item ${sourceItemId} does not exist`,
        );
    }
    return row;
}

function validateTargetRelationEndpoint(
    db: Database.Database,
    sourceItemId: string,
    targetLaneId: string,
): void {
    const source = resolveSourceItemLane(db, sourceItemId);
    if (targetLaneId === source.sourceLaneId) {
        throw new CoordinationCrossLaneError(
            `target Lane ${targetLaneId} must not be the source Lane of source item ${sourceItemId}`,
        );
    }
    const targetProjectId = resolveLaneProject(db, targetLaneId, "target");
    if (targetProjectId !== source.projectId) {
        throw new CoordinationCrossLaneError(
            `target Lane ${targetLaneId} must belong to the same Project as source item ${sourceItemId}`,
        );
    }
}

export function createCrossLaneSourceItem(
    db: Database.Database,
    input: NewCrossLaneSourceItem,
): {
    sourceItem: CrossLaneSourceItem;
    initialHistory: CrossLaneSourceItemHistoryRecord;
} {
    const { id, sourceLaneId, summary, applicable, provenance } = input;
    requireNonEmpty(id, "id");
    requireNonEmpty(sourceLaneId, "sourceLaneId");
    requireNonEmpty(summary, "summary");
    requireNonEmpty(provenance, "provenance");

    const create = db.transaction(() => {
        resolveLaneProject(db, sourceLaneId, "source");

        db.prepare(
            `INSERT INTO coordination_cross_lane_source_items (id, source_lane_id, summary)
             VALUES (?, ?, ?)`,
        ).run(id, sourceLaneId, summary);
        db.prepare(
            `INSERT INTO coordination_cross_lane_source_item_history
                 (source_item_id, seq, applicable, source_provenance)
             VALUES (?, 1, ?, ?)`,
        ).run(id, applicable ? 1 : 0, provenance);

        return {
            sourceItem: readSourceItem(db, id),
            initialHistory: readSourceItemHistoryRecord(db, id, 1),
        };
    });

    return create.immediate();
}

export function appendCrossLaneSourceItemState(
    db: Database.Database,
    input: NewCrossLaneSourceItemHistory,
): CrossLaneSourceItemHistoryRecord {
    const { sourceItemId, applicable, provenance } = input;
    requireNonEmpty(sourceItemId, "sourceItemId");
    requireNonEmpty(provenance, "provenance");

    const append = db.transaction(() => {
        if (!sourceItemExists(db, sourceItemId)) {
            throw new CoordinationCrossLaneNotFoundError(
                `source item ${sourceItemId} does not exist`,
            );
        }
        const { next } = db
            .prepare(
                `SELECT COALESCE(MAX(seq), 0) + 1 AS next
                 FROM coordination_cross_lane_source_item_history
                 WHERE source_item_id = ?`,
            )
            .get(sourceItemId) as { next: number };
        db.prepare(
            `INSERT INTO coordination_cross_lane_source_item_history
                 (source_item_id, seq, applicable, source_provenance)
             VALUES (?, ?, ?, ?)`,
        ).run(sourceItemId, next, applicable ? 1 : 0, provenance);
        return readSourceItemHistoryRecord(db, sourceItemId, next);
    });

    return append.immediate();
}

export function createCrossLaneTargetRelation(
    db: Database.Database,
    input: NewCrossLaneTargetRelation,
): CrossLaneTargetRelationHistoryRecord {
    return appendCrossLaneTargetRelationState(db, input);
}

export function appendCrossLaneTargetRelationState(
    db: Database.Database,
    input: NewCrossLaneTargetRelationHistory,
): CrossLaneTargetRelationHistoryRecord {
    const { sourceItemId, targetLaneId, impactClassification, applicable, provenance } = input;
    requireNonEmpty(sourceItemId, "sourceItemId");
    requireNonEmpty(targetLaneId, "targetLaneId");
    if (!isClassification(impactClassification)) {
        throw new CoordinationCrossLaneError(
            `impactClassification must be one of ${CROSS_LANE_IMPACT_CLASSIFICATIONS.join(", ")}`,
        );
    }
    requireNonEmpty(provenance, "provenance");

    const append = db.transaction(() => {
        validateTargetRelationEndpoint(db, sourceItemId, targetLaneId);

        const { next } = db
            .prepare(
                `SELECT COALESCE(MAX(seq), 0) + 1 AS next
                 FROM coordination_cross_lane_target_relation_history
                 WHERE source_item_id = ? AND target_lane_id = ?`,
            )
            .get(sourceItemId, targetLaneId) as { next: number };
        db.prepare(
            `INSERT INTO coordination_cross_lane_target_relation_history
                 (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
             VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(
            sourceItemId,
            targetLaneId,
            next,
            impactClassification,
            applicable ? 1 : 0,
            provenance,
        );
        return readRelationHistoryRecord(db, sourceItemId, targetLaneId, next);
    });

    return append.immediate();
}

export function resolveCrossLaneSourceItem(
    db: Database.Database,
    sourceItemId: string,
): CrossLaneSourceItem | null {
    const row = db
        .prepare(
            `SELECT id, source_lane_id AS sourceLaneId, summary, created_at AS createdAt
             FROM coordination_cross_lane_source_items
             WHERE id = ?`,
        )
        .get(sourceItemId) as CrossLaneSourceItem | undefined;
    return row ?? null;
}

export function resolveCrossLaneSourceItemHistory(
    db: Database.Database,
    sourceItemId: string,
): CrossLaneSourceItemHistoryRecord[] {
    const rows = db
        .prepare(
            `SELECT source_item_id AS sourceItemId, seq, applicable,
                    recorded_at AS recordedAt, source_provenance AS sourceProvenance
             FROM coordination_cross_lane_source_item_history
             WHERE source_item_id = ?
             ORDER BY seq ASC`,
        )
        .all(sourceItemId) as Array<{
        sourceItemId: string;
        seq: number;
        applicable: number;
        recordedAt: string;
        sourceProvenance: string;
    }>;
    return rows.map(toSourceItemHistoryRecord);
}

export function resolveCurrentCrossLaneSourceItemState(
    db: Database.Database,
    sourceItemId: string,
): CrossLaneSourceItemHistoryRecord | null {
    const row = db
        .prepare(
            `SELECT source_item_id AS sourceItemId, seq, applicable,
                    recorded_at AS recordedAt, source_provenance AS sourceProvenance
             FROM coordination_cross_lane_source_item_history
             WHERE source_item_id = ?
             ORDER BY seq DESC
             LIMIT 1`,
        )
        .get(sourceItemId) as
        | {
              sourceItemId: string;
              seq: number;
              applicable: number;
              recordedAt: string;
              sourceProvenance: string;
          }
        | undefined;
    return row === undefined ? null : toSourceItemHistoryRecord(row);
}

export function resolveCrossLaneTargetRelationHistory(
    db: Database.Database,
    sourceItemId: string,
    targetLaneId: string,
): CrossLaneTargetRelationHistoryRecord[] {
    const rows = db
        .prepare(
            `SELECT source_item_id AS sourceItemId, target_lane_id AS targetLaneId,
                    seq, impact_classification AS impactClassification, applicable,
                    recorded_at AS recordedAt, relation_provenance AS relationProvenance
             FROM coordination_cross_lane_target_relation_history
             WHERE source_item_id = ? AND target_lane_id = ?
             ORDER BY seq ASC`,
        )
        .all(sourceItemId, targetLaneId) as Array<{
        sourceItemId: string;
        targetLaneId: string;
        seq: number;
        impactClassification: CrossLaneImpactClassification;
        applicable: number;
        recordedAt: string;
        relationProvenance: string;
    }>;
    return rows.map(toRelationHistoryRecord);
}

export function resolveCurrentCrossLaneTargetRelationState(
    db: Database.Database,
    sourceItemId: string,
    targetLaneId: string,
): CrossLaneTargetRelationHistoryRecord | null {
    const row = db
        .prepare(
            `SELECT source_item_id AS sourceItemId, target_lane_id AS targetLaneId,
                    seq, impact_classification AS impactClassification, applicable,
                    recorded_at AS recordedAt, relation_provenance AS relationProvenance
             FROM coordination_cross_lane_target_relation_history
             WHERE source_item_id = ? AND target_lane_id = ?
             ORDER BY seq DESC
             LIMIT 1`,
        )
        .get(sourceItemId, targetLaneId) as
        | {
              sourceItemId: string;
              targetLaneId: string;
              seq: number;
              impactClassification: CrossLaneImpactClassification;
              applicable: number;
              recordedAt: string;
              relationProvenance: string;
          }
        | undefined;
    return row === undefined ? null : toRelationHistoryRecord(row);
}

export function resolveCurrentEffectiveCrossLaneTargetRelations(
    db: Database.Database,
    sourceItemId: string,
): CrossLaneTargetRelationHistoryRecord[] {
    const currentSourceItem = resolveCurrentCrossLaneSourceItemState(db, sourceItemId);
    if (currentSourceItem === null || !currentSourceItem.applicable) {
        return [];
    }

    const targetLaneRows = db
        .prepare(
            `SELECT DISTINCT target_lane_id AS targetLaneId
             FROM coordination_cross_lane_target_relation_history
             WHERE source_item_id = ?
             ORDER BY target_lane_id ASC`,
        )
        .all(sourceItemId) as Array<{ targetLaneId: string }>;

    const effective: CrossLaneTargetRelationHistoryRecord[] = [];
    for (const { targetLaneId } of targetLaneRows) {
        const current = resolveCurrentCrossLaneTargetRelationState(
            db,
            sourceItemId,
            targetLaneId,
        );
        if (current !== null && current.applicable) {
            effective.push(current);
        }
    }
    return effective;
}
