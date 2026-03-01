export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";
import { toErrorMessage } from "@/lib/error";

const PatchListSchema = z
    .object({
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and dashes").optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
    })
    .strict();

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const list = getDb().prepare("SELECT * FROM lists WHERE id = ?").get(id);

        if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ list });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const body = (await req.json().catch(() => ({}))) as unknown;
        const parsed = PatchListSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid payload", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const patch = parsed.data;

        const current = getDb().prepare("SELECT * FROM lists WHERE id = ?").get(id);
        if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const keys = Object.keys(patch) as (keyof typeof patch)[];
        if (keys.length === 0) return NextResponse.json({ list: current });

        const setClauses: string[] = [];
        const bind: Record<string, unknown> = { id };

        for (const k of keys) {
            setClauses.push(`${k} = @${k}`);
            bind[k] = patch[k];
        }

        // Auto touch updated_at
        setClauses.push("updated_at = datetime('now')");

        const sql = `UPDATE lists SET ${setClauses.join(", ")} WHERE id = @id`;
        try {
            getDb().prepare(sql).run(bind);
        } catch (dbErr: any) {
            if (dbErr.code === 'SQLITE_CONSTRAINT_UNIQUE' || dbErr.message.includes('UNIQUE constraint failed')) {
                return NextResponse.json({ error: "List slug already exists in workspace" }, { status: 409 });
            }
            throw dbErr;
        }

        const updated = getDb().prepare("SELECT * FROM lists WHERE id = ?").get(id);
        return NextResponse.json({ list: updated });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const runTx = getDb().transaction(() => {
            // First detach tasks smoothly
            getDb().prepare("UPDATE tasks SET list_id = NULL, updated_at = datetime('now') WHERE list_id = ?").run(id);
            // Then delete list
            const info = getDb().prepare("DELETE FROM lists WHERE id = ?").run(id);
            return info;
        });

        const info = runTx();

        if (info.changes === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
