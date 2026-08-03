import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
    ProjectDocBlocksEmptyState,
    ProjectDocBlocksReadOnlyActions,
    ProjectDocBlocksSourceStatus
} from "@/components/projects/ProjectDocBlocksSourceStatus";
import {
    createProjectDocBlocksRequestGuard,
    loadProjectDocBlocks,
    PROJECT_DOC_BLOCKS_STORAGE_KEY
} from "@/lib/project-doc-blocks/client";

const PROJECT_ID = "WniiRWTaGeEY7gt3XAsm7";
const PROJECT_SLUG = "workos-lite-arbordesk";
const OTHER_PROJECT_ID = "RciepxjtyZYQSA6pmKZ0f";
const OTHER_PROJECT_SLUG = "green-fineness-content";
const DETAILS = "## รายละเอียด\n\n```text\n  preserve spacing\n```\n";

function apiBlock(overrides: Record<string, unknown> = {}) {
    return {
        id: "block-1",
        projectId: PROJECT_ID,
        legacyProjectSlug: PROJECT_SLUG,
        type: "process_note",
        title: "บันทึกภาษาไทย",
        date: "2026-07-31",
        summary: "นำเข้าจาก Arbor Project Log",
        details: DETAILS,
        evidenceLinks: ["https://example.com/evidence"],
        relatedFiles: ["src/example.ts"],
        status: "active",
        createdAt: "2026-07-31T06:14:57.046Z",
        updatedAt: "2026-07-31T06:14:57.046Z",
        reviewedByUser: false,
        importSource: "localstorage_recovery",
        importBatchId: "batch-1",
        migratedAt: "2026-08-01T15:10:16.921Z",
        sourceRecordId: "block-1",
        sourceRowNumber: 1,
        ...overrides
    };
}

