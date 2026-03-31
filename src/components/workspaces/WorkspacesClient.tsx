"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import { WORKSPACES_LIST } from "@/lib/workspaces";
import { Play, X } from "lucide-react";

// Areas Components
import { useAreasState } from "./areas/useAreasState";
import AreasToolbar from "./areas/AreasToolbar";
import AreasFilterBar from "./areas/AreasFilterBar";
import AreasTaskList from "./areas/AreasTaskList";

export default function WorkspacesClient() {
    const router = useRouter();
    const { state, updateState } = useAreasState("global");
    const [tasks, setTasks] = useState<Task[]>([]);

    const [loadingTasks, setLoadingTasks] = useState(true);
    const [lists, setLists] = useState<any[]>([]);
    const [sprints, setSprints] = useState<any[]>([]);

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

    // Fetch Metadata (Lists/Sprints)
    useEffect(() => {
        async function fetchMetadata() {
            try {
                const [lRes, sRes] = await Promise.all([
                    fetch(`/api/lists`),
                    fetch(`/api/sprints`)
                ]);
                const lData = await lRes.json();
                const sData = await sRes.json();
                setLists(lData);
                setSprints(sData);
            } catch (e) {
                console.error("Failed to fetch metadata", e);
            }
        }
        fetchMetadata();
    }, []);

    // Fetch All Tasks across all workspaces
    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoadingTasks(true);
            try {
                const params = new URLSearchParams();
                
                // RC8A: Pass multi-value filters to API
                if (state.statusFilter.length > 0) params.set("statuses", state.statusFilter.join(","));
                if (state.workspaceFilter.length > 0) params.set("workspaces", state.workspaceFilter.join(","));
                if (state.listFilter.length > 0) params.set("list_ids", state.listFilter.join(","));
                if (state.sprintFilter.length > 0) params.set("sprint_ids", state.sprintFilter.join(","));
                
                params.set("limit", "1000"); // Fetch all active tasks globally
                const res = await fetch(`/api/tasks?${params.toString()}`);
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
    }, [state.statusFilter, state.workspaceFilter, state.listFilter, state.sprintFilter]);

    const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
        // Optimistic Update
        const prevTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error("Update failed");
            
            const { task: updatedFromServer } = await res.json();
            // Sync with server response
            setTasks(prev => prev.map(t => t.id === taskId ? updatedFromServer : t));
        } catch (e) {
            console.error("Failed to update task", e);
            // Revert on error
            setTasks(prevTasks);
            alert("Failed to update status. Please try again.");
        }
    }, [tasks]);

    // Handle Quick Add Placeholder (Full implementation in Phase C)
    const handleNewList = () => {
        alert("Global list creation not supported yet. Please navigate to a specific workspace to create a list.");
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50/50">
            {/* Toolbar acts as Header */}
            <AreasToolbar
                title="All Areas"
                state={state}
                updateState={updateState}
                onNewList={handleNewList}
            />

            {/* Filters Row */}
            <AreasFilterBar
                tasks={tasks}
                lists={lists}
                sprints={sprints}
                state={state}
                updateState={updateState}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {/* RC42A: Resume CTA */}
                {resumeData && (
                    <div className="px-6 py-3 bg-indigo-600 text-white flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Play size={16} className="fill-current" />
                            </div>
                            <div>
                                <span className="text-sm font-medium opacity-90">ทำงานค้างไว้ที่</span>
                                <span className="ml-1.5 font-bold">{resumeData.name}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleResume}
                                className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg text-sm font-bold hover:bg-neutral-100 transition-colors shadow-sm"
                            >
                                ทำงานต่อ
                            </button>
                            <button 
                                onClick={handleDismissResume}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {loadingTasks ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-neutral-400 font-bold uppercase tracking-widest text-sm animate-pulse flex items-center gap-3">
                            <span className="animate-spin text-xl">⌛</span> Syncing Everything...
                        </div>
                    </div>
                ) : (
                    <AreasTaskList
                        workspaceId={state.workspaceFilter.length > 0 ? state.workspaceFilter[0] : "personal"}
                        tasks={tasks}
                        state={state}
                        onTaskClick={(t) => router.push(`?taskId=${t.id}`)}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskCreated={(newTask) => {
                            setTasks(prev => [newTask, ...prev]);
                        }}
                        updateState={updateState}
                    />
                )}
            </div>
        </div>
    );
}
