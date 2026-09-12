import { afterEach, describe, expect, it, vi } from "vitest";
import {
    AI_READ_ANALYZE_JSON_SCHEMA,
    AiRuntimeError,
    runOpenAiReadAnalyze,
} from "@/lib/ai/openaiReadAnalyze";

const payload = {
    analysisMode: "summary_findings_evidence" as const,
    sourceLabel: "Source A",
    sourceText: "Alpha beta",
};
const valid = { summary: "Summary", findings: ["Finding"], evidence: ["Evidence"], limitations: [] };

function responseFor(value: unknown): Response {
    return new Response(JSON.stringify({
        output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }],
    }), { status: 200, headers: { "content-type": "application/json" } });
}

function runtimeCode(error: unknown): string | undefined {
    return error instanceof AiRuntimeError ? error.code : undefined;
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("ACC-P5-001 OpenAI runtime adapter", () => {
    it("fails closed before fetch when credential is not configured", async () => {
        const fetchImpl = vi.fn();
        await expect(runOpenAiReadAnalyze(payload, { apiKey: null, fetchImpl })).rejects.toSatisfy(
            (error: unknown) => runtimeCode(error) === "AI_NOT_CONFIGURED",
        );
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("uses exactly one Responses request with frozen model, no tools, no storage and strict schema", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(responseFor(valid));
        await expect(runOpenAiReadAnalyze(payload, { apiKey: "test-key", fetchImpl })).resolves.toEqual(valid);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://api.openai.com/v1/responses");
        const request = JSON.parse(String(init.body)) as Record<string, any>;
        expect(request.model).toBe("gpt-5.6-terra");
        expect(request.store).toBe(false);
        expect(request.max_output_tokens).toBe(3072);
        expect(request.reasoning).toEqual({ effort: "low" });
        expect(request.tools).toBeUndefined();
        expect(request.text.format).toEqual({
            type: "json_schema",
            name: "workos_read_analyze_result",
            strict: true,
            schema: AI_READ_ANALYZE_JSON_SCHEMA,
        });
        expect(JSON.stringify(request.input)).toContain("untrusted data");
    });

    it("rejects malformed or schema-invalid provider output", async () => {
        const malformed = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            output: [{ content: [{ type: "output_text", text: "not-json" }] }],
        }), { status: 200 }));
        await expect(runOpenAiReadAnalyze(payload, { apiKey: "test-key", fetchImpl: malformed })).rejects.toSatisfy(
            (error: unknown) => runtimeCode(error) === "AI_RESULT_INVALID",
        );

        const invalid = vi.fn().mockResolvedValue(responseFor({ ...valid, unexpected: true }));
        await expect(runOpenAiReadAnalyze(payload, { apiKey: "test-key", fetchImpl: invalid })).rejects.toSatisfy(
            (error: unknown) => runtimeCode(error) === "AI_RESULT_INVALID",
        );
    });

    it("aborts at the bounded timeout", async () => {
        vi.useFakeTimers();
        const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }));
        const pending = runOpenAiReadAnalyze(payload, { apiKey: "test-key", fetchImpl: fetchImpl as typeof fetch, timeoutMs: 1000 });
        // Attach the rejection observer before advancing fake timers so Vitest/Node
        // never observes the bounded timeout rejection as temporarily unhandled.
        const timeoutAssertion = expect(pending).rejects.toSatisfy(
            (error: unknown) => runtimeCode(error) === "AI_TIMEOUT",
        );
        await vi.advanceTimersByTimeAsync(1000);
        await timeoutAssertion;
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
