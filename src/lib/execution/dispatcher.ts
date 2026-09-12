// ---------------------------------------------------------------------------
// ACC-P5-001 explicit two-operation execution dispatcher.
// This is not a generalized job registry.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { executeOperation } from "./service";
import { executeAiReadAnalyze } from "./aiReadAnalyze";
import { ExecutionError, executionSafeMessage } from "./errors";
import type { DispatchExecuteOperationOutcome, ExecutionTriggerHuman } from "./types";

export async function dispatchExecuteOperation(
    db: Database.Database,
    human: ExecutionTriggerHuman,
    operationId: string,
    rawBody: unknown,
): Promise<DispatchExecuteOperationOutcome> {
    const row = db.prepare("SELECT operation_type FROM operations WHERE id=?").get(operationId) as
        | { operation_type: string }
        | undefined;
    if (!row) {
        throw new ExecutionError("OPS_EXECUTION_OPERATION_NOT_FOUND", executionSafeMessage("OPS_EXECUTION_OPERATION_NOT_FOUND"), 404, false);
    }
    if (row.operation_type === "backlog.create") {
        return executeOperation(db, human, operationId, rawBody);
    }
    if (row.operation_type === "ai.read_analyze") {
        return executeAiReadAnalyze(db, human, operationId, rawBody);
    }
    throw new ExecutionError("OPS_EXECUTION_NOT_EXECUTABLE", executionSafeMessage("OPS_EXECUTION_NOT_EXECUTABLE"), 409, false);
}
