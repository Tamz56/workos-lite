export const STAGE_TAGS = [
    "stage:idea",
    "stage:script",
    "stage:storyboard",
    "stage:shoot",
    "stage:edit",
    "stage:ready",
    "stage:posted",
] as const;

export type ContentStage = typeof STAGE_TAGS[number];

export const CONTENT_TEMPLATES = {
    BRIEF: `
# 00-Brief

* **Objective**: 
* **Platform**: 
* **Audience**: 
* **Hook (1 sentence)**: 
* **Key message (3 bullets)**:
  * 
  * 
  * 
* **CTA**: 
* **Length**: 
* **References/Links**:
`.trim(),

    SCRIPT: `
# 01-Script

* **00:00–00:05 Hook**: 
* **00:05–00:30 Body**: 
* **00:30–00:45 Proof/Detail**: 
* **00:45–00:60 CTA**: 

**On-screen text**:
* 

**VO notes**:
* 
`.trim(),

    STORYBOARD: `
# 02-Storyboard

| Scene | Visual | VO/Dialogue | On-screen Text | B-roll | Notes |
|-------|--------|-------------|----------------|--------|-------|
| 1     |        |             |                |        |       |
| 2     |        |             |                |        |       |
| 3     |        |             |                |        |       |
`.trim(),
};
