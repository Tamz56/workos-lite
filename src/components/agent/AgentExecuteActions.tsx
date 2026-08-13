"use client";

/**
 * Agent Debugger execution actions (P1E.1C Phase C — preview only).
 * Live legacy writes are disabled: "Execute Now" is rendered disabled with an
 * explicit policy notice. Preview Build (Dry Run) remains functional.
 */
export function AgentExecuteActions({
    loading,
    onPreview,
}: {
    loading: boolean;
    onPreview: () => void;
}) {
    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
                <button
                    onClick={onPreview}
                    disabled={loading}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                    {loading ? "..." : "Preview Build (Dry Run)"}
                </button>
                <button
                    type="button"
                    disabled
                    title="Direct agent writes are disabled"
                    className="px-3 py-1.5 bg-neutral-200 text-neutral-400 text-xs font-bold rounded-lg transition-colors cursor-not-allowed"
                >
                    Execute Now
                </button>
            </div>
            <div className="text-[10px] text-neutral-400">
                <span>
                    Preview only (<code className="bg-neutral-100 px-0.5 rounded text-neutral-500">dry_run:true</code>).
                    Direct agent writes are disabled — use the Operations Gateway for governed persistent operations.
                </span>
            </div>
        </div>
    );
}
