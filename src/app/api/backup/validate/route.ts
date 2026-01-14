import { NextResponse } from "next/server";
import { parseBackupJson } from "@/lib/backup/schema";
import { validateZipStructure } from "@/lib/backup/zipUtils";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

// ============================================================
// Deterministic response shape (all keys always present)
// ============================================================
type ValidateResponse = {
    ok: boolean;
    kind: "backup" | "metadata" | "zip" | null;
    format: "v1" | "legacy" | "metadata" | null;
    summary: {
        tasks: number;
        events: number;
        docs: number;
        attachments: number;
        clips?: number;
    } | null;
    warnings: string[];
    errors: string[];
};

function errorResponse(
    errors: string[],
    kind: ValidateResponse["kind"] = null,
    warnings: string[] = [],
    status: number = 400
): Response {
    const body: ValidateResponse = {
        ok: false,
        kind,
        format: null,
        summary: null,
        warnings,
        errors,
    };
    return NextResponse.json(body, { status });
}

function successResponse(
    kind: ValidateResponse["kind"],
    format: ValidateResponse["format"],
    summary: NonNullable<ValidateResponse["summary"]>,
    warnings: string[]
): Response {
    const body: ValidateResponse = {
        ok: true,
        kind,
        format,
        summary,
        warnings,
        errors: [],
    };
    return NextResponse.json(body);
}

// ============================================================
// Summary builders (normalized - no undefined)
// ============================================================
function buildBackupSummary(tasks: unknown[], events: unknown[], docs: unknown[], attachments: unknown[]) {
    return {
        tasks: Array.isArray(tasks) ? tasks.length : 0,
        events: Array.isArray(events) ? events.length : 0,
        docs: Array.isArray(docs) ? docs.length : 0,
        attachments: Array.isArray(attachments) ? attachments.length : 0,
    };
}

function buildMetadataSummary(tasks: unknown[], docs: unknown[], clips: unknown[]) {
    return {
        tasks: Array.isArray(tasks) ? tasks.length : 0,
        events: 0,
        docs: Array.isArray(docs) ? docs.length : 0,
        attachments: 0,
        clips: Array.isArray(clips) ? clips.length : 0,
    };
}

// ============================================================
// POST /api/backup/validate
// ============================================================
export async function POST(req: Request) {
    try {
        const ct = req.headers.get("content-type") || "";
        if (!ct.includes("multipart/form-data")) {
            return errorResponse(["Expected multipart/form-data upload"]);
        }

        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
            return errorResponse(["Missing required field: file"]);
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return errorResponse(
                [`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum 200MB`],
                null,
                [],
                413
            );
        }

        const name = (file.name || "").toLowerCase();

        // ==================== JSON ====================
        if (name.endsWith(".json")) {
            const text = await file.text();
            let json: unknown;
            try {
                json = JSON.parse(text);
            } catch {
                return errorResponse(["Invalid JSON: file content is not valid JSON format"], "backup");
            }

            const parsed = parseBackupJson(json);
            if (!parsed.ok) {
                return errorResponse(parsed.errors, "backup");
            }

            const { format, data } = parsed.parsed;

            if (format === "metadata") {
                const d = data.data;
                return successResponse(
                    "metadata",
                    "metadata",
                    buildMetadataSummary(d.tasks, d.docs, d.clips),
                    []
                );
            }

            if (format === "legacy") {
                return successResponse(
                    "backup",
                    "legacy",
                    buildBackupSummary(data.tasks, [], data.docs, data.attachments),
                    []
                );
            }

            // v1 format
            const d = data.data;
            return successResponse(
                "backup",
                "v1",
                buildBackupSummary(d.tasks, d.events, d.docs, d.attachments),
                []
            );
        }

        // ==================== ZIP ====================
        if (name.endsWith(".zip")) {
            const ab = await file.arrayBuffer();
            const buf = Buffer.from(ab);

            const zipRes = await validateZipStructure(buf);
            if (!zipRes.ok) {
                return errorResponse(zipRes.errors, "zip", zipRes.warnings);
            }

            // Validate embedded backup.json
            let json: unknown;
            try {
                json = JSON.parse(zipRes.backupJsonText || "");
            } catch {
                return errorResponse(
                    ["Invalid JSON: backup.json inside ZIP is not valid JSON format"],
                    "zip",
                    zipRes.warnings
                );
            }

            const parsed = parseBackupJson(json);
            if (!parsed.ok) {
                return errorResponse(parsed.errors, "zip", zipRes.warnings);
            }

            const { format, data } = parsed.parsed;
            let summary: NonNullable<ValidateResponse["summary"]>;

            if (format === "legacy") {
                summary = buildBackupSummary(data.tasks, [], data.docs, data.attachments);
            } else if (format === "v1") {
                const d = data.data;
                summary = buildBackupSummary(d.tasks, d.events, d.docs, d.attachments);
            } else {
                // metadata in ZIP (unusual but handle gracefully)
                const d = (data as any).data;
                summary = buildMetadataSummary(d?.tasks || [], d?.docs || [], d?.clips || []);
            }

            const warnings = [...zipRes.warnings];
            warnings.push(
                `ZIP stats: ${zipRes.entryCount} entries, ${(zipRes.totalUncompressed / 1024 / 1024).toFixed(1)}MB uncompressed`
            );

            return successResponse("zip", format, summary, warnings);
        }

        // ==================== Unsupported ====================
        return errorResponse(["Unsupported file type: only .json or .zip files are accepted"]);

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown server error";
        return errorResponse([message], null, [], 500);
    }
}
