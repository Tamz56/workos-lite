import { z } from "zod";

// ============================================================
// V1 (New Standard Format) — uses nested meta/data structure
// ============================================================

export const BackupEnvelopeV1 = z.object({
    meta: z.object({
        app: z.literal("workos-lite"),
        schema_version: z.literal(1),
        exported_at: z.string().datetime(),
    }),
    data: z.object({
        tasks: z.array(z.unknown()).default([]),
        events: z.array(z.unknown()).default([]),
        docs: z.array(z.unknown()).default([]),
        attachments: z.array(z.unknown()).default([]),
    }),
});

export const MetadataEnvelopeV1 = z.object({
    meta: z.object({
        app: z.literal("workos-lite"),
        schema_version: z.literal(1),
        exported_at: z.string().datetime(),
        kind: z.literal("metadata"),
    }),
    data: z.object({
        tasks: z.array(z.unknown()).default([]),
        docs: z.array(z.unknown()).default([]),
        clips: z.array(z.unknown()).default([]),
    }),
});

// ============================================================
// Legacy Format — flat structure from existing exports
// version: "workos-lite-backup-v1"
// ============================================================

export const BackupLegacyEnvelope = z.object({
    version: z.literal("workos-lite-backup-v1"),
    exported_at: z.string(),
    tasks: z.array(z.unknown()).default([]),
    attachments: z.array(z.unknown()).default([]),
    docs: z.array(z.unknown()).default([]),
});

// ============================================================
// Type exports
// ============================================================

export type BackupEnvelopeV1T = z.infer<typeof BackupEnvelopeV1>;
export type MetadataEnvelopeV1T = z.infer<typeof MetadataEnvelopeV1>;
export type BackupLegacyEnvelopeT = z.infer<typeof BackupLegacyEnvelope>;

// ============================================================
// Helper to detect and parse any backup format
// ============================================================

export type ParsedBackup =
    | { format: "v1"; data: BackupEnvelopeV1T }
    | { format: "legacy"; data: BackupLegacyEnvelopeT }
    | { format: "metadata"; data: MetadataEnvelopeV1T };

export function parseBackupJson(json: unknown):
    | { ok: true; parsed: ParsedBackup }
    | { ok: false; errors: string[] } {

    // Check for metadata first (has meta.kind = "metadata")
    if (typeof json === "object" && json !== null) {
        const obj = json as Record<string, unknown>;

        // New V1 format with meta.kind = "metadata"
        if (obj.meta && typeof obj.meta === "object" && (obj.meta as Record<string, unknown>).kind === "metadata") {
            const result = MetadataEnvelopeV1.safeParse(json);
            if (result.success) {
                return { ok: true, parsed: { format: "metadata", data: result.data } };
            }
            return { ok: false, errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
        }

        // New V1 format with meta.app = "workos-lite"
        if (obj.meta && typeof obj.meta === "object") {
            const result = BackupEnvelopeV1.safeParse(json);
            if (result.success) {
                return { ok: true, parsed: { format: "v1", data: result.data } };
            }
            return { ok: false, errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
        }

        // Legacy format with version = "workos-lite-backup-v1"
        if (obj.version === "workos-lite-backup-v1") {
            const result = BackupLegacyEnvelope.safeParse(json);
            if (result.success) {
                return { ok: true, parsed: { format: "legacy", data: result.data } };
            }
            return { ok: false, errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
        }
    }

    return { ok: false, errors: ["Unrecognized backup format: expected meta.app or version field"] };
}
