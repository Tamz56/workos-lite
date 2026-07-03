import { Workspace } from "./workspaces";
export { type Workspace };
export type TaskStatus = "inbox" | "planned" | "in_progress" | "review" | "done";
export type ScheduleBucket = "morning" | "afternoon" | "evening" | "none";

export type Task = {
    id: string;
    title: string;
    workspace: Workspace;
    list_id: string | null;

    parent_task_id: string | null;
    sort_order: number | null;
    sprint_id: string | null;

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

    // joined fields from API views
    list_name?: string;
    sprint_name?: string;
    template_key?: string | null;
    topic_id?: string | null;
    topic_title?: string | null;
    package_id?: string | null;
    step_key?: string | null;
    package_total?: number;
    package_done?: number;
    review_status?: string; // RC26
    published_at?: string | null; // RC28
    distribution_channels?: string | null; // RC29
    performance_metrics?: string | null; // RC30

    // Agent Automation (MVP)
    agent_enabled?: number;
    agent_mode?: string | null;
    scheduled_run_at?: string | null;
    source_note_id?: string | null;
    research_note_id?: string | null;
    output_target?: 'new_note';
    approval_required?: number;
    agent_status?: 'idle' | 'queued' | 'running' | 'review' | 'failed';
    agent_last_run_at?: string | null;
    last_agent_result_note_id?: string | null;
    last_agent_error?: string | null;
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
    task_id?: string | null;
    doc_id?: string | null;
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

export type ProjectRegistryStatus =
    | "idea"
    | "planning"
    | "active"
    | "in_development"
    | "testing"
    | "in_use"
    | "maintenance"
    | "paused"
    | "completed";

export type ProjectProgressStage =
    | "Concept"
    | "Spec Ready"
    | "Dev Ready"
    | "In Dev"
    | "QA"
    | "Committed"
    | "In Use"
    | "Needs Improvement"
    | "Paused";

export interface ProjectRegistryMetadata {
    category: string;
    status: ProjectRegistryStatus;
    priority: "high" | "medium" | "low" | "none";
    currentGoal: string;
    progressStage: ProjectProgressStage;
    nextAction: string;
    cadence: string;
    riskOrBlockedBy: string;
    lastUpdated: string;
}

export interface ProjectItem {
    id: string;
    project_id: string;
    title: string;
    status: "inbox" | "planned" | "in_progress" | "drafted" | "ready_for_review" | "done" | "blocked" | "archived";
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
export interface Note {
    id: string;
    title: string;
    content_json: string;
    content_html: string;
    plain_text: string;
    project_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface NoteLink {
    id: string;
    note_id: string;
    linked_entity_type: "task" | "project";
    linked_entity_id: string;
    created_at: string;
}

export type ProjectDocBlockType = 
    | "brief"
    | "process_note"
    | "sop"
    | "structure"
    | "decision"
    | "milestone"
    | "issue_fix"
    | "publish"
    | "qa_review";

export type DocBlockSourceType = 
    | "manual_paste" 
    | "walkthrough" 
    | "commit_log" 
    | "qa_report" 
    | "publish_log" 
    | "chat_summary";

export interface ProjectDocumentationBlock {
    id: string;
    projectSlug: string;
    type: ProjectDocBlockType;
    title: string;
    date: string;
    summary: string;
    details: string;
    evidenceLinks: string[]; // URLs or Commit hashes
    relatedFiles: string[];  // File names/paths
    nextAction?: string;
    status: string;
    createdAt: string;
    updatedAt: string;

    // Source tracking & Arbor Assistant
    sourceText?: string;
    sourceExcerpt?: string;
    sourceType?: DocBlockSourceType;
    generatedBy?: "arbor";
    reviewedByUser?: boolean;
    appliedAt?: string;
    orderIndex?: number;
}

export type ProjectContentRoadmapStatus =
  | "idea"
  | "planned"
  | "drafting"
  | "review"
  | "ready_to_publish"
  | "published"
  | "tracking"
  | "needs_update"
  | "paused";

export type ProjectContentType =
  | "narrative_article"
  | "knowledge_article"
  | "group_post"
  | "page_post"
  | "personal_post"
  | "infographic"
  | "short_video"
  | "follow_up_post"
  | "supporting_article"
  | "legacy_article";

export type ProjectContentLayer =
  | "core_episode"
  | "supporting_article"
  | "social_post"
  | "performance_followup"
  | "visual_asset"
  | "video_asset"
  | "legacy_shell";

export interface ProjectContentRoadmapItem {
    id: string;
    projectSlug: string;
    episodeCode: string;
    title: string;
    contentType: ProjectContentType;
    contentLayer: ProjectContentLayer;
    seriesOrTheme?: string;
    status: ProjectContentRoadmapStatus;
    priority: "high" | "medium" | "low" | "none";
    targetChannel?: string;
    targetPublishDate?: string;
    relatedMainEpisode?: string;
    nextAction?: string;
    notes?: string;
    linkedWritingProjectId?: string;
    linkedPublishedUrl?: string;
    createdAt: string;
    updatedAt: string;

    // Additional optional fields for WORKOS-OPS-001C
    orderIndex?: number;
    contentGoal?: string;
    reviewNote?: string;
    sourceText?: string;
    sourceType?: "manual" | "sheet_paste" | "chat_paste" | "arbor_parse";
}
