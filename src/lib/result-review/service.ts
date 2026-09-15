import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import {
    loadBoundCommittedAiResult,
    ResultBindingError,
} from "./resultBinding";
import {
    RESULT_REVIEW_CONTRACT_VERSION,
    type ArborResultReview,
    type HumanResultDecision,
    type ReconciliationCandidate,
    type ResultDecisionRecord,
    type ResultReviewView,
} from "./types";

export type ResultReviewErrorCode =
    | "RESULT_REVIEW_AUTH_REQUIRED"
    | "RESULT_NOT_REVIEWABLE"
    | "RESULT_BINDING_INVALID"
    | "RESULT_FINGERPRINT_MISMATCH"
    | "RESULT_DECISION_INVALID"
    | "RESULT_REVIEW_SCHEMA_NOT_READY"
    | "DECISION_ALREADY_FINAL"
    | "RESULT_REVIEW_INTERNAL_ERROR";

export class ResultReviewError extends Error {
    constructor(
        readonly code: ResultReviewErrorCode,
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "ResultReviewError";
    }
}

type HumanActor = {
    actorId: string;
    displayName: string;
};

type DecisionInput = {
    expectedResultFingerprint: string;
    decision: HumanResultDecision;
    reason: string | null;
    returnInstruction: string | null;
};

type DecisionRow = {
    id: string;
    operation_id: string;
    execution_attempt_id: string;
    approval_id: string;
    result_fingerprint: string;
    review_contract_version: string;
    arbor_review_json: string;
    decision: HumanResultDecision;
    decided_by_actor_id: string;
    decided_by_display_name: string;
    reason: string | null;
    return_instruction: string | null;
    decided_at: string;
    created_at: string;
};

function tableExists(
    db: Database.Database,
    name: string,
): boolean {
    return Boolean(
        db.prepare(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        ).get(name),
    );
}

function bindResult(
    db: Database.Database,
    operationId: string,
) {
    try {
        return loadBoundCommittedAiResult(
            db,
            operationId,
        );
    } catch (error) {
        if (error instanceof ResultBindingError) {
            throw new ResultReviewError(
                error.code,
                error.message,
                error.code === "RESULT_NOT_REVIEWABLE"
                    ? 409
                    : 500,
            );
        }

        throw error;
    }
}

function buildArborReview(
    sourceResult: {
        summary: string;
        findings: string[];
        evidence: string[];
        limitations: string[];
    },
): ArborResultReview {
    const evidenceGaps =
        sourceResult.evidence.length === 0
            ? [
                  "The committed P5 result contains no evidence entries.",
              ]
            : [];

    return {
        reviewStatus:
            evidenceGaps.length > 0
                ? "INSUFFICIENT_EVIDENCE"
                : "READY_FOR_HUMAN_DECISION",
        assessment: sourceResult.summary,
        recommendation:
            "NO_RECOMMENDATION",
        recommendationRationale:
            "ACC-P6 V1 preserves Human-only decision authority. This deterministic Arbor review does not infer ACCEPT, REJECT, or RETURN from the P5 result.",
        identifiedRisks: [
            ...sourceResult.limitations,
        ],
        evidenceGaps,
        proposedNextAction:
            "Human reviews the bound result and records ACCEPTED, REJECTED, or RETURNED.",
        reviewAuthority:
            "ARBOR_ADVISORY",
        decisionAuthority:
            "HUMAN",
        canonicalMutation:
            "NONE",
    };
}

function readDecisionRow(
    db: Database.Database,
    executionAttemptId: string,
): DecisionRow | null {
    if (
        !tableExists(
            db,
            "operation_result_decisions",
        )
    ) {
        return null;
    }

    return (
        db.prepare(`
            SELECT *
            FROM operation_result_decisions
            WHERE execution_attempt_id = ?
            LIMIT 1
        `).get(
            executionAttemptId,
        ) as DecisionRow | undefined
    ) ?? null;
}

function parseDecision(
    row: DecisionRow | null,
): ResultDecisionRecord | null {
    if (!row) return null;

    if (
        row.review_contract_version
        !== RESULT_REVIEW_CONTRACT_VERSION
    ) {
        throw new ResultReviewError(
            "RESULT_BINDING_INVALID",
            "Stored result decision uses an unsupported review contract",
            500,
        );
    }

    return {
        id: row.id,
        operationId:
            row.operation_id,
        executionAttemptId:
            row.execution_attempt_id,
        approvalId:
            row.approval_id,
        resultFingerprint:
            row.result_fingerprint,
        reviewContractVersion:
            RESULT_REVIEW_CONTRACT_VERSION,
        decision:
            row.decision,
        decidedByActorId:
            row.decided_by_actor_id,
        decidedByDisplayName:
            row.decided_by_display_name,
        decidedAt:
            row.decided_at,
        reason:
            row.reason,
        returnInstruction:
            row.return_instruction,
        createdAt:
            row.created_at,
    };
}

