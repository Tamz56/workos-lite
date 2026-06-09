import { NextRequest, NextResponse } from "next/server";
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
    created_at: string;
    updated_at: string;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const promptTemplateId = searchParams.get("promptTemplateId");

        if (!promptTemplateId) {
            return NextResponse.json({ error: "promptTemplateId is required" }, { status: 400 });
        }

        const query = "SELECT * FROM prompt_run_logs WHERE prompt_template_id = ? ORDER BY created_at DESC";
        const logs = db.prepare(query).all(promptTemplateId) as DBPromptRunLog[];
        
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
    try {
        const body = await req.json();
        const {
            promptTemplateId,
            inputSnapshot,
            compiledPromptSnapshot,
            outputNotes,
            rating,
            nextRevisionNotes
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
                output_notes, rating, next_revision_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            id,
            promptTemplateId,
            inputSnapshotStr,
            compiledPromptSnapshot,
            outputNotes || null,
            rating,
            nextRevisionNotes || null,
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
            createdAt: newLog.created_at,
            updatedAt: newLog.updated_at
        });
    } catch (e) {
        console.error("POST /api/prompt-run-logs failed:", e);
        return NextResponse.json({ error: "Failed to create prompt run log" }, { status: 500 });
    }
}
