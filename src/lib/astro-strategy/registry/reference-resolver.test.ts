// src/lib/astro-strategy/registry/reference-resolver.test.ts
import { describe, it, expect } from "vitest";
import {
  createReferenceResolver,
  ReferenceCollisionError,
} from "./reference-resolver";
import type {
  CanonicalIdentityRef,
  SourceRecordRef,
} from "../contracts/core-authority-contracts";

describe("ASTRO-REGISTRY-001 — Reference Resolver", () => {
  // Obvious synthetic test fixtures
  const fixtureCanonicalA1: CanonicalIdentityRef = {
    canonicalId: "test:concept-alpha",
    taxonomyVersion: "test-taxonomy-v1",
    category: "domain_identity",
    traditionScope: "test_tradition_a",
    preferredLabel: "Concept Alpha Label",
  };

  const fixtureCanonicalA2: CanonicalIdentityRef = {
    canonicalId: "test:concept-alpha",
    taxonomyVersion: "test-taxonomy-v2", // same canonicalId, different version
    category: "domain_identity",
    traditionScope: "test_tradition_a",
    preferredLabel: "Concept Alpha V2 Label",
  };

  const fixtureCanonicalB: CanonicalIdentityRef = {
    canonicalId: "test:concept-beta",
    taxonomyVersion: "test-taxonomy-v1",
    category: "celestial_body",
    traditionScope: "universal",
    preferredLabel: "Concept Beta Label",
  };

  const fixtureSource1: SourceRecordRef = {
    sourceId: "src:fixture-manual-1990",
    evidenceClass: "PRIMARY_ORIGINAL_SOURCE",
    authorityRoles: ["FORMULA_AUTHORITY_CANDIDATE"],
    status: "ADMISSIBLE",
    locator: "docs/fixtures/manual.pdf",
    accessDate: "2026-08-20T00:00:00.000Z",
    traditionScope: "test_tradition_a",
    provenance: {
      reviewBatch: "batch-2026-01",
      curator: "domain-lead",
    },
  };

  const fixtureSource2: SourceRecordRef = {
    sourceId: "src:fixture-reference-2005",
    evidenceClass: "SCHOLARLY_TECHNICAL_REFERENCE",
    authorityRoles: ["VALIDATION_REFERENCE_CANDIDATE"],
    status: "UNDER_REVIEW",
    locator: "https://example.org/ref-2005",
    accessDate: "2026-08-21T00:00:00.000Z",
    traditionScope: "universal",
  };

  // 1. Valid canonical reference collection constructs
  it("1. constructs successfully with a valid canonical reference collection", () => {
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [fixtureCanonicalA1, fixtureCanonicalB],
    });
    expect(resolver.getAllCanonicalIdentities()).toHaveLength(2);
  });

  // 2. Valid source reference collection constructs
  it("2. constructs successfully with a valid source reference collection", () => {
    const resolver = createReferenceResolver({
      sourceRecordRefs: [fixtureSource1, fixtureSource2],
    });
    expect(resolver.getAllSourceRecords()).toHaveLength(2);
  });

  // 3. Invalid CanonicalIdentityRef input rejects via existing schema
  it("3. rejects invalid CanonicalIdentityRef input via schema validation", () => {
    const malformedCanonical = {
      canonicalId: "", // empty string is rejected by NonEmptyString schema
      taxonomyVersion: "test-taxonomy-v1",
    } as unknown as CanonicalIdentityRef;

    expect(() =>
      createReferenceResolver({
        canonicalIdentityRefs: [malformedCanonical],
      })
    ).toThrow();
  });

  // 4. Invalid SourceRecordRef input rejects via existing schema
  it("4. rejects invalid SourceRecordRef input via schema validation", () => {
    const malformedSource = {
      sourceId: "src:valid-id",
      evidenceClass: "", // empty evidence class is rejected
    } as unknown as SourceRecordRef;

    expect(() =>
      createReferenceResolver({
        sourceRecordRefs: [malformedSource],
      })
    ).toThrow();
  });

  // 5. Exact canonical lookup succeeds using taxonomyVersion + canonicalId
  it("5. succeeds in exact canonical lookup using taxonomyVersion + canonicalId", () => {
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [fixtureCanonicalA1, fixtureCanonicalB],
    });

    const result = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-taxonomy-v1",
      canonicalId: "test:concept-alpha",
    });

    expect(result).toBeDefined();
    expect(result?.canonicalId).toBe("test:concept-alpha");
    expect(result?.taxonomyVersion).toBe("test-taxonomy-v1");
    expect(result?.preferredLabel).toBe("Concept Alpha Label");
    expect(
      resolver.hasCanonicalIdentity({
        taxonomyVersion: "test-taxonomy-v1",
        canonicalId: "test:concept-alpha",
      })
    ).toBe(true);
  });

  // 6. Same canonicalId under different taxonomyVersion values remains separately resolvable
  it("6. resolves the same canonicalId under different taxonomyVersion values separately", () => {
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [fixtureCanonicalA1, fixtureCanonicalA2],
    });

    const v1Result = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-taxonomy-v1",
      canonicalId: "test:concept-alpha",
    });

    const v2Result = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-taxonomy-v2",
      canonicalId: "test:concept-alpha",
    });

    expect(v1Result).toBeDefined();
    expect(v2Result).toBeDefined();
    expect(v1Result?.preferredLabel).toBe("Concept Alpha Label");
    expect(v2Result?.preferredLabel).toBe("Concept Alpha V2 Label");
  });

  // 7. Duplicate canonical key (same taxonomyVersion + canonicalId) rejects construction
  it("7. rejects duplicate canonical key (same taxonomyVersion + canonicalId)", () => {
    const duplicateA1: CanonicalIdentityRef = {
      ...fixtureCanonicalA1,
      preferredLabel: "Another Label With Same Identity and Version",
    };

    expect(() =>
      createReferenceResolver({
        canonicalIdentityRefs: [fixtureCanonicalA1, duplicateA1],
      })
    ).toThrowError(ReferenceCollisionError);
  });

  // 8. Duplicate sourceId rejects construction
  it("8. rejects duplicate sourceId during construction", () => {
    const duplicateSource: SourceRecordRef = {
      ...fixtureSource1,
      locator: "docs/fixtures/different-locator.pdf",
    };

    expect(() =>
      createReferenceResolver({
        sourceRecordRefs: [fixtureSource1, duplicateSource],
      })
    ).toThrowError(ReferenceCollisionError);
  });

  // 9. Exact sourceId lookup succeeds
  it("9. succeeds in exact sourceId lookup", () => {
    const resolver = createReferenceResolver({
      sourceRecordRefs: [fixtureSource1],
    });

    const result = resolver.getSourceRecord("src:fixture-manual-1990");
    expect(result).toBeDefined();
    expect(result?.sourceId).toBe("src:fixture-manual-1990");
    expect(result?.evidenceClass).toBe("PRIMARY_ORIGINAL_SOURCE");
    expect(resolver.hasSourceRecord("src:fixture-manual-1990")).toBe(true);
  });

  // 10. Missing canonical key returns not-found without inventing invalid/rejected semantics
  it("10. returns undefined / false for missing canonical key without error or status inference", () => {
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [fixtureCanonicalA1],
    });

    const result = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-taxonomy-v1",
      canonicalId: "test:nonexistent-id",
    });

    expect(result).toBeUndefined();
    expect(
      resolver.hasCanonicalIdentity({
        taxonomyVersion: "test-taxonomy-v1",
        canonicalId: "test:nonexistent-id",
      })
    ).toBe(false);
  });

  // 11. Missing sourceId returns not-found without authority semantics
  it("11. returns undefined / false for missing sourceId without authority semantics", () => {
    const resolver = createReferenceResolver({
      sourceRecordRefs: [fixtureSource1],
    });

    const result = resolver.getSourceRecord("src:nonexistent-source");
    expect(result).toBeUndefined();
    expect(resolver.hasSourceRecord("src:nonexistent-source")).toBe(false);
  });

  // 12. Lookup is case-sensitive / non-normalizing
  it("12. enforces exact case-sensitive lookup without normalization or trimming", () => {
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [fixtureCanonicalA1],
      sourceRecordRefs: [fixtureSource1],
    });

    // Uppercase canonicalId must return undefined
    expect(
      resolver.getCanonicalIdentity({
        taxonomyVersion: "test-taxonomy-v1",
        canonicalId: "TEST:CONCEPT-ALPHA",
      })
    ).toBeUndefined();

    // Uppercase sourceId must return undefined
    expect(resolver.getSourceRecord("SRC:FIXTURE-MANUAL-1990")).toBeUndefined();
  });

  // 13. preferredLabel must not resolve a canonical identity
  it("13. does not resolve a canonical identity via preferredLabel", () => {
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [fixtureCanonicalA1],
    });

    // Attempting to query by preferredLabel as canonicalId must return undefined
    expect(
      resolver.getCanonicalIdentity({
        taxonomyVersion: "test-taxonomy-v1",
        canonicalId: "Concept Alpha Label",
      })
    ).toBeUndefined();
  });

  // 14. locator/title/status/authorityRole must not resolve a SourceRecordRef
  it("14. does not resolve a SourceRecordRef by locator, role, or other metadata", () => {
    const resolver = createReferenceResolver({
      sourceRecordRefs: [fixtureSource1],
    });

    // Attempting to query using locator string must return undefined
    expect(resolver.getSourceRecord("docs/fixtures/manual.pdf")).toBeUndefined();
  });

  // 15. An open/deferred taxonomy category not present in KNOWN_* is accepted if existing schema accepts it
  it("15. accepts open/deferred taxonomy category not in KNOWN_* constants", () => {
    const customCategoryRef: CanonicalIdentityRef = {
      canonicalId: "test:custom-category-concept",
      taxonomyVersion: "test-taxonomy-v1",
      category: "synthetic_open_category_not_in_known",
    };

    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [customCategoryRef],
    });

    const result = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-taxonomy-v1",
      canonicalId: "test:custom-category-concept",
    });

    expect(result).toBeDefined();
    expect(result?.category).toBe("synthetic_open_category_not_in_known");
  });

  // 16. An open/deferred source status/evidence/role value not present in KNOWN_* is accepted if existing schema accepts it
  it("16. accepts open/deferred source status/evidence/role values not in KNOWN_* constants", () => {
    const customSourceRef: SourceRecordRef = {
      sourceId: "src:custom-open-source",
      evidenceClass: "CUSTOM_FUTURE_EVIDENCE_CLASS",
      authorityRoles: ["CUSTOM_ROLE_EXTRA"],
      status: "CUSTOM_STATUS_UNDER_EVALUATION",
    };

    const resolver = createReferenceResolver({
      sourceRecordRefs: [customSourceRef],
    });

    const result = resolver.getSourceRecord("src:custom-open-source");
    expect(result).toBeDefined();
    expect(result?.evidenceClass).toBe("CUSTOM_FUTURE_EVIDENCE_CLASS");
    expect(result?.status).toBe("CUSTOM_STATUS_UNDER_EVALUATION");
  });

  // 17. No mutation methods exist on the public resolver API
  it("17. exposes only read-only query methods on the public resolver object", () => {
    const resolver = createReferenceResolver();
    const keys = Object.keys(resolver);

    expect(keys).toEqual([
      "getCanonicalIdentity",
      "hasCanonicalIdentity",
      "getSourceRecord",
      "hasSourceRecord",
      "getAllCanonicalIdentities",
      "getAllSourceRecords",
    ]);

    // Ensure mutation operations are not present
    expect((resolver as unknown as Record<string, unknown>).add).toBeUndefined();
    expect((resolver as unknown as Record<string, unknown>).insert).toBeUndefined();
    expect((resolver as unknown as Record<string, unknown>).update).toBeUndefined();
    expect((resolver as unknown as Record<string, unknown>).delete).toBeUndefined();
    expect((resolver as unknown as Record<string, unknown>).approve).toBeUndefined();
    expect((resolver as unknown as Record<string, unknown>).canonicalize).toBeUndefined();
  });

  // 18. Resolver construction does not mutate caller inputs
  it("18. does not mutate caller input collections or reference objects", () => {
    const inputCanonical: CanonicalIdentityRef = {
      canonicalId: "test:concept-immutable",
      taxonomyVersion: "test-taxonomy-v1",
      preferredLabel: "Original Label",
    };
    const inputCanonicalArray = [inputCanonical];

    const inputSource: SourceRecordRef = {
      sourceId: "src:fixture-source-immutable",
      evidenceClass: "PRIMARY_ORIGINAL_SOURCE",
    };
    const inputSourceArray = [inputSource];

    createReferenceResolver({
      canonicalIdentityRefs: inputCanonicalArray,
      sourceRecordRefs: inputSourceArray,
    });

    // Check array and object properties remain strictly identical
    expect(inputCanonicalArray).toHaveLength(1);
    expect(inputCanonicalArray[0]).toBe(inputCanonical);
    expect(inputCanonical.preferredLabel).toBe("Original Label");

    expect(inputSourceArray).toHaveLength(1);
    expect(inputSourceArray[0]).toBe(inputSource);
    expect(inputSource.evidenceClass).toBe("PRIMARY_ORIGINAL_SOURCE");
  });

  // 19. Delimiter-containing canonical identities cannot collide (injective nested maps)
  it("19. structurally preserves delimiter-containing canonical identities without collision", () => {
    const pairA: CanonicalIdentityRef = {
      taxonomyVersion: "a:::",
      canonicalId: "b",
      preferredLabel: "Pair A Label",
    };

    const pairB: CanonicalIdentityRef = {
      taxonomyVersion: "a",
      canonicalId: ":::b",
      preferredLabel: "Pair B Label",
    };

    // Constructing resolver with both pairs must succeed and not collide
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [pairA, pairB],
    });

    expect(resolver.getAllCanonicalIdentities()).toHaveLength(2);

    const resA = resolver.getCanonicalIdentity({
      taxonomyVersion: "a:::",
      canonicalId: "b",
    });
    const resB = resolver.getCanonicalIdentity({
      taxonomyVersion: "a",
      canonicalId: ":::b",
    });

    expect(resA).toBeDefined();
    expect(resA?.preferredLabel).toBe("Pair A Label");

    expect(resB).toBeDefined();
    expect(resB?.preferredLabel).toBe("Pair B Label");

    // Cross-query must return undefined
    expect(
      resolver.getCanonicalIdentity({
        taxonomyVersion: "a:::",
        canonicalId: ":::b",
      })
    ).toBeUndefined();
    expect(
      resolver.getCanonicalIdentity({
        taxonomyVersion: "a",
        canonicalId: "b",
      })
    ).toBeUndefined();
  });

  // 20. Caller reference mutation after construction cannot alter resolver state (including nested provenance)
  it("20. prevents caller object mutation from affecting resolver state after construction", () => {
    const mutableCanonical: CanonicalIdentityRef = {
      canonicalId: "test:mutable-canonical",
      taxonomyVersion: "test-v1",
      preferredLabel: "Initial Canonical Label",
    };

    const mutableSource: SourceRecordRef = {
      sourceId: "src:mutable-source",
      evidenceClass: "PRIMARY_ORIGINAL_SOURCE",
      authorityRoles: ["FORMULA_AUTHORITY_CANDIDATE"],
      provenance: {
        curator: "initial-curator",
        metadata: { tag: "initial-tag" },
      },
    };

    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [mutableCanonical],
      sourceRecordRefs: [mutableSource],
    });

    // Mutate caller input objects after construction
    mutableCanonical.preferredLabel = "Tampered Canonical Label";
    mutableCanonical.canonicalId = "test:tampered-canonical";

    if (mutableSource.authorityRoles) {
      mutableSource.authorityRoles.push("UNAUTHORIZED_ROLE");
    }
    if (mutableSource.provenance) {
      (mutableSource.provenance as Record<string, unknown>).curator = "tampered-curator";
      ((mutableSource.provenance as Record<string, unknown>).metadata as Record<string, unknown>).tag = "tampered-tag";
    }

    // Query resolver — state must remain intact with initial values
    const queryCanonical = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-v1",
      canonicalId: "test:mutable-canonical",
    });
    expect(queryCanonical).toBeDefined();
    expect(queryCanonical?.preferredLabel).toBe("Initial Canonical Label");
    expect(queryCanonical?.canonicalId).toBe("test:mutable-canonical");

    const querySource = resolver.getSourceRecord("src:mutable-source");
    expect(querySource).toBeDefined();
    expect(querySource?.authorityRoles).toEqual(["FORMULA_AUTHORITY_CANDIDATE"]);
    expect(querySource?.provenance).toEqual({
      curator: "initial-curator",
      metadata: { tag: "initial-tag" },
    });
  });

  // 21. Returned lookup result mutation cannot alter subsequent resolver state
  it("21. prevents returned lookup object mutation from altering subsequent resolver state", () => {
    const resolver = createReferenceResolver({
      canonicalIdentityRefs: [fixtureCanonicalA1],
      sourceRecordRefs: [fixtureSource1],
    });

    // 1. Get canonical identity and mutate returned object
    const res1 = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-taxonomy-v1",
      canonicalId: "test:concept-alpha",
    });
    expect(res1).toBeDefined();
    if (res1) {
      res1.preferredLabel = "Tampered Return Label";
      res1.category = "tampered_category";
    }

    // Subsequent query must return unaltered data
    const res2 = resolver.getCanonicalIdentity({
      taxonomyVersion: "test-taxonomy-v1",
      canonicalId: "test:concept-alpha",
    });
    expect(res2?.preferredLabel).toBe("Concept Alpha Label");
    expect(res2?.category).toBe("domain_identity");

    // 2. Get source record and mutate returned object
    const src1 = resolver.getSourceRecord("src:fixture-manual-1990");
    expect(src1).toBeDefined();
    if (src1) {
      src1.status = "TAMPERED_STATUS";
      if (src1.provenance) {
        (src1.provenance as Record<string, unknown>).curator = "tampered-curator";
      }
    }

    // Subsequent query must return unaltered source data
    const src2 = resolver.getSourceRecord("src:fixture-manual-1990");
    expect(src2?.status).toBe("ADMISSIBLE");
    expect((src2?.provenance as Record<string, unknown>)?.curator).toBe("domain-lead");
  });

  // 22. Caller input array mutation cannot alter resolver index
  it("22. prevents caller input array mutation from altering resolver index after construction", () => {
    const canonicalArray: CanonicalIdentityRef[] = [fixtureCanonicalA1];
    const sourceArray: SourceRecordRef[] = [fixtureSource1];

    const resolver = createReferenceResolver({
      canonicalIdentityRefs: canonicalArray,
      sourceRecordRefs: sourceArray,
    });

    // Mutate caller input arrays
    canonicalArray.push(fixtureCanonicalB);
    canonicalArray.shift();

    sourceArray.push(fixtureSource2);
    sourceArray.shift();

    // Verify resolver still contains exactly the references provided at construction time
    expect(resolver.getAllCanonicalIdentities()).toHaveLength(1);
    expect(
      resolver.hasCanonicalIdentity({
        taxonomyVersion: "test-taxonomy-v1",
        canonicalId: "test:concept-alpha",
      })
    ).toBe(true);
    expect(
      resolver.hasCanonicalIdentity({
        taxonomyVersion: "test-taxonomy-v1",
        canonicalId: "test:concept-beta",
      })
    ).toBe(false);

    expect(resolver.getAllSourceRecords()).toHaveLength(1);
    expect(resolver.hasSourceRecord("src:fixture-manual-1990")).toBe(true);
    expect(resolver.hasSourceRecord("src:fixture-reference-2005")).toBe(false);
  });
});
