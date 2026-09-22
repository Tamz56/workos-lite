import { NextResponse } from "next/server";
import { openReadOnlyWorkosDatabase } from "@/db/readOnlyDb";
import { readCoreProjectDirectory } from "@/lib/core-api/projectDirectory";
import { WORKOS_CORE_SCHEMA_VERSION } from "@/lib/core-api/types";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export async function GET() {
    let db: ReturnType<typeof openReadOnlyWorkosDatabase> | undefined;

    try {
        db = openReadOnlyWorkosDatabase();
        const result = readCoreProjectDirectory(db);
        return NextResponse.json(result, { headers: NO_STORE_HEADERS });
    } catch {
        return NextResponse.json(
            {
                schemaVersion: WORKOS_CORE_SCHEMA_VERSION,
                error: "READ_UNAVAILABLE",
            },
            {
                status: 503,
                headers: NO_STORE_HEADERS,
            },
        );
    } finally {
        db?.close();
    }
}
