import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultRoseTrialState } from "@/components/workspaces/travel/rose-trial/defaults";
import { migrateRoseTrialStateV1 } from "@/components/workspaces/travel/rose-trial/migration";
import {
  loadRoseTrialState,
  ROSE_TRIAL_STORAGE_KEY,
  saveRoseTrialState,
} from "@/components/workspaces/travel/rose-trial/storage";
import type { RoseTrialStateV1 } from "@/components/workspaces/travel/rose-trial/types";

function createV1State(): RoseTrialStateV1 {
  const current = createDefaultRoseTrialState();
  return {
    version: 1,
    pilot: { ...current.pilot, trialName: "แปลงทดลองภาษาไทย", notes: "หมายเหตุเดิม" },
    batch: { ...current.batch, batchName: "ชุดเดิม", totalCuttings: 12 },
    checklistItems: current.checklistItems.map((item, index) => ({
      ...item,
      status: index === 0 ? "received" : item.status,
      notes: index === 0 ? "บันทึกเดิม" : item.notes,
    })),
    treatments: current.treatments.map((treatment, index) => ({
      ...treatment,
      name: index === 0 ? "ชุดควบคุมเดิม" : treatment.name,
      cuttingCount: 6,
      notes: "โน้ต Treatment เดิม",
    })),
    updatedAt: "2026-07-01T08:00:00.000Z",
  };
}

