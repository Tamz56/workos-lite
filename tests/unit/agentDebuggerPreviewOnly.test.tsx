import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { AgentExecuteActions } from "@/components/agent/AgentExecuteActions";

describe("Agent Debugger preview-only actions", () => {
    it("keeps Preview Build enabled and disables Execute Now with a policy notice", () => {
        const html = renderToStaticMarkup(
            <AgentExecuteActions loading={false} onPreview={() => undefined} />,
        );

        expect(html).toContain("Preview Build (Dry Run)");
        expect(html).toContain("Execute Now");
        expect(html).toMatch(/<button[^>]*disabled[^>]*>Execute Now/);
        expect(html).toContain("Direct agent writes are disabled");
        expect(html).toContain("Operations Gateway");
    });
});
