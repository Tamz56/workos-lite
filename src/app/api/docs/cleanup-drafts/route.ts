// src/app/api/docs/cleanup-drafts/route.ts
import { NextResponse } from "next/server";
import { readAllDocs, writeAllDocs, withDocsLock, type DocRow } from "@/lib/docsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDraft(d: Pick<DocRow, "title" | "content_md">) {
    const t = (d.title ?? "").trim();
    const c = (d.content_md ?? "").trim();
    return (t === "" || t === "Untitled") && c === "";
}

export async function POST() {
    const result = await withDocsLock(async () => {
        const docs = await readAllDocs();
        const removed = docs.filter(isDraft).map((d) => d.id);
        const kept = docs.filter((d) => !isDraft(d));
        if (removed.length > 0) {
            await writeAllDocs(kept);
        }
        return { deleted: removed.length, removed_ids: removed };
    });

    return NextResponse.json(result);
}