function persistedArborReview(
    row: DecisionRow | null,
    fallback: ArborResultReview,
): ArborResultReview {
    if (!row) return fallback;

    try {
        return JSON.parse(
            row.arbor_review_json,
        ) as ArborResultReview;
    } catch {
        throw new ResultReviewError(
            "RESULT_BINDING_INVALID",
            "Stored Arbor review snapshot is invalid",
            500,
        );
    }
}

function reconciliationFor(
    decision: ResultDecisionRecord | null,
): ReconciliationCandidate {
    if (!decision) {
        return {
            status: "PENDING",
            candidateProjectState: null,
            candidateNextAction: null,
            reconciliationReason:
                "No final Human result decision has been recorded.",
        };
    }

    if (
        decision.decision === "REJECTED"
    ) {
        return {
            status: "NOT_REQUIRED",
            candidateProjectState: null,
            candidateNextAction: null,
            reconciliationReason:
                "The Human rejected this result as downstream evidence. Canonical Project state remains unchanged.",
        };
    }

    if (
        decision.decision === "RETURNED"
    ) {
        return {
            status:
                "REQUIRES_SEPARATE_ACTION",
            candidateProjectState: null,
            candidateNextAction: null,
            reconciliationReason:
                "Follow-up requires a separately authorized operation/execution path. No retry or Project-state mutation is automatic.",
        };
    }

    return {
        status:
            "REQUIRES_SEPARATE_ACTION",
        candidateProjectState: null,
        candidateNextAction: null,
        reconciliationReason:
            "The Human accepted this result as evidence input only. Any canonical Project-state or next-action change requires separate authorization.",
    };
}

function optionalText(
    value: unknown,
    field: string,
): string | null {
    if (
        value === undefined
        || value === null
    ) {
        return null;
    }

    if (
        typeof value !== "string"
    ) {
        throw new ResultReviewError(
            "RESULT_DECISION_INVALID",
            `${field} must be a string when provided`,
            400,
        );
    }

    const normalized =
        value.trim();

    return normalized.length > 0
        ? normalized
        : null;
}

function parseDecisionInput(
    input: unknown,
): DecisionInput {
    if (
        !input
        || typeof input !== "object"
        || Array.isArray(input)
    ) {
        throw new ResultReviewError(
            "RESULT_DECISION_INVALID",
            "Result decision body must be an object",
            400,
        );
    }

    const body =
        input as Record<
            string,
            unknown
        >;

    const expectedResultFingerprint =
        body.expectedResultFingerprint;

    const decision =
        body.decision;

    if (
        typeof expectedResultFingerprint !== "string"
        || expectedResultFingerprint.length === 0
    ) {
        throw new ResultReviewError(
            "RESULT_DECISION_INVALID",
            "expectedResultFingerprint is required",
            400,
        );
    }

    if (
        decision !== "ACCEPTED"
        && decision !== "REJECTED"
        && decision !== "RETURNED"
    ) {
        throw new ResultReviewError(
            "RESULT_DECISION_INVALID",
            "decision must be ACCEPTED, REJECTED, or RETURNED",
            400,
        );
    }

    const reason =
        optionalText(
            body.reason,
            "reason",
        );

    const returnInstruction =
        optionalText(
            body.returnInstruction,
            "returnInstruction",
        );

    if (
        decision !== "RETURNED"
        && returnInstruction !== null
    ) {
        throw new ResultReviewError(
            "RESULT_DECISION_INVALID",
            "returnInstruction is only valid for RETURNED decisions",
            400,
        );
    }

    return {
        expectedResultFingerprint,
        decision,
        reason,
        returnInstruction,
    };
}

function isIdenticalDecision(
    existing: DecisionRow,
    input: DecisionInput,
    human: HumanActor,
    operationId: string,
    executionAttemptId: string,
    approvalId: string,
    resultFingerprint: string,
): boolean {
    return (
        existing.operation_id
            === operationId
        && existing.execution_attempt_id
            === executionAttemptId
        && existing.approval_id
            === approvalId
        && existing.result_fingerprint
            === resultFingerprint
        && existing.review_contract_version
            === RESULT_REVIEW_CONTRACT_VERSION
        && existing.decision
            === input.decision
        && existing.decided_by_actor_id
            === human.actorId
        && existing.decided_by_display_name
            === human.displayName
        && existing.reason
            === input.reason
        && existing.return_instruction
            === input.returnInstruction
    );
}

