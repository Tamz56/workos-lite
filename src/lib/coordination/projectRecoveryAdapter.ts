// ---------------------------------------------------------------------------
// Project Recovery Adapter — bounded project-level recovery resume.
//
// Routing contract (frozen):
//   projectSlug -> exact Project -> all coordination_lanes by project_id
//     0 lanes  -> NO_RECOVERY_LANE
//     1 lane   -> CoordinationReadAdapter.resume(projectSlug, laneKey)
//     >1 lanes -> AMBIGUOUS_LANE (candidates ordered by lane_key ASC only)
//
// Never chooses a Lane using recency, seq, created_at, name, or lifecycle
// inference. This module never asserts CANONICAL_PROJECT_STATE:
//   Project State is always value=null, source=null, authorityClass=NONE,
//   currentness=NOT_PROVEN. Any authoritative resume payload stays nested
//   under `coordinationResume` (AUTHORITATIVE_RESUME for the Lane only).
//
// Read-only: no HTTP API, no schema/migration, no DB/state writes.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import {
    COORDINATION_PROJECT_SLUG,
    listCoordinationProjectLanes,
    resolveCoordinationProject,
} from "./laneResolver";
import {
    CoordinationReadAdapter,
    type CoordinationReadResult,
    type CoordinationReadStatus,
} from "./readAdapter";

export const PROJECT_RECOVERY_SCHEMA_VERSION = "project-recovery.v1" as const;

export type ProjectRecoveryStatus =
    | "RECOVERED"
    | "NO_RECOVERY_LANE"
    | "AMBIGUOUS_LANE"
    | "PROJECT_NOT_FOUND"
    // Typed resume failures are preserved verbatim (never downgraded):
    | "NO_CHECKPOINT_YET"
    | "CURRENTNESS_UNRESOLVABLE"
    | "CHECKPOINT_EVIDENCE_INVALID"
    | "UNSUPPORTED_VERSION"
    | "EVIDENCE_UNAVAILABLE"
    | "INVALID_ARGUMENT";

export interface ProjectRecoveryCandidate {
    projectSlug: string;
    laneId: string;
    laneKey: string;
}

export type ProjectRecoveryCurrentness =
    | "RESOLVED_AT_REQUEST"
    | "VALIDATED_CURRENT_ONLY"
    | "NOT_PROVEN";

export interface ProjectRecoveryProjectValue {
    projectId: string;
    projectSlug: string;
    projectName: string;
}

export interface ProjectRecoveryLaneValue {
    laneId: string;
    laneKey: string;
    laneName: string;
}

/** Project identity provenance — resolved deterministically at request time. */
export interface ProjectRecoveryProject {
    value: ProjectRecoveryProjectValue | null;
    source: "projects";
    authorityClass: "PROJECT_IDENTITY";
    currentness: "RESOLVED_AT_REQUEST";
}

/** Lane binding provenance — resolved deterministically at request time. */
export interface ProjectRecoveryLane {
    value: ProjectRecoveryLaneValue | null;
    source: "coordination_lanes";
    authorityClass: "COORDINATION_BINDING";
    currentness: "RESOLVED_AT_REQUEST";
}

/**
 * Wrapped resume provenance. `value` preserves the exact CoordinationReadResult
 * (status/detail/data untouched). authorityClass is preserved verbatim;
 * currentness follows the frozen rule: RESUMED -> VALIDATED_CURRENT_ONLY,
 * otherwise NOT_PROVEN.
 */
export interface ProjectRecoveryCoordinationResume {
    value: CoordinationReadResult;
    source: "CoordinationReadAdapter.resume";
    authorityClass: CoordinationReadResult["authorityClass"];
    currentness: "VALIDATED_CURRENT_ONLY" | "NOT_PROVEN";
}

/** CANONICAL_PROJECT_STATE is never produced; the Project State stays NOT_PROVEN. */
export interface ProjectRecoveryProjectState {
    value: null;
    source: null;
    authorityClass: "NONE";
    currentness: "NOT_PROVEN";
}

export const PROJECT_RECOVERY_NOT_PROVEN_STATE: ProjectRecoveryProjectState = {
    value: null,
    source: null,
    authorityClass: "NONE",
    currentness: "NOT_PROVEN",
};

export interface ProjectRecoveryResult {
    schemaVersion: typeof PROJECT_RECOVERY_SCHEMA_VERSION;
    operation: "PROJECT_RECOVERY";
    status: ProjectRecoveryStatus;
    projectSlug: string;
    projectId: string | null;
    project: ProjectRecoveryProject;
    lane: ProjectRecoveryLane;
    projectState: ProjectRecoveryProjectState;
    /** AMBIGUOUS_LANE only — ordered by lane_key ASC, deterministic. */
    candidates?: ProjectRecoveryCandidate[];
    /** Single-Lane path only — resume provenance wrapper. */
    coordinationResume?: ProjectRecoveryCoordinationResume | null;
    detail?: string;
}

