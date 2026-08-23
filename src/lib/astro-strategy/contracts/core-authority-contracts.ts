// src/lib/astro-strategy/contracts/core-authority-contracts.ts
/**
 * ASTRO-SCHEMA-001 — Core Executable Authority Contract Baseline
 *
 * This module establishes the foundational executable TypeScript interfaces
 * and Zod validation schemas for the frozen Astro authority chain:
 * 1. Time-State & Calculation Context (ASTRO-ARCH-001 / ASTRO-CALC-001)
 * 2. Canonical Identity Reference (ASTRO-TAXONOMY-001)
 * 3. Source Register Reference / Boundary (ASTRO-SOURCE-001)
 * 4. Calculation Snapshot (ASTRO-CALC-001)
 * 5. Calculation Validation Record (ASTRO-VALID-001)
 *
 * Layer Separation Invariants:
 * Canonical Identity != Source Record != Calculation Snapshot != Validation Record
 *
 * Data Fidelity & Non-Normalization Invariants:
 * No silent data mutation, normalization, coercion, defaulting, or trimming is performed.
 * Inputs are validated byte-for-byte without transformation.
 *
 * Vocabulary Governance:
 * All explicitly deferred vocabularies (validation statuses, validation scope types,
 * taxonomy categories, source lifecycle statuses, authority roles) are maintained as
 * DEFERRED_OPEN strings to avoid prematurely freezing downstream policy in code.
 */

import { z } from "zod";

export const ASTRO_CORE_SCHEMA_VERSION = "astro-core-contracts-v0.2";

// ============================================================================
// 0. Provenance Data Boundary (ASTRO-SCHEMA-002)
// ============================================================================

/**
 * Executable Astro provenance is DATA-ONLY JSON-compatible recursive data.
 * Runtime/executable objects are prohibited.
 */
export type ProvenanceValue =
  | null
  | boolean
  | number
  | string
  | ProvenanceValue[]
  | { [key: string]: ProvenanceValue };

export type ProvenanceRecord = Record<string, ProvenanceValue>;

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (typeof val !== "object" || val === null) {
    return false;
  }
  return Object.getPrototypeOf(val) === Object.prototype;
}

function validateProvenanceValue(val: unknown, ancestors: Set<object>): boolean {
  if (val === null) {
    return true;
  }
  if (typeof val === "boolean") {
    return true;
  }
  if (typeof val === "string") {
    return true;
  }
  if (typeof val === "number") {
    return Number.isFinite(val);
  }
  if (typeof val !== "object") {
    // Reject undefined, function, symbol, bigint
    return false;
  }

  // At this point, typeof val === "object" and val !== null
  // Recursion-path-aware cycle detection:
  // Repeated-but-acyclic shared input references are allowed,
  // but any reference that appears in the active ancestor stack is a cycle.
  if (ancestors.has(val)) {
    return false;
  }

  if (Array.isArray(val)) {
    // Array prototype check: must be direct Array.prototype
    if (Object.getPrototypeOf(val) !== Array.prototype) {
      return false;
    }
    // No symbol keys/properties
    if (Object.getOwnPropertySymbols(val).length > 0) {
      return false;
    }
    // No extra semantic array properties; only integer indices and "length"
    const propNames = Object.getOwnPropertyNames(val);
    const len = val.length;
    if (propNames.length !== len + 1) {
      return false;
    }

    ancestors.add(val);
    try {
      for (let i = 0; i < len; i++) {
        const desc = Object.getOwnPropertyDescriptor(val, String(i));
        if (!desc) {
          // Sparse array hole
          return false;
        }
        // Accessor rejection without invoking getters/setters
        if (desc.get !== undefined || desc.set !== undefined) {
          return false;
        }
        if (!desc.enumerable) {
          return false;
        }
        if (desc.value === undefined) {
          return false;
        }
        if (!validateProvenanceValue(desc.value, ancestors)) {
          return false;
        }
      }
    } finally {
      ancestors.delete(val);
    }
    return true;
  }

  if (isPlainObject(val)) {
    // No symbol keys
    if (Object.getOwnPropertySymbols(val).length > 0) {
      return false;
    }

    const descriptors = Object.getOwnPropertyDescriptors(val);
    const keys = Object.keys(descriptors);
    const allPropNames = Object.getOwnPropertyNames(val);
    // Ensure all own property names are enumerable (no non-enumerable semantic payload)
    if (allPropNames.length !== keys.length) {
      return false;
    }

    ancestors.add(val);
    try {
      for (const key of keys) {
        const desc = descriptors[key];
        // Accessor rejection without invoking getters/setters
        if (desc.get !== undefined || desc.set !== undefined) {
          return false;
        }
        if (!desc.enumerable) {
          return false;
        }
        if (desc.value === undefined) {
          return false;
        }
        if (!validateProvenanceValue(desc.value, ancestors)) {
          return false;
        }
      }
    } finally {
      ancestors.delete(val);
    }
    return true;
  }

  // Custom prototypes, class instances, boxed primitives, Date, Map, Set, RegExp, Error, Promise, ArrayBuffer, etc.
  return false;
}

