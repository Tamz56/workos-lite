import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
    approveEntity,
    createDryRun,
    executeEntity,
    formatFileSize,
    getApprovals,
    getBatchDetail,
    listBatches,
    listRows,
    rejectEntity,
    revokeEntity,
    validateUploadFile,
} from "@/lib/project-import/client/projectImportApiClient";
import { ProjectImportUiException } from "@/lib/project-import/client/projectImportUiErrors";
import {
    apiErrorFromBody,
    httpStatusError,
} from "@/lib/project-import/client/projectImportUiErrors";
import {
    classificationLabel,
    countEligibleNewRows,
    deriveBatchPresentation,
    deriveEntityPresentation,
    hasUnresolvedBlockingRows,
    isApprovalValid,
    remainingTtlMinutes,
} from "@/lib/project-import/client/projectImportUiState";

const PASSWORD = "s3cret";

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function errorBody(code: string, status: number, requestId?: string): unknown {
    return { ok: false, error: { code, message: "safe message", status, ...(requestId ? { requestId } : {}) } };
}

describe("Project Import UI client boundary", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFetch = vi.fn();
        vi.stubGlobal("fetch", mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("adds the x-agent-password header to every request and never logs it", async () => {
        mockFetch.mockResolvedValue(jsonResponse({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
        await listBatches(PASSWORD);
        const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toContain("/api/project-import/batches");
        expect((init.headers as Record<string, string>)["x-agent-password"]).toBe(PASSWORD);
        expect(String(init.body ?? "")).not.toContain(PASSWORD);
    });

    it("uploads a workbook as multipart without storing bytes in the client", async () => {
        mockFetch.mockResolvedValue(
            jsonResponse({
                batchId: "batch-1",
                dryRunId: "dry-1",
                createdAt: "2026-08-06T00:00:00.000Z",
                source: {
                    filename: "fixture.xlsx",
                    sanitizedFilename: "fixture.xlsx",
                    fileHashExcerpt: "abcd1234",
                    fileSize: 100,
                    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    schemaVersion: "v1",
                    workbookId: "WB-1",
                    batchReference: null,
                },
                workbookStatus: "valid",
                entities: {
                    projectDocumentation: { entityType: "project_documentation", status: "ready", totalRows: 2, newRows: 2, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0 },
                    backlog: { entityType: "backlog", status: "ready", totalRows: 2, newRows: 2, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0 },
                },
                totals: { totalPhysicalRows: 4, totalCandidateRows: 4, validParserRows: 4, newRows: 4, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0, warningCount: 0, errorCount: 0 },
                issues: [],
                noBusinessWritePerformed: true,
            }),
        );
        const file = new File([new Uint8Array(100)], "fixture.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const result = await createDryRun(file, PASSWORD);
        expect(result.batchId).toBe("batch-1");
        const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe("POST");
        expect(init.body).toBeInstanceOf(FormData);
        expect((init.headers as Record<string, string>)["x-agent-password"]).toBe(PASSWORD);
    });

    it("sends x-agent-password with FormData without manually setting Content-Type", async () => {
        const mockResponse = jsonResponse({
            batchId: "batch-1",
            dryRunId: "dry-1",
            createdAt: "2026-08-06T00:00:00.000Z",
            source: { filename: "f.xlsx", sanitizedFilename: "f.xlsx", fileHashExcerpt: "abcd", fileSize: 1, mimeType: "x", schemaVersion: "v1", workbookId: null, batchReference: null },
            workbookStatus: "valid",
            entities: { projectDocumentation: { entityType: "project_documentation", status: "ready", totalRows: 1, newRows: 1, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0 }, backlog: { entityType: "backlog", status: "ready", totalRows: 1, newRows: 1, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0 } },
            totals: { totalPhysicalRows: 2, totalCandidateRows: 2, validParserRows: 2, newRows: 2, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0, warningCount: 0, errorCount: 0 },
            issues: [],
            noBusinessWritePerformed: true,
        });
        mockFetch.mockImplementation(() => Promise.resolve(mockResponse));
        const file = new File([new Uint8Array(4)], "f.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        await createDryRun(file, PASSWORD);
        const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect((init.headers as Record<string, string>)["x-agent-password"]).toBe(PASSWORD);
        expect(init.body).toBeInstanceOf(FormData);
        const headerKeys = Object.keys(init.headers as Record<string, string>);
        expect(headerKeys.some((key) => key.toLowerCase() === "content-type")).toBe(false);
    });

    it("parses API error bodies into typed UI errors", async () => {
        mockFetch.mockResolvedValue(jsonResponse(errorBody("IMPORT_EXECUTE_FORBIDDEN", 403, "req-1"), 403));
        try {
            await executeEntity("batch-1", "project_documentation", "apr-1", PASSWORD);
            throw new Error("expected rejection");
        } catch (error) {
            expect(error).toBeInstanceOf(ProjectImportUiException);
            const ui = error as ProjectImportUiException;
            expect(ui.code).toBe("IMPORT_EXECUTE_FORBIDDEN");
            expect(ui.status).toBe(403);
            expect(ui.requestId).toBe("req-1");
            expect(JSON.stringify(error)).not.toContain(PASSWORD);
        }
    });

    it("parses 409 conflict responses without leaking SQL", async () => {
        mockFetch.mockResolvedValue(jsonResponse(errorBody("EXECUTION_STALE_DUPLICATE", 409), 409));
        try {
            await executeEntity("batch-1", "backlog", "apr-1", PASSWORD);
            throw new Error("expected rejection");
        } catch (error) {
            expect((error as ProjectImportUiException).code).toBe("EXECUTION_STALE_DUPLICATE");
            expect(JSON.stringify(error)).not.toContain("SqliteError");
            expect(JSON.stringify(error)).not.toContain("/Users/");
        }
    });

    it("treats network failure as an uncertain state, not success", async () => {
        mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));
        try {
            await executeEntity("batch-1", "project_documentation", "apr-1", PASSWORD);
            throw new Error("expected rejection");
        } catch (error) {
            const ui = error as ProjectImportUiException;
            expect(ui.kind).toBe("network");
            expect(ui.status).toBeNull();
        }
    });

    it("posts approval actions with correct endpoints and bodies", async () => {
        mockFetch.mockImplementation(() => Promise.resolve(jsonResponse({ ok: true, approvalId: "apr-1", approvalStatus: "approved" })));
        await approveEntity("batch-1", "project_documentation", PASSWORD);
        const [approveUrl, approveInit] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(approveUrl).toBe("/api/project-import/batches/batch-1/approvals/project_documentation/approve");
        expect((approveInit.body as string).includes("approvedBy")).toBe(false);

        await rejectEntity("batch-1", "backlog", PASSWORD, "ไม่พร้อม");
        const [, rejectInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        expect(JSON.parse(String(rejectInit.body))).toEqual({ reason: "ไม่พร้อม" });

        await revokeEntity("batch-1", "backlog", PASSWORD);
        const [revokeUrl] = mockFetch.mock.calls[2] as [string, RequestInit];
        expect(revokeUrl).toContain("/revoke");
    });

    it("reads history, detail, approvals and rows with the password header", async () => {
        mockFetch.mockImplementation(() => Promise.resolve(jsonResponse({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 })));
        await listBatches(PASSWORD);
        await listRows("batch-1", PASSWORD, { page: 2, entityType: "backlog", hasErrors: true });
        const rowUrl = mockFetch.mock.calls[1][0] as string;
        expect(rowUrl).toContain("page=2");
        expect(rowUrl).toContain("entityType=backlog");
        expect(rowUrl).toContain("hasErrors=1");

        mockFetch.mockImplementation(() => Promise.resolve(jsonResponse({ id: "batch-1", approvals: [], executionAttempts: { count: 0, byStatus: {} } })));
        await getBatchDetail("batch-1", PASSWORD);
        mockFetch.mockImplementation(() => Promise.resolve(jsonResponse({ entities: [] })));
        await getApprovals("batch-1", PASSWORD);
    });

    it("sends entityType in the rows query so each entity is isolated", async () => {
        mockFetch.mockImplementation(() =>
            Promise.resolve(jsonResponse({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 0 })),
        );
        await listRows("batch-1", PASSWORD, { page: 1, entityType: "project_documentation" });
        const docUrl = mockFetch.mock.calls[0][0] as string;
        expect(docUrl).toContain("entityType=project_documentation");
        await listRows("batch-1", PASSWORD, { page: 1, entityType: "backlog" });
        const backlogUrl = mockFetch.mock.calls[1][0] as string;
        expect(backlogUrl).toContain("entityType=backlog");
        expect(backlogUrl).not.toContain("entityType=project_documentation");
    });

    it("validates upload files before any request", async () => {
        const badExt = new File([""], "file.txt");
        expect(validateUploadFile(badExt)).toContain(".xlsx");
        const oversized = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "big.xlsx");
        expect(validateUploadFile(oversized)).toContain("25 MB");
        const ok = new File([""], "good.xlsx");
        expect(validateUploadFile(ok)).toBeNull();
        expect(formatFileSize(2048)).toBe("2.0 KB");
    });
});

describe("POST-GATE-8-UX-001C derived presentation helpers", () => {
    it("duplicate-only entity → no-action, muted (Test 3)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "ready",
            eligibleRows: 0,
            duplicateRows: 2,
            warningCount: 0,
        });
        expect(presentation.state).toBe("duplicate_only_no_action");
        expect(presentation.label).toBe("ซ้ำทั้งหมด — ไม่ต้องดำเนินการ");
        expect(presentation.tone).toBe("muted");
    });

    it("actionable clean entity → พร้อมอนุมัติ (Test 7)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "ready",
            eligibleRows: 2,
            duplicateRows: 0,
            warningCount: 0,
        });
        expect(presentation.state).toBe("actionable_ready");
        expect(presentation.label).toBe("พร้อมอนุมัติ");
        expect(presentation.tone).toBe("info");
    });

    it("actionable with warning → warning presentation (Test 8)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "ready_with_warnings",
            eligibleRows: 1,
            duplicateRows: 0,
            warningCount: 1,
        });
        expect(presentation.state).toBe("actionable_with_warnings");
        expect(presentation.label).toBe("พร้อมอนุมัติ — มีคำเตือน");
        expect(presentation.tone).toBe("warning");
    });

    it("manual review rows override no-action even with zero eligible rows (Test 10)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "ready",
            eligibleRows: 0,
            duplicateRows: 1,
            warningCount: 0,
            rowStates: [{ dryRunStatus: "review_required" }],
        });
        expect(presentation.state).toBe("manual_review");
        expect(presentation.label).toBe("ต้องตรวจสอบ");
    });

    it("invalid rows are never benign no-action (Test 10b)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "ready",
            eligibleRows: 0,
            duplicateRows: 0,
            warningCount: 0,
            rowStates: [{ dryRunStatus: "invalid" }],
        });
        expect(presentation.state).toBe("manual_review");
        expect(presentation.label).toBe("ไม่ถูกต้อง");
    });

    it("blocked entity stays blocked (Test 9)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "blocked",
            eligibleRows: 0,
            duplicateRows: 0,
            warningCount: 0,
        });
        expect(presentation.state).toBe("blocked");
    });

    it("historical ready_with_warnings + warningCount 0 falls back to raw status (Test 11)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "ready_with_warnings",
            eligibleRows: 0,
            duplicateRows: 2,
            warningCount: 0,
        });
        expect(presentation.state).toBe("historical_fallback");
        expect(presentation.label).toBe("ready_with_warnings");
    });

    it("empty entity is not labeled duplicate-only (Test 12)", () => {
        const presentation = deriveEntityPresentation({
            entityStatus: "ready",
            eligibleRows: 0,
            duplicateRows: 0,
            warningCount: 0,
        });
        expect(presentation.state).toBe("no_items");
        expect(presentation.label).toBe("ไม่มีรายการต้องนำเข้า");
        expect(presentation.label).not.toContain("ซ้ำทั้งหมด");
    });

    it("batch with both entities duplicate-only → ไม่มีรายการต้องนำเข้า (Test 5)", () => {
        const presentation = deriveBatchPresentation({
            batchStatus: "ready_for_approval",
            projectDocumentationStatus: "ready",
            backlogStatus: "ready",
            totals: {
                totalRows: 2,
                newRows: 0,
                duplicateRows: 2,
                conflictRows: 0,
                reviewRequiredRows: 0,
                invalidRows: 0,
                warningCount: 0,
            },
        });
        expect(presentation).toEqual({ label: "ไม่มีรายการต้องนำเข้า", tone: "muted" });
    });

    it("mixed batch stays actionable (Test 6)", () => {
        const presentation = deriveBatchPresentation({
            batchStatus: "ready_for_approval",
            projectDocumentationStatus: "ready",
            backlogStatus: "ready",
            totals: {
                totalRows: 2,
                newRows: 1,
                duplicateRows: 1,
                conflictRows: 0,
                reviewRequiredRows: 0,
                invalidRows: 0,
                warningCount: 0,
            },
        });
        expect(presentation).toEqual({ label: "พร้อมอนุมัติ", tone: "info" });
    });

    it("batch with review-required rows is never no-action (Test 10 batch)", () => {
        const presentation = deriveBatchPresentation({
            batchStatus: "ready_for_approval",
            projectDocumentationStatus: "ready",
            backlogStatus: "ready",
            totals: {
                totalRows: 1,
                newRows: 0,
                duplicateRows: 0,
                conflictRows: 1,
                reviewRequiredRows: 0,
                invalidRows: 0,
                warningCount: 1,
            },
        });
        expect(presentation).toEqual({ label: "ต้องตรวจสอบ", tone: "warning" });
    });

    it("later lifecycle batches are not derived (raw fallback via caller) (Test 11 batch)", () => {
        const presentation = deriveBatchPresentation({
            batchStatus: "executed",
            projectDocumentationStatus: "executed",
            backlogStatus: "executed",
            totals: {
                totalRows: 2,
                newRows: 2,
                duplicateRows: 0,
                conflictRows: 0,
                reviewRequiredRows: 0,
                invalidRows: 0,
                warningCount: 0,
            },
        });
        expect(presentation).toBeNull();
    });
});

