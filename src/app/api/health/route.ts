import { NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET() {
    const db = getDb();
    const row = db.prepare("select 1 as ok").get() as { ok: number };
    return NextResponse.json({ ok: row.ok === 1 });
}
