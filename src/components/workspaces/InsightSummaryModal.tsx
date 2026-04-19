// src/components/workspaces/InsightSummaryModal.tsx
import React from 'react';
import { X, TrendingUp, Zap, Target, RotateCcw, Award, BarChart3, Activity, CheckCircle2 } from 'lucide-react';
import { InsightReport, SuggestedAction } from '@/lib/smart/learning/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    report: InsightReport | null;
    suggestions: SuggestedAction[];
    onReset: () => void;
    onAction: (action: SuggestedAction) => void;
}

export function InsightSummaryModal({ isOpen, onClose, report, suggestions, onReset, onAction }: Props) {
    const [executedActionId, setExecutedActionId] = React.useState<string | null>(null);

    if (!isOpen) return null;

    const metrics = report?.metrics;
    const style = report?.styleBadge;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-neutral-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-lg transform -rotate-3">
                            <Zap size={20} className="fill-current" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-neutral-900">Productivity Pulse</h2>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Workspace Insights</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-400 hover:text-neutral-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Style Badge Section */}
                    {style && (
                        <div className="relative group overflow-hidden bg-gradient-to-br from-neutral-50 to-white p-6 rounded-3xl border border-neutral-100 shadow-sm transition-all hover:shadow-md">
                            <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                                <Award size={120} />
                            </div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="text-4xl bg-white w-16 h-16 rounded-2xl shadow-sm border border-neutral-50 flex items-center justify-center shrink-0">
                                    {style.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-neutral-900 mb-1">{style.label}</h3>
                                    <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                                        {style.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Simple Grid Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <TrendingUp size={10} /> Acceptance
                            </span>
                            <span className="text-2xl font-black text-neutral-900">
                                {Math.round((metrics?.acceptanceRate || 0) * 100)}%
                            </span>
                        </div>
                        <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Activity size={10} /> Efficiency
                            </span>
                            <span className="text-2xl font-black text-neutral-900">
                                {metrics?.acceptedCount || 0} <span className="text-xs text-neutral-400">tasks</span>
                            </span>
                        </div>
                    </div>

                    {/* Metric Breakdown List */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Behavior Breakdown</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Zap size={14} /></div>
                                    <span className="text-sm font-bold text-neutral-700">Accepted</span>
                                </div>
                                <span className="text-sm font-black text-neutral-900">{metrics?.acceptedCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><RotateCcw size={14} /></div>
                                    <span className="text-sm font-bold text-neutral-700">Skipped/Feedback</span>
                                </div>
                                <span className="text-sm font-black text-neutral-900">{metrics?.skippedCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-neutral-50 text-neutral-500 rounded-lg"><BarChart3 size={14} /></div>
                                    <span className="text-sm font-bold text-neutral-700">Manual Overrides</span>
                                </div>
                                <span className="text-sm font-black text-neutral-900">{metrics?.overrideCount || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Recommended Actions (RC51) */}
                    {suggestions.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                    <Target size={10} /> Recommended for You
                                </h4>
                                <span className="text-[9px] font-bold text-neutral-400 italic">Optional</span>
                            </div>
                            <div className="space-y-2">
                                {suggestions.map(action => (
                                    <button
                                        key={action.id}
                                        disabled={!!executedActionId}
                                        onClick={() => {
                                            setExecutedActionId(action.id);
                                            onAction(action);
                                            setTimeout(() => setExecutedActionId(null), 2000);
                                        }}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                                            executedActionId === action.id 
                                            ? 'bg-green-50 border-green-200 text-green-700' 
                                            : 'bg-amber-50/30 border-amber-100 hover:border-amber-200 hover:bg-amber-50/50 text-neutral-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl transition-colors shrink-0 ${
                                                executedActionId === action.id ? 'bg-green-100 text-green-600' : 'bg-white shadow-sm text-amber-500'
                                            }`}>
                                                {executedActionId === action.id ? <CheckCircle2 size={16} /> : <Zap size={16} />}
                                            </div>
                                            <span className="text-sm font-bold leading-tight">{action.label}</span>
                                        </div>
                                        {executedActionId !== action.id && (
                                            <div className="p-1 px-2 bg-white rounded-lg border border-neutral-100 text-[10px] font-black text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                ทำเลย
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-neutral-50">
                        <button 
                            onClick={() => {
                                if (confirm("ยืนยันการล้างข้อมูลการเรียนรู้? ระบบจะเริ่มนับหนึ่งใหม่สำหรับ Workspace นี้")) {
                                    onReset();
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-neutral-50 rounded-2xl text-[10px] font-black tracking-widest transition-all grayscale hover:grayscale-0 opacity-50 hover:opacity-100"
                        >
                            <RotateCcw size={12} /> ล้างข้อมูลการเรียนรู้ (RESET LEARNING)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
