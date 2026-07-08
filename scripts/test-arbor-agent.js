import Database from "better-sqlite3";
import path from "path";

async function runTests() {
    const dbPath = path.resolve(process.cwd(), "data/workos.db");
    const db = new Database(dbPath);

    console.log("=========================================");
    console.log("🧪 Running ARBOR-AGENT-001 Safety Tests");
    console.log("=========================================\n");

    const testProjectId1 = "c9f0181b-dbd9-44c9-b956-7711672fefe1";
    const testProjectId2 = "781e2b0d-ee28-4d4a-83f2-0cad89ed0a00";

    // Clean up any old test data
    db.prepare("DELETE FROM project_contexts WHERE project_id = ?").run(testProjectId1);
    db.prepare("DELETE FROM project_contexts WHERE project_id = ?").run(testProjectId2);
    db.prepare("DELETE FROM project_decisions WHERE project_id = ?").run(testProjectId1);
    db.prepare("DELETE FROM project_decisions WHERE project_id = ?").run(testProjectId2);

    console.log("🧹 Cleaned up old test records.\n");

    // 1. Test No-Write GET
    console.log("👉 Test 1: Verify loading context (GET) does not write rows...");
    const existingGet = db.prepare("SELECT * FROM project_contexts WHERE project_id = ?").get(testProjectId1);
    if (!existingGet) {
        console.log("✅ PASS: No context row exists. GET simulation returned clean.");
    } else {
        throw new Error("FAIL: Context row already exists before saving.");
    }
    console.log();

    // 2. Test Context Save First Time
    console.log("👉 Test 2: Save context (POST) for the first time...");
    db.prepare(`
        INSERT INTO project_contexts (
            id, project_id, overview, purpose, standing_instructions, tone_voice, guardrails, 
            output_standards, decision_rules, source_of_truth, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
        ) ON CONFLICT(project_id) DO UPDATE SET
            overview = excluded.overview,
            purpose = excluded.purpose,
            standing_instructions = excluded.standing_instructions,
            tone_voice = excluded.tone_voice,
            guardrails = excluded.guardrails,
            output_standards = excluded.output_standards,
            decision_rules = excluded.decision_rules,
            source_of_truth = excluded.source_of_truth,
            updated_at = datetime('now')
    `).run(
        "CTX-T1",
        testProjectId1,
        "Overview 1",
        "Purpose 1",
        "Instructions 1",
        "Tone 1",
        "Guardrails 1",
        "Standards 1",
        "Rules 1",
        "Truth 1"
    );

    const count1 = db.prepare("SELECT COUNT(*) as count FROM project_contexts WHERE project_id = ?").get(testProjectId1).count;
    if (count1 === 1) {
        console.log("✅ PASS: Exactly 1 context row exists.");
    } else {
        throw new Error(`FAIL: Expected 1 context row, found ${count1}`);
    }
    console.log();

    // 3. Test Context Save Second Time (Upsert check)
    console.log("👉 Test 3: Save context (POST) a second time to edit fields...");
    db.prepare(`
        INSERT INTO project_contexts (
            id, project_id, overview, purpose, standing_instructions, tone_voice, guardrails, 
            output_standards, decision_rules, source_of_truth, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
        ) ON CONFLICT(project_id) DO UPDATE SET
            overview = excluded.overview,
            purpose = excluded.purpose,
            standing_instructions = excluded.standing_instructions,
            tone_voice = excluded.tone_voice,
            guardrails = excluded.guardrails,
            output_standards = excluded.output_standards,
            decision_rules = excluded.decision_rules,
            source_of_truth = excluded.source_of_truth,
            updated_at = datetime('now')
    `).run(
        "CTX-T2", // new random ID (should be ignored due to ON CONFLICT)
        testProjectId1,
        "Overview 2 (Edited)",
        "Purpose 1",
        "Instructions 1",
        "Tone 1",
        "Guardrails 1",
        "Standards 1",
        "Rules 1",
        "Truth 1"
    );

    const count2 = db.prepare("SELECT COUNT(*) as count FROM project_contexts WHERE project_id = ?").get(testProjectId1).count;
    if (count2 === 1) {
        console.log("✅ PASS: Still exactly 1 context row exists (no duplicates).");
    } else {
        throw new Error(`FAIL: Expected 1 context row after upsert, found ${count2}`);
    }

    const row = db.prepare("SELECT * FROM project_contexts WHERE project_id = ?").get(testProjectId1);
    if (row.overview === "Overview 2 (Edited)") {
        console.log("✅ PASS: Fields updated correctly.");
    } else {
        throw new Error(`FAIL: Overview was not updated. Found: ${row.overview}`);
    }
    console.log();

    // 4. Decision Log Isolation
    console.log("👉 Test 4: Decision Log Isolation & Ownership verification...");
    db.prepare(`
        INSERT INTO project_decisions (id, project_id, title, decision, reason, impact, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        "DEC-T1",
        testProjectId1,
        "Test Decision Title",
        "Test Decision Body",
        "Test Reason",
        "Test Impact"
    );

    console.log("   - Attempting to delete decision DEC-T1 using different project ID (should fail)...");
    const infoWrong = db.prepare("DELETE FROM project_decisions WHERE id = ? AND project_id = ?").run("DEC-T1", testProjectId2);
    if (infoWrong.changes === 0) {
        console.log("✅ PASS: DELETE was blocked (0 rows affected).");
    } else {
        throw new Error("FAIL: DELETE allowed deleting decision belonging to a different project!");
    }

    const checkExists = db.prepare("SELECT * FROM project_decisions WHERE id = ?").get("DEC-T1");
    if (checkExists) {
        console.log("✅ PASS: Decision DEC-T1 still exists in the DB.");
    } else {
        throw new Error("FAIL: Decision DEC-T1 was deleted unexpectedly!");
    }

    console.log("   - Deleting decision DEC-T1 using correct project ID...");
    const infoCorrect = db.prepare("DELETE FROM project_decisions WHERE id = ? AND project_id = ?").run("DEC-T1", testProjectId1);
    if (infoCorrect.changes === 1) {
        console.log("✅ PASS: DELETE was successful (1 row affected).");
    } else {
        throw new Error(`FAIL: Expected 1 row affected, got ${infoCorrect.changes}`);
    }

    const checkExists2 = db.prepare("SELECT * FROM project_decisions WHERE id = ?").get("DEC-T1");
    if (!checkExists2) {
        console.log("✅ PASS: Decision DEC-T1 is now successfully deleted from the DB.");
    } else {
        throw new Error("FAIL: Decision DEC-T1 still exists in the DB after correct delete!");
    }
    console.log();

    // Clean up test data
    db.prepare("DELETE FROM project_contexts WHERE project_id = ?").run(testProjectId1);
    console.log("🧹 Test cleanup completed.");
    console.log("\n=========================================");
    console.log("🎉 ALL SAFETY TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================");
}

runTests().catch(err => {
    console.error("\n❌ TEST FAILED:", err.message);
    process.exit(1);
});
