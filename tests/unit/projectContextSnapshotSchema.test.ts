import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureHumanAuthSchema } from "@/lib/human-auth/humanAuthSchema";
import {
    ensureProjectContextSnapshotSchema,
    PROJECT_CONTEXT_CONFIG_SCHEMA_SQL,
    ProjectContextSnapshotSchemaError,
} from "@/lib/project-context-snapshots/schema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const FINGERPRINT_A = "a".repeat(64);
const FINGERPRINT_B = "b".repeat(64);

const openDatabases: Database.Database[] = [];

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE);
        CREATE TABLE human_operators (id TEXT PRIMARY KEY);
    `);
    return db;
}

function seedProject(db: Database.Database, id = "project-1", slug = "project-one"): void {
    db.prepare("INSERT INTO projects (id, slug) VALUES (?, ?)").run(id, slug);
}

function seedHuman(db: Database.Database, id = "human-1"): void {
    db.prepare("INSERT INTO human_operators (id) VALUES (?)").run(id);
}

function insertContainer(db: Database.Database, id = "snapshot-1", projectId = "project-1"): void {
    db.prepare(
        "INSERT INTO project_context_snapshots (id, project_id, current_version_id) VALUES (?, ?, NULL)",
    ).run(id, projectId);
}

function insertPublishingVersion(
    db: Database.Database,
    id = "version-1",
    snapshotId = "snapshot-1",
    overrides: Record<string, unknown> = {},
): void {
    db.prepare(`
        INSERT INTO project_context_snapshot_versions (
            id, snapshot_id, schema_version, project_slug,
            generated_from_fingerprint, published_corpus_fingerprint,
            coverage_json, synthesis_json, rendered_markdown, generated_at,
            approved_at, approved_by, publication_state
        ) VALUES (
            @id, @snapshot_id, @schema_version, @project_slug,
            @generated_from_fingerprint, @published_corpus_fingerprint,
            @coverage_json, @synthesis_json, @rendered_markdown, @generated_at,
            @approved_at, @approved_by, @publication_state
        )
    `).run({
        id,
        snapshot_id: snapshotId,
        schema_version: "project-context.v1",
        project_slug: "project-one",
        generated_from_fingerprint: FINGERPRINT_A,
        published_corpus_fingerprint: null,
        coverage_json: "{}",
        synthesis_json: "{}",
        rendered_markdown: "# Project Context",
        generated_at: "2026-08-23T00:00:00.000Z",
        approved_at: null,
        approved_by: null,
        publication_state: "PUBLISHING",
        ...overrides,
    });
}

function publishVersion(db: Database.Database, id = "version-1", humanId = "human-1"): void {
    db.prepare(`
        UPDATE project_context_snapshot_versions
        SET publication_state = 'PUBLISHED',
            published_corpus_fingerprint = ?,
            approved_at = ?,
            approved_by = ?
        WHERE id = ?
    `).run(FINGERPRINT_B, "2026-08-23T01:00:00.000Z", humanId, id);
}

function schemaObjects(db: Database.Database): Array<{ type: string; name: string; sql: string }> {
    return db.prepare(`
        SELECT type, name, lower(replace(replace(sql, 'IF NOT EXISTS ', ''), char(10), ' ')) AS sql
        FROM sqlite_master
        WHERE name = 'project_contexts'
           OR name LIKE 'trg_project_contexts_%'
           OR name LIKE 'project_context_snapshot%'
           OR name LIKE 'idx_project_context_snapshot%'
           OR name LIKE 'trg_project_context_snapshot%'
        ORDER BY type, name
    `).all() as Array<{ type: string; name: string; sql: string }>;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("CTX3 Project Context snapshot schema foundation", () => {
    it("provisions canonical project_contexts and snapshot storage in a fresh test database", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);

        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>;
        expect(tables.map((row) => row.name)).toEqual(expect.arrayContaining([
            "project_contexts",
            "project_context_snapshots",
            "project_context_snapshot_versions",
        ]));
    });

    it("accepts the exact legacy configuration shape and preserves every existing field", () => {
        const db = createTestDb();
        seedProject(db);
        db.exec(PROJECT_CONTEXT_CONFIG_SCHEMA_SQL);
        db.prepare(`
            INSERT INTO project_contexts (
                id, project_id, overview, purpose, standing_instructions,
                tone_voice, guardrails, output_standards, decision_rules,
                source_of_truth, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            "ctx-1", "project-1", "overview", "purpose", "instructions",
            "tone", "guardrails", "standards", "rules", "truth",
            "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z",
        );
        const before = db.prepare("SELECT * FROM project_contexts WHERE id = 'ctx-1'").get();

        ensureProjectContextSnapshotSchema(db, () => undefined);

        expect(db.prepare("SELECT * FROM project_contexts WHERE id = 'ctx-1'").get()).toEqual(before);
    });

    it("is idempotent and produces no second-run schema delta", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        const first = schemaObjects(db);
        ensureProjectContextSnapshotSchema(db, () => undefined);
        expect(schemaObjects(db)).toEqual(first);
    });

    it("fails closed for an unknown partial project_contexts schema", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE project_contexts (project_id TEXT PRIMARY KEY, overview TEXT)");
        expect(() => ensureProjectContextSnapshotSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<ProjectContextSnapshotSchemaError>({
                code: "PROJECT_CONTEXT_CONFIG_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'project_context_snapshots'").get()).toBeUndefined();
    });

    it("fails closed when only one snapshot storage table exists", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE project_context_snapshots (id TEXT PRIMARY KEY)");
        expect(() => ensureProjectContextSnapshotSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<ProjectContextSnapshotSchemaError>({
                code: "PROJECT_CONTEXT_SNAPSHOT_SCHEMA_PARTIAL",
            }),
        );
    });

    it("enforces one container per Project while allowing an initially null current version", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        seedProject(db);
        insertContainer(db);
        expect(db.prepare("SELECT current_version_id FROM project_context_snapshots").get()).toEqual({
            current_version_id: null,
        });
        expect(() => insertContainer(db, "snapshot-2")).toThrow(/UNIQUE/);
    });

    it("allows multiple versions for one container", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        seedProject(db);
        insertContainer(db);
        insertPublishingVersion(db, "version-1");
        insertPublishingVersion(db, "version-2");
        const row = db.prepare("SELECT COUNT(*) AS count FROM project_context_snapshot_versions").get() as { count: number };
        expect(row.count).toBe(2);
    });

    it("rejects a PUBLISHING current version and a version from another container", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        seedProject(db, "project-1", "project-one");
        seedProject(db, "project-2", "project-two");
        seedHuman(db);
        insertContainer(db, "snapshot-1", "project-1");
        insertContainer(db, "snapshot-2", "project-2");
        insertPublishingVersion(db, "version-1", "snapshot-1");
        insertPublishingVersion(db, "version-2", "snapshot-2", { project_slug: "project-two" });

        expect(() => db.prepare(
            "UPDATE project_context_snapshots SET current_version_id = 'version-1' WHERE id = 'snapshot-1'",
        ).run()).toThrow(/must be published/);

        publishVersion(db, "version-2");
        expect(() => db.prepare(
            "UPDATE project_context_snapshots SET current_version_id = 'version-2' WHERE id = 'snapshot-1'",
        ).run()).toThrow(/same container/);
    });

    it("allows PUBLISHING to PUBLISHED finalization and replacement of the current published version", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        seedProject(db);
        seedHuman(db);
        insertContainer(db);
        insertPublishingVersion(db);
        insertPublishingVersion(db, "version-2");

        publishVersion(db);
        db.prepare("UPDATE project_context_snapshots SET current_version_id = 'version-1' WHERE id = 'snapshot-1'").run();
        publishVersion(db, "version-2");
        db.prepare("UPDATE project_context_snapshots SET current_version_id = 'version-2' WHERE id = 'snapshot-1'").run();

        expect(db.prepare("SELECT current_version_id FROM project_context_snapshots").get()).toEqual({
            current_version_id: "version-2",
        });
    });

    it("makes published content, identity, approval metadata, fingerprints and deletion immutable", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        seedProject(db);
        seedHuman(db);
        insertContainer(db);
        insertPublishingVersion(db);
        publishVersion(db);

        const updates = [
            "UPDATE project_context_snapshot_versions SET synthesis_json = '{\"changed\":true}' WHERE id = 'version-1'",
            "UPDATE project_context_snapshot_versions SET coverage_json = '{\"changed\":true}' WHERE id = 'version-1'",
            "UPDATE project_context_snapshot_versions SET rendered_markdown = 'changed' WHERE id = 'version-1'",
            "UPDATE project_context_snapshot_versions SET approved_at = 'changed' WHERE id = 'version-1'",
            `UPDATE project_context_snapshot_versions SET published_corpus_fingerprint = '${FINGERPRINT_A}' WHERE id = 'version-1'`,
            "UPDATE project_context_snapshot_versions SET id = 'changed' WHERE id = 'version-1'",
        ];
        for (const sql of updates) expect(() => db.prepare(sql).run()).toThrow(/immutable/);
        expect(() => db.prepare("DELETE FROM project_context_snapshot_versions WHERE id = 'version-1'").run()).toThrow(
            /cannot be deleted/,
        );
    });

    it("rejects invalid schema versions, publication states, JSON and generated fingerprints", () => {
        const cases: Record<string, unknown>[] = [
            { schema_version: "project-context.v2" },
            { publication_state: "FAILED" },
            { coverage_json: "not-json" },
            { synthesis_json: "not-json" },
            { generated_from_fingerprint: "ABC" },
            { generated_from_fingerprint: "A".repeat(64) },
        ];
        for (const overrides of cases) {
            const db = createTestDb();
            ensureProjectContextSnapshotSchema(db, () => undefined);
            seedProject(db);
            insertContainer(db);
            expect(() => insertPublishingVersion(db, "version-1", "snapshot-1", overrides)).toThrow(/CHECK/);
            db.close();
            openDatabases.splice(openDatabases.indexOf(db), 1);
        }
    });

    it("rejects malformed published fingerprints and missing approval metadata", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        seedProject(db);
        seedHuman(db);
        insertContainer(db);
        insertPublishingVersion(db);

        expect(() => db.prepare(`
            UPDATE project_context_snapshot_versions
            SET publication_state = 'PUBLISHED', published_corpus_fingerprint = 'bad'
            WHERE id = 'version-1'
        `).run()).toThrow(/CHECK/);
        expect(() => db.prepare(`
            UPDATE project_context_snapshot_versions
            SET publication_state = 'PUBLISHED', published_corpus_fingerprint = ?, approved_at = ?, approved_by = NULL
            WHERE id = 'version-1'
        `).run(FINGERPRINT_B, "2026-08-23T01:00:00.000Z")).toThrow(/CHECK/);
    });

    it("grounds approved_by and snapshot ownership in existing foreign keys", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        expect(() => insertContainer(db, "snapshot-1", "missing-project")).toThrow(/FOREIGN KEY/);

        seedProject(db);
        insertContainer(db);
        expect(() => insertPublishingVersion(db, "version-1", "missing-snapshot")).toThrow(/FOREIGN KEY/);
        insertPublishingVersion(db);
        expect(() => publishVersion(db, "version-1", "missing-human")).toThrow(/FOREIGN KEY/);
    });

    it("keeps container identity immutable", () => {
        const db = createTestDb();
        ensureProjectContextSnapshotSchema(db, () => undefined);
        seedProject(db);
        insertContainer(db);
        expect(() => db.prepare("UPDATE project_context_snapshots SET id = 'changed'").run()).toThrow(/identity is immutable/);
    });

    it("converges schema.sql and ensure-created databases on the supported schema", () => {
        const ensured = createTestDb();
        ensureProjectContextSnapshotSchema(ensured, () => undefined);

        const canonical = new Database(":memory:");
        openDatabases.push(canonical);
        expect(path.resolve(canonical.name)).not.toBe(LIVE_DB_PATH);
        canonical.pragma("foreign_keys = ON");
        canonical.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));
        ensureHumanAuthSchema(canonical, () => undefined);
        ensureProjectContextSnapshotSchema(canonical, () => undefined);

        expect(schemaObjects(canonical)).toEqual(schemaObjects(ensured));
    });
});
