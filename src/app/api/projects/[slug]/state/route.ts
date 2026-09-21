import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { readCanonicalProjectStateBySlug } from "@/lib/project-state/readService";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

type ProjectStateRouteContext = {
    params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: ProjectStateRouteContext) {
    const { slug } = await params;
    const result = readCanonicalProjectStateBySlug(getDb(), slug);

    const status = result.status === "PROJECT_NOT_FOUND"
        ? 404
        : result.status === "NOT_PROVEN" && result.reason === "READ_UNAVAILABLE"
          ? 503
          : 200;

    return NextResponse.json(result, {
        status,
        headers: NO_STORE_HEADERS,
    });
}
