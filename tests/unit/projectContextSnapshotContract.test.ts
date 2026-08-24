import { describe, expect, it } from "vitest";
import {
    PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE,
    PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
    type ProjectContextSnapshotDraft,
} from "@/lib/project-context-snapshots/contracts";
import {
    parseProjectContextSnapshotDraft,
    ProjectContextSnapshotValidationError,
    validateProjectContextSnapshotDraft,
} from "@/lib/project-context-snapshots/validation";

const FINGERPRINT = "a".repeat(64);

function validDraft(status: "FULL_CURRENT" | "PARTIAL" | "STALE" = "PARTIAL"): ProjectContextSnapshotDraft {
    return {
        schemaVersion: "project-context.v1",
        projectSlug: "arbor-project",
        generatedFromFingerprint: FINGERPRINT,
        publishedCorpusFingerprint: null,
        generatedAt: "2026-08-24T01:02:03.000Z",
        coverage: {
            status,
            manifestSourceCount: 3,
            authorityEligibleSourceCount: 1,
            authorityReadSourceCount: 1,
            excludedSourceRefs: [
                { sourceRef: "memory", authorityClass: "DERIVED_WORKING_MEMORY", reason: "Prior snapshot" },
                { sourceRef: "chat", authorityClass: "CONVERSATIONAL_HISTORY", reason: "Conversation context" },
            ],
            missingAuthoritySourceRefs: [],
            duplicateAuthoritySourceRefs: [],
            attachmentDisclosure: PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE,
        },
        currentState: [{ text: "Foundation complete", classification: "CONFIRMED", sourceRefs: ["authority"] }],
        currentObjective: [],
        completed: [],
        active: [],
        decisions: [],
        blockers: [],
        conflicts: [],
        unknowns: [{ text: "Launch date", classification: "UNKNOWN", missingEvidence: "Approved schedule" }],
        recordedNextAction: {
            text: "Review the contract",
            classification: "CONFIRMED",
            sourceRefs: ["authority"],
        },
        recommendedNextAction: {
            text: "Prepare the review packet",
            classification: "RECOMMENDATION",
            rationaleSourceRefs: ["memory"],
            disclaimer: PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
        },
        sourceRegistry: {
            authority: {
                sourceKind: "project_context",
                sourceId: "context-1",
                title: "Human context",
                authorityClass: "AUTHORITY_ELIGIBLE",
                declaredScope: "Human-authored configuration",
            },
            memory: {
                sourceKind: "project_context_snapshot",
                sourceId: "snapshot-1",
                title: "Prior snapshot",
                authorityClass: "DERIVED_WORKING_MEMORY",
                declaredScope: "Working-memory continuity only",
            },
            chat: {
                sourceKind: "conversational_history",
                sourceId: "conversation-1",
                title: "Conversation context",
                authorityClass: "CONVERSATIONAL_HISTORY",
                declaredScope: "Non-canonical conversation context",
            },
        },
        previousWorkingMemoryRefs: ["memory"],
    };
}

function clone(value: ProjectContextSnapshotDraft): Record<string, any> {
    return structuredClone(value) as Record<string, any>;
}

function rules(input: unknown): string[] {
    const result = validateProjectContextSnapshotDraft(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.rule);
}

