import React, { useState, useRef, useEffect } from "react";
import { AreasViewState, GroupMode, SortMode } from "./useAreasState";
import { Filter, ListFilter, ArrowUpDown, Tag, Zap, Check, Briefcase, FileText, Calendar, ShieldCheck, Rocket, LayoutGrid, List as ListIcon } from "lucide-react";

import { Task } from "@/lib/types";
import ContentPresets from "./ContentPresets";

// Helper for pure multi-select dropdown UI
function MultiSelectDropdown({ 
    icon, 
    label, 
    options, 
    selectedKeys, 
    onChange 
}: { 
    icon: React.ReactNode, 
    label: string, 
    options: string[], 
    selectedKeys: string[], 
    onChange: (keys: string[]) => void 
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleKey = (k: string) => {
        if (selectedKeys.includes(k)) {
            onChange(selectedKeys.filter(x => x !== k));
        } else {
            onChange([...selectedKeys, k]);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${selectedKeys.length > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-neutral-100 text-neutral-600'}`}
            >
                {icon}
                <span className="text-sm font-semibold truncate max-w-[120px]">
                    {selectedKeys.length === 0 ? label : `${label} (${selectedKeys.length})`}
                </span>
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                        {options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => toggleKey(opt)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 flex items-center justify-between"
                            >
                                <span className="truncate pr-2">{opt}</span>
                                {selectedKeys.includes(opt) && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface AreasFilterBarProps {
    tasks: Task[];
    lists: any[];
    sprints: any[];
    state: AreasViewState;
    updateState: (updates: Partial<AreasViewState>) => void;
}

export default function AreasFilterBar({ tasks, lists, sprints, state, updateState }: AreasFilterBarProps) {
    const toggleStatus = (status: string) => {
        const current = state.statusFilter;
        if (current.includes(status)) {
            updateState({ statusFilter: current.filter(s => s !== status) });
        } else {
            updateState({ statusFilter: [...current, status] });
        }
    };

    // Derive unique dimensions
    const uniqueWorkspaces = Array.from(new Set(tasks.map(t => t.workspace))).filter(Boolean);
    const uniqueLists = lists.length > 0 ? lists.map(l => l.title) : Array.from(new Set(tasks.map(t => t.list_name || "Unassigned"))).filter(Boolean);
    const uniqueSprints = sprints.length > 0 ? sprints.map(s => s.name) : Array.from(new Set(tasks.map(t => t.sprint_id || "Backlog"))).filter(Boolean);

    return (
        <div className="flex flex-col border-b border-neutral-200 bg-white shrink-0">
            {/* Top Row: Presets (RC20) */}
            <div className="px-6 pt-4 pb-0">
                <ContentPresets state={state} updateState={updateState} />
            </div>

            {/* Bottom Row: Manual Filters */}
            <div className="px-6 py-2 flex flex-wrap items-center gap-4 text-sm">
                {/* Status Filter */}
                <div className="flex items-center gap-2 border-r border-neutral-200 pr-4">
                    <Filter className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-bold text-neutral-500 text-xs uppercase tracking-wider hidden sm:inline">Status</span>
                    <div className="flex bg-neutral-100/80 p-0.5 rounded-lg">
                        {["inbox", "planned", "done"].map(st => (
                            <button
                                key={st}
                                onClick={() => toggleStatus(st)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                                    state.statusFilter.includes(st) 
                                    ? "bg-white text-black shadow-sm" 
                                    : "text-neutral-500 hover:text-neutral-700"
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Workspace Filter (Multi-Select) */}
                {uniqueWorkspaces.length > 1 && (
                    <div className="border-r border-neutral-200 pr-4">
                        <MultiSelectDropdown
                            icon={<Briefcase className="w-3.5 h-3.5" />}
                            label="Workspaces"
                            options={uniqueWorkspaces}
                            selectedKeys={state.workspaceFilter}
                            onChange={(keys) => updateState({ workspaceFilter: keys })}
                        />
                    </div>
                )}

                {/* List Filter (Multi-Select) */}
                {uniqueLists.length > 1 && (
                    <div className="border-r border-neutral-200 pr-4">
                        <MultiSelectDropdown
                            icon={<Tag className="w-3.5 h-3.5" />}
                            label="Lists"
                            options={uniqueLists}
                            selectedKeys={state.listFilter}
                            onChange={(keys) => updateState({ listFilter: keys })}
                        />
                    </div>
                )}

                {/* Sprint Filter (Multi-Select) */}
                {uniqueSprints.length > 1 && (
                    <div className="border-r border-neutral-200 pr-4">
                        <MultiSelectDropdown
                            icon={<Zap className="w-3.5 h-3.5" />}
                            label="Sprints"
                            options={uniqueSprints}
                            selectedKeys={state.sprintFilter}
                            onChange={(keys) => updateState({ sprintFilter: keys })}
                        />
                    </div>
                )}
                
                {/* Content Type Filter (Multi-Select) */}
                <div className="border-r border-neutral-200 pr-4">
                    <MultiSelectDropdown
                        icon={<FileText className="w-3.5 h-3.5" />}
                        label="Types"
                        options={["article", "short_video", "carousel", "generic_content"]}
                        selectedKeys={state.templateFilter}
                        onChange={(keys) => updateState({ templateFilter: keys })}
                    />
                </div>

                {/* RC26: Review Status Filter (Multi-Select) */}
                <div className="border-r border-neutral-200 pr-4">
                    <MultiSelectDropdown
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                        label="Reviews"
                        options={["draft", "in_review", "approved", "published"]}
                        selectedKeys={state.reviewStatusFilter}
                        onChange={(keys) => updateState({ reviewStatusFilter: keys })}
                    />
                </div>

                {/* RC27: Ready to Publish Toggle */}
                <div className="border-r border-neutral-200 pr-4">
                    <button 
                        onClick={() => updateState({ onlyReadyToPublish: !state.onlyReadyToPublish })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                            state.onlyReadyToPublish 
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-105" 
                            : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                        }`}
                        title="แสดงเฉพาะงานที่พร้อมเผยแพร่ (เสร็จสิ้น & อนุมัติแล้ว)"
                    >
                        <Rocket size={14} className={state.onlyReadyToPublish ? "animate-bounce" : ""} />
                        <span className="text-xs font-bold uppercase tracking-tight">Ready</span>
                    </button>
                </div>

                {/* Schedule State Filter */}
                <div className="flex items-center gap-2 border-r border-neutral-200 pr-4">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-bold text-neutral-500 text-xs uppercase tracking-wider hidden sm:inline">Schedule</span>
                    <div className="flex bg-neutral-100/80 p-0.5 rounded-lg">
                        {(["all", "scheduled", "unscheduled"] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => updateState({ scheduleFilter: mode })}
                                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                                    state.scheduleFilter === mode 
                                    ? "bg-white text-black shadow-sm" 
                                    : "text-neutral-500 hover:text-neutral-700"
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grouping Selector */}
                <div className="flex items-center gap-2">
                    <ListFilter className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-bold text-neutral-500 text-xs uppercase tracking-wider hidden sm:inline">Group By</span>
                    <select 
                        className="bg-transparent text-sm font-semibold text-neutral-700 focus:outline-none cursor-pointer"
                        value={state.groupBy}
                        onChange={(e) => updateState({ groupBy: e.target.value as GroupMode })}
                    >
                        <option value="status">Status</option>
                        <option value="package">Package</option>
                        <option value="list">List / Workspace</option>
                        <option value="sprint">Sprint</option>
                    </select>
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-2 ml-auto">
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                    <select 
                        className="bg-transparent text-sm font-semibold text-neutral-700 focus:outline-none cursor-pointer"
                        value={state.sortBy}
                        onChange={(e) => updateState({ sortBy: e.target.value as SortMode })}
                    >
                        <option value="scheduled_date">Scheduled Date</option>
                        <option value="priority">Priority</option>
                        <option value="updated_at">Recently Updated</option>
                        <option value="created_at">Date Created</option>
                        <option value="performance">สถิติสูงสุด (Best)</option>
                    </select>

                    <button 
                        onClick={() => updateState({ sortDir: state.sortDir === "asc" ? "desc" : "asc" })}
                        className="text-xs font-bold text-neutral-400 hover:text-neutral-700 uppercase p-1 rounded hover:bg-neutral-100"
                        title="Toggle sort direction"
                    >
                        {state.sortDir === "asc" ? "↑" : "↓"}
                    </button>
                </div>

                {/* RC32: View Mode Switcher */}
                <div className="flex items-center gap-1.5 ml-2 pl-4 border-l border-neutral-200">
                    <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 shadow-inner">
                        <button 
                            onClick={() => updateState({ viewMode: "package" })}
                            className={`p-1.5 rounded-lg transition-all duration-300 ${state.viewMode === "package" ? "bg-white text-indigo-600 shadow-md scale-105" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/50"}`}
                            title="Package View"
                        >
                            <LayoutGrid size={15} strokeWidth={2.5} />
                        </button>
                        <button 
                            onClick={() => updateState({ viewMode: "list" })}
                            className={`p-1.5 rounded-lg transition-all duration-300 ${state.viewMode === "list" ? "bg-white text-indigo-600 shadow-md scale-105" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/50"}`}
                            title="Simple List View"
                        >
                            <ListIcon size={15} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>

    );
}
