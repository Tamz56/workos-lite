"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchHumanOperations } from "./api";
import { useHumanSession } from "./HumanSessionGate";
import { ReviewStateBadge } from "./ReviewStateBadge";
import { SignOutButton } from "./SignOutButton";
import { formatDateTime, shortHash } from "./reviewState";
import type { ReviewSummary } from "./types";

export function OperationsReviewList() {
    const router = useRouter();
    const human = useHumanSession();
    const [operations, setOperations] = useState<ReviewSummary[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const load = useCallback(
        async (asRefresh: boolean) => {
            if (asRefresh) setRefreshing(true);
            const result = await fetchHumanOperations();
            if (!asRefresh) setLoading(false);
            setRefreshing(false);
            if (result.ok) {
                setOperations(result.data.operations);
                setError(null);
                return;
            }
            if (result.status === 401) {
                setOperations(null);
                router.replace("/human/login");
                return;
            }
            setError("Unable to load operations. Please try again.");
        },
        [router],
    );

    useEffect(() => {
        load(false);
    }, [load]);

    if (loading) {
        return (
            <div className="p-6 text-sm text-neutral-400" role="status" aria-live="polite">
                Loading operations…
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {error}
                </div>
                <button
                    type="button"
                    onClick={() => load(false)}
                    className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-neutral-900">Operations Review</h1>
                    <p className="mt-0.5 text-xs text-neutral-500">
                        Human operator: {human?.displayName ?? "Unknown"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                    >
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                    <SignOutButton />
                </div>
            </div>

            {operations === null || operations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400">
                    No operations waiting for review.
                </div>
            ) : (
                <>
                    <div className="hidden md:block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                                    <th className="px-4 py-2.5 font-bold">Operation</th>
                                    <th className="px-4 py-2.5 font-bold">Type</th>
                                    <th className="px-4 py-2.5 font-bold">Target</th>
                                    <th className="px-4 py-2.5 font-bold">Requester</th>
                                    <th className="px-4 py-2.5 font-bold">Requested</th>
                                    <th className="px-4 py-2.5 font-bold">State</th>
                                    <th className="px-4 py-2.5 font-bold">Expiry</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operations.map((operation) => (
                                    <tr
                                        key={operation.operationId}
                                        className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/70"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/operations/${operation.operationId}`}
                                                className="font-mono text-xs text-blue-600 hover:underline"
                                            >
                                                {shortHash(operation.operationId)}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-neutral-700">{operation.operationType}</td>
                                        <td className="px-4 py-3 text-xs text-neutral-700">
                                            {operation.targetType} · {operation.targetRef}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-neutral-600">
                                            {operation.requesterActorType}:{operation.requesterActorId}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-neutral-600">
                                            {mounted ? formatDateTime(operation.requestedAt) : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ReviewStateBadge state={operation.reviewState} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-neutral-500">
                                            {operation.reviewState === "approved" && operation.approval
                                                ? mounted
                                                    ? formatDateTime(operation.approval.expiresAt)
                                                    : "—"
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-2 md:hidden">
                        {operations.map((operation) => (
                            <Link
                                key={operation.operationId}
                                href={`/operations/${operation.operationId}`}
                                className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-300"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-mono text-xs text-blue-600">{shortHash(operation.operationId)}</span>
                                    <ReviewStateBadge state={operation.reviewState} />
                                </div>
                                <div className="mt-2 space-y-0.5 text-xs text-neutral-600">
                                    <div>{operation.operationType}</div>
                                    <div>
                                        {operation.targetType} · {operation.targetRef}
                                    </div>
                                    <div>
                                        {operation.requesterActorType}:{operation.requesterActorId} ·{" "}
                                        {mounted ? formatDateTime(operation.requestedAt) : "—"}
                                    </div>
                                    {operation.reviewState === "approved" && operation.approval && (
                                        <div className="text-amber-600">
                                            Expires {mounted ? formatDateTime(operation.approval.expiresAt) : "—"}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
