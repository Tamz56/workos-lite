import { z } from "zod";
import {
    PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE,
    PROJECT_CONTEXT_AUTHORITY_CLASSES,
    PROJECT_CONTEXT_COVERAGE_STATUSES,
    PROJECT_CONTEXT_EVIDENCE_CLASSIFICATIONS,
    PROJECT_CONTEXT_RECOMMENDATION_CLASSIFICATION,
    PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
    PROJECT_CONTEXT_SNAPSHOT_SCHEMA_VERSION,
    type ProjectContextSnapshotDraft,
    type ValidatedProjectContextSnapshotDraft,
} from "./contracts";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

function isValidRfc3339(value: string): boolean {
    const match = RFC3339_PATTERN.exec(value);
    if (!match) return false;
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
    const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
    if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
    if (offsetHour > 23 || offsetMinute > 59) return false;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day >= 1 && day <= daysInMonth && Number.isFinite(Date.parse(value));
}

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, "must not be empty");
const refId = nonEmptyString.refine((value) => value === value.trim(), "must not have outer whitespace");
const sourceIdentity = nonEmptyString.refine(
    (value) => value === value.trim(),
    "canonical source identity must not have outer whitespace",
);
const sourceRefs = z.array(refId);

const substantiveItemSchema = z.object({
    text: nonEmptyString,
    classification: z.enum(PROJECT_CONTEXT_EVIDENCE_CLASSIFICATIONS),
    sourceRefs,
}).strict();

const conflictAssertionSchema = z.object({
    text: nonEmptyString,
    sourceRefs,
}).strict();

const sourceRegistryEntrySchema = z.object({
    sourceKind: sourceIdentity,
    sourceId: sourceIdentity,
    title: nonEmptyString,
    authorityClass: z.enum(PROJECT_CONTEXT_AUTHORITY_CLASSES),
    declaredScope: nonEmptyString,
}).strict();

const snapshotDraftSchema = z.object({
    schemaVersion: z.literal(PROJECT_CONTEXT_SNAPSHOT_SCHEMA_VERSION),
    projectSlug: sourceIdentity,
    generatedFromFingerprint: z.string().regex(SHA256_PATTERN, "must be a lowercase SHA-256"),
    publishedCorpusFingerprint: z.null(),
    generatedAt: z.string().refine(
        isValidRfc3339,
        "must be an explicit valid RFC 3339 timestamp",
    ),
    coverage: z.object({
        status: z.enum(PROJECT_CONTEXT_COVERAGE_STATUSES),
        manifestSourceCount: z.number().int().nonnegative(),
        authorityEligibleSourceCount: z.number().int().nonnegative(),
        authorityReadSourceCount: z.number().int().nonnegative(),
        excludedSourceRefs: z.array(z.object({
            sourceRef: refId,
            authorityClass: z.enum(PROJECT_CONTEXT_AUTHORITY_CLASSES),
            reason: nonEmptyString,
        }).strict()),
        missingAuthoritySourceRefs: sourceRefs,
        duplicateAuthoritySourceRefs: sourceRefs,
        attachmentDisclosure: z.literal(PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE),
    }).strict(),
    currentState: z.array(substantiveItemSchema),
    currentObjective: z.array(substantiveItemSchema),
    completed: z.array(substantiveItemSchema),
    active: z.array(substantiveItemSchema),
    decisions: z.array(substantiveItemSchema),
    blockers: z.array(substantiveItemSchema),
    conflicts: z.array(z.object({
        subject: nonEmptyString,
        classification: z.enum(["CONFLICT", "AMBIGUITY"]),
        assertions: z.array(conflictAssertionSchema).min(1),
    }).strict()),
    unknowns: z.array(z.object({
        text: nonEmptyString,
        classification: z.literal("UNKNOWN"),
        missingEvidence: nonEmptyString,
    }).strict()),
    recordedNextAction: substantiveItemSchema,
    recommendedNextAction: z.object({
        text: nonEmptyString,
        classification: z.literal(PROJECT_CONTEXT_RECOMMENDATION_CLASSIFICATION),
        rationaleSourceRefs: sourceRefs,
        disclaimer: z.literal(PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER),
    }).strict(),
    sourceRegistry: z.record(refId, sourceRegistryEntrySchema),
    previousWorkingMemoryRefs: sourceRefs,
}).strict();

