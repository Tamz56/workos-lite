import { Workspace } from "./workspaces";
export { type Workspace };
export type TaskStatus = "inbox" | "planned" | "done";
export type ScheduleBucket = "morning" | "afternoon" | "evening" | "none";

export type Task = {
    id: string;
    title: string;
    workspace: Workspace;

    status: TaskStatus;

    // planning
    scheduled_date: string | null; // YYYY-MM-DD
    schedule_bucket: ScheduleBucket | null; // can be null in db; treat null as "none" in UI

    // optional timeboxing (future)
    start_time: string | null; // "HH:MM"
    end_time: string | null;   // "HH:MM"

    priority: number | null;
    notes: string | null;

    // docs (future)
    doc_id: string | null;

    // lifecycle
    created_at: string; // ISO-ish string from sqlite
    updated_at: string; // ISO-ish string from sqlite
    done_at: string | null;
};

export interface Doc {
    id: string;
    title: string;
    content_md: string;
    created_at: string;
    updated_at: string;
}

export interface Attachment {
    id: string;
    task_id: string;
    file_name: string;
    mime_type?: string | null;
    size_bytes?: number | null;
    storage_path: string;
    created_at: string;
}

