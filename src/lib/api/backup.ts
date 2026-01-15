import type { ValidateRes } from "@/lib/backup/types";

/**
 * Normalize response to ensure all fields exist (defensive)
 */
function normalizeResponse(json: unknown): ValidateRes {
    const obj = (typeof json === "object" && json !== null ? json : {}) as Record<string, unknown>;

    return {
        ok: Boolean(obj.ok),
        kind: (obj.kind as ValidateRes["kind"]) ?? null,
        format: (obj.format as ValidateRes["format"]) ?? null,
        summary: obj.summary as ValidateRes["summary"] ?? null,
        warnings: Array.isArray(obj.warnings) ? obj.warnings : [],
        errors: Array.isArray(obj.errors) ? obj.errors : [],
    };
}

/**
 * Validate a backup file via /api/backup/validate
 * @param file - The file to validate (.json or .zip)
 * @param signal - AbortSignal for cancellation (handles race conditions)
 */
export async function validateBackup(
    file: File,
    signal?: AbortSignal
): Promise<ValidateRes> {
    const form = new FormData();
    form.append("file", file);

    try {
        const res = await fetch("/api/backup/validate", {
            method: "POST",
            body: form,
            signal,
        });

        const json = await res.json();
        return normalizeResponse(json);
    } catch (err) {
        // Handle abort
        if (err instanceof Error && err.name === "AbortError") {
            throw err; // Let caller handle abort
        }

        // Network or other error
        return {
            ok: false,
            kind: null,
            format: null,
            summary: null,
            warnings: [],
            errors: [err instanceof Error ? err.message : "Network error"],
        };
    }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ============================================================
// Restore API
// ============================================================

export type RestoreStage = "validate" | "safety_backup" | "transaction" | "attachments" | "postcheck";

export type RestoreRes = {
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

function normalizeRestoreResponse(json: unknown): RestoreRes {
    const obj = (typeof json === "object" && json !== null ? json : {}) as Record<string, unknown>;

    return {
        ok: Boolean(obj.ok),
        mode: "replace",
        kind: (obj.kind as RestoreRes["kind"]) ?? null,
        format: (obj.format as RestoreRes["format"]) ?? null,
        stage: (obj.stage as RestoreRes["stage"]) ?? null,
        restored: obj.restored as RestoreRes["restored"] ?? null,
        warnings: Array.isArray(obj.warnings) ? obj.warnings : [],
        errors: Array.isArray(obj.errors) ? obj.errors : [],
    };
}

/**
 * Restore a backup file via /api/backup/restore
 * @param file - The file to restore (.json or .zip)
 */
export async function restoreBackup(file: File): Promise<RestoreRes> {
    const form = new FormData();
    form.append("file", file);

    try {
        const res = await fetch("/api/backup/restore", {
            method: "POST",
            body: form,
        });

        const json = await res.json();
        return normalizeRestoreResponse(json);
    } catch (err) {
        return {
            ok: false,
            mode: "replace",
            kind: null,
            format: null,
            stage: null,
            restored: null,
            warnings: [],
            errors: [err instanceof Error ? err.message : "Network error"],
        };
    }
}

