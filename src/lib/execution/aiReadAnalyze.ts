// ---------------------------------------------------------------------------
// ACC-P5-001 bounded synchronous-request AI executor.
// Phase 1: short governed claim transaction.
// Phase 2: one model call outside SQLite write transaction.
// Phase 3: short governed finalize transaction.
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import { ApprovalError } from "@/lib/approvals/errors";
import { verifyOperationIntegrity } from "@/lib/approvals/operationIntegrity";
import type { ApprovalRow, OperationRow } from "@/lib/approvals/types";
import {
    AI_READ_ANALYZE_CONTRACT_VERSION,
    AI_READ_ANALYZE_MODEL,
    AI_READ_ANALYZE_PROVIDER,
    normalizeAiReadAnalyzePayload,
} from "@/lib/operations/adapters/aiReadAnalyze";
import { canonicalJson } from "@/lib/operations/canonicalization";
import {
    AiRuntimeError,
    runOpenAiReadAnalyze,
    validateAiReadAnalyzeResult,
    type ReadAnalyzeRuntime,
} from "@/lib/ai/openaiReadAnalyze";
import { ExecutionError, executionSafeMessage, type ExecutionErrorCode } from "./errors";
import type {
    AiReadAnalyzeExecutionSuccessResult,
    DispatchExecuteOperationOutcome,
    ExecutionAttemptRow,
    ExecutionTriggerHuman,
    PersistedAiReadAnalyzeResult,
} from "./types";

type Deps = {
    now?: () => string;
    runtime?: ReadAnalyzeRuntime;
};

type Claim = {
    replay: false;
    attemptId: string;
    approvalId: string;
    operation: OperationRow;
    payload: ReturnType<typeof normalizeAiReadAnalyzePayload>;
    startedAt: string;
};

type ClaimResult = Claim | { replay: true; outcome: DispatchExecuteOperationOutcome };

function clock(deps: Deps): string {
    return deps.now ? deps.now() : new Date().toISOString();
}

function parseExecuteBody(body: unknown): { approvalId: string } {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new ExecutionError("OPS_EXECUTION_INVALID_REQUEST", executionSafeMessage("OPS_EXECUTION_INVALID_REQUEST"), 400, false);
    }
    const obj = body as Record<string, unknown>;
    if (Object.keys(obj).length !== 1 || !("approvalId" in obj)) {
        throw new ExecutionError("OPS_EXECUTION_INVALID_REQUEST", executionSafeMessage("OPS_EXECUTION_INVALID_REQUEST"), 400, false);
    }
    if (typeof obj.approvalId !== "string" || !/^apr-/.test(obj.approvalId)) {
        throw new ExecutionError("OPS_EXECUTION_INVALID_REQUEST", executionSafeMessage("OPS_EXECUTION_INVALID_REQUEST"), 400, false);
    }
    return { approvalId: obj.approvalId };
}

function loadOperation(db: Database.Database, operationId: string): OperationRow {
    const row = db.prepare("SELECT * FROM operations WHERE id = ?").get(operationId) as OperationRow | undefined;
    if (!row) {
        throw new ExecutionError("OPS_EXECUTION_OPERATION_NOT_FOUND", executionSafeMessage("OPS_EXECUTION_OPERATION_NOT_FOUND"), 404, false);
    }
    return row;
}

function loadApproval(db: Database.Database, approvalId: string): ApprovalRow {
    const row = db.prepare("SELECT * FROM operation_approvals WHERE id = ?").get(approvalId) as ApprovalRow | undefined;
    if (!row) {
        throw new ExecutionError("OPS_EXECUTION_APPROVAL_NOT_FOUND", executionSafeMessage("OPS_EXECUTION_APPROVAL_NOT_FOUND"), 404, false);
    }
    return row;
}

