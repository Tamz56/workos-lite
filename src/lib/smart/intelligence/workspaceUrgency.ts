// src/lib/smart/intelligence/workspaceUrgency.ts
import { Task } from "@/lib/types";

export type UrgencyStatus = "critical" | "attention" | "stable" | "clear";

export interface UrgencySignal {
    status: UrgencyStatus;
    label: string;
    description: string;
    color: string;
    bgColor: string;
    dotColor: string;
}

export function calculateWorkspaceUrgency(tasks: Task[]): UrgencySignal {
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const today = new Date().toISOString().split('T')[0];
    
    if (activeTasks.length === 0) {
        return {
            status: "clear",
            label: "เรียบร้อย (Clear)",
            description: "ไม่มีงานค้างในขณะนี้",
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            dotColor: "bg-emerald-500"
        };
    }

    const overdue = activeTasks.filter(t => t.scheduled_date && t.scheduled_date < today);
    const highPriority = activeTasks.filter(t => (t.priority ?? 2) >= 3);
    const highPriorityOverdue = overdue.filter(t => (t.priority ?? 2) >= 3);

    if (overdue.length > 3 || highPriorityOverdue.length > 0) {
        return {
            status: "critical",
            label: "เร่งด่วน (Critical)",
            description: "มีงานค้างเกินกำหนดหรือมีความสำคัญสูงที่ต้องรีบจัดการ",
            color: "text-red-700",
            bgColor: "bg-red-50",
            dotColor: "bg-red-500"
        };
    }

    if (overdue.length > 0 || highPriority.length > 2) {
        return {
            status: "attention",
            label: "เตรียมตัว (Attention)",
            description: "มีงานที่ต้องจับตามองหรือใกล้ถึงกำหนด",
            color: "text-amber-700",
            bgColor: "bg-amber-50",
            dotColor: "bg-amber-500"
        };
    }

    return {
        status: "stable",
        label: "ปกติ (Stable)",
        description: "งานอยู่ในเกณฑ์ปกติและตามแผน",
        color: "text-blue-700",
        bgColor: "bg-blue-50",
        dotColor: "bg-blue-500"
    };
}
