import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/db/db";
import {
    computeImportedTaskFingerprint,
    computeImportFingerprint,
    INVALID_CAPACITY_WARNING_PREFIX,
    parseSchedule
} from "@/lib/planner-import/parser";
import { ImportExecutePayload, ImportExecutionResult, ImportMetadataResult } from "@/lib/planner-import/types";
import {
    PLANNER_SCHEDULED_BLOCKS,
    PLANNER_WORK_MODES,
    type PlannerScheduledBlock,
    type PlannerWorkMode
} from "@/lib/planner/types";

function isPlannerScheduledBlock(value: unknown): value is PlannerScheduledBlock {
    return typeof value === "string" && PLANNER_SCHEDULED_BLOCKS.some(block => block === value);
}

function isPlannerWorkMode(value: unknown): value is PlannerWorkMode {
    return typeof value === "string" && PLANNER_WORK_MODES.some(workMode => workMode === value);
}

function getWorkModeDefaultBlock(workMode: PlannerWorkMode): PlannerScheduledBlock {
    const blockByWorkMode: Record<PlannerWorkMode, PlannerScheduledBlock> = {
        focus: "morning_focus",
        production: "afternoon_production",
        ai_preparation: "pre_ai_preparation",
        ai_execution: "evening_ai",
        review: "morning_focus",
        maintenance: "morning_focus"
    };
    return blockByWorkMode[workMode];
}

