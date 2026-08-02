import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { getDb } from "@/db/db";
import { ProjectDocumentationBlock } from "@/lib/types";
import {
    mapRowToBlock,
    mapBlockToRow,
    DbProjectDocBlockRow
} from "@/lib/project-doc-blocks/mappers";
import {
    isNonEmptyString,
    isValidBlockType,
    isValidStatus,
    isValidSourceType,
    isValidImportSource,
    isValidDateFormat,
    isValidIsoDateTime,
    isValidIntegerOrNull,
    isStringArray,
    checkImmutableFields
} from "@/lib/project-doc-blocks/validation";
import {
    computeRecordIntegrityHash,
    computeContentDuplicateHash
} from "@/lib/project-doc-blocks/hashing";
import {
    insertProjectDocBlock,
    findProjectDocBlocksByProjectId,
    findProjectDocBlockById,
    deleteProjectDocBlock,
    getProjectIdBySlug
} from "@/lib/project-doc-blocks/repository";

let testDb: Database.Database;

function createTestSchema() {
    testDb.exec(`
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
            import_source TEXT NULL CHECK(import_source IN ('localstorage_recovery', 'google_sheet', 'manual', 'arbor_summary') OR import_source IS NULL),
            import_batch_id TEXT NULL,
            migrated_at TEXT NULL,
            source_row_number INTEGER NULL,
            source_record_id TEXT NULL,
            block_type TEXT NOT NULL CHECK (block_type IN ('brief', 'structure', 'sop', 'process_note', 'decision', 'milestone', 'issue_fix', 'publish', 'qa_review')),
            title TEXT NOT NULL,
            block_date TEXT NOT NULL,
            summary TEXT NOT NULL,
            details_md TEXT NOT NULL,
            evidence_links_json TEXT NOT NULL DEFAULT '[]',
            related_files_json TEXT NOT NULL DEFAULT '[]',
            next_action TEXT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
            order_index INTEGER NULL,
            source_text TEXT NULL,
            source_excerpt TEXT NULL,
            source_type TEXT NULL CHECK (source_type IN ('manual_paste', 'walkthrough', 'commit_log', 'qa_report', 'publish_log', 'chat_summary') OR source_type IS NULL),
            generated_by TEXT NULL CHECK (generated_by IN ('arbor') OR generated_by IS NULL),
            reviewed_by_user INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_by_user IN (0, 1)),
            applied_at TEXT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
        );

        CREATE TRIGGER trg_project_doc_blocks_updated_at
        AFTER UPDATE ON project_doc_blocks
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
            UPDATE project_doc_blocks SET updated_at = datetime('now') WHERE id = NEW.id;
        END;

        CREATE INDEX idx_project_doc_blocks_proj_order
            ON project_doc_blocks(project_id, order_index, block_date);
        CREATE INDEX idx_project_doc_blocks_proj_date
            ON project_doc_blocks(project_id, block_date);

        INSERT INTO projects (id, slug, name) VALUES
            ('WniiRWTaGeEY7gt3XAsm7', 'workos-lite-arbordesk', 'WorkOS Lite'),
            ('RciepxjtyZYQSA6pmKZ0f', 'green-fineness-content', 'Green Fineness Content');
    `);
}

