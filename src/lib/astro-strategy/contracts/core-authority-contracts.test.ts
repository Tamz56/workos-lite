// src/lib/astro-strategy/contracts/core-authority-contracts.test.ts
import { describe, it, expect } from "vitest";
import {
  ASTRO_CORE_SCHEMA_VERSION,
  ProvenanceValueSchema,
  ProvenanceRecordSchema,
  type ProvenanceValue,
  type ProvenanceRecord,
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

  // --------------------------------------------------------------------------
  // 6. ASTRO-SCHEMA-002 — Executable Provenance Data Boundary
  // --------------------------------------------------------------------------
  describe("6. ASTRO-SCHEMA-002 — Executable Provenance Data Boundary", () => {
    it("exports schema version astro-core-contracts-v0.2", () => {
      expect(ASTRO_CORE_SCHEMA_VERSION).toBe("astro-core-contracts-v0.2");
    });

    describe("Valid primitive & container cases", () => {
      it("accepts null", () => {
        expect(ProvenanceValueSchema.safeParse(null).success).toBe(true);
      });

      it("accepts boolean values (true, false)", () => {
        expect(ProvenanceValueSchema.safeParse(true).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(false).success).toBe(true);
      });

      it("accepts finite numbers (zero, negative, float, boundaries)", () => {
        expect(ProvenanceValueSchema.safeParse(0).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(-0).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(42).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(-3.1415926535).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(Number.MIN_SAFE_INTEGER).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(Number.MAX_VALUE).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse(Number.MIN_VALUE).success).toBe(true);
      });

      it("preserves exact strings without trimming or normalization", () => {
        const testStrings = [
          "",
          "   ",
          "  leading_and_trailing  ",
          "unicode: \u0000 \u001F \uFEFF \u200B \u0E01\u0E25\u0E32\u0E07",
          "multiline:\nline1\r\nline2\twith\ttabs",
        ];
        for (const str of testStrings) {
          const res = ProvenanceValueSchema.safeParse(str);
          expect(res.success).toBe(true);
          if (res.success) {
            expect(res.data).toBe(str);
          }
        }
      });

      it("accepts empty object and empty array", () => {
        expect(ProvenanceValueSchema.safeParse({}).success).toBe(true);
        expect(ProvenanceRecordSchema.safeParse({}).success).toBe(true);
        expect(ProvenanceValueSchema.safeParse([]).success).toBe(true);
        // Empty array is ProvenanceValue, but NOT ProvenanceRecord
        expect(ProvenanceRecordSchema.safeParse([]).success).toBe(false);
      });

      it("accepts dense arrays of ProvenanceValue", () => {
        const denseArray: ProvenanceValue = [
          null,
          true,
          false,
          0,
          123.456,
          "test string",
          [1, 2, [3, 4]],
          { nestedKey: "nestedValue", flag: false },
        ];
        expect(ProvenanceValueSchema.safeParse(denseArray).success).toBe(true);
      });

      it("accepts plain string-keyed objects of ProvenanceValue", () => {
        const plainRecord: ProvenanceRecord = {
          source: "ephemeris-v1",
          page: 42,
          active: true,
          metadata: {
            tags: ["astronomy", "thai"],
            factor: 1.05,
            notes: null,
          },
        };
        const res = ProvenanceRecordSchema.safeParse(plainRecord);
        expect(res.success).toBe(true);
      });

      it("accepts deeply nested valid provenance data", () => {
        const deep: ProvenanceRecord = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    items: [1, "two", null, [true, { leaf: "value" }]],
                  },
                },
              },
            },
          },
        };
        expect(ProvenanceRecordSchema.safeParse(deep).success).toBe(true);
      });
    });

    describe("Rejection of runtime / non-data values", () => {
      it("rejects undefined", () => {
        expect(ProvenanceValueSchema.safeParse(undefined).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ a: undefined }).success).toBe(false);
      });

      it("rejects functions (sync, async, generator, class constructors)", () => {
        expect(ProvenanceValueSchema.safeParse(() => {}).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(function named() {}).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(async () => {}).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(function* () {}).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(class Test {}).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ fn: () => 1 }).success).toBe(false);
      });

      it("rejects Symbol", () => {
        expect(ProvenanceValueSchema.safeParse(Symbol("test")).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(Symbol.for("test")).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ sym: Symbol("foo") }).success).toBe(false);
      });

      it("rejects BigInt", () => {
        expect(ProvenanceValueSchema.safeParse(BigInt(100)).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(1234567890123456789n).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ big: 100n }).success).toBe(false);
      });

      it("rejects non-finite numbers (NaN, Infinity, -Infinity)", () => {
        expect(ProvenanceValueSchema.safeParse(NaN).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(Infinity).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(-Infinity).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ bad: NaN }).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ bad: Infinity }).success).toBe(false);
      });

      it("rejects Date instances", () => {
        expect(ProvenanceValueSchema.safeParse(new Date()).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ created: new Date() }).success).toBe(false);
      });

      it("rejects Map and Set", () => {
        expect(ProvenanceValueSchema.safeParse(new Map()).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(new Set()).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ m: new Map() }).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ s: new Set() }).success).toBe(false);
      });

      it("rejects RegExp", () => {
        expect(ProvenanceValueSchema.safeParse(/abc/g).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(new RegExp("abc")).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ re: /pattern/ }).success).toBe(false);
      });

      it("rejects Error instances", () => {
        expect(ProvenanceValueSchema.safeParse(new Error("err")).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(new TypeError("type")).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ err: new Error("err") }).success).toBe(false);
      });

      it("rejects Promise instances", () => {
        expect(ProvenanceValueSchema.safeParse(Promise.resolve(1)).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ p: Promise.resolve(1) }).success).toBe(false);
      });

      it("rejects ArrayBuffer and TypedArrays", () => {
        expect(ProvenanceValueSchema.safeParse(new ArrayBuffer(16)).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(new Uint8Array(8)).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(new Float64Array(4)).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse({ buf: new ArrayBuffer(8) }).success).toBe(false);
      });

      it("rejects boxed primitives", () => {
        expect(ProvenanceValueSchema.safeParse(Object(123)).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(Object("hello")).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(Object(true)).success).toBe(false);
      });

      it("rejects custom class instances and custom prototypes", () => {
        class CustomEvidence {
          source = "test";
        }
        expect(ProvenanceValueSchema.safeParse(new CustomEvidence()).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse(new CustomEvidence()).success).toBe(false);

        const customProto = Object.create({ protoProp: 1 });
        customProto.ownProp = 2;
        expect(ProvenanceValueSchema.safeParse(customProto).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse(customProto).success).toBe(false);

        const nullProto = Object.create(null);
        nullProto.key = "val";
        expect(ProvenanceValueSchema.safeParse(nullProto).success).toBe(false);
        expect(ProvenanceRecordSchema.safeParse(nullProto).success).toBe(false);
      });
    });

    describe("Dense array & array structural restrictions", () => {
      it("rejects sparse arrays (holes)", () => {
        const arrayConstructorSparse = new Array(5);
        expect(ProvenanceValueSchema.safeParse(arrayConstructorSparse).success).toBe(false);

        const deletedIndex: unknown[] = [10, 20, 30];
        delete deletedIndex[1];
        expect(ProvenanceValueSchema.safeParse(deletedIndex).success).toBe(false);

        const sparseByIndex: unknown[] = [];
        sparseByIndex[3] = "item";
        expect(ProvenanceValueSchema.safeParse(sparseByIndex).success).toBe(false);
      });

      it("rejects custom Array subclasses", () => {
        class SubArray extends Array {}
        const customArr = Object.setPrototypeOf([1, 2, 3], SubArray.prototype);
        expect(ProvenanceValueSchema.safeParse(customArr).success).toBe(false);
      });

      it("rejects arrays with extra semantic non-index properties", () => {
        const arr: unknown[] = [1, 2, 3];
        (arr as unknown as Record<string, unknown>).extraSemanticKey = "bad";
        expect(ProvenanceValueSchema.safeParse(arr).success).toBe(false);
      });

      it("rejects arrays with symbol-keyed properties", () => {
        const arr: unknown[] = [1, 2, 3];
        (arr as unknown as Record<symbol, unknown>)[Symbol("symKey")] = "bad";
        expect(ProvenanceValueSchema.safeParse(arr).success).toBe(false);
      });
    });

    describe("Object structural restrictions (accessors, symbols, non-enumerable)", () => {
      it("rejects accessors (getters/setters) without executing the getter", () => {
        let getterExecuted = false;
        const objectWithGetter = {
          validProp: 123,
          get secret() {
            getterExecuted = true;
            throw new Error("Getter must NEVER be executed during validation!");
          },
        };

        const result = ProvenanceRecordSchema.safeParse(objectWithGetter);
        expect(result.success).toBe(false);
        expect(getterExecuted).toBe(false);

        const objectWithSetter = {
          validProp: 123,
          set secret(_val: unknown) {},
        };
        expect(ProvenanceRecordSchema.safeParse(objectWithSetter).success).toBe(false);
      });

      it("rejects array with accessor element", () => {
        let getterExecuted = false;
        const arr = [1, 2];
        Object.defineProperty(arr, 0, {
          get() {
            getterExecuted = true;
            throw new Error("Array getter must not execute!");
          },
          enumerable: true,
          configurable: true,
        });
        expect(ProvenanceValueSchema.safeParse(arr).success).toBe(false);
        expect(getterExecuted).toBe(false);
      });

      it("rejects symbol-keyed payload on objects", () => {
        const sym = Symbol("privateKey");
        const objectWithSymbol = {
          name: "valid",
          [sym]: "symbolValue",
        };
        expect(ProvenanceRecordSchema.safeParse(objectWithSymbol).success).toBe(false);
      });

      it("rejects non-enumerable semantic payload", () => {
        const obj = { visible: "yes" };
        Object.defineProperty(obj, "hidden", {
          value: "secret",
          enumerable: false,
        });
        expect(ProvenanceRecordSchema.safeParse(obj).success).toBe(false);
      });
    });

    describe("Cycle detection & acyclic graph sharing", () => {
      it("rejects direct self-cyclic objects", () => {
        const cyclicObj: Record<string, unknown> = { name: "cyclic" };
        cyclicObj.self = cyclicObj;
        expect(ProvenanceRecordSchema.safeParse(cyclicObj).success).toBe(false);
        expect(ProvenanceValueSchema.safeParse(cyclicObj).success).toBe(false);
      });

      it("rejects indirect cyclic objects", () => {
        const a: Record<string, unknown> = { name: "a" };
        const b: Record<string, unknown> = { a };
        a.b = b;
        expect(ProvenanceRecordSchema.safeParse(a).success).toBe(false);
      });

      it("rejects direct and indirect cyclic arrays", () => {
        const cyclicArr: unknown[] = [1, 2];
        cyclicArr.push(cyclicArr);
        expect(ProvenanceValueSchema.safeParse(cyclicArr).success).toBe(false);

        const arrA: unknown[] = [];
        const arrB = [arrA];
        arrA.push(arrB);
        expect(ProvenanceValueSchema.safeParse(arrA).success).toBe(false);
      });

      it("accepts repeated-but-acyclic shared input references (DAG)", () => {
        const sharedLeaf = { leafKey: "sharedData", counter: 42 };
        const sharedArray = [1, 2, sharedLeaf];

        const acyclicDagRecord = {
          branchA: {
            ref1: sharedLeaf,
            list1: sharedArray,
          },
          branchB: {
            ref2: sharedLeaf,
            list2: sharedArray,
          },
          directRef: sharedLeaf,
        };

        const result = ProvenanceRecordSchema.safeParse(acyclicDagRecord);
        expect(result.success).toBe(true);
      });
    });

    describe("structuredClone compatibility & deep equivalence", () => {
      it("valid provenance survives structuredClone and is deeply data-equivalent", () => {
        const provenanceSample: ProvenanceRecord = {
          sourceLineage: "primary_astronomy_1994",
          verified: true,
          iterations: 15,
          tolerance: 0.00001,
          emptyGroup: {},
          nested: {
            coordinates: [13.7563, 100.5018, -4.5],
            tags: ["ephemeris", "suriyayart"],
            flags: [true, false, null],
          },
        };

        expect(ProvenanceRecordSchema.safeParse(provenanceSample).success).toBe(true);

        const cloned = structuredClone(provenanceSample);
        expect(ProvenanceRecordSchema.safeParse(cloned).success).toBe(true);
        expect(cloned).toEqual(provenanceSample);
        expect(JSON.stringify(cloned)).toBe(JSON.stringify(provenanceSample));
      });
    });

    describe("Contract boundaries integration with ProvenanceRecordSchema", () => {
      it("SourceRecordRefSchema accepts valid provenance and rejects invalid provenance", () => {
        const validSourceWithProvenance = {
          ...validSourceRef,
          provenance: {
            sourceDocument: "Thai Ephemeris 1994",
            edition: 2,
            pageRange: [12, 18],
          },
        };
        expect(SourceRecordRefSchema.safeParse(validSourceWithProvenance).success).toBe(true);

        // Rejects function in provenance
        const invalidSourceWithFunction = {
          ...validSourceRef,
          provenance: {
            calculateChecksum: () => "invalid",
          },
        };
        expect(SourceRecordRefSchema.safeParse(invalidSourceWithFunction).success).toBe(false);

        // Rejects Symbol in provenance
        const invalidSourceWithSymbol = {
          ...validSourceRef,
          provenance: {
            [Symbol("sym")]: "test",
          },
        };
        expect(SourceRecordRefSchema.safeParse(invalidSourceWithSymbol).success).toBe(false);

        // Rejects custom class in provenance
        class CustomLineage {}
        const invalidSourceWithClass = {
          ...validSourceRef,
          provenance: {
            lineage: new CustomLineage(),
          },
        };
        expect(SourceRecordRefSchema.safeParse(invalidSourceWithClass).success).toBe(false);
      });

      it("CalculationRequestSchema uses ProvenanceRecord boundary", () => {
        const validRequestWithProvenance = {
          requestId: "req-12345",
          taxonomyVersion: "astro-taxonomy-v1.0",
          traditionScope: "thai_suriyayart",
          calculationPolicyId: "policy:default",
          calculationPolicyVersion: "1.0.0",
          timeState: validTimeState,
          requestedScope: ["planetary_positions"],
          provenance: {
            clientOrigin: "web-ui",
            traceId: "trace-987",
          },
        };
        expect(CalculationRequestSchema.safeParse(validRequestWithProvenance).success).toBe(true);

        const invalidRequestWithFunc = {
          ...validRequestWithProvenance,
          provenance: {
            callback: () => {},
          },
        };
        expect(CalculationRequestSchema.safeParse(invalidRequestWithFunc).success).toBe(false);
      });

      it("CalculatedFactSchema uses ProvenanceRecord boundary while value remains open", () => {
        const validFactWithProvenance = {
          ...validCalculatedFact,
          provenance: {
            formulaId: "suriyayart-sun-coord",
            intermediateStepCount: 4,
          },
        };
        expect(CalculatedFactSchema.safeParse(validFactWithProvenance).success).toBe(true);

        // Provenance must reject invalid data
        const invalidFactProvenance = {
          ...validCalculatedFact,
          provenance: {
            timestamp: new Date(), // Date is prohibited in provenance
          },
        };
        expect(CalculatedFactSchema.safeParse(invalidFactProvenance).success).toBe(false);

        // But unrelated fact value allows open data structures
        const factWithCustomValue = {
          ...validCalculatedFact,
          value: { anyKey: "anyValue", count: 12 },
        };
        expect(CalculatedFactSchema.safeParse(factWithCustomValue).success).toBe(true);
      });

      it("CalculationSnapshotSchema uses ProvenanceRecord boundary", () => {
        const validSnapshotWithProvenance = {
          ...validCalculationSnapshot,
          provenance: {
            gitCommit: "5973cb0c2d287b15440116bf82f9611d67d70042",
            nodeVersion: "v20.0.0",
          },
        };
        expect(CalculationSnapshotSchema.safeParse(validSnapshotWithProvenance).success).toBe(true);

        const invalidSnapshotWithNaN = {
          ...validCalculationSnapshot,
          provenance: {
            invalidMetric: NaN,
          },
        };
        expect(CalculationSnapshotSchema.safeParse(invalidSnapshotWithNaN).success).toBe(false);
      });

      it("CalculationValidationRecordSchema uses ProvenanceRecord boundary while discrepancies remains open", () => {
        const validRecordWithProvenance = {
          ...validValidationRecord,
          provenance: {
            validatorId: "validator-worker-01",
            rulesRun: 12,
          },
          discrepancies: [{ factId: "fact:1", delta: 0.001, details: { raw: "diff" } }],
        };
        expect(CalculationValidationRecordSchema.safeParse(validRecordWithProvenance).success).toBe(true);

        const invalidRecordWithSymbol = {
          ...validValidationRecord,
          provenance: {
            symProp: Symbol("bad"),
          },
        };
        expect(CalculationValidationRecordSchema.safeParse(invalidRecordWithSymbol).success).toBe(false);
      });
    });
  });
});