function installStorage(raw: string | null) {
  const store = new Map<string, string>();
  if (raw !== null) store.set(ROSE_TRIAL_STORAGE_KEY, raw);
  const setItem = vi.fn((key: string, value: string) => store.set(key, value));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem,
      removeItem: vi.fn((key: string) => store.delete(key)),
    },
  });
  return { store, setItem };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Rose Trial v1 to v2 migration", () => {
  it("creates independent nested v2 defaults with unique locked contract IDs", () => {
    const first = createDefaultRoseTrialState();
    const second = createDefaultRoseTrialState();

    expect(first).not.toBe(second);
    expect(first.groupConfig).not.toBe(second.groupConfig);
    expect(first.inventory).not.toBe(second.inventory);
    expect(first.samples).not.toBe(second.samples);
    expect(first.samples[0].baseline).not.toBe(second.samples[0].baseline);
    expect(first.samples[0].baseline.photoChecklist).not.toBe(second.samples[0].baseline.photoChecklist);
    expect(first.day0Workflow.steps).not.toBe(second.day0Workflow.steps);
    expect(first.groupConfig.every((group) => group.locked)).toBe(true);
    expect(new Set(first.inventory.map((item) => item.id)).size).toBe(first.inventory.length);
    expect(new Set(first.day0Workflow.steps.map((step) => step.id)).size).toBe(first.day0Workflow.steps.length);
  });

  it("preserves v1 content and creates canonical v2 foundation deterministically", () => {
    const source = createV1State();
    const snapshot = structuredClone(source);

    const first = migrateRoseTrialStateV1(source);
    const second = migrateRoseTrialStateV1(source);

    expect(source).toEqual(snapshot);
    expect(first).toEqual(second);
    expect(first.state.version).toBe(2);
    expect(first.state.pilot.trialName).toBe("แปลงทดลองภาษาไทย");
    expect(first.state.pilot.notes).toBe("หมายเหตุเดิม");
    expect(first.state.checklistItems[0]).toMatchObject({ status: "received", notes: "บันทึกเดิม" });
    expect(first.state.treatments[0]).toMatchObject({ name: "ชุดควบคุมเดิม", cuttingCount: 6 });
    expect(first.state.groupConfig.map((group) => group.id)).toEqual(["W-T0", "W-T1", "P-T0", "P-T1"]);
    expect(first.state.samples).toHaveLength(8);
    expect(first.issues).toHaveLength(1);
  });

  it("loads v1 in memory without writing storage", () => {
    const { setItem } = installStorage(JSON.stringify(createV1State()));

    const result = loadRoseTrialState();

    expect(result.status).toBe("migrated");
    expect(result.state.version).toBe(2);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("loads valid v2 directly and writes version 2 only on explicit save", () => {
    const state = createDefaultRoseTrialState();
    const { setItem } = installStorage(JSON.stringify(state));

    expect(loadRoseTrialState()).toEqual({ state, status: "valid" });
    expect(setItem).not.toHaveBeenCalled();
    expect(saveRoseTrialState(state)).toBe(true);
    expect(JSON.parse(setItem.mock.calls[0][1]).version).toBe(2);
  });

  it.each([
    ["empty", null, "empty"],
    ["corrupt JSON", "{", "corrupt"],
    ["wrong shape", JSON.stringify({ version: 2, pilot: {} }), "corrupt"],
    ["unsupported", JSON.stringify({ version: 99 }), "unsupported"],
  ])("returns a safe default for %s without overwriting raw storage", (_label, raw, expectedStatus) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { store, setItem } = installStorage(raw);
    const before = store.get(ROSE_TRIAL_STORAGE_KEY);

    const result = loadRoseTrialState();

    expect(result.status).toBe(expectedStatus);
    expect(result.state.version).toBe(2);
    expect(setItem).not.toHaveBeenCalled();
    expect(store.get(ROSE_TRIAL_STORAGE_KEY)).toBe(before);
  });

  it("loads v2 and normalizes optional fields missing in storage", () => {
    const rawState = createDefaultRoseTrialState();
    delete (rawState.treatmentProduct as unknown as Record<string, unknown>).brand;
    delete (rawState.treatmentProduct as unknown as Record<string, unknown>).productUrl;
    for (const item of rawState.inventory) {
      delete (item as unknown as Record<string, unknown>).note;
      delete (item as unknown as Record<string, unknown>).availableQuantity;
      delete (item as unknown as Record<string, unknown>).usableQuantity;
    }
    for (const sample of rawState.samples) {
      delete (sample.baseline as unknown as Record<string, unknown>).note;
    }

    const { setItem } = installStorage(JSON.stringify(rawState));
    const result = loadRoseTrialState();

    expect(result.status).toBe("valid");
    expect(result.state.treatmentProduct.brand).toBe("Clonex");
    expect(result.state.treatmentProduct.productUrl).toBe("");
    expect(result.state.inventory.every((item) => item.note === "")).toBe(true);
    expect(result.state.inventory.every((item) => item.availableQuantity === 0)).toBe(true);
    expect(result.state.inventory.every((item) => item.usableQuantity === 0)).toBe(true);
    expect(result.state.samples.every((sample) => sample.baseline.note === "")).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([
    ["decimal", 1.5, 0],
    ["valid integer", 3, 3],
  ])("normalizes a stored %s quantity without rewriting raw storage", (_label, storedValue, expectedValue) => {
    const rawState = createDefaultRoseTrialState();
    const target = rawState.inventory.find((item) => item.id === "inventory-clonex");
    expect(target).toBeDefined();
    if (!target) return;
    target.availableQuantity = storedValue;
    target.usableQuantity = storedValue;
    const raw = JSON.stringify(rawState);
    const { store, setItem } = installStorage(raw);

    const result = loadRoseTrialState();
    const normalized = result.state.inventory.find((item) => item.id === "inventory-clonex");

    expect(result.status).toBe("valid");
    expect(normalized?.availableQuantity).toBe(expectedValue);
    expect(normalized?.usableQuantity).toBe(expectedValue);
    expect(store.get(ROSE_TRIAL_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([
    ["string", "3"],
    ["object", {}],
    ["array", []],
    ["null", null],
  ])("rejects a stored quantity with wrong structural type: %s", (_label, malformedValue) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const rawState = createDefaultRoseTrialState();
    const target = rawState.inventory.find((item) => item.id === "inventory-clonex");
    expect(target).toBeDefined();
    if (!target) return;
    (target as unknown as Record<string, unknown>).availableQuantity = malformedValue;
    const raw = JSON.stringify(rawState);
    const { store, setItem } = installStorage(raw);

    const result = loadRoseTrialState();

    expect(result.status).toBe("corrupt");
    expect(store.get(ROSE_TRIAL_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rejects v2 payload with structural corruption", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const stateWithBadQuantity = createDefaultRoseTrialState();
    (stateWithBadQuantity.inventory[0] as unknown as Record<string, unknown>).availableQuantity = { amount: 5 };
    installStorage(JSON.stringify(stateWithBadQuantity));
    expect(loadRoseTrialState().status).toBe("corrupt");

    const stateWithBadSamples = createDefaultRoseTrialState();
    (stateWithBadSamples as unknown as Record<string, unknown>).samples = "bad-string";
    installStorage(JSON.stringify(stateWithBadSamples));
    expect(loadRoseTrialState().status).toBe("corrupt");

    const stateWithBadUnknown = createDefaultRoseTrialState();
    (stateWithBadUnknown.inventory as unknown as unknown[]).push({
      id: "unknown-bad-item",
      category: "equipment",
      name: "อุปกรณ์ไม่ดี",
      requiredQuantity: 1,
      availableQuantity: 1,
      usableQuantity: 1,
      status: "ready",
      priority: "B",
      note: "",
      lastCheckedAt: null,
    });
    const { store } = installStorage(JSON.stringify(stateWithBadUnknown));
    const loadedResult = loadRoseTrialState();
    expect(loadedResult.status).toBe("valid");
    expect(loadedResult.state.inventory.find((i) => i.id === "unknown-bad-item")).toBeUndefined();
    expect(store.get(ROSE_TRIAL_STORAGE_KEY)).toContain("unknown-bad-item");
  });
});
