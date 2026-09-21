import { NextRequest, NextResponse } from "next/server";
import { openReadOnlyWorkosDatabase } from "@/db/readOnlyDb";
import { readCanonicalProjectStateBySlug } from "@/lib/project-state/readService";
import type { CanonicalProjectStateReadResult } from "@/lib/project-state/types";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

type ProjectStateRouteContext = {
    params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: ProjectStateRouteContext) {
    const { slug } = await params;
    let result: CanonicalProjectStateReadResult;

    try {
        const db = openReadOnlyWorkosDatabase();
        try {
            result = readCanonicalProjectStateBySlug(db, slug);
        } finally {
            db.close();
        }
    } catch {
        result = {
            status: "NOT_PROVEN",
            projectSlug: slug,
            reason: "READ_UNAVAILABLE",
        };
    }

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
