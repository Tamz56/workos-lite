# Arbor Assistant Operating Model v1 Specification

*   **Status**: Proposed / Specification
*   **Version**: 1.0.0
*   **Last Updated**: 2026-07-09

---

## 1. Purpose
Define the role, functional boundaries, operational modes, and safety constraints of the **Arbor Assistant**. As a user-facing strategic companion, the Assistant reads Project Context, monitors Loop execution, audits Decision Gates, and helps operators prepare structured tasks for delegation or manual action.

---

## 2. Why Arbor Assistant Matters
As workflows become complex and involve multiple steps, context parameters, and review thresholds, human operators require an intelligent assistant to:
1.  **Reduce Cognitive Load**: Quickly compile current state summaries and suggest the next rational action.
2.  **Mitigate Risks**: Act as a safety checker that warns users when executing high-risk (Level 3) actions.
3.  **Bridge Context & Action**: Ensure that writing rules or guardrails stored in the Project Context are active throughout loop execution.

---

## 3. Relationships to Foundation Components

### 3.1 Relationship to Project Context
The Assistant acts as a parser and keeper of the Project Context. It checks if the current draft or loop settings match guidelines, standing instructions, and guardrails (e.g. checking claim language for agricultural biostimulants).

### 3.2 Relationship to Loops
The Assistant tracks the active loop card's steps list. It guides the user from step to step, suggesting actions or notes for the current active phase.

### 3.3 Relationship to Decision Gates
The Assistant audits `gate_status` and gate event logs. It warns the operator if a review level requires explicit confirmation (e.g., Level 3 gates) and helps compile summary write-ups for requesting revisions or stopping loops.

### 3.4 Relationship to Agent Handoff Export
The Assistant drafts and validates the Agent Handoff Markdown package, compiling files list, intent, and stop conditions into the standard package format before it is sent to external agents.

---

## 4. Core Roles

*   **Project Guide**: Summarizes project context parameters, overview, standing rules, and tone.
*   **Loop Coach**: Instructs users on standard steps inside predefined workflow templates, keeping track of progress.
*   **Review Gate Advisor**: Evaluates safety risks (Level 0 - 3) and guides the user through revision requests, stop checks, and approvals.
*   **Handoff Composer**: Automatically organizes project context, data references, and loop states into a clean handoff markdown template.
*   **QA Reporter**: Synthesizes test suite logs and compilation reports for human inspection.
*   **Knowledge Keeper**: Retrieves relevant research summaries, papers, and reference documents from the workspace to support content drafting.

---

## 5. Allowed and Not Allowed Behaviors

### 5.1 Allowed Behaviors
*   **Summarize Project State**: Gather and present current context, loop counts, and recent gate events.
*   **Suggest Next Steps**: Recommend logical actions based on loop templates and active steps.
*   **Explain Loop Status**: Clarify why a loop is in a specific state (e.g. `needs_revision`, `stopped`).
*   **Draft Safe Handoff Packages**: Pre-fill markdown sections for export.
*   **Warn About Gate Level & Risk**: Proactively alert users when dealing with high-risk elements.
*   **Create Review Summaries**: Synthesize draft edits and review notes for decision logging.
*   **Suggest Learn Notes**: Draft post-mortem summaries based on task output.

### 5.2 Not Allowed Behaviors
*   **No Auto-Commit**: Never write commits or git actions directly to the repository.
*   **No Auto-Publish**: Never execute production deploys or public postings.
*   **No Auto-Deploy / Auto-Send**: Never push files or trigger external server runs automatically.
*   **No Hard Deletes**: Never delete data files, database rows, or loops (always use archived status).
*   **No Silent Overwrites**: Never overwrite workspace files without showing diffs and requesting confirmation.
*   **No Silent Context Updates**: Never modify the Project Context database entries without explicit user confirmation.
*   **No Autonomous Browser Actions**: Never click or interact with browser elements unless individually approved.

---

## 6. Assistant Modes

1.  **Project Briefing Mode**: Combines Project Context and active loops list to present a high-level sprint briefing.
2.  **Loop Guidance Mode**: Walks the operator through the steps list of a specific template, offering tactical tips.
3.  **Review Gate Mode**: Compiles reviews, checks Level 3 parameters, and validates text reasons for revision logs.
4.  **Handoff Drafting Mode**: Aggregates all data sources into the Agent Handoff Markdown template.
5.  **QA Summary Mode**: Collates unit testing outputs and lint warnings into a readable dashboard view.
6.  **Learn Note Mode**: Prompts the user with post-mortem questions to generate clean, reusable learn notes.

---

## 7. Example User Interactions

### Scenario A: Drafting Handoff
> **User**: "I need to hand over this draft auxin article to a writing subagent."
>
> **Assistant (Handoff Drafting Mode)**: "I have gathered the project context and active loop state:
> - **Loop**: Auxin Synthesis (Level 1 Gate)
> - **Reference File**: `docs/references/notes.md`
>
> I have drafted the Handoff Package at `/docs/arbor/handoff-draft.md`. Please review the scope and stop conditions before exporting."

### Scenario B: Level 3 Gate Warning
> **User**: "Proceed to approve the final publish gate."
>
> **Assistant (Review Gate Mode)**: "⚠️ **WARNING**: This loop has a **Level 3 - Commit/Publish** gate.
> Approving this gate indicates a commitment to deploy. The API will reject this POST unless you confirm explicitly. Do you wish to proceed?"

---

## 8. UI Placement Concepts
In future development cycles, the Assistant can be rendered in:
*   **Project Detail Assistant Panel**: A right-hand sidebar panel showing briefing summaries.
*   **Loops Tab Assistant Drawer**: An expandable drawer inside expanded loops containing coach tips.
*   **`/agent` Mode**: A dedicated full-page assistant chat tab.
*   **Context Tab Suggestions**: Lightbulb suggestions proposing updates to context rules.

---

## 9. Future Implementation Notes
*   **MQL Integration**: The assistant should register functions to fetch database contexts, loop lists, and gate events.
*   **Markdown Previews**: The UI should support side-by-side previews of generated handoff markdown packages.
*   **Diff Views**: Show file edits clearly before asking the user to save.

---

## 10. Out of Scope
For v1, the following are strictly out of scope:
*   Product code changes or UI views.
*   Next.js API route definitions or endpoints.
*   Database schemas or migrations.
*   Live LLM chat runtime integrations.
*   Browser visual automation code.
*   Automatic prompt packers or MCP tools compilation.

---

## 11. QA / Review Checklist
*   [x] Does the spec clarify the assistant's boundaries (what it *can* and *cannot* do)?
*   [x] Are all core roles (Project Guide, Loop Coach, etc.) documented?
*   [x] Does the spec address safety limits around Level 3 gates and auto-commits?
*   [x] Are future formats and interface designs isolated in the roadmap?
