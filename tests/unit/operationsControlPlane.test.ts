import Database from "better-sqlite3";
import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    OPERATIONS_SCHEMA_SQL,
    ensureOperationsSchema,
} from "@/lib/operations/operationsSchema";
import {
    canonicalJson,
    canonicalize,
} from "@/lib/operations/canonicalization";
import { OpsError } from "@/lib/operations/errors";
import {
    createOperation,
    getOperationForRequester,
} from "@/lib/operations/service";
import { CreateProjectItemSchema } from "@/lib/projects/backlogCreateSchema";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST as createOperationRoute } from "@/app/api/operations/route";
import { GET as readOperationRoute } from "@/app/api/operations/[id]/route";

const UI_PASSWORD = "ui-pass";
const SERVER_KEY = "server-key";
const VALID_ENVELOPE = {
    operationType: "backlog.create",
    targetType: "project",
    targetRef: "project-a",
    payload: { title: "Task A" },
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

function createControlPlaneDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE agent_keys (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          key_hash TEXT NOT NULL,
          scopes_json TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        );
        CREATE TABLE project_items (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        );
        CREATE TABLE project_doc_blocks (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        );
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          workspace TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT,
          updated_at TEXT
        );
    `);
    return db;
}

function seedProject(db: Database.Database, id: string, slug: string, name = "Project"): void {
    db.prepare("INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?,?,?,?,?,?)")
        .run(id, slug, name, "planned", "2026-01-01", "2026-01-01");
}

function seedAgent(db: Database.Database, scopes: string[], enabled = 1, id = "agent-test"): void {
    db.prepare("INSERT INTO agent_keys (id, name, key_hash, scopes_json, is_enabled) VALUES (?,?,?,?,?)")
        .run(id, `Agent ${id}`, sha256(SERVER_KEY), JSON.stringify(scopes), enabled);
}

function principal(scopes: string[], actorId = "agent-test"): AgentPrincipal {
    return { actorId, actorName: `Agent ${actorId}`, scopes };
}

function operationCount(db: Database.Database): number {
    return (db.prepare("SELECT COUNT(*) AS c FROM operations").get() as { c: number }).c;
}

function businessSnapshot(db: Database.Database): Record<string, number> {
    return {
        projects: (db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c,
        items: (db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c,
        docBlocks: (db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c,
        tasks: (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number }).c,
    };
}

function expectBusinessUnchanged(db: Database.Database, before: Record<string, number>): void {
    const after = businessSnapshot(db);
    expect(after).toEqual(before);
}

function opsErrorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected OpsError");
    } catch (error) {
        if (error instanceof OpsError) return error.code;
        throw error;
    }
}

function validBody(idempotencyKey?: string): Record<string, unknown> {
    return {
        ...VALID_ENVELOPE,
        ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    };
}

function postRequest(body: unknown, password: string | null = UI_PASSWORD, headers: Record<string, string> = {}): NextRequest {
    const allHeaders = { "content-type": "application/json", ...headers };
    if (password !== null) allHeaders["x-agent-password"] = password;
    return new NextRequest("http://localhost/api/operations", {
        method: "POST",
        headers: allHeaders,
        body: JSON.stringify(body),
    });
}

function getRequest(id: string, password = UI_PASSWORD, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(`http://localhost/api/operations/${id}`, {
        method: "GET",
        headers: { "x-agent-password": password, ...headers },
    });
}

function setupAuthEnv(): void {
    vi.stubEnv("AGENT_UI_PASSWORD", UI_PASSWORD);
    vi.stubEnv("AGENT_KEY", SERVER_KEY);
}

