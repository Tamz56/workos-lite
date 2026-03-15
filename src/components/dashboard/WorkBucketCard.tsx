"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { BUTTON_SECONDARY } from "@/lib/styles";

interface WorkBucketCardProps {
    title: string;
    description: string;
    overdue: number;
    today: number;
    inbox: number;
    workspaces: string[];
    onQuickAdd?: () => void;
}

export function WorkBucketCard({ title, description, overdue, today, inbox, workspaces, onQuickAdd }: WorkBucketCardProps) {
    const total = overdue + today + inbox;
    const hasUrgency = overdue > 0 || today > 0;

    // Link to the first workspace in the bucket or just /planner
    const href = workspaces.length > 0 ? `/planner?workspace=${workspaces[0]}` : "/planner";

    return (
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 hover:border-neutral-300 transition-all hover:shadow-md group flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-black transition-colors">{title}</h3>
                    <p className="text-xs text-neutral-500 line-clamp-1">{description}</p>
                </div>
                {onQuickAdd && (
                    <button 
                        onClick={(e) => { e.preventDefault(); onQuickAdd(); }}
                        className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Quick Add Task"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 mt-4 grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded-2xl bg-neutral-50 border border-transparent group-hover:bg-white group-hover:border-neutral-100 transition-colors">
                    <span className={`text-lg font-bold ${overdue > 0 ? "text-red-600" : "text-neutral-400"}`}>{overdue}</span>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Overdue</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-2xl bg-neutral-50 border border-transparent group-hover:bg-white group-hover:border-neutral-100 transition-colors">
                    <span className={`text-lg font-bold ${today > 0 ? "text-amber-600" : "text-neutral-400"}`}>{today}</span>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Today</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-2xl bg-neutral-50 border border-transparent group-hover:bg-white group-hover:border-neutral-100 transition-colors">
                    <span className="text-lg font-bold text-neutral-600">{inbox}</span>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Inbox</span>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${hasUrgency ? "bg-red-500 animate-pulse" : "bg-neutral-300"}`}></div>
                    <span className="text-xs font-semibold text-neutral-600">{total} active tasks</span>
                </div>
                <Link 
                    href={href} 
                    className="flex items-center gap-1 text-xs font-bold text-neutral-400 group-hover:text-black transition-colors"
                >
                    View All <ChevronRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}