function validateProvenanceRecord(val: unknown, ancestors: Set<object>): boolean {
  if (typeof val !== "object" || val === null || Array.isArray(val)) {
    return false;
  }
  if (!isPlainObject(val)) {
    return false;
  }
  return validateProvenanceValue(val, ancestors);
}

export const ProvenanceValueSchema: z.ZodType<ProvenanceValue> = z.custom<ProvenanceValue>(
  (val) => validateProvenanceValue(val, new Set()),
  {
    message: "Invalid ProvenanceValue: must be JSON-compatible recursive data without runtime/executable objects",
  }
);

export const ProvenanceRecordSchema: z.ZodType<ProvenanceRecord> = z.custom<ProvenanceRecord>(
  (val) => validateProvenanceRecord(val, new Set()),
  {
    message: "Invalid ProvenanceRecord: must be a plain string-keyed object containing only ProvenanceValue values",
  }
);

/**
 * Non-empty, non-whitespace-only string validator.
 * Validates that the input contains at least one non-whitespace character,
 * without transforming, trimming, coercing, or modifying the input value.
 */
const NonEmptyString = z
  .string()
  .min(1)
  .refine((val) => val.trim().length > 0, {
    message: "String must contain at least one non-whitespace character",
  });

// ============================================================================
// 1. Time-State & Calculation Context Contracts (ASTRO-ARCH-001 / ASTRO-CALC-001)
// ============================================================================

/**
 * Observer Location Context (ASTRO-ARCH-001 Section 6.2, ASTRO-CALC-001 Section 14)
 */
export const ObserverLocationSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    elevationMeters: z.number().optional(),
    coordinateFrame: NonEmptyString.optional(),
  })
  .strict();

export type ObserverLocation = z.infer<typeof ObserverLocationSchema>;

/**
 * Time-State Contract (ASTRO-ARCH-001 Section 6, ASTRO-CALC-001 Section 7 & 8)
 *
 * Preserves the strict separation of four distinct time concepts:
 * - referenceNow: The current system reference instant (comparison / "return to now").
 * - selectedEventTime: The date and time intentionally selected by the user.
 * - calculationTime: The normalized effective instant supplied to Calculation Authority.
 * - calculatedAt: The audit timestamp when the calculation was executed/recorded.
 */
export const TimeStateSchema = z
  .object({
    referenceNow: z.string().datetime({ offset: true }),
    selectedEventTime: z.string().datetime({ offset: true }),
    calculationTime: z.string().datetime({ offset: true }),
    calculatedAt: z.string().datetime({ offset: true }),
    timezone: NonEmptyString,
    observerLocation: ObserverLocationSchema.optional(),
  })
  .strict();

export type TimeState = z.infer<typeof TimeStateSchema>;

/**
 * Calculation Request / Context (ASTRO-CALC-001 Section 7)
 */
export const CalculationRequestSchema = z
  .object({
    requestId: NonEmptyString,
    subjectId: NonEmptyString.optional(),
    taxonomyVersion: NonEmptyString,
    traditionScope: NonEmptyString,
    calculationPolicyId: NonEmptyString,
    calculationPolicyVersion: NonEmptyString,
    timeState: TimeStateSchema,
    requestedScope: z.array(NonEmptyString).min(1),
    callerIdentity: NonEmptyString.optional(),
    requestVersion: NonEmptyString.optional(),
    provenance: ProvenanceRecordSchema.optional(),
  })
  .strict();

export type CalculationRequest = z.infer<typeof CalculationRequestSchema>;

// ============================================================================
// 2. Canonical Identity Reference (ASTRO-TAXONOMY-001)
// ============================================================================

/**
 * Known Candidate Taxonomy Concept Categories (ASTRO-TAXONOMY-001 Section 15)
 * Provided as reference constants only; exact category taxonomy is DEFERRED_OPEN.
 */