describe("POST-GATE-8-UX-002C unresolved blocking rows helper", () => {
    it("treats new, duplicate and skipped as non-blocking", () => {
        expect(
            hasUnresolvedBlockingRows([
                { dryRunStatus: "new" },
                { dryRunStatus: "duplicate" },
                { dryRunStatus: "skipped" },
            ]),
        ).toBe(false);
    });

    it("treats conflict, review_required and invalid as blocking", () => {
        expect(hasUnresolvedBlockingRows([{ dryRunStatus: "conflict" }])).toBe(true);
        expect(hasUnresolvedBlockingRows([{ dryRunStatus: "review_required" }])).toBe(true);
        expect(hasUnresolvedBlockingRows([{ dryRunStatus: "invalid" }])).toBe(true);
    });

    it("mixed new + duplicate stays non-blocking", () => {
        expect(hasUnresolvedBlockingRows([{ dryRunStatus: "new" }, { dryRunStatus: "duplicate" }])).toBe(false);
    });

    it("mixed new + blocking rows is blocking", () => {
        expect(hasUnresolvedBlockingRows([{ dryRunStatus: "new" }, { dryRunStatus: "conflict" }])).toBe(true);
        expect(hasUnresolvedBlockingRows([{ dryRunStatus: "new" }, { dryRunStatus: "review_required" }])).toBe(true);
        expect(hasUnresolvedBlockingRows([{ dryRunStatus: "new" }, { dryRunStatus: "invalid" }])).toBe(true);
    });

    it("empty and null inputs are non-blocking", () => {
        expect(hasUnresolvedBlockingRows([])).toBe(false);
        expect(hasUnresolvedBlockingRows(null)).toBe(false);
        expect(hasUnresolvedBlockingRows(undefined)).toBe(false);
    });
});

