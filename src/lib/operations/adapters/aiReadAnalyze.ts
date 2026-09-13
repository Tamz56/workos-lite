// ---------------------------------------------------------------------------
// ACC-P5-001 bounded AI read/analyze operation adapter.
// Control-plane only: strict inline-text Work Package, deterministic preview,
// no model invocation and no domain mutation.
// ---------------------------------------------------------------------------

import { OpsError } from "../errors";
import type { NormalizedAiReadAnalyzePayload } from "../types";

export const AI_READ_ANALYZE_OPERATION_TYPE = "ai.read_analyze" as const;
export const AI_READ_ANALYZE_CONTRACT_VERSION = "ai.read_analyze.v1" as const;
export const AI_READ_ANALYZE_ANALYSIS_MODE = "summary_findings_evidence" as const;
export const AI_READ_ANALYZE_PROVIDER = "openai" as const;
export const AI_READ_ANALYZE_MODEL = "gpt-5.6-terra" as const;
export const AI_READ_ANALYZE_DEEPSEEK_PROVIDER = "deepseek" as const;
export const AI_READ_ANALYZE_DEEPSEEK_MODEL = "deepseek-v4-flash" as const;

export const AI_READ_ANALYZE_OPENAI_PROFILE = {
    provider: AI_READ_ANALYZE_PROVIDER,
    model: AI_READ_ANALYZE_MODEL,
} as const;

export const AI_READ_ANALYZE_DEEPSEEK_PROFILE = {
    provider: AI_READ_ANALYZE_DEEPSEEK_PROVIDER,
    model: AI_READ_ANALYZE_DEEPSEEK_MODEL,
} as const;

export type AiReadAnalyzeProviderProfile =
    | typeof AI_READ_ANALYZE_OPENAI_PROFILE
    | typeof AI_READ_ANALYZE_DEEPSEEK_PROFILE;

export function resolveAiReadAnalyzeProviderProfile(raw: unknown): AiReadAnalyzeProviderProfile | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    if (obj.provider === AI_READ_ANALYZE_PROVIDER && obj.model === AI_READ_ANALYZE_MODEL) {
        return AI_READ_ANALYZE_OPENAI_PROFILE;
    }
    if (obj.provider === AI_READ_ANALYZE_DEEPSEEK_PROVIDER && obj.model === AI_READ_ANALYZE_DEEPSEEK_MODEL) {
        return AI_READ_ANALYZE_DEEPSEEK_PROFILE;
    }
    return null;
}

export function aiReadAnalyzeProfileFromPreview(preview: unknown): AiReadAnalyzeProviderProfile | null {
    if (!preview || typeof preview !== "object" || Array.isArray(preview)) return null;
    return resolveAiReadAnalyzeProviderProfile((preview as Record<string, unknown>).runtime);
}

export const AI_READ_ANALYZE_TIMEOUT_MS = 30_000;
export const AI_READ_ANALYZE_MAX_OUTPUT_TOKENS = 3_072;
export const AI_READ_ANALYZE_MAX_SOURCE_BYTES = 16_384;

const PAYLOAD_KEYS = new Set(["analysisMode", "sourceLabel", "sourceText"]);

function invalid(): never {
    throw new OpsError("OPS_INVALID_PAYLOAD", "Invalid ai.read_analyze payload", 400);
}

export function normalizeAiReadAnalyzePayload(raw: unknown): NormalizedAiReadAnalyzePayload {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) invalid();
    const obj = raw as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
        if (!PAYLOAD_KEYS.has(key)) invalid();
    }

    if (obj.analysisMode !== AI_READ_ANALYZE_ANALYSIS_MODE) invalid();
    if (typeof obj.sourceLabel !== "string" || typeof obj.sourceText !== "string") invalid();

    const sourceLabel = obj.sourceLabel.trim();
    if (sourceLabel.length < 1 || sourceLabel.length > 120) invalid();

    const sourceText = obj.sourceText.replace(/\r\n?/g, "\n");
    if (sourceText.includes("\0") || sourceText.trim().length === 0) invalid();
    if (Buffer.byteLength(sourceText, "utf8") > AI_READ_ANALYZE_MAX_SOURCE_BYTES) invalid();

    return {
        analysisMode: AI_READ_ANALYZE_ANALYSIS_MODE,
        sourceLabel,
        sourceText,
    };
}

export function buildAiReadAnalyzePreview(input: {
    targetRef: string;
    resolvedTargetId: string;
    payload: NormalizedAiReadAnalyzePayload;
    profile?: AiReadAnalyzeProviderProfile;
}) {
    const profile = input.profile ?? AI_READ_ANALYZE_DEEPSEEK_PROFILE;
    return {
        operationType: AI_READ_ANALYZE_OPERATION_TYPE,
        target: { type: "project" as const, ref: input.targetRef, resolvedId: input.resolvedTargetId },
        proposed: {
            action: "read_analyze" as const,
            entity: "inline_text" as const,
            fields: input.payload,
        },
        runtime: {
            provider: profile.provider,
            model: profile.model,
            tools: "NONE" as const,
            timeoutMs: AI_READ_ANALYZE_TIMEOUT_MS,
        },
        effects: {
            workosDomainMutation: "NONE" as const,
            filesystemMutation: "NONE" as const,
            arbitraryToolUse: "NONE" as const,
            arbitraryUrlFetch: "NONE" as const,
        },
    };
}
