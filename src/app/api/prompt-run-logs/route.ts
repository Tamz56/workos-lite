import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

interface DBPromptRunLog {
    id: string;
    prompt_template_id: string;
    input_snapshot: string;
    compiled_prompt_snapshot: string;
    output_notes: string | null;
    rating: number;
    next_revision_notes: string | null;
    summary: string | null;
    run_status: string | null;
    created_at: string;
    updated_at: string;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const promptTemplateId = searchParams.get("promptTemplateId");
        const runStatus = searchParams.get("runStatus"); // Optional status filter
        const ratingFilter = searchParams.get("ratingFilter"); // Optional rating filter

        if (!promptTemplateId) {
            return NextResponse.json({ error: "promptTemplateId is required" }, { status: 400 });
        }

        let query = "SELECT * FROM prompt_run_logs WHERE prompt_template_id = ?";
        const params: string[] = [promptTemplateId];

        // Apply runStatus filter
        if (runStatus === "archived") {
            query += " AND run_status = 'archived'";
        } else if (runStatus === "useful") {
            query += " AND run_status = 'useful'";
        } else if (runStatus === "needs_revision") {
            query += " AND run_status = 'needs_revision'";
        } else if (runStatus === "active") {
            query += " AND run_status != 'archived'";
        } else if (runStatus === "all") {
            // No status filter
        } else {
            // Default: active (non-archived)
            query += " AND run_status != 'archived'";
        }

        // Apply ratingFilter filter
        if (ratingFilter === "5") {
            query += " AND rating = 5";
        } else if (ratingFilter === "4plus") {
            query += " AND rating >= 4";
        } else if (ratingFilter === "3minus") {
            query += " AND rating <= 3";
        }

        query += " ORDER BY created_at DESC";

        const logs = db.prepare(query).all(...params) as DBPromptRunLog[];

        // Parse input_snapshot back to JS objects
        const parsedLogs = logs.map((log) => {
            let inputSnapshotObj = [];
            try {
                inputSnapshotObj = JSON.parse(log.input_snapshot);
            } catch (err) {
                console.error("Failed to parse input_snapshot JSON:", err);
            }
            return {
                id: log.id,
                promptTemplateId: log.prompt_template_id,
                inputSnapshot: inputSnapshotObj,
                compiledPromptSnapshot: log.compiled_prompt_snapshot,
                outputNotes: log.output_notes || "",
                rating: log.rating,
                nextRevisionNotes: log.next_revision_notes || "",
                summary: log.summary || "",
                runStatus: log.run_status || "needs_revision",
                createdAt: log.created_at,
                updatedAt: log.updated_at
            };
        });

        return NextResponse.json(parsedLogs);
    } catch (e) {
        console.error("GET /api/prompt-run-logs failed:", e);
        return NextResponse.json({ error: "Failed to fetch prompt run logs" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const body = await req.json();
        const {
            promptTemplateId,
            inputSnapshot,
            compiledPromptSnapshot,
            outputNotes,
            rating,
            nextRevisionNotes,
            summary,
            runStatus
        } = body;

        if (!promptTemplateId) {
            return NextResponse.json({ error: "promptTemplateId is required" }, { status: 400 });
        }
        if (rating === undefined || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "rating must be between 1 and 5" }, { status: 400 });
        }
        if (!compiledPromptSnapshot) {
            return NextResponse.json({ error: "compiledPromptSnapshot is required" }, { status: 400 });
        }

        const id = "run-" + nanoid(10);
        const now = new Date().toISOString();
        const inputSnapshotStr = JSON.stringify(inputSnapshot || []);

        const insertStmt = db.prepare(`
            INSERT INTO prompt_run_logs (
                id, prompt_template_id, input_snapshot, compiled_prompt_snapshot,
                output_notes, rating, next_revision_notes, summary, run_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            id,
            promptTemplateId,
            inputSnapshotStr,
            compiledPromptSnapshot,
            outputNotes || null,
            rating,
            nextRevisionNotes || null,
            summary || "",
            runStatus || "needs_revision",
            now,
            now
        );

        const newLog = db.prepare("SELECT * FROM prompt_run_logs WHERE id = ?").get(id) as DBPromptRunLog;

        let parsedInput = [];
        try {
            parsedInput = JSON.parse(newLog.input_snapshot);
        } catch (err) {
            console.error("Failed to parse saved input_snapshot:", err);
        }

        return NextResponse.json({
            id: newLog.id,
            promptTemplateId: newLog.prompt_template_id,
            inputSnapshot: parsedInput,
            compiledPromptSnapshot: newLog.compiled_prompt_snapshot,
            outputNotes: newLog.output_notes || "",
            rating: newLog.rating,
            nextRevisionNotes: newLog.next_revision_notes || "",
            summary: newLog.summary || "",
            runStatus: newLog.run_status || "needs_revision",
            createdAt: newLog.created_at,
            updatedAt: newLog.updated_at
        });
    } catch (e) {
        console.error("POST /api/prompt-run-logs failed:", e);
        return NextResponse.json({ error: "Failed to create prompt run log" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const body = await req.json();
        const {
            id,
            summary,
            runStatus,
            outputNotes,
            rating,
            nextRevisionNotes
        } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const existingLog = db.prepare("SELECT * FROM prompt_run_logs WHERE id = ?").get(id) as DBPromptRunLog | undefined;
        if (!existingLog) {
            return NextResponse.json({ error: "Prompt run log not found" }, { status: 404 });
        }

        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return NextResponse.json({ error: "rating must be between 1 and 5" }, { status: 400 });
        }

        const now = new Date().toISOString();

        const updatedSummary = summary !== undefined ? summary : (existingLog.summary || "");
        const updatedRunStatus = runStatus !== undefined ? runStatus : (existingLog.run_status || "needs_revision");
        const updatedOutputNotes = outputNotes !== undefined ? outputNotes : existingLog.output_notes;
        const updatedRating = rating !== undefined ? rating : existingLog.rating;
        const updatedNextRevisionNotes = nextRevisionNotes !== undefined ? nextRevisionNotes : existingLog.next_revision_notes;

        const updateStmt = db.prepare(`
            UPDATE prompt_run_logs
            SET summary = ?,
                run_status = ?,
                output_notes = ?,
                rating = ?,
                next_revision_notes = ?,
                updated_at = ?
            WHERE id = ?
        `);

        updateStmt.run(
            updatedSummary,
            updatedRunStatus,
            updatedOutputNotes,
            updatedRating,
            updatedNextRevisionNotes,
            now,
            id
        );

        const updatedLog = db.prepare("SELECT * FROM prompt_run_logs WHERE id = ?").get(id) as DBPromptRunLog;

        let parsedInput = [];
        try {
            parsedInput = JSON.parse(updatedLog.input_snapshot);
        } catch (err) {
            console.error("Failed to parse updated input_snapshot:", err);
        }

        return NextResponse.json({
            id: updatedLog.id,
            promptTemplateId: updatedLog.prompt_template_id,
            inputSnapshot: parsedInput,
            compiledPromptSnapshot: updatedLog.compiled_prompt_snapshot,
            outputNotes: updatedLog.output_notes || "",
            rating: updatedLog.rating,
            nextRevisionNotes: updatedLog.next_revision_notes || "",
            summary: updatedLog.summary || "",
            runStatus: updatedLog.run_status || "needs_revision",
            createdAt: updatedLog.created_at,
            updatedAt: updatedLog.updated_at
        });
    } catch (e) {
        console.error("PATCH /api/prompt-run-logs failed:", e);
        return NextResponse.json({ error: "Failed to update prompt run log" }, { status: 500 });
    }
}
