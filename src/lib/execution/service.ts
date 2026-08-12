// ---------------------------------------------------------------------------
// WorkOS-Lite human-triggered execution service
// AUTOMATION-001-P1D.1
// backlog.create only. The whole decision runs inside BEGIN IMMEDIATE; the
// committed-attempt replay barrier precedes every other execution gate so a
// lost HTTP response can safely replay a committed result.
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import { ApprovalError } from "@/lib/approvals/errors";
import { verifyOperationIntegrity } from "@/lib/approvals/operationIntegrity";
import type { ApprovalRow, OperationRow } from "@/lib/approvals/types";
import { normalizeBacklogCreatePayload } from "@/lib/operations/adapters/backlogCreate";
import { canonicalJson } from "@/lib/operations/canonicalization";
import { insertProjectItem } from "@/lib/projects/backlogWrite";
import type { ParsedProjectItem } from "@/lib/projects/backlogWrite";
import { ExecutionError, executionSafeMessage } from "./errors";
import type {
    ExecuteOperationOutcome,
    ExecutionAttemptRow,
    ExecutionSuccessResult,
    ExecutionTriggerHuman,
} from "./types";

type Deps = { now?: string };

function nowIso(deps: Deps): string {
    return deps.now ?? new Date().toISOString();
}

function parseExecuteBody(body: unknown): { approvalId: string } {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new ExecutionError("OPS_EXECUTION_INVALID_REQUEST", executionSafeMessage("OPS_EXECUTION_INVALID_REQUEST"), 400, false);
    }
    const obj = body as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
        if (key !== "approvalId") {
            throw new ExecutionError("OPS_EXECUTION_INVALID_REQUEST", executionSafeMessage("OPS_EXECUTION_INVALID_REQUEST"), 400, false);
        }
    }
    const { approvalId } = obj;
    if (typeof approvalId !== "string" || !/^apr-/.test(approvalId)) {
        throw new ExecutionError("OPS_EXECUTION_INVALID_REQUEST", executionSafeMessage("OPS_EXECUTION_INVALID_REQUEST"), 400, false);
    }
    return { approvalId };
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

function findCommittedAttempt(db: Database.Database, operationId: string): ExecutionAttemptRow | undefined {
    return db.prepare(`
        SELECT * FROM operation_execution_attempts
        WHERE operation_id = ? AND execution_status = 'committed'
        LIMIT 1
    `).get(operationId) as ExecutionAttemptRow | undefined;
}

function committedToResult(attempt: ExecutionAttemptRow): ExecutionSuccessResult {
    return {
        attemptId: attempt.id,
        operationId: attempt.operation_id,
        approvalId: attempt.approval_id,
        status: "committed",
        targetTable: "project_items",
        targetRecordId: attempt.target_record_id ?? "",
        startedAt: attempt.started_at,
        finishedAt: attempt.finished_at ?? attempt.started_at,
    };
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
    let previewMatches = false;
    try {
        previewMatches =
            canonicalJson(JSON.parse(approval.preview_json) as unknown) ===
            canonicalJson(JSON.parse(op.preview_json) as unknown);
    } catch {
        previewMatches = false;
    }
    if (!previewMatches) {
        throw new ExecutionError("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH", executionSafeMessage("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH"), 409, false);
    }
}

function insertStartedAttempt(
    db: Database.Database,
    input: {
        id: string;
        operationId: string;
        approvalId: string;
        human: ExecutionTriggerHuman;
        startedAt: string;
        now: string;
    },
): void {
    db.prepare(`
        INSERT INTO operation_execution_attempts (
            id, operation_id, approval_id, execution_status,
            trigger_actor_type, trigger_actor_id, trigger_display_name,
            executor_actor_type, executor_actor_id,
            started_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'started', 'human', ?, ?, 'system', 'system', ?, ?, ?)
    `).run(
        input.id,
        input.operationId,
        input.approvalId,
        input.human.actorId,
        input.human.displayName,
        input.startedAt,
        input.now,
        input.now,
    );
}

function insertConsumedEvent(db: Database.Database, operationId: string, approvalId: string, now: string): void {
    db.prepare(`
        INSERT INTO operation_approval_events (
            id, operation_id, approval_id, event_type, actor_type, actor_id,
            actor_display_name, occurred_at, event_code, safe_reason, created_at
        ) VALUES (?, ?, ?, 'consumed', 'system', 'system', NULL, ?, 'EXECUTION_CONSUMED', NULL, ?)
    `).run(`ape-${randomUUID()}`, operationId, approvalId, now, now);
}

