import {
    PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
    type ProjectContextConflict,
    type ProjectContextSubstantiveItem,
    type ValidatedProjectContextSnapshotDraft,
} from "./contracts";

export const PROJECT_CONTEXT_SNAPSHOT_SECTION_ORDER = [
    "Project Identity",
    "Current State",
    "Current Objective",
    "Completed / Closed Work",
    "Active Work",
    "Decisions in Force",
    "Blockers / Risks",
    "Open Questions / Conflicts",
    "Recorded Next Action",
    "Recommended Next Action",
    "Evidence",
    "Snapshot Metadata",
] as const;

function normalizeLineEndings(value: string): string {
    return value.replace(/\r\n?/g, "\n");
}

function compareCodeUnits(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function markdownInline(value: string): string {
    return normalizeLineEndings(value)
        .replace(/\\/g, "\\\\")
        .replace(/\|/g, "\\|")
        .replace(/\n/g, "<br>");
}

function sortedRefs(refs: readonly string[]): string {
    return [...refs].sort(compareCodeUnits).map(markdownInline).join(", ") || "none";
}

function renderSubstantiveItems(items: readonly ProjectContextSubstantiveItem[]): string[] {
    if (items.length === 0) return ["- None"];
    return items.map((item) =>
        `- **${item.classification}** — ${markdownInline(item.text)} _(Sources: ${sortedRefs(item.sourceRefs)})_`,
    );
}

function renderConflicts(conflicts: readonly ProjectContextConflict[]): string[] {
    const lines: string[] = [];
    for (const conflict of conflicts) {
        lines.push(`- **${conflict.classification}: ${markdownInline(conflict.subject)}**`);
        for (const assertion of conflict.assertions) {
            lines.push(`  - ${markdownInline(assertion.text)} _(Sources: ${sortedRefs(assertion.sourceRefs)})_`);
        }
    }
    return lines;
}

function section(title: typeof PROJECT_CONTEXT_SNAPSHOT_SECTION_ORDER[number], lines: string[]): string[] {
    return [`## ${title}`, "", ...lines, ""];
}

/** Pure renderer for a draft that has already passed strict validation. */
export function renderProjectContextSnapshotMarkdown(
    snapshot: ValidatedProjectContextSnapshotDraft,
): string {
    const output: string[] = [];

    output.push(...section("Project Identity", [
        `- Project slug: \`${markdownInline(snapshot.projectSlug)}\``,
        `- Schema version: \`${snapshot.schemaVersion}\``,
    ]));
    output.push(...section("Current State", renderSubstantiveItems(snapshot.currentState)));
    output.push(...section("Current Objective", renderSubstantiveItems(snapshot.currentObjective)));
    output.push(...section("Completed / Closed Work", renderSubstantiveItems(snapshot.completed)));
    output.push(...section("Active Work", renderSubstantiveItems(snapshot.active)));
    output.push(...section("Decisions in Force", renderSubstantiveItems(snapshot.decisions)));
    output.push(...section("Blockers / Risks", renderSubstantiveItems(snapshot.blockers)));

    const openLines = renderConflicts(snapshot.conflicts);
    for (const unknown of snapshot.unknowns) {
        openLines.push(
            `- **UNKNOWN** — ${markdownInline(unknown.text)} _(Missing evidence: ${markdownInline(unknown.missingEvidence)})_`,
        );
    }
    output.push(...section("Open Questions / Conflicts", openLines.length > 0 ? openLines : ["- None"]));

    output.push(...section("Recorded Next Action", [
        `- **${snapshot.recordedNextAction.classification}** — ${markdownInline(snapshot.recordedNextAction.text)} `
            + `_(Sources: ${sortedRefs(snapshot.recordedNextAction.sourceRefs)})_`,
    ]));
    output.push(...section("Recommended Next Action", [
        `- **RECOMMENDATION** — ${markdownInline(snapshot.recommendedNextAction.text)} `
            + `_(Rationale sources: ${sortedRefs(snapshot.recommendedNextAction.rationaleSourceRefs)})_`,
        `- ${PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER}`,
    ]));

    const evidenceLines = [
        "| refId | sourceKind | sourceId | title | authorityClass | declaredScope |",
        "| --- | --- | --- | --- | --- | --- |",
        ...Object.keys(snapshot.sourceRegistry).sort(compareCodeUnits).map((currentRef) => {
            const source = snapshot.sourceRegistry[currentRef];
            return `| ${markdownInline(currentRef)} | ${markdownInline(source.sourceKind)} | `
                + `${markdownInline(source.sourceId)} | ${markdownInline(source.title)} | `
                + `${source.authorityClass} | ${markdownInline(source.declaredScope)} |`;
        }),
    ];
    output.push(...section("Evidence", evidenceLines));

    output.push(...section("Snapshot Metadata", [
        `- Generated from fingerprint: \`${snapshot.generatedFromFingerprint}\``,
        `- Generated at: \`${snapshot.generatedAt}\``,
        `- Coverage status: \`${snapshot.coverage.status}\``,
        `- Manifest sources: ${snapshot.coverage.manifestSourceCount}`,
        `- Authority-eligible sources: ${snapshot.coverage.authorityEligibleSourceCount}`,
        `- Authority sources read: ${snapshot.coverage.authorityReadSourceCount}`,
        `- Attachment disclosure: \`${snapshot.coverage.attachmentDisclosure}\``,
        `- Previous working-memory refs: ${sortedRefs(snapshot.previousWorkingMemoryRefs)}`,
    ]));

    return `${output.join("\n").replace(/\n+$/g, "")}\n`;
}
