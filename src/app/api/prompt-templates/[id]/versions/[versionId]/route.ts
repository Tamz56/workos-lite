import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import { db } from "@/db/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; versionId: string }> }
) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { id: promptTemplateId, versionId } = await params;
        const body = await req.json();
        const { is_active, restore } = body;

        // Check if the version exists
        const version = db.prepare("SELECT * FROM prompt_versions WHERE id = ?").get(versionId) as any;
        if (!version) {
            return NextResponse.json({ error: "Version snapshot not found" }, { status: 404 });
        }

        if (is_active === true) {
            // Transaction: mark all versions for this template as inactive, then mark this one active
            const tx = db.transaction(() => {
                db.prepare("UPDATE prompt_versions SET is_active = 0 WHERE prompt_template_id = ?").run(promptTemplateId);
                db.prepare("UPDATE prompt_versions SET is_active = 1 WHERE id = ?").run(versionId);
            });
            tx();
        }

        if (restore === true) {
            // Restore snapshot fields into the active template
            const now = new Date().toISOString();
            db.prepare(`
                UPDATE prompt_templates
                SET purpose = ?,
                    role = ?,
                    context = ?,
                    input_fields = ?,
                    instructions = ?,
                    constraints = ?,
                    output_format = ?,
                    review_checklist = ?,
                    notes = ?,
                    guardrail_preset_ids = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                version.purpose || null,
                version.role || null,
                version.context || null,
                version.input_fields || "[]",
                version.instructions || null,
                version.constraints || null,
                version.output_format || null,
                version.review_checklist || null,
                version.notes || null,
                version.guardrail_preset_ids || "[]",
                now,
                promptTemplateId
            );
        }

        const updatedVersion = db.prepare("SELECT * FROM prompt_versions WHERE id = ?").get(versionId);
        return NextResponse.json(updatedVersion);
    } catch (e) {
        console.error("PATCH /api/prompt-templates/[id]/versions/[versionId] failed:", e);
        return NextResponse.json({ error: "Failed to update version status" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; versionId: string }> }
) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { versionId } = await params;

        // Check if the version exists
        const version = db.prepare("SELECT * FROM prompt_versions WHERE id = ?").get(versionId) as any;
        if (!version) {
            return NextResponse.json({ error: "Version snapshot not found" }, { status: 404 });
        }

        // Guardrail: Do not allow deleting the active version
        if (version.is_active === 1) {
            return NextResponse.json(
                { error: "ไม่สามารถลบเวอร์ชันที่กำลังเปิดใช้งาน (Active Version) อยู่ได้ กรุณาเปลี่ยนเวอร์ชัน Active ไปยังรุ่นอื่นก่อนทำการลบ" },
                { status: 400 }
            );
        }

        db.prepare("DELETE FROM prompt_versions WHERE id = ?").run(versionId);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE /api/prompt-templates/[id]/versions/[versionId] failed:", e);
        return NextResponse.json({ error: "Failed to delete version snapshot" }, { status: 500 });
    }
}
