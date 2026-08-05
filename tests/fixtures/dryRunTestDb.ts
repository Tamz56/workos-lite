// ---------------------------------------------------------------------------
// WorkOS Sheet Gate 3 — isolated in-memory dry-run test database
// WORKOS-SHEET-GATE-3
// ---------------------------------------------------------------------------

import Database from "better-sqlite3";

export type DocSeed = {
    id: string;
    project_id: string;
    source_record_id?: string | null;
    block_type?: string;
    title?: string;
    block_date?: string;
    summary?: string;
    details_md?: string;
    evidence_links_json?: string;
    related_files_json?: string;
    next_action?: string | null;
    status?: string;
    order_index?: number | null;
    reviewed_by_user?: number;
};

export type BacklogSeed = {
    id: string;
    project_id: string;
    title: string;
    status?: string;
    priority?: number | null;
    schedule_bucket?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_milestone?: number;
    workstream?: string | null;
    dod_text?: string | null;
    notes?: string | null;
};

export function createDryRunTestDatabase(): Database.Database {
    const db = new Database(":memory:");
    db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
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

        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            priority INTEGER NULL,
            schedule_bucket TEXT NULL,
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

export function seedProject(db: Database.Database, id: string, slug: string, name: string): void {
    db.prepare(
        "INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?, ?, ?, 'planned', datetime('now'), datetime('now'))",
    ).run(id, slug, name);
}

export function seedDocBlock(db: Database.Database, seed: DocSeed): void {
    db.prepare(`
        INSERT INTO project_doc_blocks (
            id, project_id, legacy_project_slug, import_source, import_batch_id, migrated_at,
            source_row_number, source_record_id, block_type, title, block_date, summary, details_md,
            evidence_links_json, related_files_json, next_action, status, order_index,
            source_text, source_excerpt, source_type, generated_by, reviewed_by_user, applied_at,
            created_at, updated_at
        ) VALUES (
            @id, @project_id, NULL, NULL, NULL, NULL,
            NULL, @source_record_id, @block_type, @title, @block_date, @summary, @details_md,
            @evidence_links_json, @related_files_json, @next_action, @status, @order_index,
            NULL, NULL, NULL, NULL, @reviewed_by_user, NULL,
            '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
        )
    `).run({
        id: seed.id,
        project_id: seed.project_id,
        source_record_id: seed.source_record_id ?? null,
        block_type: seed.block_type ?? "process_note",
        title: seed.title ?? "Fixture doc one",
        block_date: seed.block_date ?? "2026-01-05",
        summary: seed.summary ?? "Summary one",
        details_md: seed.details_md ?? "Details line 1\nDetails line 2",
        evidence_links_json: seed.evidence_links_json ?? '["https://a.example","https://b.example"]',
        related_files_json: seed.related_files_json ?? '["file-a.txt"]',
        next_action: seed.next_action ?? null,
        status: seed.status ?? "active",
        order_index: seed.order_index ?? null,
        reviewed_by_user: seed.reviewed_by_user ?? 1,
    });
}

export function seedBacklogItem(db: Database.Database, seed: BacklogSeed): void {
    db.prepare(`
        INSERT INTO project_items (
            id, project_id, title, status, priority, schedule_bucket,
            start_date, end_date, is_milestone, workstream, dod_text, notes,
            created_at, updated_at
        ) VALUES (
            @id, @project_id, @title, @status, @priority, @schedule_bucket,
            @start_date, @end_date, @is_milestone, @workstream, @dod_text, @notes,
            '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
        )
    `).run({
        id: seed.id,
        project_id: seed.project_id,
        title: seed.title,
        status: seed.status ?? "planned",
        priority: seed.priority ?? null,
        schedule_bucket: seed.schedule_bucket ?? null,
        start_date: seed.start_date ?? null,
        end_date: seed.end_date ?? null,
        is_milestone: seed.is_milestone ?? 0,
        workstream: seed.workstream ?? null,
        dod_text: seed.dod_text ?? null,
        notes: seed.notes ?? null,
    });
}
