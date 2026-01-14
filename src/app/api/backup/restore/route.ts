import { NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { parseBackupJson } from "@/lib/backup/schema";
import { validateZipStructure, ZIP_LIMITS } from "@/lib/backup/zipUtils";
import { readAllDocs, writeAllDocs, withDocsLock, type DocRow } from "@/lib/docsStore";
import { toErrorMessage } from "@/lib/error";
import fs from "fs";
import path from "path";
import yauzl from "yauzl";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

// ============================================================
// Lock: prevent concurrent restore
// ============================================================
let restoreInProgress = false;

// ============================================================
// Response Types
// ============================================================
type RestoreStage = "validate" | "safety_backup" | "transaction" | "attachments" | "postcheck";

type RestoreResponse = {
    ok: boolean;
    mode: "replace";
    kind: "backup" | "zip" | null;
    format: "v1" | "legacy" | null;
    stage: RestoreStage | null;
    restored: {
        tasks: number;
        events: number;
        docs: number;
        attachments: number;
    } | null;
    warnings: string[];
    errors: string[];
};

function errorResponse(
    stage: RestoreStage,
    errors: string[],
    kind: RestoreResponse["kind"] = null,
    format: RestoreResponse["format"] = null,
    warnings: string[] = [],
    status: number = 400
): Response {
    const body: RestoreResponse = {
        ok: false,
        mode: "replace",
        kind,
        format,
        stage,
        restored: null,
        warnings,
        errors,
    };
    return NextResponse.json(body, { status });
}

function successResponse(
    kind: RestoreResponse["kind"],
    format: RestoreResponse["format"],
    restored: NonNullable<RestoreResponse["restored"]>,
    warnings: string[]
): Response {
    const body: RestoreResponse = {
        ok: true,
        mode: "replace",
        kind,
        format,
        stage: null,
        restored,
        warnings,
        errors: [],
    };
    return NextResponse.json(body);
}

// ============================================================
// Helpers
// ============================================================

function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}

function getDataDir() {
    return path.resolve(process.cwd(), "data");
}

function getAttachmentsDir() {
    return path.resolve(process.cwd(), ".workos-lite", "attachments");
}

async function extractZipAttachments(
    zipBuffer: Buffer,
    targetDir: string
): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    // Ensure target dir exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zip) => {
            if (err || !zip) return reject(err || new Error("Invalid ZIP"));

            zip.readEntry();

            zip.on("entry", (entry: yauzl.Entry) => {
                const fileName = entry.fileName.replace(/\\/g, "/");

                // Only extract attachments/** (not backup.json)
                if (!fileName.startsWith("attachments/") || fileName.endsWith("/")) {
                    zip.readEntry();
                    return;
                }

                // Create subdirectories
                const targetPath = path.join(targetDir, fileName);
                const targetSubdir = path.dirname(targetPath);
                if (!fs.existsSync(targetSubdir)) {
                    fs.mkdirSync(targetSubdir, { recursive: true });
                }

                zip.openReadStream(entry, (err, stream) => {
                    if (err || !stream) {
                        errors.push(`Failed to extract: ${fileName}`);
                        zip.readEntry();
                        return;
                    }

                    const writeStream = fs.createWriteStream(targetPath);
                    stream.pipe(writeStream);
                    stream.on("end", () => {
                        count++;
                        zip.readEntry();
                    });
                    stream.on("error", () => {
                        errors.push(`Stream error: ${fileName}`);
                        zip.readEntry();
                    });
                });
            });

            zip.on("end", () => resolve({ count, errors }));
            zip.on("error", (e) => reject(e));
        });
    });
}