export function prepareResultReview(
    db: Database.Database,
    operationId: string,
): ResultReviewView {
    const bound =
        bindResult(
            db,
            operationId,
        );

    const computedArborReview =
        buildArborReview(
            bound.sourceResult,
        );

    const existing =
        readDecisionRow(
            db,
            bound.binding
                .executionAttemptId,
        );

    if (
        existing
        && (
            existing.operation_id
                !== bound.binding.operationId
            || existing.approval_id
                !== bound.binding.approvalId
            || existing.result_fingerprint
                !== bound.binding.resultFingerprint
        )
    ) {
        throw new ResultReviewError(
            "RESULT_BINDING_INVALID",
            "Stored Human decision no longer matches the committed result binding",
            500,
        );
    }

    const decision =
        parseDecision(existing);

    return {
        binding:
            bound.binding,
        sourceResult:
            bound.sourceResult,
        arborReview:
            persistedArborReview(
                existing,
                computedArborReview,
            ),
        humanDecisionState:
            decision?.decision
            ?? "AWAITING_HUMAN_DECISION",
        decision,
        decisionStoreReady:
            tableExists(
                db,
                "operation_result_decisions",
            ),
        reconciliation:
            reconciliationFor(
                decision,
            ),
    };
}

export function getResultReview(
    db: Database.Database,
    operationId: string,
): ResultReviewView {
    return prepareResultReview(
        db,
        operationId,
    );
}

export function recordHumanResultDecision(
    db: Database.Database,
    human: HumanActor,
    operationId: string,
    input: unknown,
    options: {
        now?: string;
        decisionId?: string;
    } = {},
): {
    ok: true;
    replay: boolean;
    review: ResultReviewView;
} {
    const parsed =
        parseDecisionInput(input);

    const bound =
        bindResult(
            db,
            operationId,
        );

    if (
        parsed.expectedResultFingerprint
        !== bound.binding
            .resultFingerprint
    ) {
        throw new ResultReviewError(
            "RESULT_FINGERPRINT_MISMATCH",
            "The committed result changed since it was reviewed",
            409,
        );
    }

    if (
        !tableExists(
            db,
            "operation_result_decisions",
        )
    ) {
        throw new ResultReviewError(
            "RESULT_REVIEW_SCHEMA_NOT_READY",
            "Result-decision persistence is not available until its separately authorized schema migration is completed",
            503,
        );
    }

    const arborReview =
        buildArborReview(
            bound.sourceResult,
        );

    const now =
        options.now
        ?? new Date().toISOString();

    const decisionId =
        options.decisionId
        ?? `rdec-${randomUUID()}`;

    const replay =
        db.transaction(() => {
            const existing =
                readDecisionRow(
                    db,
                    bound.binding
                        .executionAttemptId,
                );

            if (existing) {
                if (
                    isIdenticalDecision(
                        existing,
                        parsed,
                        human,
                        operationId,
                        bound.binding
                            .executionAttemptId,
                        bound.binding
                            .approvalId,
                        bound.binding
                            .resultFingerprint,
                    )
                ) {
                    return true;
                }

                throw new ResultReviewError(
                    "DECISION_ALREADY_FINAL",
                    "A different final Human decision already exists for this execution result",
                    409,
                );
            }

            db.prepare(`
                INSERT INTO operation_result_decisions (
                    id,
                    operation_id,
                    execution_attempt_id,
                    approval_id,
                    result_fingerprint,
                    review_contract_version,
                    arbor_review_json,
                    decision,
                    decided_by_actor_type,
                    decided_by_actor_id,
                    decided_by_display_name,
                    reason,
                    return_instruction,
                    decided_at,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'human', ?, ?, ?, ?, ?, ?, ?)
            `).run(
                decisionId,
                operationId,
                bound.binding
                    .executionAttemptId,
                bound.binding
                    .approvalId,
                bound.binding
                    .resultFingerprint,
                RESULT_REVIEW_CONTRACT_VERSION,
                JSON.stringify(
                    arborReview,
                ),
                parsed.decision,
                human.actorId,
                human.displayName,
                parsed.reason,
                parsed.returnInstruction,
                now,
                now,
                now,
            );

            return false;
        }).immediate();

    return {
        ok: true,
        replay,
        review:
            prepareResultReview(
                db,
                operationId,
            ),
    };
}

export function toResultReviewErrorResponse(
    error: unknown,
): {
    error: {
        code: ResultReviewErrorCode;
        message: string;
        status: number;
    };
} {
    if (
        error instanceof ResultReviewError
    ) {
        return {
            error: {
                code: error.code,
                message: error.message,
                status: error.status,
            },
        };
    }

    return {
        error: {
            code:
                "RESULT_REVIEW_INTERNAL_ERROR",
            message:
                "Unable to complete result review",
            status: 500,
        },
    };
}
