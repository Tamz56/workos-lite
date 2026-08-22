import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { authenticateReadPrincipal } from "@/lib/ai-read/scope";
import { buildSourceIndexPage } from "@/lib/ai-read/sourceIndexService";
import { readErrorJson } from "@/lib/ai-read/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        authenticateReadPrincipal(req);
        const { slug } = await params;
        const url = new URL(req.url);

        const pageSizeRaw = url.searchParams.get("pageSize");
        const cursor = url.searchParams.get("cursor");
        const expectedCorpusFingerprint = url.searchParams.get("expectedCorpusFingerprint");

        const db = getDb();
        const result = buildSourceIndexPage(db, slug, {
            pageSize: pageSizeRaw === null ? undefined : Number(pageSizeRaw),
            cursor: cursor ?? undefined,
            expectedCorpusFingerprint: expectedCorpusFingerprint ?? undefined,
        });
        return NextResponse.json(result);
    } catch (err) {
        const body = readErrorJson(err);
        return NextResponse.json(body, { status: body.error.status });
    }
}