function verifyApprovalBinding(approval: ApprovalRow, op: OperationRow): void {
    const mismatched =
        approval.operation_id !== op.id ||
        approval.bound_operation_type !== op.operation_type ||
        approval.bound_target_type !== op.target_type ||
        approval.bound_target_ref !== op.target_ref ||
        approval.bound_resolved_target_id !== op.resolved_target_id ||
        approval.bound_payload_hash !== op.payload_hash ||
        approval.bound_contract_version !== op.contract_version ||
        approval.bound_preview_fingerprint !== op.preview_fingerprint;
    if (mismatched) {
        throw new ExecutionError("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH", executionSafeMessage("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH"), 409, false);
    }
    try {
        if (canonicalJson(JSON.parse(approval.preview_json) as unknown) !== canonicalJson(JSON.parse(op.preview_json) as unknown)) {
            throw new Error("preview mismatch");
        }
    } catch {
        throw new ExecutionError("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH", executionSafeMessage("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH"), 409, false);
    }
}

function requireActiveApproval(approval: ApprovalRow, now: string): void {
    if (approval.approval_status === "revoked" || approval.revoked_at !== null) {
        throw new ExecutionError("OPS_EXECUTION_APPROVAL_REVOKED", executionSafeMessage("OPS_EXECUTION_APPROVAL_REVOKED"), 409, false);
    }
    if (approval.approval_status === "consumed" || approval.consumed_at !== null) {
        throw new ExecutionError("OPS_EXECUTION_APPROVAL_CONSUMED", executionSafeMessage("OPS_EXECUTION_APPROVAL_CONSUMED"), 409, false);
    }
    if (approval.approval_status !== "approved" || approval.expires_at <= now) {
        throw new ExecutionError("OPS_EXECUTION_APPROVAL_EXPIRED", executionSafeMessage("OPS_EXECUTION_APPROVAL_EXPIRED"), 409, false);
    }
}

function verifyIntegrity(op: OperationRow): void {
    try {
        verifyOperationIntegrity(op);
    } catch (error) {
        if (error instanceof ApprovalError) {
            throw new ExecutionError("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED", executionSafeMessage("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED"), 409, false);
        }
        throw error;
    }
}

function verifyFreshProject(db: Database.Database, op: OperationRow, approval: ApprovalRow): void {
    const fresh = db.prepare("SELECT id FROM projects WHERE slug = ?").get(op.target_ref) as { id: string } | undefined;
    if (!fresh || fresh.id !== op.resolved_target_id || fresh.id !== approval.bound_resolved_target_id) {
        throw new ExecutionError("OPS_EXECUTION_TARGET_STALE", executionSafeMessage("OPS_EXECUTION_TARGET_STALE"), 409, false);
    }
}

function parsePersistedResult(attempt: ExecutionAttemptRow): PersistedAiReadAnalyzeResult {
    try {
        const raw = JSON.parse(attempt.result_json ?? "null") as Record<string, unknown> | null;
        if (!raw || raw.kind !== "ai_read_analyze" || !raw.executionMetadata || typeof raw.executionMetadata !== "object") {
            throw new Error("invalid persisted result");
        }
        const metadata = raw.executionMetadata as Record<string, unknown>;
        const required = ["operationId", "approvalId", "executionAttemptId", "contractVersion", "provider", "model", "startedAt", "finishedAt"];
        if (required.some((key) => typeof metadata[key] !== "string")) throw new Error("invalid metadata");
        if (
            metadata.operationId !== attempt.operation_id ||
            metadata.approvalId !== attempt.approval_id ||
            metadata.executionAttemptId !== attempt.id ||
            metadata.provider !== AI_READ_ANALYZE_PROVIDER ||
            metadata.model !== AI_READ_ANALYZE_MODEL
        ) {
            throw new Error("metadata mismatch");
        }
        return {
            kind: "ai_read_analyze",
            result: validateAiReadAnalyzeResult(raw.result),
            executionMetadata: metadata as PersistedAiReadAnalyzeResult["executionMetadata"],
        };
    } catch (error) {
        if (error instanceof ExecutionError) throw error;
        throw new ExecutionError("OPS_EXECUTION_STATE_INCONSISTENT", executionSafeMessage("OPS_EXECUTION_STATE_INCONSISTENT"), 409, false);
    }
}

