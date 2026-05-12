export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { toErrorMessage } from "@/lib/error";

// --- HEURISTICS START ---
function hasPlaceholder(text: string): boolean {
    const placeholders = ["HOOK TEST", "TEST 123", "TODO", "placeholder", "Lorem", "[ใส่ลิงก์บทความ]", "[ใส่", "xxx"];
    const lower = text.toLowerCase();
    return placeholders.some(p => lower.includes(p.toLowerCase()));
}

function getFirstLines(text: string, count: number): string {
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, count).join(' ');
}

function hasStrongHook(text: string): boolean {
    const opening = getFirstLines(text, 3);
    const hasQuestionOrObservation = opening.includes('?') || opening.includes('ทำไม') || opening.includes('อย่างไร') || opening.includes('รู้หรือไม่') || opening.includes('สังเกต');
    const topicKeywords = ['ไนโตรเจน', 'พืช', 'ปุ๋ย', 'ผลผลิต', 'ดิน', 'น้ำ', 'ใบ', 'ต้น', 'ราก', 'โรค', 'แมลง'];
    const hasTopicKeywords = topicKeywords.some(k => opening.includes(k));
    const lengthIsDecent = opening.length > 20;
    return hasQuestionOrObservation && hasTopicKeywords && lengthIsDecent;
}

