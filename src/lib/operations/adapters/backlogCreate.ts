// ---------------------------------------------------------------------------
// WorkOS-Lite backlog.create adapter (control-plane only)
// AUTOMATION-001-P1B.1
// Reuses the single canonical validator (src/lib/projects/backlogCreateSchema.ts)
// with a derived STRICT Gateway boundary. No domain writes in P1B.
// ---------------------------------------------------------------------------

import { CreateProjectItemSchema } from "@/lib/projects/backlogCreateSchema";
import { OpsError } from "../errors";
import type { NormalizedBacklogCreatePayload } from "../types";

export const BACKLOG_CREATE_CONTRACT_VERSION = "backlog.create.v1";
export const OPERATIONS_SOURCE = "agent";

// Derived strict boundary: unknown payload keys are rejected by the Gateway
// while the shared canonical schema (and the existing backlog route) keeps
// its ordinary z.object stripping behavior.
const OperationsBacklogCreateSchema = CreateProjectItemSchema.strict();

export function normalizeBacklogCreatePayload(raw: unknown): NormalizedBacklogCreatePayload {
    const parsed = OperationsBacklogCreateSchema.safeParse(raw);
    if (!parsed.success) {
        throw new OpsError("OPS_INVALID_PAYLOAD", "Invalid backlog.create payload", 400);
    }
    return {
        title: parsed.data.title,
        status: parsed.data.status,
        priority: parsed.data.priority ?? null,
        schedule_bucket: parsed.data.schedule_bucket ?? null,
        start_date: parsed.data.start_date ?? null,
        end_date: parsed.data.end_date ?? null,
        is_milestone: parsed.data.is_milestone ?? 0,
        workstream: parsed.data.workstream ?? null,
        dod_text: parsed.data.dod_text ?? null,
        notes: parsed.data.notes ?? null,
    };
}

export function buildBacklogCreatePreview(input: {
    targetRef: string;
    resolvedTargetId: string;
    payload: NormalizedBacklogCreatePayload;
}): {
    operationType: "backlog.create";
    target: { type: "project"; ref: string; resolvedId: string };
    proposed: { action: "create"; entity: "project_item"; fields: NormalizedBacklogCreatePayload };
} {
    return {
        operationType: "backlog.create",
        target: { type: "project", ref: input.targetRef, resolvedId: input.resolvedTargetId },
        proposed: { action: "create", entity: "project_item", fields: input.payload },
    };
}
