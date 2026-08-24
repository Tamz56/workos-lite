// ---------------------------------------------------------------------------
// WorkOS-Lite CTX3-I2D — Human-authorized Project Context Snapshot publication
// ---------------------------------------------------------------------------
// Bounded publication service. Human authority is established by the caller
// (route layer) via the shared human mutation guard; this service performs NO
// authentication. It accepts a structured project-context.v1 draft, validates
// it with the committed I2B validator, renders Markdown server-side with the
// I2B renderer, guards against stale corpus state, and publishes an immutable
// PUBLISHED snapshot version through one atomic immediate transaction.
//
// A snapshot remains DERIVED_WORKING_MEMORY even after Human approval. Human
// approval means "approved derived working-memory snapshot", never canonical
// proof or independent authority. That boundary is unchanged.
// ---------------------------------------------------------------------------
import type Database from "better-sqlite3";
import { createHash, randomUUID } from "crypto";
import {
    PROJECT_CONTEXT_SNAPSHOT_SCHEMA_VERSION,
    type ProjectContextSnapshotDraft,
} from "./contracts";
import { validateProjectContextSnapshotDraft } from "./validation";
import { renderProjectContextSnapshotMarkdown } from "./renderer";
import {
    PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE,
    type ProjectContextSourceIndexEntry,
} from "@/lib/project-curator/contracts";
import { collectCompleteProjectSourceEntries, loadProjectProfile, resolveProjectId } from "@/lib/project-curator/knowledgeIndex";
import { buildCorpusFingerprint } from "@/lib/ai-read/sourceIndexService";
import { canonicalJson, sha256Hex } from "@/lib/operations/canonicalization";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ProjectContextPublicationErrorCode =
    | "PROJECT_NOT_FOUND"
    | "INVALID_SNAPSHOT_DRAFT"
    | "SNAPSHOT_SOURCE_CORPUS_CHANGED"
    | "PUBLICATION_TRANSACTION_FAILED"
    | "FINGERPRINT_FINALIZATION_MISMATCH"
    | "PUBLICATION_IDEMPOTENCY_CONFLICT";

/** Deterministic, fail-closed publication error. */
export class ProjectContextPublicationError extends Error {
    readonly code: ProjectContextPublicationErrorCode;

    constructor(code: ProjectContextPublicationErrorCode, message: string) {
        super(message);
        this.name = "ProjectContextPublicationError";
        this.code = code;
    }
}

// ---------------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------------

export interface PublishProjectContextSnapshotInput {
    projectSlug: string;
    /** Structured project-context.v1 draft. `publishedCorpusFingerprint` must be null. */
    draft: unknown;
    /** Authenticated Human operator id (from the shared human mutation principal). */
    approvedBy: string;
    /** Server-controlled publication timestamp override (ISO 8601). */
    approvedAt?: string;
    /**
     * REQUIRED client/request publication-operation identity (bounded opaque
     * identifier). The immutable version id is derived deterministically from
     * (Project, authenticated Human operator, operationId): retrying the same
     * operation reconciles to the same version; a new operation publishes a
     * new version. Never used to derive Human identity (that comes from the
     * session).
     */
    operationId: string;
}

export interface PublishProjectContextSnapshotResult {
    versionId: string;
    containerId: string;
    corpusFingerprint: string;
    snapshotContentDigest: string;
    /** True when this call reconciled an existing publication (no new version). */
    replayed: boolean;
}

/**
 * Internal testability seam only. Production callers never supply this; the
 * default resolves the final READ1 manifest fingerprint via the committed I2C
 * collect + buildCorpusFingerprint path.
 */
export interface PublishProjectContextSnapshotDeps {
    finalManifestResolver?: (db: Database.Database, projectId: string) => string;
}

const MAX_OPERATION_ID_LENGTH = 128;

/**
 * Deterministic immutable publication version identity:
 * SHA-256 over canonical [projectId, operatorId, operationId].
 * Project-scoped AND Human-scoped by construction; never derived from the
 * caller-supplied version id (the caller supplies none).
 */
export function deriveSnapshotVersionId(projectId: string, operatorId: string, operationId: string): string {
    return sha256Hex(canonicalJson([projectId, operatorId, operationId]));
}