function resumeStatusToRecoveryStatus(status: CoordinationReadStatus): ProjectRecoveryStatus {
    switch (status) {
        case "NO_CHECKPOINT_YET":
        case "CURRENTNESS_UNRESOLVABLE":
        case "CHECKPOINT_EVIDENCE_INVALID":
        case "UNSUPPORTED_VERSION":
        case "EVIDENCE_UNAVAILABLE":
            return status;
        default:
            // Never invent a project-level recovery success from an unexpected state.
            return "EVIDENCE_UNAVAILABLE";
    }
}

export class ProjectRecoveryAdapter {
    constructor(private readonly db: Database.Database) {}

    recover(projectSlug: string): ProjectRecoveryResult {
        if (!COORDINATION_PROJECT_SLUG.test(projectSlug)) {
            return this.result({
                status: "INVALID_ARGUMENT",
                projectSlug,
                projectId: null,
                projectValue: null,
                detail: "projectSlug must be a canonical lowercase slug",
            });
        }

        const project = resolveCoordinationProject(this.db, projectSlug);
        if (!project) {
            return this.result({
                status: "PROJECT_NOT_FOUND",
                projectSlug,
                projectId: null,
                projectValue: null,
                detail: `Project ${projectSlug} does not exist`,
            });
        }

        const projectValue: ProjectRecoveryProjectValue = {
            projectId: project.projectId,
            projectSlug: project.projectSlug,
            projectName: this.loadProjectName(project.projectId) ?? project.projectSlug,
        };
        const lanes = listCoordinationProjectLanes(this.db, project.projectId);
        if (lanes.length === 0) {
            return this.result({
                status: "NO_RECOVERY_LANE",
                projectSlug,
                projectId: project.projectId,
                projectValue,
            });
        }

        if (lanes.length === 1) {
            // Single-Lane routing delegates exclusively to the frozen G6B resume core.
            const lane = lanes[0];
            const laneValue: ProjectRecoveryLaneValue = {
                laneId: lane.laneId,
                laneKey: lane.laneKey,
                laneName: this.loadLaneName(lane.laneId) ?? lane.laneKey,
            };
            const resume = new CoordinationReadAdapter(this.db).resume(projectSlug, lane.laneKey);
            const coordinationResume: ProjectRecoveryCoordinationResume = {
                value: resume,
                source: "CoordinationReadAdapter.resume",
                authorityClass: resume.authorityClass,
                currentness: resume.status === "RESUMED" ? "VALIDATED_CURRENT_ONLY" : "NOT_PROVEN",
            };
            if (resume.status === "RESUMED") {
                return this.result({
                    status: "RECOVERED",
                    projectSlug,
                    projectId: project.projectId,
                    projectValue,
                    laneValue,
                    coordinationResume,
                });
            }
            return this.result({
                status: resumeStatusToRecoveryStatus(resume.status),
                projectSlug,
                projectId: project.projectId,
                projectValue,
                laneValue,
                coordinationResume,
                detail: resume.detail,
            });
        }

        const candidates = lanes.map((lane) => ({
            projectSlug,
            laneId: lane.laneId,
            laneKey: lane.laneKey,
        }));
        return this.result({
            status: "AMBIGUOUS_LANE",
            projectSlug,
            projectId: project.projectId,
            projectValue,
            candidates,
            detail: `${candidates.length} coordination lanes exist; no Lane is selected without authority`,
        });
    }

    private loadProjectName(projectId: string): string | null {
        const row = this.db.prepare("SELECT name FROM projects WHERE id = ?").get(projectId) as
            | { name: string }
            | undefined;
        return row?.name ?? null;
    }

    private loadLaneName(laneId: string): string | null {
        const row = this.db.prepare("SELECT name FROM coordination_lanes WHERE id = ?").get(laneId) as
            | { name: string }
            | undefined;
        return row?.name ?? null;
    }

    private result(options: {
        status: ProjectRecoveryStatus;
        projectSlug: string;
        projectId: string | null;
        projectValue: ProjectRecoveryProjectValue | null;
        laneValue?: ProjectRecoveryLaneValue | null;
        coordinationResume?: ProjectRecoveryCoordinationResume | null;
        candidates?: ProjectRecoveryCandidate[];
        detail?: string;
    }): ProjectRecoveryResult {
        return {
            schemaVersion: PROJECT_RECOVERY_SCHEMA_VERSION,
            operation: "PROJECT_RECOVERY",
            status: options.status,
            projectSlug: options.projectSlug,
            projectId: options.projectId,
            project: {
                value: options.projectValue,
                source: "projects",
                authorityClass: "PROJECT_IDENTITY",
                currentness: "RESOLVED_AT_REQUEST",
            },
            lane: {
                value: options.laneValue ?? null,
                source: "coordination_lanes",
                authorityClass: "COORDINATION_BINDING",
                currentness: "RESOLVED_AT_REQUEST",
            },
            projectState: PROJECT_RECOVERY_NOT_PROVEN_STATE,
            ...(options.coordinationResume ? { coordinationResume: options.coordinationResume } : {}),
            ...(options.candidates ? { candidates: options.candidates } : {}),
            ...(options.detail ? { detail: options.detail } : {}),
        };
    }
}
