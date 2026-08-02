import type { ProjectDocBlockType, ProjectDocumentationBlock, ProjectDocBlockEditablePayload } from "@/lib/types";

export const PROJECT_DOC_BLOCKS_STORAGE_KEY = "workos_projects_docs_v1";

const BLOCK_TYPES = new Set<ProjectDocBlockType>([
    "brief",
    "process_note",
    "sop",
    "structure",
    "decision",
    "milestone",
    "issue_fix",
    "publish",
    "qa_review"
]);

type StorageReader = Pick<Storage, "getItem">;
type FetchImplementation = typeof fetch;

export type ProjectDocBlocksSource = "api" | "fallback";
export type ProjectDocBlocksFallbackReason = "network" | "timeout" | "server";

export type ProjectDocBlocksLoadResult =
    | {
        status: "success";
        source: ProjectDocBlocksSource;
        blocks: ProjectDocumentationBlock[];
        fallbackReason?: ProjectDocBlocksFallbackReason;
    }
    | {
        status: "error";
        source: ProjectDocBlocksSource;
        blocks: [];
        message: string;
        httpStatus?: number;
        fallbackReason?: ProjectDocBlocksFallbackReason;
    };

export type LoadProjectDocBlocksInput = {
    projectId: string;
    projectSlug: string;
    status?: "active" | "archived" | "all";
    signal?: AbortSignal;
    timeoutMs?: number;
    fetchImpl?: FetchImplementation;
    storage?: StorageReader | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === "string");
}

function optionalString(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || typeof value === "string";
}

function optionalNumber(value: unknown): value is number | null | undefined {
    return value === undefined || value === null || Number.isInteger(value);
}

function parseBlock(
    value: unknown,
    projectSlug: string,
    expectedProjectId?: string
): ProjectDocumentationBlock | null {
    if (!isRecord(value)) return null;
    if (typeof value.id !== "string" || typeof value.title !== "string") return null;
    if (typeof value.date !== "string" || typeof value.details !== "string") return null;
    if (typeof value.summary !== "string" || typeof value.createdAt !== "string") return null;
    if (typeof value.updatedAt !== "string" || typeof value.status !== "string") return null;
    if (value.status !== "active" && value.status !== "archived") return null;
    if (typeof value.type !== "string" || !BLOCK_TYPES.has(value.type as ProjectDocBlockType)) return null;
    if (!isStringArray(value.evidenceLinks) || !isStringArray(value.relatedFiles)) return null;
    if (!optionalString(value.legacyProjectSlug) || !optionalString(value.importSource)) return null;
    if (!optionalString(value.importBatchId) || !optionalString(value.migratedAt)) return null;
    if (!optionalString(value.sourceRecordId) || !optionalNumber(value.sourceRowNumber)) return null;
    if (!optionalString(value.nextAction) || !optionalNumber(value.orderIndex)) return null;
    if (!optionalString(value.sourceText) || !optionalString(value.sourceExcerpt)) return null;
    if (!optionalString(value.sourceType) || !optionalString(value.generatedBy)) return null;
    if (!optionalString(value.appliedAt)) return null;
    if (value.reviewedByUser !== undefined && typeof value.reviewedByUser !== "boolean") return null;
    if (
        typeof value.sourceType === "string" &&
        !["manual_paste", "walkthrough", "commit_log", "qa_report", "publish_log", "chat_summary"].includes(value.sourceType)
    ) return null;
    if (value.generatedBy !== undefined && value.generatedBy !== null && value.generatedBy !== "arbor" && value.generatedBy !== "arbor_assistant") return null;

    let resolvedProjectSlug = projectSlug;
    if (expectedProjectId !== undefined) {
        if (value.projectId !== expectedProjectId) return null;
    } else {
        if (typeof value.projectSlug !== "string") return null;
        resolvedProjectSlug = value.projectSlug;
    }

    return {
        id: value.id,
        projectId: expectedProjectId,
        projectSlug: resolvedProjectSlug,
        legacyProjectSlug: typeof value.legacyProjectSlug === "string" ? value.legacyProjectSlug : null,
        type: value.type as ProjectDocBlockType,
        title: value.title,
        date: value.date,
        summary: value.summary,
        details: value.details,
        evidenceLinks: [...value.evidenceLinks],
        relatedFiles: [...value.relatedFiles],
        status: value.status,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        ...(typeof value.nextAction === "string" && { nextAction: value.nextAction }),
        ...(typeof value.orderIndex === "number" && { orderIndex: value.orderIndex }),
        ...(typeof value.sourceText === "string" && { sourceText: value.sourceText }),
        ...(typeof value.sourceExcerpt === "string" && { sourceExcerpt: value.sourceExcerpt }),
        ...(typeof value.sourceType === "string" && { sourceType: value.sourceType as ProjectDocumentationBlock["sourceType"] }),
        ...((value.generatedBy === "arbor" || value.generatedBy === "arbor_assistant") && { generatedBy: value.generatedBy }),
        ...(typeof value.reviewedByUser === "boolean" && { reviewedByUser: value.reviewedByUser }),
        ...(typeof value.appliedAt === "string" && { appliedAt: value.appliedAt }),
        importSource: typeof value.importSource === "string" ? value.importSource : null,
        importBatchId: typeof value.importBatchId === "string" ? value.importBatchId : null,
        migratedAt: typeof value.migratedAt === "string" ? value.migratedAt : null,
        sourceRowNumber: typeof value.sourceRowNumber === "number" ? value.sourceRowNumber : null,
        sourceRecordId: typeof value.sourceRecordId === "string" ? value.sourceRecordId : null
    };
}

