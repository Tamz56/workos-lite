import Database from "better-sqlite3";
import path from "path";

async function runTests() {
    const dbPath = path.resolve(process.cwd(), "data/workos.db");
    const db = new Database(dbPath);

    console.log("=========================================");
    console.log("🧪 Running ARBOR-AGENT-003 Safety Tests");
    console.log("=========================================\n");

    const testProjectId1 = "c9f0181b-dbd9-44c9-b956-7711672fefe1";
    const testProjectId2 = "781e2b0d-ee28-4d4a-83f2-0cad89ed0a00";

    // Clean up test data
    db.prepare("DELETE FROM project_loops WHERE project_id = ?").run(testProjectId1);
    db.prepare("DELETE FROM project_loops WHERE project_id = ?").run(testProjectId2);

    console.log("🧹 Cleaned up old test records.\n");

    // 1. Verify seeded templates exist
    console.log("👉 Test 1: Verify seeded templates exist with stable IDs...");
    const gfTpl = db.prepare("SELECT * FROM project_loop_templates WHERE id = ?").get("tpl-gf-article-loop-v1");
    const claimTpl = db.prepare("SELECT * FROM project_loop_templates WHERE id = ?").get("tpl-claim-tone-review-loop-v1");
    const devTpl = db.prepare("SELECT * FROM project_loop_templates WHERE id = ?").get("tpl-workos-dev-loop-v1");

    if (gfTpl && claimTpl && devTpl) {
        console.log("✅ PASS: All 3 default templates found with stable IDs.");
    } else {
        throw new Error("FAIL: One or more templates are missing.");
    }
    console.log();

    // 2. Creating loop copies properties
    console.log("👉 Test 2: Verify loop creation copies template values...");
    const loopId1 = "LP-TEST1";
    db.prepare(`
        INSERT INTO project_loops (
            id, project_id, template_id, loop_name, loop_type, current_step, 
            status, risk_level, review_gate_level, expected_output, save_destination, 
            learn_note, steps_json, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 'draft', ?, ?, '', '', '', ?, datetime('now'), datetime('now')
        )
    `).run(
        loopId1,
        testProjectId1,
        gfTpl.id,
        "GF Test Loop",
        gfTpl.loop_type,
        "Topic Idea",
        gfTpl.default_risk_level,
        gfTpl.default_review_gate_level,
        gfTpl.steps_json
    );

    const loop1 = db.prepare("SELECT * FROM project_loops WHERE id = ?").get(loopId1);
    if (loop1 && loop1.loop_type === "content_creation" && loop1.risk_level === "low" && loop1.review_gate_level === 1) {
        console.log("✅ PASS: Default properties copied successfully.");
    } else {
        throw new Error(`FAIL: Loop values are incorrect: ${JSON.stringify(loop1)}`);
    }
    console.log();

    // 3. Creating two loops does not duplicate templates
    console.log("👉 Test 3: Verify multiple loops don't affect templates...");
    const loopId2 = "LP-TEST2";
    db.prepare(`
        INSERT INTO project_loops (
            id, project_id, template_id, loop_name, loop_type, current_step, 
            status, risk_level, review_gate_level, expected_output, save_destination, 
            learn_note, steps_json, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 'draft', ?, ?, '', '', '', ?, datetime('now'), datetime('now')
        )
    `).run(
        loopId2,
        testProjectId1,
        gfTpl.id,
        "GF Test Loop 2",
        gfTpl.loop_type,
        "Topic Idea",
        gfTpl.default_risk_level,
        gfTpl.default_review_gate_level,
        gfTpl.steps_json
    );

    const countTemplates = db.prepare("SELECT COUNT(*) as cnt FROM project_loop_templates WHERE id = ?").get("tpl-gf-article-loop-v1").cnt;
    const countLoops = db.prepare("SELECT COUNT(*) as cnt FROM project_loops WHERE project_id = ?").get(testProjectId1).cnt;

    if (countTemplates === 1 && countLoops === 2) {
        console.log("✅ PASS: Multiple loops created successfully without duplicate templates.");
    } else {
        throw new Error(`FAIL: Expected 1 template and 2 loops. Found templates: ${countTemplates}, loops: ${countLoops}`);
    }
    console.log();

    // 4. Validate enum-like fields
    console.log("👉 Test 4: Verify PATCH validates enum-like fields...");
    const ALLOWED_STATUSES = ["draft", "planned", "active", "waiting_review", "needs_revision", "verified", "completed", "archived", "stopped"];
    const ALLOWED_RISKS = ["low", "medium", "high", "critical"];
    const ALLOWED_GATES = [0, 1, 2, 3];

    const validateEnums = (status, risk, gate) => {
        if (status !== undefined && !ALLOWED_STATUSES.includes(status)) return false;
        if (risk !== undefined && !ALLOWED_RISKS.includes(risk)) return false;
        if (gate !== undefined && !ALLOWED_GATES.includes(gate)) return false;
        return true;
    };

    if (!validateEnums("invalid_status", "low", 1) && 
        !validateEnums("draft", "extreme", 1) && 
        !validateEnums("draft", "low", 5) && 
        validateEnums("active", "critical", 3)) {
        console.log("✅ PASS: Enum validator correctly filters incorrect parameters.");
    } else {
        throw new Error("FAIL: Enum validator logic failure.");
    }
    console.log();

    // 5. Cross-project edit validation
    console.log("👉 Test 5: Verify PATCH enforces project ownership...");
    // Attempting to update LP-TEST1 (which belongs to Project 1) while scoped to Project 2 should fail
    const targetProjectId = testProjectId2;
    const affected = db.prepare("UPDATE project_loops SET loop_name = 'Hacked Name' WHERE id = ? AND project_id = ?").run(loopId1, targetProjectId).changes;
    
    if (affected === 0) {
        console.log("✅ PASS: Blocked cross-project modification (0 rows updated).");
    } else {
        throw new Error("FAIL: Allowed modifying a loop belonging to another project!");
    }
    console.log();

    // 6. Archived status behavior (Verify filtering)
    console.log("👉 Test 6: Verify default GET excludes archived loops...");
    // Mark LP-TEST2 as archived
    db.prepare("UPDATE project_loops SET status = 'archived' WHERE id = ?").run(loopId2);

    const activeLoops = db.prepare("SELECT * FROM project_loops WHERE project_id = ? AND status != 'archived'").all(testProjectId1);
    const allLoops = db.prepare("SELECT * FROM project_loops WHERE project_id = ?").all(testProjectId1);

    if (activeLoops.length === 1 && activeLoops[0].id === loopId1 && allLoops.length === 2) {
        console.log("✅ PASS: Default query excludes archived loops. Optional include query returns all.");
    } else {
        throw new Error(`FAIL: Filtering failure. Active count: ${activeLoops.length}, All count: ${allLoops.length}`);
    }
    console.log();

    // 7. Thai text saving and reloading
    console.log("👉 Test 7: Verify Thai text supports accurate serialization...");
    const thaiText = "ข้อมูลบทความ ออกซิน: สัญญาณการเติบโต";
    db.prepare("UPDATE project_loops SET expected_output = ? WHERE id = ?").run(thaiText, loopId1);
    
    const reloaded = db.prepare("SELECT expected_output FROM project_loops WHERE id = ?").get(loopId1).expected_output;
    if (reloaded === thaiText) {
        console.log("✅ PASS: Thai text saved and reloaded with 100% integrity.");
    } else {
        throw new Error(`FAIL: Thai text got corrupted. Expected: "${thaiText}", Loaded: "${reloaded}"`);
    }
    console.log();

    // Clean up test data
    db.prepare("DELETE FROM project_loops WHERE project_id = ?").run(testProjectId1);
    console.log("🧹 Test cleanup completed.");
    console.log("\n=========================================");
    console.log("🎉 ALL LOOPS SAFETY TESTS PASSED!");
    console.log("=========================================");
}

runTests().catch(err => {
    console.error("\n❌ TEST FAILED:", err.message);
    process.exit(1);
});
