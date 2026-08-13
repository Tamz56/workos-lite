// ---------------------------------------------------------------------------
// WorkOS mutation authority registry (P1E.1C Phase D)
//
// Static manifest/guardrail: every mutation handler (POST/PUT/PATCH/DELETE)
// under src/app/api must be classified here. The coverage test
// (tests/unit/mutationAuthorityRegistry.test.ts) scans the repository route
// inventory and fails if an unclassified mutation route appears.
//
// This is an audit artifact and test guardrail only. Runtime authorization is
// enforced by the route-level guards (requireHumanMutation / humanMutationGuard
// for H1, agent-key governance for G1/G2). No runtime filesystem scanning.
// ---------------------------------------------------------------------------

export type MutationAuthority =
    | "H1_HUMAN"
    | "G1_AGENT_PROPOSE"
    | "G1_HUMAN"
    | "G2"
    | "C1"
    | "PREVIEW_ONLY"
    | "READ_ONLY_POST"
    | "AUTH_BOOTSTRAP";

// Keys: `${METHOD} ${routeDir}` where routeDir is relative to src/app/api
// (the directory containing route.ts, with dynamic segments preserved).
export const MUTATION_AUTHORITY_REGISTRY: Record<string, MutationAuthority> = {
    // ---- G1 — Operations Gateway ----
    "POST api/operations": "G1_AGENT_PROPOSE",
    "POST api/human/operations/[id]/approve": "G1_HUMAN",
    "POST api/human/operations/[id]/reject": "G1_HUMAN",
    "POST api/human/operations/[id]/revoke": "G1_HUMAN",
    "POST api/human/operations/[id]/execute": "G1_HUMAN",

    // ---- G2 — Project Import (separately governed) ----
    "POST api/project-import/dry-runs": "G2",
    "POST api/project-import/batches/[batchId]/approvals/[entityType]/approve": "G2",
    "POST api/project-import/batches/[batchId]/approvals/[entityType]/reject": "G2",
    "POST api/project-import/batches/[batchId]/approvals/[entityType]/revoke": "G2",
    "POST api/project-import/batches/[batchId]/approvals/[entityType]/execute": "G2",

    // ---- Auth / control-plane ----
    "POST api/human-auth/login": "AUTH_BOOTSTRAP",
    "POST api/human-auth/logout": "C1",
    "POST api/agent/login": "C1",
    "POST api/agent/logout": "C1",

    // ---- Legacy agent (Phase B: preview only) ----
    "POST api/agent/execute": "PREVIEW_ONLY",

    // ---- Read-only POSTs ----
    "POST api/backup/validate": "READ_ONLY_POST",
    "POST api/planner-import/preview": "READ_ONLY_POST",

    // ---- H1 — Tier-0 + core (P1E.1B) ----
    "POST api/tasks": "H1_HUMAN",
    "PATCH api/tasks/[id]": "H1_HUMAN",
    "DELETE api/tasks/[id]": "H1_HUMAN",
    "PATCH api/tasks/batch": "H1_HUMAN",
    "DELETE api/tasks/batch": "H1_HUMAN",
    "POST api/tasks/[id]/run-agent": "H1_HUMAN",
    "POST api/tasks/[id]/attachments": "H1_HUMAN",
    "POST api/docs": "H1_HUMAN",
    "DELETE api/docs": "H1_HUMAN",
    "PATCH api/docs/[id]": "H1_HUMAN",
    "DELETE api/docs/[id]": "H1_HUMAN",
    "POST api/docs/cleanup-drafts": "H1_HUMAN",
    "POST api/events": "H1_HUMAN",
    "DELETE api/events/[id]": "H1_HUMAN",
    "DELETE api/attachments/[id]": "H1_HUMAN",
    "POST api/projects": "H1_HUMAN",
    "PUT api/projects/[slug]": "H1_HUMAN",
    "DELETE api/projects/[slug]": "H1_HUMAN",
    "DELETE api/projects/[slug]/execute": "H1_HUMAN",
    "POST api/projects/[slug]/items": "H1_HUMAN",
    "PUT api/project_items/[id]": "H1_HUMAN",
    "DELETE api/project_items/[id]": "H1_HUMAN",
    "POST api/backup/restore": "H1_HUMAN",
    "POST api/import": "H1_HUMAN",
    "POST api/admin/reset-demo-data": "H1_HUMAN",
    "POST api/admin/create-project-from-template": "H1_HUMAN",

    // ---- H1 — remaining families (P1E.1C Phase A) ----
    "POST api/notes": "H1_HUMAN",
    "PATCH api/notes/[id]": "H1_HUMAN",
    "DELETE api/notes/[id]": "H1_HUMAN",
    "POST api/notes/links": "H1_HUMAN",
    "DELETE api/notes/links": "H1_HUMAN",
    "POST api/lists": "H1_HUMAN",
    "PATCH api/lists/[id]": "H1_HUMAN",
    "DELETE api/lists/[id]": "H1_HUMAN",
    "POST api/sprints": "H1_HUMAN",
    "POST api/sprints/[id]/items": "H1_HUMAN",
    "DELETE api/sprints/[id]/items": "H1_HUMAN",
    "POST api/planner/[date]": "H1_HUMAN",
    "PATCH api/planner/[date]": "H1_HUMAN",
    "POST api/planner/[date]/items": "H1_HUMAN",
    "PATCH api/planner/[date]/items/[id]": "H1_HUMAN",
    "DELETE api/planner/[date]/items/[id]": "H1_HUMAN",
    "POST api/planner-import/execute": "H1_HUMAN",
    "POST api/content/writing-lab/story-sets": "H1_HUMAN",
    "POST api/content/writing-lab/episodes": "H1_HUMAN",
    "PATCH api/content/writing-lab/episodes/[id]": "H1_HUMAN",
    "DELETE api/content/writing-lab/episodes/[id]": "H1_HUMAN",
    "POST api/content/writing-lab/projects": "H1_HUMAN",
    "PATCH api/content/writing-lab/projects/[id]": "H1_HUMAN",
    "DELETE api/content/writing-lab/projects/[id]": "H1_HUMAN",
    "POST api/content/writing-lab/projects/[id]/blocks": "H1_HUMAN",
    "PUT api/content/writing-lab/projects/[id]/blocks": "H1_HUMAN",
    "POST api/content/writing-lab/seed": "H1_HUMAN",
    "POST api/content/writing-desk/drafts": "H1_HUMAN",
    "PATCH api/content/writing-desk/drafts/[id]": "H1_HUMAN",
    "DELETE api/content/writing-desk/drafts/[id]": "H1_HUMAN",
    "POST api/content/writing-desk/review": "H1_HUMAN",
    "POST api/prompt-templates": "H1_HUMAN",
    "PATCH api/prompt-templates/[id]": "H1_HUMAN",
    "DELETE api/prompt-templates/[id]": "H1_HUMAN",
    "POST api/prompt-templates/[id]/versions": "H1_HUMAN",
    "PATCH api/prompt-templates/[id]/versions/[versionId]": "H1_HUMAN",
    "DELETE api/prompt-templates/[id]/versions/[versionId]": "H1_HUMAN",
    "POST api/prompt-workflows": "H1_HUMAN",
    "PATCH api/prompt-workflows/[id]": "H1_HUMAN",
    "DELETE api/prompt-workflows/[id]": "H1_HUMAN",
    "POST api/prompt-workflows/[id]/steps": "H1_HUMAN",
    "PATCH api/prompt-workflows/[id]/steps/[stepId]": "H1_HUMAN",
    "DELETE api/prompt-workflows/[id]/steps/[stepId]": "H1_HUMAN",
    "POST api/prompt-run-logs": "H1_HUMAN",
    "PATCH api/prompt-run-logs": "H1_HUMAN",
    "POST api/arbor-inbox": "H1_HUMAN",
    "POST api/content/package": "H1_HUMAN",
    "POST api/projects/[slug]/doc-blocks": "H1_HUMAN",
    "PATCH api/projects/[slug]/doc-blocks/[blockId]": "H1_HUMAN",
    "POST api/projects/[slug]/doc-blocks/[blockId]/archive": "H1_HUMAN",
    "POST api/projects/[slug]/doc-blocks/[blockId]/restore": "H1_HUMAN",
    "POST api/projects/[slug]/decisions": "H1_HUMAN",
    "DELETE api/projects/[slug]/decisions": "H1_HUMAN",
    "POST api/projects/[slug]/loops": "H1_HUMAN",
    "PATCH api/projects/[slug]/loops": "H1_HUMAN",
    "POST api/projects/[slug]/loops/gates": "H1_HUMAN",
    "POST api/projects/[slug]/context": "H1_HUMAN",
};
