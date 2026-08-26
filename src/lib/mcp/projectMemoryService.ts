import type { ProjectContextSourceRef } from "@/lib/project-curator/contracts";
import type { ProjectContextAuthorityClass } from "@/lib/project-context-snapshots/contracts";
import { canonicalSourceUrl } from "./config";
import { McpBridgeError } from "./errors";
import type { CompleteProjectIndex, CompleteSource, Read1SourceEntry } from "./read1Client";
import {
    decodeResultId,
    encodeManifestId,
    encodeRegistryIndexId,
    encodeRegistryPageId,
    encodeSourceId,
} from "./resultIds";

export const SEARCH_RESULT_LIMIT = 20;
export const REGISTRY_PAGE_SIZE = 10;
export const REGISTRY_INDEX_MAX_SERIALIZED_BYTES = 8_192;
export const REGISTRY_PAGE_MAX_SERIALIZED_BYTES = 16_384;

export interface SearchResult {
    id: string;
    title: string;
    url: string;
}

export interface SearchOutput {
    results: SearchResult[];
}

export interface FetchOutput {
    id: string;
    title: string;
    text: string;
    url: string;
    metadata: Record<string, unknown>;
}

interface RankedResult extends SearchResult {
    score: number;
    resultType: "manifest" | "registry" | "source";
    projectSlug: string;
    sourceKind: string;
    sourceId: string;
}

export interface ProjectMemoryReadClient {
    enumerateProject(projectSlug: string, expectedFingerprint?: string): Promise<CompleteProjectIndex>;
    readCompleteSource(
        projectSlug: string,
        source: ProjectContextSourceRef,
        expectedFingerprint: string,
    ): Promise<CompleteSource>;
}

