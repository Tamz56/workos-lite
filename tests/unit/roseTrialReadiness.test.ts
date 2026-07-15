import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultRoseTrialState } from "@/components/workspaces/travel/rose-trial/defaults";
import { calculateReadiness } from "@/components/workspaces/travel/rose-trial/readiness";
import {
  loadRoseTrialState,
  ROSE_TRIAL_STORAGE_KEY,
} from "@/components/workspaces/travel/rose-trial/storage";
import type { RoseTrialStateV2 } from "@/components/workspaces/travel/rose-trial/types";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it.each(["have", "received"] as const)(
    "keeps checklist status %s blocked even when required quantity is zero",
    (status) => {
      const state = createLegacyReadyState();
      state.checklistItems[0] = {
        ...state.checklistItems[0],
        requiredQuantity: 0,
        status,
      };

      const result = calculateReadiness(state);

      expect(result.status).toBe("not_ready");
      expect(result.readyItems).toBe(result.totalItems - 1);
      expect(result.criticalMissingItems).toContainEqual(state.checklistItems[0]);
    }
  );

  it.each(["ready", "not_needed"] as const)(
    "counts checklist status %s as ready without removing it from the denominator",
    (status) => {
      const state = createLegacyReadyState();
      state.checklistItems[0] = {
        ...state.checklistItems[0],
        requiredQuantity: 0,
        status,
      };

      const result = calculateReadiness(state);

      expect(result.readyItems).toBe(result.totalItems);
      expect(result.totalItems).toBe(state.checklistItems.length);
      expect(result.criticalMissingItems).not.toContainEqual(state.checklistItems[0]);
    }
  );

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

  it("blocks if canonical inventory has negative available or usable quantity in storage", () => {
    const state = createLegacyReadyState();
    state.inventory = state.inventory.map((item) => item.id === "inventory-clonex"
      ? { ...item, availableQuantity: -5, usableQuantity: -5 }
      : item
    );
    const raw = JSON.stringify(state);
    const store = new Map([[ROSE_TRIAL_STORAGE_KEY, raw]]);
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem,
        removeItem: vi.fn(),
      },
    });

    const loaded = loadRoseTrialState();
    const normalized = loaded.state.inventory.find((item) => item.id === "inventory-clonex");
    const readiness = calculateReadiness(loaded.state);

    expect(loaded.status).toBe("valid");
    expect(normalized).toMatchObject({
      name: "Clonex Rooting Gel",
      unit: "ชุด",
      requiredQuantity: 1,
      availableQuantity: 0,
      usableQuantity: 0,
    });
    expect(readiness.canStart).toBe(false);
    expect(readiness.blockers.join(" ")).toContain("Inventory");
    expect(store.get(ROSE_TRIAL_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("clears inventory quantity blockers when usable count is updated to default requirements", () => {
    const state = createLegacyReadyState();
    state.inventory = state.inventory.map((item) => item.id === "inventory-clonex"
      ? { ...item, usableQuantity: 0, status: "ready" as const }
      : item
    );
    expect(calculateReadiness(state).canStart).toBe(false);

    state.inventory = state.inventory.map((item) => item.id === "inventory-clonex"
      ? { ...item, usableQuantity: 1 }
      : item
    );
    expect(calculateReadiness(state).canStart).toBe(true);
  });

  it("yields consistent readiness results for both Day 0 entry conditions and Preparation checks", () => {
    const state = createLegacyReadyState();
    const prepReadiness = calculateReadiness(state);
    const hasBlockers = prepReadiness.blockers.length > 0;
    const canStart = prepReadiness.canStart;

    expect(canStart).toBe(!hasBlockers);
    expect(prepReadiness.status).toBe("ready_for_day0");
  });
});
