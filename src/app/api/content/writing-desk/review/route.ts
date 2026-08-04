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
        } else if (contentType === 'web_article_section' || contentType === 'body_markdown' || contentType === 'narrative_article') {
            // --- Heuristic analysis for body_markdown ---
            const lines = contentText.split('\n');
            const h2Lines = lines.filter((l: string) => l.trim().startsWith('## '));
            const hasHeadings = h2Lines.length > 0;
            const opening = getFirstLines(contentText, 4);

            // Check for weak opening
            const weakOpeningPatterns = ['ในบทความนี้', 'บทความนี้จะ', 'เราจะมาพูดถึง', 'วันนี้เราจะ', 'ในเนื้อหาสี้'];
            const hasWeakOpening = weakOpeningPatterns.some(p => opening.includes(p));

            // Check for risky/absolute claims
            const riskyPhrases = ['100%', 'ทุกกรณี', 'รักษาได้', 'รักษาโรค', 'แน่นอน 100', 'ป้องกันได้ 100', 'ไม่มีผลข้างเคียง', 'เพิ่มผลผลิตได้ถึง', 'ลดโรคได้ถึง'];
            const foundRiskyClaims = riskyPhrases.filter(p => contentText.includes(p));

            // Check for voice/tone violations
            const FORBIDDEN_PHRASES = [
                'พูดง่ายๆ คือ', 'มันคือ', 'มันทำให้', 'มันไม่ได้', 'ไม่ได้แปลว่า',
                'ให้เราเห็นว่า', 'นั่นคือ', 'มองให้ลึกลงไป', 'ง่ายๆ คือ',
                'จะเห็นว่า', 'พูดถึง', 'นั่นก็คือ',
            ];
            const flaggedPhrases = FORBIDDEN_PHRASES.filter(p => contentText.includes(p));

            structured.editorialSummary = hasHeadings && !hasWeakOpening && flaggedPhrases.length === 0
                ? "บทความมีโครงสร้างดีและน้ำเสียงชัดเจน พร้อมสำหรับการตรวจสอบเนื้อหาเชิงลึก"
                : "บทความมีความลึก แต่ยังมีประเด็นที่ต้องปรับก่อน Review ขั้นถัดไป";

            structured.contentStrength = [
                "ข้อมูลแน่นและลึก",
                "มีประโยชน์ต่อผู้อ่านที่ต้องการความรู้",
                ...(hasHeadings && h2Lines.length >= 2 ? ["โครงสร้าง H2/H3 ครบถ้วนแล้ว"] : []),
                ...(!hasWeakOpening ? ["ประโยคเปิดชัดเจน ไม่กว้างเกินไป"] : []),
                ...(flaggedPhrases.length === 0 ? ["น้ำเสียงตรงกับ Green Fineness Voice"] : []),
            ];

            const actualIssues: string[] = [
                ...(!hasHeadings ? ["ยังไม่มี H2/H3 Heading — ควรเพิ่มโครงสร้างบทความ"] : []),
                ...(hasWeakOpening ? ["ประโยคเปิดยังกว้างเกินไป ควรเริ่มด้วย Hook หรือประโยคชี้จุดประสงค์"] : []),
                ...(flaggedPhrases.length > 0 ? [`พบภาษาที่ไม่ตรงกับ Green Fineness Voice: ${flaggedPhrases.slice(0, 3).join(', ')}`] : []),
                ...(foundRiskyClaims.length > 0 ? [`พบคำที่มีความเสี่ยงสูง: "${foundRiskyClaims.join('", "')}"`] : []),
            ];
            structured.revisionPoints = actualIssues.length > 0 ? actualIssues : ["ไม่พบปัญหาหลักในรอบนี้"];

            structured.claimSafetyNotes = foundRiskyClaims.length > 0
                ? [`⚠️ พบคำที่มีความเสี่ยง: "${foundRiskyClaims.join('", "')}" — ควรปรับให้อ่อนลง`, "ตรวจสอบแหล่งอ้างอิงของข้อมูล"]
                : ["💡 Reminder: ตรวจสอบแหล่งอ้างอิงของข้อมูลเชิงวิชาการก่อน Publish"];

            structured.toneNotes = ["Educational", "Authoritative", "Safe"];

            if (actualIssues.length === 0) {
                structured.recommendedNextEdit = "✅ ไม่พบปัญหาหลัก — พร้อมสำหรับ Manual Review และ Replace Task Notes ได้เลย";
            } else if (!hasHeadings) {
                structured.recommendedNextEdit = "เพิ่ม H2/H3 Heading ก่อน แล้ว Review ใหม่อีกครั้ง";
            } else if (flaggedPhrases.length > 0) {
                structured.recommendedNextEdit = `แทนที่ภาษา Casual (${flaggedPhrases.slice(0, 2).join(', ')}) แล้ว Review ใหม่`;
            } else {
                structured.recommendedNextEdit = "ตรวจสอบแหล่งอ้างอิงและความถูกต้องของข้อมูลทางวิชาการ";
            }

            if (!hasHeadings || h2Lines.length < 2) {
                structured.suggestedHeadings = `## [ชื่อหัวข้อหลัก — แนะนำให้บอก "ทำไม" หรือ "อะไร"]\n\n### [หัวข้อย่อย 1 — สาเหตุหรือกลไก]\n\n### [หัวข้อย่อย 2 — ผลที่ตามมา]\n\n## [บทสรุปหรือ Takeaway]\n\n### [ข้อควรระวัง / แนวทางปฏิบัติ]`;
            }

            // Suggested Rewrite — only when actual issue detected
            if (hasWeakOpening) {
                const firstContentLine = lines.find((l: string) => l.trim().length > 20 && !l.trim().startsWith('#'));
                const preview = firstContentLine ? firstContentLine.trim().slice(0, 60) : 'เนื้อหาส่วนเปิด';
                structured.suggestedRewrite = `🔁 ประโยคเปิดที่แนะนำ:\n\n"${preview}..." → ลองเริ่มด้วยคำถามที่สร้างความอยากรู้ เช่น:\n\n"ทำไม [ปรากฏการณ์สำคัญ] ถึงเกิดขึ้น? และมันส่งผลต่อ [หัวข้อ] อย่างไร?"`;
            } else if (flaggedPhrases.length > 0) {
                structured.suggestedRewrite = `🔁 ตรวจสอบประโยคที่ใช้ภาษาแบบ Casual เกินไปในบทความ:\n\nเช่น "${flaggedPhrases[0]}" → ลองเปลี่ยนเป็นภาษาที่แม่นยำและเป็น Documentary Voice มากขึ้น`;
            }

            // 3. Claim Safety Suggestions
            if (foundRiskyClaims.length > 0) {
                structured.claimSafetySuggestions = foundRiskyClaims.map(claim => {
                    const safer: Record<string, string> = {
                        '100%': `แทน "100%" ด้วย "ในสภาวะที่เหมาะสม" หรือ "ส่วนใหญ่"`,
                        'รักษาได้': `แทน "รักษาได้" ด้วย "ช่วยลดความรุนแรงของ..." หรือ "ช่วยสนับสนุนการฟื้นตัว"`,
                        'ป้องกันได้ 100': `แทน "ป้องกันได้ 100" ด้วย "ลดความเสี่ยงได้อย่างมีนัยสำคัญ"`,
                    };
                    return safer[claim] || `แทน "${claim}" ด้วยภาษาที่อ่อนลงและมีเงื่อนไขมากขึ้น`;
                });
            } else if (structured.claimSafetyNotes.length > 0) {
                structured.claimSafetySuggestions = [
                    `ตรวจสอบว่ามีประโยคที่ระบุตัวเลขผลผลิตหรืออัตราความสำเร็จโดยไม่มีแหล่งอ้างอิงหรือไม่`,
                    `ภาษาที่ปลอดภัยกว่า: ใช้ "มีแนวโน้ม", "ในสภาวะที่เหมาะสม", "ขึ้นอยู่กับ..." แทนการระบุผลแน่นอน`,
                ];
            }

            // 4. Voice & Tone Suggestions
            if (flaggedPhrases.length > 0) {
                structured.voiceToneSuggestions = flaggedPhrases.map(phrase => {
                    const fixes: Record<string, string> = {
                        'พูดง่ายๆ คือ': `"พูดง่ายๆ คือ" → ลบออก แล้วพูดตรงๆ เลย`,
                        'มันคือ': `"มันคือ" → แทนด้วยชื่อสิ่งนั้นโดยตรง`,
                        'มันทำให้': `"มันทำให้" → แทนด้วยประธานที่ชัดเจน เช่น "ไนโตรเจนทำให้..."`,
                        'นั่นคือ': `"นั่นคือ" → ลบออก แล้วอธิบายต่อเนื่องทันที`,
                        'ไม่ได้แปลว่า': `"ไม่ได้แปลว่า" → ปรับเป็น "แต่ไม่หมายความว่า..."`,
                        'ให้เราเห็นว่า': `"ให้เราเห็นว่า" → แทนด้วย "ผลคือ..." หรือ "ทำให้เห็นว่า..."`,
                        'มองให้ลึกลงไป': `"มองให้ลึกลงไป" → แทนด้วยประโยคที่บอกว่าลึกอย่างไร`,
                    };
                    return fixes[phrase] || `"${phrase}" → ปรับให้เป็นภาษาที่แม่นยำและเป็น Documentary Voice มากขึ้น`;
                });
            }

            // 5. Next Edit Checklist
            structured.nextEditChecklist = [
                ...(!hasHeadings ? ["เพิ่ม H2 และ H3 Headings ให้ครบก่อน"] : []),
                ...(hasWeakOpening ? ["ปรับประโยคเปิดให้เป็น Hook ที่ดึงดูดความสนใจ"] : []),
                ...(flaggedPhrases.length > 0 ? [`แทนที่ภาษา Casual: ${flaggedPhrases.slice(0, 2).join(', ')}`] : []),
                ...(foundRiskyClaims.length > 0 ? ["ตรวจสอบและปรับ Claim ที่มีความเสี่ยงทางวิชาการ"] : []),
                "ตรวจสอบแหล่งอ้างอิงข้อมูลสำคัญ",
                "ตรวจความสม่ำเสมอของ Narrative Style ตลอดบทความ",
            ].slice(0, 5); // Max 5 items
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
