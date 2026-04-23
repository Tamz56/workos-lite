/* eslint-disable */
const Database = require('better-sqlite3');
const { nanoid } = require('nanoid');

// Relative to project root
const dbPath = './data/workos.db';
const db = new Database(dbPath);

async function migrate() {
    const tasks = db.prepare("SELECT id, title, workspace, notes, list_id FROM tasks WHERE workspace = 'content'").all();
    
    console.log(`Checking ${tasks.length} content tasks...`);
    
    const topicMap = new Map(); // topicId -> listId
    let migratedCount = 0;
    
    for (const task of tasks) {
        // 1. Try to extract ID and Title
        let topicId = null;
        let topicTitle = "Untitled Topic";

        // Try from notes metadata (frontmatter)
        if (task.notes) {
            const idMatch = task.notes.match(/topic_id:\s*([a-zA-Z0-9_-]+)/);
            if (idMatch) topicId = idMatch[1];
            
            const titleMatch = task.notes.match(/topic_title:\s*([^\n\r]+)/);
            if (titleMatch) topicTitle = titleMatch[1].trim();
        }

        // Fallback: Try from title if metadata missing
        if (!topicId) {
            // Match pattern "project:ID"
            const idMatch = task.title.match(/project:([a-zA-Z0-9_-]+)/);
            if (idMatch) {
                topicId = idMatch[1];
                // Extract friendly title from after the "—"
                const titleMatch = task.title.match(/—\s*([^\n\r#]+)/);
                if (titleMatch) topicTitle = titleMatch[1].trim();
            }
        }

        if (!topicId) continue;
        
        // If task already has a list_id, skip or use it as the source of truth for the map
        if (task.list_id) {
            topicMap.set(topicId, task.list_id);
            continue;
        }
        
        let listId = topicMap.get(topicId);
        
        if (!listId) {
            // Try to find if a list already exists for this topic
            const existingList = db.prepare("SELECT id FROM lists WHERE workspace = 'content' AND title LIKE ?").get(`${topicId} — %`);
            
            if (existingList) {
                listId = existingList.id;
            } else {
                // Create new list
                const listTitle = `${topicId} — ${topicTitle}`;
                const newId = nanoid();
                const slug = topicId.toLowerCase() + "-" + nanoid(4);
                
                console.log(`Creating list: ${listTitle}`);
                db.prepare(`
                    INSERT INTO lists (id, workspace, slug, title, created_at, updated_at)
                    VALUES (?, 'content', ?, ?, datetime('now'), datetime('now'))
                `).run(newId, slug, listTitle);
                
                listId = newId;
            }
            topicMap.set(topicId, listId);
        }
        
        // Update task
        db.prepare("UPDATE tasks SET list_id = ? WHERE id = ?").run(listId, task.id);
        migratedCount++;
    }
    
    console.log(`Migration complete. ${migratedCount} tasks updated.`);
}

migrate().catch(console.error);
