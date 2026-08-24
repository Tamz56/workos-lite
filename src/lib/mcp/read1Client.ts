import { z } from "zod";
import type { ProjectContextSourceKind, ProjectContextSourceRef } from "@/lib/project-curator/contracts";
import { McpBridgeError } from "./errors";
import { getRead1ClientConfig, type Read1ClientConfig } from "./config";

const sourceKindSchema = z.enum([
    "project_metadata",
    "doc_block",
    "doc",
    "decision",
    "project_context",
    "loop",
    "project_context_snapshot",
]);
const snapshotMetadataSchema = z.object({
    schemaVersion: z.string(),
    generatedFromFingerprint: z.string(),
    publishedCorpusFingerprint: z.string().nullable(),
    generatedAt: z.string(),
    approvedAt: z.string().nullable(),
});
const sourceSchema = z.object({
    sourceKind: sourceKindSchema,
    sourceId: z.string().min(1),
    title: z.string(),
    sourceType: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    nextAction: z.string().nullable().optional(),
    hasFullContent: z.boolean(),
    isDerivedContext: z.boolean(),
    possibleDuplicateTitle: z.boolean().optional(),
    // Optional snapshot-specific currentness metadata (I2C). Only
    // project_context_snapshot entries carry it; the six prior kinds never do.
    snapshotMetadata: snapshotMetadataSchema.optional(),
});
const projectSchema = z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string(),
    status: z.string().nullable().optional(),
    currentGoal: z.string().nullable().optional(),
    nextAction: z.string().nullable().optional(),
    riskOrBlockedBy: z.string().nullable().optional(),
    progressStage: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
});
const countsSchema = z.object({
    project_metadata: z.number().int().nonnegative(),
    doc_block: z.number().int().nonnegative(),
    doc: z.number().int().nonnegative(),
    decision: z.number().int().nonnegative(),
    project_context: z.number().int().nonnegative(),
    loop: z.number().int().nonnegative(),
    project_context_snapshot: z.number().int().nonnegative(),
});
const indexPageSchema = z.object({
    schemaVersion: z.literal("ai-read-source-index.v1"),
    project: projectSchema,
    counts: countsSchema,
    sources: z.array(sourceSchema),
    pagination: z.object({
        pageSize: z.number().int().positive(),
        returnedSources: z.number().int().nonnegative(),
        totalSources: z.number().int().nonnegative(),
        hasMore: z.boolean(),
        nextCursor: z.string().nullable(),
    }),
    corpusFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    attachmentReadingSupported: z.literal(false),
});
const chunkSchema = z.object({
    schemaVersion: z.literal("ai-read-source-read.v1"),
    project: projectSchema,
    ref: z.object({ sourceKind: sourceKindSchema, sourceId: z.string().min(1) }),
    title: z.string(),
    metadata: z.object({
        sourceKind: sourceKindSchema,
        sourceId: z.string().min(1),
        status: z.string().nullable(),
        sourceType: z.string().nullable(),
        isDerivedContext: z.boolean(),
    }),
    content: z.string(),
    chunk: z.object({
        offset: z.number().int().nonnegative(),
        includedChars: z.number().int().nonnegative(),
        totalCharacterCount: z.number().int().nonnegative(),
        nextOffset: z.number().int().nonnegative(),
        hasMore: z.boolean(),
    }),
});

export type Read1SourceEntry = z.infer<typeof sourceSchema>;
export type Read1Project = z.infer<typeof projectSchema>;
export type Read1Counts = z.infer<typeof countsSchema>;

export interface CompleteProjectIndex {
    project: Read1Project;
    counts: Read1Counts;
    sources: Read1SourceEntry[];
    corpusFingerprint: string;
    attachmentReadingSupported: false;
}

export interface CompleteSource {
    title: string;
    text: string;
    status: string | null;
    sourceType: string | null;
    isDerivedContext: boolean;
    totalCharacterCount: number;
    chunkCount: number;
}

type FetchLike = typeof fetch;

export class Read1Client {
    constructor(
        private readonly config: Read1ClientConfig,
        private readonly fetchFn: FetchLike = fetch,
    ) {}

    private async request(path: string, init?: RequestInit): Promise<unknown> {
        const response = await this.fetchFn(new URL(path, this.config.internalOrigin), {
            ...init,
            cache: "no-store",
            headers: {
                accept: "application/json",
                ...(init?.body ? { "content-type": "application/json" } : {}),
                "x-agent-password": this.config.readPassword,
            },
        });
        const body = await response.json().catch(() => undefined) as
            | { error?: { code?: string } }
            | undefined;
        if (!response.ok) {
            if (response.status === 409 || body?.error?.code === "CORPUS_CHANGED") {
                throw new McpBridgeError("STALE_CORPUS", "The Project corpus changed; search again");
            }
            throw new McpBridgeError("READ1_REQUEST_FAILED", "The read-only source request failed");
        }
        return body;
    }

