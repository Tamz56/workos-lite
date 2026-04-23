import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { toErrorMessage } from "@/lib/error";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
    try {
        const { topicId, newPublishDate, newReviewStatus, isPublishing, distributionChannels, performanceMetrics } = await req.json();


        if (!topicId) {
            return NextResponse.json({ error: "Missing topicId" }, { status: 400 });
        }

        const db = getDb();
        const topicPattern = `%topic_id: ${topicId}%`;
        const now = new Date().toISOString();
        let updatedCount = 0;


        // --- PART 1: Reschedule Logic ---
        let deltaDays = 0;
        if (newPublishDate) {
            const publishTask = db.prepare(`
                SELECT id, scheduled_date 
                FROM tasks 
                WHERE notes LIKE @pattern 
                AND title LIKE '%Publish%'
                LIMIT 1
            `).get({ pattern: topicPattern }) as { id: string, scheduled_date: string | null } | undefined;

            if (publishTask && publishTask.scheduled_date) {
                const oldDate = new Date(publishTask.scheduled_date);
                const newDate = new Date(newPublishDate);
                const deltaMs = newDate.getTime() - oldDate.getTime();
                deltaDays = Math.round(deltaMs / (1000 * 60 * 60 * 24));

                if (deltaDays !== 0) {
                    const tasksToReschedule = db.prepare(`
                        SELECT id, scheduled_date 
                        FROM tasks 
                        WHERE notes LIKE @pattern 
                        AND scheduled_date IS NOT NULL
                    `).all({ pattern: topicPattern }) as { id: string, scheduled_date: string } [];

                    const updateDateStmt = db.prepare(`
                        UPDATE tasks 
                        SET scheduled_date = date(scheduled_date, @delta), 
                            updated_at = @now 
                        WHERE id = @id
                    `);

                    const deltaStr = `${deltaDays >= 0 ? '+' : ''}${deltaDays} days`;
                    const rescheduleTx = db.transaction(() => {
                        for (const task of tasksToReschedule) {
                            updateDateStmt.run({ delta: deltaStr, now, id: task.id });
                        }
                    });
                    rescheduleTx();
                    updatedCount += tasksToReschedule.length;
                }
            }
        }

        // --- PART 2: Review Status Logic (RC26) ---
        if (newReviewStatus) {
            const reviewStmt = db.prepare(`
                UPDATE tasks 
                SET review_status = @status, 
                    updated_at = @now 
                WHERE notes LIKE @pattern
            `);
            const info = reviewStmt.run({ 
                status: newReviewStatus, 
                now, 
                pattern: topicPattern 
            });
            updatedCount = Math.max(updatedCount, info.changes);
        }
        
        // --- PART 3: Publish Logic (RC28) ---
        if (isPublishing) {
            const publishStmt = db.prepare(`
                UPDATE tasks 
                SET review_status = 'published',
                    published_at = @now,
                    updated_at = @now 
                WHERE (notes LIKE @pattern) 
                AND (review_status IS NULL OR review_status != 'published')
            `);
            const info = publishStmt.run({ 
                now, 
                pattern: topicPattern 
            });
            updatedCount = Math.max(updatedCount, info.changes);
        }

        // --- PART 4: Distribution Channels (RC29) ---
        if (distributionChannels) {
            const channelsStr = JSON.stringify(
                Array.from(new Set(
                    distributionChannels.map((c: any) => String(c).toLowerCase())
                )).sort()
            );

            const channelStmt = db.prepare(`
                UPDATE tasks 
                SET distribution_channels = @channels, 
                    updated_at = @now 
                WHERE notes LIKE @pattern
            `);
            const info = channelStmt.run({ 
                channels: channelsStr,
                now, 
                pattern: topicPattern 
            });
            updatedCount = Math.max(updatedCount, info.changes);
        }

        // --- PART 5: Performance Metrics (RC30) ---
        if (performanceMetrics) {
            const metricsStr = JSON.stringify(performanceMetrics);
            const metricsStmt = db.prepare(`
                UPDATE tasks 
                SET performance_metrics = @metrics, 
                    updated_at = @now 
                WHERE notes LIKE @pattern
            `);
            const info = metricsStmt.run({ 
                metrics: metricsStr,
                now, 
                pattern: topicPattern 
            });
            updatedCount = Math.max(updatedCount, info.changes);
        }

        if (updatedCount === 0 && !newPublishDate && !newReviewStatus && !isPublishing && !distributionChannels && !performanceMetrics) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }



        return NextResponse.json({ 
            ok: true, 
            deltaDays, 
            updatedCount 
        });

    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "Missing or invalid ids array" }, { status: 400 });
        }

        const db = getDb();
        const now = new Date().toISOString();

        // 1. Fetch all associated attachments to clean up files
        // RC65: Collective file cleanup
        const placeholders = ids.map((_, i) => `@id_${i}`).join(", ");
        const bindValues: Record<string, string> = {};
        ids.forEach((id, i) => { bindValues[`id_${i}`] = id; });

        const attachments = db.prepare(`
            SELECT id, storage_path 
            FROM attachments 
            WHERE task_id IN (${placeholders})
        `).all(bindValues) as { id: string; storage_path: string }[];

        // 2. Perform file deletion
        const fs = require('fs/promises');
        const path = require('path');
        for (const a of attachments) {
            if (a.storage_path) {
                const absPath = path.isAbsolute(a.storage_path)
                    ? a.storage_path
                    : path.join(process.cwd(), ".workos-lite", a.storage_path);
                try {
                    await fs.unlink(absPath);
                } catch (e: any) {
                    if (e.code !== 'ENOENT') console.error("[batch-delete] unlink failed", e);
                }
            }
        }

        // 3. Delete tasks (cascades should handle sub-rows if configured, but we'll reflect main deletion)
        const deleteStmt = db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`);
        const info = deleteStmt.run(bindValues);

        return NextResponse.json({ 
            ok: true, 
            deletedCount: info.changes 
        });

    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
