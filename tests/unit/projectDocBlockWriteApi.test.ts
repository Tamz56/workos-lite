import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import {
    createTestH2Session,
    seedHumanOperator,
    TRUSTED_ORIGIN,
} from "../helpers/humanSession";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST as createBlock, GET as listBlocks } from "@/app/api/projects/[slug]/doc-blocks/route";
import { PATCH as updateBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/route";
import { POST as archiveBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/archive/route";
import { POST as restoreBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/restore/route";

const WORKOS_PROJECT_ID = "WniiRWTaGeEY7gt3XAsm7";
const OTHER_PROJECT_ID = "RciepxjtyZYQSA6pmKZ0f";

let db: Database.Database;
let sessionCookie: string;

function authedRequest(url: string, init: RequestInit = {}) {
    return new NextRequest(url, {
        ...init,
        headers: {
            cookie: sessionCookie,
            origin: TRUSTED_ORIGIN,
            ...(init.headers ?? {}),
        },
    });
}

function createSchema() {
    db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );

        CREATE TABLE project_doc_blocks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            legacy_project_slug TEXT NULL,
            import_source TEXT NULL,
            import_batch_id TEXT NULL,
            migrated_at TEXT NULL,
            source_row_number INTEGER NULL,
            source_record_id TEXT NULL,
            block_type TEXT NOT NULL,
            title TEXT NOT NULL,
            block_date TEXT NOT NULL,
            summary TEXT NOT NULL,
            details_md TEXT NOT NULL,
            evidence_links_json TEXT NOT NULL DEFAULT '[]',
            related_files_json TEXT NOT NULL DEFAULT '[]',
            next_action TEXT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            order_index INTEGER NULL,
            source_text TEXT NULL,
            source_excerpt TEXT NULL,
            source_type TEXT NULL,
            generated_by TEXT NULL,
            reviewed_by_user INTEGER NOT NULL DEFAULT 0,
            applied_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
        );

        INSERT INTO projects (id, slug, name) VALUES
            ('${WORKOS_PROJECT_ID}', 'workos-lite-arbordesk', 'WorkOS Lite'),
            ('${OTHER_PROJECT_ID}', 'other-project', 'Other Project');
    `);
}

function insertMockBlock(id: string, projectId: string, updatedAt: string, status = "active") {
    db.prepare(`
        INSERT INTO project_doc_blocks (
            id, project_id, legacy_project_slug, import_source, import_batch_id,
            migrated_at, source_row_number, source_record_id, block_type, title,
            block_date, summary, details_md, evidence_links_json, related_files_json,
            status, created_at, updated_at
        ) VALUES (
            ?, ?, 'legacy-slug', 'localstorage_recovery', 'batch-1',
            '2026-08-01T22:00:00.000Z', 1, 'src-123', 'process_note', 'Mock Title',
            '2026-08-01', 'Mock Summary', 'Mock Details', '[]', '[]',
            ?, '2026-08-01T12:00:00.000Z', ?
        )
    `).run(id, projectId, status, updatedAt);
}

beforeEach(() => {
    db = new Database(":memory:");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    createSchema();
    const operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
    mockGetDb.mockReturnValue(db);
});

afterEach(() => {
    vi.unstubAllEnvs();
    db.close();
    vi.clearAllMocks();
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe("Project Doc Blocks Write API Tests", () => {
    describe("Create Block (POST)", () => {
        it("creates a valid block successfully", async () => {
            const payload = {
                type: "process_note",
                title: "ทบทวนการทำงานระบบภาษาไทย",
                date: "2026-08-02",
                summary: "สรุปบันทึกการทำงาน",
                details: "## รายละเอียด\n\n```text\n  preserve spaces\n```",
                evidenceLinks: ["https://example.com", "commit-123"],
                relatedFiles: ["src/app/page.tsx"],
                status: "active",
                nextAction: "Verify changes",
                generatedBy: "arbor_assistant",
                reviewedByUser: true
            };

            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );

            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data.id).toBeDefined();
            expect(data.title).toBe(payload.title);
            expect(data.details).toBe(payload.details);
            expect(data.evidenceLinks).toEqual(payload.evidenceLinks);
            expect(data.relatedFiles).toEqual(payload.relatedFiles);
            expect(data.reviewedByUser).toBe(true);
            expect(data.generatedBy).toBe("arbor");
            expect(data.createdAt).toBeDefined();
            expect(data.updatedAt).toBeDefined();

            // Verify project relation in DB
            const row = db.prepare("SELECT * FROM project_doc_blocks WHERE id = ?").get(data.id) as { project_id: string };
            expect(row.project_id).toBe(WORKOS_PROJECT_ID);
        });

        it("returns 404 for unknown project", async () => {
            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/unknown-proj/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        title: "Title",
                        date: "2026-08-02",
                        details: "Details"
                    })
                }),
                { params: Promise.resolve({ slug: "unknown-proj" }) }
            );
            expect(response.status).toBe(404);
        });

        it("returns 400 for invalid payload (missing title)", async () => {
            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        date: "2026-08-02",
                        details: "Details"
                    })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            expect(response.status).toBe(400);
        });

        it("returns 400 for malformed arrays", async () => {
            await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        title: "Title",
                        date: "2026-08-02",
                        details: "Details",
                        evidenceLinks: "not-an-array"
                    })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
        });
    });

    describe("generatedBy Contract", () => {
        it("creates block without generatedBy (manual Add Block) → 201", async () => {
            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        title: "Manual Create",
                        date: "2026-08-02",
                        details: "Created via Add Block",
                        reviewedByUser: true
                    })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            expect(response.status).toBe(201);
            const data = await response.json();
            // generatedBy should be absent or undefined for manual blocks
            expect(data.generatedBy).toBeUndefined();

            // DB stores null for manual blocks
            const row = db.prepare("SELECT generated_by FROM project_doc_blocks WHERE id = ?").get(data.id) as { generated_by: string | null };
            expect(row.generated_by).toBeNull();
        });

        it("creates block with generatedBy: 'arbor_assistant' → 201", async () => {
            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        title: "Arbor Generated",
                        date: "2026-08-02",
                        details: "Created via Arbor Assistant",
                        generatedBy: "arbor_assistant",
                        reviewedByUser: true
                    })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            expect(response.status).toBe(201);
            const data = await response.json();
            expect(data.generatedBy).toBe("arbor");

            // DB stores 'arbor' (column constraint only allows 'arbor' or NULL)
            const row = db.prepare("SELECT generated_by FROM project_doc_blocks WHERE id = ?").get(data.id) as { generated_by: string | null };
            expect(row.generated_by).toBe("arbor");
        });

        it("creates block with generatedBy: 'arbor' → 201", async () => {
            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        title: "Legacy Arbor",
                        date: "2026-08-02",
                        details: "Legacy arbor value",
                        generatedBy: "arbor",
                        reviewedByUser: true
                    })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            expect(response.status).toBe(201);
            const data = await response.json();
            // Legacy value 'arbor' is still accepted
            expect(data.generatedBy).toBeDefined();
        });

        it("rejects invalid generatedBy value → 400", async () => {
            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        title: "Invalid Generated",
                        date: "2026-08-02",
                        details: "Invalid value",
                        generatedBy: "manual"
                    })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Invalid generatedBy field");
        });

        it("rejects another invalid generatedBy value → 400", async () => {
            const response = await createBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks`, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "process_note",
                        title: "Another Invalid",
                        date: "2026-08-02",
                        details: "Invalid value",
                        generatedBy: "import_log"
                    })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toBe("Invalid generatedBy field");
        });

        it("null generatedBy readback works for recovery records", async () => {
            // Insert a recovery record with generated_by = NULL
            db.prepare(`
                INSERT INTO project_doc_blocks (
                    id, project_id, block_type, title, block_date,
                    summary, details_md, evidence_links_json, related_files_json,
                    status, generated_by, reviewed_by_user, created_at, updated_at
                ) VALUES (?, ?, 'process_note', 'Recovery Record', '2026-07-30',
                    'Recovery summary', 'Recovery details', '[]', '[]',
                    'active', NULL, 0, '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z')
            `).run("recovery-null-gby", WORKOS_PROJECT_ID);

            // List and verify generatedBy is not set on the response
            const response = await listBlocks(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks?status=active`),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            expect(response.status).toBe(200);
            const blocks = await response.json();
            const recovered = blocks.find((b: { id: string }) => b.id === "recovery-null-gby");
            expect(recovered).toBeDefined();
            expect(recovered.generatedBy).toBeUndefined();
        });
    });

    describe("Update Block (PATCH)", () => {
        const BLOCK_ID = "block-to-update";

        beforeEach(() => {
            insertMockBlock(BLOCK_ID, WORKOS_PROJECT_ID, "2026-08-01T12:00:00.000Z");
        });

        it("updates block details successfully", async () => {
            const payload = {
                expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                title: "Updated Title ภาษาไทย",
                details: "## New details\n\n  with spaces",
                evidenceLinks: ["new-link"]
            };

            const response = await updateBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks/${BLOCK_ID}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.title).toBe("Updated Title ภาษาไทย");
            expect(data.details).toBe("## New details\n\n  with spaces");
            expect(data.evidenceLinks).toEqual(["new-link"]);
            expect(data.createdAt).toBe("2026-08-01T12:00:00.000Z");
            expect(data.updatedAt).not.toBe("2026-08-01T12:00:00.000Z");

            // Verify import metadata preserved
            expect(data.importSource).toBe("localstorage_recovery");
            expect(data.importBatchId).toBe("batch-1");
            expect(data.sourceRecordId).toBe("src-123");
            expect(data.sourceRowNumber).toBe(1);
        });

        it("returns 409 conflict for stale expectedUpdatedAt", async () => {
            const payload = {
                expectedUpdatedAt: "2026-08-01T00:00:00.000Z", // stale
                title: "Updated Title"
            };

            const response = await updateBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks/${BLOCK_ID}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(409);
            const errorData = await response.json();
            expect(errorData.error).toContain("This record has changed");
        });

        it("returns 400 for immutable fields update attempt (projectId)", async () => {
            const payload = {
                expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                projectId: OTHER_PROJECT_ID
            };

            const response = await updateBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks/${BLOCK_ID}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain("Immutable fields cannot be updated: projectId");
        });

        it("returns 400 when PATCH payload explicitly contains projectSlug", async () => {
            const payload = {
                expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                projectSlug: WORKOS_PROJECT_ID,
                title: "Attempting to send projectSlug"
            };

            const response = await updateBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks/${BLOCK_ID}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain("Immutable fields cannot be updated: projectSlug");
        });

        it("returns 400 when PATCH payload contains createdAt or import metadata", async () => {
            const payload = {
                expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                createdAt: "2020-01-01T00:00:00.000Z",
                importSource: "hacked"
            };

            const response = await updateBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks/${BLOCK_ID}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain("Immutable fields cannot be updated");
        });

        it("returns 404 for wrong project isolation", async () => {
            const payload = {
                expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                title: "Updated Title"
            };

            const response = await updateBlock(
                authedRequest(`http://localhost/api/projects/${OTHER_PROJECT_ID}/doc-blocks/${BLOCK_ID}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                }),
                { params: Promise.resolve({ slug: OTHER_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(404);
        });
    });

    describe("Archive and Restore", () => {
        const BLOCK_ID = "block-archive-restore";

        beforeEach(() => {
            insertMockBlock(BLOCK_ID, WORKOS_PROJECT_ID, "2026-08-01T12:00:00.000Z", "active");
        });

        it("archives an active block successfully", async () => {
            const response = await archiveBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks/${BLOCK_ID}/archive`, {
                    method: "POST",
                    body: JSON.stringify({ expectedUpdatedAt: "2026-08-01T12:00:00.000Z" })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.status).toBe("archived");

            // Verify active list excludes it, archived filter includes it
            const activeRes = await listBlocks(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks?status=active`),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            const activeList = await activeRes.json();
            expect(activeList.some((b: { id: string }) => b.id === BLOCK_ID)).toBe(false);

            const archivedRes = await listBlocks(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks?status=archived`),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID }) }
            );
            const archivedList = await archivedRes.json();
            expect(archivedList.some((b: { id: string }) => b.id === BLOCK_ID)).toBe(true);
        });

        it("restores an archived block successfully", async () => {
            // First, make it archived in DB
            db.prepare("UPDATE project_doc_blocks SET status = 'archived' WHERE id = ?").run(BLOCK_ID);
            const current = db.prepare("SELECT updated_at FROM project_doc_blocks WHERE id = ?").get(BLOCK_ID) as { updated_at: string };

            const response = await restoreBlock(
                authedRequest(`http://localhost/api/projects/${WORKOS_PROJECT_ID}/doc-blocks/${BLOCK_ID}/restore`, {
                    method: "POST",
                    body: JSON.stringify({ expectedUpdatedAt: current.updated_at })
                }),
                { params: Promise.resolve({ slug: WORKOS_PROJECT_ID, blockId: BLOCK_ID }) }
            );

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.status).toBe("active");
        });
    });
});

