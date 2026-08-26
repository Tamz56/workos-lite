import { describe, expect, it, vi } from "vitest";
import { McpBridgeError } from "@/lib/mcp/errors";
import type { CompleteProjectIndex, CompleteSource, Read1SourceEntry } from "@/lib/mcp/read1Client";
import {
    ProjectMemoryService,
    REGISTRY_INDEX_MAX_SERIALIZED_BYTES,
    REGISTRY_PAGE_MAX_SERIALIZED_BYTES,
    REGISTRY_PAGE_SIZE,
    SEARCH_RESULT_LIMIT,
    type ProjectMemoryReadClient,
} from "@/lib/mcp/projectMemoryService";
import {
    decodeResultId,
    encodeRegistryIndexId,
    encodeRegistryPageId,
    encodeSourceId,
} from "@/lib/mcp/resultIds";

const FINGERPRINT = "a".repeat(64);
const OTHER_FINGERPRINT = "b".repeat(64);
const PILOT_FINGERPRINT = "b0a516c2714c18586468a306816a2a62f11d6df69aacbaeb567252237c595394";

function source(
    sourceId: string,
    title: string,
    overrides: Partial<Read1SourceEntry> = {},
): Read1SourceEntry {
    return {
        sourceKind: "doc",
        sourceId,
        title,
        sourceType: "document",
        status: "active",
        summary: null,
        nextAction: null,
        hasFullContent: true,
        isDerivedContext: false,
        ...overrides,
    };
}

/** CTX3-I2E snapshot fixture — derived working memory, never canonical. */
function snapshotSource(sourceId: string, overrides: Partial<Read1SourceEntry> = {}): Read1SourceEntry {
    return {
        sourceKind: "project_context_snapshot",
        sourceId,
        title: "Project Context Snapshot",
        sourceType: null,
        status: "PUBLISHED",
        summary: null,
        nextAction: null,
        hasFullContent: true,
        isDerivedContext: true,
        snapshotMetadata: {
            schemaVersion: "project-context.v1",
            generatedFromFingerprint: "b".repeat(64),
            publishedCorpusFingerprint: FINGERPRINT,
            generatedAt: "2026-08-20T00:00:00.000Z",
            approvedAt: "2026-08-20T00:00:00.000Z",
        },
        ...overrides,
    };
}

function index(sources: Read1SourceEntry[] = [
    source("doc-1", "Architecture Notes"),
    source("doc-2", "Duplicate title"),
    source("doc-3", "Duplicate title"),
    source("context-1", "Project Context", {
        sourceKind: "project_context",
        isDerivedContext: true,
    }),
], fingerprint = FINGERPRINT): CompleteProjectIndex {
    const counts = {
        project_metadata: sources.filter((entry) => entry.sourceKind === "project_metadata").length,
        doc_block: sources.filter((entry) => entry.sourceKind === "doc_block").length,
        doc: sources.filter((entry) => entry.sourceKind === "doc").length,
        decision: sources.filter((entry) => entry.sourceKind === "decision").length,
        project_context: sources.filter((entry) => entry.sourceKind === "project_context").length,
        loop: sources.filter((entry) => entry.sourceKind === "loop").length,
        project_context_snapshot: sources.filter((entry) => entry.sourceKind === "project_context_snapshot").length,
    };
    return {
        project: { id: "project-1", slug: "allowed-project", name: "Allowed Project", status: "active" },
        counts,
        sources,
        corpusFingerprint: fingerprint,
        attachmentReadingSupported: false,
    };
}

function pilotIndex(): CompleteProjectIndex {
    const sources: Read1SourceEntry[] = [];
    const add = (kind: Read1SourceEntry["sourceKind"], count: number): void => {
        for (let position = 1; position <= count; position += 1) {
            sources.push(source(`${kind}-${position}`, `${kind} source ${position}`, { sourceKind: kind }));
        }
    };
    add("project_metadata", 1);
    add("doc_block", 13);
    add("doc", 24);
    add("decision", 7);
    add("project_context", 1);
    return index(sources, PILOT_FINGERPRINT);
}

