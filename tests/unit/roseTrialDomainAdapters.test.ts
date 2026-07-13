// GF-APP-077B — Rose Trial Domain Adapters Unit Tests

import { describe, it, expect } from "vitest";
import {
  createRoseTrialRecordId,
  mapRosePreparationToPlannedRecord,
  mapRoseDay0ToActualRecord,
} from "../../src/lib/rose-trial-domain/adapters";
import type { RoseTrialState } from "../../src/components/workspaces/travel/rose-trial/types";
import type { RoseDay0State } from "../../src/components/workspaces/travel/rose-trial/day-0/types";
import { createDefaultRoseTrialState } from "../../src/components/workspaces/travel/rose-trial/defaults";

describe("Rose Trial Domain Adapters (GF-APP-077B)", () => {
  // Mock Data
  const validPrepState: RoseTrialState = {
    version: 1,
    pilot: {
      trialName: "การทดสอบปักชำกุหลาบพันธุ์จุฬาลงกรณ์",
      cropName: "กุหลาบ",
      goal: "เพื่อหาความเข้มข้นที่เหมาะสมที่สุดของฮอร์โมน IBA ในวัสดุปลูกเพอร์ไลต์ผสมพีทมอส",
      location: "โรงเรือนวิจัย Green Fineness A",
      expectedStartDate: "2026-07-20",
      notes: "หมายเหตุภาพรวมการทดสอบแบบไพลอต",
    },
    batch: {
      batchName: "BATCH-ROSE-C1",
      totalCuttings: 30,
      plannedStartDate: "2026-07-20",
      notes: "แผนเริ่มปลายเดือน",
    },
    checklistItems: [],
    treatments: [
      {
        id: "tr-t1",
        code: "T1",
        name: "IBA 1000 ppm",
        description: "จุ่มฮอร์โมน 5 วินาที",
        cuttingCount: 15,
        inputName: "IBA 1000 ppm",
        notes: "",
        source: "default",
      },
      {
        id: "tr-t2",
        code: "T2",
        name: "IBA 3000 ppm",
        description: "จุ่มฮอร์โมน 5 วินาที",
        cuttingCount: 15,
        inputName: "IBA 3000 ppm",
        notes: "",
        source: "default",
      },
    ],
    updatedAt: "2026-07-13T10:00:00.000Z",
  };

  const validDay0State: RoseDay0State = {
    version: 1,
    trialSnapshot: {
      trialName: "การทดสอบปักชำกุหลาบพันธุ์จุฬาลงกรณ์",
      cropName: "กุหลาบ",
      goal: "เพื่อหาความเข้มข้นที่เหมาะสมที่สุดของฮอร์โมน IBA ในวัสดุปลูกเพอร์ไลต์ผสมพีทมอส",
      batchName: "BATCH-ROSE-C1",
      plannedStartDate: "2026-07-20",
      totalCuttings: 30,
      treatments: [
        {
          code: "T1",
          name: "IBA 1000 ppm",
          description: "จุ่มฮอร์โมน 5 วินาที",
          cuttingCount: 15,
          inputName: "IBA 1000 ppm",
          notes: "",
        },
        {
          code: "T2",
          name: "IBA 3000 ppm",
          description: "จุ่มฮอร์โมน 5 วินาที",
          cuttingCount: 15,
          inputName: "IBA 3000 ppm",
          notes: "",
        },
      ],
      readinessStatus: "ready_for_day0",
      sourceUpdatedAt: "2026-07-13T10:00:00.000Z",
    },
    startInfo: {
      actualStartDate: "2026-07-21",
      actualStartTime: "09:30",
      operatorName: "นักวิจัยเกียรติศักดิ์",
      location: "โรงเรือนวิจัย Green Fineness A",
      weatherInfo: "แดดจัด ความชื้นสัมพัทธ์ต่ำช่วงบ่าย",
      notes: "เริ่มลงมือจริงหลังเลื่อนแผน 1 วัน",
    },
    sourcePlant: {
      sourcePlantId: "P-JLG-001",
      cultivarName: "จุฬาลงกรณ์",
      isUnknownCultivar: false,
      sourceOrigin: "สวนกุหลาบแม่ริม",
      estimatedAge: "2 ปี",
      overallHealth: "สมบูรณ์ดีมาก ไม่มีโรคพืช",
      observedPestsOrDiseases: "ไม่พบ",
      lastFertilizedDate: "2026-07-01",
      lastSprayedDate: "2026-07-05",
      notes: "",
    },
    cuttingSetup: {
      actualCuttingCount: 30,
      cuttingTypeDescription: "กิ่งกึ่งแก่กึ่งอ่อน (semi-hardwood)",
      targetLengthCm: "15",
      targetNodeCount: "3",
      remainingLeafCount: "2 ใบย่อย",
      isBudsOrFlowersRemoved: true,
      basePreparationMethod: "เฉือน 45 องศาใต้ข้อ",
      notes: "",
    },
    propagationSetup: {
      mediumName: "เพอร์ไลต์ผสมพีทมอส 1:1",
      mediumIngredients: "เพอร์ไลต์, พีทมอส",
      mediumRatio: "1:1",
      mediumPreparation: "พรมน้ำยาฆ่าเชื้อราล่วงหน้า 24 ชม.",
      initialMediumMoisture: "ชื้นหมาดไม่เกาะตัว",
      notes: "",
      containerType: "ถาดเพาะชำ",
      containerQuantity: 30,
      containerSize: "2 นิ้ว",
      hasDrainageHoles: true,
      isOneCuttingPerContainer: true,
      waterSource: "น้ำประปาพักคลอรีน",
      waterPh: "6.2",
      waterEc: "0.1",
      waterTemp: "25",
      waterNotes: "",
      humiditySystemType: "dome",
      humidityVentType: "เปิดระบาย",
      humidityVentMethod: "เปิดระบายลมอ่อน",
    },
    environment: {
      isIndoor: false,
      lightIntensityEstimate: "แสลน 50%",
      hasDirectSunlight: false,
      temperatureCelsius: "28",
      relativeHumidityPercent: "65",
      windConditions: "นิ่ง",
      rainConditions: "ไม่มี",
      rainProtection: "มีหลังคาใส",
      notes: "",
    },
    trialUnits: [],
    treatments: [
      {
        id: "tr-t1",
        code: "T1",
        name: "IBA 1000 ppm",
        description: "จุ่มฮอร์โมน 5 วินาที",
        cuttingCount: 15,
        inputName: "IBA 1000 ppm",
        notes: "ใช้จริง",
        source: "snapshot",
      },
      {
        id: "tr-t2",
        code: "T2",
        name: "IBA 3000 ppm",
        description: "จุ่มฮอร์โมน 5 วินาที",
        cuttingCount: 15,
        inputName: "IBA 3000 ppm",
        notes: "ใช้จริง",
        source: "snapshot",
      },
    ],
    batch: {
      batchName: "BATCH-ROSE-C1",
    },
    deviations: [],
    observation: {
      directObservation: "กิ่งสดดี ใบไม่สลด แผลช้ำเล็กน้อย",
      interpretation: "พร้อมแบ่งเซลล์สร้างแคลลัส",
      uncertainty: "ความชื้นคุมยากตามสภาพอากาศ",
    },
    notes: "",
    status: "completed",
    createdAt: "2026-07-13T10:05:00.000Z",
    updatedAt: "2026-07-13T10:15:00.000Z",
    completedAt: "2026-07-13T10:15:00.000Z",
  };

  // ─── Tests — Stable Identity ────────────────────────────────────────────────

  describe("Stable ID Generator", () => {
    it("should generate deterministic IDs for title and batch name", () => {
      const id1 = createRoseTrialRecordId("กุหลาบ", "BATCH-1", "planned");
      const id2 = createRoseTrialRecordId("กุหลาบ", "BATCH-1", "planned");
      expect(id1).toBe(id2);
    });

    it("should produce different IDs for planned vs actual mode", () => {
      const idPlanned = createRoseTrialRecordId("กุหลาบ", "BATCH-1", "planned");
      const idActual = createRoseTrialRecordId("กุหลาบ", "BATCH-1", "actual");
      expect(idPlanned).not.toBe(idActual);
    });

    it("should support Thai language, handle extra whitespace, and ignore casing differences", () => {
      const id1 = createRoseTrialRecordId("  การทดลอง  กุหลาบ  ", "Batch-A  ", "planned");
      const id2 = createRoseTrialRecordId("การทดลอง กุหลาบ", "batch-a", "planned");
      expect(id1).toBe(id2);
      expect(id1).toContain("planned");
    });

    it("should use the known 32-bit FNV-1a result", () => {
      expect(createRoseTrialRecordId("กุหลาบ", "BATCH-1", "planned"))
        .toBe("rose-cutting:planned:6fdb5aa2");
    });

    it("should normalize canonically equivalent Unicode input", () => {
      const nfc = createRoseTrialRecordId("Café กุหลาบ", "BATCH-1", "planned");
      const nfd = createRoseTrialRecordId("Cafe\u0301 กุหลาบ", "BATCH-1", "planned");
      expect(nfc).toBe(nfd);
    });
  });

  // ─── Tests — Preparation to Planned ──────────────────────────────────────────

  describe("Preparation to Planned Adapter", () => {
    it("should return null for untouched default state", () => {
      expect(mapRosePreparationToPlannedRecord(createDefaultRoseTrialState())).toBeNull();
    });

    it("should map meaningful partial state as draft", () => {
      const partial = createDefaultRoseTrialState();
      partial.pilot.trialName = "แผนทดลองใหม่";
      expect(mapRosePreparationToPlannedRecord(partial)?.metadata.status).toBe("draft");
    });

    it("should map valid state to Planned record correctly", () => {
      const record = mapRosePreparationToPlannedRecord(validPrepState);
      expect(record).not.toBeNull();
      expect(record!.metadata.mode).toBe("planned");
      expect(record!.identity.title).toBe("การทดสอบปักชำกุหลาบพันธุ์จุฬาลงกรณ์");
      expect(record!.plannedBatch.batchName).toBe("BATCH-ROSE-C1");
      expect(record!.plannedBatch.plannedUnitCount).toBe(30);
      expect(record!.plannedTreatments.length).toBe(2);
      expect(record!.plannedStartDate).toBe("2026-07-20");
      expect(record!.metadata.status).toBe("ready");
    });

    it("should return null for empty/invalid state missing trialName", () => {
      const badState: RoseTrialState = {
        ...validPrepState,
        pilot: { ...validPrepState.pilot, trialName: "" },
      };
      expect(mapRosePreparationToPlannedRecord(badState)).toBeNull();
      expect(mapRosePreparationToPlannedRecord(null)).toBeNull();
    });

    it("should safely handle empty treatments array", () => {
      const emptyTrState: RoseTrialState = {
        ...validPrepState,
        treatments: [],
      };
      const record = mapRosePreparationToPlannedRecord(emptyTrState);
      expect(record).not.toBeNull();
      expect(record!.plannedTreatments).toEqual([]);
    });

    it("should normalize invalid total cuttings count safely to 0", () => {
      const badCuttingsState: RoseTrialState = {
        ...validPrepState,
        batch: { ...validPrepState.batch, totalCuttings: -5 },
      };
      const record = mapRosePreparationToPlannedRecord(badCuttingsState);
      expect(record!.plannedBatch.plannedUnitCount).toBe(0);
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      "should normalize invalid planned counts %s to 0",
      (count) => {
        const state = {
          ...validPrepState,
          batch: { ...validPrepState.batch, totalCuttings: count },
          treatments: [{ ...validPrepState.treatments[0], cuttingCount: count }],
        };
        const record = mapRosePreparationToPlannedRecord(state);
        expect(record!.plannedBatch.plannedUnitCount).toBe(0);
        expect(record!.plannedTreatments[0].plannedUnitCount).toBe(0);
      }
    );

    it("should map optional pending readiness to partial", () => {
      const state: RoseTrialState = {
        ...validPrepState,
        checklistItems: [{
          id: "optional-item",
          name: "อุปกรณ์เสริม",
          category: "equipment",
          isCritical: false,
          requiredQuantity: 1,
          unit: "ชิ้น",
          status: "to_buy",
          notes: "",
          source: "user",
        }],
      };
      expect(mapRosePreparationToPlannedRecord(state)?.metadata.status).toBe("partial");
    });

    it("should preserve valid timestamps and never synthesize missing or invalid values", () => {
      const valid = mapRosePreparationToPlannedRecord(validPrepState);
      const missing = mapRosePreparationToPlannedRecord({ ...validPrepState, updatedAt: null });
      const invalid = mapRosePreparationToPlannedRecord({
        ...validPrepState,
        version: 0,
        updatedAt: "not-a-timestamp",
      });
      expect(valid!.metadata.updatedAt).toBe(validPrepState.updatedAt);
      expect(valid!.metadata.createdAt).toBeNull();
      expect(missing!.metadata.updatedAt).toBeNull();
      expect(invalid!.metadata.updatedAt).toBeNull();
      expect(invalid!.metadata.version).toBe(1);
      expect(mapRosePreparationToPlannedRecord({
        ...validPrepState,
        updatedAt: "2026-02-30T10:00:00Z",
      })!.metadata.updatedAt).toBeNull();
      expect(mapRosePreparationToPlannedRecord({ ...validPrepState, updatedAt: null }))
        .toEqual(missing);
    });

    it("should preserve duplicate treatments and mark the record incomplete", () => {
      const state = {
        ...validPrepState,
        treatments: [
          validPrepState.treatments[0],
          { ...validPrepState.treatments[1], code: " t1 " },
        ],
      };
      const record = mapRosePreparationToPlannedRecord(state);
      expect(record!.plannedTreatments).toHaveLength(2);
      expect(record!.dataIssues).toContain("duplicate_treatment_code");
    });

    it("should fallback plannedStartDate to null when date is malformed", () => {
      const badDateState: RoseTrialState = {
        ...validPrepState,
        batch: { ...validPrepState.batch, plannedStartDate: "not-a-date" },
      };
      const record = mapRosePreparationToPlannedRecord(badDateState);
      expect(record!.plannedStartDate).toBeNull();
    });

    it("should preserve Thai characters in title and description", () => {
      const record = mapRosePreparationToPlannedRecord(validPrepState);
      expect(record!.identity.title).toBe("การทดสอบปักชำกุหลาบพันธุ์จุฬาลงกรณ์");
    });

    it("should not mutate the input state object", () => {
      const clone = structuredClone(validPrepState);
      mapRosePreparationToPlannedRecord(validPrepState);
      expect(validPrepState).toEqual(clone);
    });
  });

  // ─── Tests — Day 0 to Actual ────────────────────────────────────────────────

  describe("Day 0 to Actual Adapter", () => {
    it("should map completed Day 0 state to Actual record correctly", () => {
      const record = mapRoseDay0ToActualRecord(validDay0State);
      expect(record).not.toBeNull();
      expect(record!.metadata.mode).toBe("actual");
      expect(record!.metadata.status).toBe("completed");
      expect(record!.actualBatch.batchName).toBe("BATCH-ROSE-C1");
      expect(record!.actualBatch.actualUnitCount).toBe(30);
      expect(record!.day0Observation.directObservation).toBe("กิ่งสดดี ใบไม่สลด แผลช้ำเล็กน้อย");
    });

    it("should map draft Day 0 state with correct status", () => {
      const draftState: RoseDay0State = {
        ...validDay0State,
        status: "draft",
      };
      const record = mapRoseDay0ToActualRecord(draftState);
      expect(record!.metadata.status).toBe("draft");
    });

    it("should establish the planned record reference from the immutable snapshot", () => {
      const record = mapRoseDay0ToActualRecord(validDay0State);
      expect(record!.metadata.source.sourceMode).toBe("planned");
      expect(record!.metadata.source.sourceRecordId).toBe(
        createRoseTrialRecordId(
          validDay0State.trialSnapshot.trialName,
          validDay0State.trialSnapshot.batchName,
          "planned"
        )
      );
    });

    it("should fallback to deterministic planned ID when no plannedRecordId is supplied", () => {
      const record = mapRoseDay0ToActualRecord(validDay0State);
      const expectedPlannedId = createRoseTrialRecordId(
        validDay0State.trialSnapshot.trialName,
        validDay0State.trialSnapshot.batchName,
        "planned"
      );
      expect(record!.metadata.source.sourceRecordId).toBe(expectedPlannedId);
    });

    it("should keep Actual identity stable when editable Day 0 batch changes", () => {
      const changed = {
        ...validDay0State,
        batch: { batchName: "CURRENT-PREP-CHANGED" },
      };
      expect(mapRoseDay0ToActualRecord(changed)?.metadata.id)
        .toBe(mapRoseDay0ToActualRecord(validDay0State)?.metadata.id);
      expect(mapRoseDay0ToActualRecord(changed)?.metadata.source.sourceRecordId)
        .toBe(mapRoseDay0ToActualRecord(validDay0State)?.metadata.source.sourceRecordId);
    });

    it("should use sourceMode none when snapshot source identity is incomplete", () => {
      const state = {
        ...validDay0State,
        trialSnapshot: { ...validDay0State.trialSnapshot, batchName: "" },
      };
      const record = mapRoseDay0ToActualRecord(state);
      expect(record!.metadata.source).toMatchObject({
        sourceMode: "none",
        sourceRecordId: null,
        sourceVersion: null,
      });
    });

    it("should safely fallback actualStartDate to null when date is malformed", () => {
      const badDateState: RoseDay0State = {
        ...validDay0State,
        startInfo: { ...validDay0State.startInfo, actualStartDate: "2026/07/21" },
      };
      const record = mapRoseDay0ToActualRecord(badDateState);
      expect(record!.actualStartDate).toBeNull();
    });

    it("should safely handle empty directObservation", () => {
      const noObsState: RoseDay0State = {
        ...validDay0State,
        observation: { directObservation: "", interpretation: "", uncertainty: "" },
      };
      const record = mapRoseDay0ToActualRecord(noObsState);
      expect(record!.day0Observation.directObservation).toBe("");
    });

    it("should preserve valid metadata timestamps and null invalid or missing values", () => {
      const valid = mapRoseDay0ToActualRecord(validDay0State);
      const invalid = mapRoseDay0ToActualRecord({
        ...validDay0State,
        version: 0,
        createdAt: "invalid",
        updatedAt: null,
        completedAt: "invalid",
      });
      expect(valid!.metadata.createdAt).toBe(validDay0State.createdAt);
      expect(valid!.metadata.completedAt).toBe(validDay0State.completedAt);
      expect(invalid!.metadata).toMatchObject({
        version: 1,
        createdAt: null,
        updatedAt: null,
        completedAt: null,
      });
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      "should normalize invalid actual counts %s to 0",
      (count) => {
        const state = {
          ...validDay0State,
          cuttingSetup: { ...validDay0State.cuttingSetup, actualCuttingCount: count },
          treatments: [{ ...validDay0State.treatments[0], cuttingCount: count }],
        };
        const record = mapRoseDay0ToActualRecord(state);
        expect(record!.actualBatch.actualUnitCount).toBe(0);
        expect(record!.actualTreatments[0].actualUnitCount).toBe(0);
      }
    );

    it("should skip null treatments and trial units without throwing", () => {
      const malformed = {
        ...validDay0State,
        treatments: [null],
        trialUnits: [null],
      } as unknown as RoseDay0State;
      const record = mapRoseDay0ToActualRecord(malformed);
      expect(record!.actualTreatments).toEqual([]);
      expect(record!.trialUnits).toEqual([]);
      expect(record!.dataIssues).toEqual(expect.arrayContaining([
        "malformed_treatment",
        "malformed_trial_unit",
      ]));
    });

    it("should not infer unit failure status from notes", () => {
      const state = {
        ...validDay0State,
        trialUnits: [{
          id: "ROSE-01",
          treatmentId: "tr-t1",
          treatmentCode: "T1",
          sequenceNumber: 1,
          label: "กิ่ง 1",
          containerCode: "C1",
          initialCondition: "ปกติ",
          notes: "ต้นตายและเริ่มเน่า",
        }],
      };
      expect(mapRoseDay0ToActualRecord(state)?.trialUnits[0].status).toBe("active");
    });

    it("should preserve explicit valid status and fallback invalid status to active", () => {
      const baseUnit = {
        id: "ROSE-01",
        treatmentId: "tr-t1",
        treatmentCode: "T1",
        sequenceNumber: 1,
        label: "กิ่ง 1",
        containerCode: "C1",
        initialCondition: "ปกติ",
        notes: "",
      };
      const explicit = mapRoseDay0ToActualRecord({
        ...validDay0State,
        trialUnits: [{ ...baseUnit, status: "failed" }],
      } as RoseDay0State);
      const invalid = mapRoseDay0ToActualRecord({
        ...validDay0State,
        trialUnits: [{ ...baseUnit, status: "unknown" }],
      } as RoseDay0State);
      expect(explicit!.trialUnits[0].status).toBe("failed");
      expect(invalid!.trialUnits[0].status).toBe("active");
      expect(invalid!.dataIssues).toContain("invalid_trial_unit_status");
    });

    it("should replace duplicate unit IDs deterministically and mark the issue", () => {
      const unit = {
        id: "ROSE-01",
        treatmentId: "tr-t1",
        treatmentCode: "T1",
        sequenceNumber: 1,
        label: "กิ่ง 1",
        containerCode: "C1",
        initialCondition: "ปกติ",
        notes: "",
      };
      const record = mapRoseDay0ToActualRecord({
        ...validDay0State,
        trialUnits: [unit, { ...unit, sequenceNumber: 2 }],
      });
      expect(record!.trialUnits.map((item) => item.id)).toEqual(["ROSE-01", "unit-02"]);
      expect(record!.dataIssues).toContain("duplicate_trial_unit_id");
    });

    it("should prevent UI crash when nested objects are missing/null", () => {
      // Create malformed state safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const malformed: any = {
        version: 1,
        trialSnapshot: { trialName: "กุหลาบดอย", treatments: [] },
        // other fields are missing or empty
      };
      expect(() => mapRoseDay0ToActualRecord(malformed)).not.toThrow();
      const record = mapRoseDay0ToActualRecord(malformed);
      expect(record).not.toBeNull();
      expect(record!.day0Observation.directObservation).toBe("");
      expect(record!.trialUnits).toEqual([]);
    });

    it("should not mutate the input Day 0 state object", () => {
      const clone = structuredClone(validDay0State);
      mapRoseDay0ToActualRecord(validDay0State);
      expect(validDay0State).toEqual(clone);
    });
  });
});
