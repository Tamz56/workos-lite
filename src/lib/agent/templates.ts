/**
 * Agent Templates Registry
 * 
 * Defines standard workflows for content production and topic management.
 * Status Mapping:
 * - Idea / Copywriting / Asset Prep / Ready to Post => planned
 * - In Production => planned
 * - Posted => done
 */

export interface AgentAction {
  type: string;
  saveAs?: string;
  data: any;
}

export interface AgentPayload {
  dry_run: boolean;
  actions: AgentAction[];
}

export interface TemplateParams {
  topicId: string;
  topicTitle: string;
  templateKey?: string;
  publishDate?: string;
}

const DEFAULT_WORKSPACE = "content";

export const CONTENT_VARIANTS: Record<string, { noteTitle: string; taskPrefixes: string[] }> = {
  article: {
    noteTitle: "Article Hub",
    taskPrefixes: ["Article Brief", "Drafting", "Cover Image", "Publish Article", "Archive"]
  },
  short_video: {
    noteTitle: "Short Video Hub",
    taskPrefixes: ["Video Brief", "Scripting", "Assets & B-Roll", "Publish Video", "Archive"]
  },
  carousel: {
    noteTitle: "Carousel Hub",
    taskPrefixes: ["Carousel Brief", "Copywriting", "Design & Canva", "Publish Carousel", "Archive"]
  },
  generic_content: {
    noteTitle: "Content Hub",
    taskPrefixes: ["Brief", "Script & Caption", "Assets / Canva", "Publish", "Archive"]
  }
};

const VARIANT_SCAFFOLDS: Record<string, string> = {
  article: `## Working Title
...

## Audience
...

## Core Thesis
...

## Key Points / Outline
- ...

## Supporting Facts / Sources
- ...

## CTA
...

## Draft Section
...`,
  short_video: `## Hook
...

## Key Message
...

## Shot / Scene Flow
- ...

## Voiceover / Caption
...

## On-screen Text
- ...

## CTA
...

## Production Notes
- ...`,
  carousel: `## Main Idea
...

## Slide-by-slide Outline
1. **Cover Slide Hook**: ...
2. **Problem/Context**: ...
3. **Key Value 1**: ...
4. **Key Value 2**: ...
5. **Key Value 3**: ...
6. **Summary**: ...
7. **CTA Slide**: ...

## Caption Draft
...

## Visual Direction
...

## CTA
...

## Publishing Notes
- ...`,
  generic_content: `## Topic Summary
...

## Audience
...

## Key Message
...

## Content Structure
- ...

## Asset Notes
- ...

## CTA
...

## Working Draft
...`
};

/**
 * Shared helper for schedule calculation (RC18)
 * Returns 5 dates corresponding to the 5 checkpoint tasks.
 */
export function calculateContentSchedule(publishDate: string | undefined): (string | undefined)[] {
  if (!publishDate) return [undefined, undefined, undefined, undefined, undefined];
  
  const offsets = [-4, -3, -2, 0, 1];
  return offsets.map(offset => {
    const d = new Date(publishDate);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  });
}

function getMetadataNotes(templateKey: string, parentLabel: string, stage: string, checklist: string[]) {
  return `---
template_key: ${templateKey}
parent_task_label: ${parentLabel}
stage: ${stage}
checklist:
${checklist.map(item => `- [ ] ${item}`).join("\n")}
---`;
}

function getHybridMetadataNotes(params: {
  topic_id: string;
  topic_title: string;
  template_key: string;
  stage: string;
  doc_ref: string;
  brief_file: string;
}) {
  return `---
topic_id: ${params.topic_id}
topic_title: ${params.topic_title}
template_key: ${params.template_key}
stage: ${params.stage}
doc_ref: ${params.doc_ref}
brief_file: ${params.brief_file}
---`;
}

