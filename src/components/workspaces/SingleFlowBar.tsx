// src/components/workspaces/SingleFlowBar.tsx
import React from 'react';
import { CheckCircle2, ChevronRight, Maximize2, X, Play } from 'lucide-react';
import { Task } from '@/lib/types';

interface SingleFlowBarProps {
    currentTask: Task | null;
    nextTask: Task | null;
    onDone: () => void;
    onSkip: () => void;
    onOpenDetail: () => void;
    onClose: () => void;
}

export const SingleFlowBar: React.FC<SingleFlowBarProps> = ({
    currentTask,
    nextTask,
    onDone,
    onSkip,
    onOpenDetail,
    onClose
}) => {
    if (!currentTask) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white/90 backdrop-blur-xl border border-indigo-100 shadow-[0_20px_50px_rgba(79,70,229,0.15)] rounded-2xl overflow-hidden flex flex-col md:flex-row items-stretch md:items-center p-2 gap-2">
                
                {/* Current Task Section */}
                <div className="flex-1 flex items-center gap-4 px-4 py-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Play size={18} className="text-indigo-600 fill-current" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider leading-none mb-1">Current Task</span>
                        <h3 className="text-sm font-bold text-neutral-800 truncate leading-tight">
                            {currentTask.title}
                        </h3>
                    </div>
                </div>

                {/* Divider (Mobile hidden) */}
                <div className="hidden md:block w-px h-10 bg-neutral-100 mx-2" />

                {/* Next Task Preview (Mobile hidden) */}
                {nextTask && (
                    <div className="hidden lg:flex flex-col px-4 min-w-[140px] opacity-60">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none mb-1">Next Task</span>
                        <span className="text-xs font-semibold text-neutral-600 truncate max-w-[120px]">
                            {nextTask.title}
                        </span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 p-1 bg-neutral-50/50 rounded-xl">
                    <button
                        onClick={onDone}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95 group"
                        title="Mark Done & Next (Cmd+Enter)"
                    >
                        <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
                        <span>Done</span>
                    </button>
                    
                    <button
                        onClick={onSkip}
                        className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors group"
                        title="Skip to Next (Cmd+ArrowRight)"
                    >
                        <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                        onClick={onOpenDetail}
                        className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Open Details (Cmd+O)"
                    >
                        <Maximize2 size={18} />
                    </button>

                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Exit Flow Mode (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
