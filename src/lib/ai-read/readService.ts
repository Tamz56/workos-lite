// ---------------------------------------------------------------------------
// WorkOS-Lite — READ1A
// Complete source chunk read service
// ---------------------------------------------------------------------------
// Wraps the range-aware Stage-B+ chunk reader for READ1, exposing provenance
// and enforcing chunk bounds. No business writes; no AI calls.
// ---------------------------------------------------------------------------
import type Database from "better-sqlite3";
import {
    loadProjectContextSourceChunk,
    type LoadProjectContextSourceChunkOptions,
} from "@/lib/project-curator/sourceLoader";
import { loadProjectProfile, resolveProjectId } from "@/lib/project-curator/knowledgeIndex";
import type {
    ProjectContextSourceIndexProject,
    ProjectContextSourceRef,
} from "@/lib/project-curator/contracts";
import { ReadApiError } from "./errors";

export const AI_READ_SOURCE_READ_SCHEMA_VERSION = "ai-read-source-read.v1";
export const MAX_CHUNK_CHARS = 30_000;

export interface ReadSourceChunkInput {
    source: ProjectContextSourceRef;
    offset: number;
    limit: number;
    now?: string;
}

export interface AiReadSourceChunk {
    schemaVersion: typeof AI_READ_SOURCE_READ_SCHEMA_VERSION;
    project: ProjectContextSourceIndexProject;
    ref: ProjectContextSourceRef;
    title: string;
    metadata: {
        sourceKind: ProjectContextSourceRef["sourceKind"];
        sourceId: string;
        status: string | null;
        sourceType: string | null;
        isDerivedContext: boolean;
    };
    content: string;
    chunk: {
        offset: number;
        includedChars: number;
        totalCharacterCount: number;
        nextOffset: number;
        hasMore: boolean;
    };
}

/**
 * Reads one deterministic chunk of a single source.
 * Derived context is readable for evidence transparency with
 * `isDerivedContext=true` surfaced (READ1 evidence layer), never treated as
 * original authority.
 */
export function readSourceChunk(
    db: Database.Database,
    projectIdentifier: string,
    input: ReadSourceChunkInput,
): AiReadSourceChunk {
    if (!Number.isInteger(input.limit) || input.limit <= 0 || input.limit > MAX_CHUNK_CHARS) {
        throw new ReadApiError("INVALID_CHUNK_LIMIT", `Invalid chunk limit: ${input.limit}`, 400);
    }
    if (!Number.isInteger(input.offset) || input.offset < 0) {
        throw new ReadApiError("INVALID_OFFSET", `Invalid offset: ${input.offset}`, 400);
    }

    const options: LoadProjectContextSourceChunkOptions = {
        offset: input.offset,
        limit: input.limit,
        allowDerivedContext: true,
    };
    const result = loadProjectContextSourceChunk(db, projectIdentifier, input.source, options);
    const projectId = resolveProjectId(db, projectIdentifier);
    const project = loadProjectProfile(db, projectId);

    return {
        schemaVersion: AI_READ_SOURCE_READ_SCHEMA_VERSION,
        project,
        ref: result.ref,
        title: result.title,
        metadata: {
            sourceKind: result.ref.sourceKind,
            sourceId: result.ref.sourceId,
            status: result.status,
            sourceType: result.sourceType,
            isDerivedContext: result.isDerivedContext,
        },
        content: result.content,
        chunk: result.chunk,
    };
}
