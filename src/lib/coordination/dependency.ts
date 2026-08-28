// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G3B — Lane dependency identity + authoritative history.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export type CoordinationDependency = {
    id: string;
    sourceLaneId: string;
    targetLaneId: string;
    createdAt: string;
};

export type CoordinationDependencyHistoryRecord = {
    dependencyId: string;
    seq: number;
    state: string;
    recordedAt: string;
    provenance: string;
};

export type NewCoordinationDependency = {
    id: string;
    sourceLaneId: string;
    targetLaneId: string;
    state: string;
    provenance: string;
};

export type NewCoordinationDependencyHistory = {
    dependencyId: string;
    state: string;
    provenance: string;
};

export const COORDINATION_DEPENDENCY_INVALID = "COORDINATION_DEPENDENCY_INVALID" as const;
export const COORDINATION_DEPENDENCY_NOT_FOUND = "COORDINATION_DEPENDENCY_NOT_FOUND" as const;

export class CoordinationDependencyError extends Error {
    readonly code = COORDINATION_DEPENDENCY_INVALID;

    constructor(detail: string) {
        super(`${COORDINATION_DEPENDENCY_INVALID}: ${detail}`);
        this.name = "CoordinationDependencyError";
    }
}

export class CoordinationDependencyNotFoundError extends Error {
    readonly code = COORDINATION_DEPENDENCY_NOT_FOUND;

    constructor(dependencyId: string) {
        super(`${COORDINATION_DEPENDENCY_NOT_FOUND}: ${dependencyId}`);
        this.name = "CoordinationDependencyNotFoundError";
    }
}

function requireNonEmpty(value: string, field: string): void {
    if (!value || value.trim().length === 0) {
        throw new CoordinationDependencyError(`${field} must be non-empty`);
    }
}

function resolveLaneProject(
    db: Database.Database,
    laneId: string,
    endpoint: "source" | "target",
): string {
    const row = db
        .prepare("SELECT project_id AS projectId FROM coordination_lanes WHERE id = ?")
        .get(laneId) as { projectId: string } | undefined;
    if (!row) {
        throw new CoordinationDependencyError(`${endpoint} Lane ${laneId} does not exist`);
    }
    return row.projectId;
}

function dependencyExists(db: Database.Database, dependencyId: string): boolean {
    return (
        db.prepare("SELECT 1 FROM coordination_dependencies WHERE id = ?").get(dependencyId) !==
        undefined
    );
}

function readDependency(db: Database.Database, dependencyId: string): CoordinationDependency {
    return db
        .prepare(
            `SELECT id, source_lane_id AS sourceLaneId, target_lane_id AS targetLaneId,
                    created_at AS createdAt
             FROM coordination_dependencies
             WHERE id = ?`,
        )
        .get(dependencyId) as CoordinationDependency;
}

function readHistoryRecord(
    db: Database.Database,
    dependencyId: string,
    seq: number,
): CoordinationDependencyHistoryRecord {
    return db
        .prepare(
            `SELECT dependency_id AS dependencyId, seq, state,
                    recorded_at AS recordedAt, provenance
             FROM coordination_dependency_history
             WHERE dependency_id = ? AND seq = ?`,
        )
        .get(dependencyId, seq) as CoordinationDependencyHistoryRecord;
}

export function createCoordinationDependency(
    db: Database.Database,
    input: NewCoordinationDependency,
): {
    dependency: CoordinationDependency;
    initialHistory: CoordinationDependencyHistoryRecord;
} {
    const { id, sourceLaneId, targetLaneId, state, provenance } = input;
    requireNonEmpty(id, "id");
    requireNonEmpty(sourceLaneId, "sourceLaneId");
    requireNonEmpty(targetLaneId, "targetLaneId");

    const create = db.transaction(() => {
        const sourceProjectId = resolveLaneProject(db, sourceLaneId, "source");
        const targetProjectId = resolveLaneProject(db, targetLaneId, "target");
        if (sourceProjectId !== targetProjectId) {
            throw new CoordinationDependencyError(
                `source Lane ${sourceLaneId} and target Lane ${targetLaneId} belong to different Projects`,
            );
        }

        db.prepare(
            `INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
             VALUES (?, ?, ?)`,
        ).run(id, sourceLaneId, targetLaneId);
        db.prepare(
            `INSERT INTO coordination_dependency_history
                 (dependency_id, seq, state, provenance)
             VALUES (?, 1, ?, ?)`,
        ).run(id, state, provenance);

        return {
            dependency: readDependency(db, id),
            initialHistory: readHistoryRecord(db, id, 1),
        };
    });

    return create.immediate();
}

export function appendCoordinationDependencyHistory(
    db: Database.Database,
    input: NewCoordinationDependencyHistory,
): CoordinationDependencyHistoryRecord {
    const { dependencyId, state, provenance } = input;
    requireNonEmpty(dependencyId, "dependencyId");

    const append = db.transaction(() => {
        if (!dependencyExists(db, dependencyId)) {
            throw new CoordinationDependencyNotFoundError(dependencyId);
        }
        const { next } = db
            .prepare(
                `SELECT COALESCE(MAX(seq), 0) + 1 AS next
                 FROM coordination_dependency_history
                 WHERE dependency_id = ?`,
            )
            .get(dependencyId) as { next: number };
        db.prepare(
            `INSERT INTO coordination_dependency_history
                 (dependency_id, seq, state, provenance)
             VALUES (?, ?, ?, ?)`,
        ).run(dependencyId, next, state, provenance);
        return readHistoryRecord(db, dependencyId, next);
    });

    return append.immediate();
}

export function resolveCoordinationDependency(
    db: Database.Database,
    dependencyId: string,
): CoordinationDependency | null {
    const row = db
        .prepare(
            `SELECT id, source_lane_id AS sourceLaneId, target_lane_id AS targetLaneId,
                    created_at AS createdAt
             FROM coordination_dependencies
             WHERE id = ?`,
        )
        .get(dependencyId) as CoordinationDependency | undefined;
    return row ?? null;
}

export function resolveCoordinationDependencyHistory(
    db: Database.Database,
    dependencyId: string,
): CoordinationDependencyHistoryRecord[] {
    return db
        .prepare(
            `SELECT dependency_id AS dependencyId, seq, state,
                    recorded_at AS recordedAt, provenance
             FROM coordination_dependency_history
             WHERE dependency_id = ?
             ORDER BY seq ASC`,
        )
        .all(dependencyId) as CoordinationDependencyHistoryRecord[];
}

export function resolveCurrentCoordinationDependencyState(
    db: Database.Database,
    dependencyId: string,
): CoordinationDependencyHistoryRecord | null {
    const row = db
        .prepare(
            `SELECT dependency_id AS dependencyId, seq, state,
                    recorded_at AS recordedAt, provenance
             FROM coordination_dependency_history
             WHERE dependency_id = ?
             ORDER BY seq DESC
             LIMIT 1`,
        )
        .get(dependencyId) as CoordinationDependencyHistoryRecord | undefined;
    return row ?? null;
}
