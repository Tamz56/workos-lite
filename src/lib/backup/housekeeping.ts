import fs from "fs";
import path from "path";

const RETAIN_COUNT = 5;
const RETAIN_DAYS = 7;

/**
 * Perform housekeeping on backup directory:
 * 1. Clean up old safety backups (DB and attachments)
 * 2. Clean up temp restore directories
 */
export function performHousekeeping(dataDir: string) {
    try {
        console.log(`[Housekeeping] Starting cleanup`);

        // 1. Clean up old safety backups (DB in dataDir)
        cleanFilesByPattern(dataDir, /^workos\.restore-safety\.\d+\.db$/);

        // 2. Clean up attachments safety backups (in .workos-lite or sibling of attachments)
        // Usually .workos-lite/attachments.safety.<ts>
        const attachmentsParent = path.resolve(process.cwd(), ".workos-lite");
        cleanFilesByPattern(attachmentsParent, /^attachments\.safety\.\d+$/);

        // 3. Clean up any stale temp directories from previous failed restores
        cleanTempDirs();

        console.log("[Housekeeping] Completed");
    } catch (e) {
        console.error("[Housekeeping] Failed:", e);
        // Do not throw, housekeeping failure should not break the app
    }
}

function cleanFilesByPattern(dir: string, pattern: RegExp) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir)
        .filter(f => pattern.test(f))
        .map(f => ({
            name: f,
            path: path.join(dir, f),
            stat: fs.statSync(path.join(dir, f))
        }))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs); // Newest first

    const now = Date.now();
    const retainMs = RETAIN_DAYS * 24 * 60 * 60 * 1000;

    // Logic: Keep if (index < RETAIN_COUNT) OR (age < RETAIN_DAYS)
    // So delete if (index >= RETAIN_COUNT) AND (age >= RETAIN_DAYS)

    const toDelete = files.filter((f, index) => {
        const age = now - f.stat.mtimeMs;
        const keepByIndex = index < RETAIN_COUNT;
        const keepByAge = age < retainMs;

        return !keepByIndex && !keepByAge;
    });

    for (const f of toDelete) {
        try {
            if (f.stat.isDirectory()) {
                fs.rmSync(f.path, { recursive: true, force: true });
            } else {
                fs.unlinkSync(f.path);
            }
            console.log(`[Housekeeping] Deleted old backup: ${f.name}`);
        } catch (e) {
            console.error(`[Housekeeping] Failed to delete ${f.name}:`, e);
        }
    }
}

function cleanTempDirs() {
    // Pattern: .restore_tmp_<timestamp>
    // These should be empty or gone, but if process crashed they might remain

    // We need to scan process.cwd(), not strictly dataDir for these tmp folders based on restore implementation
    // restore route: const tmpDir = path.resolve(process.cwd(), `.restore_tmp_${ts}`);

    const rootDir = process.cwd();
    if (!fs.existsSync(rootDir)) return;

    const files = fs.readdirSync(rootDir)
        .filter(f => f.startsWith(".restore_tmp_"));

    const now = Date.now();
    const STALE_MS = 24 * 60 * 60 * 1000; // Consider stale if older than 24h (restore should be fast)

    for (const f of files) {
        try {
            const p = path.join(rootDir, f);
            const stat = fs.statSync(p);
            // Delete if older than 24h just to be safe we don't delete running restore
            if (now - stat.mtimeMs > STALE_MS) {
                fs.rmSync(p, { recursive: true, force: true });
                console.log(`[Housekeeping] Deleted stale temp dir: ${f}`);
            }
        } catch (e) {
            // ignore
        }
    }
}
