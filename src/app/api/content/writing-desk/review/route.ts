export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { toErrorMessage } from "@/lib/error";

const ReviewRequestSchema = z.object({
    draft_id: z.string(),
    review_mode: z.string().default('standard'),
});

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const draft_id = url.searchParams.get("draft_id");

        if (!draft_id) {
            return NextResponse.json({ error: "Missing draft_id" }, { status: 400 });
        }

        const latest = getDb().prepare(`
            SELECT * FROM arbor_review_results 
            WHERE draft_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `).get(draft_id);

        return NextResponse.json(latest || null);
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = ReviewRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        const { draft_id, review_mode } = parsed.data;
        
        // Fetch draft to verify existence and get latest state
        const draft = getDb().prepare("SELECT * FROM writing_desk_drafts WHERE id = ?").get(draft_id) as any;
        if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

        const contentType = draft.content_type;
        const id = nanoid();
        const now = new Date().toISOString();
        
        let mockIssues: any[] = [];
        let mockPatches: any[] = [];
        let summary = "";
        let next_step = "";

        if (contentType === 'group_post') {
            mockIssues = [
                { id: 1, type: 'tone', message: 'ความเป็นกันเองทำได้ดี แต่ลองเพิ่มจังหวะชวนคุยหรือตั้งคำถามกับลูกเพจเพิ่มขึ้นอีกนิดครับ', severity: 'low' },
                { id: 2, type: 'structure', message: 'ไม่แข็งเป็นวิชาการจนเกินไป เหมาะกับ Group Post แล้วครับ', severity: 'low' }
            ];
            mockPatches = [
                { id: 1, original: 'นี่คือแนวทางที่ควรทำ', replacement: 'ลองเอาวิธีนี้ไปใช้กันดูนะครับ ได้ผลยังไงมาเล่าให้ฟังด้วยนะ' }
            ];
            summary = "เหมาะสำหรับโพสต์ในกลุ่มครับ มีความเป็นกันเองสูงและย่อยข้อมูลให้อ่านง่าย";
            next_step = "เพิ่ม Call to Action (CTA) ให้สมาชิกมาคอมเมนต์แลกเปลี่ยน";
        } else if (contentType === 'page_post') {
            mockIssues = [
                { id: 1, type: 'hook', message: 'Hook ใน 2 ประโยคแรกยังไม่แรงพอ ลองดึงเอาผลลัพธ์ที่น่าทึ่งที่สุดขึ้นมาไว้บนสุดครับ', severity: 'medium' },
                { id: 2, type: 'brevity', message: 'บางช่วงยังยาวไปนิดนึงสำหรับ Facebook Page ลองตัดประโยคขยายความที่ไม่จำเป็นออก', severity: 'low' }
            ];
            mockPatches = [
                { id: 1, original: 'เรามีการสอนเรื่องการทำเกษตรอินทรีย์ที่มีคุณภาพ', replacement: 'เกษตรอินทรีย์ทำง่าย แถมขายได้ราคา! มาดูวิธีกัน...' }
            ];
            summary = "โครงสร้าง Page Post ดีแล้ว แต่ต้องเน้นเรื่อง Hook และความกระชับมากขึ้น";
            next_step = "ปรับปรุง Hook 3 บรรทัดแรกให้น่าสนใจ";
        } else if (contentType === 'personal_post') {
            mockIssues = [
                { id: 1, type: 'voice', message: 'ยังติดโทนแบรนด์อยู่นิดหน่อย ลองเปลี่ยนมาเล่าในมุมมอง "คุณตั้ม" ให้มากขึ้น', severity: 'medium' },
                { id: 2, type: 'authenticity', message: 'ลองแชร์ประสบการณ์ส่วนตัวหรือความผิดพลาดที่เจอจริง จะทำให้โพสต์ดูจริงใจมากขึ้น', severity: 'low' }
            ];
            summary = "น้ำเสียงยังดูเป็นทางการไปนิดครับ ลองเล่าแบบพี่น้องคุยกัน";
            next_step = "ปรับโทนให้เป็นเสียงส่วนตัวคุณตั้ม (Personal Voice)";
        } else if (contentType === 'web_article_section' || contentType === 'body_markdown') {
            mockIssues = [
                { id: 1, type: 'structure', message: 'Heading (H2/H3) ยังไม่ชัดเจน ลองแบ่งส่วนเนื้อหาให้เป็นระบบมากขึ้น', severity: 'medium' },
                { id: 2, type: 'safety', message: 'มีการอ้างอิงถึงสรรพคุณทางการแพทย์ ควรตรวจสอบความถูกต้องตามหลักวิชาการอีกครั้ง (Claim Safety)', severity: 'high' }
            ];
            mockPatches = [
                { id: 1, original: 'รักษาได้ทุกโรค', replacement: 'มีส่วนช่วยในการบำรุงสุขภาพตามงานวิจัยเบื้องต้น' }
            ];
            summary = "บทความมีความลึก แต่ต้องการการจัดระเบียบโครงสร้างและตรวจสอบเรื่องคำเคลมสุขภาพ";
            next_step = "จัดโครงสร้าง Heading และตรวจสอบความปลอดภัยของข้อมูล (Claim Safety)";
        } else {
            mockIssues = [{ id: 1, type: 'general', message: 'รีวิวในฐานะเนื้อหาทั่วไป กรุณาตรวจสอบความถูกต้องของข้อมูล', severity: 'low' }];
            summary = "รีวิวตามมาตรฐานทั่วไปครับ";
            next_step = "ตรวจสอบความเรียบร้อยก่อนนำไปใช้งาน";
        }

        getDb().prepare(`
            INSERT INTO arbor_review_results (
                id, draft_id, review_mode, review_status, reviewed_content_type, summary,
                issues_json, patches_json, next_step, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            draft_id,
            review_mode,
            'completed',
            contentType,
            summary,
            JSON.stringify(mockIssues),
            JSON.stringify(mockPatches),
            next_step,
            now
        );

        const created = getDb().prepare("SELECT * FROM arbor_review_results WHERE id = ?").get(id);
        return NextResponse.json(created, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
