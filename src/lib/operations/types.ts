// ---------------------------------------------------------------------------
// WorkOS-Lite Operations control-plane types
// AUTOMATION-001-P1B.1
// ---------------------------------------------------------------------------

export type OperationsCapability = "operations:request" | "operations:read";

export type NormalizedBacklogCreatePayload = {
    title: string;
    status: string;
    priority: number | null;
    schedule_bucket: string | null;
    start_date: string | null;
    end_date: string | null;
    is_milestone: number;
    workstream: string | null;
    dod_text: string | null;
    notes: string | null;
};

export type OperationRecord = {
    id: string;
    operationType: string;
    targetType: string;
    targetRef: string;
    resolvedTargetId: string;
    payload: unknown;
    payloadHash: string;
    idempotencyKey: string | null;
    source: string;
    requesterActorType: "agent";
    requesterActorId: string;
    status: string;
    validationResult: unknown;
    preview: unknown;
    previewFingerprint: string;
    contractVersion: string;
    requestedAt: string;
    createdAt: string;
    updatedAt: string;
};
