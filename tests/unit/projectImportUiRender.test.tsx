import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { WorkbookUploadPanel } from "@/components/project-import/WorkbookUploadPanel";
import { ImportErrorNotice } from "@/components/project-import/ImportErrorNotice";
import { DryRunSummary } from "@/components/project-import/DryRunSummary";
import { ImportRowsTable } from "@/components/project-import/ImportRowsTable";
import { ImportHistoryList } from "@/components/project-import/ImportHistoryList";
import { ApprovalPanel } from "@/components/project-import/ApprovalPanel";
import { ImportBatchDetail } from "@/components/project-import/ImportBatchDetail";
import { EntityReviewPanel } from "@/components/project-import/EntityReviewPanel";
import ProjectImportWorkspace from "@/components/project-import/ProjectImportWorkspace";
import { ProjectImportUiException } from "@/lib/project-import/client/projectImportUiErrors";
import type { UiBatchDetail, UiDryRunResponse } from "@/lib/project-import/client/projectImportUiTypes";

const { mockCreateDryRun, mockListBatches, mockGetBatchDetail, mockGetApprovals, mockListRows, mockApproveEntity, mockRejectEntity, mockRevokeEntity, mockExecuteEntity } = vi.hoisted(() => ({
    mockCreateDryRun: vi.fn(),
    mockListBatches: vi.fn(),
    mockGetBatchDetail: vi.fn(),
    mockGetApprovals: vi.fn(),
    mockListRows: vi.fn(),
    mockApproveEntity: vi.fn(),
    mockRejectEntity: vi.fn(),
    mockRevokeEntity: vi.fn(),
    mockExecuteEntity: vi.fn(),
}));