export type ProjectContextSnapshotValidationRule =
    | "STRUCTURE_INVALID"
    | "SOURCE_REF_MISSING"
    | "SOURCE_REF_DUPLICATE"
    | "CANONICAL_IDENTITY_DUPLICATE"
    | "AUTHORITY_EVIDENCE_REQUIRED"
    | "SNAPSHOT_AUTHORITY_INVALID"
    | "CONVERSATION_AUTHORITY_INVALID"
    | "CONFLICT_EVIDENCE_INSUFFICIENT"
    | "PREVIOUS_MEMORY_AUTHORITY_INVALID"
    | "PREVIOUS_MEMORY_USED_AS_CANONICAL_EVIDENCE"
    | "COVERAGE_RECONCILIATION_INVALID"
    | "COVERAGE_AUTHORITY_INVALID"
    | "FULL_CURRENT_INCOMPLETE";

export interface ProjectContextSnapshotValidationIssue {
    path: string;
    rule: ProjectContextSnapshotValidationRule;
    refId?: string;
}

export class ProjectContextSnapshotValidationError extends Error {
    readonly code = "PROJECT_CONTEXT_SNAPSHOT_VALIDATION_FAILED" as const;

    constructor(readonly issues: readonly ProjectContextSnapshotValidationIssue[]) {
        super(issues.map((issue) => `${issue.path}: ${issue.rule}${issue.refId ? ` (${issue.refId})` : ""}`).join("; "));
        this.name = "ProjectContextSnapshotValidationError";
    }
}

export type ProjectContextSnapshotValidationResult =
    | { success: true; data: ValidatedProjectContextSnapshotDraft }
    | { success: false; error: ProjectContextSnapshotValidationError };

function sortedIssues(issues: ProjectContextSnapshotValidationIssue[]): ProjectContextSnapshotValidationIssue[] {
    return issues.sort((a, b) =>
        compareCodeUnits(a.path, b.path)
        || compareCodeUnits(a.rule, b.rule)
        || compareCodeUnits(a.refId ?? "", b.refId ?? ""),
    );
}

function compareCodeUnits(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function structuralIssues(error: z.ZodError): ProjectContextSnapshotValidationIssue[] {
    return error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "$",
        rule: "STRUCTURE_INVALID",
    }));
}

function canonicalIdentity(sourceKind: string, sourceId: string): string {
    return JSON.stringify([sourceKind, sourceId]);
}

