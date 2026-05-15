export interface GfArticleInput {
    topic_id: string;
    topic_title: string;
    target_group_id: string;
    target_group_type: 'list' | 'sprint';
    workflow_order?: number;
    content_pillar: string;
    content_layer: string;
    article_format: string;
    journey_set: string;
    journey_stage: string;
    bridge_from: string;
    bridge_to: string;
}

export type GfWorkflowPreset = 'lean_v2' | 'legacy_v1';

interface TaskDefinition {
    step_role: string;
    title_suffix: string;
    template: (input: GfArticleInput) => string;
}

function buildMetadataFrontmatter(input: GfArticleInput, stepRole: string, preset: GfWorkflowPreset): string {
    const workflowVersion = preset === 'lean_v2' ? 'lean_v2' : 'legacy_v1';
    const taskSet = preset === 'lean_v2' ? 'green_fineness_lean_4_tasks' : 'green_fineness_legacy_8_tasks';

    return `---
topic_id: ${input.topic_id}
topic_title: ${input.topic_title}
step_role: ${stepRole}
workflow_version: ${workflowVersion}
task_set: ${taskSet}
workflow_order: ${input.workflow_order || 0}
content_pillar: ${input.content_pillar}
content_type: web_article
content_layer: ${input.content_layer}
article_format: ${input.article_format}
narrative_status: mapped
journey_set: ${input.journey_set}
journey_stage: ${input.journey_stage}
status: research
priority: medium
---
`;
}