function resolveStorage(storage: StorageReader | null | undefined): StorageReader | null {
    if (storage !== undefined) return storage;
    return typeof window === "undefined" ? null : window.localStorage;
}

function loadFallback(
    input: LoadProjectDocBlocksInput,
    reason: ProjectDocBlocksFallbackReason
): ProjectDocBlocksLoadResult {
    const storage = resolveStorage(input.storage);
    if (!storage) {
        return { status: "success", source: "fallback", blocks: [], fallbackReason: reason };
    }

    let raw: string | null;
    try {
        raw = storage.getItem(PROJECT_DOC_BLOCKS_STORAGE_KEY);
    } catch {
        return {
            status: "error",
            source: "fallback",
            blocks: [],
            message: "ไม่สามารถอ่านข้อมูลสำรองจากเบราว์เซอร์ได้",
            fallbackReason: reason
        };
    }

    if (raw === null) {
        return { status: "success", source: "fallback", blocks: [], fallbackReason: reason };
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("Invalid root");
        const validated = parsed.map(item => parseBlock(item, input.projectSlug));
        if (validated.some(item => item === null)) throw new Error("Invalid record");
        return {
            status: "success",
            source: "fallback",
            blocks: validated
                .filter((block): block is ProjectDocumentationBlock => block !== null)
                .filter(block => block.projectSlug === input.projectSlug)
                .filter(block => {
                    const statusVal = input.status ?? "active";
                    if (statusVal === "all") return true;
                    return block.status === statusVal;
                }),
            fallbackReason: reason
        };
    } catch {
        return {
            status: "error",
            source: "fallback",
            blocks: [],
            message: "ข้อมูลสำรองในเบราว์เซอร์ไม่ถูกต้อง",
            fallbackReason: reason
        };
    }
}

export async function loadProjectDocBlocks(
    input: LoadProjectDocBlocksInput
): Promise<ProjectDocBlocksLoadResult> {
    const fetchImpl = input.fetchImpl ?? fetch;
    const timeoutMs = input.timeoutMs ?? 8_000;
    const controller = new AbortController();
    let timedOut = false;
    const abortFromParent = () => controller.abort(input.signal?.reason);
    input.signal?.addEventListener("abort", abortFromParent, { once: true });
    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        const statusVal = input.status ?? "active";
        const response = await fetchImpl(
            `/api/projects/${encodeURIComponent(input.projectId)}/doc-blocks?status=${encodeURIComponent(statusVal)}`,
            { cache: "no-store", signal: controller.signal }
        );

        if (response.status >= 500 && response.status <= 599) {
            return loadFallback(input, "server");
        }
        if (!response.ok) {
            return {
                status: "error",
                source: "api",
                blocks: [],
                message: "ไม่สามารถโหลด Project Documentation ได้",
                httpStatus: response.status
            };
        }

        let payload: unknown;
        try {
            payload = await response.json();
        } catch {
            return {
                status: "error",
                source: "api",
                blocks: [],
                message: "รูปแบบข้อมูล Project Documentation จาก API ไม่ถูกต้อง"
            };
        }
        if (!Array.isArray(payload)) {
            return {
                status: "error",
                source: "api",
                blocks: [],
                message: "รูปแบบข้อมูล Project Documentation จาก API ไม่ถูกต้อง"
            };
        }

        const blocks = payload.map(item => parseBlock(item, input.projectSlug, input.projectId));
        if (blocks.some(block => block === null)) {
            return {
                status: "error",
                source: "api",
                blocks: [],
                message: "รูปแบบข้อมูล Project Documentation จาก API ไม่ถูกต้อง"
            };
        }

        return {
            status: "success",
            source: "api",
            blocks: blocks.filter((block): block is ProjectDocumentationBlock => block !== null)
        };
    } catch (error) {
        if (input.signal?.aborted) throw error;
        return loadFallback(input, timedOut ? "timeout" : "network");
    } finally {
        clearTimeout(timeoutId);
        input.signal?.removeEventListener("abort", abortFromParent);
    }
}

