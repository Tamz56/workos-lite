// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Project Documentation dry-run classification
// WORKOS-SHEET-GATE-3
// ---------------------------------------------------------------------------

import { computeContentDuplicateHash } from "@/lib/project-doc-blocks/hashing";
import { mapRowToBlock } from "@/lib/project-doc-blocks/mappers";
import type {
    DryRunProjectDocumentationRow,
    DryRunReadAdapter,
    DryRunRowResult,
} from "./dryRunTypes";
import type { ImportValidationIssue, NormalizedImportRow, ProjectDocumentationNormalizedData } from "./types";
import { makeIssue } from "./validationIssues";
import { resolveProjectSlug } from "./projectResolver";

function docData(row: NormalizedImportRow): ProjectDocumentationNormalizedData {
    return row.data as ProjectDocumentationNormalizedData;
}

function incomingContentHash(row: NormalizedImportRow): string {
    const data = docData(row);
    return computeContentDuplicateHash({
        projectSlug: data.projectSlug,
        type: data.blockType,
        title: data.title,
        date: data.date,
        summary: data.summary,
        details: data.details,
        evidenceLinks: data.evidenceLinks,
        relatedFiles: data.relatedFiles,
        nextAction: data.nextAction ?? undefined,
        orderIndex: data.orderIndex ?? undefined,
        status: data.status,
    });
}

function existingContentHash(row: DryRunProjectDocumentationRow, slug: string): string {
    const block = mapRowToBlock(row as unknown as Parameters<typeof mapRowToBlock>[0], slug);
    return computeContentDuplicateHash(block);
}

export function classifyProjectDocumentationRows(
    rows: NormalizedImportRow[],
    adapter: DryRunReadAdapter,
): { rowResults: DryRunRowResult[]; issues: ImportValidationIssue[]; dbError: boolean } {
    const rowResults: DryRunRowResult[] = [];
    const issues: ImportValidationIssue[] = [];
    let dbError = false;

    for (const row of rows) {
        const base: DryRunRowResult = {
            entityType: "project_documentation",
            sheetName: row.worksheetName,
            sourceRowNumber: row.sourceRowNumber,
            externalRowId: row.externalRowId || null,
            projectSlug: row.projectSlug || null,
            projectId: null,
            parserStatus: row.classification,
            dryRunStatus: "invalid",
            proposedOperation: "none",
            normalizedData: row.data,
            issues: [...row.issues],
        };

        if (row.classification === "invalid") {
            rowResults.push(base);
            continue;
        }

        const resolution = resolveProjectSlug(adapter, row.projectSlug, row.worksheetName, row.sourceRowNumber);
        base.issues.push(...resolution.issues);
        if (!resolution.projectId) {
            rowResults.push(base);
            continue;
        }
        base.projectId = resolution.projectId;

        let identityMatches: DryRunProjectDocumentationRow[] = [];
        let projectBlocks: DryRunProjectDocumentationRow[] = [];
        try {
            identityMatches = adapter.findDocumentationBlocksByIdentity(resolution.projectId, row.externalRowId);
            projectBlocks = adapter.findDocumentationBlocksByProject(resolution.projectId);
        } catch {
            const dbIssue = makeIssue("DATABASE_READ_FAILED", "error", "row", "Failed to read project documentation", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber });
            base.issues.push(dbIssue);
            issues.push(dbIssue);
            dbError = true;
            rowResults.push(base);
            continue;
        }

        if (identityMatches.length > 1) {
            base.issues.push(makeIssue("DATABASE_INTEGRITY_ANOMALY", "error", "row", "Multiple documentation records share the same identity", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber, rawValue: row.externalRowId }));
            base.dryRunStatus = "review_required";
            base.proposedOperation = "manual_review";
            rowResults.push(base);
            continue;
        }

        const incomingHash = incomingContentHash(row);

        if (identityMatches.length === 1) {
            const match = identityMatches[0];
            base.existingRecordReference = match.id;
            if (match.status === "archived") {
                base.dryRunStatus = "review_required";
                base.proposedOperation = "manual_review";
                base.issues.push(makeIssue("ARCHIVED_IDENTITY_MATCH", "warning", "row", "Identity matches an archived record; do not recreate or unarchive automatically", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber, rawValue: match.id }));
                rowResults.push(base);
                continue;
            }
            const existingHash = existingContentHash(match, row.projectSlug);
            if (existingHash === incomingHash) {
                base.dryRunStatus = "duplicate";
                base.proposedOperation = "none";
                base.issues.push(makeIssue("EXISTING_IDENTITY_DUPLICATE", "info", "row", "Existing record with identical content", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber, rawValue: match.id }));
            } else {
                base.dryRunStatus = "conflict";
                base.proposedOperation = "manual_review";
                base.issues.push(makeIssue("EXISTING_IDENTITY_CONFLICT", "warning", "row", "Same identity but different content; update is not allowed in importer v1", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber, rawValue: match.id }));
            }
            rowResults.push(base);
            continue;
        }

        let contentMatch: DryRunProjectDocumentationRow | undefined;
        for (const candidate of projectBlocks) {
            if (candidate.status === "archived") continue;
            if (existingContentHash(candidate, row.projectSlug) === incomingHash) {
                contentMatch = candidate;
                break;
            }
        }
        if (contentMatch) {
            base.dryRunStatus = "review_required";
            base.proposedOperation = "manual_review";
            base.existingRecordReference = contentMatch.id;
            base.issues.push(makeIssue("CONTENT_DUPLICATE_DIFFERENT_EXTERNAL_ID", "warning", "row", "Equivalent content already exists under a different external_row_id", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber, rawValue: contentMatch.id }));
            rowResults.push(base);
            continue;
        }

        let candidates: DryRunProjectDocumentationRow[] = [];
        try {
            candidates = adapter.findDocumentationDuplicateCandidates(resolution.projectId, docData(row).title, docData(row).date);
        } catch {
            candidates = [];
        }
        if (candidates.length > 0 && candidates.some((candidate) => candidate.status !== "archived" && existingContentHash(candidate, row.projectSlug) !== incomingHash)) {
            base.issues.push(makeIssue("SIMILAR_IDENTITY_CANDIDATE", "warning", "row", "A record with the same title and date exists with different content", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber }));
        }

        base.dryRunStatus = "new";
        base.proposedOperation = "insert";
        rowResults.push(base);
    }

    return { rowResults, issues, dbError };
}
