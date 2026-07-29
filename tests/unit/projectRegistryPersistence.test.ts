import { readFileSync } from "fs";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";

const { mockGetDb, mockDbProxy } = vi.hoisted(() => {
    const mockGetDb = vi.fn();
    const mockDbProxy = new Proxy({}, {
        get(_target, property) {
            const database = mockGetDb();
            const value = database[property];
            return typeof value === "function" ? value.bind(database) : value;
        },
    });
    return { mockGetDb, mockDbProxy };
});

vi.mock("@/db/db", () => ({
    getDb: mockGetDb,
    db: mockDbProxy,
}));

import { GET as listProjects, POST as createProject } from "@/app/api/projects/route";
import {
    GET as getProject,
    PUT as updateProject,
} from "@/app/api/projects/[slug]/route";
import { POST as createProjectFromTemplate } from "@/app/api/admin/create-project-from-template/route";
import {
    buildProjectRegistryUpdatePayload,
    canonicalProjectToLegacyMetadata,
    ensureProjectRegistryMetadataColumns,
    resolveProjectRegistryMetadata,
} from "@/lib/projects/registryMetadata";
import { TEMPLATES } from "@/lib/templates";
import type { Project, ProjectRegistryMetadata } from "@/lib/types";

let db: Database.Database;

function createProjectSchema() {
    db.exec(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
            start_date TEXT NULL,
            end_date TEXT NULL,
            owner TEXT NULL,
            is_seed INTEGER DEFAULT 0,
            category TEXT NULL,
            registry_status TEXT NULL,
            priority TEXT NULL,
            current_goal TEXT NULL,
            progress_stage TEXT NULL,
            next_action TEXT NULL,
            cadence TEXT NULL,
            risk_or_blocked_by TEXT NULL,
            metadata_updated_at TEXT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE lists (
            id TEXT PRIMARY KEY,
            workspace TEXT NOT NULL,
            slug TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            workspace TEXT NOT NULL,
            list_id TEXT NULL,
            status TEXT NOT NULL,
            is_seed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);
}

function insertLegacyProject(slug = "legacy-project") {
    db.prepare(`
        INSERT INTO projects (id, slug, name, status)
        VALUES ('P1', ?, 'Legacy Project', 'planned')
    `).run(slug);
}

function request(url: string, method: string, body?: object) {
    return new NextRequest(`http://localhost${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

function fullSnapshot(overrides: Record<string, unknown> = {}) {
    return {
        name: "  Canonical Project  ",
        status: "planned",
        category: "  Green Fineness  ",
        registry_status: "testing",
        priority: "high",
        current_goal: "  Verify metadata  ",
        progress_stage: "  QA  ",
        next_action: "  Run review  ",
        cadence: "  Weekly  ",
        risk_or_blocked_by: "   ",
        ...overrides,
    };
}

function projectFixture(overrides: Partial<Project> = {}): Project {
    return {
        id: "P1",
        slug: "project-one",
        name: "Project One",
        status: "planned",
        start_date: null,
        end_date: null,
        owner: null,
        category: null,
        registry_status: null,
        priority: null,
        current_goal: null,
        progress_stage: null,
        next_action: null,
        cadence: null,
        risk_or_blocked_by: null,
        metadata_updated_at: null,
        created_at: "2026-07-01 00:00:00",
        updated_at: "2026-07-01 00:00:00",
        ...overrides,
    };
}

beforeEach(() => {
    db = new Database(":memory:");
    createProjectSchema();
    mockGetDb.mockReturnValue(db);
});

afterEach(() => {
    db.close();
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe("Project registry additive schema", () => {
    it("adds only missing columns, preserves rows, and reruns safely", () => {
        const migrationDb = new Database(":memory:");
        migrationDb.exec(`
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                slug TEXT NOT NULL,
                name TEXT NOT NULL,
                status TEXT NOT NULL
            );
            INSERT INTO projects VALUES ('P1', 'one', 'One', 'planned');
        `);
        const before = migrationDb.prepare("SELECT * FROM projects").get();
        const logs: string[] = [];

        const first = ensureProjectRegistryMetadataColumns(
            migrationDb,
            (message) => logs.push(message),
        );
        const second = ensureProjectRegistryMetadataColumns(
            migrationDb,
            (message) => logs.push(message),
        );

        expect(first).toHaveLength(9);
        expect(second).toEqual([]);
        expect(migrationDb.prepare("SELECT id, slug, name, status FROM projects").get())
            .toEqual(before);
        expect((migrationDb.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number }).count)
            .toBe(1);
        expect(logs[1]).toContain("already present");
        migrationDb.close();
    });

    it("declares all canonical columns in the new database schema", () => {
        const schema = readFileSync("src/db/schema.sql", "utf8");
        for (const column of [
            "category",
            "registry_status",
            "priority",
            "current_goal",
            "progress_stage",
            "next_action",
            "cadence",
            "risk_or_blocked_by",
            "metadata_updated_at",
        ]) {
            expect(schema).toMatch(new RegExp(`\\b${column}\\b`));
        }
    });
});

describe("Project registry resolution helper", () => {
    const legacy: ProjectRegistryMetadata = {
        category: "Legacy",
        status: "paused",
        priority: "medium",
        currentGoal: "Legacy goal",
        progressStage: "In Dev",
        nextAction: "Legacy action",
        cadence: "Monthly",
        riskOrBlockedBy: "Legacy risk",
        lastUpdated: "2026-07-02T00:00:00.000Z",
    };

    it("uses populated DB fields, then legacy fields, without mutating inputs", () => {
        const project = projectFixture({ category: "Database" });
        const projectBefore = structuredClone(project);
        const legacyBefore = structuredClone(legacy);
        const resolved = resolveProjectRegistryMetadata(project, legacy);

        expect(resolved.metadata.category).toBe("Database");
        expect(resolved.sources.category).toBe("database");
        expect(resolved.metadata.status).toBe("paused");
        expect(resolved.sources.status).toBe("legacy_local");
        expect(project).toEqual(projectBefore);
        expect(legacy).toEqual(legacyBefore);
    });

    it("ignores legacy fields after canonicalization and preserves canonical values", () => {
        const resolved = resolveProjectRegistryMetadata(
            projectFixture({
                metadata_updated_at: "2026-07-03 00:00:00",
                registry_status: "testing",
                priority: "none",
            }),
            legacy,
        );

        expect(resolved.metadata.status).toBe("testing");
        expect(resolved.metadata.priority).toBe("none");
        expect(resolved.metadata.currentGoal).toBe("");
        expect(resolved.sources.currentGoal).toBe("canonical_null");
    });

    it("builds a complete normalized API payload and a compatible local mirror", () => {
        const payload = buildProjectRegistryUpdatePayload("  Project One  ", {
            ...legacy,
            status: "completed",
            currentGoal: "   ",
        });
        const mirror = canonicalProjectToLegacyMetadata(projectFixture({
            category: "Canonical",
            registry_status: "paused",
            priority: "none",
            metadata_updated_at: "2026-07-03T00:00:00.000Z",
        }));

        expect(payload).toMatchObject({
            name: "Project One",
            status: "done",
            registry_status: "completed",
            current_goal: null,
        });
        expect(Object.keys(payload)).toEqual([
            "name",
            "status",
            "category",
            "registry_status",
            "priority",
            "current_goal",
            "progress_stage",
            "next_action",
            "cadence",
            "risk_or_blocked_by",
        ]);
        expect(mirror).toMatchObject({
            category: "Canonical",
            status: "paused",
            priority: "none",
            currentGoal: "",
            lastUpdated: "2026-07-03T00:00:00.000Z",
        });
    });
});

describe("Project API canonical metadata contract", () => {
    it("creates standard and explicit legacy-status projects with canonical defaults", async () => {
        const standard = await createProject(request("/api/projects", "POST", {
            name: "New Project",
            slug: "new-project",
        }));
        const planned = await createProject(request("/api/projects", "POST", {
            name: "Planned Project",
            slug: "planned-project",
            status: "planned",
        }));

        expect(await standard.json()).toMatchObject({
            status: "inbox",
            registry_status: "idea",
            priority: "none",
            progress_stage: "Concept",
        });
        expect(await planned.json()).toMatchObject({
            status: "planned",
            registry_status: "planning",
        });
        expect((db.prepare("SELECT metadata_updated_at FROM projects WHERE slug = 'new-project'").get() as { metadata_updated_at: string }).metadata_updated_at)
            .toBeTruthy();
    });

    it("returns canonical fields from list and detail reads", async () => {
        insertLegacyProject();
        const listResponse = await listProjects(request("/api/projects", "GET"));
        const detailResponse = await getProject(
            request("/api/projects/legacy-project", "GET"),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );
        const list = await listResponse.json();
        const detail = await detailResponse.json();

        expect(list[0]).toHaveProperty("metadata_updated_at", null);
        expect(detail).toHaveProperty("registry_status", null);
        expect(detail).toHaveProperty("current_goal", null);
    });

    it("saves a normalized full snapshot atomically and round-trips detailed status", async () => {
        insertLegacyProject();
        const response = await updateProject(
            request("/api/projects/legacy-project", "PUT", fullSnapshot()),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            name: "Canonical Project",
            status: "planned",
            category: "Green Fineness",
            registry_status: "testing",
            priority: "high",
            current_goal: "Verify metadata",
            progress_stage: "QA",
            next_action: "Run review",
            cadence: "Weekly",
            risk_or_blocked_by: null,
        });
        expect(body.metadata_updated_at).toBeTruthy();
    });

    it("rejects invalid enums, incomplete snapshots, and status mismatches without writes", async () => {
        insertLegacyProject();
        const invalidPriority = await updateProject(
            request("/api/projects/legacy-project", "PUT", fullSnapshot({ priority: "urgent" })),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );
        const incomplete = await updateProject(
            request("/api/projects/legacy-project", "PUT", {
                status: "planned",
                registry_status: "testing",
            }),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );
        const mismatch = await updateProject(
            request("/api/projects/legacy-project", "PUT", fullSnapshot({ status: "done" })),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );

        expect(invalidPriority.status).toBe(400);
        expect(incomplete.status).toBe(400);
        expect(mismatch.status).toBe(409);
        expect(db.prepare("SELECT name, metadata_updated_at FROM projects WHERE slug = 'legacy-project'").get())
            .toEqual({ name: "Legacy Project", metadata_updated_at: null });
    });

    it("preserves detailed status for compatible legacy updates and rejects conflicts", async () => {
        insertLegacyProject();
        await updateProject(
            request("/api/projects/legacy-project", "PUT", fullSnapshot()),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );
        const compatible = await updateProject(
            request("/api/projects/legacy-project", "PUT", { status: "planned" }),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );
        const conflict = await updateProject(
            request("/api/projects/legacy-project", "PUT", { status: "done" }),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );

        expect(compatible.status).toBe(200);
        expect(conflict.status).toBe(409);
        expect(db.prepare("SELECT status, registry_status FROM projects WHERE slug = 'legacy-project'").get())
            .toEqual({ status: "planned", registry_status: "testing" });
    });

    it("keeps pre-canonical legacy status-only updates pre-canonical", async () => {
        insertLegacyProject();
        const response = await updateProject(
            request("/api/projects/legacy-project", "PUT", { status: "done" }),
            { params: Promise.resolve({ slug: "legacy-project" }) },
        );

        expect(response.status).toBe(200);
        expect(db.prepare("SELECT status, registry_status, metadata_updated_at FROM projects WHERE slug = 'legacy-project'").get())
            .toEqual({ status: "done", registry_status: null, metadata_updated_at: null });
    });

    it("creates template projects with user-facing canonical defaults", async () => {
        const response = await createProjectFromTemplate(
            new Request("http://localhost/api/admin/create-project-from-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectName: "Template Project",
                    templateId: TEMPLATES[0].id,
                }),
            }),
        );

        expect(response.status).toBe(200);
        expect(db.prepare(`
            SELECT status, registry_status, priority, progress_stage,
                   metadata_updated_at IS NOT NULL AS canonicalized
            FROM projects
        `).get()).toEqual({
            status: "inbox",
            registry_status: "idea",
            priority: "none",
            progress_stage: "Concept",
            canonicalized: 1,
        });
    });
});