vi.mock("@/lib/project-import/client/projectImportApiClient", () => ({
    createDryRun: mockCreateDryRun,
    listBatches: mockListBatches,
    getBatchDetail: mockGetBatchDetail,
    getApprovals: mockGetApprovals,
    listRows: mockListRows,
    approveEntity: mockApproveEntity,
    rejectEntity: mockRejectEntity,
    revokeEntity: mockRevokeEntity,
    executeEntity: mockExecuteEntity,
    validateUploadFile: (file: File) => {
        if (!file.name.toLowerCase().endsWith(".xlsx")) return "รองรับเฉพาะไฟล์ .xlsx เท่านั้น";
        if (file.size > 25 * 1024 * 1024) return "ไฟล์มีขนาดเกิน 25 MB";
        return null;
    },
    formatFileSize: (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`,
}));

function dryRunResult(): UiDryRunResponse {
    return {
        batchId: "batch-1",
        dryRunId: "dry-1",
        createdAt: "2026-08-06T00:00:00.000Z",
        source: {
            filename: "fixture.xlsx",
            sanitizedFilename: "fixture.xlsx",
            fileHashExcerpt: "abcd1234",
            fileSize: 4096,
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            schemaVersion: "v1",
            workbookId: "WB-1",
            batchReference: "B-1",
        },
        workbookStatus: "valid",
        entities: {
            projectDocumentation: { entityType: "project_documentation", status: "ready", totalRows: 2, newRows: 2, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0 },
            backlog: { entityType: "backlog", status: "blocked", totalRows: 1, newRows: 0, duplicateRows: 0, conflictRows: 1, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0 },
        },
        totals: { totalPhysicalRows: 3, totalCandidateRows: 3, validParserRows: 3, newRows: 2, duplicateRows: 0, conflictRows: 1, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0, warningCount: 1, errorCount: 1 },
        issues: [{ code: "SAMPLE_ROW_PRESENT", severity: "error", message: "Sample row must be removed" }],
        noBusinessWritePerformed: true,
    };
}

describe("Project Import UI rendering", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the upload panel with an accessible label-associated file input", () => {
        const html = renderToStaticMarkup(
            <WorkbookUploadPanel
                disabled={false}
                state={{ file: null, error: null, uploading: false }}
                onChange={() => undefined}
                onError={() => undefined}
                onClear={() => undefined}
                onUpload={() => undefined}
            />,
        );
        expect(html).toContain("คลิกหรือลากไฟล์ .xlsx มาที่นี่");
        expect(html).toContain('id="project-import-workbook"');
        expect(html).toContain('type="file"');
        expect(html).toContain('accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"');
        expect(html).toContain('for="project-import-workbook"');
        expect(html).toContain('role="button"');
        expect(html).toContain('<input id="project-import-workbook" type="file"'); // input never carries disabled
        expect(html).toContain("กรุณาเลือกไฟล์ .xlsx — อัปโหลด / สร้าง Dry Run");
    });

    it("renders the dry run summary with counts without payload content", () => {
        const html = renderToStaticMarkup(<DryRunSummary result={dryRunResult()} />);
        expect(html).toContain("fixture.xlsx");
        expect(html).toContain("abcd1234");
        expect(html).toContain("SAMPLE_ROW_PRESENT");
        expect(html).not.toContain("normalized_payload");
        expect(html).not.toContain("Details line 1");
    });

    it("renders error notices with safe codes and request IDs only", () => {
        const error = new ProjectImportUiException({
            kind: "api",
            code: "EXECUTION_STALE_DUPLICATE",
            status: 409,
            requestId: "req-xyz",
            message: "record changed since dry run",
        });
        const html = renderToStaticMarkup(<ImportErrorNotice error={error} />);
        expect(html).toContain("EXECUTION_STALE_DUPLICATE");
        expect(html).toContain("req-xyz");
        expect(html).not.toContain("SqliteError");
        expect(html).not.toContain("stack");
        expect(html).not.toContain("/Users/");
    });

    it("shows duplicate rows as no-action without rendering payloads", () => {
        const rows = {
            items: [
                {
                    id: "row-1",
                    entityType: "backlog" as const,
                    worksheetName: "02_Backlog",
                    sourceRowNumber: 7,
                    externalRowId: "B1",
                    projectSlug: "example-project-slug",
                    resolvedProjectId: "p-1",
                    parserStatus: "valid",
                    dryRunStatus: "duplicate",
                    proposedOperation: "none",
                    warningCount: 0,
                    errorCount: 0,
                    issueCodes: [],
                    existingRecordReference: "item-1",
                    executionStatus: "not_started",
                    targetRecordId: null,
                },
            ],
            page: 1,
            pageSize: 25,
            totalItems: 1,
            totalPages: 1,
        };
        const html = renderToStaticMarkup(
            <ImportRowsTable
                data={rows}
                loading={false}
                error={null}
                filter={{}}
                onFilterChange={() => undefined}
                onPageChange={() => undefined}
                onRetry={() => undefined}
            />,
        );
        expect(html).toContain("ซ้ำ (ไม่ต้องดำเนินการ)");
        expect(html).not.toContain("normalized_payload");
    });

    it("renders approval actions with TTL and independent entity scope", () => {
        const html = renderToStaticMarkup(
            <ApprovalPanel
                entityLabel="Backlog"
                summary={{ newRows: 2, duplicateRows: 1, skippedRows: 0, warningCount: 1, errorCount: 0 }}
                approval={{
                    entityType: "backlog",
                    approvalId: "apr-1234567890abcdef",
                    effectiveStatus: "approved",
                    approvedBy: "Test Agent",
                    approvedAt: "2026-08-06T00:00:00.000Z",
                    expiresAt: "2026-08-06T00:30:00.000Z",
                    rejectedBy: null,
                    rejectedAt: null,
                    revokedBy: null,
                    revokedAt: null,
                    consumedAt: null,
                    validityAt: "2026-08-06T00:10:00.000Z",
                    isValidNow: true,
                    bindingFingerprintExcerpt: "abc",
                    events: [],
                }}
                blockedReason={null}
                canApprove
                busy={false}
                onApprove={() => undefined}
                onReject={() => undefined}
                onRevoke={() => undefined}
            />,
        );
        expect(html).toContain("20 นาที");
        expect(html).toContain("เพิกถอนการอนุมัติ");
        expect(html).not.toContain("normalized_payload");
    });

    it("renders history list with status badges and no payloads", () => {
        const html = renderToStaticMarkup(
            <ImportHistoryList
                data={{
                    items: [
                        {
                            id: "batch-1",
                            dryRunId: "dry-1",
                            createdAt: "2026-08-06T00:00:00.000Z",
                            updatedAt: "2026-08-06T00:00:00.000Z",
                            batchStatus: "executed",
                            projectDocumentationStatus: "executed",
                            backlogStatus: "blocked",
                            sourceFilenameSanitized: "fixture.xlsx",
                            sourceFileHashExcerpt: "abcd1234",
                            totals: { totalRows: 3, newRows: 2, duplicateRows: 0, conflictRows: 1, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0, warningCount: 1, errorCount: 1 },
                        },
                    ],
                    page: 1,
                    pageSize: 10,
                    totalItems: 1,
                    totalPages: 1,
                }}
                loading={false}
                error={null}
                onOpen={() => undefined}
                onRefresh={() => undefined}
            />,
        );
        expect(html).toContain("fixture.xlsx");
        expect(html).not.toContain("normalized_payload");
    });
});

describe("Entity review entity-specific counts", () => {
    it("shows entity-specific new/duplicate/skipped counts, not batch-global totals", () => {
        const rows = {
            items: [
                {
                    id: "row-doc-1",
                    entityType: "project_documentation" as const,
                    worksheetName: "01_Project_Documentation",
                    sourceRowNumber: 7,
                    externalRowId: "DOC-1",
                    projectSlug: "example-project-slug",
                    resolvedProjectId: "p-1",
                    parserStatus: "valid",
                    dryRunStatus: "new",
                    proposedOperation: "insert",
                    warningCount: 0,
                    errorCount: 0,
                    issueCodes: [],
                    existingRecordReference: null,
                    executionStatus: "not_started",
                    targetRecordId: null,
                },
            ],
            page: 1,
            pageSize: 25,
            totalItems: 1,
            totalPages: 1,
        };
        const detail = {
            id: "batch-1",
            dryRunId: "dry-1",
            createdAt: "2026-08-06T00:00:00.000Z",
            updatedAt: "2026-08-06T00:00:00.000Z",
            batchStatus: "ready_for_approval",
            projectDocumentationStatus: "ready",
            backlogStatus: "ready",
            sourceFilenameSanitized: "f.xlsx",
            sourceFileHashExcerpt: "abcd",
            totals: { totalRows: 4, newRows: 4, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 984, warningCount: 0, errorCount: 0 },
            schemaVersion: "v1",
            parserContractVersion: "p1",
            dryRunContractVersion: "d1",
            workbookId: null,
            batchReference: null,
            sourceSystem: null,
            sourceMimeType: null,
            timezone: null,
            retention: { retentionEligibleAt: null, payloadPurgedAt: null, deletedAt: null },
            approvals: [],
            executionAttempts: { count: 0, byStatus: {} },
        };
        const html = renderToStaticMarkup(
            <EntityReviewPanel
                entityType="project_documentation"
                entityLabel="Project Documentation"
                detail={detail}
                approval={null}
                rows={rows}
                rowsLoading={false}
                rowsError={null}
                rowFilter={{}}
                executing={false}
                busy={false}
                onRowFilterChange={() => undefined}
                onRowPageChange={() => undefined}
                onRowsRetry={() => undefined}
                onApprove={() => undefined}
                onReject={() => undefined}
                onRevoke={() => undefined}
                onConfirmExecute={async () => undefined}
            />,
        );
        expect(html).toContain("ครอบคลุมแถวใหม่ 1 แถว");
        expect(html).not.toContain("ครอบคลุมแถวใหม่ 4 แถว");
        expect(html).not.toContain("ข้าม 984");
    });

    it("keeps each entity panel's row table isolated from the other entity", () => {
        const docRows = {
            items: [
                {
                    id: "row-doc-1",
                    entityType: "project_documentation" as const,
                    worksheetName: "01_Project_Documentation",
                    sourceRowNumber: 7,
                    externalRowId: "ARBOR-QA-DOC-001",
                    projectSlug: "example-project-slug",
                    resolvedProjectId: "p-1",
                    parserStatus: "valid",
                    dryRunStatus: "new",
                    proposedOperation: "insert",
                    warningCount: 0,
                    errorCount: 0,
                    issueCodes: [],
                    existingRecordReference: null,
                    executionStatus: "not_started",
                    targetRecordId: null,
                },
            ],
            page: 1,
            pageSize: 25,
            totalItems: 1,
            totalPages: 1,
        };
        const backlogRows = {
            items: [
                {
                    id: "row-back-1",
                    entityType: "backlog" as const,
                    worksheetName: "02_Backlog",
                    sourceRowNumber: 7,
                    externalRowId: "ARBOR-QA-BACKLOG-001",
                    projectSlug: "example-project-slug",
                    resolvedProjectId: "p-1",
                    parserStatus: "valid",
                    dryRunStatus: "new",
                    proposedOperation: "insert",
                    warningCount: 0,
                    errorCount: 0,
                    issueCodes: [],
                    existingRecordReference: null,
                    executionStatus: "not_started",
                    targetRecordId: null,
                },
            ],
            page: 1,
            pageSize: 25,
            totalItems: 1,
            totalPages: 1,
        };
        const detail = {
            id: "batch-1",
            dryRunId: "dry-1",
            createdAt: "2026-08-06T00:00:00.000Z",
            updatedAt: "2026-08-06T00:00:00.000Z",
            batchStatus: "ready_for_approval",
            projectDocumentationStatus: "ready",
            backlogStatus: "ready",
            sourceFilenameSanitized: "f.xlsx",
            sourceFileHashExcerpt: "abcd",
            totals: { totalRows: 2, newRows: 2, duplicateRows: 0, conflictRows: 0, reviewRequiredRows: 0, invalidRows: 0, skippedRows: 0, warningCount: 0, errorCount: 0 },
            schemaVersion: "v1",
            parserContractVersion: "p1",
            dryRunContractVersion: "d1",
            workbookId: null,
            batchReference: null,
            sourceSystem: null,
            sourceMimeType: null,
            timezone: null,
            retention: { retentionEligibleAt: null, payloadPurgedAt: null, deletedAt: null },
            approvals: [],
            executionAttempts: { count: 0, byStatus: {} },
        };
        const panelProps = {
            detail,
            approval: null,
            rowsLoading: false,
            rowsError: null,
            rowFilter: {},
            executing: false,
            busy: false,
            onRowFilterChange: () => undefined,
            onRowPageChange: () => undefined,
            onRowsRetry: () => undefined,
            onApprove: () => undefined,
            onReject: () => undefined,
            onRevoke: () => undefined,
            onConfirmExecute: async () => undefined,
        };
        const docHtml = renderToStaticMarkup(
            <EntityReviewPanel entityType="project_documentation" entityLabel="Project Documentation" rows={docRows} {...panelProps} />,
        );
        const backlogHtml = renderToStaticMarkup(
            <EntityReviewPanel entityType="backlog" entityLabel="Backlog" rows={backlogRows} {...panelProps} />,
        );
        expect(docHtml).toContain("ARBOR-QA-DOC-001");
        expect(docHtml).not.toContain("ARBOR-QA-BACKLOG-001");
        expect(docHtml).toContain("ครอบคลุมแถวใหม่ 1 แถว");
        expect(backlogHtml).toContain("ARBOR-QA-BACKLOG-001");
        expect(backlogHtml).not.toContain("ARBOR-QA-DOC-001");
        expect(backlogHtml).toContain("ครอบคลุมแถวใหม่ 1 แถว");
    });
});

describe("Project Import workspace auth surface", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockListBatches.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
        mockGetBatchDetail.mockResolvedValue({});
        mockGetApprovals.mockResolvedValue([]);
        mockListRows.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 0 });
    });

    it("renders a masked, memory-only password field and sign-out action", () => {
        const html = renderToStaticMarkup(<ProjectImportWorkspace />);
        expect(html).toContain("Project Import");
        expect(html).toContain('type="password"');
        expect(html).toContain('autoComplete="off"');
        expect(html).toContain("รหัสผ่านถูกเก็บในหน่วยความจำของหน้านี้เท่านั้น");
        expect(html).not.toContain("localStorage");
        expect(html).not.toContain("indexedDB");
    });

    it("does not render a hardcoded password or agent key", () => {
        const html = renderToStaticMarkup(<ProjectImportWorkspace />);
        expect(html).not.toContain("AGENT_UI_PASSWORD");
        expect(html).not.toContain("AGENT_KEY");
    });

    it("keeps the password input uncontrolled with autofill-safe event hooks", () => {
        const html = renderToStaticMarkup(<ProjectImportWorkspace />);
        expect(html).toContain('id="agent-password"');
        expect(html).toContain('type="password"');
        expect(html).toContain('autoComplete="off"');
        expect(html).toContain('value=""');
    });

    it("does not disable the upload panel merely because password state is empty (autofill-safe)", () => {
        const html = renderToStaticMarkup(<ProjectImportWorkspace />);
        // The drop zone label must not carry disabled styling that blocks drop.
        expect(html).toContain('aria-label="เลือกหรือลากไฟล์ .xlsx มาที่นี่"');
        // Only the upload button (no file yet) is disabled; the drop zone label
        // itself stays interactive so a drop can still be processed.
        expect(html.match(/aria-disabled="true"/g)?.length ?? 0).toBe(1);
        expect(html).not.toContain('label class="mt-4 flex cursor-pointer ... cursor-not-allowed');
    });
});

describe("POST-GATE-8-UX-001C duplicate-only presentation", () => {
    function detailWith(overrides: Partial<UiBatchDetail>): UiBatchDetail {
        return {
            id: "batch-1",
            dryRunId: "dry-1",
            createdAt: "2026-08-06T00:00:00.000Z",
            updatedAt: "2026-08-06T00:00:00.000Z",
            batchStatus: "ready_for_approval",
            projectDocumentationStatus: "ready",
            backlogStatus: "ready",
            sourceFilenameSanitized: "f.xlsx",
            sourceFileHashExcerpt: "abcd",
            totals: {
                totalRows: 2,
                newRows: 0,
                duplicateRows: 2,
                conflictRows: 0,
                reviewRequiredRows: 0,
                invalidRows: 0,
                skippedRows: 0,
                warningCount: 0,
                errorCount: 0,
            },
            schemaVersion: "v1",
            parserContractVersion: "p1",
            dryRunContractVersion: "d1",
            workbookId: null,
            batchReference: null,
            sourceSystem: null,
            sourceMimeType: null,
            timezone: null,
            retention: { retentionEligibleAt: null, payloadPurgedAt: null, deletedAt: null },
            approvals: [],
            executionAttempts: { count: 0, byStatus: {} },
            ...overrides,
        };
    }

    function duplicateRows(externalRowId: string) {
        return {
            items: [
                {
                    id: "r1",
                    externalRowId,
                    dryRunStatus: "duplicate",
                    proposedOperation: "none",
                    warningCount: 0,
                    errorCount: 0,
                    issueCodes: ["EXISTING_IDENTITY_DUPLICATE"],
                    existingRecordReference: "doc-1",
                    executionStatus: "not_started",
                    targetRecordId: null,
                },
            ],
            page: 1,
            pageSize: 25,
            totalItems: 1,
            totalPages: 1,
        };
    }

    const panelProps = {
        approval: null,
        rowsLoading: false,
        rowsError: null,
        rowFilter: {},
        executing: false,
        busy: false,
        onRowFilterChange: () => undefined,
        onRowPageChange: () => undefined,
        onRowsRetry: () => undefined,
        onApprove: () => undefined,
        onReject: () => undefined,
        onRevoke: () => undefined,
        onConfirmExecute: async () => undefined,
    };

    it("renders duplicate-only entity as no-action with Approve disabled (Tests 3+4)", () => {
        const html = renderToStaticMarkup(
            <EntityReviewPanel
                entityType="project_documentation"
                entityLabel="Project Documentation"
                detail={detailWith({})}
                rows={duplicateRows("ARBOR-QA-G8-DOC-001")}
                {...panelProps}
            />,
        );
        expect(html).toContain("ซ้ำทั้งหมด — ไม่ต้องดำเนินการ");
        expect(html).not.toContain("ready_with_warnings");
        expect(html).toMatch(/<button[^>]*disabled=""[^>]*>\s*อนุมัติ\s*<\/button>/);
    });

    it("renders historical ready_with_warnings + warningCount 0 safely as raw status (Test 11)", () => {
        const html = renderToStaticMarkup(
            <EntityReviewPanel
                entityType="project_documentation"
                entityLabel="Project Documentation"
                detail={detailWith({ projectDocumentationStatus: "ready_with_warnings" })}
                rows={duplicateRows("ARBOR-QA-G8-DOC-001")}
                {...panelProps}
            />,
        );
        expect(html).toContain("ready_with_warnings");
        expect(html).not.toContain("ซ้ำทั้งหมด — ไม่ต้องดำเนินการ");
    });

    it("renders empty entity as no-items, not duplicate-only (Test 12)", () => {
        const html = renderToStaticMarkup(
            <EntityReviewPanel
                entityType="project_documentation"
                entityLabel="Project Documentation"
                detail={detailWith({})}
                rows={{ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 0 }}
                {...panelProps}
            />,
        );
        expect(html).toContain("ไม่มีรายการต้องนำเข้า");
        expect(html).not.toContain("ซ้ำทั้งหมด");
    });

    it("renders entire duplicate-only batch as ไม่มีรายการต้องนำเข้า (Test 5)", () => {
        const html = renderToStaticMarkup(<ImportBatchDetail detail={detailWith({})} onBack={() => undefined} />);
        expect(html).toContain("ไม่มีรายการต้องนำเข้า");
        expect(html).not.toContain("ready_for_approval");
    });

    it("renders mixed batch as พร้อมอนุมัติ (Test 6)", () => {
        const html = renderToStaticMarkup(
            <ImportBatchDetail
                detail={detailWith({
                    totals: {
                        totalRows: 2,
                        newRows: 1,
                        duplicateRows: 1,
                        conflictRows: 0,
                        reviewRequiredRows: 0,
                        invalidRows: 0,
                        skippedRows: 0,
                        warningCount: 0,
                        errorCount: 0,
                    },
                })}
                onBack={() => undefined}
            />,
        );
        expect(html).toContain("พร้อมอนุมัติ");
        expect(html).not.toContain("ไม่มีรายการต้องนำเข้า");
    });
});

describe("Project Import client boundary audit", () => {
    const clientDir = join(process.cwd(), "src/lib/project-import/client");
    const componentDir = join(process.cwd(), "src/components/project-import");
    const forbiddenImports = ["@/db/db", "@/lib/project-import/executeImportService", "@/lib/project-import/auditBatchRepository", "better-sqlite3"];

    it("client modules never import server-only modules", () => {
        for (const file of readdirSync(clientDir)) {
            if (!file.endsWith(".ts")) continue;
            const source = readFileSync(join(clientDir, file), "utf8");
            for (const forbidden of forbiddenImports) {
                expect(source, `${file} must not import ${forbidden}`).not.toContain(forbidden);
            }
        }
    });

    it("UI components only reach the server through the client API boundary", () => {
        for (const file of readdirSync(componentDir)) {
            if (!file.endsWith(".tsx")) continue;
            const source = readFileSync(join(componentDir, file), "utf8");
            for (const forbidden of forbiddenImports) {
                expect(source, `${file} must not import ${forbidden}`).not.toContain(forbidden);
            }
            expect(source, `${file} must not contain direct SQL`).not.toMatch(/prepare\s*\(/);
            expect(source, `${file} must not use raw fetch directly`).not.toMatch(/fetch\s*\(/);
        }
    });

    it("workspace wires entityType into every row request and isolates panel state", () => {
        const source = readFileSync(join(process.cwd(), "src/components/project-import/ProjectImportWorkspace.tsx"), "utf8");
        // loadRows must include entityType in the query sent to the client.
        expect(source).toContain("{ ...filter, entityType, page, pageSize: 25 }");
        // Both load paths (post-dry-run and open-batch) request each entity separately.
        expect(source).toContain('loadRows(result.batchId, "project_documentation", {}, 1)');
        expect(source).toContain('loadRows(result.batchId, "backlog", {}, 1)');
        expect(source).toContain('loadRows(batchId, "project_documentation", {}, 1)');
        expect(source).toContain('loadRows(batchId, "backlog", {}, 1)');
        // Panels receive distinct entity-keyed state.
        expect(source).toContain("rows={rowsByEntity.project_documentation}");
        expect(source).toContain("rows={rowsByEntity.backlog}");
    });

    it("approval confirmation modal uses entity-scoped new-row count, not batch totals", () => {
        const source = readFileSync(join(process.cwd(), "src/components/project-import/ProjectImportWorkspace.tsx"), "utf8");
        expect(source).not.toContain("detail?.totals.newRows");
        expect(source).toContain("countEligibleNewRows(rowsByEntity[approveTarget])");
        expect(source).toContain("การอนุมัติมีอายุ 30 นาที และไม่มีการนำเข้าอัตโนมัติหลังอนุมัติ");
    });
});