describe("CTX3 Project Context snapshot contract validation", () => {
    it("accepts a minimal valid PARTIAL draft", () => {
        expect(validateProjectContextSnapshotDraft(validDraft("PARTIAL")).success).toBe(true);
    });

    it("accepts a valid FULL_CURRENT draft over all authority-eligible sources", () => {
        expect(validateProjectContextSnapshotDraft(validDraft("FULL_CURRENT")).success).toBe(true);
    });

    it("returns a named deterministic validation failure", () => {
        const input = clone(validDraft());
        input.schemaVersion = "project-context.v2";
        const result = validateProjectContextSnapshotDraft(input);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProjectContextSnapshotValidationError);
            expect(result.error.code).toBe("PROJECT_CONTEXT_SNAPSHOT_VALIDATION_FAILED");
            expect(result.error.issues).toEqual([{ path: "schemaVersion", rule: "STRUCTURE_INVALID" }]);
        }
    });

    it.each([
        ["wrong schema version", (input: Record<string, any>) => { input.schemaVersion = "project-context.v2"; }],
        ["malformed generated fingerprint", (input: Record<string, any>) => { input.generatedFromFingerprint = "A".repeat(64); }],
        ["client-provided published fingerprint", (input: Record<string, any>) => { input.publishedCorpusFingerprint = "b".repeat(64); }],
        ["invalid attachment disclosure", (input: Record<string, any>) => { input.coverage.attachmentDisclosure = "COMPLETE"; }],
        ["invalid enum", (input: Record<string, any>) => { input.coverage.status = "CURRENT"; }],
        ["invalid generated timestamp", (input: Record<string, any>) => { input.generatedAt = "August 24"; }],
        ["impossible generated date", (input: Record<string, any>) => { input.generatedAt = "2026-02-31T00:00:00Z"; }],
        ["unknown top-level field", (input: Record<string, any>) => { input.extra = true; }],
    ])("rejects %s", (_name, mutate) => {
        const input = clone(validDraft());
        mutate(input);
        expect(rules(input)).toContain("STRUCTURE_INVALID");
    });

    it("rejects a source reference absent from sourceRegistry", () => {
        const input = clone(validDraft());
        input.currentState[0].sourceRefs = ["missing"];
        expect(rules(input)).toContain("SOURCE_REF_MISSING");
    });

    it("rejects duplicate canonical source identity under another refId", () => {
        const input = clone(validDraft());
        input.sourceRegistry.alias = { ...input.sourceRegistry.authority };
        input.coverage.manifestSourceCount = 4;
        input.coverage.authorityEligibleSourceCount = 2;
        input.coverage.authorityReadSourceCount = 2;
        expect(rules(input)).toContain("CANONICAL_IDENTITY_DUPLICATE");
    });

    it.each([
        ["empty kind", "sourceKind", ""],
        ["empty id", "sourceId", "   "],
        ["outer whitespace in id", "sourceId", " context-1 "],
    ])("rejects malformed canonical identity: %s", (_name, field, value) => {
        const input = clone(validDraft());
        input.sourceRegistry.authority[field] = value;
        expect(rules(input)).toContain("STRUCTURE_INVALID");
    });

    it("accepts CONFIRMED evidence from an AUTHORITY_ELIGIBLE project_context", () => {
        expect(parseProjectContextSnapshotDraft(validDraft()).currentState[0].classification).toBe("CONFIRMED");
    });

    it("rejects CONFIRMED evidence backed only by DERIVED_WORKING_MEMORY", () => {
        const input = clone(validDraft());
        input.currentState[0].sourceRefs = ["memory"];
        expect(rules(input)).toContain("AUTHORITY_EVIDENCE_REQUIRED");
    });

    it("rejects CONFIRMED evidence backed only by CONVERSATIONAL_HISTORY", () => {
        const input = clone(validDraft());
        input.currentState[0].sourceRefs = ["chat"];
        expect(rules(input)).toContain("AUTHORITY_EVIDENCE_REQUIRED");
    });

    it("rejects project_context_snapshot classified as AUTHORITY_ELIGIBLE", () => {
        const input = clone(validDraft());
        input.sourceRegistry.memory.authorityClass = "AUTHORITY_ELIGIBLE";
        input.coverage.excludedSourceRefs[0].authorityClass = "AUTHORITY_ELIGIBLE";
        expect(rules(input)).toContain("SNAPSHOT_AUTHORITY_INVALID");
    });

    it("allows Human-authored project_context as AUTHORITY_ELIGIBLE", () => {
        expect(validateProjectContextSnapshotDraft(validDraft()).success).toBe(true);
    });

    it("rejects conversational_history with a non-conversational authority class", () => {
        const input = clone(validDraft());
        input.sourceRegistry.chat.authorityClass = "DERIVED_WORKING_MEMORY";
        input.coverage.excludedSourceRefs[1].authorityClass = "DERIVED_WORKING_MEMORY";
        expect(rules(input)).toContain("CONVERSATION_AUTHORITY_INVALID");
    });

    it("rejects manifest coverage reconciliation mismatch", () => {
        const input = clone(validDraft());
        input.coverage.manifestSourceCount = 99;
        expect(rules(input)).toContain("COVERAGE_RECONCILIATION_INVALID");
    });

    it("rejects authority read count greater than eligible count", () => {
        const input = clone(validDraft());
        input.coverage.authorityReadSourceCount = 2;
        expect(rules(input)).toContain("COVERAGE_RECONCILIATION_INVALID");
    });

    it("rejects FULL_CURRENT with missing authority sources", () => {
        const input = clone(validDraft("FULL_CURRENT"));
        input.coverage.missingAuthoritySourceRefs = ["authority"];
        expect(rules(input)).toContain("FULL_CURRENT_INCOMPLETE");
    });

    it("rejects FULL_CURRENT with duplicate authority sources", () => {
        const input = clone(validDraft("FULL_CURRENT"));
        input.coverage.duplicateAuthoritySourceRefs = ["authority"];
        expect(rules(input)).toContain("FULL_CURRENT_INCOMPLETE");
    });

    it("rejects missingAuthoritySourceRefs that do not point to an AUTHORITY_ELIGIBLE source", () => {
        const input = clone(validDraft());
        input.coverage.missingAuthoritySourceRefs = ["memory"];
        expect(rules(input)).toContain("COVERAGE_AUTHORITY_INVALID");
    });

    it("rejects duplicateAuthoritySourceRefs that do not point to an AUTHORITY_ELIGIBLE source", () => {
        const input = clone(validDraft());
        input.coverage.duplicateAuthoritySourceRefs = ["chat"];
        expect(rules(input)).toContain("COVERAGE_AUTHORITY_INVALID");
    });

    it("rejects an unexcluded non-authoritative manifest source", () => {
        const input = clone(validDraft());
        input.coverage.excludedSourceRefs = input.coverage.excludedSourceRefs.filter(
            (entry: { sourceRef: string }) => entry.sourceRef !== "chat",
        );
        input.coverage.manifestSourceCount = 2;
        expect(rules(input)).toContain("COVERAGE_AUTHORITY_INVALID");
    });

    it("allows an explicitly reasoned authority exclusion only for non-FULL coverage", () => {
        const input = clone(validDraft("PARTIAL"));
        input.sourceRegistry.unread = {
            sourceKind: "doc",
            sourceId: "doc-unread",
            title: "Unavailable authority",
            authorityClass: "AUTHORITY_ELIGIBLE",
            declaredScope: "Canonical document",
        };
        input.coverage.manifestSourceCount = 4;
        input.coverage.excludedSourceRefs.push({
            sourceRef: "unread",
            authorityClass: "AUTHORITY_ELIGIBLE",
            reason: "Source could not be read in this PARTIAL draft",
        });
        expect(validateProjectContextSnapshotDraft(input).success).toBe(true);
        input.coverage.status = "FULL_CURRENT";
        expect(rules(input)).toContain("FULL_CURRENT_INCOMPLETE");
    });

    it("accepts confirmed recordedNextAction with authority evidence", () => {
        expect(validateProjectContextSnapshotDraft(validDraft()).success).toBe(true);
    });

    it("rejects an invalid recordedNextAction classification", () => {
        const input = clone(validDraft());
        input.recordedNextAction.classification = "RECOMMENDATION";
        expect(rules(input)).toContain("STRUCTURE_INVALID");
    });

    it("rejects recommendedNextAction classified as anything except RECOMMENDATION", () => {
        const input = clone(validDraft());
        input.recommendedNextAction.classification = "CONFIRMED";
        expect(rules(input)).toContain("STRUCTURE_INVALID");
    });

    it("rejects an incorrect recommendation disclaimer", () => {
        const input = clone(validDraft());
        input.recommendedNextAction.disclaimer = "Approved recommendation";
        expect(rules(input)).toContain("STRUCTURE_INVALID");
    });

    it("allows recommendation rationale refs without upgrading the recommendation", () => {
        const parsed = parseProjectContextSnapshotDraft(validDraft());
        expect(parsed.recommendedNextAction.rationaleSourceRefs).toEqual(["memory"]);
        expect(parsed.recommendedNextAction.classification).toBe("RECOMMENDATION");
    });

    it("preserves competing conflict assertions", () => {
        const input = validDraft();
        input.conflicts = [{
            subject: "Current status",
            classification: "CONFLICT",
            assertions: [
                { text: "Ready", sourceRefs: ["authority"] },
                { text: "Not ready", sourceRefs: ["chat"] },
            ],
        }];
        const parsed = parseProjectContextSnapshotDraft(input);
        expect(parsed.conflicts[0].assertions.map((assertion) => assertion.text)).toEqual(["Ready", "Not ready"]);
    });

    it("rejects a conflict without competing assertions and evidence", () => {
        const input = clone(validDraft());
        input.conflicts = [{
            subject: "Current status",
            classification: "CONFLICT",
            assertions: [{ text: "Ready", sourceRefs: ["authority"] }],
        }];
        expect(rules(input)).toContain("CONFLICT_EVIDENCE_INSUFFICIENT");
    });

    it("allows AMBIGUITY without inventing a second assertion", () => {
        const input = validDraft();
        input.conflicts = [{
            subject: "Scope",
            classification: "AMBIGUITY",
            assertions: [{ text: "Scope wording is unclear", sourceRefs: [] }],
        }];
        expect(validateProjectContextSnapshotDraft(input).success).toBe(true);
    });

    it("rejects UNKNOWN without non-empty missingEvidence", () => {
        const input = clone(validDraft());
        input.unknowns[0].missingEvidence = "";
        expect(rules(input)).toContain("STRUCTURE_INVALID");
    });

    it("allows previousWorkingMemoryRefs pointing to derived snapshots", () => {
        expect(validateProjectContextSnapshotDraft(validDraft()).success).toBe(true);
    });

    it("rejects previousWorkingMemoryRefs pointing to authority sources", () => {
        const input = clone(validDraft());
        input.previousWorkingMemoryRefs = ["authority"];
        expect(rules(input)).toContain("PREVIOUS_MEMORY_AUTHORITY_INVALID");
    });

    it("rejects previous working memory used as canonical substantive evidence", () => {
        const input = clone(validDraft());
        input.currentState[0].sourceRefs = ["authority", "memory"];
        expect(rules(input)).toContain("PREVIOUS_MEMORY_USED_AS_CANONICAL_EVIDENCE");
    });

    it("rejects previous working memory reused as canonical evidence inside conflict assertions", () => {
        const input = clone(validDraft());
        input.conflicts = [{
            subject: "Current status",
            classification: "CONFLICT",
            assertions: [
                { text: "Ready", sourceRefs: ["authority"] },
                { text: "Not ready", sourceRefs: ["memory"] },
            ],
        }];
        expect(rules(input)).toContain("PREVIOUS_MEMORY_USED_AS_CANONICAL_EVIDENCE");
    });

    it("does not include substantive source text in validation errors", () => {
        const input = clone(validDraft());
        input.currentState[0].text = "sensitive-body";
        input.currentState[0].sourceRefs = ["missing"];
        const result = validateProjectContextSnapshotDraft(input);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.message).not.toContain("sensitive-body");
    });
});
