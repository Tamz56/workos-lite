"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    fetchHumanResultReview,
    friendlyResultReviewError,
    postHumanResultDecision,
} from "./api";
import type {
    HumanResultDecision,
    ResultReviewView,
} from "./types";

function EvidenceList({
    title,
    values,
}: {
    title: string;
    values: string[];
}) {
    return (
        <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                {title}
            </h4>
            {values.length === 0 ? (
                <p className="mt-1 text-xs text-neutral-500">
                    NONE
                </p>
            ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-neutral-800">
                    {values.map(
                        (
                            value,
                            index,
                        ) => (
                            <li
                                key={`${title}-${index}`}
                            >
                                {value}
                            </li>
                        ),
                    )}
                </ul>
            )}
        </div>
    );
}

export function HumanResultDecisionPanel({
    review,
    busy,
    onDecide,
}: {
    review: ResultReviewView;
    busy: boolean;
    onDecide: (
        decision: HumanResultDecision,
        note: string,
    ) => Promise<void> | void;
}) {
    const [
        pendingDecision,
        setPendingDecision,
    ] =
        useState<
            HumanResultDecision | null
        >(null);

    const [note, setNote] =
        useState("");

    if (review.decision) {
        return (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Human Decision
                </h3>

                <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div>
                        <dt className="font-bold text-neutral-500">
                            Decision
                        </dt>
                        <dd>
                            {
                                review
                                    .decision
                                    .decision
                            }
                        </dd>
                    </div>

                    <div>
                        <dt className="font-bold text-neutral-500">
                            Human actor
                        </dt>
                        <dd>
                            {
                                review
                                    .decision
                                    .decidedByDisplayName
                            }{" "}
                            (
                            {
                                review
                                    .decision
                                    .decidedByActorId
                            }
                            )
                        </dd>
                    </div>

                    <div>
                        <dt className="font-bold text-neutral-500">
                            Decided at
                        </dt>
                        <dd>
                            {
                                review
                                    .decision
                                    .decidedAt
                            }
                        </dd>
                    </div>

                    <div>
                        <dt className="font-bold text-neutral-500">
                            Decision record
                        </dt>
                        <dd className="break-all font-mono">
                            {
                                review
                                    .decision
                                    .id
                            }
                        </dd>
                    </div>
                </dl>

                {review.decision.reason && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-700">
                        Reason:{" "}
                        {
                            review
                                .decision
                                .reason
                        }
                    </p>
                )}

                {review.decision
                    .returnInstruction && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-700">
                        Return instruction:{" "}
                        {
                            review
                                .decision
                                .returnInstruction
                        }
                    </p>
                )}
            </div>
        );
    }

    if (!review.decisionStoreReady) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                Human Decision persistence is not active. A separately authorized schema migration is required before a final decision can be recorded.
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Human Decision
            </h3>

            <p className="mt-1 text-xs text-neutral-600">
                Only the Human decision is authoritative. No choice here automatically changes canonical Project state or the next authoritative action.
            </p>

            {!pendingDecision ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            setPendingDecision(
                                "ACCEPTED",
                            )
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                        Accept result
                    </button>

                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            setPendingDecision(
                                "REJECTED",
                            )
                        }
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                        Reject result
                    </button>

                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            setPendingDecision(
                                "RETURNED",
                            )
                        }
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50"
                    >
                        Return for follow-up
                    </button>
                </div>
            ) : (
                <div className="mt-3 space-y-3">
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Final Human decision:{" "}
                        <strong>
                            {pendingDecision}
                        </strong>
                    </div>

                    <label className="block text-xs font-semibold text-neutral-700">
                        {pendingDecision
                            === "RETURNED"
                            ? "Follow-up instruction (optional)"
                            : "Reason (optional)"}

                        <textarea
                            value={note}
                            onChange={(
                                event,
                            ) =>
                                setNote(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="mt-1 min-h-20 w-full rounded-lg border border-neutral-300 p-2 text-xs font-normal"
                        />
                    </label>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                void onDecide(
                                    pendingDecision,
                                    note,
                                )
                            }
                            className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            {busy
                                ? "Recording…"
                                : `Confirm ${pendingDecision}`}
                        </button>

                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setPendingDecision(
                                    null,
                                );
                                setNote("");
                            }}
                            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ArborResultReviewPanelContent({
    review,
    busy,
    onDecide,
}: {
    review: ResultReviewView;
    busy: boolean;
    onDecide: (
        decision: HumanResultDecision,
        note: string,
    ) => Promise<void> | void;
}) {
    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5 shadow-sm">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Post-result Review
            </h2>

            <div className="mt-4 space-y-4">
                <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Execution Provenance + Review Binding
                    </h3>

                    <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div>
                            <dt className="font-bold text-neutral-500">
                                Operation ID
                            </dt>
                            <dd className="break-all font-mono">
                                {
                                    review
                                        .binding
                                        .operationId
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Execution Attempt ID
                            </dt>
                            <dd className="break-all font-mono">
                                {
                                    review
                                        .binding
                                        .executionAttemptId
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Approval ID
                            </dt>
                            <dd className="break-all font-mono">
                                {
                                    review
                                        .binding
                                        .approvalId
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Result Fingerprint
                            </dt>
                            <dd className="break-all font-mono">
                                {
                                    review
                                        .binding
                                        .resultFingerprint
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Review Contract
                            </dt>
                            <dd className="break-all font-mono">
                                {
                                    review
                                        .binding
                                        .reviewContractVersion
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Provider / Model
                            </dt>
                            <dd>
                                {
                                    review
                                        .binding
                                        .provider
                                }{" "}
                                /{" "}
                                {
                                    review
                                        .binding
                                        .model
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Execution Contract
                            </dt>
                            <dd>
                                {
                                    review
                                        .binding
                                        .executionContractVersion
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Started
                            </dt>
                            <dd>
                                {
                                    review
                                        .binding
                                        .executionStartedAt
                                }
                            </dd>
                        </div>

                        <div>
                            <dt className="font-bold text-neutral-500">
                                Finished
                            </dt>
                            <dd>
                                {
                                    review
                                        .binding
                                        .executionFinishedAt
                                }
                            </dd>
                        </div>
                    </dl>
                </div>

                <div className="rounded-lg border border-blue-200 bg-white p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Arbor Review
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-xs text-neutral-800">
                        {
                            review
                                .arborReview
                                .assessment
                        }
                    </p>

                    <p className="mt-2 text-xs">
                        Review status:{" "}
                        <strong>
                            {
                                review
                                    .arborReview
                                    .reviewStatus
                            }
                        </strong>
                    </p>

                    <EvidenceList
                        title="Identified risks"
                        values={
                            review
                                .arborReview
                                .identifiedRisks
                        }
                    />

                    <div className="mt-3">
                        <EvidenceList
                            title="Evidence gaps"
                            values={
                                review
                                    .arborReview
                                    .evidenceGaps
                            }
                        />
                    </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-white p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Recommendation — Advisory Only
                    </h3>

                    <p className="mt-2 text-xs font-bold text-neutral-900">
                        {
                            review
                                .arborReview
                                .recommendation
                        }
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-700">
                        {
                            review
                                .arborReview
                                .recommendationRationale
                        }
                    </p>

                    <p className="mt-2 text-xs text-neutral-700">
                        Proposed next action:{" "}
                        {
                            review
                                .arborReview
                                .proposedNextAction
                        }
                    </p>
                </div>

                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                    Arbor recommendation is advisory. Human decision is authoritative. Canonical mutation: NONE.
                </div>

                <HumanResultDecisionPanel
                    review={review}
                    busy={busy}
                    onDecide={onDecide}
                />

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Reconciliation Status
                    </h3>

                    <p className="mt-1 text-xs font-bold text-neutral-800">
                        {
                            review
                                .reconciliation
                                .status
                        }
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                        {
                            review
                                .reconciliation
                                .reconciliationReason
                        }
                    </p>

                    <p className="mt-2 text-xs text-neutral-500">
                        Candidate Project state: NONE · Candidate next authoritative action: NONE
                    </p>
                </div>
            </div>
        </div>
    );
}

export function ArborResultReviewPanel({
    operationId,
}: {
    operationId: string;
}) {
    const [
        review,
        setReview,
    ] =
        useState<
            ResultReviewView | null
        >(null);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        busy,
        setBusy,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    const load =
        useCallback(
            async () => {
                const result =
                    await fetchHumanResultReview(
                        operationId,
                    );

                setLoading(false);

                if (!result.ok) {
                    setError(
                        friendlyResultReviewError(
                            result.code,
                        ),
                    );
                    return;
                }

                setReview(
                    result.data.review,
                );
                setError(null);
            },
            [operationId],
        );

    useEffect(() => {
        void load();
    }, [load]);

    const decide =
        useCallback(
            async (
                decision:
                    HumanResultDecision,
                note: string,
            ) => {
                if (!review) return;

                setBusy(true);
                setError(null);

                const result =
                    await postHumanResultDecision(
                        operationId,
                        review.binding
                            .resultFingerprint,
                        decision,
                        decision
                            === "RETURNED"
                            ? {
                                  returnInstruction:
                                      note,
                              }
                            : {
                                  reason:
                                      note,
                              },
                    );

                setBusy(false);

                if (!result.ok) {
                    setError(
                        friendlyResultReviewError(
                            result.code,
                        ),
                    );

                    if (
                        result.code
                            === "RESULT_FINGERPRINT_MISMATCH"
                        || result.code
                            === "DECISION_ALREADY_FINAL"
                    ) {
                        await load();
                    }

                    return;
                }

                setReview(
                    result.data.review,
                );
            },
            [
                load,
                operationId,
                review,
            ],
        );

    if (loading) {
        return (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 text-xs text-neutral-500">
                Loading post-result review…
            </div>
        );
    }

    if (
        error
        && !review
    ) {
        return (
            <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-800"
            >
                {error}
            </div>
        );
    }

    if (!review) return null;

    return (
        <div className="space-y-2">
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                >
                    {error}
                </div>
            )}

            <ArborResultReviewPanelContent
                review={review}
                busy={busy}
                onDecide={decide}
            />
        </div>
    );
}
