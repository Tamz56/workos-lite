// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Execute Import API application service
// WORKOS-SHEET-GATE-7A
// Thin API boundary over the Gate 6 service. The Gate 6 service remains the
// sole business-write authority; this layer only validates identifiers,
// derives the server actor, and maps typed execution errors.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { executeApprovedImportEntity } from "./executeImportService";
import { serializeExecuteApiResponse, toExecuteApiError } from "./executeApiSerialization";
import type { ExecuteImportApiInput, ExecuteImportApiResponse } from "./executeApiTypes";

export type ExecuteApiServiceDeps = {
    db: Database.Database;
    now?: string;
};

export function executeImportFromApi(
    input: ExecuteImportApiInput,
    deps: ExecuteApiServiceDeps,
): ExecuteImportApiResponse {
    try {
        const result = executeApprovedImportEntity(
            {
                batchId: input.batchId,
                entityType: input.entityType,
                approvalId: input.approvalId,
                requestedBy: input.actorName,
            },
            { db: deps.db, ...(deps.now ? { now: deps.now } : {}) },
        );
        return serializeExecuteApiResponse(result);
    } catch (error) {
        throw toExecuteApiError(error);
    }
}