function insertOperationRow(
    db: Database.Database,
    overrides: Partial<Record<string, string | null>> = {},
): void {
    const row = {
        id: overrides.id ?? "op-test",
        operation_type: "backlog.create",
        target_type: "project",
        target_ref: "project-a",
        resolved_target_id: "p1",
        payload_json: '{"title":"T","status":"planned"}',
        payload_hash: "hash",
        idempotency_key: null,
        source: "agent",
        requester_actor_type: "agent",
        requester_actor_id: "agent-test",
        status: "pending",
        validation_result_json: '{"valid":true,"issues":[]}',
        preview_json: '{"operationType":"backlog.create"}',
        preview_fingerprint: "fp",
        contract_version: "backlog.create.v1",
        requested_at: "2026-08-11T00:00:00.000Z",
        created_at: "2026-08-11T00:00:00.000Z",
        updated_at: "2026-08-11T00:00:00.000Z",
        ...overrides,
    } as Record<string, string | null>;
    db.prepare(`
        INSERT INTO operations (
            id, operation_type, target_type, target_ref, resolved_target_id,
            payload_json, payload_hash, idempotency_key, source,
            requester_actor_type, requester_actor_id, status,
            validation_result_json, preview_json, preview_fingerprint,
            contract_version, requested_at, created_at, updated_at
        ) VALUES (
            @id, @operation_type, @target_type, @target_ref, @resolved_target_id,
            @payload_json, @payload_hash, @idempotency_key, @source,
            @requester_actor_type, @requester_actor_id, @status,
            @validation_result_json, @preview_json, @preview_fingerprint,
            @contract_version, @requested_at, @created_at, @updated_at
        )
    `).run(row);
}

describe("Operations schema", () => {
    it("creates the operations table, is idempotent, and has no approval/execution tables", () => {
        const db = createControlPlaneDb();
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operations'").get()).toBeTruthy();
        ensureOperationsSchema(db, () => undefined);
        expect(operationCount(db)).toBe(0);
        const forbidden = ["operation_approvals", "operation_approval_events", "operation_execution_attempts"];
        for (const table of forbidden) {
            expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)).toBeUndefined();
        }
        db.close();
    });

    it("enforces status and requester_actor_type CHECK constraints", () => {
        const db = createControlPlaneDb();
        expect(() => insertOperationRow(db, { status: "approved" })).toThrow();
        expect(() => insertOperationRow(db, { requester_actor_type: "human" })).toThrow();
        insertOperationRow(db); // pending + agent is valid
        expect(operationCount(db)).toBe(1);
        db.close();
    });

    it("enforces the partial idempotency unique index (requester, key)", () => {
        const db = createControlPlaneDb();
        insertOperationRow(db, { id: "op-1", requester_actor_id: "agent-a", idempotency_key: "k1" });
        expect(() => insertOperationRow(db, { id: "op-2", requester_actor_id: "agent-a", idempotency_key: "k1" })).toThrow();
        insertOperationRow(db, { id: "op-3", requester_actor_id: "agent-b", idempotency_key: "k1" }); // different requester ok
        insertOperationRow(db, { id: "op-4", requester_actor_id: "agent-a", idempotency_key: null }); // null key unconstrained
        expect(operationCount(db)).toBe(3);
        db.close();
    });
});

describe("Operations authorization (routes)", () => {
    it("grants exact capability, operations:*, and * for POST/GET; denies unrelated namespaces", async () => {
        const cases: Array<{ scopes: string[]; postOk: boolean; getOk: boolean }> = [
            { scopes: ["operations:request"], postOk: true, getOk: false },
            { scopes: ["operations:read"], postOk: false, getOk: true },
            { scopes: ["operations:*"], postOk: true, getOk: true },
            { scopes: ["*"], postOk: true, getOk: true },
            { scopes: ["project_import:*"], postOk: false, getOk: false },
        ];

        for (const { scopes, postOk, getOk } of cases) {
            const db = createControlPlaneDb();
            seedProject(db, "p1", "project-a");
            seedAgent(db, scopes);
            mockGetDb.mockReturnValue(db);
            setupAuthEnv();

            const post = await createOperationRoute(postRequest(validBody()));
            expect(post.status).toBe(postOk ? 200 : 403);

            let id: string;
            if (postOk) {
                id = (await post.json()).operation.id;
            } else {
                const seeded = createOperation(db, principal(scopes), validBody());
                id = seeded.id;
            }
            const get = await readOperationRoute(getRequest(id), { params: Promise.resolve({ id }) });
            expect(get.status).toBe(getOk ? 200 : 403);
            db.close();
        }
    });

    it("rejects missing/wrong credentials (401), disabled/no agent (403), and human cookies", async () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        seedAgent(db, ["operations:request"]);
        mockGetDb.mockReturnValue(db);
        setupAuthEnv();

        const missing = await createOperationRoute(postRequest(validBody(), null));
        expect(missing.status).toBe(401);

        const wrong = await createOperationRoute(postRequest(validBody(), "wrong-password"));
        expect(wrong.status).toBe(401);

        const humanCookie = await createOperationRoute(
            postRequest(validBody(), null, { cookie: "workos_human_session=abc" }),
        );
        expect(humanCookie.status).toBe(401);

        db.prepare("UPDATE agent_keys SET is_enabled = 0 WHERE id = 'agent-test'").run();
        const disabled = await createOperationRoute(postRequest(validBody()));
        expect(disabled.status).toBe(403);

        const emptyDb = createControlPlaneDb();
        mockGetDb.mockReturnValue(emptyDb);
        const noAgent = await createOperationRoute(postRequest(validBody()));
        expect(noAgent.status).toBe(403);
        emptyDb.close();
        db.close();
    });
});

