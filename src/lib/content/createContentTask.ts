import { CONTENT_TEMPLATES, STAGE_TAGS } from "./templates";
import { listDocsByTaskId } from "./utils";

type Doc = { id: string; title: string };

/**
 * Client-side orchestration to create a Content Task + 3 standard Docs.
 * 
 * Flow:
 * 1. Create Task (workspace='content', tags=['content', 'stage:script'])
 * 2. Create 3 Docs (Brief, Script, Storyboard) with prefix [task:ID]
 * 3. Handle partial failures (idempotent retry)
 */
export async function createContentTask(title: string): Promise<{ taskId: string; docs: Doc[]; errors: string[] }> {
    const errors: string[] = [];

    // 1. Create Task
    let taskId = "";
    try {
        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                workspace: "content",
                tags: ["content", "stage:script"], // Lock F3
                status: "inbox"
            })
        });

        if (!res.ok) throw new Error("Failed to create task");
        const json = await res.json();
        taskId = json.task.id;
    } catch (e) {
        throw new Error(`Task creation failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!taskId) throw new Error("No Task ID returned");

    // 2. Create Docs (Orchestrated)
    // We reuse the logic for "create missing docs" to keep it DRY
    const docs = await createMissingContentDocs(taskId, title);

    return { taskId, docs, errors };
    // Note: createMissingContentDocs handles internal errors/partial successes logic 
    // but here we just return what we have. 
    // If docs.length < 3, the UI should show the "Retry" state.
}

/**
 * Check which standard templates are missing for a task and create them.
 * Identification based on "00-Brief", "01-Script", "02-Storyboard" markers in title.
 */
export async function createMissingContentDocs(taskId: string, taskTitle: string): Promise<Doc[]> {
    // 1. Fetch existing docs to check what's missing
    // We assume the caller might want to refresh this list, but we can't easily fetch ALL docs here efficiently if listing is heavy.
    // Ideally, we search by query if API supports it, or we fetch all. 
    // For now, assuming relatively small doc count or efficient list endpoint.
    // If /api/docs supports filtering, great. If not, we fetch all (WorkOS-Lite scale).

    let existingDocs: Doc[] = [];
    try {
        const res = await fetch("/api/docs"); // Get all docs
        if (res.ok) {
            const json = await res.json();
            existingDocs = json.docs || [];
        }
    } catch (e) {
        console.error("Failed to list docs:", e);
        // If list fails, we might be blind. We shouldn't recklessly create duplicates.
        // But for "createContentTask" (fresh), we know there are none.
        // For "Retry", we really need to know.
        // If we can't list, we assume empty? No, better safe -> throw or return empty.
        return [];
    }

    const linkedDocs = listDocsByTaskId(existingDocs, taskId);

    const createdDocs: Doc[] = [...linkedDocs];

    // Templates to ensure
    const templates = [
        { code: "00-Brief", content: CONTENT_TEMPLATES.BRIEF },
        { code: "01-Script", content: CONTENT_TEMPLATES.SCRIPT },
        { code: "02-Storyboard", content: CONTENT_TEMPLATES.STORYBOARD },
    ];

    const prefix = `[task:${taskId}]`; // Lock F1

    for (const tpl of templates) {
        // Lock F2: Check if exists (fuzzy check on code marker)
        const exists = linkedDocs.some(d => d.title.includes(tpl.code));

        if (!exists) {
            try {
                // Create it
                const fullTitle = `${prefix} ${tpl.code} — ${taskTitle}`; // Lock F1 + Lock 5 (em dash)
                const res = await fetch("/api/docs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: fullTitle,
                        content: tpl.content
                    })
                });

                if (res.ok) {
                    const json = await res.json();
                    if (json.doc) createdDocs.push(json.doc);
                } else {
                    console.error(`Failed to create ${tpl.code}`);
                }
            } catch (e) {
                console.error(`Error creating ${tpl.code}:`, e);
            }
        }
    }

    return createdDocs;
}
