import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FileText, Plus, Search, Zap, Maximize2, Minimize2, MoreHorizontal } from "lucide-react";
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
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const toolsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
                setIsToolsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isCompact = state.isCompactMode;

    return (
        <div className={`px-6 ${isCompact ? 'py-1.5' : 'py-2.5'} bg-theme-panel border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm z-10 shrink-0`}>
            {/* Left: Title & Search */}
            <div className="flex items-center gap-6 flex-1 max-w-2xl">
                <h1 className="text-xl font-bold text-neutral-900 shrink-0 capitalize">{title}</h1>
                <div className="relative flex-1 w-full max-w-sm hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        className="w-full bg-theme-card border border-neutral-200 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:ring-black focus:border-black focus:bg-white transition-colors"
                        placeholder="Search tasks..."
                        value={state.search}
                        onChange={e => updateState({ search: e.target.value })}
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {!isCompact ? (
                    <>
                        {onNewList && (
                            <button
                                onClick={onNewList}
                            className="bg-theme-card text-neutral-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors"
                            >
                                New List
                            </button>
                        )}
                        {workspaceId === "content" && onNewPackage && (
                            <>
                                <Link
                                    href="/workspaces/content/article-studio"
                                    className="bg-theme-card text-blue-700 border border-blue-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    Article Studio
                                </Link>
                                <button
                                    onClick={onNewPackage}
                                    className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all active:scale-95"
                                >
                                    New Content Package
                                </button>
                            </>
                        )}
                    </>
                ) : (
                    <div className="relative" ref={toolsRef}>
                        <button
                            onClick={() => setIsToolsOpen(!isToolsOpen)}
                            className="bg-theme-card text-neutral-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2 border border-neutral-200"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                            Tools
                        </button>
                        {isToolsOpen && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                                {onNewList && (
                                    <button onClick={() => { onNewList(); setIsToolsOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 font-medium">
                                        New List
                                    </button>
                                )}
                                {workspaceId === "content" && onNewPackage && (
                                    <>
                                        <Link href="/workspaces/content/article-studio" onClick={() => setIsToolsOpen(false)} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 font-medium flex items-center gap-2 text-blue-700">
                                            <FileText className="w-4 h-4" /> Article Studio
                                        </Link>
                                        <button onClick={() => { onNewPackage(); setIsToolsOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 font-medium text-blue-700">
                                            New Content Package
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {onToggleFocusMode && (
                    <FocusModeToggle isActive={isFocusMode} onToggle={onToggleFocusMode} />
                )}

                <button
                    onClick={() => {
                        updateState({ isCompactMode: !state.isCompactMode });
                    }}
                    className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-bold text-xs ${
                        state.isCompactMode 
                            ? 'bg-neutral-800 text-white shadow-sm' 
                            : 'bg-theme-card text-neutral-500 hover:bg-neutral-200'
                    }`}
                    title={state.isCompactMode ? "ปิดโหมด Compact" : "เปิดโหมด Compact"}
                >
                    {state.isCompactMode ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    <span className="hidden lg:inline">Compact</span>
                </button>

                <button
                    onClick={() => updateState({ isFlowMode: !state.isFlowMode })}
                    className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-bold text-xs ${
                        state.isFlowMode 
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 ring-2 ring-amber-200' 
                            : 'bg-theme-card text-neutral-500 hover:bg-neutral-200'
                    }`}
                    title={state.isFlowMode ? "ปิดโหมด Flow" : "เปิดโหมด Flow (Simplified Flow)"}
                >
                    <Zap size={16} className={state.isFlowMode ? "fill-current" : ""} />
                    {!isCompact && <span className="hidden lg:inline">{state.isFlowMode ? 'Flowing' : 'Flow'}</span>}
                </button>

                <button
                    onClick={() => updateState({ isQuickAddOpen: true })}
                    className={`bg-black text-white ${isCompact ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-sm font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2`}
                >
                    <Plus className="w-4 h-4" />
                    {!isCompact && "Quick Add"}
                </button>
            </div>
            
            {/* Mobile Search - Visible only on small screens */}
            <div className="relative w-full sm:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                    className="w-full bg-theme-card border border-neutral-200 text-sm rounded-lg pl-9 pr-3 py-2"
                    placeholder="Search tasks..."
                    value={state.search}
                    onChange={e => updateState({ search: e.target.value })}
                />
            </div>
        </div>
    );
}
