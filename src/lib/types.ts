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

export interface Project {
    id: string;
    slug: string;
    name: string;
    status: "inbox" | "planned" | "done";
    start_date: string | null;
    end_date: string | null;
    owner: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectItem {
    id: string;
    project_id: string;
    title: string;
    status: "inbox" | "planned" | "done";
    priority: number | null;
    schedule_bucket: ScheduleBucket | null;
    start_date: string | null;
    end_date: string | null;
    is_milestone: number;
    workstream: string | null;
    dod_text: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;

    // joined fields from API timeline
    project_name?: string;
    project_slug?: string;
}

export interface Sprint {
    id: string;
    project_id: string;
    name: string;
    status: "planned" | "active" | "completed";
    start_date: string | null;
    end_date: string | null;
}
