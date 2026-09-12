// ---------------------------------------------------------------------------
// WorkOS-Lite execution types
// AUTOMATION-001-P1D.1 + ACC-P5-001
// ---------------------------------------------------------------------------

export type ExecutionStatus = "started" | "committed" | "failed_before_write" | "rolled_back";
export type ExecutionKind = "backlog_create" | "ai_read_analyze";

export type ExecutionTriggerHuman = {
    actorId: string;
    displayName: string;
};

export type ExecutionAttemptRow = {
    id: string;
    operation_id: string;
    approval_id: string;
    execution_kind: ExecutionKind;
    execution_status: ExecutionStatus;
    trigger_actor_type: string;
    trigger_actor_id: string;
    trigger_display_name: string | null;
    executor_actor_type: string;
    executor_actor_id: string;
    started_at: string;
    finished_at: string | null;
    target_table: string | null;
    target_record_id: string | null;
    result_json: string | null;
    failure_code: string | null;
    safe_failure_message: string | null;
    created_at: string;
    updated_at: string;
};

export type ExecutionSuccessResult = {
    attemptId: string;
    operationId: string;
    approvalId: string;
    status: "committed";
    targetTable: "project_items";
    targetRecordId: string;
    startedAt: string;
    finishedAt: string;
};

export type AiReadAnalyzeSemanticResult = {
    summary: string;
    findings: string[];
    evidence: string[];
    limitations: string[];
};

export type AiReadAnalyzeExecutionMetadata = {
    operationId: string;
    approvalId: string;
    executionAttemptId: string;
    contractVersion: string;
    provider: "openai";
    model: "gpt-5.6-terra";
    startedAt: string;
    finishedAt: string;
};

export type PersistedAiReadAnalyzeResult = {
    kind: "ai_read_analyze";
    result: AiReadAnalyzeSemanticResult;
    executionMetadata: AiReadAnalyzeExecutionMetadata;
};

export type AiReadAnalyzeExecutionSuccessResult = {
    attemptId: string;
    operationId: string;
    approvalId: string;
    status: "committed";
    executionKind: "ai_read_analyze";
    targetTable: null;
    targetRecordId: null;
    startedAt: string;
    finishedAt: string;
    aiResult: PersistedAiReadAnalyzeResult;
};

export type ExecuteOperationOutcome = {
    replay: boolean;
    execution: ExecutionSuccessResult;
};

export type DispatchExecuteOperationOutcome =
    | ExecuteOperationOutcome
    | { replay: boolean; execution: AiReadAnalyzeExecutionSuccessResult };