export const AGENT_TEMPLATES: Record<string, (params: TemplateParams) => AgentPayload> = {
  "Blank": (params) => ({
    dry_run: true,
    actions: [
      {
        type: "doc.create",
        saveAs: "main_doc",
        data: {
          title: "New Strategy",
          content_md: "# Objective\n\nStart your plan here..."
        }
      },
      {
        type: "task.create",
        data: {
          title: "Review Strategy",
          workspace: DEFAULT_WORKSPACE,
          status: "inbox",
          doc_id_ref: "main_doc"
        }
      }
    ]
  }),
  "Content Topic Production": (params) => ({
    dry_run: true,
    actions: [
      {
        type: "doc.create",
        saveAs: "prod_brief",
        data: {
          title: `[Production] ${params.topicTitle || "Content Brief"}`,
          content_md: `# Content Strategy: ${params.topicTitle}\nTopic ID: ${params.topicId}\n\n- Hook:\n- Value:\n- CTA:`
        }
      },
      ...generateContentTasks("content_topic_production", "prod_brief", [
        { title: `${params.topicId} — Keyword Research`, stage: "Idea", status: "planned" },
        { title: `${params.topicId} — Topic Selection`, stage: "Idea", status: "planned" },
        { title: `${params.topicId} — Strategy & Brief Finalization`, stage: "Idea", status: "planned" },
        { title: `${params.topicId} — Script Writing (Full)`, stage: "Copywriting", status: "planned" },
        { title: `${params.topicId} — Script Review`, stage: "Copywriting", status: "planned" },
        { title: `${params.topicId} — SEO Optimization`, stage: "Copywriting", status: "planned" },
        { title: `${params.topicId} — Studio Setup`, stage: "Asset Prep", status: "planned" },
        { title: `${params.topicId} — Gear & Battery Check`, stage: "Asset Prep", status: "planned" },
        { title: `${params.topicId} — Thumbnail Photoshoot`, stage: "Asset Prep", status: "planned" },
        { title: `${params.topicId} — Filming: Main Takes`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Filming: B-Roll`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Filming: Soundbites`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Media Offloading & Backup`, stage: "Asset Prep", status: "planned" },
        { title: `${params.topicId} — Video Editing: First Assemblies`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Video Editing: Color & FX`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Caption Generation & Review`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Thumbnail Creation`, stage: "Ready to Post", status: "planned" },
        { title: `${params.topicId} — Platform Prep: YouTube Metadata`, stage: "Ready to Post", status: "planned" },
        { title: `${params.topicId} — Platform Prep: FB/IG Copy`, stage: "Ready to Post", status: "planned" },
        { title: `${params.topicId} — Platform Prep: TikTok/Reels Copy`, stage: "Ready to Post", status: "planned" },
        { title: `${params.topicId} — Final Review & Quality Check`, stage: "Ready to Post", status: "planned" }
      ])
    ]
  }),
  "Content Topic Solo": (params) => ({
    dry_run: true,
    actions: [
      {
        type: "doc.create",
        saveAs: "solo_brief",
        data: {
          title: `[Solo] ${params.topicTitle || "Content Brief"}`,
          content_md: `# Lean Strategy: ${params.topicTitle}\nTopic ID: ${params.topicId}\n\nQuick notes...`
        }
      },
      ...generateContentTasks("content_topic_solo", "solo_brief", [
        { title: `${params.topicId} — Topic & Lean Brief`, stage: "Idea", status: "planned" },
        { title: `${params.topicId} — Script Drafting`, stage: "Copywriting", status: "planned" },
        { title: `${params.topicId} — Asset Preparation`, stage: "Asset Prep", status: "planned" },
        { title: `${params.topicId} — One-take Filming`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Quick Editing`, stage: "In Production", status: "planned" },
        { title: `${params.topicId} — Thumbnail Generation`, stage: "Ready to Post", status: "planned" },
        { title: `${params.topicId} — Publishing & Posting`, stage: "Posted", status: "done" },
        { title: `${params.topicId} — Daily Performance Check`, stage: "Posted", status: "done" }
      ])
    ]
  }),
  "Content Hybrid Package": (params) => {
    const variantKey = params.templateKey || "generic_content";
    const variant = CONTENT_VARIANTS[variantKey] || CONTENT_VARIANTS.generic_content;
    const scaffold = VARIANT_SCAFFOLDS[variantKey] || VARIANT_SCAFFOLDS.generic_content;

    const summaryHeader = `> **Topic ID:** ${params.topicId}
> **Topic Title:** ${params.topicTitle}
> **Template:** ${variantKey}${params.publishDate ? `\n> **Target Publish Date:** ${params.publishDate}` : ""}

---

`;
    
    return {
      dry_run: true,
      actions: [
        {
          type: "doc.create",
          saveAs: "hybrid_hub",
          data: {
            title: `${params.topicId} | ${params.topicTitle} | ${variant.noteTitle}`,
            content_md: summaryHeader + scaffold
          }
        },
        ...generateHybridTasks(params, "hybrid_hub", variant)
      ]
    };
  }
};

export function getTemplatePayload(name: string, params: TemplateParams): AgentPayload | null {
  const builder = AGENT_TEMPLATES[name];
  if (!builder) return null;
  return builder({
    topicId: (params.topicId || "TOPIC-001").trim(),
    topicTitle: (params.topicTitle || "Untitled Topic").trim(),
    templateKey: params.templateKey,
    publishDate: params.publishDate
  });
}

function generateContentTasks(templateKey: string, docRef: string, taskConfigs: { title: string, stage: string, status: string }[]): AgentAction[] {
  return taskConfigs.map(config => ({
    type: "task.create",
    data: {
      title: config.title,
      workspace: DEFAULT_WORKSPACE,
      status: config.status,
      doc_id_ref: docRef,
      notes: getMetadataNotes(
        templateKey,
        config.title,
        config.stage,
        ["Standard step verification"]
      )
    }
  }));
}

function generateHybridTasks(params: TemplateParams, docRef: string, variant: { noteTitle: string; taskPrefixes: string[] }): AgentAction[] {
  const { topicId, topicTitle, publishDate } = params;
  
  const schedules = calculateContentSchedule(publishDate);
  const stages = ["Brief", "Script", "Assets", "Publish", "Archive"];
  
  return variant.taskPrefixes.map((prefix, idx) => {
    const scheduledDate = schedules[idx];
    
    return {
      type: "task.create",
      data: {
        title: `${topicId} — ${prefix}`,
        workspace: DEFAULT_WORKSPACE,
        status: "planned", // RC17: All tasks remain planned
        doc_id_ref: docRef,
        scheduled_date: scheduledDate,
        notes: getHybridMetadataNotes({
          topic_id: topicId,
          topic_title: topicTitle,
          template_key: params.templateKey || "generic_content",
          stage: stages[idx],
          doc_ref: docRef,
          brief_file: `${topicId}_brief.xlsx`
        })
      }
    };
  });
}
