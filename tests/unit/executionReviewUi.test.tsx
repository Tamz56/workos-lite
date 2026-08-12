import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { friendlyExecutionError, postExecuteOperation } from "@/components/operations-review/api";
import { ExecuteOperationModalContent } from "@/components/operations-review/ExecuteOperationModal";
import { canExecute } from "@/components/operations-review/reviewState";
import type { ApprovalView, ReviewDetail } from "@/components/operations-review/types";

const APPROVAL: ApprovalView = {
    id: "apr-1",
    operationId: "op-1",
    status: "approved",
    approvedAt: "2026-08-12T10:00:00.000Z",
    expiresAt: "2026-08-12T10:30:00.000Z",
    approverActor: "human:human-1",
    revokedAt: null,
    revokedBy: null,
    binding: {
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        resolvedTargetId: "p1",
        payloadHash: "hash",
        contractVersion: "backlog.create.v1",
        previewFingerprint: "fp",
    },
    preview: {},
};

function detail(overrides: Partial<ReviewDetail> = {}): ReviewDetail {
    return {
        operationId: "op-1",
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        requesterActorType: "agent",
        requesterActorId: "agent-1",
        requestedAt: "2026-08-12T10:00:00.000Z",
        reviewState: "approved",
        approval: APPROVAL,
        rejection: null,
        payload: { title: "Task" },
        payloadHash: "hash",
        preview: {
            operationType: "backlog.create",
            target: { type: "project", ref: "project-a", resolvedId: "p1" },
            proposed: { action: "create", entity: "project_item", fields: { title: "Task", status: "planned" } },
        },
        previewFingerprint: "fp",
        contractVersion: "backlog.create.v1",
        status: "pending",
        execution: { committed: null, latestFailure: null },
        ...overrides,
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("canExecute", () => {
    const now = new Date("2026-08-12T10:05:00.000Z").getTime();

    it("is true only for pending + approved + active approval", () => {
        expect(canExecute("pending", "approved", APPROVAL, now)).toBe(true);
    });

    it("is false when the approval is locally expired (advisory clock)", () => {
        expect(canExecute("pending", "approved", APPROVAL, new Date("2026-08-12T10:31:00.000Z").getTime())).toBe(false);
    });

    it("is false for revoked / consumed / awaiting / non-pending states", () => {
        expect(canExecute("pending", "revoked", null, now)).toBe(false);
        expect(canExecute("pending", "consumed", null, now)).toBe(false);
        expect(canExecute("pending", "awaiting_review", null, now)).toBe(false);
        expect(canExecute("failed", "approved", APPROVAL, now)).toBe(false);
        expect(canExecute("succeeded", "consumed", null, now)).toBe(false);
        expect(canExecute("pending", "approved", { ...APPROVAL, status: "revoked" }, now)).toBe(false);
        expect(canExecute("pending", "approved", null, now)).toBe(false);
    });
});

describe("friendlyExecutionError", () => {
    it("maps execution codes to safe user-facing copy", () => {
        expect(friendlyExecutionError("OPS_EXECUTION_APPROVAL_EXPIRED")).toContain("expired");
        expect(friendlyExecutionError("OPS_EXECUTION_APPROVAL_REVOKED")).toContain("revoked");
        expect(friendlyExecutionError("OPS_EXECUTION_APPROVAL_CONSUMED")).toContain("consumed");
        expect(friendlyExecutionError("OPS_EXECUTION_TARGET_STALE")).toContain("target");
        expect(friendlyExecutionError("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH")).toContain("no longer matches");
        expect(friendlyExecutionError("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED")).toContain("no longer matches");
        expect(friendlyExecutionError("OPS_EXECUTION_ROLLED_BACK")).toContain("did not commit");
        expect(friendlyExecutionError("OPS_EXECUTION_INTERNAL_ERROR")).toContain("could not be completed");
        expect(friendlyExecutionError("OPS_EXECUTION_CONFLICT")).toContain("changed");
        expect(friendlyExecutionError("UNKNOWN")).toBe("Unable to complete the request.");
    });
});

describe("ExecuteOperationModalContent", () => {
    it("shows identity, target, approval, proposed change, warning, and execute action without editable payload", () => {
        const html = renderToStaticMarkup(
            <ExecuteOperationModalContent operation={detail()} onExecute={() => undefined} onCancel={() => undefined} />,
        );
        expect(html).toContain("op-1");
        expect(html).toContain("project-a");
        expect(html).toContain("apr-1");
        expect(html).toContain("This action will create the backlog item in WorkOS.");
        expect(html).toContain("The operation will be executed exactly as approved. The payload cannot be changed here.");
        expect(html).toContain("The approval is consumed only if the operation commits successfully.");
        expect(html).toContain("Execute operation");
        expect(html).not.toContain("contenteditable");
        expect(html).not.toContain("textarea");
    });
});

describe("postExecuteOperation request contract", () => {
    it("sends exactly { approvalId } with no other fields", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true, replay: false, execution: {} }), { status: 200, headers: { "content-type": "application/json" } }),
        );
        vi.stubGlobal("fetch", fetchMock);
        await postExecuteOperation("op-1", "apr-1");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/human/operations/op-1/execute");
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body)).toEqual({ approvalId: "apr-1" });
        expect(Object.keys(JSON.parse(init.body))).toEqual(["approvalId"]);
    });
});

describe("Approve modal copy update", () => {
    it("removes the obsolete execution-disabled phrase and states explicit Execute requirement", () => {
        const source = fs.readFileSync(
            path.resolve(process.cwd(), "src/components/operations-review/ApproveOperationModal.tsx"),
            "utf8",
        );
        expect(source).not.toContain("Execution is not enabled in this stage.");
        expect(source).toContain("Approving does not execute the operation.");
        expect(source).toContain("explicitly chooses Execute");
    });
});
