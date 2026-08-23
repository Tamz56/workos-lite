// src/lib/astro-strategy/registry/reference-resolver.ts
/**
 * ASTRO-REGISTRY-001 — Exact Reference Resolver & In-Memory Lookup Abstraction
 *
 * This module implements a transient, read-only, in-memory reference resolver
 * over schema-valid CanonicalIdentityRef and SourceRecordRef contracts established
 * by ASTRO-SCHEMA-001.
 *
 * Core Boundaries:
 * - Reference Resolver != Registry Record Authority
 * - Reference Resolver != Registry Storage Authority
 * - Reference Resolver != Registry Population
 * - Reference Resolver != Authority Review / Issuance
 * - Schema-valid input != reviewed source != admissible source != canonical concept
 *
 * Lookup Invariants:
 * - Canonical lookup binds exact `taxonomyVersion` + `canonicalId` jointly via nested structural Map.
 * - No delimiter assumptions or concatenated key encodings are used for canonical resolution.
 * - Source lookup binds exact `sourceId`.
 * - No trimming, lowercasing, uppercasing, slugifying, fuzzy matching, or alias resolution.
 * - Read-only query interface after construction; no mutation methods exposed.
 * - Defensive cloning guarantees total detachment from caller references and returned results.
 * - Duplicate exact keys in resolver input fail closed (reject construction).
 */

import {
  CanonicalIdentityRefSchema,
  type CanonicalIdentityRef,
  SourceRecordRefSchema,
  type SourceRecordRef,
} from "../contracts/core-authority-contracts";

/**
 * Error thrown when a duplicate reference key is detected during resolver construction.
 */
export class ReferenceCollisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceCollisionError";
  }
}

/**
 * Query parameters for exact canonical identity lookup.
 * Requires both taxonomyVersion and canonicalId jointly.
 */
export interface CanonicalIdentityQuery {
  readonly taxonomyVersion: string;
  readonly canonicalId: string;
}

/**
 * Read-only interface for exact reference resolution.
 * Provides query-only operations; contains no mutation methods.
 */
export interface ReferenceResolver {
  /**
   * Resolves a CanonicalIdentityRef by exact taxonomyVersion + canonicalId.
   * Returns undefined if absent from this resolver instance.
   */
  getCanonicalIdentity(query: CanonicalIdentityQuery): CanonicalIdentityRef | undefined;

  /**
   * Checks whether a CanonicalIdentityRef exists by exact taxonomyVersion + canonicalId.
   */
  hasCanonicalIdentity(query: CanonicalIdentityQuery): boolean;

  /**
   * Resolves a SourceRecordRef by exact sourceId.
   * Returns undefined if absent from this resolver instance.
   */
  getSourceRecord(sourceId: string): SourceRecordRef | undefined;

  /**
   * Checks whether a SourceRecordRef exists by exact sourceId.
   */
  hasSourceRecord(sourceId: string): boolean;

  /**
   * Returns a read-only snapshot list of all canonical identity references in this resolver.
   */
  getAllCanonicalIdentities(): readonly CanonicalIdentityRef[];

  /**
   * Returns a read-only snapshot list of all source record references in this resolver.
   */
  getAllSourceRecords(): readonly SourceRecordRef[];
}

/**
 * Construction options for creating a ReferenceResolver.
 */
export interface ReferenceResolverOptions {
  readonly canonicalIdentityRefs?: Iterable<CanonicalIdentityRef>;
  readonly sourceRecordRefs?: Iterable<SourceRecordRef>;
}

/**
 * Creates an in-memory, read-only ReferenceResolver over caller-supplied references.
 *
 * Uses structurally injective nested Maps for CanonicalIdentityRef (taxonomyVersion -> canonicalId -> ref).
 * Validates every supplied reference against ASTRO-SCHEMA-001 schemas.
 * Rejects construction if duplicate exact keys are detected.
 *
 * @throws {ZodError} If any supplied reference fails schema validation.
 * @throws {ReferenceCollisionError} If duplicate exact keys are supplied.
 */
