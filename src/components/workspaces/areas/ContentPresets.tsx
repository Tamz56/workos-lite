import React from "react";
import { AreasViewState } from "./useAreasState";

interface ContentPresetsProps {
    state: AreasViewState;
    updateState: (updates: Partial<AreasViewState>) => void;
}

export default function ContentPresets({ state, updateState }: ContentPresetsProps) {
    const getThisWeekRange = () => {
        const now = new Date();
        const day = now.getDay(); // 0 is Sun, 1 is Mon...
        
        // Monday is day 1. If today is Sun (0), we want last Monday (6 days ago).
        // diff = (day === 0 ? 6 : day - 1)
        const diffToMon = day === 0 ? 6 : day - 1;
        
        const mon = new Date(now);
        mon.setDate(now.getDate() - diffToMon);
        
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        
        return {
            start: mon.toISOString().split("T")[0],
            end: sun.toISOString().split("T")[0]
        };
    };

    const presets = [
        { 
            id: "all", 
            label: "All Content",
            updates: { 
                statusFilter: [], 
                templateFilter: [], 
                scheduleFilter: "all" as const, 
                dateRange: {},
                activePreset: "all"
            } 
        },
        { 
            id: "this_week", 
            label: "This Week",
            updates: { 
                scheduleFilter: "scheduled" as const, 
                dateRange: getThisWeekRange(),
                activePreset: "this_week"
            } 
        },
        { 
            id: "unscheduled", 
            label: "Unscheduled",
            updates: { 
                scheduleFilter: "unscheduled" as const, 
                dateRange: {},
                activePreset: "unscheduled"
            } 
        },
        { 
            id: "articles", 
            label: "Articles",
            updates: { 
                templateFilter: ["article"],
                activePreset: "articles"
            } 
        },
        { 
            id: "videos", 
            label: "Short Videos",
            updates: { 
                templateFilter: ["short_video"],
                activePreset: "videos"
            } 
        },
        { 
            id: "carousels", 
            label: "Carousels",
            updates: { 
                templateFilter: ["carousel"],
                activePreset: "carousels"
            } 
        },
        { 
            id: "done", 
            label: "Done",
            updates: { 
                statusFilter: ["done"],
                activePreset: "done"
            } 
        }
    ];

    return (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {presets.map(p => {
                const isActive = state.activePreset === p.id;
                return (
                    <button
                        key={p.id}
                        onClick={() => updateState(p.updates)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            isActive 
                            ? "bg-black border-black text-white shadow-sm" 
                            : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-black"
                        }`}
                    >
                        {p.label}
                    </button>
                );
            })}
        </div>
    );
}
