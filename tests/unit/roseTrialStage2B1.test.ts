import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  clearRoseTrialState,
  loadRoseTrialState,
} from "@/components/workspaces/travel/rose-trial/storage";
import { createDefaultRoseTrialState } from "@/components/workspaces/travel/rose-trial/defaults";
import {
  calculateReadiness,
  parseIntegerInput,
} from "@/components/workspaces/travel/rose-trial/RoseTrialLabClient";
import type { RoseTrialState } from "@/components/workspaces/travel/rose-trial/types";

const STORAGE_KEY = "gf:rose-trial:v1";

function installLocalStorageMock(initialValue: string | null = null, removeThrows = false) {
  const store = new Map<string, string>();
  if (initialValue !== null) {
    store.set(STORAGE_KEY, initialValue);
  }

  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        if (removeThrows) {
          throw new Error("remove failed");
        }
        store.delete(key);
      }),
    },
  });
}

function createReadyState(): RoseTrialState {
  const state = createDefaultRoseTrialState();
  return {
    ...state,
    pilot: {
      ...state.pilot,
      trialName: "Rose Trial",
      goal: "Compare rooting preparation safely.",
    },
    batch: {
      ...state.batch,
      batchName: "Batch A",
      totalCuttings: 2,
    },
    checklistItems: state.checklistItems.map((item) => ({
      ...item,
      status: "ready",
    })),
    treatments: state.treatments.map((treatment) => ({
      ...treatment,
      cuttingCount: 1,
    })),
  };
}

describe("Rose Trial Stage 2B.1 storage safety", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns fresh default objects", () => {
    const first = createDefaultRoseTrialState();
    const second = createDefaultRoseTrialState();

    expect(first).not.toBe(second);
    expect(first.pilot).not.toBe(second.pilot);
    expect(first.checklistItems).not.toBe(second.checklistItems);
    expect(first.checklistItems[0]).not.toBe(second.checklistItems[0]);
    expect(first.treatments[0]).not.toBe(second.treatments[0]);
  });

  it.each([
    ["invalid JSON", "{"],
    ["missing pilot", JSON.stringify({ version: 1, batch: {}, checklistItems: [], treatments: [] })],
    ["empty pilot object", JSON.stringify({ version: 1, pilot: {}, batch: {}, checklistItems: [], treatments: [] })],
    ["empty batch object", JSON.stringify({ ...createDefaultRoseTrialState(), batch: {} })],
    ["checklist item missing field", JSON.stringify({ ...createDefaultRoseTrialState(), checklistItems: [{ id: "x" }] })],
    ["treatment missing field", JSON.stringify({ ...createDefaultRoseTrialState(), treatments: [{ id: "x" }] })],
    ["wrong version", JSON.stringify({ ...createDefaultRoseTrialState(), version: 2 })],
  ])("falls back to defaults for %s", (_label, raw) => {
    installLocalStorageMock(raw);

    const loaded = loadRoseTrialState();

    expect(loaded).toEqual(createDefaultRoseTrialState());
    expect(loaded).not.toBe(createDefaultRoseTrialState());
  });

  it("loads valid saved state", () => {
    const saved = createReadyState();
    installLocalStorageMock(JSON.stringify(saved));

    expect(loadRoseTrialState()).toEqual(saved);
  });

  it("returns false when clear fails", () => {
    installLocalStorageMock(JSON.stringify(createReadyState()), true);

    expect(clearRoseTrialState()).toBe(false);
  });

  it("returns true when clear succeeds", () => {
    installLocalStorageMock(JSON.stringify(createReadyState()));

    expect(clearRoseTrialState()).toBe(true);
  });
});

describe("Rose Trial Stage 2B.1 numeric validation", () => {
  it.each([
    ["1.5", 0, null],
    ["1e3", 0, null],
    ["-1", 0, null],
    ["", 0, 0],
    ["0", 0, 0],
    ["12", 0, 12],
  ])("parses %s with min %s", (value, minValue, expected) => {
    expect(parseIntegerInput(value, minValue)).toBe(expected);
  });

  it("keeps readiness not ready for invalid treatment counts", () => {
    const state = createReadyState();
    state.treatments[0].cuttingCount = Number.NaN;

    const readiness = calculateReadiness(state);

    expect(readiness.status).toBe("not_ready");
    expect(readiness.reasons).toContain("จำนวนกิ่งใน Treatment ต้องเป็นจำนวนเต็มไม่ติดลบ");
  });
});

describe("Rose Trial Stage 2B.1 copy guard", () => {
  it("does not tell partially ready users that Day 0 can start", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/RoseTrialLabClient.tsx"),
      "utf8"
    );

    expect(source).not.toContain("คุณสามารถเริ่มต้น Day 0 ได้");
    expect(source).toContain("ระบบยังไม่เปิดให้เริ่ม Day 0");
  });
});
