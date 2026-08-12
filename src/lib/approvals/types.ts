// ---------------------------------------------------------------------------
// WorkOS-Lite approvals types
// AUTOMATION-001-P1C.1
// ---------------------------------------------------------------------------

export type ReviewState =
    | "awaiting_review"
    | "approved"
    | "approval_expired"
    | "rejected"
    | "revoked"
    | "consumed";

export type OperationRow = {
    id: string;
    operation_type: string;
    target_type: string;
    target_ref: string;
    resolved_target_id: string;
    payload_json: string;
    payload_hash: string;
    idempotency_key: string | null;
    source: string;
    requester_actor_type: string;
    requester_actor_id: string;
    status: string;
    validation_result_json: string;
    preview_json: string;
    preview_fingerprint: string;
    contract_version: string;
    requested_at: string;
    created_at: string;
    updated_at: string;
};

export type ApprovalRow = {
    id: string;
    operation_id: string;
    approval_status: "approved" | "revoked" | "expired" | "consumed";
    approver_actor_type: string;
    approver_actor_id: string;
    approver_display_name: string;
    approved_at: string;
    expires_at: string;
    revoked_at: string | null;
    revoked_by_actor_type: string | null;
    revoked_by_actor_id: string | null;
    revoked_by_display_name: string | null;
    consumed_at: string | null;
    bound_operation_type: string;
    bound_target_type: string;
    bound_target_ref: string;
    bound_resolved_target_id: string;
    bound_payload_hash: string;
    bound_contract_version: string;
    bound_preview_fingerprint: string;
    preview_json: string;
    created_at: string;
    updated_at: string;
};

export type ApprovalEventRow = {
    id: string;
    operation_id: string;
    approval_id: string | null;
    event_type: "approved" | "rejected" | "revoked" | "expired" | "consumed";
    actor_type: "human" | "system";
    actor_id: string;
    actor_display_name: string | null;
    occurred_at: string;
    event_code: string | null;
    safe_reason: string | null;
    created_at: string;
};

export type HumanApprover = {
    actorId: string;
    displayName: string;
};

export type ApprovalView = {
    id: string;
    operationId: string;
    status: ApprovalRow["approval_status"];
    approvedAt: string;
    expiresAt: string;
    approverActor: string;
    revokedAt: string | null;
    revokedBy: { actorType: string; actorId: string; displayName: string } | null;
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

export type ReviewDetail = ReviewSummary & {
    payload: unknown;
    payloadHash: string;
    preview: unknown;
    previewFingerprint: string;
    contractVersion: string;
    status: string;
};

export type ApprovalMutationResult = {
    ok: true;
    review: {
        operationId: string;
        state: ReviewState;
        approval: ApprovalView | null;
        rejection: RejectionView | null;
    };
};
