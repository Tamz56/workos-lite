import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";

const ALLOWED_ACTIONS = ["approve", "request_revision", "stop", "note"];

const ACTION_TO_STATUS: Record<string, string> = {
    approve: "approved",
    request_revision: "revision_requested",
    stop: "stopped",
    note: "noted"
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const searchParams = req.nextUrl.searchParams;
        const loopId = searchParams.get("loop_id");

        if (loopId) {
            const loop = db.prepare("SELECT * FROM project_loops WHERE id = ? AND project_id = ?").get(loopId, project.id) as any;
            if (!loop) {
                return NextResponse.json({ error: "Loop not found or does not belong to this project" }, { status: 404 });
            }
            const events = db.prepare("SELECT * FROM project_loop_gate_events WHERE loop_id = ? ORDER BY created_at DESC").all(loopId);
            return NextResponse.json({ events });
        }

        const events = db.prepare("SELECT * FROM project_loop_gate_events WHERE project_id = ? ORDER BY created_at DESC").all(project.id);
        return NextResponse.json({ events });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const body = await req.json();
        const { loop_id, gate_level, gate_action, summary, reason, confirmed } = body;

        if (!loop_id) {
            return NextResponse.json({ error: "loop_id is required" }, { status: 400 });
        }

        const loop = db.prepare("SELECT * FROM project_loops WHERE id = ? AND project_id = ?").get(loop_id, project.id) as any;
        if (!loop) {
            return NextResponse.json({ error: "Loop not found or does not belong to this project" }, { status: 404 });
        }

        // Derive and validate gate_level
        const expectedGateLevel = Number(loop.review_gate_level);
        const finalGateLevel = expectedGateLevel;
        if (gate_level !== undefined) {
            if (Number(gate_level) !== expectedGateLevel) {
                return NextResponse.json({ error: "gate_level must match loop.review_gate_level" }, { status: 400 });
            }
        }

        // Validate gate_action
        if (!gate_action || !ALLOWED_ACTIONS.includes(gate_action)) {
            return NextResponse.json({ error: `Invalid or missing gate_action: ${gate_action}` }, { status: 400 });
        }

        // Text validations for request_revision and stop
        const cleanSummary = (summary || "").trim();
        const cleanReason = (reason || "").trim();
        if (gate_action === "request_revision" && !cleanSummary && !cleanReason) {
            return NextResponse.json({ error: "summary or reason is required for request_revision" }, { status: 400 });
        }
        if (gate_action === "stop" && !cleanSummary && !cleanReason) {
            return NextResponse.json({ error: "summary or reason is required for stop" }, { status: 400 });
        }

        // Confirmation validations for Level 3 gate approval
        if (gate_action === "approve" && finalGateLevel === 3 && confirmed !== true) {
            return NextResponse.json({ error: "Approving a Level 3 gate requires confirmed: true" }, { status: 400 });
        }

        const gateStatus = ACTION_TO_STATUS[gate_action];
        const eventId = `GE-${nanoid(8).toUpperCase()}`;

        // Insert gate event (append-only)
        db.prepare(`
            INSERT INTO project_loop_gate_events (
                id, project_id, loop_id, gate_level, gate_action, gate_status, summary, reason, created_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
            )
        `).run(
            eventId,
            project.id,
            loop.id,
            finalGateLevel,
            gate_action,
            gateStatus,
            cleanSummary || null,
            cleanReason || null
        );

        // Update parent loop summary fields and status
        const sets = [
            "gate_status = ?",
            "last_gate_action = ?",
            "last_gate_at = datetime('now')",
            "updated_at = datetime('now')"
        ];
        const bind = [gateStatus, gate_action];

        if (gate_action === "request_revision") {
            sets.push("status = 'needs_revision'");
        } else if (gate_action === "stop") {
            sets.push("status = 'stopped'");
        }

        bind.push(loop.id, project.id);
        db.prepare(`UPDATE project_loops SET ${sets.join(", ")} WHERE id = ? AND project_id = ?`).run(bind);

        const createdEvent = db.prepare("SELECT * FROM project_loop_gate_events WHERE id = ?").get(eventId);
        const updatedLoop = db.prepare("SELECT * FROM project_loops WHERE id = ?").get(loop.id);

        return NextResponse.json({ event: createdEvent, loop: updatedLoop });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
