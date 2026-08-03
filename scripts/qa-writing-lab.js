import Database from "better-sqlite3";
import path from "path";

async function main() {
    const dbPath = path.resolve(process.cwd(), "data/workos.db");
    const db = new Database(dbPath);

    console.log("=========================================");
    console.log("🔍 Running QA Check: Arbor Writing Lab");
    console.log("=========================================\n");

    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    // 1. Info: Episode exists but has no linked writing project
    const orphanEpisodes = db.prepare(`
        SELECT id, title, status 
        FROM gf_episodes e 
        WHERE NOT EXISTS (
            SELECT 1 FROM gf_writing_projects p WHERE p.episode_id = e.id
        )
    `).all();

    if (orphanEpisodes.length > 0) {
        console.log(`💡 [INFO] Episodes without linked writing projects (Not started) (${orphanEpisodes.length}):`);
        orphanEpisodes.forEach(ep => {
            console.log(`   - ID: ${ep.id} | Title: "${ep.title}" | Status: ${ep.status}`);
            infoCount++;
        });
        console.log("");
    } else {
        console.log("✅ [PASS] All episodes have linked writing projects.\n");
    }

    // 2. Error: Writing project exists but references nonexistent episode
    const orphanProjects = db.prepare(`
        SELECT id, title, episode_id, status 
        FROM gf_writing_projects p 
        WHERE p.episode_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM gf_episodes e WHERE e.id = p.episode_id
        )
    `).all();

    if (orphanProjects.length > 0) {
        console.log(`❌ [ERROR] Writing projects referencing missing/nonexistent episodes (${orphanProjects.length}):`);
        orphanProjects.forEach(p => {
            console.log(`   - ID: ${p.id} | Title: "${p.title}" | References Episode ID: ${p.episode_id} | Status: ${p.status}`);
            errorCount++;
        });
        console.log("");
    } else {
        console.log("✅ [PASS] No writing projects reference nonexistent episodes.\n");
    }

    // 3. Warning: Title mismatches between episode and project
    const titleMismatches = db.prepare(`
        SELECT e.id AS ep_id, e.title AS ep_title, p.id AS p_id, p.title AS p_title 
        FROM gf_episodes e 
        JOIN gf_writing_projects p ON p.episode_id = e.id 
        WHERE e.title != p.title
    `).all();

    if (titleMismatches.length > 0) {
        console.log(`⚠️ [WARNING] Title mismatches between episodes and linked projects (${titleMismatches.length}):`);
        titleMismatches.forEach(m => {
            console.log(`   - Episode [${m.ep_id}]: "${m.ep_title}"`);
            console.log(`     Project [${m.p_id}]: "${m.p_title}"`);
            warningCount++;
        });
        console.log("");
    } else {
        console.log("✅ [PASS] All episode titles match their linked writing projects.\n");
    }

    // 4. Summary of statuses (Active vs Archived)
    const epSummary = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM gf_episodes 
        GROUP BY status
    `).all();

    const projSummary = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM gf_writing_projects 
        GROUP BY status
    `).all();

    console.log("📊 Database Records Summary:");
    console.log("   Episodes by status:");
    epSummary.forEach(row => {
        console.log(`     - ${row.status}: ${row.count}`);
    });
    console.log("   Writing Projects by status:");
    projSummary.forEach(row => {
        console.log(`     - ${row.status}: ${row.count}`);
    });
    console.log("");

    console.log("=========================================");
    console.log(`QA Result: ${errorCount} Errors, ${warningCount} Warnings, ${infoCount} Infos.`);
    console.log("=========================================");
}

main().catch(err => {
    console.error("QA Script execution failed:", err);
    process.exit(1);
});
