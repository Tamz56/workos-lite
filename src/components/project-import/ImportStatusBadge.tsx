"use client";

type Tone = "ready" | "warning" | "blocked" | "muted" | "success" | "info";

const TONE_CLASSES: Record<Tone, string> = {
    ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    blocked: "bg-red-100 text-red-800 border-red-200",
    muted: "bg-neutral-100 text-neutral-600 border-neutral-200",
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    info: "bg-sky-100 text-sky-800 border-sky-200",
};

export function ImportStatusBadge({ label, tone = "muted" }: { label: string; tone?: Tone }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASSES[tone]}`}
        >
            {label}
        </span>
    );
}

export function batchStatusTone(status: string): Tone {
    switch (status) {
        case "executed":
        case "partially_executed":
            return "success";
        case "ready_for_approval":
        case "partially_ready":
        case "approved":
        case "partially_approved":
            return "info";
        case "execution_started":
        case "execution_failed":
            return "warning";
        case "dry_run_invalid":
        case "rejected":
        case "approval_expired":
        case "cancelled":
            return "blocked";
        default:
            return "muted";
    }
}

export function classificationTone(status: string): Tone {
    switch (status) {
        case "new":
            return "ready";
        case "duplicate":
        case "skipped":
            return "muted";
        case "conflict":
        case "review_required":
            return "warning";
        case "invalid":
            return "blocked";
        default:
            return "muted";
    }
}
