import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET(req: NextRequest) {
    const db = getDb();
    const seasons = db.prepare("SELECT * FROM seasons ORDER BY created_at DESC").all();
    return NextResponse.json(seasons);
}
