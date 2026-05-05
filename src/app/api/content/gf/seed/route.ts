import { NextRequest, NextResponse } from "next/server";
import { seedGreenFinenessSeason1 } from "@/db/db";

export async function POST(req: NextRequest) {
    try {
        seedGreenFinenessSeason1();
        return NextResponse.json({ ok: true, message: "GF-SEASON-01 and 12 episodes seeded successfully" });
    } catch (error: any) {
        console.error("Seeding failed:", error);
        return NextResponse.json({ error: error.message || "Seeding failed" }, { status: 500 });
    }
}