describe("Strict envelope", () => {
    it("accepts a valid envelope and derives a pending agent-owned operation", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const record = createOperation(db, principal(["operations:request"]), validBody());
        expect(record.id).toMatch(/^op-/);
        expect(record.status).toBe("pending");
        expect(record.requesterActorType).toBe("agent");
        expect(record.requesterActorId).toBe("agent-test");
        expect(record.contractVersion).toBe("backlog.create.v1");
        expect(record.source).toBe("agent");
        expect(record.resolvedTargetId).toBe("p1");
        db.close();
    });

    it("rejects unknown top-level fields and server-owned spoofing", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        const spoofCases: Array<Record<string, unknown>> = [
            { ...validBody(), actorId: "agent-spoof" },
            { ...validBody(), status: "succeeded" },
            { ...validBody(), payloadHash: "abc" },
            { ...validBody(), preview: {} },
            { ...validBody(), randomField: 1 },
        ];
        for (const body of spoofCases) {
            expect(opsErrorCode(() => createOperation(db, p, body))).toBe("OPS_INVALID_ENVELOPE");
        }
        expect(operationCount(db)).toBe(0);
        db.close();
    });

    it("rejects unsupported operation types, invalid target type, and invalid targetRef forms", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        expect(opsErrorCode(() => createOperation(db, p, { ...validBody(), operationType: "task.create" })))
            .toBe("OPS_INVALID_OPERATION_TYPE");
        expect(opsErrorCode(() => createOperation(db, p, { ...validBody(), targetType: "workspace" })))
            .toBe("OPS_INVALID_ENVELOPE");
        expect(opsErrorCode(() => createOperation(db, p, { ...validBody(), targetRef: "" })))
            .toBe("OPS_INVALID_ENVELOPE");
        expect(opsErrorCode(() => createOperation(db, p, { ...validBody(), targetRef: " project-a " })))
            .toBe("OPS_INVALID_ENVELOPE");
        expect(opsErrorCode(() => createOperation(db, p, { ...validBody(), targetRef: "x".repeat(129) })))
            .toBe("OPS_INVALID_ENVELOPE");
        expect(opsErrorCode(() => createOperation(db, p, { ...validBody(), idempotencyKey: "   " })))
            .toBe("OPS_INVALID_ENVELOPE");
        expect(operationCount(db)).toBe(0);
        db.close();
    });
});

describe("Backlog payload normalization", () => {
    it("normalizes minimal payload with defaults matching the canonical route", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const record = createOperation(db, principal(["operations:request"]), validBody());
        expect(record.payload).toEqual({
            title: "Task A",
            status: "planned",
            priority: null,
            schedule_bucket: null,
            start_date: null,
            end_date: null,
            is_milestone: 0,
            workstream: null,
            dod_text: null,
            notes: null,
        });
        db.close();
    });

    it("treats omitted and explicit-null fields as the same canonical intent", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const a = createOperation(db, principal(["operations:request"]), validBody());
        const b = createOperation(db, principal(["operations:request"]), {
            ...validBody(),
            payload: { title: "Task A", priority: null, notes: null },
        });
        expect(canonicalJson(a.payload)).toBe(canonicalJson(b.payload));
        expect(a.payloadHash).toBe(b.payloadHash);
        db.close();
    });

    it("maps is_milestone omitted/true/false to 0/1/0", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        expect(createOperation(db, p, validBody()).payload.is_milestone).toBe(0);
        expect(createOperation(db, p, { ...validBody(), payload: { title: "T", is_milestone: true } }).payload.is_milestone).toBe(1);
        expect(createOperation(db, p, { ...validBody(), payload: { title: "T", is_milestone: false } }).payload.is_milestone).toBe(0);
        db.close();
    });

    it("rejects unknown and forbidden payload fields", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        const forbidden = [
            { title: "T", extra: 1 },
            { title: "T", id: "op-x" },
            { title: "T", project_id: "p1" },
            { title: "T", import_fingerprint: "fp" },
        ];
        for (const payload of forbidden) {
            expect(opsErrorCode(() => createOperation(db, p, { ...validBody(), payload })))
                .toBe("OPS_INVALID_PAYLOAD");
        }
        expect(operationCount(db)).toBe(0);
        db.close();
    });

    it("leaves the shared canonical schema unchanged (unknown keys still stripped there)", () => {
        const parsed = CreateProjectItemSchema.parse({ title: "T", unexpected_field: "x" });
        expect(parsed).toEqual({ title: "T", status: "planned" });
    });
});