function safeRename(src: string, dest: string): boolean {
    try {
        if (fs.existsSync(src)) {
            // Remove dest if exists (for swap operations)
            if (fs.existsSync(dest)) {
                fs.rmSync(dest, { recursive: true, force: true });
            }
            fs.renameSync(src, dest);
            return true;
        }
        return true; // Source doesn't exist, nothing to rename
    } catch {
        // Rename failed - try copy+delete as fallback (Windows compatibility)
        try {
            if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
                safeCopyDir(src, dest);
                fs.rmSync(src, { recursive: true, force: true });
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }
}

function safeCopyDir(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            safeCopyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function safeRemoveDir(dir: string): void {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    } catch {
        // Ignore cleanup errors
    }
}

function safeCopyFile(src: string, dest: string): boolean {
    try {
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ============================================================
// Main Route
// ============================================================
export async function POST(req: Request) {
    // ---- Lock check ----
    if (restoreInProgress) {
        return errorResponse("validate", ["Restore already in progress. Please wait."]);
    }
    restoreInProgress = true;

    const warnings: string[] = [];
    let safetyDbPath: string | null = null;
    let safetyAttachmentsPath: string | null = null;
    let tmpAttachmentsPath: string | null = null;

    try {
        // ============================================================
        // STAGE 1: VALIDATE
        // ============================================================
        const ct = req.headers.get("content-type") || "";
        if (!ct.includes("multipart/form-data")) {
            return errorResponse("validate", ["Expected multipart/form-data"]);
        }

        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
            return errorResponse("validate", ["Missing file field"]);
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return errorResponse("validate", [`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 200MB)`]);
        }

        const name = (file.name || "").toLowerCase();
        if (!name.endsWith(".json") && !name.endsWith(".zip")) {
            return errorResponse("validate", ["Unsupported file type: only .json or .zip"]);
        }

        // Read file content
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        let backupJsonText: string;
        let isZip = false;
        let hasZipAttachments = false;

        if (name.endsWith(".zip")) {
            isZip = true;
            // Validate ZIP structure
            const zipRes = await validateZipStructure(fileBuffer);
            if (!zipRes.ok) {
                return errorResponse("validate", zipRes.errors, "zip", null, zipRes.warnings);
            }
            backupJsonText = zipRes.backupJsonText || "";
            hasZipAttachments = zipRes.entryCount > 1; // More than just backup.json
        } else {
            backupJsonText = fileBuffer.toString("utf8");
        }

        // Parse and validate backup JSON
        let parsed: ReturnType<typeof parseBackupJson>;
        try {
            const json = JSON.parse(backupJsonText);
            parsed = parseBackupJson(json);
        } catch {
            return errorResponse("validate", ["Invalid JSON in backup file"], isZip ? "zip" : "backup");
        }

        if (!parsed.ok) {
            return errorResponse("validate", parsed.errors, isZip ? "zip" : "backup");
        }

        const { format, data } = parsed.parsed;

        // Reject metadata
        if (format === "metadata") {
            return errorResponse("validate", ["Metadata restore not supported yet. Please use a full backup."], "backup", null);
        }

        // Extract data arrays
        let tasks: unknown[] = [];
        let events: unknown[] = [];
        let docs: unknown[] = [];
        let attachmentsRefs: unknown[] = [];

        if (format === "legacy") {
            tasks = data.tasks || [];
            docs = data.docs || [];
            attachmentsRefs = data.attachments || [];
            events = []; // Legacy didn't have events
        } else {
            const d = data.data;
            tasks = d.tasks || [];
            events = d.events || [];
            docs = d.docs || [];
            attachmentsRefs = d.attachments || [];
        }

        // ---- Pre-extract ZIP attachments to temp ----
        const ts = getTimestamp();
        if (isZip && hasZipAttachments) {
            tmpAttachmentsPath = path.join(getDataDir(), `.restore_tmp_${ts}`);
            try {
                const extractRes = await extractZipAttachments(fileBuffer, tmpAttachmentsPath);
                if (extractRes.errors.length > 0) {
                    warnings.push(...extractRes.errors.map(e => `Extract warning: ${e}`));
                }
            } catch (e) {
                return errorResponse("validate", [`Failed to extract attachments: ${toErrorMessage(e)}`], "zip", format);
            }
        }

        // ============================================================
        // STAGE 2: SAFETY BACKUP
        // ============================================================
        const dataDir = getDataDir();
        const dbPath = path.join(dataDir, "workos.db");
        const attachmentsDir = getAttachmentsDir();

        // Safety backup DB
        safetyDbPath = path.join(dataDir, `workos.restore-safety.${ts}.db`);
        if (!safeCopyFile(dbPath, safetyDbPath)) {
            return errorResponse("safety_backup", ["Failed to create safety backup of database"], isZip ? "zip" : "backup", format);
        }

        // Safety backup attachments (rename strategy for speed)
        if (fs.existsSync(attachmentsDir)) {
            safetyAttachmentsPath = path.join(path.dirname(attachmentsDir), `attachments.safety.${ts}`);
            if (!safeRename(attachmentsDir, safetyAttachmentsPath)) {
                return errorResponse("safety_backup", ["Failed to create safety backup of attachments"], isZip ? "zip" : "backup", format);
            }
        }

        // ============================================================
        // STAGE 3: DB TRANSACTION
        // ============================================================
        const db = getDb();
        let insertedTasks = 0;
        let insertedEvents = 0;
        let insertedDocs = 0;
        let insertedAttachments = 0;

        try {
            db.exec("BEGIN IMMEDIATE");

            // Disable FK temporarily for clean delete
            db.exec("PRAGMA foreign_keys = OFF");

            // Drop trigger to avoid issues during delete
            db.exec("DROP TRIGGER IF EXISTS trg_tasks_updated_at");

            // Delete in FK-safe order (children first)
            db.exec("DELETE FROM attachments");
            db.exec("DELETE FROM events");
            db.exec("DELETE FROM tasks");

            // Re-enable FK
            db.exec("PRAGMA foreign_keys = ON");

            // Insert tasks
            const insertTask = db.prepare(`
        INSERT INTO tasks (id, title, workspace, status, scheduled_date, schedule_bucket, 
          start_time, end_time, priority, notes, doc_id, created_at, updated_at, done_at)
        VALUES (@id, @title, @workspace, @status, @scheduled_date, @schedule_bucket,
          @start_time, @end_time, @priority, @notes, @doc_id, @created_at, @updated_at, @done_at)
      `);

            for (const t of tasks) {
                const row = t as Record<string, unknown>;
                if (!row.id || !row.title) continue;

                const now = new Date().toISOString();
                try {
                    insertTask.run({
                        id: String(row.id),
                        title: String(row.title),
                        workspace: String(row.workspace || "avacrm"),
                        status: String(row.status || "inbox"),
                        scheduled_date: row.scheduled_date ? String(row.scheduled_date) : null,
                        schedule_bucket: row.schedule_bucket ? String(row.schedule_bucket) : null,
                        start_time: row.start_time ? String(row.start_time) : null,
                        end_time: row.end_time ? String(row.end_time) : null,
                        priority: typeof row.priority === "number" ? row.priority : null,
                        notes: row.notes ? String(row.notes) : null,
                        doc_id: row.doc_id ? String(row.doc_id) : null,
                        created_at: row.created_at ? String(row.created_at) : now,
                        updated_at: row.updated_at ? String(row.updated_at) : now,
                        done_at: row.done_at ? String(row.done_at) : null,
                    });
                    insertedTasks++;
                } catch (e) {
                    warnings.push(`Task insert skipped (${row.id}): ${toErrorMessage(e)}`);
                }
            }

            // Insert events
            const insertEvent = db.prepare(`
        INSERT INTO events (id, title, workspace, start_time, end_time, all_day, kind, description, created_at, updated_at)
        VALUES (@id, @title, @workspace, @start_time, @end_time, @all_day, @kind, @description, @created_at, @updated_at)
      `);

            for (const e of events) {
                const row = e as Record<string, unknown>;
                if (!row.id || !row.title || !row.start_time) continue;

                const now = new Date().toISOString();
                try {
                    insertEvent.run({
                        id: String(row.id),
                        title: String(row.title),
                        workspace: row.workspace ? String(row.workspace) : null,
                        start_time: String(row.start_time),
                        end_time: row.end_time ? String(row.end_time) : null,
                        all_day: row.all_day === true || row.all_day === 1 ? 1 : 0,
                        kind: row.kind ? String(row.kind) : "appointment",
                        description: row.description ? String(row.description) : null,
                        created_at: row.created_at ? String(row.created_at) : now,
                        updated_at: row.updated_at ? String(row.updated_at) : now,
                    });
                    insertedEvents++;
                } catch (e) {
                    warnings.push(`Event insert skipped (${row.id}): ${toErrorMessage(e)}`);
                }
            }

            // Insert attachment refs
            const insertAttachment = db.prepare(`
        INSERT INTO attachments (id, task_id, file_name, mime_type, size_bytes, storage_path, created_at)
        VALUES (@id, @task_id, @file_name, @mime_type, @size_bytes, @storage_path, @created_at)
      `);

            for (const a of attachmentsRefs) {
                const row = a as Record<string, unknown>;
                if (!row.id || !row.task_id || !row.storage_path) continue;

                const now = new Date().toISOString();
                try {
                    insertAttachment.run({
                        id: String(row.id),
                        task_id: String(row.task_id),
                        file_name: row.file_name ? String(row.file_name) : "file",
                        mime_type: row.mime_type ? String(row.mime_type) : null,
                        size_bytes: typeof row.size_bytes === "number" ? row.size_bytes : null,
                        storage_path: String(row.storage_path),
                        created_at: row.created_at ? String(row.created_at) : now,
                    });
                    insertedAttachments++;
                } catch {
                    // FK fail or constraint - skip
                }
            }

            // Recreate trigger before commit
            db.exec(`
                CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
                AFTER UPDATE ON tasks
                FOR EACH ROW
                BEGIN
                    UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
                END
            `);

            db.exec("COMMIT");
        } catch (e) {
            try { db.exec("ROLLBACK"); } catch { }

            // Restore safety backup
            if (safetyDbPath && fs.existsSync(safetyDbPath)) {
                safeCopyFile(safetyDbPath, dbPath);
            }
            if (safetyAttachmentsPath && fs.existsSync(safetyAttachmentsPath)) {
                safeRename(safetyAttachmentsPath, attachmentsDir);
            }

            return errorResponse("transaction", [`Database transaction failed: ${toErrorMessage(e)}`], isZip ? "zip" : "backup", format, warnings);
        }

        // ============================================================
        // STAGE 4: ATTACHMENTS SWAP
        // ============================================================
        if (tmpAttachmentsPath && fs.existsSync(tmpAttachmentsPath)) {
            const tmpAttachmentsSubdir = path.join(tmpAttachmentsPath, "attachments");

            if (fs.existsSync(tmpAttachmentsSubdir)) {
                // Ensure .workos-lite dir exists
                const workosDir = path.dirname(attachmentsDir);
                if (!fs.existsSync(workosDir)) {
                    fs.mkdirSync(workosDir, { recursive: true });
                }

                // DEV-ONLY: Test hook to simulate attachments swap failure
                if (process.env.NODE_ENV !== "production" && process.env.SIMULATE_ATTACH_SWAP_FAIL === "1") {
                    // Restore safety backup before returning error
                    if (safetyDbPath && fs.existsSync(safetyDbPath)) {
                        safeCopyFile(safetyDbPath, dbPath);
                    }
                    if (safetyAttachmentsPath) {
                        safeRename(safetyAttachmentsPath, attachmentsDir);
                    }
                    return errorResponse("attachments", ["Simulated attachments swap failure (test hook)"], "zip", format, warnings);
                }

                // Atomic swap
                if (!safeRename(tmpAttachmentsSubdir, attachmentsDir)) {
                    // Swap failed - restore DB from safety backup
                    if (safetyDbPath && fs.existsSync(safetyDbPath)) {
                        safeCopyFile(safetyDbPath, dbPath);
                    }
                    if (safetyAttachmentsPath) {
                        safeRename(safetyAttachmentsPath, attachmentsDir);
                    }

                    return errorResponse("attachments", ["Failed to swap attachments directory"], "zip", format, warnings);
                }
            }

            // Clean up temp
            safeRemoveDir(tmpAttachmentsPath);
        }

        // ============================================================
        // STAGE 5: DOCS (file-based storage)
        // ============================================================
        try {
            await withDocsLock(async () => {
                const docRows: DocRow[] = [];
                for (const d of docs) {
                    const row = d as Record<string, unknown>;
                    if (!row.id) continue;

                    const now = new Date().toISOString();
                    docRows.push({
                        id: String(row.id),
                        title: typeof row.title === "string" ? row.title : "",
                        content_md: typeof row.content_md === "string" ? row.content_md : "",
                        created_at: typeof row.created_at === "string" ? row.created_at : now,
                        updated_at: typeof row.updated_at === "string" ? row.updated_at : now,
                    });
                }
                await writeAllDocs(docRows);
                insertedDocs = docRows.length;
            });
        } catch (e) {
            warnings.push(`Docs restore warning: ${toErrorMessage(e)}`);
        }

        // ============================================================
        // STAGE 6: POST-RESTORE (ensureMigrations + sanity)
        // ============================================================
        // Re-run migrations to ensure schema is correct
        try {
            // We can't call ensureMigrations directly as it's module-level
            // But the schema should be correct from initial load
            // Just run sanity checks

            const taskCount = (db.prepare("SELECT COUNT(*) as c FROM tasks").get() as { c: number }).c;
            const eventCount = (db.prepare("SELECT COUNT(*) as c FROM events").get() as { c: number }).c;
            const attachmentCount = (db.prepare("SELECT COUNT(*) as c FROM attachments").get() as { c: number }).c;

            if (taskCount !== insertedTasks) {
                warnings.push(`Sanity check: tasks count mismatch (expected ${insertedTasks}, got ${taskCount})`);
            }
            if (eventCount !== insertedEvents) {
                warnings.push(`Sanity check: events count mismatch (expected ${insertedEvents}, got ${eventCount})`);
            }
            if (attachmentCount !== insertedAttachments) {
                warnings.push(`Sanity check: attachments count mismatch (expected ${insertedAttachments}, got ${attachmentCount})`);
            }
        } catch (e) {
            warnings.push(`Post-restore check warning: ${toErrorMessage(e)}`);
        }

        // ============================================================
        // CLEANUP: Remove safety backups on success
        // ============================================================
        // Keep safety backup for a while (don't delete immediately)
        // User can manually clean up old backups
        if (safetyAttachmentsPath) {
            safeRemoveDir(safetyAttachmentsPath);
        }

        return successResponse(
            isZip ? "zip" : "backup",
            format,
            {
                tasks: insertedTasks,
                events: insertedEvents,
                docs: insertedDocs,
                attachments: insertedAttachments,
            },
            warnings
        );

    } catch (e) {
        return errorResponse("transaction", [toErrorMessage(e) || "Unknown error"], null, null, warnings, 500);
    } finally {
        restoreInProgress = false;

        // Cleanup temp on any exit
        if (tmpAttachmentsPath) {
            safeRemoveDir(tmpAttachmentsPath);
        }
    }
}
