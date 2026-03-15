"use client";

import React from "react";
import { AlertCircle, Calendar, Inbox, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface WorkloadSummaryProps {
    overdue: number;
    today: number;
    inbox: number;
    doneToday: number;
    loading?: boolean;
}

export default function WorkloadSummaryCard({ overdue, today, inbox, doneToday, loading }: WorkloadSummaryProps) {
    const cards = [
        {
            label: "Overdue",
            value: overdue,
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
            href: "/planner?filter=overdue",
            description: "Past due tasks"
        },
        {
            label: "Today",
            value: today,
            icon: Calendar,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
            href: "/today",
            description: "Due today"
        },
        {
            label: "Inbox",
            value: inbox,
            icon: Inbox,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
            href: "/inbox",
            description: "Unprocessed tasks"
        },
        {
            label: "Done Today",
            value: doneToday,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
            href: null, // Non-clickable as per user refinement
            description: "Completed today"
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card) => {
                const Content = (
                    <div 
                        className={`p-4 rounded-2xl border ${card.border} ${card.bg} transition-all ${card.href ? 'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''} flex flex-col h-full`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                            {loading ? (
                                <div className="h-6 w-8 bg-neutral-200 animate-pulse rounded" />
                            ) : (
                                <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
                            )}
                        </div>
                        <div className="mt-auto">
                            <div className="text-sm font-bold text-neutral-900">{card.label}</div>
                            <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">{card.description}</div>
                        </div>
                    </div>
                );

                if (card.href) {
                    return (
                        <Link href={card.href} key={card.label}>
                            {Content}
                        </Link>
                    );
                }

                return <div key={card.label}>{Content}</div>;
            })}
        </div>
    );
}