describe("Target resolution", () => {
    it("resolves an existing project slug and leaves no operation row for a missing project", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const record = createOperation(db, principal(["operations:request"]), validBody());
        expect(record.resolvedTargetId).toBe("p1");

        expect(opsErrorCode(() => createOperation(db, principal(["operations:request"]), {
            ...validBody(),
            targetRef: "missing-project",
        }))).toBe("OPS_TARGET_NOT_FOUND");
        expect(operationCount(db)).toBe(1);
        db.close();
    });
});

describe("Canonicalization", () => {
    it("sorts object keys recursively, preserves array order, and rejects unsupported values", () => {
        expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
        expect(canonicalJson({ a: [1, 2] })).toBe('{"a":[1,2]}');
        expect(() => canonicalize({ a: undefined })).toThrowError(expect.objectContaining({ code: "OPS_INVALID_PAYLOAD" }));
        expect(() => canonicalize(NaN)).toThrowError(expect.objectContaining({ code: "OPS_INVALID_PAYLOAD" }));
        expect(() => canonicalize(Infinity)).toThrowError(expect.objectContaining({ code: "OPS_INVALID_PAYLOAD" }));
        expect(() => canonicalize(new Date())).toThrowError(expect.objectContaining({ code: "OPS_INVALID_PAYLOAD" }));
    });
});

describe("Payload hash and preview", () => {
    it("hashes semantically equivalent intents identically and differs on semantic change", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        const a = createOperation(db, p, validBody());
        const b = createOperation(db, p, { ...validBody(), payload: { status: "planned", title: "Task A" } });
        const c = createOperation(db, p, { ...validBody(), payload: { title: "Task B" } });
        const d = createOperation(db, p, { ...validBody(), payload: { title: "Task A", status: "done" } });
        expect(a.payloadHash).toBe(b.payloadHash);
        expect(a.payloadHash).not.toBe(c.payloadHash);
        expect(a.payloadHash).not.toBe(d.payloadHash);
        db.close();
    });

    it("produces deterministic previews and preview fingerprints without secrets", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request", "top-secret-scope"]);
        const a = createOperation(db, p, validBody());
        const b = createOperation(db, p, { ...validBody(), payload: { title: "Task A" } });
        expect(a.preview).toEqual(b.preview);
        expect(a.previewFingerprint).toBe(b.previewFingerprint);
        const serialized = JSON.stringify(a.preview);
        expect(serialized).not.toContain("top-secret-scope");
        expect(serialized).not.toContain("agent-test");
        expect(a.preview).toMatchObject({
            operationType: "backlog.create",
            target: { type: "project", ref: "project-a", resolvedId: "p1" },
            proposed: { action: "create", entity: "project_item" },
        });
        db.close();
    });
});