export async function POST(req: NextRequest) {
    try {
        const body: ImportExecutePayload = await req.json();

        // 1. Confirm validation
        if (body.confirmed !== true) {
            return NextResponse.json(
                { error: "Execution requires explicit user confirmation (confirmed = true)" },
                { status: 400 }
            );
        }

        const rawText = body.raw_text;
        if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
            return NextResponse.json(
                { error: "raw_text is required for server-side revalidation" },
                { status: 400 }
            );
        }

        const projectId = body.project_id;
        if (!projectId || typeof projectId !== "string") {
            return NextResponse.json(
                { error: "project_id is required" },
                { status: 400 }
            );
        }

        if (body.conflict_policy !== "append" && body.conflict_policy !== "skip") {
            return NextResponse.json(
                { error: "conflict_policy ต้องเป็น append หรือ skip เท่านั้น" },
                { status: 400 }
            );
        }

        if (body.default_scheduled_block !== undefined && !isPlannerScheduledBlock(body.default_scheduled_block)) {
            return NextResponse.json(
                { error: "default_scheduled_block ไม่ตรงกับ Work Block ที่ Planner รองรับ" },
                { status: 400 }
            );
        }

        if (body.default_work_mode !== undefined && !isPlannerWorkMode(body.default_work_mode)) {
            return NextResponse.json(
                { error: "default_work_mode ไม่ตรงกับ Work Mode ที่ Planner รองรับ" },
                { status: 400 }
            );
        }

        if (
            body.daily_capacity_minutes != null &&
            (!Number.isSafeInteger(body.daily_capacity_minutes) || body.daily_capacity_minutes < 0)
        ) {
            return NextResponse.json(
                { error: "daily_capacity_minutes ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป" },
                { status: 400 }
            );
        }

        const db = getDb();

        // Validate project exists
        const projectRow = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
        if (!projectRow) {
            return NextResponse.json(
                { error: `Project with ID "${projectId}" does not exist` },
                { status: 404 }
            );
        }

        const conflictPolicy = body.conflict_policy;
        const workMode: PlannerWorkMode = body.default_work_mode || "production";
        const priorityStr = body.default_priority || "normal";
        const plannerStatusStr = body.default_planner_status || "planned";
        const scheduledBlock = body.default_scheduled_block
            ?? (body.default_work_mode ? getWorkModeDefaultBlock(workMode) : "morning_focus");

        // 2. Server-side reparse & revalidation (Do not trust client preview blindly)
        const reparsedSchedule = parseSchedule(rawText);
        if (reparsedSchedule.days.length === 0) {
            return NextResponse.json(
                { error: "ไม่พบวันปฏิบัติงานที่ถูกต้องในข้อความตารางงาน" },
                { status: 400 }
            );
        }
        if (reparsedSchedule.total_tasks === 0) {
            return NextResponse.json(
                { error: "ไม่พบงานในวันปฏิบัติงาน กรุณาเพิ่มงานอย่างน้อยหนึ่งรายการ" },
                { status: 400 }
            );
        }
        const invalidMetadataWarnings = reparsedSchedule.warnings.filter(warning =>
            warning.startsWith(INVALID_CAPACITY_WARNING_PREFIX)
        );
        if (invalidMetadataWarnings.length > 0) {
            return NextResponse.json(
                { error: "Daily Capacity Minutes ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป", warnings: invalidMetadataWarnings },
                { status: 400 }
            );
        }
        const sourceTextHash = reparsedSchedule.source_text_hash;
        const fingerprint = computeImportFingerprint(projectId, sourceTextHash, conflictPolicy, scheduledBlock);

        // Check date range resolution
        for (const day of reparsedSchedule.days) {
            if (day.is_date_range) {
                return NextResponse.json(
                    {
                        error: `Date range "${day.date_text}" is unresolved (${day.date_range?.start_date} to ${day.date_range?.end_date}). Explicit resolution is required before import.`
                    },
                    { status: 400 }
                );
            }
            if (!day.parsed_date) {
                return NextResponse.json(
                    {
                        error: `Day "${day.date_text}" has no valid YYYY-MM-DD date.`
                    },
                    { status: 400 }
                );
            }
        }

        // 3. Duplicate execution safety check using planner_import_batches
        const existingBatch = db
            .prepare("SELECT * FROM planner_import_batches WHERE fingerprint = ?")
            .get(fingerprint) as { id: string; result_json: string } | undefined;

        if (existingBatch) {
            const previousResult: ImportExecutionResult = JSON.parse(existingBatch.result_json);
            return NextResponse.json({
                ...previousResult,
                metadata_results: previousResult.metadata_results ?? [],
                duplicate: true,
                message: "ไม่ได้นำเข้าซ้ำ — แสดงผลการนำเข้าครั้งก่อน"
            });
        }

        // 4. Execute import inside a SQLite Transaction
        const createdProjectItemIds: string[] = [];
        const createdPlannerDayIds: string[] = [];
        const createdPlannerItemIds: string[] = [];
        const skippedDays: string[] = [];
        const metadataResults: ImportMetadataResult[] = [];
        let skippedPlannerItemCount = 0;
        const batchId = `batch-${crypto.randomUUID()}`;

        const executeTransaction = db.transaction(() => {
            for (const day of reparsedSchedule.days) {
                const planDate = day.parsed_date!;

                const existingDay = db
                    .prepare(`
                        SELECT id, main_outcome, daily_capacity_minutes, energy_level, status
                        FROM planner_days
                        WHERE plan_date = ?
                    `)
                    .get(planDate) as {
                        id: string;
                        main_outcome: string | null;
                        daily_capacity_minutes: number | null;
                        energy_level: string | null;
                        status: string;
                    } | undefined;

                if (existingDay && conflictPolicy === "skip") {
                    skippedDays.push(planDate);
                    skippedPlannerItemCount += day.tasks.length;
                    metadataResults.push({
                        plan_date: planDate,
                        applied_fields: [],
                        preserved_fields: ["entire_day"]
                    });
                    continue;
                }

                let plannerDayId: string;
                const appliedFields: string[] = [];
                const preservedFields: string[] = [];
                const importedMainOutcome = day.main_outcome || day.objective || null;

                if (!existingDay) {
                    plannerDayId = `day-${crypto.randomUUID()}`;
                    const capacityMinutes = day.daily_capacity_minutes ?? body.daily_capacity_minutes ?? null;
                    const energyLevel = day.energy_level ?? null;
                    const plannerDayStatus = day.planner_status ?? "planning";

                    db.prepare(`
                        INSERT INTO planner_days (
                            id, plan_date, main_outcome, daily_capacity_minutes, energy_level, status
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(plannerDayId, planDate, importedMainOutcome, capacityMinutes, energyLevel, plannerDayStatus);

                    createdPlannerDayIds.push(plannerDayId);
                    if (importedMainOutcome) appliedFields.push("main_outcome");
                    if (capacityMinutes != null) appliedFields.push("daily_capacity_minutes");
                    if (energyLevel) appliedFields.push("energy_level");
                    if (day.planner_status) appliedFields.push("status");
                } else {
                    plannerDayId = existingDay.id;
                    const updates: string[] = [];
                    const updateValues: Array<string | number> = [];

                    if (importedMainOutcome) {
                        if (!existingDay.main_outcome?.trim()) {
                            updates.push("main_outcome = ?");
                            updateValues.push(importedMainOutcome);
                            appliedFields.push("main_outcome");
                        } else {
                            preservedFields.push("main_outcome");
                        }
                    }
                    if (day.daily_capacity_minutes != null) {
                        if (existingDay.daily_capacity_minutes == null) {
                            updates.push("daily_capacity_minutes = ?");
                            updateValues.push(day.daily_capacity_minutes);
                            appliedFields.push("daily_capacity_minutes");
                        } else {
                            preservedFields.push("daily_capacity_minutes");
                        }
                    }
                    if (day.energy_level) {
                        if (!existingDay.energy_level) {
                            updates.push("energy_level = ?");
                            updateValues.push(day.energy_level);
                            appliedFields.push("energy_level");
                        } else {
                            preservedFields.push("energy_level");
                        }
                    }
                    if (day.planner_status) {
                        if (!existingDay.status) {
                            updates.push("status = ?");
                            updateValues.push(day.planner_status);
                            appliedFields.push("status");
                        } else {
                            preservedFields.push("status");
                        }
                    }

                    if (updates.length > 0) {
                        db.prepare(`
                            UPDATE planner_days
                            SET ${updates.join(", ")}, updated_at = datetime('now')
                            WHERE id = ?
                        `).run(...updateValues, plannerDayId);
                    }
                }

                metadataResults.push({
                    plan_date: planDate,
                    applied_fields: appliedFields,
                    preserved_fields: preservedFields
                });

                for (const task of day.tasks) {
                    const dodTexts = day.dods.map(d => d.raw_text).join("\n");
                    const notesParts: string[] = [];

                    if (day.decision_points.length > 0) {
                        notesParts.push("Decision Points / Gates:\n" + day.decision_points.map(dp => `- ${dp.raw_text}`).join("\n"));
                    }
                    if (day.do_not_dos.length > 0) {
                        notesParts.push("Guardrails / ไม่ควรทำ:\n" + day.do_not_dos.map(dnd => `- ${dnd}`).join("\n"));
                    }
                    if (day.risks.length > 0) {
                        notesParts.push("Risks:\n" + day.risks.map(r => `- ${r.raw_text}`).join("\n"));
                    }
                    if (day.raw_notes.length > 0) {
                        notesParts.push("Import Notes:\n" + day.raw_notes.join("\n"));
                    }

                    const itemNotes = notesParts.length > 0 ? notesParts.join("\n\n") : null;
                    const taskFingerprint = computeImportedTaskFingerprint(projectId, planDate, task.title);
                    const existingProjectItem = db.prepare(`
                        SELECT id FROM project_items WHERE import_fingerprint = ?
                    `).get(taskFingerprint) as { id: string } | undefined;
                    let projectItemId = existingProjectItem?.id;

                    if (!projectItemId) {
                        projectItemId = `pitem-${crypto.randomUUID()}`;
                        db.prepare(`
                            INSERT INTO project_items (
                                id, project_id, title, status, start_date, dod_text, notes, import_fingerprint
                            )
                            VALUES (?, ?, ?, 'planned', ?, ?, ?, ?)
                        `).run(
                            projectItemId,
                            projectId,
                            task.title,
                            planDate,
                            dodTexts || null,
                            itemNotes,
                            taskFingerprint
                        );
                        createdProjectItemIds.push(projectItemId);
                    }

                    const existingPlannerItem = db.prepare(`
                        SELECT id, scheduled_block
                        FROM planner_items
                        WHERE planner_day_id = ? AND source_type = 'project_item' AND source_id = ?
                    `).get(plannerDayId, projectItemId) as { id: string; scheduled_block: string | null } | undefined;
                    if (existingPlannerItem) {
                        if (!isPlannerScheduledBlock(existingPlannerItem.scheduled_block)) {
                            db.prepare(`
                                UPDATE planner_items
                                SET scheduled_block = ?
                                WHERE id = ?
                            `).run(scheduledBlock, existingPlannerItem.id);
                        }
                        skippedPlannerItemCount++;
                        continue;
                    }

                    const plannerItemId = `item-${crypto.randomUUID()}`;
                    db.prepare(`
                        INSERT INTO planner_items (
                            id, planner_day_id, source_type, source_id, work_mode, priority,
                            scheduled_block, planned_order, planner_status
                        )
                        VALUES (?, ?, 'project_item', ?, ?, ?, ?, ?, ?)
                    `).run(
                        plannerItemId,
                        plannerDayId,
                        projectItemId,
                        workMode,
                        priorityStr,
                        scheduledBlock,
                        task.order,
                        plannerStatusStr
                    );
                    createdPlannerItemIds.push(plannerItemId);
                }
            }

            const resultPayload: ImportExecutionResult = {
                success: true,
                batch_id: batchId,
                fingerprint,
                project_id: projectId,
                created_project_items: createdProjectItemIds,
                created_planner_days: createdPlannerDayIds,
                created_planner_items: createdPlannerItemIds,
                skipped_planner_items: skippedPlannerItemCount,
                skipped_days: skippedDays,
                warnings: reparsedSchedule.warnings,
                metadata_results: metadataResults
            };

            // Save import batch record
            db.prepare(`
                INSERT INTO planner_import_batches (id, fingerprint, project_id, source_text_hash, conflict_policy, result_json)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(batchId, fingerprint, projectId, sourceTextHash, conflictPolicy, JSON.stringify(resultPayload));

            return resultPayload;
        });

        const result = executeTransaction();
        return NextResponse.json(result);

    } catch (err: unknown) {
        console.error("Planner import execute error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to execute schedule import" },
            { status: 500 }
        );
    }
}
