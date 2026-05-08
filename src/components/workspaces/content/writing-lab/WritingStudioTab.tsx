"use client";

import React from "react";
import { 
    PenTool, 
    Settings, 
    Target, 
    Share2, 
    Layout,
    Type,
    Zap
} from "lucide-react";

export default function WritingStudioTab() {
    return (
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-320px)] min-h-[600px]">
            {/* Left Column: Context & Structure */}
            <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2">
                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Context</h4>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">Story Set</label>
                            <div className="mt-1 text-sm font-bold text-neutral-900">—</div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">Episode Role</label>
                            <div className="mt-1 text-sm font-bold text-neutral-900">—</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <Layout className="w-4 h-4 text-blue-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Structure</h4>
                    </div>
                    <div className="space-y-2">
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[10px] font-bold text-neutral-400 text-center border-dashed">
                            No structure defined
                        </div>
                    </div>
                </div>
            </div>

            {/* Center Column: Writing Area */}
            <div className="col-span-6 flex flex-col gap-6">
                <div className="bg-white border border-neutral-200 rounded-[40px] p-10 shadow-sm flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
                        <PenTool className="w-8 h-8 text-neutral-300" />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 mb-2">Writing Studio</h2>
                    <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
                        This is where your story comes to life. Select a project to start writing.
                    </p>
                    <button disabled className="mt-8 px-8 py-3 bg-neutral-300 text-white rounded-2xl text-sm font-black cursor-not-allowed transition-all shadow-sm flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        Start New Project — Phase 2
                    </button>
                </div>
            </div>

            {/* Right Column: Intelligence & Settings */}
            <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pl-2">
                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Arbor Intelligence</h4>
                    </div>
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                            AI Writing Generation is currently disabled for Phase 1. 
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-4 h-4 text-neutral-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Settings</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Voice & Tone</span>
                            <span className="text-[10px] font-bold text-neutral-300 uppercase">Placeholder</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Guardrails</span>
                            <span className="text-[10px] font-bold text-neutral-300 uppercase">Placeholder</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Share2 className="w-4 h-4 text-neutral-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Export</h4>
                    </div>
                    <button disabled className="w-full py-2.5 bg-neutral-100 text-neutral-400 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                        Export Disabled
                    </button>
                </div>
            </div>
        </div>
    );
}
