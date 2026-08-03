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
  | "social_story_copy"
  | "journey_chapter";

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
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  excerpt: string | null;
  internal_links_notes: string | null;
  references_notes: string | null;
  group_post_markdown: string | null;
  page_post_markdown: string | null;
  personal_post_markdown: string | null;
  social_caption: string | null;
  hashtags: string | null;
  tone_profile: string | null;
  web_voice_guideline: string | null;
  group_voice_guideline: string | null;
  page_voice_guideline: string | null;
  personal_voice_guideline: string | null;
  claim_guardrail_note: string | null;
  attached_to: string | null;
  narrative_body?: string | null;
  knowledge_body?: string | null;
  narrative_title?: string | null;
  narrative_slug?: string | null;
  narrative_hero_subtitle?: string | null;
  narrative_featured_image_url?: string | null;
  narrative_short_summary?: string | null;
  narrative_meta_title?: string | null;
  narrative_meta_description?: string | null;
  narrative_keywords?: string | null;
  narrative_schema_jsonld?: string | null;
  narrative_editors_pick?: number | null;
  narrative_related_knowledge_article?: string | null;
  narrative_journey_stage?: string | null;
  knowledge_title?: string | null;
  knowledge_slug?: string | null;
  knowledge_hero_subtitle?: string | null;
  knowledge_featured_image_url?: string | null;
  knowledge_short_summary?: string | null;
  knowledge_meta_title?: string | null;
  knowledge_meta_description?: string | null;
  knowledge_keywords?: string | null;
  knowledge_schema_jsonld?: string | null;
  knowledge_status?: string | null;
  knowledge_editors_pick?: number | null;
  knowledge_related_narrative_article?: string | null;
  knowledge_primary_keyword?: string | null;
  knowledge_secondary_keywords?: string | null;
  knowledge_category?: string | null;
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
