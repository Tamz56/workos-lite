import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { ensureProjectStateSchema } from "@/lib/project-state/schema";
import { readCanonicalProjectStateBySlug } from "@/lib/project-state/readService";

const VALID_PAYLOAD = JSON.stringify({
    projectStatus: { status: "KNOWN", value: "ACTIVE" },
    posture: { status: "KNOWN", value: "READ_ONLY" },
    phase: { status: "UNKNOWN" },
    currentFocus: { status: "KNOWN", value: "Canonical Project State" },
    nextAuthoritativeAction: { status: "UNKNOWN" },
    waitingOrHold: { status: "NOT_GOVERNED" },
    blockers: { status: "KNOWN", value: [] },
    dependencies: { status: "KNOWN", value: [] },
});

function setup() {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureProjectStateSchema(db);
    db.prepare("INSERT INTO projects (id, slug) VALUES ('p-1', 'alpha')").run();
    return db;
}

function insertVersion(
    db: Database.Database,
    overrides: Partial<Record<string, string | null>> = {},
) {
    const row = {
        id: "v1",
        project_id: "p-1",
        schema_version: "project-state.v1",
        state_payload_json: VALID_PAYLOAD,
        supersedes_state_version_id: null,
        authority_ref: "AUTH-1",
        source_type: "human_frozen_contract",
        source_ref: "SOURCE-1",
        source_hash: "HASH-1",
        issued_at: "2026-09-19T00:00:00Z",
        issued_by: "human-1",
        created_at: "2026-09-19T00:00:00Z",
        ...overrides,
    };
    db.prepare(`
        INSERT INTO project_state_versions (
            id, project_id, schema_version, state_payload_json,
            supersedes_state_version_id, authority_ref, source_type,
            source_ref, source_hash, issued_at, issued_by, created_at
        ) VALUES (
            @id, @project_id, @schema_version, @state_payload_json,
            @supersedes_state_version_id, @authority_ref, @source_type,
            @source_ref, @source_hash, @issued_at, @issued_by, @created_at
        )
    `).run(row);
}

function selectHead(db: Database.Database, versionId = "v1") {
    db.prepare(`
        INSERT INTO project_state_heads (
            project_id, current_state_version_id, selected_at, selected_by, selection_authority_ref
        ) VALUES ('p-1', ?, '2026-09-19T01:00:00Z', 'human-1', 'HEAD-AUTH-1')
    `).run(versionId);
}

describe("readCanonicalProjectStateBySlug", () => {
    let db: Database.Database;

    beforeEach(() => {
        db = setup();
    });

    it("returns PROJECT_NOT_FOUND for an unknown exact slug", () => {
        expect(readCanonicalProjectStateBySlug(db, "missing")).toEqual({
            status: "PROJECT_NOT_FOUND",
            projectSlug: "missing",
        });
    });

    it("fails closed when the Project has no explicit head", () => {
        expect(readCanonicalProjectStateBySlug(db, "alpha")).toMatchObject({
            status: "NOT_PROVEN",
            reason: "NO_HEAD",
        });
    });

    it("returns CURRENT only from the explicitly selected valid head", () => {
        insertVersion(db);
        selectHead(db);
        const result = readCanonicalProjectStateBySlug(db, "alpha");
        expect(result.status).toBe("CURRENT");
        if (result.status === "CURRENT") {
            expect(result.state.id).toBe("v1");
            expect(result.state.payload.projectStatus).toEqual({ status: "KNOWN", value: "ACTIVE" });
        }
    });

    it("returns STALE when the selected assertion is proven superseded", () => {
        insertVersion(db);
        insertVersion(db, {
            id: "v2",
            supersedes_state_version_id: "v1",
            authority_ref: "AUTH-2",
            source_ref: "SOURCE-2",
            source_hash: "HASH-2",
        });
        selectHead(db, "v1");
        const result = readCanonicalProjectStateBySlug(db, "alpha");
        expect(result).toMatchObject({
            status: "STALE",
            staleStateVersionId: "v1",
            supersededByStateVersionId: "v2",
        });
        expect("state" in result).toBe(false);
    });

    it.each([
        ["malformed payload", { state_payload_json: "{" }, "MALFORMED_PAYLOAD"],
        ["unsupported version", { schema_version: "project-state.v2" }, "UNSUPPORTED_SCHEMA_VERSION"],
        ["missing provenance", { authority_ref: "" }, "MISSING_PROVENANCE"],
    ])("fails closed for %s", (_label, overrides, expectedReason) => {
        insertVersion(db, overrides);
        selectHead(db);
        expect(readCanonicalProjectStateBySlug(db, "alpha")).toMatchObject({
            status: "NOT_PROVEN",
            reason: expectedReason,
        });
    });

    it("fails closed for a head/version Project mismatch", () => {
        insertVersion(db);
        selectHead(db);
        db.pragma("foreign_keys = OFF");
        db.exec("DROP TRIGGER trg_project_state_heads_project_binding_update");
        db.prepare("INSERT INTO projects (id, slug) VALUES ('p-2', 'beta')").run();
        // Simulate corrupted legacy storage explicitly after removing the immutability guard.
        db.exec("DROP TRIGGER trg_project_state_versions_immutable_update");
        db.prepare("UPDATE project_state_versions SET project_id = 'p-2' WHERE id = 'v1'").run();
        expect(readCanonicalProjectStateBySlug(db, "alpha")).toMatchObject({
            status: "NOT_PROVEN",
            reason: "PROJECT_MISMATCH",
        });
    });

    it("returns READ_UNAVAILABLE when storage reads fail", () => {
        db.close();
        expect(readCanonicalProjectStateBySlug(db, "alpha")).toMatchObject({
            status: "NOT_PROVEN",
            reason: "READ_UNAVAILABLE",
        });
    });
});
