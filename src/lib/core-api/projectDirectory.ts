import type Database from "better-sqlite3";
import { readCanonicalProjectStateBySlug } from "@/lib/project-state/readService";
import type { CanonicalProjectStateReadResult } from "@/lib/project-state/types";
import {
    WORKOS_CORE_SCHEMA_VERSION,
    type CoreCanonicalStateSummary,
    type CoreProjectDirectoryEntry,
    type CoreProjectDirectoryResponse,
} from "./types";

type ProjectDirectoryRow = {
    id: string;
    slug: string;
    name: string;
    category: string | null;
    registry_status: string | null;
    priority: string | null;
    current_goal: string | null;
    progress_stage: string | null;
    next_action: string | null;
    cadence: string | null;
    risk_or_blocked_by: string | null;
    metadata_updated_at: string | null;
};

function stateRouteFor(projectSlug: string): string {
    return `/api/projects/${encodeURIComponent(projectSlug)}/state`;
}

function summarizeCanonicalState(
    projectSlug: string,
    result: CanonicalProjectStateReadResult,
): CoreCanonicalStateSummary {
    const stateRoute = stateRouteFor(projectSlug);

    if (result.status === "CURRENT") {
        return {
            authority: "PROJECT_STATE",
            stateStatus: "CURRENT",
            stateVersionId: result.state.id,
            stateRoute,
            nextAuthoritativeAction: result.state.payload.nextAuthoritativeAction,
        };
    }

    if (result.status === "STALE") {
        return {
            authority: "PROJECT_STATE",
            stateStatus: "STALE",
            stateVersionId: result.staleStateVersionId,
            stateRoute,
            nextAuthoritativeAction: null,
        };
    }

    return {
        authority: "PROJECT_STATE",
        stateStatus: "NOT_PROVEN",
        stateVersionId: null,
        stateRoute,
        nextAuthoritativeAction: null,
    };
}

function toDirectoryEntry(
    db: Database.Database,
    row: ProjectDirectoryRow,
): CoreProjectDirectoryEntry {
    const canonical = readCanonicalProjectStateBySlug(db, row.slug);

    return {
        projectId: row.id,
        projectSlug: row.slug,
        projectName: row.name,
        registryMetadata: {
            authority: "REGISTRY_METADATA",
            currentness: "CURRENT_WITHIN_SOURCE",
            category: row.category,
            registryStatus: row.registry_status,
            priority: row.priority,
            currentGoal: row.current_goal,
            progressStage: row.progress_stage,
            nextAction: row.next_action,
            cadence: row.cadence,
            riskOrBlockedBy: row.risk_or_blocked_by,
            metadataUpdatedAt: row.metadata_updated_at,
        },
        canonicalProjectState: summarizeCanonicalState(row.slug, canonical),
    };
}

export function readCoreProjectDirectory(
    db: Database.Database,
): CoreProjectDirectoryResponse {
    const rows = db.prepare(`
        SELECT
            id,
            slug,
            name,
            category,
            registry_status,
            priority,
            current_goal,
            progress_stage,
            next_action,
            cadence,
            risk_or_blocked_by,
            metadata_updated_at
        FROM projects
        ORDER BY id ASC
    `).all() as ProjectDirectoryRow[];

    return {
        schemaVersion: WORKOS_CORE_SCHEMA_VERSION,
        projects: rows.map((row) => toDirectoryEntry(db, row)),
    };
}
