import { randomUUID } from "crypto";
import type Database from "better-sqlite3";

import {
    COORDINATION_LANE_KEY,
    COORDINATION_PROJECT_SLUG,
} from "./laneResolver";

export type CoordinationLaneWriterCode =
    | "COORDINATION_LANE_WRITER_INVALID"
    | "COORDINATION_PROJECT_NOT_FOUND"
    | "COORDINATION_LANE_CONFLICT";

export class CoordinationLaneWriterError extends Error {
    constructor(
        public readonly code: CoordinationLaneWriterCode,
        message: string,
        public readonly status: 400 | 404 | 409,
    ) {
        super(message);
        this.name = "CoordinationLaneWriterError";
    }
}

export type GovernedCoordinationLaneRequest = {
    projectSlug: string;
    laneKey: string;
    name: string;
};

export type CreatedCoordinationLane = {
    projectSlug: string;
    laneKey: string;
    laneId: string;
    name: string;
};

type LaneWriterDeps = {
    randomUUID?: () => string;
};

const REQUEST_KEYS = new Set([
    "projectSlug",
    "laneKey",
    "name",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalid(message: string): never {
    throw new CoordinationLaneWriterError(
        "COORDINATION_LANE_WRITER_INVALID",
        message,
        400,
    );
}

function requireString(
    value: unknown,
    field: keyof GovernedCoordinationLaneRequest,
): string {
    if (typeof value !== "string") {
        invalid(`${field} must be a string`);
    }
    return value;
}

export function parseGovernedCoordinationLaneRequest(
    raw: unknown,
): GovernedCoordinationLaneRequest {
    if (!isRecord(raw)) {
        invalid("request must be an object");
    }

    for (const key of Object.keys(raw)) {
        if (!REQUEST_KEYS.has(key)) {
            invalid(`request contains unsupported field ${key}`);
        }
    }

    for (const key of REQUEST_KEYS) {
        if (!(key in raw)) {
            invalid(`${key} is required`);
        }
    }

    const projectSlug = requireString(raw.projectSlug, "projectSlug");
    const laneKey = requireString(raw.laneKey, "laneKey");
    const name = requireString(raw.name, "name");

    if (!COORDINATION_PROJECT_SLUG.test(projectSlug)) {
        invalid("projectSlug must be a canonical lowercase slug");
    }

    if (!COORDINATION_LANE_KEY.test(laneKey)) {
        invalid("laneKey must be a canonical lowercase Lane key");
    }

    if (name.trim().length === 0) {
        invalid("name must be non-empty");
    }

    return {
        projectSlug,
        laneKey,
        name,
    };
}

/**
 * Bounded Human-governed canonical Lane writer.
 *
 * It creates exactly one coordination_lanes row:
 * - projectId is resolved server-side from canonical projects.slug
 * - laneKey is caller-supplied and validation-only
 * - laneId is server-generated
 * - no checkpoint/state/dependency/condition/cross-Lane side effect is created
 */
export function createGovernedCoordinationLane(
    db: Database.Database,
    rawRequest: unknown,
    deps: LaneWriterDeps = {},
): CreatedCoordinationLane {
    const request = parseGovernedCoordinationLaneRequest(rawRequest);
    const generateUUID = deps.randomUUID ?? randomUUID;

    return db.transaction(() => {
        const project = db.prepare(
            "SELECT id, slug FROM projects WHERE slug = ?",
        ).get(request.projectSlug) as
            | { id: string; slug: string }
            | undefined;

        if (!project) {
            throw new CoordinationLaneWriterError(
                "COORDINATION_PROJECT_NOT_FOUND",
                `Project ${request.projectSlug} does not exist`,
                404,
            );
        }

        const existing = db.prepare(
            `SELECT id
             FROM coordination_lanes
             WHERE project_id = ? AND lane_key = ?`,
        ).get(project.id, request.laneKey) as
            | { id: string }
            | undefined;

        if (existing) {
            throw new CoordinationLaneWriterError(
                "COORDINATION_LANE_CONFLICT",
                `Lane ${request.laneKey} already exists in Project ${request.projectSlug}`,
                409,
            );
        }

        const laneId = `lane-${generateUUID()}`;

        db.prepare(
            `INSERT INTO coordination_lanes (id, project_id, lane_key, name)
             VALUES (?, ?, ?, ?)`,
        ).run(
            laneId,
            project.id,
            request.laneKey,
            request.name,
        );

        return {
            projectSlug: project.slug,
            laneKey: request.laneKey,
            laneId,
            name: request.name,
        };
    }).immediate();
}
