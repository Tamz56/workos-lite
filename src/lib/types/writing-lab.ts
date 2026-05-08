export type EpisodeRole = 
  | "core_episode" 
  | "supporting_article" 
  | "bridge_article" 
  | "practical_guide" 
  | "journal_note" 
  | "social_only_piece";

export type WritingMode = 
  | "knowledge_article" 
  | "knowledge_journey_article" 
  | "documentary_chapter" 
  | "writers_journal" 
  | "social_story_copy";

export type RelationshipType = 
  | "bridge_from" 
  | "bridge_to" 
  | "related" 
  | "prerequisite" 
  | "next_step" 
  | "supports" 
  | "expands" 
  | "same_story_set";

export type NarrativeStatus = 
  | "unmapped" 
  | "mapped" 
  | "needs_review" 
  | "published";

export type EpisodeStatus = 
  | "idea" 
  | "planned" 
  | "drafting" 
  | "ready_for_article_studio" 
  | "website_draft" 
  | "published" 
  | "archived";

export interface StorySet {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  episodes?: Episode[];
}

export interface Episode {
  id: string;
  story_set_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  role: EpisodeRole;
  journey_stage: string | null;
  attached_to_episode_id: string | null;
  sort_order: number;
  narrative_status: NarrativeStatus;
  status: EpisodeStatus;
  created_at: string;
  updated_at: string;
}

export interface WritingProject {
  id: string;
  topic_id: string | null;
  title: string;
  slug: string | null;
  story_set_id: string | null;
  episode_id: string | null;
  writing_mode: WritingMode;
  episode_role: string | null;
  journey_stage: string | null;
  status: string;
  narrative_status: string | null;
  summary: string | null;
  notes: string | null;
  attached_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface WritingBlock {
  id: string;
  writing_project_id: string;
  block_type: string;
  label: string | null;
  placeholder: string | null;
  content_md: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleRelationship {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: RelationshipType;
  created_at: string;
}
