"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import { WORKSPACES_LIST } from "@/lib/workspaces";
import { useAreasState } from "./areas/useAreasState";
import { Play, X, LayoutGrid, ChevronRight, CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";
import { calculateWorkspaceUrgency } from "../../lib/smart/intelligence/workspaceUrgency";

export default function WorkspacesClient() {
    const router = useRouter();
    const { state, updateState } = useAreasState("global");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    // RC42A: Resume State
    const [resumeData, setResumeData] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const lastWsId = localStorage.getItem("workos-last-workspace");
            const isDismissed = sessionStorage.getItem("workos-resume-dismissed");
            
            if (lastWsId && !isDismissed) {
                const ws = WORKSPACES_LIST.find(w => w.id === lastWsId);
                if (ws) {
                    setResumeData({ id: ws.id, name: ws.label });
                }
            }
        }
    }, []);

    const handleResume = () => {
        if (resumeData) {
            router.push(`/workspaces/${resumeData.id}`);
        }
    };

    const handleDismissResume = () => {
        sessionStorage.setItem("workos-resume-dismissed", "true");
        setResumeData(null);
    };

    // Fetch All Tasks across all workspaces to calculate counts
    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoadingTasks(true);
            try {
                // Fetch all active tasks globally to show counts on cards
                const res = await fetch(`/api/tasks?limit=1000`);
                const data = (await res.json()) as Task[];
                if (!cancelled) setTasks(data);
            } catch (e) {
                console.error("Failed to fetch tasks", e);
                if (!cancelled) setTasks([]);
            } finally {
                if (!cancelled) setLoadingTasks(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, []);

    const getWorkspaceStats = (wsId: string) => {
        const wsTasks = tasks.filter(t => t.workspace === wsId);
        const todo = wsTasks.filter(t => t.status !== 'done').length;
        const done = wsTasks.filter(t => t.status === 'done').length;
        return { todo, done };
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50/50">
            {/* RC44C: Overview Header */}
            <div className="px-8 py-6 bg-white border-b border-neutral-200 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
                        <LayoutGrid size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-neutral-900 tracking-tight">All Areas</h1>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Workspace Overview</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => router.push('/workspaces/personal')}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all active:scale-95 group"
                >
                    Quick Access: Personal
                    <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto px-8 py-10">
                    
                    {/* RC42A: Resume CTA - Prominent Placement */}
                    {resumeData && (
                        <div className="mb-12 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />
                            
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/30">
                                    <Play size={28} className="fill-white translate-l-0.5" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight mb-1">ทำงานค้างไว้ล่าสุด (Resume)</h2>
                                    <p className="text-indigo-100 font-medium">คุณกำลังจัดการงานในพื้นที่ <span className="text-white font-black underline underline-offset-4 decoration-indigo-300">{resumeData.name}</span></p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 relative z-10">
                                <button 
                                    onClick={handleResume}
                                    className="px-8 py-3.5 bg-white text-indigo-600 rounded-2xl text-base font-black hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
                                >
                                    ทำงานต่อทันที (Jump Back In)
                                </button>
                                <button 
                                    onClick={handleDismissResume}
                                    className="p-3.5 hover:bg-white/10 rounded-2xl transition-colors text-white/70 hover:text-white"
                                    title="ซ่อนคำแนะนำ"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Workspace Grid */}
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <h2 className="text-sm font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">พื้นที่ทำงานที่มีให้เลือก (Available Workspaces)</h2>
                            <p className="text-2xl font-black text-neutral-900 tracking-tight">เลือกพื้นที่ต้องการจัดการ</p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-1 rounded-md">
                                {WORKSPACES_LIST.length} พื้นที่ทั้งหมด
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                        {WORKSPACES_LIST.map(ws => {
                            const stats = getWorkspaceStats(ws.id);
                            const hasTasks = stats.todo > 0;
                            const wsTasks = tasks.filter(t => t.workspace === ws.id);
                            const urgency = calculateWorkspaceUrgency(wsTasks);
                            
                            return (
                                <button
                                    key={ws.id}
                                    onClick={() => router.push(`/workspaces/${ws.id}`)}
                                    className="group relative bg-white border border-neutral-200 rounded-3xl p-6 text-left transition-all duration-300 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 flex flex-col h-full"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border border-neutral-100 transition-colors ${
                                            ws.id === resumeData?.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-neutral-50 text-neutral-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100'
                                        }`}>
                                            {ws.label[0]}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {ws.id === resumeData?.id && (
                                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider animate-pulse">
                                                    Active
                                                </span>
                                            )}
                                            {/* RC47D: Dashboard Urgency Signal */}
                                            {urgency.status !== 'clear' && (
                                                <span className={`${urgency.bgColor} ${urgency.color} text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-current opacity-80 shadow-sm`}>
                                                    {urgency.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-neutral-900 group-hover:text-indigo-700 transition-colors mb-1">{ws.label}</h3>
                                        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-4 opacity-70">Type: {ws.type}</p>
                                        
                                        <div className="flex flex-wrap gap-3">
                                            <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-100 group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                                                <Circle size={12} className={hasTasks ? "text-amber-500 fill-amber-500" : "text-neutral-300"} />
                                                <span className="text-[11px] font-black text-neutral-600">
                                                    {loadingTasks ? "..." : stats.todo} <span className="font-medium text-neutral-400 ml-0.5">ค้างอยู่</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-100 group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                                                <CheckCircle2 size={12} className={stats.done > 0 ? "text-green-500" : "text-neutral-300"} />
                                                <span className="text-[11px] font-black text-neutral-600">
                                                    {loadingTasks ? "..." : stats.done} <span className="font-medium text-neutral-400 ml-0.5">เสร็จแล้ว</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t border-neutral-50 flex items-center justify-between group-hover:border-indigo-50 transition-colors">
                                        <span className="text-[11px] font-bold text-neutral-400 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                                            <Clock size={12} />
                                            Updated recently
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
