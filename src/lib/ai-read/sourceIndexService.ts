// ---------------------------------------------------------------------------
// WorkOS-Lite — READ1A
// Complete metadata source index service
// ---------------------------------------------------------------------------
// READ1 enumerates the COMPLETE supported text corpus (no per-kind cap, no
// hidden truncation), applies the canonical global ordering, pages via a
// deterministic opaque cursor, and computes a full-corpus fingerprint.
// ---------------------------------------------------------------------------
import { createHash } from "crypto";
import type Database from "better-sqlite3";
import {
    collectCompleteProjectSourceEntries,
    entryRecency,
    PROJECT_CONTEXT_KIND_ORDER,
} from "@/lib/project-curator/knowledgeIndex";
import type {
    ProjectContextSourceIndexEntry,
    ProjectContextSourceIndexProject,
    ProjectContextSourceKind,
} from "@/lib/project-curator/contracts";
import { ReadApiError } from "./errors";

export const AI_READ_INDEX_SCHEMA_VERSION = "ai-read-source-index.v1";
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 200;

const NULL_SENTINEL = "\u0000";
const FIELD_SEP = "\u0001";

export interface AiReadSourceIndexPage {
    schemaVersion: typeof AI_READ_INDEX_SCHEMA_VERSION;
    project: ProjectContextSourceIndexProject;
    counts: Record<ProjectContextSourceKind, number>;
    sources: ProjectContextSourceIndexEntry[];
    pagination: {
        pageSize: number;
        returnedSources: number;
        totalSources: number;
        hasMore: boolean;
        nextCursor: string | null;
    };
    corpusFingerprint: string;
    generatedAt: string;
    attachmentReadingSupported: false;
}

export interface BuildIndexPageInput {
    pageSize?: number;
    cursor?: string;
    expectedCorpusFingerprint?: string;
    now?: string;
}

/**
 * Deterministic full-corpus fingerprint over source metadata only:
 * sourceKind, sourceId, title, status, createdAt, updatedAt, isDerivedContext.
 * Nulls use a sentinel; material is canonically sorted independent of page.
 */
export function buildCorpusFingerprint(entries: ProjectContextSourceIndexEntry[]): string {
    const material = entries
        .map((e) =>
            [
                e.sourceKind,
                e.sourceId,
                e.title ?? NULL_SENTINEL,
                e.status ?? NULL_SENTINEL,
                e.createdAt ?? NULL_SENTINEL,
                e.updatedAt ?? NULL_SENTINEL,
                String(e.isDerivedContext),
            ].join(FIELD_SEP),
        )
        .sort()
        .join("\n");
    return createHash("sha256").update(material, "utf8").digest("hex");
}

function countByKind(entries: ProjectContextSourceIndexEntry[]): Record<ProjectContextSourceKind, number> {
    const counts: Record<ProjectContextSourceKind, number> = {
        project_metadata: 0,
        doc_block: 0,
        doc: 0,
        decision: 0,
        project_context: 0,
        loop: 0,
    };
    for (const entry of entries) {
        counts[entry.sourceKind] += 1;
    }
    return counts;
}

function resolvePageSize(raw: number | undefined): number {
    if (raw === undefined) return DEFAULT_PAGE_SIZE;
    if (!Number.isInteger(raw) || raw <= 0 || raw > MAX_PAGE_SIZE) {
        throw new ReadApiError("INVALID_PAGE_SIZE", `Invalid page size: ${raw}`, 400);
    }
    return raw;
}

// --- deterministic opaque cursor based on (effectiveRecency, sourceKind, sourceId) ---

type CursorTuple = [string, string, string];

function tupleOf(entry: ProjectContextSourceIndexEntry): CursorTuple {
    return [entryRecency(entry), entry.sourceKind, entry.sourceId];
}

function encodeCursor(tuple: CursorTuple): string {
    return Buffer.from(JSON.stringify(tuple), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorTuple {
    try {
        if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error("bad cursor");
        const decoded = Buffer.from(cursor, "base64url");
        if (decoded.toString("base64url") !== cursor) throw new Error("bad cursor");
        const json = new TextDecoder("utf-8", { fatal: true }).decode(decoded);
        const parsed = JSON.parse(json) as unknown;
        if (
            Array.isArray(parsed) &&
            parsed.length === 3 &&
            typeof parsed[0] === "string" &&
            typeof parsed[1] === "string" &&
            typeof parsed[2] === "string" &&
            (parsed[0] === "" || !Number.isNaN(Date.parse(parsed[0]))) &&
            parsed[2].length > 0 &&
            PROJECT_CONTEXT_KIND_ORDER.includes(parsed[1] as ProjectContextSourceKind)
        ) {
            return [parsed[0], parsed[1], parsed[2]];
        }
        throw new Error("bad cursor");
    } catch {
        throw new ReadApiError("INVALID_CURSOR", "Invalid cursor", 400);
    }
}

function paginateEntries(
    entries: ProjectContextSourceIndexEntry[],
    pageSize: number,
    cursor: string | undefined,
): { page: ProjectContextSourceIndexEntry[]; nextCursor: string | null; hasMore: boolean; returnedSources: number; totalSources: number } {
    let start = 0;
    if (cursor !== undefined) {
        const decoded = decodeCursor(cursor);
        const anchor = entries.findIndex((entry) => {
            const tuple = tupleOf(entry);
            return tuple[0] === decoded[0] && tuple[1] === decoded[1] && tuple[2] === decoded[2];
        });
        if (anchor === -1) {
            throw new ReadApiError("INVALID_CURSOR", "Invalid cursor", 400);
        }
        start = anchor + 1;
    }
    const page = entries.slice(start, start + pageSize);
    const nextStart = start + page.length;
    const hasMore = nextStart < entries.length;
    const nextCursor = hasMore && page.length > 0 ? encodeCursor(tupleOf(page[page.length - 1])) : null;
    return {
        page,
        nextCursor,
        hasMore,
        returnedSources: page.length,
        totalSources: entries.length,
    };
}

/**
 * Builds one page of the complete project source index.
 * Complete enumeration: no per-kind cap; exact N unique refs across pages.
 */
export function buildSourceIndexPage(
    db: Database.Database,
    projectIdentifier: string,
    input: BuildIndexPageInput = {},
): AiReadSourceIndexPage {
    const { project, entries } = collectCompleteProjectSourceEntries(db, projectIdentifier, {
        includeArchivedLoops: true,
    });

    const fingerprint = buildCorpusFingerprint(entries);
    if (input.expectedCorpusFingerprint != null && fingerprint !== input.expectedCorpusFingerprint) {
        throw new ReadApiError("CORPUS_CHANGED", "Project corpus changed during enumeration", 409);
    }
    if (input.cursor != null && input.expectedCorpusFingerprint == null) {
        throw new ReadApiError("INVALID_CURSOR", "expectedCorpusFingerprint is required for subsequent pages", 400);
    }

    const pageSize = resolvePageSize(input.pageSize);
    const { page, nextCursor, hasMore, returnedSources, totalSources } = paginateEntries(
        entries,
        pageSize,
        input.cursor,
    );

    return {
        schemaVersion: AI_READ_INDEX_SCHEMA_VERSION,
        project,
        counts: countByKind(entries),
        sources: page,
        pagination: {
            pageSize,
            returnedSources,
            totalSources,
            hasMore,
            nextCursor,
        },
        corpusFingerprint: fingerprint,
        generatedAt: input.now ?? new Date().toISOString(),
        attachmentReadingSupported: false,
    };
}