function localBlock(overrides: Record<string, unknown> = {}) {
    const { projectId: _projectId, legacyProjectSlug: _legacyProjectSlug, ...block } = apiBlock();
    void _projectId;
    void _legacyProjectSlug;
    return { ...block, projectSlug: PROJECT_SLUG, ...overrides };
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

function fetchResponse(body: unknown, status = 200) {
    return vi.fn(async () => jsonResponse(body, status)) as unknown as typeof fetch;
}

function createStorage(value: string | null) {
    return {
        getItem: vi.fn((key: string) => key === PROJECT_DOC_BLOCKS_STORAGE_KEY ? value : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
    };
}

function load(overrides: Partial<Parameters<typeof loadProjectDocBlocks>[0]> = {}) {
    return loadProjectDocBlocks({
        projectId: PROJECT_ID,
        projectSlug: PROJECT_SLUG,
        fetchImpl: fetchResponse([apiBlock()]),
        storage: createStorage(JSON.stringify([localBlock()])),
        ...overrides
    });
}

describe("Project Documentation API primary policy", () => {
    it("uses API records for a 200 response", async () => {
        const result = await load();
        expect(result.status).toBe("success");
        expect(result.source).toBe("api");
        expect(result.blocks.map(block => block.id)).toEqual(["block-1"]);
    });

    it("treats API 200 empty as authoritative", async () => {
        const storage = createStorage(JSON.stringify([localBlock()]));
        const result = await load({ fetchImpl: fetchResponse([]), storage });
        expect(result).toMatchObject({ status: "success", source: "api", blocks: [] });
        expect(storage.getItem).not.toHaveBeenCalled();
    });

    it("does not merge API and LocalStorage records", async () => {
        const storage = createStorage(JSON.stringify([localBlock({ id: "local-only" })]));
        const result = await load({ storage });
        expect(result.blocks.map(block => block.id)).toEqual(["block-1"]);
        expect(storage.getItem).not.toHaveBeenCalled();
    });

    it("uses the selected project ID in each request", async () => {
        const fetchImpl = fetchResponse([]);
        await load({ fetchImpl });
        await load({ projectId: OTHER_PROJECT_ID, projectSlug: OTHER_PROJECT_SLUG, fetchImpl });
        expect(fetchImpl.mock.calls[0][0]).toContain(PROJECT_ID);
        expect(fetchImpl.mock.calls[1][0]).toContain(OTHER_PROJECT_ID);
    });

    it("preserves Thai Unicode", async () => {
        const result = await load();
        expect(result.blocks[0].title).toBe("บันทึกภาษาไทย");
    });

    it("preserves Markdown details and whitespace", async () => {
        const result = await load();
        expect(result.blocks[0].details).toBe(DETAILS);
    });

    it("copies arrays without mutating the API payload", async () => {
        const record = apiBlock();
        const before = JSON.stringify(record);
        const result = await load({ fetchImpl: fetchResponse([record]) });
        expect(result.blocks[0].evidenceLinks).toEqual(record.evidenceLinks);
        expect(result.blocks[0].evidenceLinks).not.toBe(record.evidenceLinks);
        expect(JSON.stringify(record)).toBe(before);
    });

    it("preserves import metadata", async () => {
        const result = await load();
        expect(result.blocks[0]).toMatchObject({
            projectId: PROJECT_ID,
            legacyProjectSlug: PROJECT_SLUG,
            importSource: "localstorage_recovery",
            importBatchId: "batch-1",
            migratedAt: "2026-08-01T15:10:16.921Z",
            sourceRecordId: "block-1",
            sourceRowNumber: 1
        });
    });

    it("returns an explicit error for a malformed non-array API payload", async () => {
        const storage = createStorage(JSON.stringify([localBlock()]));
        const result = await load({ fetchImpl: fetchResponse({ blocks: [] }), storage });
        expect(result).toMatchObject({ status: "error", source: "api" });
        expect(storage.getItem).not.toHaveBeenCalled();
    });

    it("returns an explicit error for a malformed API record", async () => {
        const result = await load({ fetchImpl: fetchResponse([{ id: "broken" }]) });
        expect(result).toMatchObject({ status: "error", source: "api" });
    });

    it("returns an explicit error for invalid API JSON", async () => {
        const fetchImpl = vi.fn(async () => new Response("{invalid", { status: 200 })) as unknown as typeof fetch;
        const result = await load({ fetchImpl });
        expect(result).toMatchObject({ status: "error", source: "api" });
    });

    it("rejects an API record from another project", async () => {
        const result = await load({ fetchImpl: fetchResponse([apiBlock({ projectId: OTHER_PROJECT_ID })]) });
        expect(result).toMatchObject({ status: "error", source: "api" });
    });

    it("performs a read-only GET request", async () => {
        const fetchImpl = fetchResponse([]);
        await load({ fetchImpl });
        expect(fetchImpl).toHaveBeenCalledWith(
            `/api/projects/${PROJECT_ID}/doc-blocks?status=active`,
            expect.objectContaining({ cache: "no-store" })
        );
        expect(fetchImpl.mock.calls[0][1]?.method).toBeUndefined();
    });
});

describe("Project Documentation controlled fallback policy", () => {
    it("falls back on a network error", async () => {
        const fetchImpl = vi.fn(async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch;
        const result = await load({ fetchImpl });
        expect(result).toMatchObject({ status: "success", source: "fallback", fallbackReason: "network" });
    });

    it("falls back on a timeout", async () => {
        const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
        })) as unknown as typeof fetch;
        const result = await load({ fetchImpl, timeoutMs: 1 });
        expect(result).toMatchObject({ status: "success", source: "fallback", fallbackReason: "timeout" });
    });

    it.each([500, 503])("falls back on HTTP %s", async status => {
        const result = await load({ fetchImpl: fetchResponse({ error: "server" }, status) });
        expect(result).toMatchObject({ status: "success", source: "fallback", fallbackReason: "server" });
    });

    it.each([400, 401, 403, 404, 409])("does not fall back on HTTP %s", async status => {
        const storage = createStorage(JSON.stringify([localBlock()]));
        const result = await load({ fetchImpl: fetchResponse({ error: "request" }, status), storage });
        expect(result).toMatchObject({ status: "error", source: "api", httpStatus: status });
        expect(storage.getItem).not.toHaveBeenCalled();
    });

    it("filters valid fallback records by the selected legacy project slug", async () => {
        const records = [
            localBlock({ id: "workos" }),
            localBlock({ id: "green", projectSlug: OTHER_PROJECT_SLUG })
        ];
        const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
        const result = await load({ fetchImpl, storage: createStorage(JSON.stringify(records)) });
        expect(result.blocks.map(block => block.id)).toEqual(["workos"]);
    });

    it("returns an error for malformed LocalStorage JSON", async () => {
        const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
        const result = await load({ fetchImpl, storage: createStorage("{invalid") });
        expect(result).toMatchObject({ status: "error", source: "fallback" });
    });

    it("returns an error when the LocalStorage root is not an array", async () => {
        const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
        const result = await load({ fetchImpl, storage: createStorage(JSON.stringify({ block: localBlock() })) });
        expect(result).toMatchObject({ status: "error", source: "fallback" });
    });

    it("returns an error for a malformed LocalStorage record", async () => {
        const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
        const result = await load({ fetchImpl, storage: createStorage(JSON.stringify([{ id: "broken" }])) });
        expect(result).toMatchObject({ status: "error", source: "fallback" });
    });

    it("returns an empty fallback result when LocalStorage is missing", async () => {
        const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
        const result = await load({ fetchImpl, storage: createStorage(null) });
        expect(result).toMatchObject({ status: "success", source: "fallback", blocks: [] });
    });

    it("never writes, removes, or clears LocalStorage", async () => {
        const storage = createStorage(JSON.stringify([localBlock()]));
        const before = storage.getItem(PROJECT_DOC_BLOCKS_STORAGE_KEY);
        storage.getItem.mockClear();
        const fetchImpl = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
        await load({ fetchImpl, storage });
        expect(storage.setItem).not.toHaveBeenCalled();
        expect(storage.removeItem).not.toHaveBeenCalled();
        expect(storage.clear).not.toHaveBeenCalled();
        expect(storage.getItem(PROJECT_DOC_BLOCKS_STORAGE_KEY)).toBe(before);
    });

    it("does not merge fallback records with a failed API body", async () => {
        const result = await load({
            fetchImpl: fetchResponse([apiBlock({ id: "server-record" })], 503),
            storage: createStorage(JSON.stringify([localBlock({ id: "local-record" })]))
        });
        expect(result.blocks.map(block => block.id)).toEqual(["local-record"]);
    });
});