const LEAN_V2_TASKS: TaskDefinition[] = [
    {
        step_role: "research_prompt",
        title_suffix: "NotebookLM Research Prompt",
        template: (input) => `# NotebookLM Research Prompt

## Topic
${input.topic_title}

## Topic ID
${input.topic_id}

## Research Goal
[สิ่งที่ต้องการให้ NotebookLM สรุปหรือดึงข้อมูลออกมา]

## Prompt for NotebookLM
[วาง Prompt ที่ใช้จริง]

## Required Output from NotebookLM
- Key facts
- Useful claims
- Claims to be careful with
- Terms / concepts to keep
- Suggested sources / references
- Notes for Arbor

## Notes After Research
[สรุปสั้นๆ หลังได้ Output จาก NotebookLM]`
    },
    {
        step_role: "direction_plan",
        title_suffix: "Direction & Content Plan",
        template: (input) => `# Direction & Content Plan

## Topic
${input.topic_title}

## Topic ID
${input.topic_id}

---

## Knowledge Article Direction

### Working Title
[ชื่อบทความให้ความรู้]

### Core Message
[ข้อความหลัก]

### Key Scientific Concepts
- 
- 
- 

### Main Sections
1. 
2. 
3. 
4. 

### Claim Guardrails
- 
- 
- 

### Image Needs
- Cover:
- Body Images:
- Scientific Figures:

### References Needed
- 
- 
- 

---

## Narrative Article Direction

### Working Title
[ชื่อบทความ Narrative / Documentary]

### Documentary Angle
[มุมมองการเล่าเรื่อง]

### Journey Stage
[Stage ของ Plant Journey / Nature Series]

### Scene Sequence
1. 
2. 
3. 
4. 

### Related Knowledge Article
[ชื่อบทความที่เกี่ยวข้องหรือ URL]

### Image Needs
- Hero:
- Sequence Images:
- Social Images:

---

## Decision
- Knowledge Article:
- Narrative Article:
- Do First:
- Park for Later:`
    },
    {
        step_role: "article_pack",
        title_suffix: "Final Article Pack",
        template: (input) => `# Final Article Pack

## Topic
${input.topic_title}

## Topic ID
${input.topic_id}

## Status
Article Ready / Waiting Publish

---

# A) Knowledge Article Upload Pack

## Website Fields

### Title
[Article title]

### Slug
[slug]

### Excerpt
[excerpt]

### Meta Title
[meta title]

### Meta Description
[meta description]

### Category
[category]

### Content Layer
Knowledge

### Series
[series name if any]

### Journey Stage
[journey stage if any]

### Primary Keyword
[primary keyword]

### Secondary Keywords
- 
- 
- 

### Internal Links
- 
- 
- 

### Status
Ready for Draft Upload / Waiting Publish

---

## Body Markdown

[Final article body with image URLs already embedded]

Example:

![Alt text](Image URL)

*Caption*

---

## References

1. 
2. 
3. 

---

## Schema / JSON-LD

\`\`\`json
{
  "@context": "https://schema.org"
}
\`\`\`

---

# B) Narrative Article Upload Pack

## Website Fields

### Title
[Narrative title]

### Slug
[slug]

### Excerpt
[excerpt]

### Meta Title
[meta title]

### Meta Description
[meta description]

### Category
Nature Series

### Content Layer
Narrative

### Series
[series name]

### Journey Stage
[journey stage]

### Related Knowledge Article
[URL or related article title]

### Status
Ready for Draft Upload / Waiting Publish

---

## Body Markdown

[Final narrative article body with image URLs already embedded]

---

## References / Source Note

[แหล่งที่มาหรือหมายเหตุว่าต่อยอดมาจาก Knowledge Article ไหน]

---

## Schema / JSON-LD

\`\`\`json
{
  "@context": "https://schema.org"
}
\`\`\``
    },
    {
        step_role: "publish_social_pack",
        title_suffix: "Publish & Social Pack",
        template: (input) => `# Publish & Social Pack

## Topic
${input.topic_title}

## Topic ID
${input.topic_id}

## Status
Waiting Publish / Published / Social Ready / Social Published

---

## Published URLs

### Knowledge Article
[PUBLISHED_URL_KNOWLEDGE]

### Narrative Article
[PUBLISHED_URL_NARRATIVE]

---

## UTM Templates

### Knowledge Article

Facebook Group:
[PUBLISHED_URL_KNOWLEDGE]?utm_source=facebook&utm_medium=group&utm_campaign=[campaign_name]&utm_content=group_post

Facebook Page:
[PUBLISHED_URL_KNOWLEDGE]?utm_source=facebook&utm_medium=page&utm_campaign=[campaign_name]&utm_content=page_post

Personal Profile:
[PUBLISHED_URL_KNOWLEDGE]?utm_source=facebook&utm_medium=personal&utm_campaign=[campaign_name]&utm_content=personal_post

Line OA:
[PUBLISHED_URL_KNOWLEDGE]?utm_source=line&utm_medium=oa&utm_campaign=[campaign_name]&utm_content=line_oa

---

### Narrative Article

Facebook Group:
[PUBLISHED_URL_NARRATIVE]?utm_source=facebook&utm_medium=group&utm_campaign=[campaign_name]&utm_content=group_post

Facebook Page:
[PUBLISHED_URL_NARRATIVE]?utm_source=facebook&utm_medium=page&utm_campaign=[campaign_name]&utm_content=page_post

Personal Profile:
[PUBLISHED_URL_NARRATIVE]?utm_source=facebook&utm_medium=personal&utm_campaign=[campaign_name]&utm_content=personal_post

---

## Facebook Group Post

[Final group post]

---

## Facebook Page Post

[Final page post]

---

## Personal Post

[Final personal post]

---

## Short Caption

[Short caption]

---

## Hashtags

[hashtags]

---

## Reference Note for Social

แหล่งความรู้ประกอบโพสต์นี้  
- 
- 
- 
- สรุปและเรียบเรียงจากฐานข้อมูล NotebookLM และเอกสารต้นทางที่เกี่ยวข้อง

---

## Publish Log

### Website
- Date:
- URL:
- Status:

### Facebook Group
- Date:
- Post URL:
- Status:

### Facebook Page
- Date:
- Post URL:
- Status:

### Personal Profile
- Date:
- Post URL:
- Status:

### Notes
- `
    }
];

