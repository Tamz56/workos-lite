import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { ensureProjectStateSchema } from "@/lib/project-state/schema";

function createDb() {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(`
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE
        );
    `);
    ensureProjectStateSchema(db);
    return db;
}

function insertProject(db: Database.Database, id = "p-1", slug = "project-one") {
    db.prepare("INSERT INTO projects (id, slug) VALUES (?, ?)").run(id, slug);
}

function insertVersion(
    db: Database.Database,
    id: string,
    projectId: string,
    supersedes: string | null = null,
) {
    db.prepare(`
        INSERT INTO project_state_versions (
            id, project_id, schema_version, state_payload_json,
            supersedes_state_version_id, authority_ref, source_type,
            source_ref, source_hash, issued_at, issued_by, created_at
        ) VALUES (?, ?, 'project-state.v1', ?, ?, ?, 'human', ?, ?, ?, 'human-1', ?)
    `).run(
        id,
        projectId,
        JSON.stringify({
            projectStatus: { status: "KNOWN", value: "ACTIVE" },
            posture: { status: "UNKNOWN" },
            phase: { status: "UNKNOWN" },
            currentFocus: { status: "UNKNOWN" },
            nextAuthoritativeAction: { status: "UNKNOWN" },
            waitingOrHold: { status: "NOT_GOVERNED" },
            blockers: { status: "KNOWN", value: [] },
            dependencies: { status: "KNOWN", value: [] },
        }),
        supersedes,
        `AUTH-${id}`,
        `SOURCE-${id}`,
        `HASH-${id}`,
        "2026-09-19T00:00:00Z",
        "2026-09-19T00:00:00Z",
    );
}

describe("Project-State schema", () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createDb();
        insertProject(db);
    });

    it("creates exactly the two Project-State tables", () => {
        const names = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type = 'table' AND name LIKE 'project_state_%'
            ORDER BY name
        `).all() as Array<{ name: string }>;
        expect(names.map((row) => row.name)).toEqual([
            "project_state_heads",
            "project_state_versions",
        ]);
    });

    it("keeps version rows immutable", () => {
        insertVersion(db, "v1", "p-1");
        expect(() => db.prepare("UPDATE project_state_versions SET authority_ref = 'changed' WHERE id = 'v1'").run())
            .toThrow(/immutable/);
        expect(() => db.prepare("DELETE FROM project_state_versions WHERE id = 'v1'").run())
            .toThrow(/immutable/);
    });

    it("enforces project binding and one head per Project", () => {
        insertVersion(db, "v1", "p-1");
        db.prepare(`
            INSERT INTO project_state_heads (
                project_id, current_state_version_id, selected_at, selected_by, selection_authority_ref
            ) VALUES ('p-1', 'v1', '2026-09-19T00:00:00Z', 'human-1', 'HEAD-AUTH-1')
        `).run();

        expect(() => db.prepare(`
            INSERT INTO project_state_heads (
                project_id, current_state_version_id, selected_at, selected_by, selection_authority_ref
            ) VALUES ('p-1', 'v1', '2026-09-19T00:01:00Z', 'human-2', 'HEAD-AUTH-2')
        `).run()).toThrow();

        db.prepare("INSERT INTO projects (id, slug) VALUES ('p-2', 'project-two')").run();
        insertVersion(db, "v2", "p-2");
        expect(() => db.prepare(`
            UPDATE project_state_heads
            SET current_state_version_id = 'v2'
            WHERE project_id = 'p-1'
        `).run()).toThrow(/project mismatch/);
    });

    it("enforces linear same-Project supersession", () => {
        insertVersion(db, "v1", "p-1");
        insertVersion(db, "v2", "p-1", "v1");
        expect(() => insertVersion(db, "v3", "p-1", "v1")).toThrow();

        db.prepare("INSERT INTO projects (id, slug) VALUES ('p-2', 'project-two')").run();
        expect(() => insertVersion(db, "v4", "p-2", "v2")).toThrow(/predecessor\/project mismatch/);
    });
});