function replayOutcome(attempt: ExecutionAttemptRow): DispatchExecuteOperationOutcome {
    const aiResult = parsePersistedResult(attempt);
    return {
        replay: true,
        execution: {
            attemptId: attempt.id,
            operationId: attempt.operation_id,
            approvalId: attempt.approval_id,
            status: "committed",
            executionKind: "ai_read_analyze",
            targetTable: null,
            targetRecordId: null,
            startedAt: attempt.started_at,
            finishedAt: attempt.finished_at ?? attempt.started_at,
            aiResult,
        },
    };
}

function claimExecution(
    db: Database.Database,
    human: ExecutionTriggerHuman,
    operationId: string,
    approvalId: string,
    startedAt: string,
): ClaimResult {
    return db.transaction((): ClaimResult => {
        const op = loadOperation(db, operationId);
        if (op.operation_type !== "ai.read_analyze") {
            throw new ExecutionError("OPS_EXECUTION_STATE_INCONSISTENT", executionSafeMessage("OPS_EXECUTION_STATE_INCONSISTENT"), 409, false);
        }

        const committed = db.prepare(`
            SELECT * FROM operation_execution_attempts
            WHERE operation_id = ? AND execution_status = 'committed'
            LIMIT 1
        `).get(op.id) as ExecutionAttemptRow | undefined;
        if (committed) {
            if (committed.approval_id !== approvalId || committed.execution_kind !== "ai_read_analyze") {
                throw new ExecutionError("OPS_EXECUTION_CONFLICT", executionSafeMessage("OPS_EXECUTION_CONFLICT"), 409, false);
            }
            return { replay: true, outcome: replayOutcome(committed) };
        }

        if (op.status === "executing") {
            throw new ExecutionError("OPS_EXECUTION_IN_PROGRESS", executionSafeMessage("OPS_EXECUTION_IN_PROGRESS"), 409, true);
        }
        if (op.status !== "pending") {
            throw new ExecutionError(
                op.status === "failed" ? "OPS_EXECUTION_NOT_EXECUTABLE" : "OPS_EXECUTION_STATE_INCONSISTENT",
                executionSafeMessage(op.status === "failed" ? "OPS_EXECUTION_NOT_EXECUTABLE" : "OPS_EXECUTION_STATE_INCONSISTENT"),
                409,
                false,
            );
        }

        const approval = loadApproval(db, approvalId);
        if (approval.operation_id !== op.id) {
            throw new ExecutionError("OPS_EXECUTION_APPROVAL_NOT_FOUND", executionSafeMessage("OPS_EXECUTION_APPROVAL_NOT_FOUND"), 404, false);
        }
        requireActiveApproval(approval, startedAt);
        verifyIntegrity(op);
        verifyApprovalBinding(approval, op);
        verifyFreshProject(db, op, approval);

        let payload: ReturnType<typeof normalizeAiReadAnalyzePayload>;
        try {
            payload = normalizeAiReadAnalyzePayload(JSON.parse(op.payload_json) as unknown);
        } catch {
            throw new ExecutionError("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED", executionSafeMessage("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED"), 409, false);
        }

        const attemptId = `opexec-${randomUUID()}`;
        db.prepare(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_kind, execution_status,
                trigger_actor_type, trigger_actor_id, trigger_display_name,
                executor_actor_type, executor_actor_id,
                started_at, created_at, updated_at
            ) VALUES (?, ?, ?, 'ai_read_analyze', 'started', 'human', ?, ?, 'system', 'system', ?, ?, ?)
        `).run(attemptId, op.id, approval.id, human.actorId, human.displayName, startedAt, startedAt, startedAt);

        const claimed = db.prepare(
            "UPDATE operations SET status='executing', updated_at=? WHERE id=? AND status='pending'",
        ).run(startedAt, op.id).changes;
        if (claimed !== 1) {
            throw new ExecutionError("OPS_EXECUTION_STATE_INCONSISTENT", executionSafeMessage("OPS_EXECUTION_STATE_INCONSISTENT"), 409, false);
        }

        return { replay: false, attemptId, approvalId: approval.id, operation: op, payload, startedAt };
    }).immediate();
}

function insertConsumedEvent(db: Database.Database, operationId: string, approvalId: string, now: string): void {
    db.prepare(`
        INSERT INTO operation_approval_events (
            id, operation_id, approval_id, event_type, actor_type, actor_id,
            actor_display_name, occurred_at, event_code, safe_reason, created_at
        ) VALUES (?, ?, ?, 'consumed', 'system', 'system', NULL, ?, 'EXECUTION_CONSUMED', NULL, ?)
    `).run(`ape-${randomUUID()}`, operationId, approvalId, now, now);
}

function terminalFailure(code: ExecutionErrorCode): boolean {
    return code === "OPS_EXECUTION_OPERATION_INTEGRITY_FAILED"
        || code === "OPS_EXECUTION_APPROVAL_BINDING_MISMATCH"
        || code === "OPS_EXECUTION_TARGET_STALE";
}

function finalizeFailure(
    db: Database.Database,
    claim: Claim,
    error: ExecutionError,
    finishedAt: string,
): void {
    try {
        db.transaction(() => {
            db.prepare(`
                UPDATE operation_execution_attempts
                SET execution_status='failed_before_write', finished_at=?,
                    failure_code=?, safe_failure_message=?, updated_at=?
                WHERE id=? AND execution_status='started' AND execution_kind='ai_read_analyze'
            `).run(finishedAt, error.code, executionSafeMessage(error.code), finishedAt, claim.attemptId);
            db.prepare(
                `UPDATE operations SET status=?, updated_at=? WHERE id=? AND status='executing'`,
            ).run(terminalFailure(error.code) ? "failed" : "pending", finishedAt, claim.operation.id);
        }).immediate();
    } catch {
        // Failure audit must not replace the primary safe execution error.
    }
}

function mapRuntimeError(error: unknown): ExecutionError {
    const runtimeError = error instanceof AiRuntimeError ? error : new AiRuntimeError("AI_PROVIDER_FAILED");
    switch (runtimeError.code) {
        case "AI_NOT_CONFIGURED":
            return new ExecutionError("OPS_EXECUTION_AI_NOT_CONFIGURED", executionSafeMessage("OPS_EXECUTION_AI_NOT_CONFIGURED"), 503, false);
        case "AI_TIMEOUT":
            return new ExecutionError("OPS_EXECUTION_AI_TIMEOUT", executionSafeMessage("OPS_EXECUTION_AI_TIMEOUT"), 504, true);
        case "AI_RESULT_INVALID":
            return new ExecutionError("OPS_EXECUTION_AI_RESULT_INVALID", executionSafeMessage("OPS_EXECUTION_AI_RESULT_INVALID"), 502, false);
        default:
            return new ExecutionError("OPS_EXECUTION_AI_PROVIDER_FAILED", executionSafeMessage("OPS_EXECUTION_AI_PROVIDER_FAILED"), 502, true);
    }
}

function normalizeFinalizeError(error: unknown): ExecutionError {
    if (error instanceof ExecutionError) return error;
    if (error instanceof ApprovalError) {
        return new ExecutionError("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED", executionSafeMessage("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED"), 409, false);
    }
    return new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true);
}

function finalizeSuccess(
    db: Database.Database,
    claim: Claim,
    rawResult: unknown,
    finishedAt: string,
): DispatchExecuteOperationOutcome {
    return db.transaction(() => {
        const op = loadOperation(db, claim.operation.id);
        const approval = loadApproval(db, claim.approvalId);
        if (op.status !== "executing") {
            throw new ExecutionError("OPS_EXECUTION_STATE_INCONSISTENT", executionSafeMessage("OPS_EXECUTION_STATE_INCONSISTENT"), 409, false);
        }
        requireActiveApproval(approval, finishedAt);
        verifyIntegrity(op);
        verifyApprovalBinding(approval, op);
        verifyFreshProject(db, op, approval);

        const attempt = db.prepare("SELECT * FROM operation_execution_attempts WHERE id=?").get(claim.attemptId) as ExecutionAttemptRow | undefined;
        if (!attempt || attempt.execution_status !== "started" || attempt.execution_kind !== "ai_read_analyze") {
            throw new ExecutionError("OPS_EXECUTION_STATE_INCONSISTENT", executionSafeMessage("OPS_EXECUTION_STATE_INCONSISTENT"), 409, false);
        }

        const result = validateAiReadAnalyzeResult(rawResult);
        const persisted: PersistedAiReadAnalyzeResult = {
            kind: "ai_read_analyze",
            result,
            executionMetadata: {
                operationId: op.id,
                approvalId: approval.id,
                executionAttemptId: claim.attemptId,
                contractVersion: AI_READ_ANALYZE_CONTRACT_VERSION,
                provider: AI_READ_ANALYZE_PROVIDER,
                model: AI_READ_ANALYZE_MODEL,
                startedAt: claim.startedAt,
                finishedAt,
            },
        };

        const consumed = db.prepare(`
            UPDATE operation_approvals
            SET approval_status='consumed', consumed_at=?, updated_at=?
            WHERE id=? AND operation_id=? AND approval_status='approved'
              AND expires_at > ? AND revoked_at IS NULL AND consumed_at IS NULL
        `).run(finishedAt, finishedAt, approval.id, op.id, finishedAt).changes;
        if (consumed !== 1) {
            throw new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true);
        }
        insertConsumedEvent(db, op.id, approval.id, finishedAt);

        const finalized = db.prepare(`
            UPDATE operation_execution_attempts
            SET execution_status='committed', finished_at=?,
                target_table=NULL, target_record_id=NULL, result_json=?, updated_at=?
            WHERE id=? AND execution_status='started' AND execution_kind='ai_read_analyze'
        `).run(finishedAt, canonicalJson(persisted), finishedAt, claim.attemptId).changes;
        if (finalized !== 1) {
            throw new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true);
        }

        const succeeded = db.prepare(
            "UPDATE operations SET status='succeeded', updated_at=? WHERE id=? AND status='executing'",
        ).run(finishedAt, op.id).changes;
        if (succeeded !== 1) {
            throw new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true);
        }

        const execution: AiReadAnalyzeExecutionSuccessResult = {
            attemptId: claim.attemptId,
            operationId: op.id,
            approvalId: approval.id,
            status: "committed",
            executionKind: "ai_read_analyze",
            targetTable: null,
            targetRecordId: null,
            startedAt: claim.startedAt,
            finishedAt,
            aiResult: persisted,
        };
        return { replay: false, execution };
    }).immediate();
}

export async function executeAiReadAnalyze(
    db: Database.Database,
    human: ExecutionTriggerHuman,
    operationId: string,
    rawBody: unknown,
    deps: Deps = {},
): Promise<DispatchExecuteOperationOutcome> {
    const { approvalId } = parseExecuteBody(rawBody);
    const startedAt = clock(deps);
    const claim = claimExecution(db, human, operationId, approvalId, startedAt);
    if (claim.replay) return claim.outcome;

    const runtime = deps.runtime ?? runOpenAiReadAnalyze;
    let result: unknown;
    try {
        result = validateAiReadAnalyzeResult(await runtime(claim.payload));
    } catch (error) {
        const mapped = mapRuntimeError(error);
        finalizeFailure(db, claim, mapped, clock(deps));
        throw mapped;
    }

    const finishedAt = clock(deps);
    try {
        return finalizeSuccess(db, claim, result, finishedAt);
    } catch (error) {
        const mapped = normalizeFinalizeError(error);
        finalizeFailure(db, claim, mapped, finishedAt);
        throw mapped;
    }
}