describe("Idempotency", () => {
    it("replays same key + same/equivalent intent and rejects changed intent", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        const first = createOperation(db, p, validBody("retry-001"));
        const replayEquivalent = createOperation(db, p, {
            ...validBody("retry-001"),
            payload: { status: "planned", title: "Task A" },
        });
        expect(replayEquivalent.id).toBe(first.id);
        expect(operationCount(db)).toBe(1);

        expect(opsErrorCode(() => createOperation(db, p, {
            ...validBody("retry-001"),
            payload: { title: "Different" },
        }))).toBe("OPS_IDEMPOTENCY_CONFLICT");
        expect(operationCount(db)).toBe(1);
        db.close();
    });

    it("keeps different requesters and no-key requests independent", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        createOperation(db, principal(["operations:request"], "agent-a"), validBody("shared-key"));
        createOperation(db, principal(["operations:request"], "agent-b"), validBody("shared-key"));
        createOperation(db, principal(["operations:request"], "agent-a"), validBody());
        createOperation(db, principal(["operations:request"], "agent-a"), validBody());
        expect(operationCount(db)).toBe(4);
        db.close();
    });

    it("recovers from a unique-constraint race without creating a duplicate", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        const first = createOperation(db, p, validBody("race-key"));

        const original = db.prepare.bind(db);
        let forced = true;
        vi.spyOn(db, "prepare").mockImplementation(((sql: string) => {
            if (forced && sql.includes("idempotency_key = ?")) {
                forced = false;
                return { get: () => undefined } as unknown as ReturnType<Database["prepare"]>;
            }
            return original(sql);
        }) as Database["prepare"]);

        const replay = createOperation(db, p, validBody("race-key"));
        expect(replay.id).toBe(first.id);
        expect(operationCount(db)).toBe(1);
    });

    it("recovers from a unique-constraint race and reports conflict for changed intent", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const p = principal(["operations:request"]);
        createOperation(db, p, validBody("race-key-2"));

        const original = db.prepare.bind(db);
        let forced = true;
        vi.spyOn(db, "prepare").mockImplementation(((sql: string) => {
            if (forced && sql.includes("idempotency_key = ?")) {
                forced = false;
                return { get: () => undefined } as unknown as ReturnType<Database["prepare"]>;
            }
            return original(sql);
        }) as Database["prepare"]);

        expect(opsErrorCode(() => createOperation(db, p, {
            ...validBody("race-key-2"),
            payload: { title: "Changed" },
        }))).toBe("OPS_IDEMPOTENCY_CONFLICT");
        expect(operationCount(db)).toBe(1);
    });
});

describe("Read ownership isolation", () => {
    it("returns the creator's operation and hides others/missing as 404", () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        const creator = principal(["operations:read"], "agent-a");
        const record = createOperation(db, creator, validBody());

        expect(getOperationForRequester(db, creator, record.id).id).toBe(record.id);
        expect(opsErrorCode(() => getOperationForRequester(db, principal(["operations:read"], "agent-b"), record.id)))
            .toBe("OPS_OPERATION_NOT_FOUND");
        expect(opsErrorCode(() => getOperationForRequester(db, creator, "op-missing")))
            .toBe("OPS_OPERATION_NOT_FOUND");
        db.close();
    });
});

describe("No-business-write boundary", () => {
    it("valid POST, replay, conflict, invalid payload, missing target, and GET leave business tables unchanged", async () => {
        const db = createControlPlaneDb();
        seedProject(db, "p1", "project-a");
        seedAgent(db, ["operations:*"]);
        mockGetDb.mockReturnValue(db);
        setupAuthEnv();

        db.prepare("INSERT INTO project_items (id, project_id, title, status, created_at, updated_at) VALUES (?,?,?,?,?,?)")
            .run("i1", "p1", "Existing", "planned", "2026-01-01", "2026-01-01");

        const before = businessSnapshot(db);
        const initialOperations = operationCount(db);

        const post = await createOperationRoute(postRequest(validBody("no-write-key")));
        expect(post.status).toBe(200);
        const replay = await createOperationRoute(postRequest(validBody("no-write-key")));
        expect(replay.status).toBe(200);
        const conflict = await createOperationRoute(postRequest({
            ...validBody("no-write-key"),
            payload: { title: "Changed" },
        }));
        expect(conflict.status).toBe(409);
        const invalidPayload = await createOperationRoute(postRequest({ ...validBody(), payload: { title: "T", id: "x" } }));
        expect(invalidPayload.status).toBe(400);
        const missingTarget = await createOperationRoute(postRequest({ ...validBody(), targetRef: "missing" }));
        expect(missingTarget.status).toBe(404);

        const id = (await post.json()).operation.id;
        const get = await readOperationRoute(getRequest(id), { params: Promise.resolve({ id }) });
        expect(get.status).toBe(200);

        expectBusinessUnchanged(db, before);
        expect(operationCount(db)).toBe(initialOperations + 1);
        db.close();
    });
});
