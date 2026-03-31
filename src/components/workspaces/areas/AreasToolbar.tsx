import React from "react";
import { Plus, Search, Zap } from "lucide-react";
import { AreasViewState } from "./useAreasState";
import { FocusModeToggle } from "../FocusModeToggle";

interface AreasToolbarProps {
    title: string;
    state: AreasViewState;
    updateState: (updates: Partial<AreasViewState>) => void;
    onNewList?: () => void;
    onNewPackage?: () => void;
    workspaceId?: string;
    isFocusMode?: boolean;
    onToggleFocusMode?: () => void;
}

export default function AreasToolbar({ 
    title, state, updateState, onNewList, onNewPackage, workspaceId, 
    isFocusMode = false, onToggleFocusMode 
}: AreasToolbarProps) {
    return (
        <div className="px-6 py-4 bg-white border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm z-10 shrink-0">
            {/* Left: Title & Search */}
            <div className="flex items-center gap-6 flex-1 max-w-2xl">
                <h1 className="text-xl font-bold text-neutral-900 shrink-0 capitalize">{title}</h1>
                <div className="relative flex-1 w-full max-w-sm hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        className="w-full bg-neutral-100/50 border border-neutral-200 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:ring-black focus:border-black focus:bg-white transition-colors"
                        placeholder="Search tasks..."
                        value={state.search}
                        onChange={e => updateState({ search: e.target.value })}
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {onNewList && (
                    <button
                        onClick={onNewList}
                        className="bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors"
                    >
                        New List
                    </button>
                )}
                {workspaceId === "content" && onNewPackage && (
                    <button
                        onClick={onNewPackage}
                        className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all active:scale-95"
                    >
                        New Content Package
                    </button>
                )}
                
                {onToggleFocusMode && (
                    <FocusModeToggle isActive={isFocusMode} onToggle={onToggleFocusMode} />
                )}

                <button
                    onClick={() => updateState({ isFlowMode: !state.isFlowMode })}
                    className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-bold text-xs ${
                        state.isFlowMode 
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 ring-2 ring-amber-200' 
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                    title={state.isFlowMode ? "ปิดโหมด Flow" : "เปิดโหมด Flow (Simplified Flow)"}
                >
                    <Zap size={16} className={state.isFlowMode ? "fill-current" : ""} />
                    <span className="hidden lg:inline">{state.isFlowMode ? 'Flowing' : 'Flow'}</span>
                </button>

                <button
                    onClick={() => updateState({ isQuickAddOpen: true })}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Quick Add
                </button>
            </div>
            
            {/* Mobile Search - Visible only on small screens */}
            <div className="relative w-full sm:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                    className="w-full bg-neutral-100/50 border border-neutral-200 text-sm rounded-lg pl-9 pr-3 py-2"
                    placeholder="Search tasks..."
                    value={state.search}
                    onChange={e => updateState({ search: e.target.value })}
                />
            </div>
        </div>
    );
}
