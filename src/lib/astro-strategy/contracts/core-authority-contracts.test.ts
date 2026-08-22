// src/lib/astro-strategy/contracts/core-authority-contracts.test.ts
import { describe, it, expect } from "vitest";
import {
  TimeStateSchema,
  CalculationRequestSchema,
  CanonicalIdentityRefSchema,
  SourceRecordRefSchema,
  CalculatedFactSchema,
  CalculationSnapshotSchema,
  CalculationValidationRecordSchema,
  KNOWN_VALIDATION_STATUSES,
  KNOWN_TAXONOMY_CATEGORIES,
  KNOWN_SOURCE_EVIDENCE_CLASSES,
  KNOWN_SOURCE_STATUSES,
  KNOWN_SOURCE_AUTHORITY_ROLES,
} from "./core-authority-contracts";

describe("ASTRO-SCHEMA-001 — Core Authority Contracts", () => {
  const validTimeState = {
    referenceNow: "2026-08-22T12:00:00.000Z",
    selectedEventTime: "2026-08-22T10:30:00.000+07:00",
    calculationTime: "2026-08-22T03:30:00.000Z",
    calculatedAt: "2026-08-22T12:00:05.123Z",
    timezone: "Asia/Bangkok",
    observerLocation: {
      latitude: 13.7563,
      longitude: 100.5018,
      elevationMeters: 1.5,
      coordinateFrame: "WGS84",
    },
  };

  const validCanonicalRef = {
    canonicalId: "celestial:sun",
    taxonomyVersion: "astro-taxonomy-v1.0",
    category: "celestial_body",
    traditionScope: "universal",
    preferredLabel: "Sun",
  };

  const validSourceRef = {
    sourceId: "src:suriyayart-1994",
    evidenceClass: "PRIMARY_ORIGINAL_SOURCE",
    authorityRoles: ["FORMULA_AUTHORITY_CANDIDATE"],
    status: "ADMISSIBLE",
    locator: "docs/sources/suriyayart.pdf",
    accessDate: "2026-08-20T00:00:00.000Z",
    traditionScope: "thai_suriyayart",
  };

  const validCalculatedFact = {
    factId: "fact:sun-ecliptic-longitude",
    canonicalIdentity: validCanonicalRef,
    value: 128.4521,
    units: "degrees",
    referenceFrame: "ecliptic_geocentric",
  };

  const validCalculationSnapshot = {
    snapshotId: "calc-snap-20260822-001",
    formatVersion: "astro-calc-snapshot-v1",
    calculationRequestId: "calc-req-001",
    calculationPolicyId: "policy:thai-suriyayart-standard",
    calculationPolicyVersion: "1.0.0",
    taxonomyVersion: "astro-taxonomy-v1.0",
    traditionScope: "thai_suriyayart",
    timeState: validTimeState,
    calculationScope: ["planetary_positions", "houses"],
    calculatedFacts: [validCalculatedFact],
    engineIdentity: "astro-calc-engine-mock",
    engineVersion: "0.1.0",
  };

  const validValidationRecord = {
    validationRecordId: "val-rec-20260822-001",
    snapshotId: "calc-snap-20260822-001",
    snapshotFormatVersion: "astro-calc-snapshot-v1",
    validationPolicyId: "val-policy:suriyayart-ephemeris-crosscheck",
    validationPolicyVersion: "1.0.0",
    status: "PASS",
    scope: {
      isFullSnapshot: true,
      scopeDescription: "Full snapshot coordinate and time-state validation",
      coveredDimensions: ["coordinates", "time_state", "taxonomy_binding"],
    },
    validationAuditTimestamp: "2026-08-22T12:01:00.000Z",
    evidenceReferences: [validSourceRef],
  };

  // --------------------------------------------------------------------------
  // 1. Time-State & Calculation Context
  // --------------------------------------------------------------------------
  describe("1. Time-State & Calculation Context", () => {
    it("parses valid minimal Time-State successfully", () => {
      const minimalTimeState = {
        referenceNow: "2026-08-22T12:00:00.000Z",
        selectedEventTime: "2026-08-22T10:30:00.000+07:00",
        calculationTime: "2026-08-22T03:30:00.000Z",
        calculatedAt: "2026-08-22T12:00:05.123Z",
        timezone: "UTC",
      };
      const result = TimeStateSchema.safeParse(minimalTimeState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.referenceNow).toBe(minimalTimeState.referenceNow);
        expect(result.data.calculationTime).toBe(minimalTimeState.calculationTime);
      }
    });

    it("rejects when a required Time-State field is missing", () => {
      const incomplete = {
        referenceNow: "2026-08-22T12:00:00.000Z",
        selectedEventTime: "2026-08-22T10:30:00.000+07:00",
        calculatedAt: "2026-08-22T12:00:05.123Z",
        timezone: "UTC",
      };
      const result = TimeStateSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it("parses a valid Calculation Request with Time-State", () => {
      const request = {
        requestId: "req-12345",
        taxonomyVersion: "astro-taxonomy-v1.0",
        traditionScope: "thai_suriyayart",
        calculationPolicyId: "policy:default",
        calculationPolicyVersion: "1.0.0",
        timeState: validTimeState,
        requestedScope: ["planetary_positions"],
      };
      const result = CalculationRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Canonical Identity Reference
  // --------------------------------------------------------------------------
  describe("2. Canonical Identity Reference", () => {
    it("parses valid Canonical Identity reference", () => {
      const result = CanonicalIdentityRefSchema.safeParse(validCanonicalRef);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canonicalId).toBe("celestial:sun");
        expect(result.data.taxonomyVersion).toBe("astro-taxonomy-v1.0");
      }
    });

    it("rejects empty or whitespace-only canonicalId", () => {
      const malformedEmpty = {
        canonicalId: "",
        taxonomyVersion: "astro-taxonomy-v1.0",
      };
      expect(CanonicalIdentityRefSchema.safeParse(malformedEmpty).success).toBe(false);

      const malformedWhitespace = {
        canonicalId: "   ",
        taxonomyVersion: "astro-taxonomy-v1.0",
      };
      expect(CanonicalIdentityRefSchema.safeParse(malformedWhitespace).success).toBe(false);
    });

    it("allows open deferred category string", () => {
      const customCategory = {
        canonicalId: "celestial:sun",
        taxonomyVersion: "astro-taxonomy-v1.0",
        category: "custom_future_category",
      };
      const result = CanonicalIdentityRefSchema.safeParse(customCategory);
      expect(result.success).toBe(true);
    });

    it("preserves known taxonomy categories as reference constants", () => {
      expect(KNOWN_TAXONOMY_CATEGORIES).toContain("celestial_body");
      expect(KNOWN_TAXONOMY_CATEGORIES).toContain("house");
      expect(KNOWN_TAXONOMY_CATEGORIES).toContain("zodiac_sign");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Source Register Reference / Boundary
  // --------------------------------------------------------------------------
  describe("3. Source Register Reference / Boundary", () => {
    it("parses valid Source boundary record/reference", () => {
      const result = SourceRecordRefSchema.safeParse(validSourceRef);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceId).toBe("src:suriyayart-1994");
        expect(result.data.evidenceClass).toBe("PRIMARY_ORIGINAL_SOURCE");
      }
    });

    it("rejects when required evidenceClass is missing or empty/whitespace", () => {
      const missingClass = {
        sourceId: "src:suriyayart-1994",
        status: "ADMISSIBLE",
      };
      expect(SourceRecordRefSchema.safeParse(missingClass).success).toBe(false);

      const emptyClass = {
        sourceId: "src:suriyayart-1994",
        evidenceClass: "",
      };
      expect(SourceRecordRefSchema.safeParse(emptyClass).success).toBe(false);

      const whitespaceClass = {
        sourceId: "src:suriyayart-1994",
        evidenceClass: "   ",
      };
      expect(SourceRecordRefSchema.safeParse(whitespaceClass).success).toBe(false);
    });

    it("ensures known evidence classes, roles, and statuses are defined as reference constants", () => {
      expect(KNOWN_SOURCE_EVIDENCE_CLASSES).toContain("CURRENT_LINEAGE_AUTHORITY");
      expect(KNOWN_SOURCE_EVIDENCE_CLASSES).toContain("PRIMARY_ORIGINAL_SOURCE");
      expect(KNOWN_SOURCE_STATUSES).toContain("ADMISSIBLE");
      expect(KNOWN_SOURCE_STATUSES).toContain("DISPUTED");
      expect(KNOWN_SOURCE_AUTHORITY_ROLES).toContain("FORMULA_AUTHORITY_CANDIDATE");
    });
  });

  // --------------------------------------------------------------------------
  // 4. Calculation Snapshot
  // --------------------------------------------------------------------------
  describe("4. Calculation Snapshot", () => {
    it("parses valid Calculation Snapshot", () => {
      const result = CalculationSnapshotSchema.safeParse(validCalculationSnapshot);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.snapshotId).toBe("calc-snap-20260822-001");
        expect(result.data.calculatedFacts.length).toBe(1);
        expect(result.data.calculatedFacts[0].factId).toBe("fact:sun-ecliptic-longitude");
      }
    });

    it("rejects snapshot missing calculationRequestId or timeState", () => {
      const missingTimeState = {
        snapshotId: "calc-snap-20260822-001",
        formatVersion: "astro-calc-snapshot-v1",
        calculationPolicyId: "policy:default",
        calculationPolicyVersion: "1.0.0",
        taxonomyVersion: "astro-taxonomy-v1.0",
        traditionScope: "thai_suriyayart",
        calculationScope: ["planetary_positions"],
        calculatedFacts: [],
      };
      const result = CalculationSnapshotSchema.safeParse(missingTimeState);
      expect(result.success).toBe(false);
    });

    it("parses calculated facts with diverse value shapes", () => {
      const numericFact = {
        factId: "fact:1",
        canonicalIdentity: validCanonicalRef,
        value: 120.5,
      };
      const stringFact = {
        factId: "fact:2",
        canonicalIdentity: validCanonicalRef,
        value: "Leo",
      };
      const structuredFact = {
        factId: "fact:3",
        canonicalIdentity: validCanonicalRef,
        value: { degree: 0, minute: 30, second: 0 },
      };
      expect(CalculatedFactSchema.safeParse(numericFact).success).toBe(true);
      expect(CalculatedFactSchema.safeParse(stringFact).success).toBe(true);
      expect(CalculatedFactSchema.safeParse(structuredFact).success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Calculation Validation Record & Non-Normalization Semantics
  // --------------------------------------------------------------------------
  describe("5. Calculation Validation Record & Boundaries", () => {
    it("parses valid Validation Record", () => {
      const result = CalculationValidationRecordSchema.safeParse(validValidationRecord);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validationRecordId).toBe("val-rec-20260822-001");
        expect(result.data.snapshotId).toBe("calc-snap-20260822-001");
        expect(result.data.status).toBe("PASS");
      }
    });

    it("rejects Validation Record missing exact snapshotId binding", () => {
      const missingSnapshotId = {
        validationRecordId: "val-rec-20260822-001",
        validationPolicyId: "val-policy:default",
        validationPolicyVersion: "1.0.0",
        status: "PASS",
        scope: { isFullSnapshot: true },
        validationAuditTimestamp: "2026-08-22T12:01:00.000Z",
      };
      const result = CalculationValidationRecordSchema.safeParse(missingSnapshotId);
      expect(result.success).toBe(false);
    });

    it("rejects missing, empty, or whitespace-only validation status (no default/coercion)", () => {
      const baseRecord = {
        validationRecordId: "val-rec-20260822-001",
        snapshotId: "calc-snap-20260822-001",
        validationPolicyId: "val-policy:default",
        validationPolicyVersion: "1.0.0",
        scope: { isFullSnapshot: true },
        validationAuditTimestamp: "2026-08-22T12:01:00.000Z",
      };

      // 1. missing status rejects
      expect(CalculationValidationRecordSchema.safeParse(baseRecord).success).toBe(false);

      // 2. empty status rejects
      expect(CalculationValidationRecordSchema.safeParse({ ...baseRecord, status: "" }).success).toBe(false);

      // 3. whitespace-only status rejects
      expect(CalculationValidationRecordSchema.safeParse({ ...baseRecord, status: "   " }).success).toBe(false);
    });

    it("preserves accepted outcome string exactly without trim/normalization", () => {
      const customStatus = "  CUSTOM_STATUS  ";
      const record = {
        ...validValidationRecord,
        status: customStatus,
      };
      const result = CalculationValidationRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
      if (result.success) {
        // Must equal "  CUSTOM_STATUS  " byte-for-byte, NOT "CUSTOM_STATUS"
        expect(result.data.status).toBe(customStatus);
        expect(result.data.status).toBe("  CUSTOM_STATUS  ");
        expect(result.data.status).not.toBe("CUSTOM_STATUS");
      }
    });

    it("distinguishes partial validation scope from full snapshot scope without closed enum", () => {
      const fullScope = {
        isFullSnapshot: true,
        coveredDimensions: ["all"],
      };
      const partialScope = {
        isFullSnapshot: false,
        coveredFactIds: ["fact:sun-ecliptic-longitude"],
        excludedDimensions: ["house_cusps"],
      };

      const fullResult = CalculationValidationRecordSchema.safeParse({
        ...validValidationRecord,
        scope: fullScope,
      });
      const partialResult = CalculationValidationRecordSchema.safeParse({
        ...validValidationRecord,
        scope: partialScope,
      });

      expect(fullResult.success).toBe(true);
      expect(partialResult.success).toBe(true);
      if (fullResult.success && partialResult.success) {
        expect(fullResult.data.scope.isFullSnapshot).toBe(true);
        expect(partialResult.data.scope.isFullSnapshot).toBe(false);
        expect(partialResult.data.scope.coveredFactIds).toEqual(["fact:sun-ecliptic-longitude"]);
      }
    });

    it("supports known conceptual validation statuses as open policy-bound strings", () => {
      expect(KNOWN_VALIDATION_STATUSES).toEqual([
        "PASS",
        "FAIL",
        "REJECTED",
        "INCONCLUSIVE",
        "BLOCKED",
        "ERROR",
        "NOT_VALIDATED",
      ]);

      for (const status of KNOWN_VALIDATION_STATUSES) {
        const record = {
          ...validValidationRecord,
          status,
        };
        const result = CalculationValidationRecordSchema.safeParse(record);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      }
    });

    it("verifies Validation Record cannot masquerade as Calculation Snapshot", () => {
      const snapshotCheck = CalculationSnapshotSchema.safeParse(validValidationRecord);
      expect(snapshotCheck.success).toBe(false);

      const validationCheck = CalculationValidationRecordSchema.safeParse(validCalculationSnapshot);
      expect(validationCheck.success).toBe(false);
    });
  });
});