describe("Project Import UI state helpers", () => {
    it("validates approval only when effective status is approved and valid now", () => {
        expect(isApprovalValid({ effectiveStatus: "approved", isValidNow: true, expiresAt: "2026-08-06T00:30:00.000Z" })).toBe(true);
        expect(isApprovalValid({ effectiveStatus: "expired", isValidNow: false, expiresAt: null })).toBe(false);
        expect(isApprovalValid(null)).toBe(false);
    });

    it("computes remaining TTL in minutes from server timestamps", () => {
        expect(remainingTtlMinutes({ expiresAt: "2026-08-06T00:30:00.000Z", validityAt: "2026-08-06T00:15:00.000Z" })).toBe(15);
        expect(remainingTtlMinutes({ expiresAt: null, validityAt: "2026-08-06T00:15:00.000Z" })).toBeNull();
    });

    it("classifies rows without implying duplicate is an error", () => {
        expect(classificationLabel("duplicate").tone).toBe("no-action");
        expect(classificationLabel("invalid").tone).toBe("blocked");
        expect(classificationLabel("new").tone).toBe("ready");
        expect(classificationLabel("conflict").tone).toBe("manual");
    });

    it("counts eligible new rows from an entity-scoped page only", () => {
        const page = {
            items: [
                { id: "1", entityType: "project_documentation" as const, worksheetName: "01", sourceRowNumber: 7, externalRowId: "ARBOR-QA-DOC-001", projectSlug: "s", resolvedProjectId: "p", parserStatus: "valid", dryRunStatus: "new", proposedOperation: "insert", warningCount: 0, errorCount: 0, issueCodes: [], existingRecordReference: null, executionStatus: "not_started", targetRecordId: null },
                { id: "2", entityType: "project_documentation" as const, worksheetName: "01", sourceRowNumber: 8, externalRowId: "ARBOR-QA-BACKLOG-001", projectSlug: "s", resolvedProjectId: "p", parserStatus: "valid", dryRunStatus: "new", proposedOperation: "insert", warningCount: 0, errorCount: 0, issueCodes: [], existingRecordReference: null, executionStatus: "not_started", targetRecordId: null },
            ],
            page: 1,
            pageSize: 25,
            totalItems: 2,
            totalPages: 1,
        };
        // Batch-global view would count 2; entity-scoped helper must count rows
        // filtered by the caller (e.g. only ARBOR-QA-DOC-001) — here we pass a
        // page that still contains both, proving the helper only counts new+insert.
        expect(countEligibleNewRows(page)).toBe(2);
        expect(countEligibleNewRows(null)).toBe(0);
        const withDuplicate = {
            ...page,
            items: [
                { ...page.items[0], dryRunStatus: "duplicate" as const, proposedOperation: "none" as const },
                page.items[1],
            ],
        };
        expect(countEligibleNewRows(withDuplicate)).toBe(1);
    });
});

