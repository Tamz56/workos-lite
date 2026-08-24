import { describe, expect, it } from "vitest";
import {
    PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE,
    PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
    type ProjectContextSnapshotDraft,
} from "@/lib/project-context-snapshots/contracts";
import {
    PROJECT_CONTEXT_SNAPSHOT_SECTION_ORDER,
    renderProjectContextSnapshotMarkdown,
} from "@/lib/project-context-snapshots/renderer";
import { parseProjectContextSnapshotDraft } from "@/lib/project-context-snapshots/validation";

function rendererDraft(): ProjectContextSnapshotDraft {
    return {
        schemaVersion: "project-context.v1",
        projectSlug: "renderer-project",
        generatedFromFingerprint: "c".repeat(64),
        publishedCorpusFingerprint: null,
        generatedAt: "2026-08-24T04:05:06.000Z",
        coverage: {
            status: "FULL_CURRENT",
            manifestSourceCount: 2,
            authorityEligibleSourceCount: 1,
            authorityReadSourceCount: 1,
            excludedSourceRefs: [{
                sourceRef: "z-memory",
                authorityClass: "DERIVED_WORKING_MEMORY",
                reason: "Previous working memory",
            }],
            missingAuthoritySourceRefs: [],
            duplicateAuthoritySourceRefs: [],
            attachmentDisclosure: PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE,
        },
        currentState: [{
            text: "Line one\r\nLine two",
            classification: "CONFIRMED",
            sourceRefs: ["a-authority"],
        }],
        currentObjective: [],
        completed: [],
        active: [],
        decisions: [],
        blockers: [],
        conflicts: [],
        unknowns: [],
        recordedNextAction: {
            text: "Review",
            classification: "CONFIRMED",
            sourceRefs: ["a-authority"],
        },
        recommendedNextAction: {
            text: "Prepare follow-up",
            classification: "RECOMMENDATION",
            rationaleSourceRefs: ["z-memory", "a-authority"],
            disclaimer: PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
        },
        sourceRegistry: {
            "z-memory": {
                sourceKind: "project_context_snapshot",
                sourceId: "snapshot-z",
                title: "Earlier memory",
                authorityClass: "DERIVED_WORKING_MEMORY",
                declaredScope: "Continuity only",
            },
            "a-authority": {
                sourceKind: "doc",
                sourceId: "doc-a",
                title: "Canonical title",
                authorityClass: "AUTHORITY_ELIGIBLE",
                declaredScope: "Canonical implementation record",
            },
        },
        previousWorkingMemoryRefs: ["z-memory"],
    };
}

describe("CTX3 deterministic Project Context snapshot renderer", () => {
    it("renders identical validated input byte-identically", () => {
        const parsed = parseProjectContextSnapshotDraft(rendererDraft());
        expect(renderProjectContextSnapshotMarkdown(parsed)).toBe(renderProjectContextSnapshotMarkdown(parsed));
    });

    it("renders the fixed conceptual section order", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        const positions = PROJECT_CONTEXT_SNAPSHOT_SECTION_ORDER.map((title) => markdown.indexOf(`## ${title}`));
        expect(positions.every((position) => position >= 0)).toBe(true);
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it("sorts evidence by refId independent of registry insertion order", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(markdown.indexOf("| a-authority | doc | doc-a |"))
            .toBeLessThan(markdown.indexOf("| z-memory | project_context_snapshot | snapshot-z |"));
    });

    it("sorts compact source refs by code-unit order", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(markdown).toContain("Rationale sources: a-authority, z-memory");
    });

    it("normalizes all rendered line endings to LF", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(markdown).not.toContain("\r");
        expect(markdown).toContain("Line one<br>Line two");
        expect(markdown.endsWith("\n")).toBe(true);
    });

    it("always renders the exact derived-recommendation disclaimer", () => {
        const parsed = parseProjectContextSnapshotDraft(rendererDraft());
        (parsed.recommendedNextAction as { disclaimer: string }).disclaimer = "Caller replacement";
        const markdown = renderProjectContextSnapshotMarkdown(parsed);
        expect(markdown).toContain(PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER);
        expect(markdown).not.toContain("Caller replacement");
    });

    it("displays canonical sourceKind and sourceId alongside title", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(markdown).toContain("| a-authority | doc | doc-a | Canonical title |");
        expect(markdown).toContain("| refId | sourceKind | sourceId | title | authorityClass | declaredScope |");
    });

    it("does not render publishedCorpusFingerprint into digest-bearing Markdown", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(markdown).not.toContain("publishedCorpusFingerprint");
        expect(markdown).not.toContain("Published corpus fingerprint");
    });

    it("uses only the supplied generatedAt timestamp", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(markdown).toContain("2026-08-24T04:05:06.000Z");
        expect(markdown.match(/Generated at:/g)).toHaveLength(1);
    });

    it("adds no random identifier or current-time material", () => {
        const first = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        const second = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(first).toBe(second);
        expect(first).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    });

    it("renders empty state sections explicitly without chronological filler", () => {
        const markdown = renderProjectContextSnapshotMarkdown(parseProjectContextSnapshotDraft(rendererDraft()));
        expect(markdown).toContain("## Current Objective\n\n- None");
        expect(markdown).not.toContain("Timeline");
        expect(markdown).not.toContain("History");
    });
});