/** Pure CTX3 synthesis payload — no retry/idempotency bookkeeping. */
function synthesisPayload(draft: ProjectContextSnapshotDraft): unknown {
    return {
        currentState: draft.currentState,
        currentObjective: draft.currentObjective,
        completed: draft.completed,
        active: draft.active,
        decisions: draft.decisions,
        blockers: draft.blockers,
        conflicts: draft.conflicts,
        unknowns: draft.unknowns,
        recordedNextAction: draft.recordedNextAction,
        recommendedNextAction: draft.recommendedNextAction,
        sourceRegistry: draft.sourceRegistry,
        previousWorkingMemoryRefs: draft.previousWorkingMemoryRefs,
    };
}

function normalizeOperationId(raw: unknown): string {
    if (typeof raw !== "string") {
        throw new ProjectContextPublicationError(
            "INVALID_SNAPSHOT_DRAFT",
            "A publication operation id is required",
        );
    }
    if (raw !== raw.trim()) {
        throw new ProjectContextPublicationError(
            "INVALID_SNAPSHOT_DRAFT",
            "Publication operation id must not have outer whitespace",
        );
    }
    if (raw.length === 0 || raw.length > MAX_OPERATION_ID_LENGTH) {
        throw new ProjectContextPublicationError(
            "INVALID_SNAPSHOT_DRAFT",
            "Invalid publication operation id",
        );
    }
    return raw;
}

type PersistedVersionFields = {
    schema_version: string;
    project_slug: string;
    generated_from_fingerprint: string;
    generated_at: string;
    coverage_json: string;
    synthesis_json: string;
    rendered_markdown: string;
};

/**
 * Replay comparison over persisted domain-bearing fields using canonical
 * deterministic serialization. No client-supplied hash is trusted.
 */
function persistedMatchesInput(
    row: PersistedVersionFields,
    draft: ProjectContextSnapshotDraft,
    renderedMarkdown: string,
    coverageJson: string,
    synthesisJson: string,
): boolean {
    if (row.schema_version !== draft.schemaVersion) return false;
    if (row.project_slug !== draft.projectSlug) return false;
    if (row.generated_from_fingerprint !== draft.generatedFromFingerprint) return false;
    if (row.generated_at !== draft.generatedAt) return false;
    if (row.rendered_markdown !== renderedMarkdown) return false;
    try {
        if (canonicalJson(JSON.parse(row.coverage_json)) !== canonicalJson(JSON.parse(coverageJson))) return false;
        if (canonicalJson(JSON.parse(row.synthesis_json)) !== canonicalJson(JSON.parse(synthesisJson))) return false;
    } catch {
        return false;
    }
    return true;
}

const NULL_SENTINEL = "\u0000";
const FIELD_SEP = "\u0001";

/**
 * Deterministic snapshot-only index entry used ONLY for the prospective
 * fingerprint computation. Mirrors the I2C enumerator shape exactly:
 * sourceId = immutable version id, isDerivedContext=true, hasFullContent=true,
 * contentDigest = SHA-256 over the exact rendered Markdown bytes, and
 * publishedCorpusFingerprint deliberately absent from fingerprint material.
 */
function prospectiveSnapshotEntry(
    draft: ProjectContextSnapshotDraft,
    versionId: string,
    renderedMarkdown: string,
    approvedAt: string,
): ProjectContextSourceIndexEntry {
    const contentDigest = createHash("sha256").update(renderedMarkdown, "utf8").digest("hex");
    return {
        sourceKind: "project_context_snapshot",
        sourceId: versionId,
        title: PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE,
        status: "PUBLISHED",
        createdAt: draft.generatedAt,
        updatedAt: draft.generatedAt,
        hasFullContent: true,
        isDerivedContext: true,
        contentDigest,
        snapshotMetadata: {
            schemaVersion: PROJECT_CONTEXT_SNAPSHOT_SCHEMA_VERSION,
            generatedFromFingerprint: draft.generatedFromFingerprint,
            publishedCorpusFingerprint: null,
            generatedAt: draft.generatedAt,
            approvedAt,
        },
    };
}

/** Canonical digest string helper kept here for direct assertions. */
export function snapshotContentDigestOf(markdown: string): string {
    return createHash("sha256").update(markdown, "utf8").digest("hex");
}