describe("Dry-run request error normalization", () => {
    it("normalizes a nested error envelope", () => {
        const error = apiErrorFromBody({ ok: false, error: { code: "WORKBOOK_PARSE_FAILED", message: "safe", status: 400 } }, 400);
        expect(error.code).toBe("WORKBOOK_PARSE_FAILED");
        expect(error.status).toBe(400);
        expect(error.message).toBe("safe");
    });

    it("normalizes a top-level error envelope", () => {
        const error = apiErrorFromBody({ code: "FILE_TOO_LARGE", message: "big", status: 400 }, 400);
        expect(error.code).toBe("FILE_TOO_LARGE");
        expect(error.status).toBe(400);
    });

    it("falls back to HTTP_<status> for an empty error body", () => {
        const error = apiErrorFromBody({ ok: false }, 409);
        expect(error.code).toBe("HTTP_409");
        expect(error.status).toBe(409);
    });

    it("preserves code and status for 500 responses", () => {
        const error = apiErrorFromBody({ error: { code: "IMPORT_BATCH_PERSISTENCE_FAILED", message: "x", status: 500 } }, 500);
        expect(error.code).toBe("IMPORT_BATCH_PERSISTENCE_FAILED");
        expect(error.status).toBe(500);
    });

    it("never leaks the password through error normalization", () => {
        const error = apiErrorFromBody({ error: { code: "AUTH_REQUIRED", message: "กรุณากรอก Agent Password", status: 401 } }, 401);
        expect(JSON.stringify(error)).not.toContain("s3cret");
    });

    it("httpStatusError produces a typed HTTP fallback", () => {
        const error = httpStatusError(503);
        expect(error.code).toBe("HTTP_503");
        expect(error.status).toBe(503);
        expect(error).toBeInstanceOf(ProjectImportUiException);
    });

    it("maps a fetch rejection (any browser wording) to IMPORT_NETWORK_ERROR", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network request failed")));
        const file = new File([""], "f.xlsx");
        try {
            await createDryRun(file, PASSWORD);
            throw new Error("expected rejection");
        } catch (error) {
            expect((error as ProjectImportUiException).code).toBe("IMPORT_NETWORK_ERROR");
            expect((error as ProjectImportUiException).kind).toBe("network");
        }
        vi.unstubAllGlobals();
    });

    it("maps a non-JSON error response to HTTP_<status>", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response("<html>proxy error</html>", { status: 502, headers: { "Content-Type": "text/html" } }),
            ),
        );
        const file = new File([""], "f.xlsx");
        try {
            await createDryRun(file, PASSWORD);
            throw new Error("expected rejection");
        } catch (error) {
            expect((error as ProjectImportUiException).code).toBe("HTTP_502");
            expect((error as ProjectImportUiException).status).toBe(502);
        }
        vi.unstubAllGlobals();
    });

    it("maps an invalid success DTO to IMPORT_INVALID_SUCCESS_DTO instead of UNKNOWN", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true, notBatch: true })));
        const file = new File([""], "f.xlsx");
        try {
            await createDryRun(file, PASSWORD);
            throw new Error("expected rejection");
        } catch (error) {
            expect((error as ProjectImportUiException).code).toBe("IMPORT_INVALID_SUCCESS_DTO");
            expect((error as ProjectImportUiException).status).toBe(200);
        }
        vi.unstubAllGlobals();
    });
});