describe("Project Doc Blocks Schema & Foundation Tests", () => {
    // A mock block structure
    const mockBlock: ProjectDocumentationBlock = {
        id: "test-id-123",
        projectSlug: "workos-lite-arbordesk",
        type: "process_note",
        title: "Test Log Block",
        date: "2026-08-01",
        summary: "This is a summary",
        details: "## Markdown Header\n\n- Bullet point\n- Thai text: ยินดีต้อนรับ\n\n```typescript\nconst code = 42;\n```",
        evidenceLinks: ["https://github.com/commit/1", "https://github.com/commit/2"],
        relatedFiles: ["src/file1.ts", "src/file2.ts"],
        status: "active",
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-01T12:00:00.000Z",
        orderIndex: 5,
        reviewedByUser: true
    };

    beforeAll(() => {
        testDb = new Database(":memory:");
        createTestSchema();
        mockGetDb.mockReturnValue(testDb);
        const db = getDb();
        expect(db).toBeDefined();
    });

    afterAll(() => {
        testDb.close();
        vi.restoreAllMocks();
    });

    describe("1. SQLite Schema Inspection & Verification", () => {
        it("should verify table schema constraints, trigger, and indexes exist in the isolated DB", () => {
            const db = getDb();

            // Check table exists and fields match
            const fields = db.prepare("PRAGMA table_info(project_doc_blocks)").all() as Array<{
                name: string;
                dflt_value: string | null;
            }>;
            expect(fields.length).toBeGreaterThan(0);

            const fieldNames = fields.map(f => f.name);
            expect(fieldNames).toContain("id");
            expect(fieldNames).toContain("project_id");
            expect(fieldNames).toContain("legacy_project_slug");
            expect(fieldNames).toContain("status");
            expect(fieldNames).toContain("block_type");
            expect(fieldNames).toContain("details_md");
            expect(fieldNames).toContain("import_source");
            expect(fieldNames).toContain("import_batch_id");
            expect(fieldNames).toContain("source_row_number");
            expect(fieldNames).toContain("source_record_id");

            // Verify status default is 'active'
            const statusField = fields.find(f => f.name === "status");
            expect(statusField?.dflt_value).toBe("'active'");

            // Verify FOREIGN KEY RESTRICT constraint
            const fkList = db.prepare("PRAGMA foreign_key_list(project_doc_blocks)").all() as Array<{
                table: string;
                to: string;
                on_delete: string;
            }>;
            expect(fkList.length).toBe(1);
            expect(fkList[0].table).toBe("projects");
            expect(fkList[0].to).toBe("id");
            expect(fkList[0].on_delete).toBe("RESTRICT");

            // Verify Indexes
            const indexList = db.prepare("PRAGMA index_list(project_doc_blocks)").all() as Array<{
                name: string;
            }>;
            const indexNames = indexList.map(idx => idx.name);
            expect(indexNames).toContain("idx_project_doc_blocks_proj_order");
            expect(indexNames).toContain("idx_project_doc_blocks_proj_date");

            // Verify total records in table is currently 0 (we haven't run import)
            const countRow = db.prepare("SELECT count(*) as count FROM project_doc_blocks").get() as { count: number };
            expect(countRow.count).toBe(0);
        });
    });

    describe("2. Mapping Layer & Safe JSON Validation", () => {
        it("should cleanly translate domain to row and row back to domain", () => {
            const context = {
                projectId: "WniiRWTaGeEY7gt3XAsm7",
                legacyProjectSlug: "workos-lite-arbordesk",
                importSource: "manual"
            };

            const row = mapBlockToRow(mockBlock, context) as DbProjectDocBlockRow;
            expect(row.project_id).toBe("WniiRWTaGeEY7gt3XAsm7");
            expect(row.block_type).toBe("process_note");
            expect(row.evidence_links_json).toBe(JSON.stringify(mockBlock.evidenceLinks));
            expect(row.reviewed_by_user).toBe(1);

            // Reconstitute back
            const mappedDomain = mapRowToBlock({
                ...row,
                created_at: mockBlock.createdAt,
                updated_at: mockBlock.updatedAt
            }, "workos-lite-arbordesk");

            expect(mappedDomain.id).toBe(mockBlock.id);
            expect(mappedDomain.projectSlug).toBe("workos-lite-arbordesk");
            expect(mappedDomain.evidenceLinks).toEqual(mockBlock.evidenceLinks);
            expect(mappedDomain.reviewedByUser).toBe(true);
            expect(mappedDomain.orderIndex).toBe(5);
        });

        it("should throw a data integrity error on invalid JSON arrays", () => {
            const context = { projectId: "WniiRWTaGeEY7gt3XAsm7" };
            const row = mapBlockToRow(mockBlock, context) as DbProjectDocBlockRow;

            // Set invalid JSON string
            const invalidRow = {
                ...row,
                evidence_links_json: "invalid-json",
                created_at: mockBlock.createdAt,
                updated_at: mockBlock.updatedAt
            };

            expect(() => mapRowToBlock(invalidRow, "workos-lite-arbordesk")).toThrow("Data Integrity Error");
        });

        it("should throw a data integrity error if parsed JSON is not a string array", () => {
            const context = { projectId: "WniiRWTaGeEY7gt3XAsm7" };
            const row = mapBlockToRow(mockBlock, context) as DbProjectDocBlockRow;

            // Set JSON array containing numbers instead of strings
            const invalidRow = {
                ...row,
                evidence_links_json: "[1, 2, 3]",
                created_at: mockBlock.createdAt,
                updated_at: mockBlock.updatedAt
            };

            expect(() => mapRowToBlock(invalidRow, "workos-lite-arbordesk")).toThrow("Data Integrity Error");
        });
    });

    describe("3. Validation Rules", () => {
        it("should validate all required parameters and status bounds", () => {
            expect(isNonEmptyString("valid-title")).toBe(true);
            expect(isNonEmptyString("  ")).toBe(false);

            expect(isValidBlockType("process_note")).toBe(true);
            expect(isValidBlockType("unknown_type")).toBe(false);

            expect(isValidStatus("active")).toBe(true);
            expect(isValidStatus("archived")).toBe(true);
            expect(isValidStatus("completed")).toBe(false);

            expect(isValidSourceType("commit_log")).toBe(true);
            expect(isValidSourceType(null)).toBe(true);

            expect(isValidImportSource("google_sheet")).toBe(true);
            expect(isValidImportSource("unknown_source")).toBe(false);

            expect(isValidDateFormat("2026-08-01")).toBe(true);
            expect(isValidDateFormat("2026/08/01")).toBe(false);
            expect(isValidDateFormat("2026-02-31")).toBe(false); // Non-existent date

            expect(isValidIsoDateTime("2026-08-01T12:00:00Z")).toBe(true);
            expect(isValidIntegerOrNull(10)).toBe(true);
            expect(isValidIntegerOrNull(null)).toBe(true);

            expect(isStringArray(["s1", "s2"])).toBe(true);
            expect(isStringArray(["s1", 42])).toBe(false);

            // Check immutable fields check helper
            expect(checkImmutableFields({ title: "ok", id: "no" })).toEqual(["id"]);
        });
    });

    describe("4. Dual Hashing Verification", () => {
        it("should normalize newlines consistently and preserve formatting, array order and Thai characters in integrity hash", () => {
            const blockA = {
                ...mockBlock,
                details: "Line 1\r\nLine 2\r\nยินดีต้อนรับ\n```fences```"
            };
            const blockB = {
                ...mockBlock,
                details: "Line 1\nLine 2\nยินดีต้อนรับ\n```fences```"
            };

            const hashA = computeRecordIntegrityHash(blockA);
            const hashB = computeRecordIntegrityHash(blockB);
            expect(hashA).toBe(hashB);

            // Test that whitespace changes affect integrity hash (details whitespace remains significant)
            const blockC = {
                ...mockBlock,
                details: "Line 1\nLine 2\nยินดีต้อนรับ\n```fences``` " // trailing space
            };
            const hashC = computeRecordIntegrityHash(blockC);
            expect(hashA).not.toBe(hashC);

            // Test that array order changes affect integrity hash
            const blockD1 = { ...mockBlock, evidenceLinks: ["A", "B"] };
            const blockD2 = { ...mockBlock, evidenceLinks: ["B", "A"] };
            expect(computeRecordIntegrityHash(blockD1)).not.toBe(computeRecordIntegrityHash(blockD2));

            // Test that changing ID changes integrity hash
            const blockE = { ...mockBlock, id: "different-id" };
            expect(computeRecordIntegrityHash(mockBlock)).not.toBe(computeRecordIntegrityHash(blockE));
        });

        it("should normalize title case/whitespace, ignore IDs/timestamps, and sort arrays in duplicate hash", () => {
            const block1 = {
                ...mockBlock,
                id: "id-1",
                createdAt: "2026-08-01T12:00:00Z",
                title: "  Test Title  ",
                evidenceLinks: ["link-B", "link-A"]
            };
            const block2 = {
                ...mockBlock,
                id: "id-2", // different ID
                createdAt: "2026-08-02T13:00:00Z", // different timestamp
                title: "test title", // different casing & whitespace
                evidenceLinks: ["link-A", "link-B"] // sorted equivalent
            };

            const hash1 = computeContentDuplicateHash(block1);
            const hash2 = computeContentDuplicateHash(block2);
            expect(hash1).toBe(hash2);
        });
    });

    describe("5. Repository Primitives Transactional Tests", () => {
        it("should execute repository primitives in a transaction and rollback safely without writing to active DB", () => {
            const db = getDb();
            const projectId = getProjectIdBySlug(mockBlock.projectSlug);
            expect(projectId).not.toBeNull();

            // Run in a transaction that always rolls back to assert NO permanent writes are made
            const tx = db.transaction(() => {
                // Assert no blocks exist initially
                const before = findProjectDocBlocksByProjectId(projectId!);
                expect(before.length).toBe(0);

                // Insert mock block
                insertProjectDocBlock(mockBlock, { projectId: projectId! });

                // Find by Project ID
                const projectBlocks = findProjectDocBlocksByProjectId(projectId!);
                expect(projectBlocks.length).toBe(1);
                expect(projectBlocks[0].id).toBe(mockBlock.id);

                // Find by block ID
                const singleBlock = findProjectDocBlockById(mockBlock.id);
                expect(singleBlock).not.toBeNull();
                expect(singleBlock!.title).toBe(mockBlock.title);

                // Delete mock block
                deleteProjectDocBlock(mockBlock.id);
                expect(findProjectDocBlockById(mockBlock.id)).toBeNull();

                // Throw error to rollback transaction
                throw new Error("ROLLBACK_FOR_TEST");
            });

            expect(() => tx()).toThrow("ROLLBACK_FOR_TEST");

            // Verify active database remains unchanged
            expect(findProjectDocBlockById(mockBlock.id)).toBeNull();
            const projectBlocksAfter = findProjectDocBlocksByProjectId(projectId!);
            expect(projectBlocksAfter.length).toBe(0);
        });
    });
});
