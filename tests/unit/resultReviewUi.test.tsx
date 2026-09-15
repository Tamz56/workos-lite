import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
    renderToStaticMarkup,
} from "react-dom/server";
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    ArborResultReviewPanelContent,
} from "@/components/operations-review/ArborResultReviewPanel";
import {
    postHumanResultDecision,
} from "@/components/operations-review/api";
import type {
    ResultReviewView,
} from "@/components/operations-review/types";

function review(
    overrides:
        Partial<ResultReviewView> = {},
): ResultReviewView {
    return {
        binding: {
            operationId:
                "op-1",
            executionAttemptId:
                "opexec-1",
            approvalId:
                "apr-1",
            executionKind:
                "ai_read_analyze",
            executionStatus:
                "committed",
            resultFingerprint:
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            reviewContractVersion:
                "ACC-P6-REVIEW-CONTRACT-v0.1",
            executionContractVersion:
                "ai.read_analyze.v1",
            provider:
                "deepseek",
            model:
                "deepseek-v4-flash",
            executionStartedAt:
                "2026-09-15T10:00:00.000Z",
            executionFinishedAt:
                "2026-09-15T10:01:00.000Z",
        },
        sourceResult: {
            summary:
                "Summary",
            findings: [
                "Finding",
            ],
            evidence: [
                "Evidence",
            ],
            limitations: [
                "Limitation",
            ],
        },
        arborReview: {
            reviewStatus:
                "READY_FOR_HUMAN_DECISION",
            assessment:
                "Assessment",
            recommendation:
                "NO_RECOMMENDATION",
            recommendationRationale:
                "Advisory only",
            identifiedRisks: [
                "Risk",
            ],
            evidenceGaps: [],
            proposedNextAction:
                "Human decides",
            reviewAuthority:
                "ARBOR_ADVISORY",
            decisionAuthority:
                "HUMAN",
            canonicalMutation:
                "NONE",
        },
        humanDecisionState:
            "AWAITING_HUMAN_DECISION",
        decision: null,
        decisionStoreReady:
            true,
        reconciliation: {
            status:
                "PENDING",
            candidateProjectState:
                null,
            candidateNextAction:
                null,
            reconciliationReason:
                "Awaiting Human decision",
        },
        ...overrides,
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe(
    "ACC-P6 review UI authority separation",
    () => {
        it(
            "separates Arbor recommendation from Human decision and shows provenance",
            () => {
                const html =
                    renderToStaticMarkup(
                        <ArborResultReviewPanelContent
                            review={
                                review()
                            }
                            busy={
                                false
                            }
                            onDecide={
                                () =>
                                    undefined
                            }
                        />,
                    );

                expect(
                    html,
                ).toContain(
                    "Execution Provenance + Review Binding",
                );

                expect(
                    html,
                ).toContain(
                    "Result Fingerprint",
                );

                expect(
                    html,
                ).toContain(
                    "Review Contract",
                );

                expect(
                    html,
                ).toContain(
                    "ACC-P6-REVIEW-CONTRACT-v0.1",
                );

                expect(
                    html,
                ).toContain(
                    "deepseek-v4-flash",
                );

                expect(
                    html,
                ).toContain(
                    "Arbor Review",
                );

                expect(
                    html,
                ).toContain(
                    "Recommendation — Advisory Only",
                );

                expect(
                    html,
                ).toContain(
                    "Human Decision",
                );

                expect(
                    html,
                ).toContain(
                    "Accept result",
                );

                expect(
                    html,
                ).toContain(
                    "Reject result",
                );

                expect(
                    html,
                ).toContain(
                    "Return for follow-up",
                );

                expect(
                    html,
                ).toContain(
                    "Canonical mutation: NONE",
                );

                expect(
                    html,
                ).toContain(
                    "Reconciliation Status",
                );
            },
        );

        it(
            "shows final Human evidence and removes decision actions",
            () => {
                const finalReview =
                    review({
                        humanDecisionState:
                            "ACCEPTED",
                        decision: {
                            id:
                                "rdec-1",
                            operationId:
                                "op-1",
                            executionAttemptId:
                                "opexec-1",
                            approvalId:
                                "apr-1",
                            resultFingerprint:
                                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                            reviewContractVersion:
                                "ACC-P6-REVIEW-CONTRACT-v0.1",
                            decision:
                                "ACCEPTED",
                            decidedByActorId:
                                "human-1",
                            decidedByDisplayName:
                                "Owner",
                            decidedAt:
                                "2026-09-15T11:00:00.000Z",
                            reason:
                                "Reviewed",
                            returnInstruction:
                                null,
                            createdAt:
                                "2026-09-15T11:00:00.000Z",
                        },
                        reconciliation: {
                            status:
                                "REQUIRES_SEPARATE_ACTION",
                            candidateProjectState:
                                null,
                            candidateNextAction:
                                null,
                            reconciliationReason:
                                "Separate action required",
                        },
                    });

                const html =
                    renderToStaticMarkup(
                        <ArborResultReviewPanelContent
                            review={
                                finalReview
                            }
                            busy={
                                false
                            }
                            onDecide={
                                () =>
                                    undefined
                            }
                        />,
                    );

                expect(
                    html,
                ).toContain(
                    "ACCEPTED",
                );

                expect(
                    html,
                ).toContain(
                    "Owner",
                );

                expect(
                    html,
                ).toContain(
                    "rdec-1",
                );

                expect(
                    html,
                ).not.toContain(
                    ">Accept result<",
                );

                expect(
                    html,
                ).not.toContain(
                    ">Reject result<",
                );

                expect(
                    html,
                ).not.toContain(
                    ">Return for follow-up<",
                );
            },
        );

        it(
            "fails safe when decision schema has not been migrated",
            () => {
                const html =
                    renderToStaticMarkup(
                        <ArborResultReviewPanelContent
                            review={
                                review({
                                    decisionStoreReady:
                                        false,
                                })
                            }
                            busy={
                                false
                            }
                            onDecide={
                                () =>
                                    undefined
                            }
                        />,
                    );

                expect(
                    html,
                ).toContain(
                    "separately authorized schema migration",
                );

                expect(
                    html,
                ).not.toContain(
                    ">Accept result<",
                );
            },
        );
    },
);

describe(
    "ACC-P6 Human decision API client",
    () => {
        it(
            "sends exact fingerprint-bound Human decision",
            async () => {
                const fetchMock =
                    vi.fn()
                        .mockResolvedValue(
                            new Response(
                                JSON.stringify(
                                    {
                                        ok:
                                            true,
                                        replay:
                                            false,
                                        review:
                                            review(),
                                    },
                                ),
                                {
                                    status:
                                        200,
                                    headers: {
                                        "content-type":
                                            "application/json",
                                    },
                                },
                            ),
                        );

                vi.stubGlobal(
                    "fetch",
                    fetchMock,
                );

                await postHumanResultDecision(
                    "op-1",
                    "fingerprint-1",
                    "RETURNED",
                    {
                        returnInstruction:
                            "Collect more evidence",
                    },
                );

                expect(
                    fetchMock,
                ).toHaveBeenCalledTimes(
                    1,
                );

                const [
                    url,
                    init,
                ] =
                    fetchMock
                        .mock
                        .calls[0];

                expect(
                    url,
                ).toBe(
                    "/api/human/operations/op-1/result-decision",
                );

                expect(
                    init.method,
                ).toBe(
                    "POST",
                );

                expect(
                    JSON.parse(
                        init.body as string,
                    ),
                ).toEqual({
                    expectedResultFingerprint:
                        "fingerprint-1",
                    decision:
                        "RETURNED",
                    returnInstruction:
                        "Collect more evidence",
                });
            },
        );
    },
);

describe(
    "ACC-P6 OperationReviewDetail integration",
    () => {
        it(
            "mounts P6 panel only after committed AI result",
            () => {
                const source =
                    fs.readFileSync(
                        path.resolve(
                            process.cwd(),
                            "src/components/operations-review/OperationReviewDetail.tsx",
                        ),
                        "utf8",
                    );

                expect(
                    source,
                ).toContain(
                    "ArborResultReviewPanel",
                );

                expect(
                    source,
                ).toContain(
                    "detail.execution?.committed?.aiResult",
                );
            },
        );
    },
);
