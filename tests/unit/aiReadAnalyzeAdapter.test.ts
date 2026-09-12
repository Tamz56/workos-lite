import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { OpsError } from "@/lib/operations/errors";
import {
    AI_READ_ANALYZE_MAX_SOURCE_BYTES,
    buildAiReadAnalyzePreview,
    normalizeAiReadAnalyzePayload,
} from "@/lib/operations/adapters/aiReadAnalyze";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";

function code(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected OpsError");
    } catch (error) {
        if (error instanceof OpsError) return error.code;
        throw error;
    }
}

function db(): Database.Database {
    const d = new Database(":memory:");
    d.exec(OPERATIONS_SCHEMA_SQL);
    d.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    d.prepare("INSERT INTO projects (id, slug) VALUES (?,?)").run("p1", "project-a");
    return d;
}

const principal: AgentPrincipal = { actorId: "agent-1", actorName: "Agent", scopes: ["operations:request"] };

function body(sourceText = "Alpha\r\nBeta", idempotencyKey?: string) {
    return {
        operationType: "ai.read_analyze",
        targetType: "project",
        targetRef: "project-a",
        payload: {
            analysisMode: "summary_findings_evidence",
            sourceLabel: "  Source A  ",
            sourceText,
        },
        ...(idempotencyKey ? { idempotencyKey } : {}),
    };
}

describe("ACC-P5-001 Work Package adapter", () => {
    it("normalizes label/newlines and builds the frozen deterministic preview", () => {
        const payload = normalizeAiReadAnalyzePayload(body().payload);
        expect(payload).toEqual({
            analysisMode: "summary_findings_evidence",
            sourceLabel: "Source A",
            sourceText: "Alpha\nBeta",
        });
        const preview = buildAiReadAnalyzePreview({ targetRef: "project-a", resolvedTargetId: "p1", payload });
        expect(preview.runtime).toEqual({ provider: "openai", model: "gpt-5.6-terra", tools: "NONE", timeoutMs: 30000 });
        expect(preview.effects.workosDomainMutation).toBe("NONE");
    });

    it("rejects unknown fields, unapproved modes, empty/NUL input and >16KiB UTF-8", () => {
        const base = body().payload as Record<string, unknown>;
        expect(code(() => normalizeAiReadAnalyzePayload({ ...base, prompt: "x" }))).toBe("OPS_INVALID_PAYLOAD");
        expect(code(() => normalizeAiReadAnalyzePayload({ ...base, analysisMode: "freeform" }))).toBe("OPS_INVALID_PAYLOAD");
        expect(code(() => normalizeAiReadAnalyzePayload({ ...base, sourceText: "  " }))).toBe("OPS_INVALID_PAYLOAD");
        expect(code(() => normalizeAiReadAnalyzePayload({ ...base, sourceText: "x\0y" }))).toBe("OPS_INVALID_PAYLOAD");
        expect(code(() => normalizeAiReadAnalyzePayload({ ...base, sourceText: "a".repeat(AI_READ_ANALYZE_MAX_SOURCE_BYTES + 1) }))).toBe("OPS_INVALID_PAYLOAD");
    });

    it("persists contract/hash/preview and keeps idempotency deterministic", () => {
        const d = db();
        const first = createOperation(d, principal, body("hello", "same-key"));
        const replay = createOperation(d, principal, body("hello", "same-key"));
        expect(replay.id).toBe(first.id);
        expect(first.contractVersion).toBe("ai.read_analyze.v1");
        expect(first.payloadHash).toBe(replay.payloadHash);
        expect(first.previewFingerprint).toBe(replay.previewFingerprint);
        expect((first.preview as { runtime: { model: string } }).runtime.model).toBe("gpt-5.6-terra");
        expect(code(() => createOperation(d, principal, body("different", "same-key")))).toBe("OPS_IDEMPOTENCY_CONFLICT");
        d.close();
    });
});
