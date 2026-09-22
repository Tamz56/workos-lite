import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readCoreProjectDirectory } from "@/lib/core-api/projectDirectory";
import { ensureProjectStateSchema } from "@/lib/project-state/schema";

const CURRENT_PAYLOAD = JSON.stringify({
    projectStatus: { status: "KNOWN", value: "ACTIVE" },
    posture: { status: "KNOWN", value: "READ_ONLY" },
    phase: { status: "KNOWN", value: "P04-W04-I001" },
    currentFocus: { status: "KNOWN", value: "WorkOS Core API v0.1" },
    nextAuthoritativeAction: { status: "KNOWN", value: "Run bounded runtime proof" },
    waitingOrHold: { status: "NOT_GOVERNED" },
    blockers: { status: "KNOWN", value: [] },
    dependencies: { status: "KNOWN", value: [] },
});

const STALE_PAYLOAD = JSON.stringify({
    projectStatus: { status: "KNOWN", value: "ACTIVE" },
    posture: { status: "KNOWN", value: "READ_ONLY" },
    phase: { status: "KNOWN", value: "OLD" },
    currentFocus: { status: "KNOWN", value: "Old state" },
    nextAuthoritativeAction: { status: "KNOWN", value: "Old authoritative action" },
    waitingOrHold: { status: "NOT_GOVERNED" },
    blockers: { status: "KNOWN", value: [] },
    dependencies: { status: "KNOWN", value: [] },
});

function createProjectsTable(db: Database.Database): void {
    db.exec(`
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            category TEXT,
            registry_status TEXT,
            priority TEXT,
            current_goal TEXT,
            progress_stage TEXT,
            next_action TEXT,
            cadence TEXT,
            risk_or_blocked_by TEXT,
            metadata_updated_at TEXT
        )
    `);
}

function insertProject(
    db: Database.Database,
    values: { id: string; slug: string; name: string; nextAction: string },
): void {
    db.prepare(`
        INSERT INTO projects (
            id, slug, name, category, registry_status, priority,
            current_goal, progress_stage, next_action, cadence,
            risk_or_blocked_by, metadata_updated_at
        ) VALUES (?, ?, ?, 'system', 'active', 'high', 'Registry goal', 'In Dev', ?, 'weekly', NULL, '2026-09-22T00:00:00Z')
    `).run(values.id, values.slug, values.name, values.nextAction);
}

function insertVersion(
    db: Database.Database,
    values: {
        id: string;
        projectId: string;
        payload: string;
        supersedes?: string | null;
    },
): void {
    db.prepare(`
        INSERT INTO project_state_versions (
            id, project_id, schema_version, state_payload_json,
            supersedes_state_version_id, authority_ref, source_type,
            source_ref, source_hash, issued_at, issued_by, created_at
        ) VALUES (?, ?, 'project-state.v1', ?, ?, ?, 'human_frozen_contract', ?, ?, '2026-09-22T00:00:00Z', 'human', '2026-09-22T00:00:00Z')
    `).run(
        values.id,
        values.projectId,
        values.payload,
        values.supersedes ?? null,
        `AUTH-${values.id}`,
        `SOURCE-${values.id}`,
        `HASH-${values.id}`,
    );
}

function selectHead(db: Database.Database, projectId: string, versionId: string): void {
    db.prepare(`
        INSERT INTO project_state_heads (
            project_id, current_state_version_id, selected_at, selected_by, selection_authority_ref
        ) VALUES (?, ?, '2026-09-22T01:00:00Z', 'human', 'HEAD-AUTH')
    `).run(projectId, versionId);
}

const projectDirectorySource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/core-api/projectDirectory.ts"),
    "utf8",
);

describe("WorkOS Core API project directory", () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(":memory:");
        db.pragma("foreign_keys = ON");
        createProjectsTable(db);
        ensureProjectStateSchema(db);
    });

    afterEach(() => {
        if (db.open) db.close();
    });

    it("delegates canonical-state selection to readCanonicalProjectStateBySlug", () => {
        expect(projectDirectorySource).toContain(
            "readCanonicalProjectStateBySlug(db, row.slug)",
        );
        expect(projectDirectorySource).not.toMatch(/project_state_heads|project_state_versions/);
        expect(projectDirectorySource).not.toMatch(/MAX\s*\(/i);
    });

    it("preserves exact Project identity and labels Registry metadata as non-canonical", () => {
        insertProject(db, {
            id: "P04",
            slug: "workos-lite",
            name: "WorkOS-Lite",
            nextAction: "REGISTRY ACTION MUST NOT BECOME CANONICAL",
        });
        insertVersion(db, {
            id: "PSV-WORKOS-LITE-000001",
            projectId: "P04",
            payload: CURRENT_PAYLOAD,
        });
        selectHead(db, "P04", "PSV-WORKOS-LITE-000001");

        const result = readCoreProjectDirectory(db);
        expect(result.schemaVersion).toBe("workos-core.v0.1");
        expect(result.projects).toHaveLength(1);

        const project = result.projects[0];
        expect(project).toMatchObject({
            projectId: "P04",
            projectSlug: "workos-lite",
            projectName: "WorkOS-Lite",
            registryMetadata: {
                authority: "REGISTRY_METADATA",
                currentness: "CURRENT_WITHIN_SOURCE",
                nextAction: "REGISTRY ACTION MUST NOT BECOME CANONICAL",
            },
            canonicalProjectState: {
                authority: "PROJECT_STATE",
                stateStatus: "CURRENT",
                stateVersionId: "PSV-WORKOS-LITE-000001",
                stateRoute: "/api/projects/workos-lite/state",
                nextAuthoritativeAction: {
                    status: "KNOWN",
                    value: "Run bounded runtime proof",
                },
            },
        });
        expect(project.canonicalProjectState.nextAuthoritativeAction).not.toBe(
            project.registryMetadata.nextAction,
        );
    });

    it("returns NOT_PROVEN without a head and never falls back to Registry nextAction", () => {
        insertProject(db, {
            id: "P-NO-HEAD",
            slug: "no-head",
            name: "No Head",
            nextAction: "Registry fallback forbidden",
        });

        const project = readCoreProjectDirectory(db).projects[0];
        expect(project.canonicalProjectState).toMatchObject({
            stateStatus: "NOT_PROVEN",
            stateVersionId: null,
            nextAuthoritativeAction: null,
        });
        expect(project.registryMetadata.nextAction).toBe("Registry fallback forbidden");
    });

    it("returns STALE and withholds nextAuthoritativeAction when the selected head is superseded", () => {
        insertProject(db, {
            id: "P-STALE",
            slug: "stale",
            name: "Stale",
            nextAction: "Registry fallback forbidden",
        });
        insertVersion(db, {
            id: "PSV-STALE-1",
            projectId: "P-STALE",
            payload: STALE_PAYLOAD,
        });
        insertVersion(db, {
            id: "PSV-STALE-2",
            projectId: "P-STALE",
            payload: CURRENT_PAYLOAD,
            supersedes: "PSV-STALE-1",
        });
        selectHead(db, "P-STALE", "PSV-STALE-1");

        const project = readCoreProjectDirectory(db).projects[0];
        expect(project.canonicalProjectState).toMatchObject({
            stateStatus: "STALE",
            stateVersionId: "PSV-STALE-1",
            nextAuthoritativeAction: null,
        });
    });

    it("fails closed when the directory read itself is unavailable", () => {
        db.close();
        expect(() => readCoreProjectDirectory(db)).toThrow();
    });
});