const LEGACY_TASKS: TaskDefinition[] = [
    {
        step_role: "research_raw",
        title_suffix: "Research Raw — NotebookLM",
        template: (input) => `# ${input.topic_id} — Research Raw / NotebookLM

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting research input

## เป้าหมาย
เก็บข้อมูลดิบจาก NotebookLM เพื่อใช้เป็นฐานความรู้ตั้งต้นสำหรับบทความ Green Fineness

## NotebookLM Prompt
[วาง prompt ที่ใช้ถาม NotebookLM]

## Raw Summary
[วางสรุปดิบจาก NotebookLM]

## Key Facts from Sources
- 

## Useful Claims
- 

## Claims to Be Careful With
- 

## Terms / Concepts to Keep
- 

## Suggested Sources to Cite
- 

## Notes for Arbor
- `
    },
    {
        step_role: "research_direction",
        title_suffix: "Research Direction — Arbor Questions",
        template: (input) => `# ${input.topic_id} — Research Direction / Arbor Questions

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting direction

## Main Framing
[หัวข้อนี้ควรถูกเล่าในฐานะอะไร]

## Positioning in Knowledge Hub
[บทบาทของหัวข้อนี้ใน Green Fineness Library]

## Positioning in Core Journey
[ตำแหน่งใน Journey ถ้ามี]

## Main Questions
1. 
2. 
3. 
4. 
5. 

## Editorial Direction
- calm
- clear
- educational
- knowledge-first
- no overclaim

## What to Emphasize
- 

## What to Avoid
- 

## Bridge to Brief
[สิ่งที่จะส่งต่อไป Step 3]`
    },
    {
        step_role: "brief",
        title_suffix: "Brief",
        template: (input) => `# ${input.topic_id} — Brief

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting brief

## เป้าหมายของตอนนี้
[อธิบายเป้าหมายของบทความ]

## Core Message
[ข้อความแกนหลักของตอนนี้]

## Audience
- 

## Pain Point
- 

## Key Angles
1. 
2. 
3. 
4. 
5. 

## Tone & Style
[โทนและรูปแบบภาษา]

## Suggested Opening
[แนวเปิดบทความ]

## Suggested Closing
[แนวปิดบทความ]

## Bridge From
${input.bridge_from}

## Bridge To
${input.bridge_to}`
    },
    {
        step_role: "outline_web_article",
        title_suffix: "Outline web article",
        template: (input) => `# ${input.topic_id} — Outline web article

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting outline

## Title
[ชื่อบทความ]

## Excerpt
[คำโปรยบทความ]

## Hero Opening
[ย่อหน้าเปิดบทความ]

## Main Structure
1. 
2. 
3. 
4. 
5. 

## Key Points to Expand
- 

## FAQ Direction
- 

## Reference Note
- 

## Image Need Notes
- 

## Internal Link Direction
- 

## Suggested Closing
[ย่อหน้าปิด]

## Bridge to Next Article
${input.bridge_to}`
    },
    {
        step_role: "script_caption",
        title_suffix: "Script & Caption",
        template: (input) => `# ${input.topic_id} — Script & Caption

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting social copy

## Checklist
- [ ] Group Post ready
- [ ] Page Post ready
- [ ] Personal Post ready
- [ ] Website Bridge ready
- [ ] Short Caption ready
- [ ] Reference Note ready
- [ ] Hashtags ready

## Group Post
[โพสต์กลุ่ม — เล่าเรื่อง ชวนคิด ชวนอ่านต่อ]

## Page Post
[โพสต์เพจ — editorial, สุขุม, กระชับกว่าโพสต์กลุ่ม]

## Personal Post
[โพสต์ส่วนตัว — มุมคุณตั้ม / เบื้องหลังการเรียนรู้]

## Website Bridge Copy
[ข้อความพาไปอ่านบทความเต็มในเว็บ]

## Short Caption
[caption สั้น ใช้กับภาพเดี่ยว / แชร์ลิงก์]

## Hook Options
1. 
2. 
3. 
4. 
5. 

## Closing Line Options
1. 
2. 
3. 

## Reference Note
[แหล่งอ้างอิงย่อสำหรับท้ายโพสต์]

## Hashtags

### Main Set
#GreenFineness #ธาตุอาหารพืช #PlantNutrition

### Group Set
#GreenFineness #ดินมีชีวิต #เรียนรู้ไปด้วยกัน

### Page Set
#GreenFineness #ความรู้เกษตร #ระบบพืช`
    },
    {
        step_role: "assets_canva",
        title_suffix: "Assets / Canva",
        template: (input) => `# ${input.topic_id} — Assets / Canva

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting visual brief

## Visual Objective
[เป้าหมายของภาพ]

## Core Visual Message
- 

## Visual Direction
- calm
- scientific
- editorial
- clean
- premium
- not cartoonish

## Website Image Plan
1. Hero image — 
2. Section image — 
3. Section image — 
4. Section image — 

## Infographic / Carousel Plan
1. Cover — 
2. Concept — 
3. Mechanism — 
4. Key system — 
5. Caution — 
6. Closing — 

## Canva Visual Brief
[รายละเอียดสำหรับทำภาพใน Canva]

## Image Prompt
[Prompt สำหรับ AI Image]

## Alt Text Direction
- 

## Supabase Folder / File Direction
article-images/articles/<slug>/`
    },
    {
        step_role: "seo_schema",
        title_suffix: "SEO & Schema",
        template: (input) => `# ${input.topic_id} — SEO & Schema

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting SEO assembly

## Website Fields

### Meta Title
[ไม่เกินประมาณ 60 ตัวอักษร]

### Meta Description
[ประมาณ 150–160 ตัวอักษร]

### Slug
[slug ภาษาอังกฤษ]

### Keywords
- 

## Internal Links

### Prerequisite
- 

### Next Step
- 

### Related Articles
- 

## References
- 

## FAQ
1. 
2. 
3. 

## Schema / Custom JSON-LD

\`\`\`json
{
  "@context": "https://schema.org",
  "@graph": []
}
\`\`\`
`
    },
    {
        step_role: "publish",
        title_suffix: "Publish",
        template: (input) => `# ${input.topic_id} — Publish

## หัวข้อ
${input.topic_title}

## รหัส
${input.topic_id}

## สถานะ
Waiting final assembly

## Final Checklist
- [ ] Website Fields final
- [ ] Body Markdown final
- [ ] References final
- [ ] Schema final
- [ ] Images uploaded
- [ ] Alt text checked
- [ ] Website draft created
- [ ] Publish review complete
- [ ] Final URL added
- [ ] UTM generated
- [ ] Group post ready
- [ ] Page post ready
- [ ] Personal post ready

## Final Copy

### Website URL
[ใส่ URL หลังเผยแพร่]

### Final Body Markdown
[วางบทความ final หรือ link ไป Article Studio]

### Final Asset Set
1. 
2. 
3. 

## UTM

### Group
[UTM link]

### Page
[UTM link]

### Personal
[UTM link]

## Publish Log

### Website
- Date:
- Status:
- URL:

### Facebook Group
- Date:
- Status:
- Link:

### Facebook Page
- Date:
- Status:
- Link:

### Personal
- Date:
- Status:
- Link:

## Tracking Notes
- GA4:
- Search Console:
- Internal link checked:`
    }
];

export function buildGfArticleTaskSetPayloads(input: GfArticleInput, preset: GfWorkflowPreset = 'lean_v2') {
    const taskDefs = preset === 'lean_v2' ? LEAN_V2_TASKS : LEGACY_TASKS;
    
    return taskDefs.map((taskDef, index) => {
        const order = index + 1;
        const inputWithOrder = { ...input, workflow_order: order };
        const title = `[${input.topic_id}] ${taskDef.title_suffix}`;
        const frontmatter = buildMetadataFrontmatter(inputWithOrder, taskDef.step_role, preset);
        const templateContent = taskDef.template(inputWithOrder);
        const fullNotes = `${frontmatter}\n${templateContent}`;
        
        return {
            title,
            workspace: "content",
            status: "inbox",
            list_id: input.target_group_type === 'list' ? input.target_group_id : undefined,
            sprint_id: input.target_group_type === 'sprint' ? input.target_group_id : undefined,
            topic_id: input.topic_id,
            topic_title: input.topic_title,
            priority: 2, // Medium priority
            notes: fullNotes,
            sort_order: order
        };
    });
}