function serializedBytes(value: unknown): number {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function client(projectIndex = index(), fullText = "canonical source text"): ProjectMemoryReadClient {
    return {
        enumerateProject: vi.fn(async (slug: string, expected?: string) => {
            if (slug !== projectIndex.project.slug) {
                throw new McpBridgeError("READ1_REQUEST_FAILED", "The read-only source request failed");
            }
            if (expected && expected !== projectIndex.corpusFingerprint) {
                throw new McpBridgeError("STALE_CORPUS", "The Project corpus changed; search again");
            }
            return projectIndex;
        }),
        readCompleteSource: vi.fn(async (_slug, ref): Promise<CompleteSource> => ({
            title: projectIndex.sources.find(
                (entry) => entry.sourceKind === ref.sourceKind && entry.sourceId === ref.sourceId,
            )?.title ?? "Unknown",
            text: fullText,
            status: ref.sourceKind === "project_context_snapshot" ? "PUBLISHED" : "active",
            sourceType: ref.sourceKind === "project_context_snapshot" ? null : "document",
            isDerivedContext:
                ref.sourceKind === "project_context" || ref.sourceKind === "project_context_snapshot",
            totalCharacterCount: fullText.length,
            chunkCount: fullText.length > 30_000 ? 2 : 1,
        })),
    };
}

describe("READ1B Project Memory search", () => {
    it("fails closed to zero Project exposure when the allowlist is missing", async () => {
        const read1 = client();
        const service = new ProjectMemoryService(read1, []);
        expect(await service.search("Allowed Project")).toEqual({ results: [] });
        expect(read1.enumerateProject).not.toHaveBeenCalled();
    });

    it.each(["Allowed Project", "allowed-project"])(
        "returns the manifest first for exact Project query %s",
        async (query) => {
            const service = new ProjectMemoryService(client(), ["allowed-project"]);
            const output = await service.search(query);
            expect(decodeResultId(output.results[0].id)).toMatchObject({
                type: "manifest",
                projectSlug: "allowed-project",
                corpusFingerprint: FINGERPRINT,
            });
            expect(output.results[0].url).toMatch(/^https:\/\/workos\.greenfineness\.com\/projects\//);
        },
    );

    it.each(["allowed-project", "Project Source Registry"])(
        "makes the bounded registry index discoverable through search query %s",
        async (query) => {
            const service = new ProjectMemoryService(client(), ["allowed-project"]);
            const output = await service.search(query);
            const registry = output.results.find((result) => decodeResultId(result.id).type === "registry_index");
            expect(registry?.title).toBe("Allowed Project — Project Source Registry");
            expect(decodeResultId(registry!.id)).toMatchObject({
                type: "registry_index",
                projectSlug: "allowed-project",
                corpusFingerprint: FINGERPRINT,
            });
        },
    );

    it("finds source titles deterministically and preserves duplicate titles as distinct IDs", async () => {
        const service = new ProjectMemoryService(client(), ["allowed-project"]);
        const first = await service.search("Duplicate title");
        const second = await service.search("Duplicate title");
        expect(second).toEqual(first);
        const duplicates = first.results.filter((result) => result.title === "Duplicate title");
        expect(duplicates).toHaveLength(2);
        expect(new Set(duplicates.map((result) => result.id)).size).toBe(2);
    });

    it("bounds results and has deterministic empty-query behavior", async () => {
        const manySources = Array.from({ length: 30 }, (_, i) => source(`doc-${i}`, `Planning note ${i}`));
        const service = new ProjectMemoryService(client(index(manySources)), ["allowed-project"]);
        expect((await service.search("planning")).results).toHaveLength(SEARCH_RESULT_LIMIT);
        const empty = await service.search("   ");
        expect(empty.results).toHaveLength(1);
        expect(decodeResultId(empty.results[0].id).type).toBe("manifest");
    });
});

describe("READ1B Project Memory fetch", () => {
    it("returns a complete metadata-only manifest with exact unique source inventory", async () => {
        const projectIndex = index();
        const service = new ProjectMemoryService(client(projectIndex), ["allowed-project"]);
        const manifestId = (await service.search("allowed-project")).results[0].id;
        const output = await service.fetch(manifestId);
        expect(output.metadata).toMatchObject({
            isProjectManifest: true,
            isCanonicalSource: false,
            projectSlug: "allowed-project",
            corpusFingerprint: FINGERPRINT,
            totalSources: projectIndex.sources.length,
            counts: projectIndex.counts,
            complete: true,
            attachmentReadingSupported: false,
        });
        const inventory = output.metadata.sources as Array<{ id: string }>;
        expect(inventory).toHaveLength(projectIndex.sources.length);
        expect(new Set(inventory.map((entry) => entry.id)).size).toBe(projectIndex.sources.length);
        expect(output.text).not.toContain("canonical source text");
    });

    it("returns one complete canonical multi-chunk source with provenance preserved", async () => {
        const fullText = "x".repeat(43_618);
        const read1 = client(index(), fullText);
        const service = new ProjectMemoryService(read1, ["allowed-project"]);
        const sourceId = encodeSourceId("allowed-project", FINGERPRINT, {
            sourceKind: "doc",
            sourceId: "doc-1",
        });
        const output = await service.fetch(sourceId);
        expect(output.text).toBe(fullText);
        expect(output.metadata).toMatchObject({
            isProjectManifest: false,
            isCanonicalSource: true,
            sourceKind: "doc",
            sourceId: "doc-1",
            corpusFingerprint: FINGERPRINT,
            totalCharacterCount: 43_618,
            chunkCount: 2,
            complete: true,
            attachmentReadingSupported: false,
        });
        expect(read1.readCompleteSource).toHaveBeenCalledWith(
            "allowed-project",
            { sourceKind: "doc", sourceId: "doc-1" },
            FINGERPRINT,
        );
    });

    it("fetches a compact fingerprint-bound registry index without repeating source entries", async () => {
        const projectIndex = pilotIndex();
        const service = new ProjectMemoryService(client(projectIndex), ["allowed-project"]);
        const output = await service.fetch(encodeRegistryIndexId("allowed-project", PILOT_FINGERPRINT));
        expect(output.metadata).toMatchObject({
            isProjectManifest: false,
            isProjectSourceRegistry: true,
            isCanonicalSource: false,
            controlArtifactType: "project_source_registry_index",
            projectSlug: "allowed-project",
            corpusFingerprint: PILOT_FINGERPRINT,
            totalSources: 46,
            pageSize: REGISTRY_PAGE_SIZE,
            pageCount: 5,
            complete: true,
        });
        const pages = output.metadata.pages as Array<{ pageNumber: number; id: string }>;
        expect(pages).toHaveLength(5);
        expect(pages.map((page) => decodeResultId(page.id))).toEqual(
            pages.map((page) => expect.objectContaining({
                type: "registry_page",
                projectSlug: "allowed-project",
                corpusFingerprint: PILOT_FINGERPRINT,
                pageNumber: page.pageNumber,
            })),
        );
        expect(JSON.parse(output.text)).not.toHaveProperty("sources");
        expect(serializedBytes(output)).toBeLessThanOrEqual(REGISTRY_INDEX_MAX_SERIALIZED_BYTES);
    });

    it("enumerates all 46 sources exactly once in existing READ1 order through bounded pages", async () => {
        const projectIndex = pilotIndex();
        const service = new ProjectMemoryService(client(projectIndex), ["allowed-project"]);
        const registryIndex = await service.fetch(encodeRegistryIndexId("allowed-project", PILOT_FINGERPRINT));
        const pages = registryIndex.metadata.pages as Array<{ pageNumber: number; id: string }>;
        const union: Array<{ sourceKind: string; sourceId: string; id: string }> = [];
        const pageSizes: number[] = [];

        for (const pageRef of pages) {
            const page = await service.fetch(pageRef.id);
            expect(page.metadata).toMatchObject({
                isProjectSourceRegistry: true,
                isCanonicalSource: false,
                controlArtifactType: "project_source_registry_page",
                corpusFingerprint: PILOT_FINGERPRINT,
                pageNumber: pageRef.pageNumber,
                totalSources: 46,
            });
            const pageSources = page.metadata.sources as typeof union;
            pageSizes.push(pageSources.length);
            expect(pageSources.length).toBeLessThanOrEqual(REGISTRY_PAGE_SIZE);
            expect(serializedBytes(page)).toBeLessThanOrEqual(REGISTRY_PAGE_MAX_SERIALIZED_BYTES);
            expect(page.text).not.toContain("canonical source text");
            union.push(...pageSources);
        }

        expect(pageSizes).toEqual([10, 10, 10, 10, 6]);
        expect(union.map(({ sourceKind, sourceId }) => ({ sourceKind, sourceId }))).toEqual(
            projectIndex.sources.map(({ sourceKind, sourceId }) => ({ sourceKind, sourceId })),
        );
        expect(union).toHaveLength(46);
        expect(new Set(union.map((entry) => `${entry.sourceKind}\u0000${entry.sourceId}`)).size).toBe(46);
        expect(union.every((entry) => decodeResultId(entry.id).type === "source")).toBe(true);
    });

    it("binds opaque registry IDs to project, fingerprint and page and rejects tampering", async () => {
        const service = new ProjectMemoryService(client(pilotIndex()), ["allowed-project"]);
        const indexId = encodeRegistryIndexId("allowed-project", PILOT_FINGERPRINT);
        const pageId = encodeRegistryPageId("allowed-project", PILOT_FINGERPRINT, 3);
        expect(indexId).not.toContain("allowed-project");
        expect(pageId).not.toContain("allowed-project");
        expect(decodeResultId(pageId)).toEqual({
            version: 1,
            type: "registry_page",
            projectSlug: "allowed-project",
            corpusFingerprint: PILOT_FINGERPRINT,
            pageNumber: 3,
        });
        expect(() => decodeResultId(`${pageId}A`)).toThrowError(expect.objectContaining({ code: "INVALID_RESULT_ID" }));
        expect(() => decodeResultId(encodeRegistryPageId("allowed-project", PILOT_FINGERPRINT, 0)))
            .toThrowError(expect.objectContaining({ code: "INVALID_RESULT_ID" }));
        await expect(service.fetch(encodeRegistryPageId("allowed-project", PILOT_FINGERPRINT, 6)))
            .rejects.toMatchObject({ code: "INVALID_RESULT_ID" });
        await expect(service.fetch(encodeRegistryPageId("other-project", PILOT_FINGERPRINT, 1)))
            .rejects.toMatchObject({ code: "PROJECT_NOT_ALLOWED" });
    });

    it("rejects negative and type-confused registry page identities", () => {
        expect(() => decodeResultId(encodeRegistryPageId("allowed-project", PILOT_FINGERPRINT, -1)))
            .toThrowError(expect.objectContaining({ code: "INVALID_RESULT_ID" }));
        const stringPage = Buffer.from(
            JSON.stringify([1, "registry_page", "allowed-project", PILOT_FINGERPRINT, "1"]),
            "utf8",
        ).toString("base64url");
        expect(() => decodeResultId(stringPage))
            .toThrowError(expect.objectContaining({ code: "INVALID_RESULT_ID" }));
        const confusedIndex = Buffer.from(
            JSON.stringify([1, "registry_index", "allowed-project", PILOT_FINGERPRINT, 1]),
            "utf8",
        ).toString("base64url");
        expect(() => decodeResultId(confusedIndex))
            .toThrowError(expect.objectContaining({ code: "INVALID_RESULT_ID" }));
    });

    it("fails closed when an index or page result fingerprint becomes stale", async () => {
        let current = pilotIndex();
        const read1: ProjectMemoryReadClient = {
            enumerateProject: vi.fn(async (_slug, expected) => {
                if (expected && expected !== current.corpusFingerprint) {
                    throw new McpBridgeError("STALE_CORPUS", "The Project corpus changed; search again");
                }
                return current;
            }),
            readCompleteSource: vi.fn(),
        };
        const service = new ProjectMemoryService(read1, ["allowed-project"]);
        const oldIndexId = encodeRegistryIndexId("allowed-project", PILOT_FINGERPRINT);
        const oldPageId = encodeRegistryPageId("allowed-project", PILOT_FINGERPRINT, 1);
        current = { ...current, corpusFingerprint: OTHER_FINGERPRINT };
        await expect(service.fetch(oldIndexId)).rejects.toMatchObject({ code: "STALE_CORPUS" });
        await expect(service.fetch(oldPageId)).rejects.toMatchObject({ code: "STALE_CORPUS" });
    });

    it("fails closed instead of emitting an oversized registry page", async () => {
        const oversized = index(Array.from({ length: REGISTRY_PAGE_SIZE }, (_, position) =>
            source(`doc-${position}`, "x".repeat(REGISTRY_PAGE_MAX_SERIALIZED_BYTES)),
        ));
        const service = new ProjectMemoryService(client(oversized), ["allowed-project"]);
        await expect(service.fetch(encodeRegistryPageId("allowed-project", FINGERPRINT, 1)))
            .rejects.toMatchObject({ code: "READ1_PROTOCOL_ERROR" });
    });

    it("preserves the exact no-snapshot 46-source pilot corpus semantics", async () => {
        const projectIndex = pilotIndex();
        const service = new ProjectMemoryService(client(projectIndex), ["allowed-project"]);
        const manifestId = (await service.search("allowed-project")).results[0].id;
        const manifest = await service.fetch(manifestId);
        expect(manifest.metadata).toMatchObject({
            totalSources: 46,
            corpusFingerprint: PILOT_FINGERPRINT,
            counts: {
                project_metadata: 1,
                doc_block: 13,
                doc: 24,
                decision: 7,
                project_context: 1,
                loop: 0,
                project_context_snapshot: 0,
            },
        });
        expect(projectIndex.sources).toHaveLength(46);
        expect(projectIndex.sources.some((entry) => entry.sourceKind === "project_context_snapshot")).toBe(false);
        const registry = await service.fetch(encodeRegistryIndexId("allowed-project", PILOT_FINGERPRINT));
        expect(registry.metadata.isCanonicalSource).toBe(false);
        expect(registry.metadata.totalSources).toBe(46);
    });

    it("preserves canonical Project Metadata fetch compatibility", async () => {
        const projectIndex = pilotIndex();
        const read1 = client(projectIndex, "canonical project metadata text");
        const service = new ProjectMemoryService(read1, ["allowed-project"]);
        const id = encodeSourceId("allowed-project", PILOT_FINGERPRINT, {
            sourceKind: "project_metadata",
            sourceId: "project_metadata-1",
        });
        const output = await service.fetch(id);
        expect(output.text).toBe("canonical project metadata text");
        expect(output.metadata).toMatchObject({
            isProjectManifest: false,
            isCanonicalSource: true,
            sourceKind: "project_metadata",
            sourceId: "project_metadata-1",
            corpusFingerprint: PILOT_FINGERPRINT,
            complete: true,
        });
    });

    it("preserves the derived-context flag", async () => {
        const service = new ProjectMemoryService(client(), ["allowed-project"]);
        const id = encodeSourceId("allowed-project", FINGERPRINT, {
            sourceKind: "project_context",
            sourceId: "context-1",
        });
        expect((await service.fetch(id)).metadata.isDerivedContext).toBe(true);
    });

    it("rejects stale, fabricated, unknown and non-allowlisted identities", async () => {
        const service = new ProjectMemoryService(client(), ["allowed-project"]);
        const stale = encodeSourceId("allowed-project", OTHER_FINGERPRINT, {
            sourceKind: "doc",
            sourceId: "doc-1",
        });
        await expect(service.fetch(stale)).rejects.toMatchObject({ code: "STALE_CORPUS" });
        await expect(service.fetch("fabricated-id")).rejects.toMatchObject({ code: "INVALID_RESULT_ID" });

        const unknown = encodeSourceId("allowed-project", FINGERPRINT, {
            sourceKind: "doc",
            sourceId: "missing-doc",
        });
        await expect(service.fetch(unknown)).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });

        const other = encodeSourceId("other-project", FINGERPRINT, {
            sourceKind: "doc",
            sourceId: "doc-1",
        });
        await expect(service.fetch(other)).rejects.toMatchObject({ code: "PROJECT_NOT_ALLOWED" });
    });
});