describe("Project identifier resolver write operations (slug support)", () => {
    const WORKOS_SLUG = "workos-lite-arbordesk";
    const BLOCK_ID = "slug-test-block";

    beforeEach(() => {
        insertMockBlock(BLOCK_ID, WORKOS_PROJECT_ID, "2026-08-01T12:00:00.000Z");
    });

    it("POST creates a block by slug → 201", async () => {
        const response = await createBlock(
            authedRequest(`http://localhost/api/projects/${WORKOS_SLUG}/doc-blocks`, {
                method: "POST",
                body: JSON.stringify({
                    type: "process_note",
                    title: "Created by slug",
                    date: "2026-08-02",
                    details: "Details via slug"
                })
            }),
            { params: Promise.resolve({ slug: WORKOS_SLUG }) }
        );

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.title).toBe("Created by slug");
        expect(data.projectId).toBe(WORKOS_PROJECT_ID);
    });

    it("PATCH updates a block by slug → 200", async () => {
        const response = await updateBlock(
            authedRequest(`http://localhost/api/projects/${WORKOS_SLUG}/doc-blocks/${BLOCK_ID}`, {
                method: "PATCH",
                body: JSON.stringify({
                    expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                    title: "Updated by slug"
                })
            }),
            { params: Promise.resolve({ slug: WORKOS_SLUG, blockId: BLOCK_ID }) }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.title).toBe("Updated by slug");
    });

    it("Archive by slug → 200", async () => {
        const response = await archiveBlock(
            authedRequest(`http://localhost/api/projects/${WORKOS_SLUG}/doc-blocks/${BLOCK_ID}/archive`, {
                method: "POST",
                body: JSON.stringify({ expectedUpdatedAt: "2026-08-01T12:00:00.000Z" })
            }),
            { params: Promise.resolve({ slug: WORKOS_SLUG, blockId: BLOCK_ID }) }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe("archived");
    });

    it("Restore by slug → 200", async () => {
        db.prepare("UPDATE project_doc_blocks SET status = 'archived' WHERE id = ?").run(BLOCK_ID);
        const current = db.prepare("SELECT updated_at FROM project_doc_blocks WHERE id = ?").get(BLOCK_ID) as { updated_at: string };

        const response = await restoreBlock(
            authedRequest(`http://localhost/api/projects/${WORKOS_SLUG}/doc-blocks/${BLOCK_ID}/restore`, {
                method: "POST",
                body: JSON.stringify({ expectedUpdatedAt: current.updated_at })
            }),
            { params: Promise.resolve({ slug: WORKOS_SLUG, blockId: BLOCK_ID }) }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe("active");
    });

    it("returns 404 for POST with unknown slug", async () => {
        const response = await createBlock(
            authedRequest(`http://localhost/api/projects/unknown-slug/doc-blocks`, {
                method: "POST",
                body: JSON.stringify({
                    type: "process_note",
                    title: "Title",
                    date: "2026-08-02",
                    details: "Details"
                })
            }),
            { params: Promise.resolve({ slug: "unknown-slug" }) }
        );
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Project not found" });
    });

    it("returns 404 for PATCH with unknown slug", async () => {
        const response = await updateBlock(
            authedRequest(`http://localhost/api/projects/unknown-slug/doc-blocks/${BLOCK_ID}`, {
                method: "PATCH",
                body: JSON.stringify({
                    expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                    title: "Title"
                })
            }),
            { params: Promise.resolve({ slug: "unknown-slug", blockId: BLOCK_ID }) }
        );
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Project not found" });
    });

    it("returns 404 for wrong-project block accessed via correct slug", async () => {
        const otherBlockId = "other-project-block";
        insertMockBlock(otherBlockId, OTHER_PROJECT_ID, "2026-08-01T12:00:00.000Z");

        const response = await updateBlock(
            authedRequest(`http://localhost/api/projects/${WORKOS_SLUG}/doc-blocks/${otherBlockId}`, {
                method: "PATCH",
                body: JSON.stringify({
                    expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
                    title: "Attempt cross-project"
                })
            }),
            { params: Promise.resolve({ slug: WORKOS_SLUG, blockId: otherBlockId }) }
        );

        expect(response.status).toBe(404);
    });
});