export const KNOWN_TAXONOMY_CATEGORIES = [
  "celestial_body",
  "astrology_point",
  "house",
  "zodiac_sign",
  "aspect",
  "dignity_status",
  "time_state",
  "calendar_concept",
  "location_observer",
  "rule_concept",
  "strategic_state",
  "evidence_source",
  "tradition_school",
  "numerical_system",
  "chinese_metaphysics",
  "i_ching",
  "domain_identity",
] as const;

/**
 * Canonical Identity Reference (ASTRO-TAXONOMY-001 Section 5, 6, 17)
 *
 * Preserves the invariant: Canonical Identity != Display Label.
 * Category is open (deferred by ASTRO-TAXONOMY-001 Section 34).
 */
export const CanonicalIdentityRefSchema = z
  .object({
    canonicalId: NonEmptyString,
    taxonomyVersion: NonEmptyString,
    category: NonEmptyString.optional(),
    traditionScope: NonEmptyString.optional(),
    preferredLabel: NonEmptyString.optional(),
  })
  .strict();

export type CanonicalIdentityRef = z.infer<typeof CanonicalIdentityRefSchema>;

// ============================================================================
// 3. Source Register Reference / Boundary (ASTRO-SOURCE-001)
// ============================================================================

/**
 * Known Source Record Evidence Classes (ASTRO-SOURCE-001 Section 6.1)
 * Provided as reference constants; storage schema/cardinality remains downstream.
 */
export const KNOWN_SOURCE_EVIDENCE_CLASSES = [
  "CURRENT_LINEAGE_AUTHORITY",
  "PRIMARY_ORIGINAL_SOURCE",
  "SCHOLARLY_TECHNICAL_REFERENCE",
  "HISTORICAL_REPOSITORY_FINDING",
  "REPOSITORY_SEARCH_FINDING_RUNTIME_NOT_REVALIDATED",
  "USER_PROVIDED_EVIDENCE",
  "USER_PROVIDED_PRODUCT_EVIDENCE",
  "USER_PROVIDED_VISUALIZATION_EVIDENCE",
  "VENDOR_DESCRIBED_EVIDENCE",
  "VENDOR_DESCRIBED_ARCHITECTURE",
  "VENDOR_DESCRIBED_PRODUCT_BEHAVIOR",
  "VENDOR_MARKETING_CLAIM",
  "VERIFIED_PRODUCT_FACT",
  "PRODUCT_COMPETITOR_OBSERVATION",
  "PRICING_SNAPSHOT",
  "DERIVED_SECONDARY_INTERPRETATION",
] as const;

/**
 * Known Source Authority Candidate Roles (ASTRO-SOURCE-001 Section 7)
 * Conceptual roles; exact taxonomy is DEFERRED_OPEN.
 */
export const KNOWN_SOURCE_AUTHORITY_ROLES = [
  "FORMULA_AUTHORITY_CANDIDATE",
  "TAXONOMY_AUTHORITY_CANDIDATE",
  "VALIDATION_REFERENCE_CANDIDATE",
  "KNOWLEDGE_REFERENCE",
  "HISTORICAL_CONTEXT",
  "PRODUCT_VENDOR_EVIDENCE",
  "USER_OBSERVATION",
] as const;

/**
 * Known Source Register Lifecycle Statuses (ASTRO-SOURCE-001 Section 13)
 * Conceptual statuses; exact enum is DEFERRED_OPEN.
 */
export const KNOWN_SOURCE_STATUSES = [
  "DISCOVERED",
  "RECORDED",
  "UNDER_REVIEW",
  "ADMISSIBLE",
  "RESTRICTED_CONTEXT",
  "DISPUTED",
  "SUPERSEDED",
  "REJECTED",
] as const;

/**
 * Source Register Record / Reference Boundary (ASTRO-SOURCE-001 Section 8 & 9)
 */
export const SourceRecordRefSchema = z
  .object({
    sourceId: NonEmptyString,
    evidenceClass: NonEmptyString,
    authorityRoles: z.array(NonEmptyString).optional(),
    status: NonEmptyString.optional(),
    locator: NonEmptyString.optional(),
    accessDate: z.string().datetime({ offset: true }).optional(),
    traditionScope: NonEmptyString.optional(),
    provenance: ProvenanceRecordSchema.optional(),
  })
  .strict();

export type SourceRecordRef = z.infer<typeof SourceRecordRefSchema>;

// ============================================================================
// 4. Calculation Snapshot (ASTRO-CALC-001)
// ============================================================================

