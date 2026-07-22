import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { INVALID_CAPACITY_WARNING_PREFIX, parseSchedule } from "@/lib/planner-import/parser";
import { ImportPreview } from "@/lib/planner-import/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const rawText = body.raw_text;
        if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อความตารางงานก่อนดูตัวอย่าง" },
                { status: 400 }
            );
        }

        const parsedSchedule = parseSchedule(rawText);
        if (parsedSchedule.days.length === 0) {
            return NextResponse.json(
                { error: "ไม่พบวันปฏิบัติงานที่ถูกต้องในข้อความตารางงาน" },
                { status: 400 }
            );
        }
        if (parsedSchedule.total_tasks === 0) {
            return NextResponse.json(
                { error: "ไม่พบงานในวันปฏิบัติงาน กรุณาเพิ่มงานอย่างน้อยหนึ่งรายการ" },
                { status: 400 }
            );
        }

        const invalidMetadataWarnings = parsedSchedule.warnings.filter(warning =>
            warning.startsWith(INVALID_CAPACITY_WARNING_PREFIX)
        );
        if (invalidMetadataWarnings.length > 0) {
            return NextResponse.json(
                { error: "Daily Capacity Minutes ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป", warnings: invalidMetadataWarnings },
                { status: 400 }
            );
        }

        const db = getDb();

        let projectId: string | null = body.project_id || null;
        let projectSlug: string | null = body.project_slug || null;

        if (!projectId && projectSlug) {
            const row = db
                .prepare("SELECT id, slug FROM projects WHERE slug = ?")
                .get(projectSlug) as { id: string; slug: string } | undefined;
            if (row) {
                projectId = row.id;
                projectSlug = row.slug;
            }
        } else if (projectId) {
            const row = db
                .prepare("SELECT id, slug FROM projects WHERE id = ?")
                .get(projectId) as { id: string; slug: string } | undefined;
            if (row) {
                projectSlug = row.slug;
            } else {
                projectId = null;
            }
        }

        const unresolvedWarnings: string[] = [...parsedSchedule.warnings];
        const blockingWarnings: string[] = [];
        let unresolvedRangeCount = 0;

        let totalProjectItems = 0;
        let totalPlannerItems = 0;

        for (const day of parsedSchedule.days) {
            if (day.is_date_range) {
                unresolvedRangeCount++;
                blockingWarnings.push(`ช่วงวันที่ "${day.date_text}" ต้องระบุวันที่จริงก่อนนำเข้า`);
            }
            if (!day.parsed_date) {
                const warning = `วัน "${day.date_text}" ไม่มีวันที่ YYYY-MM-DD ที่ถูกต้อง`;
                unresolvedWarnings.push(warning);
                blockingWarnings.push(warning);
            }
            totalProjectItems += day.tasks.length;
            // Every project item becomes a planner item for that day
            totalPlannerItems += day.tasks.length;
        }

        const preview: ImportPreview = {
            schedule: parsedSchedule,
            project_id: projectId,
            project_slug: projectSlug,
            unresolved_warnings: unresolvedWarnings,
            blocking_warnings: blockingWarnings,
            stats: {
                days_count: parsedSchedule.days.length,
                project_items_count: totalProjectItems,
                planner_items_count: totalPlannerItems,
                unresolved_range_count: unresolvedRangeCount,
                blocking_warning_count: blockingWarnings.length
            }
        };

        return NextResponse.json(preview);
    } catch (err: unknown) {
        console.error("Planner import preview error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to generate preview" },
            { status: 500 }
        );
    }
}
