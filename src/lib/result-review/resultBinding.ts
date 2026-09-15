import type Database from "better-sqlite3";
import { canonicalJson, sha256Hex } from "@/lib/operations/canonicalization";
import { getOperationExecutionPresentation } from "@/lib/execution/read";
import type { PersistedAiReadAnalyzeResult } from "@/lib/execution/types";
import {
    RESULT_REVIEW_CONTRACT_VERSION,
    type ResultReviewBinding,
} from "./types";

export type ResultBindingErrorCode =
    | "RESULT_NOT_REVIEWABLE"
    | "RESULT_BINDING_INVALID";

export class ResultBindingError extends Error {
    constructor(
        readonly code: ResultBindingErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "ResultBindingError";
    }
}

type PersistedResultRow = {
    id: string;
    operation_id: string;
    approval_id: string;
    execution_kind: string;
    execution_status: string;
    result_json: string | null;
};

export type BoundCommittedAiResult = {
    binding: ResultReviewBinding;
    sourceResult: PersistedAiReadAnalyzeResult["result"];
};

export function computeResultFingerprint(
    persistedResultJson: string,
): string {
    let parsed: unknown;

    try {
        parsed = JSON.parse(persistedResultJson);
    } catch {
        throw new ResultBindingError(
            "RESULT_BINDING_INVALID",
            "Persisted AI result is not valid JSON",
        );
    }

    return sha256Hex(canonicalJson(parsed));
}

export function loadBoundCommittedAiResult(
    db: Database.Database,
    operationId: string,
): BoundCommittedAiResult {
    const row = db.prepare(`
        SELECT
            id,
            operation_id,
            approval_id,
            execution_kind,
            execution_status,
            result_json
        FROM operation_execution_attempts
        WHERE operation_id = ?
          AND execution_status = 'committed'
        LIMIT 1
    `).get(operationId) as PersistedResultRow | undefined;

    if (!row) {
        throw new ResultBindingError(
            "RESULT_NOT_REVIEWABLE",
            "No committed execution result exists for this operation",
        );
    }

    if (
        row.execution_kind !== "ai_read_analyze"
        || row.execution_status !== "committed"
        || !row.result_json
    ) {
        throw new ResultBindingError(
            "RESULT_NOT_REVIEWABLE",
            "Only committed ai_read_analyze results are reviewable",
        );
    }

    const presentation =
        getOperationExecutionPresentation(
            db,
            operationId,
        );

    const committed = presentation.committed;

    if (
        !committed
        || committed.attemptId !== row.id
        || committed.approvalId !== row.approval_id
        || committed.executionKind !== "ai_read_analyze"
        || committed.status !== "committed"
        || !committed.aiResult
    ) {
        throw new ResultBindingError(
            "RESULT_BINDING_INVALID",
            "Committed AI result failed provenance validation",
        );
    }

    const metadata =
        committed.aiResult.executionMetadata;

    if (
        metadata.operationId !== operationId
        || metadata.executionAttemptId !== row.id
        || metadata.approvalId !== row.approval_id
    ) {
        throw new ResultBindingError(
            "RESULT_BINDING_INVALID",
            "Committed AI result binding does not match the execution attempt",
        );
    }

    return {
        binding: {
            operationId,
            executionAttemptId: row.id,
            approvalId: row.approval_id,
            executionKind: "ai_read_analyze",
            executionStatus: "committed",
            resultFingerprint:
                computeResultFingerprint(
                    row.result_json,
                ),
            reviewContractVersion:
                RESULT_REVIEW_CONTRACT_VERSION,
            executionContractVersion:
                metadata.contractVersion,
            provider: metadata.provider,
            model: metadata.model,
            executionStartedAt:
                metadata.startedAt,
            executionFinishedAt:
                metadata.finishedAt,
        },
        sourceResult:
            committed.aiResult.result,
    };
}
