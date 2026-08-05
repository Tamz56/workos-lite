// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Dry-run upload application service
// WORKOS-SHEET-GATE-5
// ---------------------------------------------------------------------------

import path from "path";
import type Database from "better-sqlite3";
import { getDb } from "@/db/db";
import { runWorkOSProjectFieldDryRun } from "./dryRunAssembler";
import { openReadOnlyWorkosDatabase } from "./readOnlyAdapter";
import { persistWorkOSProjectFieldDryRun, sanitizeSourceFilename } from "./auditPersistenceService";
import { ProjectImportApiError } from "./apiErrors";
import { serializeDryRunResponse } from "./apiSerialization";
import type { CreateDryRunApiResponse } from "./apiTypes";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS = new Set(["xlsx"]);

export type DryRunServiceDeps = {
    readDb?: Database.Database;
    writeDb?: Database.Database;
};

export async function readWorkbookUpload(file: File): Promise<{ buffer: Buffer; filename: string; size: number; mimeType: string }> {
    const filename = file.name ?? "";
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
        throw new ProjectImportApiError("UNSUPPORTED_FILE_TYPE", "Only .xlsx workbooks are supported", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new ProjectImportApiError("FILE_TOO_LARGE", "Workbook exceeds the 25 MB limit", 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    return { buffer, filename, size: file.size, mimeType: file.type || "application/octet-stream" };
}

export async function createDryRunFromUpload(
    file: File,
    deps: DryRunServiceDeps = {},
): Promise<CreateDryRunApiResponse> {
    const upload = await readWorkbookUpload(file);
    const readDb = deps.readDb ?? openReadOnlyWorkosDatabase(path.resolve(process.cwd(), "data/workos.db"));
    const writeDb = deps.writeDb ?? getDb();

    let result;
    try {
        result = await runWorkOSProjectFieldDryRun(
            { workbook: upload.buffer, sourceFilename: upload.filename },
            { db: readDb },
        );
    } catch {
        throw new ProjectImportApiError("WORKBOOK_PARSE_FAILED", "Workbook could not be parsed", 400);
    }

    const fileLevelFailure = result.workbookIssues.some(
        (issue) => issue.severity === "error" && issue.scope === "file",
    );
    if (fileLevelFailure) {
        // Corrupted/unreadable binary content is not persisted beyond safe failure metadata.
        throw new ProjectImportApiError("WORKBOOK_PARSE_FAILED", "Workbook could not be parsed", 400);
    }

    let persisted;
    try {
        persisted = persistWorkOSProjectFieldDryRun(writeDb, result, {
            sourceFilename: upload.filename,
            sourceFileSize: upload.size,
            sourceMimeType: upload.mimeType,
        });
    } catch (error) {
        if (error instanceof ProjectImportApiError) throw error;
        throw new ProjectImportApiError("IMPORT_BATCH_PERSISTENCE_FAILED", "Dry run could not be persisted", 500);
    }

    return serializeDryRunResponse(persisted, result, {
        filename: upload.filename,
        sanitizedFilename: sanitizeSourceFilename(upload.filename),
        fileSize: upload.size,
        mimeType: upload.mimeType,
    });
}