/**
 * Publishes one Human-approved project context snapshot version.
 *
 * Logical transaction sequence (one atomic immediate transaction):
 *  1. resolve Project (caller already authorized)
 *  2. validate the structured draft with the I2B validator
 *  3. render deterministic Markdown server-side; compute content digest
 *  4. stale-draft guard: current READ1 corpus fingerprint must equal
 *     draft.generatedFromFingerprint
 *  5. ensure/get one snapshot container for the Project
 *  6. insert a NEW immutable version with publication_state=PUBLISHING
 *  7. compute the prospective corpus fingerprint Y (as if this version is
 *     current; the previous snapshot entry is replaced, not duplicated)
 *  8. finalize the version to PUBLISHED with published_corpus_fingerprint=Y
 *  9. move the container current pointer to the new version
 * 10. rebuild the ACTUAL READ1 manifest and assert it equals Y
 * 11. commit
 *
 * Any failure rolls back every write; no PUBLISHING row remains current.
 */
export function publishProjectContextSnapshot(
    db: Database.Database,
    input: PublishProjectContextSnapshotInput,
    deps: PublishProjectContextSnapshotDeps = {},
): PublishProjectContextSnapshotResult {
    let projectId: string;
    try {
        projectId = resolveProjectId(db, input.projectSlug);
    } catch {
        throw new ProjectContextPublicationError(
            "PROJECT_NOT_FOUND",
            `Project not found: ${input.projectSlug}`,
        );
    }
    const project = loadProjectProfile(db, projectId);

    if (!input.draft || typeof input.draft !== "object") {
        throw new ProjectContextPublicationError("INVALID_SNAPSHOT_DRAFT", "A structured CTX3 draft is required");
    }
    const validated = validateProjectContextSnapshotDraft(input.draft);
    if (!validated.success) {
        throw new ProjectContextPublicationError(
            "INVALID_SNAPSHOT_DRAFT",
            `Invalid snapshot draft: ${validated.error.message}`,
        );
    }
    const draft = validated.data;
    // Contract enforces publishedCorpusFingerprint=null; double-check fail-closed.
    if (draft.publishedCorpusFingerprint !== null) {
        throw new ProjectContextPublicationError(
            "INVALID_SNAPSHOT_DRAFT",
            "A client-provided published corpus fingerprint is not allowed",
        );
    }

    // Required publication-operation identity (never used for Human identity).
    const operationId = normalizeOperationId(input.operationId);

    // Server-side deterministic rendering + pure CTX3 domain JSON.
    const renderedMarkdown = renderProjectContextSnapshotMarkdown(draft);
    const snapshotContentDigest = snapshotContentDigestOf(renderedMarkdown);
    const coverageJson = JSON.stringify(draft.coverage);
    const synthesisJson = JSON.stringify(synthesisPayload(draft));

    // Deterministic immutable publication version identity.
    const versionId = deriveSnapshotVersionId(projectId, input.approvedBy, operationId);

    // Replay / conflict reconciliation MUST run BEFORE the stale-draft guard:
    // an ambiguous retry carries the ORIGINAL generatedFromFingerprint while
    // the current corpus has already moved, so it must reconcile, not fail stale.
    const existing = db
        .prepare(
            `SELECT schema_version, project_slug, generated_from_fingerprint, generated_at,
                    coverage_json, synthesis_json, rendered_markdown, snapshot_id,
                    published_corpus_fingerprint
             FROM project_context_snapshot_versions
             WHERE id = ?`,
        )
        .get(versionId) as
        | (PersistedVersionFields & { snapshot_id: string; published_corpus_fingerprint: string | null })
        | undefined;
    if (existing) {
        if (!persistedMatchesInput(existing, draft, renderedMarkdown, coverageJson, synthesisJson)) {
            throw new ProjectContextPublicationError(
                "PUBLICATION_IDEMPOTENCY_CONFLICT",
                "Operation id reused with a different publication input",
            );
        }
        if (existing.published_corpus_fingerprint === null) {
            throw new ProjectContextPublicationError(
                "PUBLICATION_TRANSACTION_FAILED",
                "Operation is not in a published state",
            );
        }
        return {
            versionId,
            containerId: existing.snapshot_id,
            corpusFingerprint: existing.published_corpus_fingerprint,
            snapshotContentDigest: snapshotContentDigestOf(existing.rendered_markdown),
            replayed: true,
        };
    }

    // Stale-draft guard runs only when the operation has NOT already committed.
    const { entries } = collectCompleteProjectSourceEntries(db, projectId, { includeArchivedLoops: true });
    const currentCorpusFingerprint = buildCorpusFingerprint(entries);
    if (currentCorpusFingerprint !== draft.generatedFromFingerprint) {
        throw new ProjectContextPublicationError(
            "SNAPSHOT_SOURCE_CORPUS_CHANGED",
            "Snapshot was generated from a different corpus state",
        );
    }

    const approvedAt = input.approvedAt ?? new Date().toISOString();

    const resolveFinalFingerprint =
        deps.finalManifestResolver ??
        ((dbArg: Database.Database, pid: string): string => {
            const actual = collectCompleteProjectSourceEntries(dbArg, pid, { includeArchivedLoops: true });
            return buildCorpusFingerprint(actual.entries);
        });

    try {
        return db.transaction(() => {
            // 5. ensure/get one snapshot container for the Project
            let container = db
                .prepare(
                    "SELECT id, current_version_id FROM project_context_snapshots WHERE project_id = ?",
                )
                .get(projectId) as { id: string; current_version_id: string | null } | undefined;
            if (!container) {
                const containerId = `sc-${randomUUID()}`;
                db.prepare(
                    "INSERT INTO project_context_snapshots (id, project_id, current_version_id) VALUES (?, ?, NULL)",
                ).run(containerId, projectId);
                container = { id: containerId, current_version_id: null };
            }

            // 6. insert immutable version (deterministic id) with PUBLISHING state
            db.prepare(
                `INSERT INTO project_context_snapshot_versions (
                   id, snapshot_id, schema_version, project_slug, generated_from_fingerprint,
                   published_corpus_fingerprint, coverage_json, synthesis_json, rendered_markdown,
                   generated_at, approved_at, approved_by, publication_state
                 ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'PUBLISHING')`,
            ).run(
                versionId,
                container.id,
                PROJECT_CONTEXT_SNAPSHOT_SCHEMA_VERSION,
                project.slug,
                draft.generatedFromFingerprint,
                coverageJson,
                synthesisJson,
                renderedMarkdown,
                draft.generatedAt,
                approvedAt,
                input.approvedBy,
            );

            // 7. prospective corpus fingerprint Y (replace any prior snapshot entry)
            const prospectiveEntry = prospectiveSnapshotEntry(draft, versionId, renderedMarkdown, approvedAt);
            const entriesWithoutSnapshot = entries.filter(
                (entry) => entry.sourceKind !== "project_context_snapshot",
            );
            const prospectiveY = buildCorpusFingerprint([...entriesWithoutSnapshot, prospectiveEntry]);

            // 8. finalize version (PUBLISHED + publishedCorpusFingerprint=Y)
            db.prepare(
                "UPDATE project_context_snapshot_versions SET publication_state = 'PUBLISHED', published_corpus_fingerprint = ? WHERE id = ?",
            ).run(prospectiveY, versionId);

            // 9. move current pointer
            db.prepare(
                "UPDATE project_context_snapshots SET current_version_id = ? WHERE id = ?",
            ).run(versionId, container.id);

            // 10. rebuild actual READ1 manifest and assert == Y (internal seam)
            const actualFingerprint = resolveFinalFingerprint(db, projectId);
            if (actualFingerprint !== prospectiveY) {
                throw new ProjectContextPublicationError(
                    "FINGERPRINT_FINALIZATION_MISMATCH",
                    "Published corpus fingerprint did not finalize as expected",
                );
            }

            return {
                versionId,
                containerId: container.id,
                corpusFingerprint: actualFingerprint,
                snapshotContentDigest,
                replayed: false,
            };
        })();
    } catch (error) {
        if (error instanceof ProjectContextPublicationError) throw error;
        const detail = error instanceof Error ? error.message : String(error);
        throw new ProjectContextPublicationError(
            "PUBLICATION_TRANSACTION_FAILED",
            `Snapshot publication failed: ${detail}`,
        );
    }
}
