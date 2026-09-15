import type { PersistedAiReadAnalyzeResult } from "@/lib/execution/types";

export const RESULT_REVIEW_CONTRACT_VERSION = "ACC-P6-REVIEW-CONTRACT-v0.1" as const;

export type ResultReviewStatus =
    | "READY_FOR_HUMAN_DECISION"
    | "NEEDS_HUMAN_JUDGMENT"
    | "INSUFFICIENT_EVIDENCE";

export type ResultRecommendation =
    | "ACCEPT"
    | "REJECT"
    | "RETURN"
    | "NO_RECOMMENDATION";

export type HumanResultDecision =
    | "ACCEPTED"
    | "REJECTED"
    | "RETURNED";

export type HumanResultDecisionState =
    | "AWAITING_HUMAN_DECISION"
    | HumanResultDecision;

export type ReconciliationStatus =
    | "PENDING"
    | "NOT_REQUIRED"
    | "REQUIRES_SEPARATE_ACTION";

type ExecutionMetadata = PersistedAiReadAnalyzeResult["executionMetadata"];

export type ResultReviewBinding = {
    operationId: string;
    executionAttemptId: string;
    approvalId: string;
    executionKind: "ai_read_analyze";
    executionStatus: "committed";
    resultFingerprint: string;
    reviewContractVersion: typeof RESULT_REVIEW_CONTRACT_VERSION;
    executionContractVersion: string;
    provider: ExecutionMetadata["provider"];
    model: ExecutionMetadata["model"];
    executionStartedAt: string;
    executionFinishedAt: string;
};

export type ArborResultReview = {
    reviewStatus: ResultReviewStatus;
    assessment: string;
    recommendation: ResultRecommendation;
    recommendationRationale: string;
    identifiedRisks: string[];
    evidenceGaps: string[];
    proposedNextAction: string;
    reviewAuthority: "ARBOR_ADVISORY";
    decisionAuthority: "HUMAN";
    canonicalMutation: "NONE";
};

export type ResultDecisionRecord = {
    id: string;
    operationId: string;
    executionAttemptId: string;
    approvalId: string;
    resultFingerprint: string;
    reviewContractVersion: typeof RESULT_REVIEW_CONTRACT_VERSION;
    decision: HumanResultDecision;
    decidedByActorId: string;
    decidedByDisplayName: string;
    decidedAt: string;
    reason: string | null;
    returnInstruction: string | null;
    createdAt: string;
};

export type ReconciliationCandidate = {
    status: ReconciliationStatus;
    candidateProjectState: null;
    candidateNextAction: null;
    reconciliationReason: string;
};

export type ResultReviewView = {
    binding: ResultReviewBinding;
    sourceResult: PersistedAiReadAnalyzeResult["result"];
    arborReview: ArborResultReview;
    humanDecisionState: HumanResultDecisionState;
    decision: ResultDecisionRecord | null;
    decisionStoreReady: boolean;
    reconciliation: ReconciliationCandidate;
};