function normalize(value: string): string {
    return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function lexicalScore(query: string, fields: Array<string | null | undefined>): number {
    if (!query) return 0;
    const normalizedFields = fields.filter((field): field is string => typeof field === "string").map(normalize);
    const joined = normalizedFields.join(" ");
    let score = 0;
    for (const field of normalizedFields) {
        if (field === query) score = Math.max(score, 100);
        else if (field.startsWith(query)) score = Math.max(score, 40);
        else if (field.includes(query)) score = Math.max(score, 20);
    }
    for (const token of [...new Set(query.split(/\s+/).filter(Boolean))]) {
        if (joined.includes(token)) score += 2;
    }
    return score;
}

function compareRanked(a: RankedResult, b: RankedResult): number {
    const resultTypeOrder = { manifest: 0, registry: 1, source: 2 } as const;
    return (
        b.score - a.score ||
        resultTypeOrder[a.resultType] - resultTypeOrder[b.resultType] ||
        a.projectSlug.localeCompare(b.projectSlug) ||
        a.title.localeCompare(b.title) ||
        a.sourceKind.localeCompare(b.sourceKind) ||
        a.sourceId.localeCompare(b.sourceId)
    );
}

function serializedBytes(value: unknown): number {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function requireBoundedControlArtifact(output: FetchOutput, maximumBytes: number): FetchOutput {
    if (serializedBytes(output) > maximumBytes) {
        throw new McpBridgeError("READ1_PROTOCOL_ERROR", "Registry control artifact exceeded its safe response bound");
    }
    return output;
}

function sourceRef(entry: Read1SourceEntry): ProjectContextSourceRef {
    return { sourceKind: entry.sourceKind, sourceId: entry.sourceId };
}

export class ProjectMemoryService {
    constructor(
        private readonly read1: ProjectMemoryReadClient,
        private readonly allowedProjectSlugs: readonly string[],
    ) {}

    private requireAllowed(projectSlug: string): void {
        if (!this.allowedProjectSlugs.includes(projectSlug)) {
            throw new McpBridgeError("PROJECT_NOT_ALLOWED", "Project is not available through this connector");
        }
    }

    async search(queryValue: string): Promise<SearchOutput> {
        const query = normalize(queryValue);
        const ranked: RankedResult[] = [];

        for (const projectSlug of [...this.allowedProjectSlugs].sort()) {
            const index = await this.read1.enumerateProject(projectSlug);
            const projectScore = query
                ? lexicalScore(query, [index.project.name, index.project.slug])
                : 1;
            if (projectScore > 0) {
                const exact = query === normalize(index.project.name) || query === normalize(index.project.slug);
                ranked.push({
                    id: encodeManifestId(index.project.slug, index.corpusFingerprint),
                    title: `${index.project.name} — Project manifest`,
                    url: canonicalSourceUrl(index.project.slug),
                    score: exact ? 1_000 : projectScore,
                    resultType: "manifest",
                    projectSlug: index.project.slug,
                    sourceKind: "",
                    sourceId: "",
                });
            }

            const registryScore = query
                ? lexicalScore(query, [
                    index.project.name,
                    index.project.slug,
                    "Project Source Registry",
                    "source registry",
                ])
                : 0;
            if (registryScore > 0) {
                const exactProject = query === normalize(index.project.name) || query === normalize(index.project.slug);
                ranked.push({
                    id: encodeRegistryIndexId(index.project.slug, index.corpusFingerprint),
                    title: `${index.project.name} — Project Source Registry`,
                    url: canonicalSourceUrl(index.project.slug),
                    score: exactProject ? 999 : registryScore,
                    resultType: "registry",
                    projectSlug: index.project.slug,
                    sourceKind: "",
                    sourceId: "",
                });
            }

            if (!query) continue;
            for (const source of index.sources) {
                const score = lexicalScore(query, [
                    index.project.name,
                    index.project.slug,
                    source.title,
                    source.sourceKind,
                    source.status,
                    source.summary,
                    source.nextAction,
                    source.sourceType,
                ]);
                if (score === 0) continue;
                ranked.push({
                    id: encodeSourceId(index.project.slug, index.corpusFingerprint, sourceRef(source)),
                    title: source.title,
                    url: canonicalSourceUrl(index.project.slug, source.sourceKind, source.sourceId),
                    score,
                    resultType: "source",
                    projectSlug: index.project.slug,
                    sourceKind: source.sourceKind,
                    sourceId: source.sourceId,
                });
            }
        }

        return {
            results: ranked.sort(compareRanked).slice(0, SEARCH_RESULT_LIMIT).map(({ id, title, url }) => ({
                id,
                title,
                url,
            })),
        };
    }

    async fetch(id: string): Promise<FetchOutput> {
        const decoded = decodeResultId(id);
        this.requireAllowed(decoded.projectSlug);
        const index = await this.read1.enumerateProject(decoded.projectSlug, decoded.corpusFingerprint);
        if (index.corpusFingerprint !== decoded.corpusFingerprint) {
            throw new McpBridgeError("STALE_CORPUS", "The Project corpus changed; search again");
        }
        if (decoded.type === "manifest") {
            return this.fetchManifest(id, index);
        }
        if (decoded.type === "registry_index") {
            return this.fetchRegistryIndex(id, index);
        }
        if (decoded.type === "registry_page") {
            return this.fetchRegistryPage(id, index, decoded.pageNumber);
        }
        return this.fetchSource(id, index, decoded.source);
    }

    private fetchRegistryIndex(id: string, index: CompleteProjectIndex): FetchOutput {
        const pageCount = Math.ceil(index.sources.length / REGISTRY_PAGE_SIZE);
        const pages = Array.from({ length: pageCount }, (_, offset) => ({
            pageNumber: offset + 1,
            id: encodeRegistryPageId(index.project.slug, index.corpusFingerprint, offset + 1),
        }));
        const controlIndex = {
            notice: "Registry index control artifact only; not a canonical authority source or corpus member.",
            controlArtifactType: "project_source_registry_index",
            projectSlug: index.project.slug,
            corpusFingerprint: index.corpusFingerprint,
            totalSources: index.sources.length,
            pageSize: REGISTRY_PAGE_SIZE,
            pageCount,
            pages,
        };
        const output: FetchOutput = {
            id,
            title: `${index.project.name} — Project Source Registry`,
            text: JSON.stringify(controlIndex),
            url: canonicalSourceUrl(index.project.slug),
            metadata: {
                isProjectManifest: false,
                isProjectSourceRegistry: true,
                isCanonicalSource: false,
                controlArtifactType: "project_source_registry_index",
                projectSlug: index.project.slug,
                corpusFingerprint: index.corpusFingerprint,
                totalSources: index.sources.length,
                pageSize: REGISTRY_PAGE_SIZE,
                pageCount,
                pages,
                complete: true,
                attachmentReadingSupported: false,
            },
        };
        return requireBoundedControlArtifact(output, REGISTRY_INDEX_MAX_SERIALIZED_BYTES);
    }

    private fetchRegistryPage(id: string, index: CompleteProjectIndex, pageNumber: number): FetchOutput {
        const pageCount = Math.ceil(index.sources.length / REGISTRY_PAGE_SIZE);
        if (pageNumber > pageCount) {
            throw new McpBridgeError("INVALID_RESULT_ID", "Unknown or malformed result ID");
        }
        const startOffset = (pageNumber - 1) * REGISTRY_PAGE_SIZE;
        const sources = index.sources.slice(startOffset, startOffset + REGISTRY_PAGE_SIZE).map((source) => ({
            id: encodeSourceId(index.project.slug, index.corpusFingerprint, sourceRef(source)),
            sourceKind: source.sourceKind,
            sourceId: source.sourceId,
            title: source.title,
            status: source.status ?? null,
            isDerivedContext: source.isDerivedContext,
            hasFullContent: source.hasFullContent,
        }));
        const controlPage = {
            notice: "Registry page control artifact only; entries identify sources but this artifact is not a corpus member.",
            controlArtifactType: "project_source_registry_page",
            projectSlug: index.project.slug,
            corpusFingerprint: index.corpusFingerprint,
            totalSources: index.sources.length,
            pageSize: REGISTRY_PAGE_SIZE,
            pageCount,
            pageNumber,
            startOffset,
            returnedSources: sources.length,
            hasMore: pageNumber < pageCount,
            sources,
        };
        const output: FetchOutput = {
            id,
            title: `${index.project.name} — Project Source Registry — Page ${pageNumber} of ${pageCount}`,
            text: JSON.stringify(controlPage),
            url: canonicalSourceUrl(index.project.slug),
            metadata: {
                isProjectManifest: false,
                isProjectSourceRegistry: true,
                isCanonicalSource: false,
                controlArtifactType: "project_source_registry_page",
                projectSlug: index.project.slug,
                corpusFingerprint: index.corpusFingerprint,
                totalSources: index.sources.length,
                pageSize: REGISTRY_PAGE_SIZE,
                pageCount,
                pageNumber,
                startOffset,
                returnedSources: sources.length,
                hasMore: pageNumber < pageCount,
                sources,
                complete: true,
                attachmentReadingSupported: false,
            },
        };
        return requireBoundedControlArtifact(output, REGISTRY_PAGE_MAX_SERIALIZED_BYTES);
    }

    private fetchManifest(id: string, index: CompleteProjectIndex): FetchOutput {
        const inventory = index.sources.map((source) => ({
            id: encodeSourceId(index.project.slug, index.corpusFingerprint, sourceRef(source)),
            sourceKind: source.sourceKind,
            sourceId: source.sourceId,
            title: source.title,
            status: source.status ?? null,
            isDerivedContext: source.isDerivedContext,
            url: canonicalSourceUrl(index.project.slug, source.sourceKind, source.sourceId),
        }));
        const controlManifest = {
            notice: "Coverage control manifest only; not a canonical authority source.",
            project: {
                id: index.project.id,
                slug: index.project.slug,
                name: index.project.name,
            },
            corpusFingerprint: index.corpusFingerprint,
            totalSources: inventory.length,
            counts: index.counts,
            sources: inventory,
        };
        return {
            id,
            title: `${index.project.name} — Project manifest`,
            text: JSON.stringify(controlManifest),
            url: canonicalSourceUrl(index.project.slug),
            metadata: {
                isProjectManifest: true,
                isCanonicalSource: false,
                projectSlug: index.project.slug,
                corpusFingerprint: index.corpusFingerprint,
                totalSources: inventory.length,
                counts: index.counts,
                sources: inventory,
                complete: true,
                attachmentReadingSupported: false,
            },
        };
    }

    private async fetchSource(
        id: string,
        index: CompleteProjectIndex,
        ref: ProjectContextSourceRef,
    ): Promise<FetchOutput> {
        const indexed = index.sources.find(
            (source) => source.sourceKind === ref.sourceKind && source.sourceId === ref.sourceId,
        );
        if (!indexed) {
            throw new McpBridgeError("SOURCE_NOT_FOUND", "Source is not present in the current Project corpus");
        }
        const complete = await this.read1.readCompleteSource(index.project.slug, ref, index.corpusFingerprint);
        const metadata: Record<string, unknown> = {
            isProjectManifest: false,
            // I2E scope: only the new project_context_snapshot kind is
            // reported non-canonical. The six pre-I2E source kinds preserve
            // their exact pre-I2E isCanonicalSource=true contract even when
            // an entry carries the legacy DERIVED_CONTEXT_TITLE identity
            // (authority reconciliation is out of scope for I2E).
            isCanonicalSource: ref.sourceKind !== "project_context_snapshot",
            projectSlug: index.project.slug,
            sourceKind: ref.sourceKind,
            sourceId: ref.sourceId,
            status: complete.status,
            sourceType: complete.sourceType,
            isDerivedContext: complete.isDerivedContext,
            corpusFingerprint: index.corpusFingerprint,
            totalCharacterCount: complete.totalCharacterCount,
            chunkCount: complete.chunkCount,
            complete: true,
            attachmentReadingSupported: false,
        };

        if (ref.sourceKind === "project_context_snapshot") {
            if (!indexed.snapshotMetadata) {
                throw new McpBridgeError("READ1_PROTOCOL_ERROR", "READ1 snapshot provenance metadata is missing");
            }
            const authorityClass: ProjectContextAuthorityClass = "DERIVED_WORKING_MEMORY";
            const snapshot = indexed.snapshotMetadata;
            const snapshotMetadata: Record<string, unknown> = {
                ...metadata,
                generatedFromFingerprint: snapshot.generatedFromFingerprint,
                publishedCorpusFingerprint: snapshot.publishedCorpusFingerprint,
                authorityClass,
                // Preserve the committed nested metadata contract for existing
                // consumers while exposing provenance directly before text.
                snapshot,
            };
            return {
                id,
                title: complete.title,
                url: canonicalSourceUrl(index.project.slug, ref.sourceKind, ref.sourceId),
                metadata: snapshotMetadata,
                text: complete.text,
            };
        }

        return {
            id,
            title: complete.title,
            text: complete.text,
            url: canonicalSourceUrl(index.project.slug, ref.sourceKind, ref.sourceId),
            metadata,
        };
    }
}
