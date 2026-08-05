// ---------------------------------------------------------------------------
// WorkOS Sheet Gate 6 — isolated execution test database
// WORKOS-SHEET-GATE-6
// ---------------------------------------------------------------------------

import Database from "better-sqlite3";
import { ensureAuditSchema } from "@/lib/project-import/auditSchema";

export function createExecutionTestDatabase(): Database.Database {
    const db = new Database(":memory:");
    ensureAuditSchema(db);
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
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
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
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
            order_index INTEGER NULL,
            source_text TEXT NULL,
            source_excerpt TEXT NULL,
            source_type TEXT NULL,
            generated_by TEXT NULL CHECK (generated_by IN ('arbor') OR generated_by IS NULL),
            reviewed_by_user INTEGER NOT NULL DEFAULT 0,
            applied_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
        );

        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
            priority INTEGER NULL,
            schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning', 'afternoon', 'evening', 'none') OR schedule_bucket IS NULL),
            start_date TEXT NULL,
            end_date TEXT NULL,
            is_milestone INTEGER NOT NULL DEFAULT 0,
            workstream TEXT NULL,
            dod_text TEXT NULL,
            notes TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
    `);
    return db;
}

export function seedProject(db: Database.Database, id: string, slug: string, name: string, status = "planned"): void {
    db.prepare(`
        INSERT INTO projects (id, slug, name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(id, slug, name, status);
}

export function seedExistingDocBlock(
    db: Database.Database,
    seed: {
        id: string;
        projectId: string;
        sourceRecordId?: string | null;
        title?: string;
        blockDate?: string;
        summary?: string;
        detailsMd?: string;
        status?: string;
        evidenceLinksJson?: string;
        relatedFilesJson?: string;
        nextAction?: string | null;
        orderIndex?: number | null;
    },
): void {
    db.prepare(`
        INSERT INTO project_doc_blocks (
            id, project_id, source_record_id, block_type, title, block_date, summary, details_md,
            evidence_links_json, related_files_json, next_action, status, order_index,
            created_at, updated_at
        ) VALUES (?, ?, ?, 'process_note', ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')
    `).run(
        seed.id,
        seed.projectId,
        seed.sourceRecordId ?? null,
        seed.title ?? "Existing doc",
        seed.blockDate ?? "2026-08-01",
        seed.summary ?? "Existing summary",
        seed.detailsMd ?? "Existing details",
        seed.evidenceLinksJson ?? "[]",
        seed.relatedFilesJson ?? "[]",
        seed.nextAction ?? null,
        seed.status ?? "active",
        seed.orderIndex ?? null,
    );
}

export function seedExistingBacklogItem(
    db: Database.Database,
    seed: {
        id: string;
        projectId: string;
        title: string;
        status?: string;
        priority?: number | null;
        scheduleBucket?: string | null;
        startDate?: string | null;
        endDate?: string | null;
        isMilestone?: number;
        workstream?: string | null;
        dodText?: string | null;
        notes?: string | null;
    },
): void {
    db.prepare(`
        INSERT INTO project_items (
            id, project_id, title, status, priority, schedule_bucket,
            start_date, end_date, is_milestone, workstream, dod_text, notes,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z')
    `).run(
        seed.id,
        seed.projectId,
        seed.title,
        seed.status ?? "planned",
        seed.priority ?? null,
        seed.scheduleBucket ?? null,
        seed.startDate ?? null,
        seed.endDate ?? null,
        seed.isMilestone ?? 0,
        seed.workstream ?? null,
        seed.dodText ?? null,
        seed.notes ?? null,
    );
}