function persistFailureAudit(
    db: Database.Database,
    input: {
        operationId: string;
        approvalId: string;
        human: ExecutionTriggerHuman;
        status: "failed_before_write" | "rolled_back";
        failureCode: string;
        safeMessage: string;
        startedAt: string;
        finishedAt: string;
        now: string;
    },
): void {
    try {
        db.prepare(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_status,
                trigger_actor_type, trigger_actor_id, trigger_display_name,
                executor_actor_type, executor_actor_id,
                started_at, finished_at, failure_code, safe_failure_message,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'human', ?, ?, 'system', 'system', ?, ?, ?, ?, ?, ?)
        `).run(
            `opexec-${randomUUID()}`,
            input.operationId,
            input.approvalId,
            input.status,
            input.human.actorId,
            input.human.displayName,
            input.startedAt,
            input.finishedAt,
            input.failureCode,
            input.safeMessage,
            input.now,
            input.now,
        );
    } catch {
        // Failure-audit persistence must never mask the original execution error.
    }
}

function casOperationFailed(db: Database.Database, operationId: string, now: string): void {
    try {
        db.prepare("UPDATE operations SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'pending'")
            .run(now, operationId);
    } catch {
        // CAS-only; never masks the original error.
    }
}

export function executeOperation(
    db: Database.Database,
    human: ExecutionTriggerHuman,
    operationId: string,
    rawBody: unknown,
    deps: Deps = {},
): ExecuteOperationOutcome {
    const now = nowIso(deps);
    const body = parseExecuteBody(rawBody);
    const state = {
        operationId: null as string | null,
        approvalId: null as string | null,
        validPair: false,
        writeSection: false,
        terminal: false,
    };

    try {
        return db.transaction(() => {
            const op = loadOperation(db, operationId);
            state.operationId = op.id;

            // 1. Committed-replay barrier FIRST: succeeds even though the
            // operation is already succeeded and the approval is consumed.
            const committed = findCommittedAttempt(db, op.id);
            if (committed) {
                if (committed.approval_id !== body.approvalId) {
                    throw new ExecutionError("OPS_EXECUTION_CONFLICT", executionSafeMessage("OPS_EXECUTION_CONFLICT"), 409, false);
                }
                const replayOutcome: ExecuteOperationOutcome = { replay: true, execution: committedToResult(committed) };
                return replayOutcome;
            }

            // 2. Operation state gate (only when no committed attempt exists).
            if (op.status !== "pending") {
                if (op.status === "failed") {
                    throw new ExecutionError("OPS_EXECUTION_NOT_EXECUTABLE", executionSafeMessage("OPS_EXECUTION_NOT_EXECUTABLE"), 409, false);
                }
                throw new ExecutionError("OPS_EXECUTION_STATE_INCONSISTENT", executionSafeMessage("OPS_EXECUTION_STATE_INCONSISTENT"), 409, false);
            }

            // 3. Exact approval issuance + pair validation.
            const approval = loadApproval(db, body.approvalId);
            if (approval.operation_id !== op.id) {
                throw new ExecutionError("OPS_EXECUTION_APPROVAL_NOT_FOUND", executionSafeMessage("OPS_EXECUTION_APPROVAL_NOT_FOUND"), 404, false);
            }
            state.approvalId = approval.id;
            state.validPair = true;

            // 4. Approval effective state.
            if (approval.approval_status !== "approved") {
                if (approval.approval_status === "consumed") {
                    throw new ExecutionError("OPS_EXECUTION_APPROVAL_CONSUMED", executionSafeMessage("OPS_EXECUTION_APPROVAL_CONSUMED"), 409, false);
                }
                if (approval.approval_status === "revoked") {
                    throw new ExecutionError("OPS_EXECUTION_APPROVAL_REVOKED", executionSafeMessage("OPS_EXECUTION_APPROVAL_REVOKED"), 409, false);
                }
                throw new ExecutionError("OPS_EXECUTION_APPROVAL_EXPIRED", executionSafeMessage("OPS_EXECUTION_APPROVAL_EXPIRED"), 409, false);
            }
            if (approval.expires_at <= now) {
                throw new ExecutionError("OPS_EXECUTION_APPROVAL_EXPIRED", executionSafeMessage("OPS_EXECUTION_APPROVAL_EXPIRED"), 409, false);
            }
            if (approval.revoked_at !== null) {
                throw new ExecutionError("OPS_EXECUTION_APPROVAL_REVOKED", executionSafeMessage("OPS_EXECUTION_APPROVAL_REVOKED"), 409, false);
            }
            if (approval.consumed_at !== null) {
                throw new ExecutionError("OPS_EXECUTION_APPROVAL_CONSUMED", executionSafeMessage("OPS_EXECUTION_APPROVAL_CONSUMED"), 409, false);
            }

            // 5. Operation integrity (mapped to execution boundary).
            try {
                verifyOperationIntegrity(op);
            } catch (error) {
                if (error instanceof ApprovalError) {
                    state.terminal = true;
                    throw new ExecutionError("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED", executionSafeMessage("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED"), 409, false);
                }
                throw error;
            }

            // 6. Complete approval binding + preview_json.
            try {
                verifyApprovalBinding(approval, op);
            } catch (error) {
                if (error instanceof ExecutionError) {
                    state.terminal = true;
                }
                throw error;
            }

            // 7. Fresh target re-resolution.
            const fresh = db.prepare("SELECT id FROM projects WHERE slug = ?").get(op.target_ref) as
                | { id: string }
                | undefined;
            if (!fresh || fresh.id !== op.resolved_target_id || fresh.id !== approval.bound_resolved_target_id) {
                state.terminal = true;
                throw new ExecutionError("OPS_EXECUTION_TARGET_STALE", executionSafeMessage("OPS_EXECUTION_TARGET_STALE"), 409, false);
            }

            // 8. Canonical normalized payload (write source).
            let normalized;
            try {
                normalized = normalizeBacklogCreatePayload(JSON.parse(op.payload_json) as unknown);
            } catch {
                state.terminal = true;
                throw new ExecutionError("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED", executionSafeMessage("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED"), 409, false);
            }

            // 9. Ephemeral started attempt.
            const attemptId = `opexec-${randomUUID()}`;
            insertStartedAttempt(db, {
                id: attemptId,
                operationId: op.id,
                approvalId: approval.id,
                human,
                startedAt: now,
                now,
            });

            // 10. CAS pending → executing.
            const executing = db.prepare(
                "UPDATE operations SET status = 'executing', updated_at = ? WHERE id = ? AND status = 'pending'",
            ).run(now, op.id).changes;
            if (executing !== 1) {
                throw new ExecutionError("OPS_EXECUTION_STATE_INCONSISTENT", executionSafeMessage("OPS_EXECUTION_STATE_INCONSISTENT"), 409, false);
            }

            // 11. Domain-write section.
            state.writeSection = true;
            // P1D.W primitive is frozen; the normalized payload is structurally
            // identical (schema-validated) and only differs in literal narrowing.
            const targetId = insertProjectItem(db, fresh.id, normalized as unknown as ParsedProjectItem);

            // 12. Approval consume CAS.
            const consumed = db.prepare(`
                UPDATE operation_approvals
                SET approval_status = 'consumed', consumed_at = ?, updated_at = ?
                WHERE id = ?
                  AND operation_id = ?
                  AND approval_status = 'approved'
                  AND expires_at > ?
                  AND revoked_at IS NULL
                  AND consumed_at IS NULL
            `).run(now, now, approval.id, op.id, now).changes;
            if (consumed !== 1) {
                throw new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true);
            }

            // 13. Consumed audit event.
            insertConsumedEvent(db, op.id, approval.id, now);

            // 14. Finalize attempt → committed (atomic with domain write).
            const resultJson = canonicalJson({
                targetTable: "project_items",
                targetRecordId: targetId,
                startedAt: now,
                finishedAt: now,
            });
            const finalized = db.prepare(`
                UPDATE operation_execution_attempts
                SET execution_status = 'committed', finished_at = ?,
                    target_table = 'project_items', target_record_id = ?,
                    result_json = ?, updated_at = ?
                WHERE id = ? AND execution_status = 'started'
            `).run(now, targetId, resultJson, now, attemptId).changes;
            if (finalized !== 1) {
                throw new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true);
            }

            // 15. CAS executing → succeeded.
            const succeeded = db.prepare(
                "UPDATE operations SET status = 'succeeded', updated_at = ? WHERE id = ? AND status = 'executing'",
            ).run(now, op.id).changes;
            if (succeeded !== 1) {
                throw new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true);
            }

            const successOutcome: ExecuteOperationOutcome = {
                replay: false,
                execution: {
                    attemptId,
                    operationId: op.id,
                    approvalId: approval.id,
                    status: "committed",
                    targetTable: "project_items",
                    targetRecordId: targetId,
                    startedAt: now,
                    finishedAt: now,
                },
            };
            return successOutcome;
        }).immediate();
    } catch (error) {
        const executionError =
            state.writeSection && !(error instanceof ExecutionError)
                ? new ExecutionError("OPS_EXECUTION_ROLLED_BACK", executionSafeMessage("OPS_EXECUTION_ROLLED_BACK"), 500, true)
                : normalizeExecutionError(error);
        if (state.validPair && state.operationId !== null && state.approvalId !== null) {
            persistFailureAudit(db, {
                operationId: state.operationId,
                approvalId: state.approvalId,
                human,
                status: state.writeSection ? "rolled_back" : "failed_before_write",
                failureCode: executionError.code,
                safeMessage: executionSafeMessage(executionError.code),
                startedAt: now,
                finishedAt: now,
                now,
            });
            if (state.terminal) {
                casOperationFailed(db, state.operationId, now);
            }
        }
        throw executionError;
    }
}

function normalizeExecutionError(error: unknown): ExecutionError {
    if (error instanceof ExecutionError) return error;
    return new ExecutionError("OPS_EXECUTION_INTERNAL_ERROR", executionSafeMessage("OPS_EXECUTION_INTERNAL_ERROR"), 500, true);
}