export type ProjectDocBlocksRequestTicket = {
    signal: AbortSignal;
    isCurrent: () => boolean;
};

export function createProjectDocBlocksRequestGuard() {
    let version = 0;
    let controller: AbortController | null = null;

    return {
        begin(): ProjectDocBlocksRequestTicket {
            controller?.abort();
            controller = new AbortController();
            const requestVersion = ++version;
            return {
                signal: controller.signal,
                isCurrent: () => requestVersion === version && !controller?.signal.aborted
            };
        },
        cancel() {
            version += 1;
            controller?.abort();
            controller = null;
        }
    };
}

export class ProjectDocBlockMutationException extends Error {
    status: number;
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "SERVER_ERROR";

    constructor(status: number, message: string, code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "SERVER_ERROR") {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "ProjectDocBlockMutationException";
    }
}

async function handleMutationResponse(response: Response, projectSlug: string, expectedProjectId: string): Promise<ProjectDocumentationBlock> {
    if (!response.ok) {
        let errorMsg = "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
        try {
            const body = await response.json();
            if (body && typeof body.error === "string") {
                errorMsg = body.error;
            }
        } catch {}

        let code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "SERVER_ERROR" = "SERVER_ERROR";
        if (response.status === 400) code = "VALIDATION_ERROR";
        else if (response.status === 404) code = "NOT_FOUND";
        else if (response.status === 409) code = "CONFLICT";

        throw new ProjectDocBlockMutationException(response.status, errorMsg, code);
    }

    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        throw new ProjectDocBlockMutationException(500, "รูปแบบข้อมูลการตอบกลับไม่ถูกต้อง", "SERVER_ERROR");
    }

    const validated = parseBlock(payload, projectSlug, expectedProjectId);
    if (!validated) {
        throw new ProjectDocBlockMutationException(500, "รูปแบบข้อมูลการตอบกลับไม่ถูกต้อง", "SERVER_ERROR");
    }

    return validated;
}

export async function createProjectDocBlockOnClient(
    projectId: string,
    projectSlug: string,
    payload: Omit<ProjectDocumentationBlock, "id" | "createdAt" | "updatedAt">
): Promise<ProjectDocumentationBlock> {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/doc-blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return handleMutationResponse(response, projectSlug, projectId);
}

export async function updateProjectDocBlockOnClient(
    projectId: string,
    projectSlug: string,
    blockId: string,
    expectedUpdatedAt: string,
    payload: ProjectDocBlockEditablePayload
): Promise<ProjectDocumentationBlock> {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/doc-blocks/${encodeURIComponent(blockId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, expectedUpdatedAt })
    });
    return handleMutationResponse(response, projectSlug, projectId);
}

export async function archiveProjectDocBlockOnClient(
    projectId: string,
    projectSlug: string,
    blockId: string,
    expectedUpdatedAt: string
): Promise<ProjectDocumentationBlock> {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/doc-blocks/${encodeURIComponent(blockId)}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt })
    });
    return handleMutationResponse(response, projectSlug, projectId);
}

export async function restoreProjectDocBlockOnClient(
    projectId: string,
    projectSlug: string,
    blockId: string,
    expectedUpdatedAt: string
): Promise<ProjectDocumentationBlock> {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/doc-blocks/${encodeURIComponent(blockId)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt })
    });
    return handleMutationResponse(response, projectSlug, projectId);
}
