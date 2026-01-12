import type { Task, Workspace, TaskStatus, ScheduleBucket, Doc, Attachment } from "@/lib/types";

type GetTasksParams = {
    status?: TaskStatus;
    workspace?: Workspace | "all";
    q?: string;
    scheduled_date?: string | "null";
    schedule_bucket?: ScheduleBucket;
    limit?: number;
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

    // API currently returns an ARRAY: [ ... ]
    if (Array.isArray(data)) return data as Task[];

    // Backward/alternate shape: { tasks: [...] }
    if (data && Array.isArray(data.tasks)) return data.tasks as Task[];

    return [];
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