export function createReferenceResolver(
  options: ReferenceResolverOptions = {}
): ReferenceResolver {
  // Nested map for structural canonical key injectivity without delimiter assumptions
  // Map<taxonomyVersion, Map<canonicalId, CanonicalIdentityRef>>
  const canonicalNestedMap = new Map<string, Map<string, CanonicalIdentityRef>>();
  // Map<sourceId, SourceRecordRef>
  const sourceMap = new Map<string, SourceRecordRef>();

  // Process and index CanonicalIdentityRef collection
  if (options.canonicalIdentityRefs) {
    for (const rawRef of options.canonicalIdentityRefs) {
      // Validate schema conformance
      const validRef = CanonicalIdentityRefSchema.parse(rawRef);
      // Defensive deep clone on ingest to guarantee detachment from caller object
      const detachedRef = structuredClone(validRef);

      let versionInnerMap = canonicalNestedMap.get(validRef.taxonomyVersion);
      if (!versionInnerMap) {
        versionInnerMap = new Map<string, CanonicalIdentityRef>();
        canonicalNestedMap.set(validRef.taxonomyVersion, versionInnerMap);
      }

      if (versionInnerMap.has(validRef.canonicalId)) {
        throw new ReferenceCollisionError(
          `Duplicate canonical identity reference for taxonomyVersion "${validRef.taxonomyVersion}" and canonicalId "${validRef.canonicalId}"`
        );
      }

      versionInnerMap.set(validRef.canonicalId, detachedRef);
    }
  }

  // Process and index SourceRecordRef collection
  if (options.sourceRecordRefs) {
    for (const rawRef of options.sourceRecordRefs) {
      // Validate schema conformance
      const validRef = SourceRecordRefSchema.parse(rawRef);
      // Defensive deep clone on ingest to guarantee detachment from caller object
      const detachedRef = structuredClone(validRef);

      if (sourceMap.has(validRef.sourceId)) {
        throw new ReferenceCollisionError(
          `Duplicate source record reference for sourceId "${validRef.sourceId}"`
        );
      }

      sourceMap.set(validRef.sourceId, detachedRef);
    }
  }

  return {
    getCanonicalIdentity(query: CanonicalIdentityQuery): CanonicalIdentityRef | undefined {
      if (!query || typeof query.taxonomyVersion !== "string" || typeof query.canonicalId !== "string") {
        return undefined;
      }
      const versionInnerMap = canonicalNestedMap.get(query.taxonomyVersion);
      if (!versionInnerMap) {
        return undefined;
      }
      const storedRef = versionInnerMap.get(query.canonicalId);
      return storedRef ? structuredClone(storedRef) : undefined;
    },

    hasCanonicalIdentity(query: CanonicalIdentityQuery): boolean {
      if (!query || typeof query.taxonomyVersion !== "string" || typeof query.canonicalId !== "string") {
        return false;
      }
      const versionInnerMap = canonicalNestedMap.get(query.taxonomyVersion);
      return versionInnerMap?.has(query.canonicalId) ?? false;
    },

    getSourceRecord(sourceId: string): SourceRecordRef | undefined {
      if (typeof sourceId !== "string") {
        return undefined;
      }
      const storedRef = sourceMap.get(sourceId);
      return storedRef ? structuredClone(storedRef) : undefined;
    },

    hasSourceRecord(sourceId: string): boolean {
      if (typeof sourceId !== "string") {
        return false;
      }
      return sourceMap.has(sourceId);
    },

    getAllCanonicalIdentities(): readonly CanonicalIdentityRef[] {
      const list: CanonicalIdentityRef[] = [];
      for (const versionInnerMap of canonicalNestedMap.values()) {
        for (const storedRef of versionInnerMap.values()) {
          list.push(structuredClone(storedRef));
        }
      }
      return Object.freeze(list);
    },

    getAllSourceRecords(): readonly SourceRecordRef[] {
      const list: SourceRecordRef[] = [];
      for (const storedRef of sourceMap.values()) {
        list.push(structuredClone(storedRef));
      }
      return Object.freeze(list);
    },
  };
}
