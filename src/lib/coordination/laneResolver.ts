import type Database from "better-sqlite3";

export const COORDINATION_PROJECT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const COORDINATION_LANE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ResolvedCoordinationLane = {
    projectId: string;
    projectSlug: string;
    laneId: string;
    laneKey: string;
};

export type CoordinationLaneResolutionCode =
    | "COORDINATION_PROJECT_SLUG_INVALID"
    | "COORDINATION_LANE_KEY_INVALID"
    | "COORDINATION_PROJECT_NOT_FOUND"
    | "COORDINATION_LANE_NOT_FOUND"
    | "COORDINATION_PROJECT_LANE_AMBIGUOUS";

export class CoordinationLaneResolutionError extends Error {
    constructor(
        readonly code: CoordinationLaneResolutionCode,
        detail: string,
    ) {
        super(`${code}: ${detail}`);
        this.name = "CoordinationLaneResolutionError";
    }
}

/** Resolves a canonical Lane only within its owning Project. */
export function resolveCoordinationProjectLane(
    db: Database.Database,
    projectSlug: string,
    laneKey: string,
): ResolvedCoordinationLane {
    if (!COORDINATION_PROJECT_SLUG.test(projectSlug)) {
        throw new CoordinationLaneResolutionError(
            "COORDINATION_PROJECT_SLUG_INVALID",
            "projectSlug must be a canonical lowercase slug",
        );
    }
    if (!COORDINATION_LANE_KEY.test(laneKey)) {
        throw new CoordinationLaneResolutionError(
            "COORDINATION_LANE_KEY_INVALID",
            "laneKey must be a canonical lowercase Lane key",
        );
    }

    const projects = db.prepare("SELECT id, slug FROM projects WHERE slug = ?").all(projectSlug) as Array<{
        id: string;
        slug: string;
    }>;
    if (projects.length === 0) {
        throw new CoordinationLaneResolutionError(
            "COORDINATION_PROJECT_NOT_FOUND",
            `Project ${projectSlug} does not exist`,
        );
    }
    if (projects.length !== 1) {
        throw new CoordinationLaneResolutionError(
            "COORDINATION_PROJECT_LANE_AMBIGUOUS",
            `Project ${projectSlug} resolved ambiguously`,
        );
    }

    const project = projects[0];
    const lanes = db.prepare(
        `SELECT id, project_id, lane_key
         FROM coordination_lanes
         WHERE project_id = ? AND lane_key = ?`,
    ).all(project.id, laneKey) as Array<{ id: string; project_id: string; lane_key: string }>;
    if (lanes.length === 0) {
        throw new CoordinationLaneResolutionError(
            "COORDINATION_LANE_NOT_FOUND",
            `Lane ${laneKey} does not belong to Project ${projectSlug}`,
        );
    }
    if (lanes.length !== 1 || lanes[0].project_id !== project.id) {
        throw new CoordinationLaneResolutionError(
            "COORDINATION_PROJECT_LANE_AMBIGUOUS",
            `Lane ${laneKey} did not resolve uniquely within Project ${projectSlug}`,
        );
    }

    const lane = lanes[0];
    return {
        projectId: project.id,
        projectSlug: project.slug,
        laneId: lane.id,
        laneKey: lane.lane_key,
    };
}

export interface ResolvedCoordinationProject {
    projectId: string;
    projectSlug: string;
}

export interface CoordinationProjectLaneReference {
    laneId: string;
    laneKey: string;
}

/** Resolves the exact owning Project for a slug, or null when it does not exist. */
export function resolveCoordinationProject(
    db: Database.Database,
    projectSlug: string,
): ResolvedCoordinationProject | null {
    const projects = db.prepare("SELECT id, slug FROM projects WHERE slug = ?").all(projectSlug) as Array<{
        id: string;
        slug: string;
    }>;
    if (projects.length !== 1) return null;
    return { projectId: projects[0].id, projectSlug: projects[0].slug };
}

/**
 * Lists every Lane owned by a Project ordered by lane_key ASC only.
 * Deterministic by design; never ordered by recency, seq, created_at, or name.
 */
export function listCoordinationProjectLanes(
    db: Database.Database,
    projectId: string,
): CoordinationProjectLaneReference[] {
    const lanes = db.prepare(
        `SELECT id AS laneId, lane_key AS laneKey
         FROM coordination_lanes
         WHERE project_id = ?
         ORDER BY lane_key ASC`,
    ).all(projectId) as Array<{ laneId: string; laneKey: string }>;
    return lanes.map((lane) => ({ laneId: lane.laneId, laneKey: lane.laneKey }));
}
