# Arbor Agent Handoff Markdown Export v1 Specification

*   **Status**: Proposed / Specification
*   **Version**: 1.0.0
*   **Last Updated**: 2026-07-09

---

## 1. Purpose
Define a standardized, structured, and self-contained Markdown format for exporting project context, current loop state, decision gate history, expected outputs, and constraints. This package serves as a secure, human-readable, and machine-parsable handoff contract when delegating workflows to external AI agents or human operators.

---

## 2. Why Agent Handoff Matters
In multi-agent and human-in-the-loop workflows, transferring task states cleanly prevents:
1.  **Context Drift**: AI agents losing track of project guidelines, tone definitions, or historical constraints.
2.  **Safety Failures**: Agents executing actions that violate safety levels (e.g. committing code or publishing content without human gate validation).
3.  **Redundant Analysis**: Re-analyzing codebase structures or historical decisions that have already been resolved.

By standardizing the state transfer as a single Markdown file, the system provides a clean, portable "boundary of execution" for any receiver.

---

## 3. Data Sources
The handoff package aggregates information dynamically from:
*   **Project Context**: Title, overview, purpose, standing instructions, tone/voice guidelines, guardrails, output standards, decision rules, and source of truth references.
*   **Current Loop**: Loop name, type, active status, risk level, review gate level, and current steps list.
*   **Decision Gate Status**: Current checkpoint status (`approved`, `revision_requested`, etc.).
*   **Gate Event History**: Historical timeline log of gate actions, evaluations, and human notes.
*   **User Inputs**: Expected output description, target save destination, and post-mortem learn notes.
*   **Relevant Source Files**: Paths and references to workspace documents, rules, or code files.

---

## 4. Handoff Package Structure
The exported document is a single Markdown file structured hierarchically as follows:

```markdown
# Agent Handoff Package

## Task Intent
[High-level objective of this handoff]

## Project Context Summary
[Brief description of project overview, purpose, and rules]

## Scope
[Predefined tasks the receiving agent is allowed to do]

## Non-Scope
[Specific actions or components strictly excluded from this task]

## Current Loop
[Name, type, and status of the parent loop]

## Current Step
[Active step index and step description]

## Review Gate
[review_gate_level, gate_status, and last action details]

## Sources / Files / Data
[List of file links, database tables, or reference documents]

## Required Output
[Expected output format and save destination]

## Guardrails
[General and project-specific safety guardrails]

## Stop Conditions
[Explicit triggers showing when the receiving agent must stop and hand back]

## Verification Requirements
[Checks needed to confirm task success before handing back]

## Return Report Format
[Template of the report the receiving agent must return]
```

---

## 5. Required Markdown Sections

### 5.1 Task Intent
*   **Description**: A concise summary of the task to be performed by the receiving agent.
*   **Example**: *Drafting a 1500-word research-backed knowledge article on Auxin plant hormone mechanisms and root development.*

### 5.2 Project Context Summary
*   **Description**: Relevant standing instructions, tone definitions, and source of truth summaries retrieved from the Project Context.
*   **Focus**: Essential guidelines relevant to the execution context (e.g. "Use formal Thai language suitable for agricultural researchers").

### 5.3 Scope
*   **Description**: Fine-grained list of approved activities.
*   **Rule**: Explicitly boundary the work (e.g. "Only draft inside `/docs/articles/`, do not touch source code").

### 5.4 Non-Scope
*   **Description**: Actions the agent must not perform.
*   **Rule**: List forbidden files, databases, or API routes.

### 5.5 Current Loop & Current Step
*   **Description**: The metadata of the current execution state, including loop name, type, risk level, active step index, and steps list.

### 5.6 Review Gate
*   **Description**: The loop's `review_gate_level` (0 to 3) and current `gate_status` as evidence of validation.
*   **Details**: Summarize recent gate events to provide historical context.

