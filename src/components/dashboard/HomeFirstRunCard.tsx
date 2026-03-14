"use client";

import { Layout, Plus, RotateCcw, Box, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface HomeFirstRunCardProps {
    onCreateArea: () => void;
    onCreateProject: () => void;
    onResetDemo: () => void;
}

export function HomeFirstRunCard({ onCreateArea, onCreateProject, onResetDemo }: HomeFirstRunCardProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-3.5 flex flex-col gap-3">
            {/* Top row: icon, message, toggle, actions */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg">👋</span>
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-amber-900">
                        Get started — your workspace is ready.
                    </span>
                    <span className="hidden sm:inline text-xs text-amber-700 ml-2">
                        Create an Area or Project to begin.
                    </span>
                </div>

                {/* Primary CTAs */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={onCreateArea}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 transition-colors active:scale-95"
                    >
                        <Box className="w-3 h-3" />
                        Create Area
                    </button>
                    <button
                        onClick={onCreateProject}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors active:scale-95"
                    >
                        <Layout className="w-3 h-3" />
                        Create Project
                    </button>

                    {/* Expand/collapse steps */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-900 transition-colors ml-1"
                        aria-label={expanded ? "Collapse setup guide" : "Show setup guide"}
                    >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{expanded ? "Less" : "Steps"}</span>
                    </button>
                </div>
            </div>

            {/* Collapsible steps */}
            {expanded && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-amber-100">
                    {[
                        { n: 1, label: "Create Area", desc: "e.g. Marketing, Farm" },
                        { n: 2, label: "Create Project", desc: "within an Area" },
                        { n: 3, label: "Add List", desc: "Backlog, Doing, Done" },
                        { n: 4, label: "Add Task", desc: "break down work" },
                    ].map(step => (
                        <div key={step.n} className="flex items-start gap-2 p-2 rounded-xl bg-white/60 border border-amber-100">
                            <span className="w-5 h-5 rounded-full bg-amber-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step.n}</span>
                            <div>
                                <div className="text-xs font-bold text-amber-900">{step.label}</div>
                                <div className="text-[10px] text-amber-600">{step.desc}</div>
                            </div>
                        </div>
                    ))}

                    <div className="col-span-2 sm:col-span-4 flex items-center justify-end pt-1">
                        <button
                            onClick={onResetDemo}
                            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-600 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset Demo Data
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
