// src/lib/smart/queue/resolveNextTask.ts
import { Task } from "@/lib/types";

/**
 * RC42D — Next Task Engine
 * Priority:
 * 1. overdue active task
 * 2. scheduled today
 * 3. inbox task
 * 4. planned task
 * 5. oldest active task
 */
export function resolveNextTask(tasks: Task[], currentTaskId: string | null): Task | null {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter out completed tasks and the current task
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.id !== currentTaskId);
    
    if (activeTasks.length === 0) return null;

    // 1. Overdue (scheduled_date < today)
    const overdue = activeTasks.filter(t => t.scheduled_date && t.scheduled_date < today);
    if (overdue.length > 0) {
        return overdue.sort((a, b) => (a.scheduled_date! < b.scheduled_date! ? -1 : 1))[0];
    }

    // 2. Scheduled Today
    const scheduledToday = activeTasks.filter(t => t.scheduled_date === today);
    if (scheduledToday.length > 0) {
        return scheduledToday[0];
    }

    // 3. Inbox
    const inbox = activeTasks.filter(t => t.status === 'inbox');
    if (inbox.length > 0) {
        return inbox[0];
    }

    // 4. Planned
    const planned = activeTasks.filter(t => t.status === 'planned');
    if (planned.length > 0) {
        return planned[0];
    }

    // 5. Oldest active task (by created_at)
    return activeTasks.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0];
}
