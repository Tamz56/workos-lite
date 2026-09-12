// UI-local DTO types for the Human Operations Review surface.
// Mirrors safe API response contracts only; no server-only imports.

export type ReviewState =
    | "awaiting_review"
    | "approved"
    | "approval_expired"
    | "rejected"
    | "revoked"
    | "consumed";

export type HumanSession = {
    operatorId: string;
    displayName: string;
    actorType: "human";
};

export type SessionResponse =
    | { authenticated: false }
    | { authenticated: true; operator: HumanSession };

export type ApprovalView = {
    id: string;
    operationId: string;
    status: "approved" | "revoked" | "expired" | "consumed";
    approvedAt: string;
    expiresAt: string;
    approverActor: string;
    revokedAt: string | null;
    revokedBy: {
        actorType: string;
        actorId: string;
        displayName: string;
    } | null;
    binding: {
        operationType: string;
        targetType: string;
        targetRef: string;
        resolvedTargetId: string;
        payloadHash: string;
        contractVersion: string;
        previewFingerprint: string;
    };
    preview: unknown;
};

export type RejectionView = {
    eventId: string;
    operationId: string;
    rejectedAt: string;
    actor: string;
    reason: string | null;
};

export type ReviewSummary = {
    operationId: string;
    operationType: string;
    targetType: string;
    targetRef: string;
    requesterActorType: string;
    requesterActorId: string;
    requestedAt: string;
    reviewState: ReviewState;
    approval: ApprovalView | null;
    rejection: RejectionView | null;
};

export type AiReadAnalyzeSemanticResult = {
    summary: string;
    findings: string[];
    evidence: string[];
    limitations: string[];
};

export type PersistedAiReadAnalyzeResult = {
    kind: "ai_read_analyze";
    result: AiReadAnalyzeSemanticResult;
    executionMetadata: {
        operationId: string;
        approvalId: string;
        executionAttemptId: string;
        contractVersion: string;
        provider: "openai";
        model: "gpt-5.6-terra";
        startedAt: string;
        finishedAt: string;
    };
};

export type ReviewDetail = ReviewSummary & {
    payload: unknown;
    payloadHash: string;
    preview: unknown;
    previewFingerprint: string;
    contractVersion: string;
    status: string;
    execution: OperationExecutionPresentation;
};

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

export type ExecutionMutationResponse = {
    ok: true;
    replay: boolean;
    execution: {
        attemptId: string;
        operationId: string;
        approvalId: string;
        status: "committed";
        executionKind?: "backlog_create" | "ai_read_analyze";
        targetTable: "project_items" | null;
        targetRecordId: string | null;
        startedAt: string;
        finishedAt: string;
        aiResult?: PersistedAiReadAnalyzeResult;
    };
};

export type OperationsListResponse = {
    ok: true;
    operations: ReviewSummary[];
};

export type OperationDetailResponse = {
    ok: true;
    operation: ReviewDetail;
};

export type ApprovalMutationResponse = {
    ok: true;
    review: {
        operationId: string;
        state: ReviewState;
        approval: ApprovalView | null;
        rejection: RejectionView | null;
    };
};

export type ApiErrorBody = {
    ok: false;
    error: { code: string; message: string; status: number; retryable?: boolean };
};

export type ReviewTokens = {
    expectedPreviewFingerprint: string;
    expectedPayloadHash: string;
    expectedContractVersion: string;
};
