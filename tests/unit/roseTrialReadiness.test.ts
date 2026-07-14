import { describe, expect, it } from "vitest";
import { createDefaultRoseTrialState } from "@/components/workspaces/travel/rose-trial/defaults";
import { calculateReadiness } from "@/components/workspaces/travel/rose-trial/readiness";
import type { RoseTrialStateV2 } from "@/components/workspaces/travel/rose-trial/types";

function createLegacyReadyState(): RoseTrialStateV2 {
  const state = createDefaultRoseTrialState();
  return {
    ...state,
    pilot: { ...state.pilot, trialName: "Rose Trial", goal: "Compare rooting" },
    batch: { ...state.batch, batchName: "Batch A", totalCuttings: 8 },
    checklistItems: state.checklistItems.map((item) => ({ ...item, status: "ready" })),
    treatments: state.treatments.map((treatment) => ({ ...treatment, cuttingCount: 4 })),
    inventory: state.inventory.map((item) => ({
      ...item,
      availableQuantity: item.requiredQuantity,
      usableQuantity: item.requiredQuantity,
      status: "ready",
    })),
    treatmentProduct: {
      ...state.treatmentProduct,
      status: "ready_to_use",
      packagingType: "original",
      seller: "ผู้ขายที่ตรวจสอบแล้ว",
      expiryNote: "ตรวจแล้ว",
      applicationMethod: "ใช้ตามข้อมูลผู้ขาย",
      storageNote: "เก็บตามข้อมูลผู้ขาย",
    },
    samples: state.samples.map((sample) => ({
      ...sample,
      status: "ready",
      baseline: {
        ...sample.baseline,
        sampleLabel: sample.id,
        length: "12",
        nodeCount: "3",
        initialCondition: "normal",
        note: "ตรวจแล้ว",
        photoChecklist: { ...sample.baseline.photoChecklist },
      },
    })),
  };
}

describe("Rose Trial preparation readiness", () => {
  it("returns not_ready and canStart false for a legacy critical blocker", () => {
    const state = createLegacyReadyState();
    state.checklistItems[0] = { ...state.checklistItems[0], status: "to_buy" };

    const result = calculateReadiness(state);

    expect(result.status).toBe("not_ready");
    expect(result.canStart).toBe(false);
    expect(result.blockers).toContain("ยังมีอุปกรณ์/วัสดุจำเป็น 1 รายการที่ยังไม่พร้อมใช้");
  });

  it("returns partially_ready but canStart true for optional warnings", () => {
    const state = createLegacyReadyState();
    const optionalIndex = state.checklistItems.findIndex((item) => !item.isCritical);
    state.checklistItems[optionalIndex] = { ...state.checklistItems[optionalIndex], status: "to_buy" };

    const result = calculateReadiness(state);

    expect(result.status).toBe("partially_ready");
    expect(result.canStart).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.warnings).toEqual(["ยังมีอุปกรณ์/วัสดุทางเลือก 1 รายการที่ยังไม่พร้อมใช้"]);
  });

  it("returns ready when Inventory, Product, and Sample gates pass while workflow stays pending", () => {
    const result = calculateReadiness(createLegacyReadyState());

    expect(result.status).toBe("ready_for_day0");
    expect(result.canStart).toBe(true);
    expect(result.sections).toMatchObject({
      inventory: "ready",
      treatmentProduct: "ready",
      samples: "ready",
      day0Workflow: "pending",
    });
  });

  it("keeps allocation mismatch and duplicate codes as deterministic blockers without mutation", () => {
    const state = createLegacyReadyState();
    state.treatments = state.treatments.map((treatment, index) => ({
      ...treatment,
      code: "T0",
      cuttingCount: index === 0 ? 3 : 4,
    }));
    const snapshot = structuredClone(state);

    const first = calculateReadiness(state);
    const second = calculateReadiness(state);

    expect(state).toEqual(snapshot);
    expect(first).toEqual(second);
    expect(first.blockers).toContain("มี Treatment Code ซ้ำกัน");
    expect(first.blockers).toContain("จำนวนกิ่งใน Treatment ขาดอีก 1 กิ่ง");
  });
});
