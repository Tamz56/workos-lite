// ---------------------------------------------------------------------------
// WorkOS-Lite operation-integrity verification
// AUTOMATION-001-P1C.1
// Recomputes payload hash, preview, and preview fingerprint from the persisted
// operation snapshot using P1B primitives. Manual DB/admin mutation is part
// of the threat model.
// ---------------------------------------------------------------------------

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
        if (op.contract_version !== BACKLOG_CREATE_CONTRACT_VERSION) {
            throw new Error("contract version mismatch");
        }
        const rawPayload = JSON.parse(op.payload_json) as unknown;
        const normalized = normalizeBacklogCreatePayload(rawPayload);

        const recomputedHash = computeDomainHash(PAYLOAD_HASH_PREFIX, {
            operationType: op.operation_type,
            targetType: op.target_type,
            targetRef: op.target_ref,
            payload: normalized,
        });
        if (recomputedHash !== op.payload_hash) {
            throw new Error("payload hash mismatch");
        }

        const preview = buildBacklogCreatePreview({
            targetRef: op.target_ref,
            resolvedTargetId: op.resolved_target_id,
            payload: normalized,
        });
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
