// ---------------------------------------------------------------------------
// WorkOS-Lite execution read surface (READ ONLY)
// AUTOMATION-001-P1D.2 + ACC-P5-001
// Builds safe typed presentation DTOs. Raw result_json is never exposed.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { validateAiReadAnalyzeResult } from "@/lib/ai/openaiReadAnalyze";
import { aiReadAnalyzeProfileFromPreview } from "@/lib/operations/adapters/aiReadAnalyze";
import type { ExecutionAttemptRow, PersistedAiReadAnalyzeResult } from "./types";

export type ExecutionAttemptPresentation = {
    attemptId: string;
    approvalId: string;
    executionKind: "backlog_create" | "ai_read_analyze";
    status: "committed" | "failed_before_write" | "rolled_back";
    startedAt: string;
    finishedAt: string | null;
    targetTable: string | null;
    targetRecordId: string | null;
    failureCode: string | null;
    safeFailureMessage: string | null;
    aiResult: PersistedAiReadAnalyzeResult | null;
};

export type OperationExecutionPresentation = {
    committed: ExecutionAttemptPresentation | null;
    latestFailure: ExecutionAttemptPresentation | null;
};

function safeAiResult(row: ExecutionAttemptRow, operation: { preview_json: string; contract_version: string } | undefined): PersistedAiReadAnalyzeResult | null {
    if (row.execution_kind !== "ai_read_analyze" || row.execution_status !== "committed" || !row.result_json) return null;
    try {
        if (!operation) return null;
        const profile = aiReadAnalyzeProfileFromPreview(JSON.parse(operation.preview_json) as unknown);
        if (!profile) return null;
        const raw = JSON.parse(row.result_json) as Record<string, unknown>;
        if (raw.kind !== "ai_read_analyze" || !raw.executionMetadata || typeof raw.executionMetadata !== "object") return null;
        const metadata = raw.executionMetadata as Record<string, unknown>;
        const required = ["operationId", "approvalId", "executionAttemptId", "contractVersion", "provider", "model", "startedAt", "finishedAt"];
        if (required.some((key) => typeof metadata[key] !== "string")) return null;
        if (
            metadata.operationId !== row.operation_id ||
            metadata.approvalId !== row.approval_id ||
            metadata.executionAttemptId !== row.id ||
            metadata.contractVersion !== operation.contract_version ||
            metadata.provider !== profile.provider ||
            metadata.model !== profile.model
        ) return null;
        return {
            kind: "ai_read_analyze",
            result: validateAiReadAnalyzeResult(raw.result),
            executionMetadata: metadata as PersistedAiReadAnalyzeResult["executionMetadata"],
        };
    } catch {
        return null;
    }
}

function project(row: ExecutionAttemptRow, operation: { preview_json: string; contract_version: string } | undefined): ExecutionAttemptPresentation {
    return {
        attemptId: row.id,
        approvalId: row.approval_id,
        executionKind: row.execution_kind,
        status: row.execution_status as ExecutionAttemptPresentation["status"],
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        targetTable: row.target_table,
        targetRecordId: row.target_record_id,
        failureCode: row.failure_code,
        safeFailureMessage: row.safe_failure_message,
        aiResult: safeAiResult(row, operation),
    };
}

export function getOperationExecutionPresentation(
    db: Database.Database,
    operationId: string,
): OperationExecutionPresentation {
    const operation = db.prepare("SELECT preview_json, contract_version FROM operations WHERE id = ?").get(operationId) as
        | { preview_json: string; contract_version: string }
        | undefined;

    const committed = db.prepare(`
        SELECT * FROM operation_execution_attempts
        WHERE operation_id = ? AND execution_status = 'committed'
        LIMIT 1
    `).get(operationId) as ExecutionAttemptRow | undefined;

    const latestFailure = db.prepare(`
        SELECT * FROM operation_execution_attempts
        WHERE operation_id = ? AND execution_status IN ('failed_before_write', 'rolled_back')
        ORDER BY created_at DESC, rowid DESC
        LIMIT 1
    `).get(operationId) as ExecutionAttemptRow | undefined;

    return {
        committed: committed ? project(committed, operation) : null,
        latestFailure: latestFailure ? project(latestFailure, operation) : null,
    };
}
