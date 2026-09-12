// ---------------------------------------------------------------------------
// WorkOS-Lite operation-integrity verification
// AUTOMATION-001-P1C.1 + ACC-P5-001
// Recomputes payload hash, preview, and preview fingerprint from the persisted
// operation snapshot using only admitted operation adapters.
// ---------------------------------------------------------------------------

import {
    AI_READ_ANALYZE_CONTRACT_VERSION,
    AI_READ_ANALYZE_OPERATION_TYPE,
    buildAiReadAnalyzePreview,
    normalizeAiReadAnalyzePayload,
} from "@/lib/operations/adapters/aiReadAnalyze";
import {
    BACKLOG_CREATE_CONTRACT_VERSION,
    buildBacklogCreatePreview,
    normalizeBacklogCreatePayload,
} from "@/lib/operations/adapters/backlogCreate";
import { canonicalJson, computeDomainHash } from "@/lib/operations/canonicalization";
import { PAYLOAD_HASH_PREFIX, PREVIEW_HASH_PREFIX } from "@/lib/operations/service";
import { ApprovalError } from "./errors";
import type { OperationRow } from "./types";

export function verifyOperationIntegrity(op: OperationRow): void {
    try {
        const rawPayload = JSON.parse(op.payload_json) as unknown;
        let normalized: unknown;
        let preview: unknown;
        let contractVersion: string;

        if (op.operation_type === "backlog.create") {
            contractVersion = BACKLOG_CREATE_CONTRACT_VERSION;
            const payload = normalizeBacklogCreatePayload(rawPayload);
            normalized = payload;
            preview = buildBacklogCreatePreview({
                targetRef: op.target_ref,
                resolvedTargetId: op.resolved_target_id,
                payload,
            });
        } else if (op.operation_type === AI_READ_ANALYZE_OPERATION_TYPE) {
            contractVersion = AI_READ_ANALYZE_CONTRACT_VERSION;
            const payload = normalizeAiReadAnalyzePayload(rawPayload);
            normalized = payload;
            preview = buildAiReadAnalyzePreview({
                targetRef: op.target_ref,
                resolvedTargetId: op.resolved_target_id,
                payload,
            });
        } else {
            throw new Error("unsupported operation type");
        }

        if (op.contract_version !== contractVersion) {
            throw new Error("contract version mismatch");
        }

        const recomputedHash = computeDomainHash(PAYLOAD_HASH_PREFIX, {
            operationType: op.operation_type,
            targetType: op.target_type,
            targetRef: op.target_ref,
            payload: normalized,
        });
        if (recomputedHash !== op.payload_hash) {
            throw new Error("payload hash mismatch");
        }

        if (canonicalJson(preview) !== canonicalJson(JSON.parse(op.preview_json) as unknown)) {
            throw new Error("preview mismatch");
        }

        const recomputedFingerprint = computeDomainHash(PREVIEW_HASH_PREFIX, preview);
        if (recomputedFingerprint !== op.preview_fingerprint) {
            throw new Error("preview fingerprint mismatch");
        }
    } catch {
        throw new ApprovalError(
            "OPS_APPROVAL_OPERATION_INTEGRITY_FAILED",
            "Operation integrity verification failed",
            409,
        );
    }
}