    async enumerateProject(projectSlug: string, expectedFingerprint?: string): Promise<CompleteProjectIndex> {
        const sources: Read1SourceEntry[] = [];
        const seen = new Set<string>();
        let cursor: string | undefined;
        let fingerprint = expectedFingerprint;
        let firstPage: z.infer<typeof indexPageSchema> | undefined;

        for (let pageNumber = 0; pageNumber < 10_000; pageNumber += 1) {
            const query = new URLSearchParams({ pageSize: "200" });
            if (cursor) query.set("cursor", cursor);
            if (fingerprint) query.set("expectedCorpusFingerprint", fingerprint);
            const raw = await this.request(
                `/api/ai-read/projects/${encodeURIComponent(projectSlug)}/sources?${query.toString()}`,
            );
            const parsed = indexPageSchema.safeParse(raw);
            if (!parsed.success) {
                throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 returned an invalid source index");
            }
            const page = parsed.data;
            firstPage ??= page;
            fingerprint ??= page.corpusFingerprint;
            if (page.corpusFingerprint !== fingerprint || page.project.slug !== projectSlug) {
                throw new McpBridgeError("STALE_CORPUS", "The Project corpus changed; search again");
            }
            if (
                page.pagination.returnedSources !== page.sources.length ||
                page.pagination.totalSources !== firstPage.pagination.totalSources ||
                JSON.stringify(page.counts) !== JSON.stringify(firstPage.counts)
            ) {
                throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 pagination metadata was inconsistent");
            }
            for (const source of page.sources) {
                const identity = `${source.sourceKind}\u0000${source.sourceId}`;
                if (seen.has(identity)) {
                    throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 returned a duplicate source identity");
                }
                seen.add(identity);
                sources.push(source);
            }
            if (!page.pagination.hasMore) {
                const countedSources = Object.values(firstPage.counts).reduce((sum, count) => sum + count, 0);
                if (
                    page.pagination.nextCursor !== null ||
                    sources.length !== page.pagination.totalSources ||
                    countedSources !== sources.length
                ) {
                    throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 enumeration was incomplete");
                }
                return {
                    project: firstPage.project,
                    counts: firstPage.counts,
                    sources,
                    corpusFingerprint: fingerprint,
                    attachmentReadingSupported: false,
                };
            }
            if (!page.pagination.nextCursor || page.pagination.nextCursor === cursor) {
                throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 pagination did not advance");
            }
            cursor = page.pagination.nextCursor;
        }
        throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 pagination exceeded the safety limit");
    }

    async readCompleteSource(
        projectSlug: string,
        source: ProjectContextSourceRef,
        expectedFingerprint: string,
    ): Promise<CompleteSource> {
        await this.enumerateProject(projectSlug, expectedFingerprint);
        let offset = 0;
        let totalCharacterCount: number | undefined;
        let title: string | undefined;
        let status: string | null = null;
        let sourceType: string | null = null;
        let isDerivedContext = false;
        let text = "";
        let chunkCount = 0;

        for (; chunkCount < 10_000; chunkCount += 1) {
            const raw = await this.request(
                `/api/ai-read/projects/${encodeURIComponent(projectSlug)}/sources/read`,
                {
                    method: "POST",
                    body: JSON.stringify({ source, offset, limit: 30_000 }),
                },
            );
            const parsed = chunkSchema.safeParse(raw);
            if (!parsed.success) {
                throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 returned an invalid source chunk");
            }
            const result = parsed.data;
            if (
                result.project.slug !== projectSlug ||
                result.ref.sourceKind !== source.sourceKind ||
                result.ref.sourceId !== source.sourceId ||
                result.chunk.offset !== offset ||
                result.chunk.includedChars !== result.content.length ||
                result.chunk.nextOffset !== offset + result.chunk.includedChars
            ) {
                throw new McpBridgeError("INCOMPLETE_SOURCE", "READ1 source chunks were not contiguous");
            }
            totalCharacterCount ??= result.chunk.totalCharacterCount;
            title ??= result.title;
            if (result.chunk.totalCharacterCount !== totalCharacterCount) {
                throw new McpBridgeError("INCOMPLETE_SOURCE", "READ1 source length changed during fetch");
            }
            status = result.metadata.status;
            sourceType = result.metadata.sourceType;
            isDerivedContext = result.metadata.isDerivedContext;
            text += result.content;
            offset = result.chunk.nextOffset;
            if (!result.chunk.hasMore) {
                const finalChunkCount = chunkCount + 1;
                if (offset !== totalCharacterCount || text.length !== totalCharacterCount) {
                    throw new McpBridgeError("INCOMPLETE_SOURCE", "READ1 source fetch was incomplete");
                }
                await this.enumerateProject(projectSlug, expectedFingerprint);
                return {
                    title,
                    text,
                    status,
                    sourceType,
                    isDerivedContext,
                    totalCharacterCount,
                    chunkCount: finalChunkCount,
                };
            }
            if (result.chunk.includedChars === 0) {
                throw new McpBridgeError("INCOMPLETE_SOURCE", "READ1 source pagination did not advance");
            }
        }
        throw new McpBridgeError("INCOMPLETE_SOURCE", "READ1 source exceeded the chunk safety limit");
    }
}

export function createRead1Client(env: NodeJS.ProcessEnv = process.env, fetchFn: FetchLike = fetch): Read1Client {
    return new Read1Client(getRead1ClientConfig(env), fetchFn);
}

export type CanonicalSourceKind = ProjectContextSourceKind;
