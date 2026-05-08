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
  role: EpisodeRole;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WritingProject {
  id: string;
  title: string;
  story_set_id: string | null;
  episode_id: string | null;
  writing_mode: WritingMode;
  status: string;
  narrative_status: string | null;
  attached_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface WritingBlock {
  id: string;
  project_id: string;
  type: string;
  content: string;
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
