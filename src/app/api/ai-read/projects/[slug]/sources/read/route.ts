import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { authenticateReadPrincipal } from "@/lib/ai-read/scope";
import { readSourceChunk } from "@/lib/ai-read/readService";
import { ReadApiError, readErrorJson } from "@/lib/ai-read/errors";
import type { ProjectContextSourceRef } from "@/lib/project-curator/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        authenticateReadPrincipal(req);
        const { slug } = await params;

        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const source = body.source as Record<string, unknown> | undefined;
        if (
            !source ||
            typeof source.sourceKind !== "string" ||
            typeof source.sourceId !== "string" ||
            !source.sourceKind ||
            !source.sourceId
        ) {
            throw new ReadApiError("UNSUPPORTED_SOURCE_KIND", "Invalid source reference", 400);
        }
        const sourceRef = {
            sourceKind: source.sourceKind as ProjectContextSourceRef["sourceKind"],
            sourceId: source.sourceId,
        };

        const db = getDb();
        const result = readSourceChunk(db, slug, {
            source: sourceRef,
            offset: Number(body.offset),
            limit: Number(body.limit),
        });
        return NextResponse.json(result);
    } catch (err) {
        const body = readErrorJson(err);
        return NextResponse.json(body, { status: body.error.status });
    }
}
