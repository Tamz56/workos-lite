// src/lib/arborInboxStore.ts
import { promises as fs } from "fs";
import path from "path";

export interface ImportLogSummary {
    projectsCreated: number;
    notesCreated: number;
    tasksCreated: number;
    articleNotesCreated: number;
    skipped: number;
    errors: string[];
}

export interface ImportLog {
    id: string;
    importBatchTitle: string;
    source: string;
    schemaVersion: string;
    createdAt: string;
    status: "success" | "failed";
    summary: ImportLogSummary;
}

const dataDir = path.join(process.cwd(), "data");
const logFile = path.join(dataDir, "arbor_inbox_logs.json");

// simple queue-based mutex lock for logs
let _logsLock = Promise.resolve();

async function withLogsLock<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    const prev = _logsLock;
    _logsLock = _logsLock.then(() => next);
    await prev;
    try {
        return await fn();
    } finally {
        release();
    }
}

/**
 * Reads all import logs, handling file missing and corrupted JSON cases safely.
 */
export async function readImportLogs(): Promise<ImportLog[]> {
    return withLogsLock(async () => {
        await fs.mkdir(dataDir, { recursive: true });
        
        try {
            await fs.access(logFile);
        } catch {
            // File doesn't exist, create it with empty array
            try {
                await fs.writeFile(logFile, "[]", "utf-8");
            } catch (err: any) {
                throw new Error(`ไม่สามารถสร้างไฟล์ประวัติการนำเข้าได้: ${err.message}`);
            }
            return [];
        }

        const raw = await fs.readFile(logFile, "utf-8");
        if (!raw.trim()) {
            try {
                await fs.writeFile(logFile, "[]", "utf-8");
            } catch {}
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            // JSON corrupted: Back it up and reset file to keep system working
            const backupPath = `${logFile}.corrupted-${Date.now()}`;
            try {
                await fs.writeFile(backupPath, raw, "utf-8");
                await fs.writeFile(logFile, "[]", "utf-8");
            } catch {}
            
            console.error(`Import log file was corrupted. Backed up to ${backupPath} and reset to empty array.`);
            return [];
        }
    });
}

/**
 * Appends a new log to the log file atomically.
 */
export async function appendImportLog(log: ImportLog): Promise<void> {
    return withLogsLock(async () => {
        await fs.mkdir(dataDir, { recursive: true });

        let logs: ImportLog[] = [];
        try {
            const raw = await fs.readFile(logFile, "utf-8");
            if (raw.trim()) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    logs = parsed;
                }
            }
        } catch {
            // Ignore read errors, we will overwrite or start fresh
        }

        // Add the new log at the beginning (newest first)
        logs.unshift(log);

        // Keep last 100 entries to prevent files from growing infinitely
        if (logs.length > 100) {
            logs = logs.slice(0, 100);
        }

        const tmp = `${logFile}.tmp`;
        try {
            const payload = JSON.stringify(logs, null, 2);
            await fs.writeFile(tmp, payload, "utf-8");
            await fs.rename(tmp, logFile);
        } catch (err: any) {
            // Cleanup temp file if exists
            try {
                await fs.unlink(tmp);
            } catch {}
            throw new Error(`ไม่สามารถบันทึกประวัติการนำเข้าลงในไฟล์ได้ (write log fail): ${err.message}`);
        }
    });
}
