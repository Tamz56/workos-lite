export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { toErrorMessage } from "@/lib/error";
import { WORKSPACES, normalizeWorkspace } from "@/lib/workspaces";

const Workspace = z.enum(WORKSPACES);

const CreateListSchema = z.object({
    workspace: Workspace,
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and dashes"),
    title: z.string().min(1),
    description: z.string().optional().default(""),
});

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const workspace = url.searchParams.get("workspace");

        if (workspace && Workspace.safeParse(workspace).success) {
            const rows = getDb()
                .prepare(`SELECT * FROM lists WHERE workspace = ? ORDER BY updated_at DESC`)
                .all(workspace);
            return NextResponse.json(rows);
        } else {
            const rows = getDb()
                .prepare(`SELECT * FROM lists ORDER BY workspace ASC, updated_at DESC`)
                .all();
            return NextResponse.json(rows);
        }
    } catch (e: unknown) {
        return NextResponse.json(
            { error: toErrorMessage(e) },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

        if (body && typeof body.workspace === "string") {
            body.workspace = normalizeWorkspace(body.workspace);
        }

        const parsed = CreateListSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        const t = parsed.data;
        const id = nanoid();

        try {
            getDb().prepare(
                `
                INSERT INTO lists (
                    id, workspace, slug, title, description,
                    created_at, updated_at
                )
                VALUES (
                    @id, @workspace, @slug, @title, @description,
                    datetime('now'), datetime('now')
                )
                `
            ).run({
                id,
                workspace: t.workspace,
                slug: t.slug,
                title: t.title,
                description: t.description,
            });

            const created = getDb().prepare("SELECT * FROM lists WHERE id = ?").get(id);
            return NextResponse.json({ list: created }, { status: 201 });
        } catch (dbErr: any) {
            if (dbErr.code === 'SQLITE_CONSTRAINT_UNIQUE' || dbErr.message.includes('UNIQUE constraint failed')) {
                return NextResponse.json({ error: "List slug already exists in workspace" }, { status: 409 });
            }
            throw dbErr;
        }

    } catch (e: unknown) {
        return NextResponse.json(
            { error: toErrorMessage(e) },
            { status: 500 }
        );
    }
}
