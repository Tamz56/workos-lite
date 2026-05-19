import { getDb } from "../src/db/db";

type ListDef = { title: string; slug: string; workspace: string; id: string };

const workspace = "other";

const lists: ListDef[] = [
  {
    title: "Sprint 0 — Setup & Orientation",
    slug: "sprint-0-setup-orientation",
    workspace,
    id: "list_sprint0_setup_orientation",
  },
  {
    title: "Sprint 1 — BA Foundations",
    slug: "sprint-1-ba-foundations",
    workspace,
    id: "list_sprint1_ba_foundations",
  },
  {
    title: "Sprint 2 — Case Study: Green Fineness / WorkOS",
    slug: "sprint-2-case-study-green-fineness-workos",
    workspace,
    id: "list_sprint2_case_study_green_fineness_workos",
  },
  {
    title: "Sprint 3 — Portfolio & Interview Prep",
    slug: "sprint-3-portfolio-interview-prep",
    workspace,
    id: "list_sprint3_portfolio_interview_prep",
  },
  {
    title: "Archive / Reference",
    slug: "archive-reference",
    workspace,
    id: "list_archive_reference",
  },
];

async function main() {
  const db = getDb();

  const insertList = db.prepare(
    `INSERT INTO lists (id, workspace, slug, title) VALUES (?, ?, ?, ?)`
  );
  const getList = db.prepare(
    `SELECT id FROM lists WHERE workspace = ? AND slug = ?`
  );

  const updateListId = db.prepare(
    `UPDATE tasks SET list_id = ? WHERE id = ?`
  );
  const countByList = db.prepare(
    `SELECT COUNT(*) as c FROM tasks WHERE workspace = ? AND list_id = ?`
  );

  db.transaction(() => {
    // 1. Ensure lists exist
    for (const l of lists) {
      const row = getList.get(l.workspace, l.slug) as { id: string } | undefined;
      if (!row) {
        insertList.run(l.id, l.workspace, l.slug, l.title);
      }
    }

    // 2. Load all tasks in other workspace to classify them safely
    const tasks = db.prepare("SELECT id, title, list_id FROM tasks WHERE workspace = 'other'").all() as any[];
    console.log(`Found ${tasks.length} tasks in '${workspace}' workspace.`);

    for (const t of tasks) {
      const titleLower = t.title.toLowerCase();
      let targetListId = t.list_id;

      // Sprint 0 - Onboarding / Setup
      if (
        titleLower.includes("ba-sprint-000") ||
        titleLower.includes("setup") ||
        titleLower.includes("roadmap") ||
        titleLower.includes("orientation")
      ) {
        targetListId = "list_sprint0_setup_orientation";
      }
      // Sprint 1 - Foundations / Day 1
      else if (
        titleLower.includes("ba-sprint-001") ||
        titleLower.includes("foundation") ||
        titleLower.includes("gathering") ||
        titleLower.includes("user story") ||
        titleLower.includes("stories") ||
        titleLower.includes("acceptance criteria") ||
        titleLower.includes("workflow mapping") ||
        titleLower.includes("stakeholder")
      ) {
        targetListId = "list_sprint1_ba_foundations";
      }
      // Sprint 2 - Case Study
      else if (
        titleLower.includes("case study") ||
        titleLower.includes("green fineness") ||
        titleLower.includes("workos") ||
        titleLower.includes("redesign") ||
        titleLower.includes("analysis")
      ) {
        targetListId = "list_sprint2_case_study_green_fineness_workos";
      }
      // Sprint 3 - Portfolio & Interview
      else if (
        titleLower.includes("portfolio") ||
        titleLower.includes("profile") ||
        titleLower.includes("jd") ||
        titleLower.includes("scope of work") ||
        titleLower.includes("interview") ||
        titleLower.includes("conversation") ||
        titleLower.includes("presentation")
      ) {
        targetListId = "list_sprint3_portfolio_interview_prep";
      }
      // Archive / Reference
      else if (
        titleLower.includes("archive") ||
        titleLower.includes("reference") ||
        titleLower.includes("old note")
      ) {
        targetListId = "list_archive_reference";
      }

      if (targetListId && targetListId !== t.list_id) {
        updateListId.run(targetListId, t.id);
        console.log(`Updated task "${t.title}" -> ${targetListId}`);
      }
    }
  })();

  console.log("Counts (workspace=other):");
  for (const l of lists) {
    const row = countByList.get(workspace, l.id) as { c: number };
    console.log(`${l.title}: ${row.c}`);
  }

  console.log("DONE: migrate-ba-sprint-lists.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