### 5.7 Sources / Files / Data
*   **Description**: Exact file paths or database sources the receiving agent is permitted to read or interact with.

### 5.8 Required Output
*   **Description**: What deliverables must be created, and where they should be saved (`save_destination`).

### 5.9 Guardrails
*   **Description**: Quality and safety constraints (e.g. claim language guidelines for market-sensitive topics, syntax constraints).

### 5.10 Stop Conditions
*   **Description**: Explicit rules defining when the agent must immediately abort execution and request human review.

### 5.11 Verification Requirements
*   **Description**: The testing and quality assurance steps the receiving agent must execute locally before returning (e.g., linter, tests, or compiler commands).

### 5.12 Return Report Format
*   **Description**: The structured handoff report template the receiving agent must append when completing the task.

---

## 6. Agent Target Profiles & Execution Modes

### 6.1 Agent Target Profiles
The handoff package is optimized for different receivers:
*   **ChatGPT / Claude (Chat UI)**: Focused on markdown reading, ideation, draft reviews, and text generation.
*   **Claude Code (CLI Agent)**: Focused on terminal execution, script edits, and automated verification commands.
*   **Codex / Code LLMs**: Tailored for syntax completions, code editing, and structural changes.
*   **Browser Agent**: Tailored for visual validation, clicking page flows, and taking screenshots.
*   **Local Automation Agent**: Tailored for background migrations, file conversions, and build script runs.
*   **Human Operator**: Clear checklist format for human peer review.

### 6.2 Execution Modes
*   **Chat Only**: Interactive chat window execution without local file system writes.
*   **Browser-assisted**: Involves DOM interaction and visual verification.
*   **Local file-assisted**: Code/document editing in a local sandbox or workspace.
*   **Code execution**: Sandboxed script execution to run tests or migrations.
*   **Manual review**: Visual inspection checkpoint.
*   **Background task**: Non-interactive polling execution.

---

## 7. Review Gate Integration
The parent loop's `review_gate_level` determines the security level injected into the handoff package:

*   **Level 0 (Suggest)**: Handoff instructs the agent that its recommendations are advisory. The agent has no write permissions on source files.
*   **Level 1 (Draft)**: Handoff allows writing draft files (e.g. creating new `.md` files or workspace outputs), but restricts editing existing files.
*   **Level 2 (Modify)**: Handoff allows editing specific files within a defined scope, but blocks any system-level configuration or deployment.
*   **Level 3 (Commit/Publish/Destructive)**: Handoff explicitly states that live commits, publishing, external sending, or deletions are strictly prohibited without human operator sign-off and token verification.

---

## 8. Stop Conditions
The exported handoff package must contain a standardized list of stop conditions that force the receiving agent to halt immediately:
1.  **Scope Ambiguity**: The task instructions or boundary definitions are vague.
2.  **Missing Assets**: Required data files, database schemas, or reference source documents are missing.
3.  **Destructive Actions**: A prompt or step asks the agent to delete, wipe, or rewrite critical out-of-scope code/data.
4.  **Verification Failures**: Local verification commands (e.g. test suites, linters, or builds) fail.
5.  **Sensitive Information Missing**: API keys, credentials, or private configuration contexts are requested but missing.
6.  **Guardrail Violations**: Generating content that breaches safety rules or claims.

---

## 9. Verification & Return Report Format

### 9.1 Verification Requirements
Receiving agents are instructed to run localized tests:
*   Lint check commands (e.g. `npm run lint`).
*   Unit/E2E test suite commands (e.g. `npm test`).
*   Compilation check commands (e.g. `npm run build`).

### 9.2 Return Report Format
The receiving agent must respond using the following structured template:
```markdown
# Return Report

## 1. Summary of Changes
- [Briefly state what was changed/added]

## 2. Files Modified / Created
- [File 1 Path] (Action: NEW/MODIFY/DELETE)

## 3. Verification Performed
- [List test commands run and their results]

## 4. Risks & Edge Cases
- [Note any concerns, performance impact, or safety considerations]

## 5. Next Recommended Step
- [Action items for the next human/agent operator]
```

