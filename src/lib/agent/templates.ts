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

const GF_LEARNING_TEMPLATE_KEY = "gf_learning_content_sprint_3_projects";

const GF_DOCS = {
  master: {
    ref: "gf_learning_content_system",
    title: "GF — Learning Content System",
    content_md: `# GF — Learning Content System

## Purpose
Create a reusable learning content system for Green Fineness that turns product knowledge, farm science, and field experiments into clear educational content packages.

## Core Projects
- GF — Nitrogen Learning Series
- GF — Plant Nutrients Learning Series
- GF — PNSB Learning & Experiment Track

## Sprint
- GF — Mixed Activation Sprint 01

## Content Package Flow
1. Define the learning promise.
2. Map the key teaching points.
3. Create the script or article draft.
4. Prepare visuals, proof points, and experiment assets.
5. Publish, archive, and review performance.

## Operating Notes
- Keep language practical and Thai-first for growers.
- Separate facts, field observations, and product claims clearly.
- Use each package to build long-term learning assets, not one-off posts.`
  },
  nitrogen: {
    ref: "gf_nitrogen_learning_series",
    title: "GF — Nitrogen Learning Series",
    content_md: `# GF — Nitrogen Learning Series

## Series Goal
Teach nitrogen in a way farmers can understand, apply, and connect to soil health, crop vigor, and fertilizer decisions.

## Learning Pillars
- What nitrogen does inside the plant
- Nitrogen forms and movement in soil
- Common deficiency signals
- Overuse risks and loss pathways
- Practical nitrogen management

## Starter Package
- GF-NITROGEN-006`
  },
  nutrients: {
    ref: "gf_plant_nutrients_learning_series",
    title: "GF — Plant Nutrients Learning Series",
    content_md: `# GF — Plant Nutrients Learning Series

## Series Goal
Build a simple learning path for plant nutrients, from core macronutrients to field symptoms and practical correction choices.

## Learning Pillars
- Primary nutrients
- Secondary nutrients
- Micronutrients
- Deficiency and toxicity patterns
- Nutrient balance and crop stage

## Starter Package
- GF-NUTRIENTS-001`
  },
  pnsb: {
    ref: "gf_pnsb_learning_experiment_track",
    title: "GF — PNSB Learning & Experiment Track",
    content_md: `# GF — PNSB Learning & Experiment Track

## Track Goal
Create educational and experimental content around PNSB that explains what it is, how it is activated, and how field trials should be observed.

## Learning Pillars
- What PNSB is
- Activation and mixed-use basics
- Observation design
- Field experiment notes
- Safety, expectation, and responsible claims

## Starter Packages
- GF-PNSB-KNOW-001
- GF-PNSB-LAB-001`
  },
  sprint: {
    ref: "gf_mixed_activation_sprint_01",
    title: "GF — Mixed Activation Sprint 01",
    content_md: `# GF — Mixed Activation Sprint 01

## Sprint Goal
Launch the first mixed learning sprint across PNSB, nitrogen, and plant nutrient education.

## Package Queue
1. GF-PNSB-KNOW-001
2. GF-NITROGEN-006
3. GF-PNSB-LAB-001
4. GF-NUTRIENTS-001

## Sprint Definition of Done
- Package brief is clear.
- Learning angle is useful for growers.
- Draft or script has a practical structure.
- Visual or experiment assets are identified.
- Next publishing step is ready.`
  }
} as const;

const GF_STARTER_TASKS = [
  {
    code: "GF-PNSB-KNOW-001",
    title: "GF-PNSB-KNOW-001 — PNSB Basics Learning Package",
    project: "PNSB Learning & Experiment Track",
    docRef: GF_DOCS.pnsb.ref,
    scheduledDate: "2026-04-27",
    stage: "Brief"
  },
  {
    code: "GF-NITROGEN-006",
    title: "GF-NITROGEN-006 — Nitrogen Learning Package",
    project: "Nitrogen Learning Series",
    docRef: GF_DOCS.nitrogen.ref,
    scheduledDate: "2026-04-28",
    stage: "Brief"
  },
  {
    code: "GF-PNSB-LAB-001",
    title: "GF-PNSB-LAB-001 — PNSB Lab Experiment Package",
    project: "PNSB Learning & Experiment Track",
    docRef: GF_DOCS.pnsb.ref,
    scheduledDate: "2026-04-29",
    stage: "Experiment Brief"
  },
  {
    code: "GF-NUTRIENTS-001",
    title: "GF-NUTRIENTS-001 — Plant Nutrients Learning Package",
    project: "Plant Nutrients Learning Series",
    docRef: GF_DOCS.nutrients.ref,
    scheduledDate: "2026-04-30",
    stage: "Brief"
  }
] as const;

function getGreenFinenessTaskNotes(task: typeof GF_STARTER_TASKS[number]) {
  return `---
template_key: ${GF_LEARNING_TEMPLATE_KEY}
package_id: ${task.code}
project: ${task.project}
stage: ${task.stage}
sprint_doc_ref: ${GF_DOCS.sprint.ref}
master_doc_ref: ${GF_DOCS.master.ref}
checklist:
- [ ] Confirm learning promise
- [ ] Draft outline
- [ ] Identify proof points or experiment assets
- [ ] Prepare Thai-first publishing copy
---`;
}

function buildGreenFinenessLearningSprintTemplate(): AgentPayload {
  const docs = Object.values(GF_DOCS).map((doc) => ({
    type: "doc.create",
    saveAs: doc.ref,
    data: {
      title: doc.title,
      content_md: doc.content_md
    }
  }));

  const tasks = GF_STARTER_TASKS.map((task) => ({
    type: "task.create",
    data: {
      title: task.title,
      workspace: DEFAULT_WORKSPACE,
      status: "planned",
      scheduled_date: task.scheduledDate,
      doc_id_ref: task.docRef,
      notes: getGreenFinenessTaskNotes(task)
    }
  }));

  return {
    dry_run: true,
    actions: [...docs, ...tasks]
  };
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
  "GF Learning Content Sprint — 3 Projects": () => buildGreenFinenessLearningSprintTemplate(),
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
