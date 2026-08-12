// ---------------------------------------------------------------------------
// WorkOS-Lite execution types
// AUTOMATION-001-P1D.1
// ---------------------------------------------------------------------------

export type ExecutionStatus = "started" | "committed" | "failed_before_write" | "rolled_back";

export type ExecutionTriggerHuman = {
    actorId: string;
    displayName: string;
};

export type ExecutionAttemptRow = {
    id: string;
    operation_id: string;
    approval_id: string;
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

export type ExecuteOperationOutcome = {
    replay: boolean;
    execution: ExecutionSuccessResult;
};
