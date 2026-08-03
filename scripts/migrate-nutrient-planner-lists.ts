import { getDb } from "../src/db/db";

type ListDef = { title: string; slug: string; workspace: string; id: string };

const workspace = "travel";

// ใช้ ID ที่ fix/stable เพื่อตรวจซ้ำแล้วไม่ชน
const lists: ListDef[] = [
  {
    title: "Phase 2 — Fertilizer Logic",
    slug: "phase-2-fertilizer-logic",
    workspace,
    id: "list_phase2_fertilizer_logic",
  },
  {
    title: "Phase 2 — Crop Database & Tomato Research",
    slug: "phase-2-crop-database-tomato-research",
    workspace,
    id: "list_phase2_crop_db_tomato_research",
  },
  {
    title: "Phase 3A — Tomato Home Trial",
    slug: "phase-3a-tomato-home-trial",
    workspace,
    id: "list_phase3a_tomato_home_trial",
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
    `UPDATE tasks SET list_id = ? WHERE workspace = ? AND list_id IS NOT ? AND title LIKE ?`
  );
  const countByList = db.prepare(
    `SELECT COUNT(*) as c FROM tasks WHERE workspace = ? AND list_id = ?`
  );

  db.transaction(() => {
    // ensure lists exist
    for (const l of lists) {
      const row = getList.get(l.workspace, l.slug) as { id: string } | undefined;
      if (!row) {
        insertList.run(l.id, l.workspace, l.slug, l.title);
      }
    }

    // move tasks into correct lists by prefix
    updateListId.run(
      lists[0].id,
      workspace,
      lists[0].id,
      "FL-%"
    );
    updateListId.run(
      lists[1].id,
      workspace,
      lists[1].id,
      "CD-%"
    );
    updateListId.run(
      lists[2].id,
      workspace,
      lists[2].id,
      "%GF-APP-%"
    );
  })();

  console.log("Counts (workspace=travel):");
  for (const l of lists) {
    const row = countByList.get(workspace, l.id) as { c: number };
    console.log(`${l.title}: ${row.c}`);
  }

  console.log("DONE: migrate-nutrient-planner-lists.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
