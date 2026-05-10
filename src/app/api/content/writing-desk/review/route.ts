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
        
        // Fetch draft to verify existence
        const draft = getDb().prepare("SELECT * FROM writing_desk_drafts WHERE id = ?").get(draft_id) as any;
        if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

        // Mock Review Logic
        const id = nanoid();
        const now = new Date().toISOString();
        
        const mockIssues = [
            { id: 1, type: 'clarity', message: 'ประโยคแรกอาจจะยาวไปนิดนึง ลองแบ่งเป็นสองประโยคดูครับ', severity: 'low' },
            { id: 2, type: 'tone', message: 'ใช้คำที่เป็นทางการเกินไปสำหรับ group_post ลองปรับให้เป็นกันเองมากขึ้น', severity: 'medium' },
            { id: 3, type: 'grammar', message: 'พบคำสะกดผิด: "กะเสด" -> "เกษตร"', severity: 'high' }
        ];

        const mockPatches = [
            { id: 1, original: 'การทำกะเสดอินทรีย์เป็นเรื่องดี', replacement: 'การทำเกษตรอินทรีย์เป็นเรื่องที่ดีต่อโลก' },
            { id: 2, original: 'เราควรทำสิ่งนี้ร่วมกันเพื่ออนาคตที่ยั่งยืนของทุกคนในโลกใบนี้', replacement: 'มาร่วมสร้างอนาคตที่ยั่งยืนไปด้วยกันนะครับ' }
        ];

        const summary = "โดยรวมถือว่าทำได้ดีครับ เนื้อหาครอบคลุม แต่ควรปรับปรุงเรื่องความกระชับและโทนเสียงให้เข้ากับกลุ่มเป้าหมายมากขึ้น";
        const next_step = "ปรับโทนเสียงให้เป็นกันเอง (Conversational Tone)";

        getDb().prepare(`
            INSERT INTO arbor_review_results (
                id, draft_id, review_mode, review_status, summary,
                issues_json, patches_json, next_step, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            draft_id,
            review_mode,
            'completed',
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
