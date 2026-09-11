import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { buildControlCenterProjection } from "@/lib/arbor-desk/controlCenterProjection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function bangkokDate(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const requestedDate = url.searchParams.get("date");

        if (requestedDate !== null && !DATE_REGEX.test(requestedDate)) {
            return NextResponse.json(
                { error: "Invalid date format. Expected YYYY-MM-DD." },
                { status: 400 },
            );
        }

        const date = requestedDate ?? bangkokDate();
        const projection = buildControlCenterProjection(getDb(), date);

        return NextResponse.json(projection, {
            headers: {
                "Cache-Control": "no-store, max-age=0",
            },
        });
    } catch {
        return NextResponse.json(
            { error: "CONTROL_CENTER_READ_UNAVAILABLE" },
            { status: 500 },
        );
    }
}