describe("READ1B — project_context_snapshot (CTX3-I2E)", () => {
    it("no-snapshot regression: zero count, no synthetic snapshot, existing search/fetch work (I2E 6-10)", async () => {
        const service = new ProjectMemoryService(client(), ["allowed-project"]);
        const manifestId = (await service.search("allowed-project")).results[0].id;
        const manifest = await service.fetch(manifestId);
        expect(manifest.metadata.counts).toMatchObject({ project_context_snapshot: 0 });
        expect(
            (manifest.metadata.sources as Array<{ sourceKind: string }>)
                .some((s) => s.sourceKind === "project_context_snapshot"),
        ).toBe(false);
        const search = await service.search("Architecture Notes");
        expect(search.results.length).toBeGreaterThan(0);
        const docId = encodeSourceId("allowed-project", FINGERPRINT, { sourceKind: "doc", sourceId: "doc-1" });
        expect((await service.fetch(docId)).text).toBe("canonical source text");
    });

    it("surfaces the current published snapshot as a standard search result (I2E 11-15)", async () => {
        const idx = index([snapshotSource("snap-v1")]);
        const service = new ProjectMemoryService(client(idx), ["allowed-project"]);
        const output = await service.search("Project Context Snapshot");
        const snapResult = output.results.find((r) => {
            const d = decodeResultId(r.id);
            return d.type === "source" && d.source.sourceKind === "project_context_snapshot";
        });
        expect(snapResult).toBeDefined();
        expect(decodeResultId(snapResult!.id)).toMatchObject({
            type: "source",
            projectSlug: "allowed-project",
            source: { sourceKind: "project_context_snapshot", sourceId: "snap-v1" },
        });
        const manifestId = (await service.search("allowed-project")).results[0].id;
        expect((await service.fetch(manifestId)).metadata.counts)
            .toMatchObject({ project_context_snapshot: 1 });
    });

    it("fetches the snapshot via READ1 with exact body, derived semantics, and currentness metadata (I2E 12-14, 21-25)", async () => {
        const snapshotText = `snapshot-start\n${"long snapshot line\n".repeat(2_000)}snapshot-end`;
        const idx = index([snapshotSource("snap-v1")]);
        const read1 = client(idx, snapshotText);
        const service = new ProjectMemoryService(read1, ["allowed-project"]);
        const id = encodeSourceId("allowed-project", FINGERPRINT, {
            sourceKind: "project_context_snapshot",
            sourceId: "snap-v1",
        });
        const output = await service.fetch(id);
        expect(output.text).toBe(snapshotText);
        expect(output.metadata).toMatchObject({
            sourceKind: "project_context_snapshot",
            sourceId: "snap-v1",
            isDerivedContext: true,
            isCanonicalSource: false,
            generatedFromFingerprint: "b".repeat(64),
            publishedCorpusFingerprint: FINGERPRINT,
            authorityClass: "DERIVED_WORKING_MEMORY",
        });
        expect(output.metadata.snapshot).toMatchObject({
            schemaVersion: "project-context.v1",
            generatedFromFingerprint: "b".repeat(64),
            publishedCorpusFingerprint: FINGERPRINT,
            generatedAt: "2026-08-20T00:00:00.000Z",
            approvedAt: "2026-08-20T00:00:00.000Z",
        });
        const serialized = JSON.stringify(output);
        const textIndex = serialized.indexOf('"text":');
        expect(serialized.indexOf('"generatedFromFingerprint":')).toBeLessThan(textIndex);
        expect(serialized.indexOf('"publishedCorpusFingerprint":')).toBeLessThan(textIndex);
        expect(serialized.indexOf('"authorityClass":')).toBeLessThan(textIndex);
        expect(output.text).not.toContain(FINGERPRINT);
        expect(read1.readCompleteSource).toHaveBeenCalledWith(
            "allowed-project",
            { sourceKind: "project_context_snapshot", sourceId: "snap-v1" },
            FINGERPRINT,
        );
    });

    it("round-trips snapshot result IDs, keeps old kinds, and fails closed (I2E 16-20, 26)", async () => {
        const service = new ProjectMemoryService(client(), ["allowed-project"]);
        const snapId = encodeSourceId("allowed-project", FINGERPRINT, {
            sourceKind: "project_context_snapshot",
            sourceId: "snap-v1",
        });
        expect(decodeResultId(snapId)).toMatchObject({
            source: { sourceKind: "project_context_snapshot", sourceId: "snap-v1" },
        });
        const oldId = encodeSourceId("allowed-project", FINGERPRINT, { sourceKind: "doc", sourceId: "doc-1" });
        expect(decodeResultId(oldId).source.sourceKind).toBe("doc");
        await expect(service.fetch("fabricated-id")).rejects.toMatchObject({ code: "INVALID_RESULT_ID" });
        const unknownKind = Buffer.from(
            JSON.stringify([1, "source", "allowed-project", FINGERPRINT, "note", "n1"]),
            "utf8",
        ).toString("base64url");
        await expect(service.fetch(unknownKind)).rejects.toMatchObject({ code: "INVALID_RESULT_ID" });
        const stale = encodeSourceId("allowed-project", OTHER_FINGERPRINT, {
            sourceKind: "project_context_snapshot",
            sourceId: "snap-v1",
        });
        await expect(service.fetch(stale)).rejects.toMatchObject({ code: "STALE_CORPUS" });
        const other = encodeSourceId("other-project", FINGERPRINT, {
            sourceKind: "project_context_snapshot",
            sourceId: "snap-v1",
        });
        await expect(service.fetch(other)).rejects.toMatchObject({ code: "PROJECT_NOT_ALLOWED" });
    });

    it("preserves legacy isCanonicalSource=true for a derived-titled existing source (I2E-R1 C)", async () => {
        // Legacy DERIVED_CONTEXT_TITLE behavior: an existing doc marked
        // isDerivedContext=true must keep the pre-I2E isCanonicalSource=true
        // MCP contract. I2E does not reconcile legacy authority.
        const idx = index([source("doc-derived", "PROJECT-CONTEXT-CURRENT")]);
        const read1 = client(idx);
        read1.readCompleteSource = vi.fn(async (): Promise<CompleteSource> => ({
            title: "PROJECT-CONTEXT-CURRENT",
            text: "legacy derived body",
            status: "active",
            sourceType: "document",
            isDerivedContext: true,
            totalCharacterCount: "legacy derived body".length,
            chunkCount: 1,
        }));
        const service = new ProjectMemoryService(read1, ["allowed-project"]);
        const id = encodeSourceId("allowed-project", FINGERPRINT, {
            sourceKind: "doc",
            sourceId: "doc-derived",
        });
        const output = await service.fetch(id);
        expect(output.metadata.isDerivedContext).toBe(true);
        expect(output.metadata.isCanonicalSource).toBe(true);
    });
});
