import type Database from "better-sqlite3";
import {
    PROJECT_STATE_SCHEMA_VERSION,
    type CanonicalProjectState,
    type CanonicalProjectStateReadResult,
    type ProjectStateHeadRow,
    type ProjectStateNotProvenReason,
    type ProjectStatePayloadV1,
    type ProjectStateVersionRow,
} from "./types";

const PAYLOAD_KEYS = [
    "projectStatus",
    "posture",
    "phase",
    "currentFocus",
    "nextAuthoritativeAction",
    "waitingOrHold",
    "blockers",
    "dependencies",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGovernedFact(value: unknown): boolean {
    if (!isRecord(value) || typeof value.status !== "string") return false;
    if (value.status === "KNOWN") {
        return Object.prototype.hasOwnProperty.call(value, "value");
    }
    return value.status === "UNKNOWN" || value.status === "NOT_GOVERNED";
}

export function parseProjectStatePayloadV1(raw: string): ProjectStatePayloadV1 | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!isRecord(parsed)) return null;

    const keys = Object.keys(parsed);
    if (keys.length !== PAYLOAD_KEYS.length) return null;
    if (keys.some((key) => !PAYLOAD_KEYS.includes(key as (typeof PAYLOAD_KEYS)[number]))) return null;
    if (PAYLOAD_KEYS.some((key) => !isGovernedFact(parsed[key]))) return null;

    return parsed as ProjectStatePayloadV1;
}

function nonEmpty(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function validateVersionRow(
    row: ProjectStateVersionRow,
    expectedProjectId: string,
): { state: CanonicalProjectState } | { reason: ProjectStateNotProvenReason } {
    if (row.project_id !== expectedProjectId) {
        return { reason: "PROJECT_MISMATCH" };
    }

    if (row.schema_version !== PROJECT_STATE_SCHEMA_VERSION) {
        return { reason: "UNSUPPORTED_SCHEMA_VERSION" };
    }

    if (
        !nonEmpty(row.id)
        || !nonEmpty(row.authority_ref)
        || !nonEmpty(row.source_type)
        || !nonEmpty(row.source_ref)
        || !nonEmpty(row.source_hash)
        || !nonEmpty(row.issued_at)
        || !nonEmpty(row.issued_by)
        || !nonEmpty(row.created_at)
    ) {
        return { reason: "MISSING_PROVENANCE" };
    }

    const payload = parseProjectStatePayloadV1(row.state_payload_json);
    if (!payload) {
        return { reason: "MALFORMED_PAYLOAD" };
    }

    return {
        state: {
            id: row.id,
            projectId: row.project_id,
            schemaVersion: PROJECT_STATE_SCHEMA_VERSION,
            payload,
            supersedesStateVersionId: row.supersedes_state_version_id,
            authorityRef: row.authority_ref,
            sourceType: row.source_type,
            sourceRef: row.source_ref,
            sourceHash: row.source_hash,
            issuedAt: row.issued_at,
            issuedBy: row.issued_by,
            createdAt: row.created_at,
        },
    };
}

function notProven(
    projectSlug: string,
    projectId: string | undefined,
    reason: ProjectStateNotProvenReason,
): CanonicalProjectStateReadResult {
    return projectId
        ? { status: "NOT_PROVEN", projectSlug, projectId, reason }
        : { status: "NOT_PROVEN", projectSlug, reason };
}

export function readCanonicalProjectStateBySlug(
    db: Database.Database,
    projectSlug: string,
): CanonicalProjectStateReadResult {
    try {
        const project = db
            .prepare("SELECT id, slug FROM projects WHERE slug = ?")
            .get(projectSlug) as { id: string; slug: string } | undefined;

        if (!project) {
            return { status: "PROJECT_NOT_FOUND", projectSlug };
        }

        const head = db
            .prepare(`
                SELECT project_id, current_state_version_id, selected_at, selected_by, selection_authority_ref
                FROM project_state_heads
                WHERE project_id = ?
            `)
            .get(project.id) as ProjectStateHeadRow | undefined;

        if (!head) {
            return notProven(projectSlug, project.id, "NO_HEAD");
        }

        if (head.project_id !== project.id) {
            return notProven(projectSlug, project.id, "PROJECT_MISMATCH");
        }

        if (!nonEmpty(head.current_state_version_id)
            || !nonEmpty(head.selected_at)
            || !nonEmpty(head.selected_by)
            || !nonEmpty(head.selection_authority_ref)) {
            return notProven(projectSlug, project.id, "MISSING_PROVENANCE");
        }

        const version = db
            .prepare(`
                SELECT
                    id,
                    project_id,
                    schema_version,
                    state_payload_json,
                    supersedes_state_version_id,
                    authority_ref,
                    source_type,
                    source_ref,
                    source_hash,
                    issued_at,
                    issued_by,
                    created_at
                FROM project_state_versions
                WHERE id = ?
            `)
            .get(head.current_state_version_id) as ProjectStateVersionRow | undefined;

        if (!version) {
            return notProven(projectSlug, project.id, "HEAD_VERSION_NOT_FOUND");
        }

        const validated = validateVersionRow(version, project.id);
        if ("reason" in validated) {
            return notProven(projectSlug, project.id, validated.reason);
        }

        if (version.supersedes_state_version_id !== null) {
            const predecessor = db
                .prepare("SELECT id, project_id FROM project_state_versions WHERE id = ?")
                .get(version.supersedes_state_version_id) as { id: string; project_id: string } | undefined;
            if (!predecessor || predecessor.project_id !== project.id) {
                return notProven(projectSlug, project.id, "SUPERSESSION_INVALID");
            }
        }

        const successors = db
            .prepare(`
                SELECT
                    id,
                    project_id,
                    schema_version,
                    state_payload_json,
                    supersedes_state_version_id,
                    authority_ref,
                    source_type,
                    source_ref,
                    source_hash,
                    issued_at,
                    issued_by,
                    created_at
                FROM project_state_versions
                WHERE supersedes_state_version_id = ?
                ORDER BY id ASC
            `)
            .all(version.id) as ProjectStateVersionRow[];

        if (successors.length > 1) {
            return notProven(projectSlug, project.id, "SUPERSESSION_INVALID");
        }

        if (successors.length === 1) {
            const successorValidated = validateVersionRow(successors[0], project.id);
            if ("reason" in successorValidated) {
                return notProven(projectSlug, project.id, successorValidated.reason);
            }

            return {
                status: "STALE",
                projectSlug,
                projectId: project.id,
                head,
                staleStateVersionId: version.id,
                supersededByStateVersionId: successors[0].id,
            };
        }

        return {
            status: "CURRENT",
            projectSlug,
            projectId: project.id,
            head,
            state: validated.state,
        };
    } catch {
        return notProven(projectSlug, undefined, "READ_UNAVAILABLE");
    }
}