function hasCTA(text: string, contentType?: string): boolean {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return false;
    
    // Inspect only the tail (last 10 non-empty lines)
    const tailLines = lines.slice(-10).join(' ');
    
    if (contentType === 'page_post') {
        const hasUrl = tailLines.includes('greenfineness.com/library/');
        const hasArticleBridge = tailLines.includes('อ่านบทความเต็ม') || tailLines.includes('ในบทความเต็ม');
        
        // Specific closing insight patterns (avoid generic single words)
        const hasSpecificInsight = 
            (tailLines.includes('การเข้าใจ') && tailLines.includes('จึงไม่ใช่แค่')) ||
            tailLines.includes('ควรมองร่วมกับ') ||
            tailLines.includes('จึงไม่ใช่เรื่องของ') ||
            tailLines.includes('แต่เป็นเรื่องของ') ||
            tailLines.includes('ก่อนจะกลายเป็น');
        
        return hasUrl || hasArticleBridge || hasSpecificInsight;
    }
    
    // Default / Group Post logic (tail-based)
    // Avoid false positives by requiring common community keywords or a question mark near the very end
    const communityKeywords = ['คอมเมนต์', 'คิดว่า', 'เคยเจอ', 'ลองเล่า', 'แบ่งปัน'];
    const hasCommunityKeyword = communityKeywords.some(k => tailLines.includes(k));
    
    // Restrict question mark checks to the very last 3 lines to avoid matching H3 headings in the middle of the tail
    const veryTailLines = lines.slice(-3).join(' ');
    const hasQuestion = veryTailLines.includes('?') || veryTailLines.includes('ครับไหม') || veryTailLines.includes('ไหมครับ') || veryTailLines.includes('มั้ยครับ');
    
    const hasBridge = tailLines.includes('อ่านบทความเต็ม') || tailLines.includes('ในบทความเต็ม');
    
    return hasQuestion || hasCommunityKeyword || hasBridge;
}
// --- HEURISTICS END ---

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
        const contentText = draft.body || "";
        
        const id = nanoid();
        const now = new Date().toISOString();
        
        const structured: any = {
            reviewedContentType: contentType,
            editorialSummary: "",
            contentStrength: [],
            revisionPoints: [],
            claimSafetyNotes: [],
            toneNotes: [],
            recommendedNextEdit: "",
            suggestedRevision: ""
        };

        const isPlaceholder = hasPlaceholder(contentText);

        if (contentType === 'group_post') {
            const hasCta = hasCTA(contentText, contentType);
            structured.editorialSummary = "เหมาะสำหรับโพสต์ในกลุ่มครับ มีความเป็นกันเองสูงและย่อยข้อมูลให้อ่านง่าย";
            structured.contentStrength = ["ความเป็นกันเองทำได้ดี", "ไม่แข็งเป็นวิชาการจนเกินไป", "ย่อยข้อมูลให้เข้าใจง่ายสำหรับคนทั่วไป"];
            
            structured.revisionPoints = ["เพิ่มช่องว่างระหว่างย่อหน้าให้อ่านง่ายขึ้น"];
            
            if (!hasCta) {
                structured.revisionPoints.unshift("ลองเพิ่มจังหวะชวนคุยหรือตั้งคำถามกับลูกเพจเพิ่มขึ้นอีกนิด");
                structured.revisionPoints.push("เพิ่ม Call to Action (CTA) หรือคำถามปิดท้ายชวนคุย");
                structured.recommendedNextEdit = "เพิ่ม Call to Action (CTA) ให้สมาชิกมาคอมเมนต์แลกเปลี่ยน";
            } else {
                structured.recommendedNextEdit = "ตรวจความกระชับของย่อหน้า และเตรียมส่งต่อไปยัง WorkOS Task";
            }
            
            structured.claimSafetyNotes = ["ข้อมูลทั่วไป ปลอดภัยสำหรับการโพสต์"];
            structured.toneNotes = ["Conversational", "Friendly", "Community-focused"];
        } else if (contentType === 'page_post') {
            const strongHook = hasStrongHook(contentText);
            if (strongHook && !isPlaceholder) {
                structured.editorialSummary = "โครงสร้าง Page Post ดีครับ Hook เปิดประเด็นได้ชัดขึ้น";
                structured.contentStrength = ["Hook เปิดประเด็นได้ชัดขึ้น", "เนื้อหามีความน่าสนใจ", "Brand Voice ชัดเจน"];
                structured.revisionPoints = ["ลดความซ้ำในย่อหน้าถัดไป"];
                if (!hasCTA(contentText, contentType)) {
                    structured.revisionPoints.push("เพิ่ม CTA ถ้ายังไม่มี");
                }
                structured.recommendedNextEdit = "ปรับปรุงเนื้อหาส่วนกลางและตรวจสอบความเรียบร้อย";
            } else {
                structured.editorialSummary = "โครงสร้าง Page Post ดีแล้ว แต่ต้องเน้นเรื่อง Hook และความกระชับมากขึ้น";
                structured.contentStrength = ["เนื้อหามีความน่าสนใจ", "Brand Voice ชัดเจน"];
                structured.revisionPoints = ["Hook ใน 2 ประโยคแรกยังไม่แรงพอ", "ตัดประโยคขยายความที่ไม่จำเป็นออกเพื่อให้กระชับขึ้น"];
                structured.recommendedNextEdit = "ปรับปรุง Hook 3 บรรทัดแรกให้น่าสนใจและดึงดูดสายตา";
            }
            structured.claimSafetyNotes = ["ตรวจสอบคำโฆษณาเกินจริง (ถ้ามี)"];
            structured.toneNotes = ["Professional yet accessible", "Impactful", "Brand-aligned"];
        } else if (contentType === 'personal_post') {
            structured.editorialSummary = "น้ำเสียงยังดูเป็นทางการไปนิดครับ ลองเล่าแบบพี่น้องคุยกัน";
            structured.contentStrength = ["หัวข้อเรื่องน่าสนใจ", "มีความเป็นมนุษย์"];
            structured.revisionPoints = ["ยังติดโทนแบรนด์อยู่บ้าง ลองเปลี่ยนมาเล่าในมุมมองคุณตั้มให้มากขึ้น", "แชร์ประสบการณ์ส่วนตัวหรือความผิดพลาดที่เจอจริง"];
            structured.claimSafetyNotes = ["ข้อมูลส่วนบุคคล ปลอดภัย"];
            structured.toneNotes = ["Sincere", "Authentic", "Personal"];
            structured.recommendedNextEdit = "ปรับโทนให้เป็นเสียงส่วนตัวคุณตั้ม (Personal Voice) และเล่าเรื่องแบบ Storytelling";
        } else if (contentType === 'web_article_section' || contentType === 'body_markdown') {
            structured.editorialSummary = "บทความมีความลึก แต่ต้องการการจัดระเบียบโครงสร้างและตรวจสอบเรื่องคำเคลมทางวิชาการ/เกษตร";
            structured.contentStrength = ["ข้อมูลแน่นและลึก", "มีประโยชน์ต่อผู้อ่านที่ต้องการความรู้"];
            structured.revisionPoints = ["Heading (H2/H3) ยังไม่ชัดเจน", "จัดลำดับการอธิบายให้เป็นระบบมากขึ้น"];
            structured.claimSafetyNotes = ["มีการอ้างอิงถึงสรรพคุณเฉพาะทาง ควรตรวจสอบความถูกต้องตามหลักวิชาการ/เกษตร (Claim Safety)", "ตรวจสอบแหล่งอ้างอิงของข้อมูล"];
            structured.toneNotes = ["Educational", "Authoritative", "Safe"];
            structured.recommendedNextEdit = "จัดโครงสร้าง Heading ใหม่ และตรวจสอบความถูกต้องของข้อมูลทางวิชาการ (Claim Safety)";
        } else {
            structured.editorialSummary = "รีวิวตามมาตรฐานทั่วไปครับ";
            structured.contentStrength = ["เนื้อหาครบถ้วน"];
            structured.recommendedNextEdit = "ตรวจสอบความเรียบร้อยก่อนนำไปใช้งาน";
        }

        if (isPlaceholder) {
            structured.editorialSummary = `🚨 พบข้อความทดสอบหรือ Placeholder ในเนื้อหา\n${structured.editorialSummary}`;
            structured.revisionPoints.unshift("ลบข้อความทดสอบ (TODO, Lorem, xxx, หรือวงเล็บต่างๆ) ก่อนนำไปใช้งานจริง");
            structured.recommendedNextEdit = "ลบข้อความทดสอบและ Placeholder ออกก่อน";
            structured.suggestedRevision = "กรุณาลบข้อความทดสอบหรือ Placeholder (เช่น [ใส่ลิงก์], TODO, xxx, HOOK TEST) ออกจากเนื้อหาก่อนนำไปใช้งานจริง เพื่อให้ข้อมูลมีความถูกต้องและเป็นมืออาชีพครับ";
        } else {
            // This is a lightweight heuristic suggestion layer. 
            // Full editorial review should be handled by a future AI review integration.
            if (contentType === 'page_post') {
                const strongHook = hasStrongHook(contentText);
                const hasCta = hasCTA(contentText, contentType);
                if (!strongHook) {
                    structured.suggestedRevision = "ทำไมพืชถึงดูดซึมไนโตรเจนได้ไม่เต็มที่? วันนี้เรามาทำความเข้าใจกลไกการทำงานของดิน เพื่อการเติบโตที่ยั่งยืนของผลผลิตกันครับ";
                } else if (!hasCta) {
                    structured.suggestedRevision = "การเข้าใจไนโตรเจนจึงไม่ใช่แค่การดูว่าพืชได้รับธาตุอาหารพอไหม แต่ควรมองร่วมกับรูปของไนโตรเจน สภาพดิน ความชื้น อินทรียวัตถุ และช่วงการเติบโตของพืชด้วย";
                }
            } else if (contentType === 'group_post') {
                const hasCta = hasCTA(contentText, contentType);
                if (!hasCta) {
                    structured.suggestedRevision = "ถ้าเคยสังเกตว่าพืชตอบสนองต่อไนโตรเจนไม่เหมือนกันในแต่ละแปลง ลองเล่าบริบทของดิน น้ำ อินทรียวัตถุ และช่วงการเติบโตของพืชประกอบกันได้ครับ จะช่วยให้เห็นภาพของระบบดินมากขึ้น";
                }
            }
        }

        console.log("[review:return]", {
            draftId: draft_id,
            content_type: contentType,
            hasCta: hasCTA(contentText, contentType),
            suggestedRevision: structured.suggestedRevision,
            revisionPoints: structured.revisionPoints,
            dbPath: process.env.WORKOS_DB_PATH || "default"
        });

        getDb().prepare(`
            INSERT INTO arbor_review_results (
                id, draft_id, review_mode, review_status, reviewed_content_type, summary,
                next_step, structured_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            draft_id,
            review_mode,
            'completed',
            contentType,
            structured.editorialSummary,
            structured.recommendedNextEdit,
            JSON.stringify(structured),
            now
        );

        const created = getDb().prepare("SELECT * FROM arbor_review_results WHERE id = ?").get(id);
        return NextResponse.json(created, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
