import { REVIEW_STATE_LABEL } from "./reviewState";
import type { ReviewState } from "./types";

const STATE_CLASSES: Record<ReviewState, string> = {
    awaiting_review: "bg-slate-100 text-slate-700 border-slate-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approval_expired: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    revoked: "bg-neutral-100 text-neutral-600 border-neutral-200",
    consumed: "bg-sky-50 text-sky-700 border-sky-200",
};

export function ReviewStateBadge({ state }: { state: ReviewState }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATE_CLASSES[state]}`}
        >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {REVIEW_STATE_LABEL[state]}
        </span>
    );
}