function semanticIssues(draft: ProjectContextSnapshotDraft): ProjectContextSnapshotValidationIssue[] {
    const issues: ProjectContextSnapshotValidationIssue[] = [];
    const registryRefs = Object.keys(draft.sourceRegistry).sort();
    const canonicalIdentities = new Map<string, string>();
    const previousMemory = new Set(draft.previousWorkingMemoryRefs);

    const add = (path: string, rule: ProjectContextSnapshotValidationRule, safeRefId?: string): void => {
        issues.push({ path, rule, ...(safeRefId ? { refId: safeRefId } : {}) });
    };
    const resolve = (value: string, path: string) => {
        const source = draft.sourceRegistry[value];
        if (!source) add(path, "SOURCE_REF_MISSING", value);
        return source;
    };
    const checkRefList = (refs: string[], path: string): void => {
        const seen = new Set<string>();
        refs.forEach((value, index) => {
            resolve(value, `${path}.${index}`);
            if (seen.has(value)) add(`${path}.${index}`, "SOURCE_REF_DUPLICATE", value);
            seen.add(value);
        });
    };
    const checkCanonicalEvidence = (
        item: { classification: string; sourceRefs: string[] },
        path: string,
    ): void => {
        checkRefList(item.sourceRefs, `${path}.sourceRefs`);
        if (item.classification === "CONFIRMED") {
            const hasAuthority = item.sourceRefs.some(
                (value) => draft.sourceRegistry[value]?.authorityClass === "AUTHORITY_ELIGIBLE",
            );
            if (!hasAuthority) add(path, "AUTHORITY_EVIDENCE_REQUIRED");
        }
        item.sourceRefs.forEach((value, index) => {
            if (previousMemory.has(value)) {
                add(`${path}.sourceRefs.${index}`, "PREVIOUS_MEMORY_USED_AS_CANONICAL_EVIDENCE", value);
            }
        });
    };

    for (const currentRef of registryRefs) {
        const source = draft.sourceRegistry[currentRef];
        const identity = canonicalIdentity(source.sourceKind, source.sourceId);
        const firstRef = canonicalIdentities.get(identity);
        if (firstRef) add(`sourceRegistry.${currentRef}`, "CANONICAL_IDENTITY_DUPLICATE", currentRef);
        else canonicalIdentities.set(identity, currentRef);

        if (source.sourceKind === "project_context_snapshot" && source.authorityClass !== "DERIVED_WORKING_MEMORY") {
            add(`sourceRegistry.${currentRef}.authorityClass`, "SNAPSHOT_AUTHORITY_INVALID", currentRef);
        }
        if (source.sourceKind === "conversational_history" && source.authorityClass !== "CONVERSATIONAL_HISTORY") {
            add(`sourceRegistry.${currentRef}.authorityClass`, "CONVERSATION_AUTHORITY_INVALID", currentRef);
        }
    }

    const substantiveCollections = [
        "currentState",
        "currentObjective",
        "completed",
        "active",
        "decisions",
        "blockers",
    ] as const;
    for (const collection of substantiveCollections) {
        draft[collection].forEach((item, index) => checkCanonicalEvidence(item, `${collection}.${index}`));
    }
    checkCanonicalEvidence(draft.recordedNextAction, "recordedNextAction");

    draft.conflicts.forEach((conflict, conflictIndex) => {
        const path = `conflicts.${conflictIndex}`;
        const assertionTexts = new Set<string>();
        const evidenceRefs = new Set<string>();
        conflict.assertions.forEach((assertion, assertionIndex) => {
            checkRefList(assertion.sourceRefs, `${path}.assertions.${assertionIndex}.sourceRefs`);
            assertion.sourceRefs.forEach((value) => evidenceRefs.add(value));
            assertionTexts.add(assertion.text);
            assertion.sourceRefs.forEach((value, refIndex) => {
                if (previousMemory.has(value)) {
                    add(
                        `${path}.assertions.${assertionIndex}.sourceRefs.${refIndex}`,
                        "PREVIOUS_MEMORY_USED_AS_CANONICAL_EVIDENCE",
                        value,
                    );
                }
            });
        });
        if (conflict.classification === "CONFLICT" && (
            conflict.assertions.length < 2
            || assertionTexts.size < 2
            || evidenceRefs.size < 2
            || conflict.assertions.some((assertion) => assertion.sourceRefs.length === 0)
        )) {
            add(path, "CONFLICT_EVIDENCE_INSUFFICIENT");
        }
    });

    checkRefList(draft.recommendedNextAction.rationaleSourceRefs, "recommendedNextAction.rationaleSourceRefs");
    checkRefList(draft.previousWorkingMemoryRefs, "previousWorkingMemoryRefs");
    draft.previousWorkingMemoryRefs.forEach((value, index) => {
        if (draft.sourceRegistry[value]?.authorityClass !== "DERIVED_WORKING_MEMORY") {
            add(`previousWorkingMemoryRefs.${index}`, "PREVIOUS_MEMORY_AUTHORITY_INVALID", value);
        }
    });

    const coverage = draft.coverage;
    const excludedRefs = coverage.excludedSourceRefs.map((entry) => entry.sourceRef);
    checkRefList(excludedRefs, "coverage.excludedSourceRefs");
    checkRefList(coverage.missingAuthoritySourceRefs, "coverage.missingAuthoritySourceRefs");
    checkRefList(coverage.duplicateAuthoritySourceRefs, "coverage.duplicateAuthoritySourceRefs");
    const excludedSet = new Set(excludedRefs);

    coverage.excludedSourceRefs.forEach((excluded, index) => {
        const source = draft.sourceRegistry[excluded.sourceRef];
        if (source && source.authorityClass !== excluded.authorityClass) {
            add(`coverage.excludedSourceRefs.${index}.authorityClass`, "COVERAGE_AUTHORITY_INVALID", excluded.sourceRef);
        }
        if (excluded.authorityClass === "AUTHORITY_ELIGIBLE" && coverage.status === "FULL_CURRENT") {
            add(`coverage.excludedSourceRefs.${index}`, "FULL_CURRENT_INCOMPLETE", excluded.sourceRef);
        }
    });

    const eligibleRefs = registryRefs.filter((value) =>
        !excludedSet.has(value) && draft.sourceRegistry[value].authorityClass === "AUTHORITY_ELIGIBLE",
    );
    for (const currentRef of registryRefs) {
        if (!excludedSet.has(currentRef) && draft.sourceRegistry[currentRef].authorityClass !== "AUTHORITY_ELIGIBLE") {
            add(`sourceRegistry.${currentRef}`, "COVERAGE_AUTHORITY_INVALID", currentRef);
        }
    }
    for (const [field, refs] of [
        ["missingAuthoritySourceRefs", coverage.missingAuthoritySourceRefs],
        ["duplicateAuthoritySourceRefs", coverage.duplicateAuthoritySourceRefs],
    ] as const) {
        refs.forEach((value, index) => {
            if (!eligibleRefs.includes(value)) {
                add(`coverage.${field}.${index}`, "COVERAGE_AUTHORITY_INVALID", value);
            }
        });
    }

    if (
        coverage.manifestSourceCount !== coverage.authorityEligibleSourceCount + excludedRefs.length
        || coverage.manifestSourceCount !== registryRefs.length
        || coverage.authorityEligibleSourceCount !== eligibleRefs.length
        || coverage.authorityReadSourceCount > coverage.authorityEligibleSourceCount
    ) {
        add("coverage", "COVERAGE_RECONCILIATION_INVALID");
    }
    if (coverage.status === "FULL_CURRENT" && (
        coverage.authorityReadSourceCount !== coverage.authorityEligibleSourceCount
        || coverage.missingAuthoritySourceRefs.length > 0
        || coverage.duplicateAuthoritySourceRefs.length > 0
    )) {
        add("coverage", "FULL_CURRENT_INCOMPLETE");
    }

    return sortedIssues(issues);
}

export function validateProjectContextSnapshotDraft(input: unknown): ProjectContextSnapshotValidationResult {
    const parsed = snapshotDraftSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: new ProjectContextSnapshotValidationError(sortedIssues(structuralIssues(parsed.error))),
        };
    }
    const draft = parsed.data as ProjectContextSnapshotDraft;
    const issues = semanticIssues(draft);
    if (issues.length > 0) {
        return { success: false, error: new ProjectContextSnapshotValidationError(issues) };
    }
    return { success: true, data: draft as ValidatedProjectContextSnapshotDraft };
}

export function parseProjectContextSnapshotDraft(input: unknown): ValidatedProjectContextSnapshotDraft {
    const result = validateProjectContextSnapshotDraft(input);
    if (!result.success) throw result.error;
    return result.data;
}
