import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: taskId } = await params;

        // 1. Fetch task
        const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        if (!task.agent_enabled) {
            return NextResponse.json({ error: "Agent is not enabled for this task" }, { status: 400 });
        }

        const now = new Date().toISOString();
        const contentId = task.topic_id || task.id.slice(0, 8);

        // 2. Generate structured template content
        const template = `
# ${contentId} — Agent Draft Output

Generated at: ${now}
Mode: Content Pack Agent
Source note: ${task.source_note_id || "N/A"}
Research note: ${task.research_note_id || "N/A"}

## 1) Group Post Draft
🔥 สรุปประเด็นสำคัญจาก ${contentId} สำหรับโพสต์ลงกลุ่ม!
เนื้อหาส่วนนี้ถูกสร้างโดย Content Pack Agent เพื่อใช้เป็นร่างเบื้องต้น...
- ประเด็นที่ 1: ...
- ประเด็นที่ 2: ...

## 2) Page Post Draft
📢 ประกาศสำคัญ! รายละเอียดเกี่ยวกับ ${task.title}
ร่างโพสต์สำหรับเพจ เน้นการเข้าถึงและความชัดเจน...

## 3) Web Article Outline
🌐 โครงร่างบทความสำหรับเว็บไซต์
1. บทนำ (Introduction)
2. หัวข้อหลัก: วิเคราะห์เจาะลึก ${contentId}
3. สรุปและแนวทางปฏิบัติ

## 4) Visual Brief
🎨 คำแนะนำสำหรับการออกแบบภาพ
- Mood & Tone: เท่, มั่นคง, ทันสมัย
- องค์ประกอบ: ใช้กราฟิกที่สื่อถึง ${task.workspace}
- ข้อความบนภาพ: "${task.title}"

## 5) Review Notes
- [ ] จุดที่ควรตรวจ: ตรวจสอบความถูกต้องของตัวเลขและสถิติ
- [ ] จุดที่อาจต้องเติมข้อมูล: เพิ่มเคสตัวอย่างจริง
- [ ] สิ่งที่ยังไม่มั่นใจ: วันเวลาเปิดตัวที่แน่นอน
`.trim();

        const noteId = nanoid();
        const noteTitle = `${contentId} — Agent Draft Output`;

        // 3. Create Note and Link to Task
        db.transaction(() => {
            // Create Note
            db.prepare(`
                INSERT INTO notes (id, title, content_json, content_html, plain_text, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                noteId, 
                noteTitle, 
                JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: template }] }] }), 
                `<pre>${template}</pre>`, 
                template, 
                now, 
                now
            );

            // Create Link
            db.prepare(`
                INSERT INTO note_links (id, note_id, linked_entity_type, linked_entity_id, created_at)
                VALUES (?, ?, 'task', ?, ?)
            `).run(nanoid(), noteId, taskId, now);

            // 4. Update Task Status and Metadata
            db.prepare(`
                UPDATE tasks 
                SET status = 'review',
                    agent_status = 'success',
                    agent_last_run_at = ?,
                    last_agent_result_note_id = ?,
                    last_agent_error = NULL,
                    updated_at = ?
                WHERE id = ?
            `).run(now, noteId, now, taskId);
        })();

        const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
        return NextResponse.json({ task: updatedTask });
    } catch (e: any) {
        console.error("Agent execution error:", e);
        return NextResponse.json({ error: e.message || "Failed to run agent" }, { status: 500 });
    }
}
