import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureProjectRegistryMetadataColumns } from "@/lib/projects/registryMetadata";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import {
    createTestH2Session,
    seedHumanOperator,
    TRUSTED_ORIGIN,
} from "../helpers/humanSession";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { PUT as updateProject } from "@/app/api/projects/[slug]/route";

let db: Database.Database;
let sessionCookie: string;

function createSchema() {
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
            start_date TEXT NULL,
            end_date TEXT NULL,
            owner TEXT NULL,
            is_seed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            category TEXT NULL,
            registry_status TEXT NULL,
            priority TEXT NULL,
            current_goal TEXT NULL,
            progress_stage TEXT NULL,
            next_action TEXT NULL,
            cadence TEXT NULL,
            risk_or_blocked_by TEXT NULL,
            metadata_updated_at TEXT NULL
        );
    `);
}

function insertProject(id: string, slug: string, name: string, status = "planned") {
    db.prepare("INSERT INTO projects (id, slug, name, status) VALUES (?, ?, ?, ?)").run(id, slug, name, status);
}

function putRequest(slug: string, body: unknown) {
    return new NextRequest(`http://localhost/api/projects/${slug}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            cookie: sessionCookie,
            origin: TRUSTED_ORIGIN,
        },
        body: JSON.stringify(body),
    });
}

const REGISTRY_PAYLOAD = {
    name: "Existing Project",
    status: "planned",
    category: "Personal Health / Internal Tool",
    registry_status: "planning",
    priority: "high",
    current_goal: "Current goal text",
    progress_stage: "Concept",
    next_action: "Next action text",
    cadence: "Weekly",
    risk_or_blocked_by: "Risk or blocked by text",
};

beforeEach(() => {
    db = new Database(":memory:");
    createSchema();
    insertProject("p1", "existing-project", "Existing Project");
    const operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
    mockGetDb.mockReturnValue(db);
});

afterEach(() => {
    vi.unstubAllEnvs();
    db.close();
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe("Project Registry persistence (PUT /api/projects/[slug])", () => {
    it("persists and returns every registry field", async () => {
        const res = await updateProject(putRequest("existing-project", REGISTRY_PAYLOAD), {
            params: Promise.resolve({ slug: "existing-project" }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.category).toBe("Personal Health / Internal Tool");
        expect(body.registry_status).toBe("planning");
        expect(body.priority).toBe("high");
        expect(body.current_goal).toBe("Current goal text");
        expect(body.progress_stage).toBe("Concept");
        expect(body.next_action).toBe("Next action text");
        expect(body.cadence).toBe("Weekly");
        expect(body.risk_or_blocked_by).toBe("Risk or blocked by text");
        expect(body.metadata_updated_at).not.toBeNull();

        const row = db.prepare("SELECT * FROM projects WHERE slug = ?").get("existing-project") as Record<string, unknown>;
        expect(row.category).toBe("Personal Health / Internal Tool");
        expect(row.registry_status).toBe("planning");
        expect(row.priority).toBe("high");
        expect(row.current_goal).toBe("Current goal text");
        expect(row.progress_stage).toBe("Concept");
        expect(row.next_action).toBe("Next action text");
        expect(row.cadence).toBe("Weekly");
        expect(row.risk_or_blocked_by).toBe("Risk or blocked by text");
    });

    it("persists priority high and reads it back", async () => {
        await updateProject(putRequest("existing-project", { ...REGISTRY_PAYLOAD, priority: "high" }), {
            params: Promise.resolve({ slug: "existing-project" }),
        });
        const row = db.prepare("SELECT priority FROM projects WHERE slug = ?").get("existing-project") as { priority: string | null };
        expect(row.priority).toBe("high");
    });

    it("stores null for blank optional values", async () => {
        await updateProject(putRequest("existing-project", { ...REGISTRY_PAYLOAD, current_goal: null, next_action: null }), {
            params: Promise.resolve({ slug: "existing-project" }),
        });
        const row = db.prepare("SELECT current_goal, next_action FROM projects WHERE slug = ?").get("existing-project") as {
            current_goal: string | null;
            next_action: string | null;
        };
        expect(row.current_goal).toBeNull();
        expect(row.next_action).toBeNull();
    });

    it("updates a newly created project", async () => {
        insertProject("p2", "new-project", "New Project");
        const res = await updateProject(putRequest("new-project", { ...REGISTRY_PAYLOAD, name: "New Project" }), {
            params: Promise.resolve({ slug: "new-project" }),
        });
        expect(res.status).toBe(200);
        const row = db.prepare("SELECT category, next_action FROM projects WHERE slug = ?").get("new-project") as {
            category: string | null;
            next_action: string | null;
        };
        expect(row.category).toBe("Personal Health / Internal Tool");
        expect(row.next_action).toBe("Next action text");
    });

    it("rejects invalid enum values without success", async () => {
        const res = await updateProject(putRequest("existing-project", { ...REGISTRY_PAYLOAD, priority: "High" }), {
            params: Promise.resolve({ slug: "existing-project" }),
        });
        expect(res.status).toBe(400);
    });

    it("returns 404 for an unknown project", async () => {
        const res = await updateProject(putRequest("missing-project", REGISTRY_PAYLOAD), {
            params: Promise.resolve({ slug: "missing-project" }),
        });
        expect(res.status).toBe(404);
    });

    it("keeps backward compatibility when only name is updated", async () => {
        const res = await updateProject(putRequest("existing-project", { name: "Renamed Project" }), {
            params: Promise.resolve({ slug: "existing-project" }),
        });
        expect(res.status).toBe(200);
        const row = db.prepare("SELECT name, category, registry_status, metadata_updated_at FROM projects WHERE slug = ?").get("existing-project") as {
            name: string;
            category: string | null;
            registry_status: string | null;
            metadata_updated_at: string | null;
        };
        expect(row.name).toBe("Renamed Project");
        expect(row.category).toBeNull();
        expect(row.registry_status).toBeNull();
        expect(row.metadata_updated_at).toBeNull();
    });
});

describe("Project registry schema self-healing", () => {
    it("adds all registry columns to a fresh projects table", () => {
        const fresh = new Database(":memory:");
        fresh.exec(`
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                slug TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                status TEXT NOT NULL
            );
        `);
        const added = ensureProjectRegistryMetadataColumns(fresh as unknown as Parameters<typeof ensureProjectRegistryMetadataColumns>[0]);
        expect(added).toHaveLength(9);
        const columns = (fresh.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>).map((c) => c.name);
        for (const column of ["category", "registry_status", "priority", "current_goal", "progress_stage", "next_action", "cadence", "risk_or_blocked_by", "metadata_updated_at"]) {
            expect(columns).toContain(column);
        }
        fresh.close();
    });
});
