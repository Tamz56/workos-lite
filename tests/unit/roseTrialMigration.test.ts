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
});