describe("Project Documentation request lifecycle", () => {
    it("aborts the previous request when the project changes", () => {
        const guard = createProjectDocBlocksRequestGuard();
        const first = guard.begin();
        guard.begin();
        expect(first.signal.aborted).toBe(true);
    });

    it("prevents a stale response from becoming current", () => {
        const guard = createProjectDocBlocksRequestGuard();
        const first = guard.begin();
        const second = guard.begin();
        expect(first.isCurrent()).toBe(false);
        expect(second.isCurrent()).toBe(true);
    });

    it("aborts and invalidates the current request on unmount cleanup", () => {
        const guard = createProjectDocBlocksRequestGuard();
        const ticket = guard.begin();
        guard.cancel();
        expect(ticket.signal.aborted).toBe(true);
        expect(ticket.isCurrent()).toBe(false);
    });
});

describe("Project Documentation read-only rendering", () => {
    it("renders the API source indicator", () => {
        const html = renderToStaticMarkup(<ProjectDocBlocksSourceStatus state={{ status: "ready", source: "api", blocks: [] }} />);
        expect(html).toContain("ข้อมูลจาก WorkOS Database");
    });

    it("renders the fallback warning", () => {
        const html = renderToStaticMarkup(<ProjectDocBlocksSourceStatus state={{ status: "ready", source: "fallback", blocks: [], fallbackReason: "network" }} />);
        expect(html).toContain("ข้อมูลสำรองจากเบราว์เซอร์");
    });

    it("renders loading and explicit error states", () => {
        const loading = renderToStaticMarkup(<ProjectDocBlocksSourceStatus state={{ status: "loading", source: null, blocks: [] }} />);
        const error = renderToStaticMarkup(<ProjectDocBlocksSourceStatus state={{ status: "error", source: "api", blocks: [], error: "โหลดไม่สำเร็จ" }} />);
        expect(loading).toContain("กำลังโหลด");
        expect(error).toContain("โหลดไม่สำเร็จ");
    });

    it("renders the authoritative empty state", () => {
        const html = renderToStaticMarkup(<ProjectDocBlocksEmptyState />);
        expect(html).toContain("ยังไม่มี Project Documentation ในโปรเจกต์นี้");
        expect(html).not.toContain("ข้อมูลสำรอง");
    });

    it("renders all write controls disabled", () => {
        const html = renderToStaticMarkup(<ProjectDocBlocksReadOnlyActions />);
        expect(html).toContain("Add Block");
        expect(html).toContain("Import Log");
        expect(html).toContain("Arbor Assistant");
        expect(html.match(/disabled=""/g)).toHaveLength(3);
    });
});