---

## 10. Example Handoff Package

Here is a realistic demonstration of an exported handoff package for a writing sprint:

```markdown
# Agent Handoff Package: Auxin Article Draft

## Task Intent
Draft the knowledge article "EP.10.2 Auxin: Plant Hormones and Root Development" in formal Thai language.

## Project Context Summary
*   **Project**: Green Fineness Learning Content Sprint
*   **Standing Instructions**: Articles must connect plant physiology, soil chemistry, and environment as a system. Use academic references.
*   **Tone/Voice**: Professional, educational, and research-backed. Avoid overclaims or guaranteed formulas.

## Scope
*   Create new file `docs/articles/auxin-root-development-v1.md`.
*   Draft content explaining auxin synthesis, polar transport, and adventitious rooting.

## Non-Scope
*   Do not modify existing article templates in `docs/templates/`.
*   Do not edit database tables.

## Current Loop
*   **Loop Name**: Auxin Synthesis Drafting
*   **Loop Type**: Content Creation
*   **Status**: Active
*   **Risk Level**: Medium

## Current Step
*   **Step**: 3/9 (Drafting Content)

## Review Gate
*   **Gate Level**: 1 (Drafting)
*   **Gate Status**: approved (Note added: "Structure matches curriculum standards")

## Sources / Files / Data
*   Reference Source: `docs/references/notebooklm-auxin-summary.md`

## Required Output
*   Markdown file containing complete article drafts with appropriate markdown structure.
*   Save Destination: `/Users/tamz/projects/workos-lite/docs/articles/auxin-root-development-v1.md`

## Guardrails
*   Do not claim any biostimulant or input guarantees 100% crop yields.
*   Ensure all scientific names of plants are italicized.

## Stop Conditions
*   Stop if `docs/references/notebooklm-auxin-summary.md` is inaccessible.
*   Stop if asked to publish directly to the main production website database.

## Verification Requirements
*   Ensure markdown lint check passes.
*   Ensure all links in the document resolve correctly.

## Return Report Format
Must return the standard 5-part Handoff Report.
```

---

## 11. Future Export Formats (Roadmap)
The following formats are proposed for future iteration (out of scope for v1):
*   `project-context.md`: Raw export of the project's context parameters.
*   `CLAUDE.md`: Tailored configuration file containing instructions for local IDE agents (e.g. Claude Code).
*   `AGENTS.md`: Workspace rules file detailing behavioral guidelines.
*   `Prompt Pack`: Packaged JSON/YAML prompts for chat clients.
*   `QA Checklist`: Extracted verification checklist to import into sprint boards.
*   `Handoff Note`: Quick slack-like summary of task progression.
*   `Skill Definition`: Custom MCP (Model Context Protocol) tool configurations.

---

## 12. Implementation Notes for Future UI
When designing the export buttons in the Loops UI in future tasks:
1.  **Export Button**: Place a "Handoff to Agent (Export Markdown)" button on expanded Loop cards next to "Save Changes".
2.  **Copy to Clipboard**: Provide a quick copy button copying the entire package with one click.
3.  **File Download**: Trigger a local browser download for `handoff-[loop_id].md`.

---

## 13. Out of Scope
For v1, the following features are strictly out of scope:
*   Product code changes (React components, styles).
*   Database migrations or schema changes.
*   API route definitions.
*   UI rendering of download buttons.
*   Agent trigger automation.

---

## 14. QA / Review Checklist
Verify the following rules when this spec is reviewed:
- [x] Does the spec address all data source requirements (Project Context, Loops, Gates, Expected Output)?
- [x] Does the structure provide clean stop conditions and safety guardrails?
- [x] Are target profiles and execution modes documented?
- [x] Are future formats marked as out-of-scope?
