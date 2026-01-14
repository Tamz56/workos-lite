import yauzl from "yauzl";

export const ZIP_LIMITS = {
    MAX_ENTRIES: 5000,
    MAX_UNCOMPRESSED_BYTES: 1 * 1024 * 1024 * 1024, // 1GB
    BACKUP_JSON_WARN_BYTES: 50 * 1024 * 1024,       // 50MB - warning
    BACKUP_JSON_MAX_BYTES: 150 * 1024 * 1024,       // 150MB - error
};

export type ZipValidateResult = {
    ok: boolean;
    errors: string[];
    warnings: string[];
    entryCount: number;
    totalUncompressed: number;
    hasBackupJson: boolean;
    backupJsonText?: string;
    backupJsonSize: number;
};

function normalizeZipPath(p: string) {
    // ZIP standard uses forward slashes; normalize backslashes defensively
    return p.replace(/\\/g, "/");
}

export function isPathSafe(zipPath: string) {
    const p = normalizeZipPath(zipPath);

    // no absolute paths, no drive letters, no traversal
    if (p.startsWith("/") || /^[A-Za-z]:\//.test(p)) return false;
    if (p.includes("\0")) return false;

    const parts = p.split("/");
    if (parts.some((x) => x === "..")) return false;

    return true;
}

function isAllowedEntry(p: string) {
    const n = normalizeZipPath(p);

    // allow directories (end with /) only if within attachments/
    if (n.endsWith("/")) return n === "attachments/" || n.startsWith("attachments/");

    // allow backup.json at root only (exactly "backup.json", not "./backup.json" or "folder/backup.json")
    if (n === "backup.json") return true;

    // allow attachments subtree only
    if (n.startsWith("attachments/")) return true;

    return false;
}

function readEntryText(zip: yauzl.ZipFile, entry: yauzl.Entry): Promise<string> {
    return new Promise((resolve, reject) => {
        zip.openReadStream(entry, (err, stream) => {
            if (err || !stream) return reject(err || new Error("Failed to open ZIP stream"));
            const chunks: Buffer[] = [];
            stream.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            stream.on("error", reject);
        });
    });
}

export async function validateZipStructure(zipBuffer: Buffer): Promise<ZipValidateResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    let entryCount = 0;
    let totalUncompressed = 0;
    let backupJsonCount = 0;
    let backupJsonText: string | undefined;
    let backupJsonSize = 0;

    const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => {
        yauzl.fromBuffer(zipBuffer, { lazyEntries: true, validateEntrySizes: true }, (err, zf) => {
            if (err || !zf) return reject(err || new Error("Invalid ZIP file"));
            resolve(zf);
        });
    });

    const done = new Promise<void>((resolve, reject) => {
        zip.readEntry();

        zip.on("entry", async (entry: yauzl.Entry) => {
            try {
                entryCount += 1;
                if (entryCount > ZIP_LIMITS.MAX_ENTRIES) {
                    errors.push(`ZIP safety violation: too many entries (>${ZIP_LIMITS.MAX_ENTRIES})`);
                    zip.close();
                    return resolve();
                }

                const fileName = normalizeZipPath(entry.fileName);

                // Zip slip check
                if (!isPathSafe(fileName)) {
                    errors.push(`ZIP safety violation: path traversal detected in "${fileName}"`);
                    zip.readEntry();
                    return;
                }

                // Allowlist check
                if (!isAllowedEntry(fileName)) {
                    errors.push(`ZIP safety violation: disallowed entry "${fileName}" (only backup.json and attachments/** allowed)`);
                    zip.readEntry();
                    return;
                }

                // Accumulate total uncompressed size
                totalUncompressed += entry.uncompressedSize || 0;
                if (totalUncompressed > ZIP_LIMITS.MAX_UNCOMPRESSED_BYTES) {
                    errors.push(`ZIP safety violation: total uncompressed size exceeds ${(ZIP_LIMITS.MAX_UNCOMPRESSED_BYTES / 1024 / 1024).toFixed(0)}MB`);
                    zip.close();
                    return resolve();
                }

                // Check for backup.json at root
                if (fileName === "backup.json" && !fileName.endsWith("/")) {
                    backupJsonCount += 1;
                    backupJsonSize = entry.uncompressedSize || 0;

                    // Duplicate backup.json check
                    if (backupJsonCount > 1) {
                        errors.push("ZIP invalid: duplicate backup.json found (must be exactly 1)");
                        zip.readEntry();
                        return;
                    }

                    // Size guard for backup.json
                    if (backupJsonSize > ZIP_LIMITS.BACKUP_JSON_MAX_BYTES) {
                        errors.push(`ZIP invalid: backup.json too large (${(backupJsonSize / 1024 / 1024).toFixed(1)}MB, max ${(ZIP_LIMITS.BACKUP_JSON_MAX_BYTES / 1024 / 1024).toFixed(0)}MB)`);
                        zip.readEntry();
                        return;
                    }
                    if (backupJsonSize > ZIP_LIMITS.BACKUP_JSON_WARN_BYTES) {
                        warnings.push(`backup.json is large (${(backupJsonSize / 1024 / 1024).toFixed(1)}MB). Validation may be slower.`);
                    }

                    backupJsonText = await readEntryText(zip, entry);
                }

                zip.readEntry();
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "ZIP validation error";
                errors.push(msg);
                try {
                    zip.close();
                } catch { }
                resolve();
            }
        });

        zip.on("end", () => resolve());
        zip.on("error", (e) => reject(e));
    });

    await done;

    // Must have exactly 1 backup.json at root
    if (backupJsonCount === 0) {
        errors.push("ZIP invalid: missing required file backup.json at root");
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        entryCount,
        totalUncompressed,
        hasBackupJson: backupJsonCount === 1,
        backupJsonText,
        backupJsonSize,
    };
}