/**
 * Calculated Fact (ASTRO-CALC-001 Section 8 & 16)
 */
export const CalculatedFactSchema = z
  .object({
    factId: NonEmptyString,
    canonicalIdentity: CanonicalIdentityRefSchema,
    value: z.union([
      z.number(),
      z.string(),
      z.boolean(),
      z.record(z.string(), z.unknown()),
      z.array(z.unknown()),
    ]),
    units: NonEmptyString.optional(),
    referenceFrame: NonEmptyString.optional(),
    provenance: ProvenanceRecordSchema.optional(),
  })
  .strict();

export type CalculatedFact = z.infer<typeof CalculatedFactSchema>;

/**
 * Immutable Calculation Snapshot (ASTRO-CALC-001 Section 8 & 9)
 *
 * The authoritative output artifact of Calculation Authority.
 * Once issued, a snapshot identity is immutable.
 */
export const CalculationSnapshotSchema = z
  .object({
    snapshotId: NonEmptyString,
    formatVersion: NonEmptyString,
    calculationRequestId: NonEmptyString,
    calculationPolicyId: NonEmptyString,
    calculationPolicyVersion: NonEmptyString,
    taxonomyVersion: NonEmptyString,
    traditionScope: NonEmptyString,
    timeState: TimeStateSchema,
    calculationScope: z.array(NonEmptyString).min(1),
    calculatedFacts: z.array(CalculatedFactSchema),
    engineIdentity: NonEmptyString.optional(),
    engineVersion: NonEmptyString.optional(),
    warnings: z.array(NonEmptyString).optional(),
    incompleteness: z.array(NonEmptyString).optional(),
    ambiguity: z.array(NonEmptyString).optional(),
    isPartial: z.boolean().optional(),
    provenance: ProvenanceRecordSchema.optional(),
  })
  .strict();

export type CalculationSnapshot = z.infer<typeof CalculationSnapshotSchema>;

// ============================================================================
// 5. Calculation Validation Record (ASTRO-VALID-001)
// ============================================================================

/**
 * Known Conceptual Validation Outcomes (ASTRO-VALID-001 Section 12)
 * Provided as reference constants only; exact executable vocabulary/enum is DEFERRED_OPEN
 * (ASTRO-VALID-001 Section 8 line 233, Section 32 line 620).
 */
export const KNOWN_VALIDATION_STATUSES = [
  "PASS",
  "FAIL",
  "REJECTED",
  "INCONCLUSIVE",
  "BLOCKED",
  "ERROR",
  "NOT_VALIDATED",
] as const;

/**
 * Bounded Validation Scope Definition (ASTRO-VALID-001 Section 8 & 12)
 *
 * Preserves bounded validation scope and distinction between partial and full coverage
 * without imposing an unauthorized closed taxonomy of scope types.
 */
export const ValidationScopeDefinitionSchema = z
  .object({
    scopeDescription: NonEmptyString.optional(),
    isFullSnapshot: z.boolean().optional(),
    coveredDimensions: z.array(NonEmptyString).optional(),
    coveredFactIds: z.array(NonEmptyString).optional(),
    excludedDimensions: z.array(NonEmptyString).optional(),
  })
  .strict();

export type ValidationScopeDefinition = z.infer<typeof ValidationScopeDefinitionSchema>;

/**
 * Exact-Snapshot Validation Record (ASTRO-VALID-001 Section 6 & 8)
 *
 * The authoritative output artifact of Validation Authority.
 * Must bind strictly to an exact Calculation Snapshot identity.
 * Validation status is required (no default, no coercion, vocabulary deferred).
 */
export const CalculationValidationRecordSchema = z
  .object({
    validationRecordId: NonEmptyString,
    snapshotId: NonEmptyString,
    snapshotFormatVersion: NonEmptyString.optional(),
    validationPolicyId: NonEmptyString,
    validationPolicyVersion: NonEmptyString,
    status: NonEmptyString,
    scope: ValidationScopeDefinitionSchema,
    validationAuditTimestamp: z.string().datetime({ offset: true }),
    evidenceReferences: z.array(SourceRecordRefSchema).optional(),
    discrepancies: z.array(z.record(z.string(), z.unknown())).optional(),
    warnings: z.array(NonEmptyString).optional(),
    provenance: ProvenanceRecordSchema.optional(),
  })
  .strict();

export type CalculationValidationRecord = z.infer<typeof CalculationValidationRecordSchema>;
