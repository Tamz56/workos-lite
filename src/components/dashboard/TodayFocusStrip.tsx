"use client";

import { AlertCircle, Calendar, Clock } from "lucide-react";

interface TodayFocusStripProps {
    overdueCount: number;
    todayCount: number;
    waitingCount: number;
}

export function TodayFocusStrip({ overdueCount, todayCount, waitingCount }: TodayFocusStripProps) {
    return (
        <div className="flex flex-wrap gap-3 mb-6">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${
                overdueCount > 0 ? "bg-red-50 border-red-100 text-red-700 shadow-sm" : "bg-neutral-50 border-neutral-100 text-neutral-400"
            }`}>
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-bold">{overdueCount} Overdue</span>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${
                todayCount > 0 ? "bg-amber-50 border-amber-100 text-amber-700 shadow-sm" : "bg-neutral-50 border-neutral-100 text-neutral-400"
            }`}>
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-bold">{todayCount} Today Focus</span>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${
                waitingCount > 0 ? "bg-blue-50 border-blue-100 text-blue-700 shadow-sm" : "bg-neutral-50 border-neutral-100 text-neutral-400"
            }`}>
                <Clock className="w-4 h-4" />
                <span className="text-sm font-bold">{waitingCount} Waiting / Follow-up</span>
            </div>
        </div>
    );
}
