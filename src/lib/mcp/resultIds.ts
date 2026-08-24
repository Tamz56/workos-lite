import type { ProjectContextSourceKind, ProjectContextSourceRef } from "@/lib/project-curator/contracts";
import { McpBridgeError } from "./errors";

const SOURCE_KINDS = new Set<ProjectContextSourceKind>([
    "project_metadata",
    "doc_block",
    "doc",
    "decision",
    "project_context",
    "loop",
    "project_context_snapshot",
]);
const FINGERPRINT = /^[a-f0-9]{64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProjectMemoryResultId =
    | { version: 1; type: "manifest"; projectSlug: string; corpusFingerprint: string }
    | { version: 1; type: "registry_index"; projectSlug: string; corpusFingerprint: string }
    | {
        version: 1;
        type: "registry_page";
        projectSlug: string;
        corpusFingerprint: string;
        pageNumber: number;
    }
    | {
        version: 1;
        type: "source";
        projectSlug: string;
        corpusFingerprint: string;
        source: ProjectContextSourceRef;
    };

function encode(value: unknown[]): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function encodeManifestId(projectSlug: string, corpusFingerprint: string): string {
    return encode([1, "manifest", projectSlug, corpusFingerprint]);
}

export function encodeRegistryIndexId(projectSlug: string, corpusFingerprint: string): string {
    return encode([1, "registry_index", projectSlug, corpusFingerprint]);
}

export function encodeRegistryPageId(
    projectSlug: string,
    corpusFingerprint: string,
    pageNumber: number,
): string {
    return encode([1, "registry_page", projectSlug, corpusFingerprint, pageNumber]);
}

export function encodeSourceId(
    projectSlug: string,
    corpusFingerprint: string,
    source: ProjectContextSourceRef,
): string {
    return encode([1, "source", projectSlug, corpusFingerprint, source.sourceKind, source.sourceId]);
}

export function decodeResultId(id: string): ProjectMemoryResultId {
    try {
        if (id.length > 4_096 || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("invalid encoding");
        const bytes = Buffer.from(id, "base64url");
        if (bytes.toString("base64url") !== id) throw new Error("non-canonical encoding");
        const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
        if (!Array.isArray(parsed) || parsed[0] !== 1 || !SLUG.test(String(parsed[2])) || !FINGERPRINT.test(String(parsed[3]))) {
            throw new Error("invalid identity");
        }
        if (parsed.length === 4 && parsed[1] === "manifest") {
            return {
                version: 1,
                type: "manifest",
                projectSlug: parsed[2] as string,
                corpusFingerprint: parsed[3] as string,
            };
        }
        if (parsed.length === 4 && parsed[1] === "registry_index") {
            return {
                version: 1,
                type: "registry_index",
                projectSlug: parsed[2] as string,
                corpusFingerprint: parsed[3] as string,
            };
        }
        if (
            parsed.length === 5
            && parsed[1] === "registry_page"
            && Number.isSafeInteger(parsed[4])
            && (parsed[4] as number) >= 1
            && (parsed[4] as number) <= 1_000_000
        ) {
            return {
                version: 1,
                type: "registry_page",
                projectSlug: parsed[2] as string,
                corpusFingerprint: parsed[3] as string,
                pageNumber: parsed[4] as number,
            };
        }
        if (
            parsed.length === 6 &&
            parsed[1] === "source" &&
            SOURCE_KINDS.has(parsed[4] as ProjectContextSourceKind) &&
            typeof parsed[5] === "string" &&
            parsed[5].length > 0
        ) {
            return {
                version: 1,
                type: "source",
                projectSlug: parsed[2] as string,
                corpusFingerprint: parsed[3] as string,
                source: { sourceKind: parsed[4] as ProjectContextSourceKind, sourceId: parsed[5] },
            };
        }
        throw new Error("invalid identity");
    } catch {
        throw new McpBridgeError("INVALID_RESULT_ID", "Unknown or malformed result ID");
    }
}
