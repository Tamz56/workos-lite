import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";
import {
    coreStatusForRegistryStatus,
    PROJECT_PRIORITIES,
    PROJECT_REGISTRY_STATUSES,
} from "@/lib/projects/registryMetadata";
import type { Project, ProjectRegistryStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const nullableTrimmedText = z.union([z.string(), z.null()]).transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
});

const REGISTRY_PAYLOAD_FIELDS = [
    "category",
    "registry_status",
    "priority",
    "current_goal",
    "progress_stage",
    "next_action",
    "cadence",
    "risk_or_blocked_by",
] as const;

const UpdateProjectSchema = z.object({
    name: z.string().trim().min(1).optional(),
    status: z.enum(["inbox", "planned", "done"]).optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
    category: nullableTrimmedText.optional(),
    registry_status: z.enum(PROJECT_REGISTRY_STATUSES).nullable().optional(),
    priority: z.enum(PROJECT_PRIORITIES).nullable().optional(),
    current_goal: nullableTrimmedText.optional(),
    progress_stage: nullableTrimmedText.optional(),
    next_action: nullableTrimmedText.optional(),
    cadence: nullableTrimmedText.optional(),
    risk_or_blocked_by: nullableTrimmedText.optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as Project | undefined;
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const body = await req.json();
        const result = UpdateProjectSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid project update payload", details: result.error.flatten() },
                { status: 400 },
            );
        }
        const parsed = result.data;
        const hasMetadataSnapshot = REGISTRY_PAYLOAD_FIELDS.some(
            (field) => Object.prototype.hasOwnProperty.call(parsed, field),
        );

        if (hasMetadataSnapshot) {
            const missingFields = REGISTRY_PAYLOAD_FIELDS.filter(
                (field) => !Object.prototype.hasOwnProperty.call(parsed, field),
            );
            if (missingFields.length > 0 || parsed.status === undefined) {
                return NextResponse.json(
                    {
                        error: "Registry metadata must be saved as a complete snapshot",
                        missing_fields: [
                            ...(parsed.status === undefined ? ["status"] : []),
                            ...missingFields,
                        ],
                    },
                    { status: 400 },
                );
            }

            if (
                parsed.registry_status !== undefined
                && parsed.registry_status !== null
                && coreStatusForRegistryStatus(parsed.registry_status) !== parsed.status
            ) {
                return NextResponse.json(
                    { error: "Core status conflicts with registry status" },
                    { status: 409 },
                );
            }
        } else if (
            parsed.status !== undefined
            && project.metadata_updated_at !== null
            && project.registry_status !== null
            && coreStatusForRegistryStatus(project.registry_status as ProjectRegistryStatus)
                !== parsed.status
        ) {
            return NextResponse.json(
                { error: "Core status conflicts with canonical registry status" },
                { status: 409 },
            );
        }

        const sets: string[] = [];
        const bind: Record<string, string | null> = { slug };

        if (parsed.name !== undefined) { sets.push("name = @name"); bind.name = parsed.name; }
        if (parsed.status !== undefined) { sets.push("status = @status"); bind.status = parsed.status; }
        if (parsed.start_date !== undefined) { sets.push("start_date = @start_date"); bind.start_date = parsed.start_date; }
        if (parsed.end_date !== undefined) { sets.push("end_date = @end_date"); bind.end_date = parsed.end_date; }
        if (parsed.owner !== undefined) { sets.push("owner = @owner"); bind.owner = parsed.owner; }
        if (hasMetadataSnapshot) {
            for (const field of REGISTRY_PAYLOAD_FIELDS) {
                sets.push(`${field} = @${field}`);
                bind[field] = parsed[field] ?? null;
            }
            sets.push("metadata_updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
        }

        if (sets.length === 0) {
            return NextResponse.json(project);
        }

        const sql = `UPDATE projects SET ${sets.join(", ")} WHERE slug = @slug`;
        db.transaction(() => db.prepare(sql).run(bind))();

        const updated = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        return NextResponse.json(updated);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown project update error";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();

        // 1. Protection Check
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        
        if ((project as any).is_seed === 1) {
            return NextResponse.json({ 
                error: "Cannot delete seed/demo project from UI. Please use Reset Demo Data instead." 
            }, { status: 403 });
        }

        // 2. Cascade Delete in Transaction
        const transaction = db.transaction(() => {
            // A. Delete tasks in lists belonging to this project (where list_id starts with slug-)
            db.prepare("DELETE FROM tasks WHERE list_id LIKE ?").run(`${slug}-%`);

            // B. Delete lists
            db.prepare("DELETE FROM lists WHERE slug LIKE ?").run(`${slug}-%`);

            // D. Delete project
            db.prepare("DELETE FROM projects WHERE slug = ?").run(slug);
        });

        transaction();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
