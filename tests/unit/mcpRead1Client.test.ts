import { describe, expect, it, vi } from "vitest";
import { Read1Client } from "@/lib/mcp/read1Client";

const FINGERPRINT = "c".repeat(64);
const PASSWORD = "server-only-read-password";
const FULL_TEXT = "A".repeat(30_000) + "B".repeat(13_618);

function indexPage() {
    return {
        schemaVersion: "ai-read-source-index.v1",
        project: { id: "project-1", slug: "allowed-project", name: "Allowed Project" },
        counts: {
            project_metadata: 0,
            doc_block: 0,
            doc: 1,
            decision: 0,
            project_context: 0,
            loop: 0,
        },
        sources: [{
            sourceKind: "doc",
            sourceId: "doc-large",
            title: "Large Document",
            sourceType: "document",
            status: "active",
            hasFullContent: true,
            isDerivedContext: false,
        }],
        pagination: {
            pageSize: 200,
            returnedSources: 1,
            totalSources: 1,
            hasMore: false,
            nextCursor: null,
        },
        corpusFingerprint: FINGERPRINT,
        attachmentReadingSupported: false,
    };
}

function chunk(offset: number) {
    const content = FULL_TEXT.slice(offset, offset + 30_000);
    const nextOffset = offset + content.length;
    return {
        schemaVersion: "ai-read-source-read.v1",
        project: { id: "project-1", slug: "allowed-project", name: "Allowed Project" },
        ref: { sourceKind: "doc", sourceId: "doc-large" },
        title: "Large Document",
        metadata: {
            sourceKind: "doc",
            sourceId: "doc-large",
            status: "active",
            sourceType: "document",
            isDerivedContext: false,
        },
        content,
        chunk: {
            offset,
            includedChars: content.length,
            totalCharacterCount: FULL_TEXT.length,
            nextOffset,
            hasMore: nextOffset < FULL_TEXT.length,
        },
    };
}

describe("READ1B internal READ1 client", () => {
    it("walks every index page with the first-page corpus fingerprint", async () => {
        const urls: string[] = [];
        const base = indexPage();
        base.counts.doc = 2;
        base.pagination.returnedSources = 1;
        base.pagination.totalSources = 2;
        base.pagination.hasMore = true;
        base.pagination.nextCursor = "next-page";
        const second = structuredClone(base);
        second.sources = [{ ...base.sources[0], sourceId: "doc-second", title: "Second Document" }];
        second.pagination.hasMore = false;
        second.pagination.nextCursor = null;

        const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
            const url = input.toString();
            urls.push(url);
            return Response.json(url.includes("cursor=next-page") ? second : base);
        });
        const client = new Read1Client(
            { internalOrigin: "http://127.0.0.1:3100", readPassword: PASSWORD },
            fetchFn as typeof fetch,
        );
        const output = await client.enumerateProject("allowed-project");
        expect(output.sources.map((entry) => entry.sourceId)).toEqual(["doc-large", "doc-second"]);
        expect(urls).toHaveLength(2);
        expect(urls[1]).toContain(`expectedCorpusFingerprint=${FINGERPRINT}`);
    });

    it("enumerates the fingerprint and consumes every 30k chunk without exposing its credential", async () => {
        const requests: Array<{ url: string; password: string | null; body?: string }> = [];
        const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input.toString();
            const headers = new Headers(init?.headers);
            requests.push({ url, password: headers.get("x-agent-password"), body: init?.body?.toString() });
            if (url.endsWith("/sources/read")) {
                const body = JSON.parse(String(init?.body)) as { offset: number };
                return Response.json(chunk(body.offset));
            }
            return Response.json(indexPage());
        });
        const client = new Read1Client(
            { internalOrigin: "http://127.0.0.1:3100", readPassword: PASSWORD },
            fetchFn as typeof fetch,
        );
        const output = await client.readCompleteSource(
            "allowed-project",
            { sourceKind: "doc", sourceId: "doc-large" },
            FINGERPRINT,
        );

        expect(output.text).toBe(FULL_TEXT);
        expect(output.totalCharacterCount).toBe(43_618);
        expect(output.chunkCount).toBe(2);
        expect(requests.filter((entry) => entry.url.endsWith("/sources/read"))).toHaveLength(2);
        expect(requests.every((entry) => entry.password === PASSWORD)).toBe(true);
        expect(requests.every((entry) => !entry.url.includes(PASSWORD))).toBe(true);
        expect(JSON.stringify(output)).not.toContain(PASSWORD);
    });

    it("fails explicitly when READ1 chunks are not contiguous", async () => {
        const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
            if (input.toString().endsWith("/sources/read")) {
                const invalid = chunk(0);
                invalid.chunk.nextOffset = 29_999;
                return Response.json(invalid);
            }
            return Response.json(indexPage());
        });
        const client = new Read1Client(
            { internalOrigin: "http://127.0.0.1:3100", readPassword: PASSWORD },
            fetchFn as typeof fetch,
        );
        await expect(client.readCompleteSource(
            "allowed-project",
            { sourceKind: "doc", sourceId: "doc-large" },
            FINGERPRINT,
        )).rejects.toMatchObject({ code: "INCOMPLETE_SOURCE" });
    });

    it("rejects a corpus fingerprint change detected after all source chunks", async () => {
        let indexRequestCount = 0;
        const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            if (input.toString().endsWith("/sources/read")) {
                const body = JSON.parse(String(init?.body)) as { offset: number };
                return Response.json(chunk(body.offset));
            }
            indexRequestCount += 1;
            const page = indexPage();
            if (indexRequestCount === 2) page.corpusFingerprint = "e".repeat(64);
            return Response.json(page);
        });
        const client = new Read1Client(
            { internalOrigin: "http://127.0.0.1:3100", readPassword: PASSWORD },
            fetchFn as typeof fetch,
        );

        await expect(client.readCompleteSource(
            "allowed-project",
            { sourceKind: "doc", sourceId: "doc-large" },
            FINGERPRINT,
        )).rejects.toMatchObject({ code: "STALE_CORPUS" });
        expect(indexRequestCount).toBe(2);
    });
});
