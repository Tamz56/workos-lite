import type { Task, Workspace, TaskStatus, ScheduleBucket, Doc, Attachment } from "@/lib/types";

export type GetTasksParams = {
    status?: TaskStatus;
    workspace?: Workspace | "all";
    q?: string;
    scheduled_date?: string | "null";
    schedule_bucket?: ScheduleBucket;
    limit?: number;
    cutoff_date?: string;
    filter?: "overdue" | "upcoming";
    inclusive?: boolean;
};

const qs = (params: Record<string, unknown>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === "" || v === "all") continue;
        sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
};

// --- TASKS ---

export async function getTasks(params: GetTasksParams = {}): Promise<Task[]> {
    const res = await fetch(`/api/tasks${qs(params)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`getTasks failed: ${res.status}`);
    const data = await res.json();

    // API might return Task[] OR { tasks: Task[] }
    if (Array.isArray(data)) return data as Task[];
    return (data?.tasks ?? []) as Task[];
}

export async function createTask(input: { title: string; workspace: Workspace; status?: TaskStatus }): Promise<Task> {
    const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`createTask failed: ${res.status}`);
    const data = await res.json();
    return (data?.task ?? data) as Task;
}

export async function patchTask(id: string, patch: Partial<Task>): Promise<Task> {
    const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`patchTask failed: ${res.status}`);
    const data = await res.json();
    return data.task as Task;
}

export async function deleteTask(id: string): Promise<void> {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`deleteTask failed: ${res.status}`);
}

// Backward compatibility aliases
export const listTasks = getTasks;

// --- DOCS ---

export async function createDoc(title: string): Promise<Doc> {
    const res = await fetch(`/api/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content_md: "" }),
    });
    if (!res.ok) throw new Error(`createDoc failed: ${res.status}`);
    const data = await res.json();
    return data.doc;
}

export async function getDoc(id: string): Promise<Doc> {
    const res = await fetch(`/api/docs/${id}`);
    if (!res.ok) throw new Error(`getDoc failed: ${res.status}`);
    const data = await res.json();
    return data.doc;
}

export async function patchDoc(id: string, patch: Partial<Doc>): Promise<Doc> {
    const res = await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`patchDoc failed: ${res.status}`);
    const data = await res.json();
    return data.doc;
}

export async function deleteDoc(id: string): Promise<void> {
    const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`deleteDoc failed: ${res.status}`);
}

// --- ATTACHMENTS ---

export async function listAttachments(taskId: string): Promise<Attachment[]> {
    const res = await fetch(`/api/tasks/${taskId}/attachments`, { cache: "no-store" });
    if (!res.ok) throw new Error(`listAttachments failed: ${res.status}`);
    const data = await res.json();
    return data.attachments ?? [];
}

export async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error(`uploadAttachment failed: ${res.status}`);
    const data = await res.json();
    return data.attachment;
}

export async function deleteAttachment(id: string): Promise<void> {
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`deleteAttachment failed: ${res.status}`);
}

// --- EVENTS ---

export type EventKind = "appointment" | "meeting" | "reminder";
export type EventWorkspace = "avacrm" | "ops" | "content";

export type Event = {
    id: string;
    title: string;
    start_time: string;
    end_time: string | null;
    all_day: 0 | 1;
    kind: EventKind;
    workspace: EventWorkspace | null;
    description: string | null;
    created_at: string;
    updated_at: string;
};

export async function getEvents(params: {
    start?: string;
    end?: string;
    q?: string;
    workspace?: EventWorkspace | "all";
    limit?: number;
} = {}): Promise<Event[]> {
    const sp = new URLSearchParams();
    if (params.start) sp.set("start", params.start);
    if (params.end) sp.set("end", params.end);
    if (params.q) sp.set("q", params.q);
    if (params.workspace && params.workspace !== "all") sp.set("workspace", params.workspace);
    if (params.limit) sp.set("limit", String(params.limit));

    const qs = sp.toString() ? `?${sp.toString()}` : "";
    const res = await fetch(`/api/events${qs}`, { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.events;
}

export async function createEvent(payload: {
    title: string;
    start_time: string;
    end_time?: string | null;
    all_day?: boolean;
    kind?: EventKind;
    workspace?: EventWorkspace;
    description?: string | null;
}): Promise<Event> {
    const res = await fetch(`/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.event as Event;
}
