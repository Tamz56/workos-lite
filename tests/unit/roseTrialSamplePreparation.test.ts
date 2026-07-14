import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SamplePreparationSection } from "@/components/workspaces/travel/rose-trial/SamplePreparationSection";
import {
  createDefaultPilotGroupConfig,
  createDefaultRoseTrialState,
} from "@/components/workspaces/travel/rose-trial/defaults";
import { calculateReadiness } from "@/components/workspaces/travel/rose-trial/readiness";
import {
  createCanonicalSampleIds,
  normalizeSamplePreparationFields,
  summarizeSamplePreparation,
  updateTrialSamples,
} from "@/components/workspaces/travel/rose-trial/samplePreparation";
import {
  loadRoseTrialState,
  ROSE_TRIAL_STORAGE_KEY,
  saveRoseTrialState,
} from "@/components/workspaces/travel/rose-trial/storage";
import type { TrialSample } from "@/components/workspaces/travel/rose-trial/types";

const EXPECTED_IDS = [
  "W-T0-01", "W-T0-02", "W-T1-01", "W-T1-02",
  "P-T0-01", "P-T0-02", "P-T1-01", "P-T1-02",
];

function readySamples(): TrialSample[] {
  return createDefaultRoseTrialState().samples.map((sample) => ({
    ...sample,
    status: "ready",
    baseline: {
      ...sample.baseline,
      sampleLabel: `ป้าย ${sample.id}`,
      length: "12.5",
      nodeCount: "3",
      initialCondition: "normal",
      note: "ตรวจแล้ว",
      photoChecklist: { ...sample.baseline.photoChecklist },
    },
  }));
}

function installStorage() {
  const store = new Map<string, string>();
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

describe("Rose Trial Sample Preparation identity and updates", () => {
  it("uses the exact deterministic canonical IDs in stable group order", () => {
    const groups = createDefaultPilotGroupConfig();
    const first = createCanonicalSampleIds(groups);
    const second = createCanonicalSampleIds(groups);

    expect(first).toEqual(EXPECTED_IDS);
    expect(new Set(first).size).toBe(8);
    expect(second).toEqual(first);
  });

  it("keeps identity and other samples stable during an immutable update", () => {
    const samples = createDefaultRoseTrialState().samples;
    const snapshot = structuredClone(samples);
    const updated = updateTrialSamples(samples, "W-T0-01", {
      status: "ready",
      sampleLabel: "กิ่ง A",
      cuttingLength: "12.5",
      nodeCount: "3",
      initialCondition: "observe",
      notes: "สังเกตปลายใบ",
    });

    expect(samples).toEqual(snapshot);
    expect(updated).not.toBe(samples);
    expect(updated[0]).not.toBe(samples[0]);
    expect(updated[1]).toBe(samples[1]);
    expect(updated.map((sample) => sample.id)).toEqual(EXPECTED_IDS);
    expect(updated[0]).toMatchObject({ id: "W-T0-01", groupId: "W-T0", status: "ready" });
    expect(updated[0].baseline).toMatchObject({
      sampleLabel: "กิ่ง A",
      length: "12.5",
      nodeCount: "3",
      initialCondition: "observe",
      note: "สังเกตปลายใบ",
    });
  });

  it("rejects negative length, negative nodes, and decimal nodes without mutation", () => {
    const samples = createDefaultRoseTrialState().samples;
    const updated = updateTrialSamples(samples, samples[0].id, {
      cuttingLength: "-1",
      nodeCount: "2.5",
    });
    const negativeNodes = updateTrialSamples(samples, samples[0].id, { nodeCount: "-2" });

    expect(updated[0].baseline.length).toBe("");
    expect(updated[0].baseline.nodeCount).toBe("");
    expect(negativeNodes[0].baseline.nodeCount).toBe("");
    expect(samples[0].baseline.length).toBe("");
  });

  it("normalizes missing UI fields without changing sample identity", () => {
    const samples = createDefaultRoseTrialState().samples.map((sample) => ({
      ...sample,
      baseline: { ...sample.baseline, sampleLabel: undefined, initialCondition: "" },
    }));
    const normalized = normalizeSamplePreparationFields(samples);

    expect(normalized.map((sample) => sample.id)).toEqual(EXPECTED_IDS);
    expect(normalized.every((sample) => sample.baseline.sampleLabel === "")).toBe(true);
    expect(normalized.every((sample) => sample.baseline.initialCondition === "normal")).toBe(true);
  });
});

describe("Rose Trial Sample Preparation readiness", () => {
  const groups = createDefaultPilotGroupConfig();

  it("is blocked initially with zero ready samples", () => {
    const summary = summarizeSamplePreparation(createDefaultRoseTrialState().samples, groups);
    expect(summary).toMatchObject({ totalCount: 8, readyCount: 0, notReadyCount: 8, excludedCount: 0, status: "blocked" });
    expect(summary.blockers).toContain("Sample Preparation: ยังมี 8 ตัวอย่างที่ยังไม่พร้อม");
  });

  it("is ready when all eight canonical samples are ready and complete", () => {
    const summary = summarizeSamplePreparation(readySamples(), groups);
    expect(summary).toMatchObject({ readyCount: 8, notReadyCount: 0, excludedCount: 0, status: "ready" });
    expect(summary.blockers).toEqual([]);
    expect(summary.warnings).toEqual([]);
  });

  it("keeps observation and missing optional fields warning-only", () => {
    const samples = readySamples();
    samples[0] = {
      ...samples[0],
      baseline: {
        ...samples[0].baseline,
        sampleLabel: "",
        length: "",
        nodeCount: "",
        initialCondition: "observe",
        note: "",
      },
    };
    const summary = summarizeSamplePreparation(samples, groups);

    expect(summary.status).toBe("warning");
    expect(summary.readyCount).toBe(8);
    expect(summary.blockers).toEqual([]);
    expect(summary.warnings).toHaveLength(5);
  });

  it("blocks an unsuitable ready sample", () => {
    const samples = readySamples();
    samples[0] = { ...samples[0], baseline: { ...samples[0].baseline, initialCondition: "unsuitable" } };
    const summary = summarizeSamplePreparation(samples, groups);

    expect(summary.status).toBe("blocked");
    expect(summary.blockers.join(" ")).toContain("W-T0-01");
  });

  it("blocks an unknown persisted condition instead of treating it as normal", () => {
    const samples = readySamples();
    samples[0] = { ...samples[0], baseline: { ...samples[0].baseline, initialCondition: "unknown-condition" } };
    const summary = summarizeSamplePreparation(samples, groups);

    expect(summary.status).toBe("blocked");
    expect(summary.blockers.join(" ")).toContain("สภาพเริ่มต้นไม่ถูกต้อง W-T0-01");
  });

  it("counts an excluded sample and blocks the planned quantity", () => {
    const samples = readySamples();
    samples[0] = { ...samples[0], status: "excluded" };
    const summary = summarizeSamplePreparation(samples, groups);

    expect(summary).toMatchObject({ readyCount: 7, notReadyCount: 1, excludedCount: 1, status: "blocked" });
    expect(summary.blockers.join(" ")).toContain("จำนวนพร้อมใช้งานไม่ครบตามแผน");
  });

  it("blocks missing, duplicate, unknown, and incorrect group mappings", () => {
    const samples = readySamples();
    const malformed = [
      ...samples.slice(1).map((sample) => sample.id === "P-T1-02"
        ? { ...sample, groupId: "W-T0" }
        : sample),
      { ...samples[1] },
      { ...samples[2], id: "UNKNOWN-01" },
    ];
    const summary = summarizeSamplePreparation(malformed, groups);

    expect(summary.status).toBe("blocked");
    expect(summary.blockers.join(" ")).toContain("ไม่พบ Sample ID W-T0-01");
    expect(summary.blockers.join(" ")).toContain("Sample ID ซ้ำ W-T0-02");
    expect(summary.blockers.join(" ")).toContain("นอก canonical set UNKNOWN-01");
    expect(summary.blockers.join(" ")).toContain("group mapping ไม่ถูกต้อง");
  });

  it("feeds the real section result into overall preparation readiness", () => {
    const state = createDefaultRoseTrialState();
    expect(calculateReadiness(state).sections.samples).toBe("blocked");

    state.samples = readySamples();
    expect(calculateReadiness(state).sections.samples).toBe("ready");
  });

  it("keeps an observation warning non-blocking in overall readiness", () => {
    const state = createDefaultRoseTrialState();
    state.pilot = { ...state.pilot, trialName: "Rose Trial", goal: "Compare rooting" };
    state.batch = { ...state.batch, batchName: "Batch A", totalCuttings: 8 };
    state.checklistItems = state.checklistItems.map((item) => ({ ...item, status: "ready" }));
    state.treatments = state.treatments.map((treatment) => ({ ...treatment, cuttingCount: 4 }));
    state.inventory = state.inventory.map((item) => ({
      ...item,
      availableQuantity: item.requiredQuantity,
      usableQuantity: item.requiredQuantity,
      status: "ready",
    }));
    state.treatmentProduct = {
      ...state.treatmentProduct,
      status: "ready_to_use",
      packagingType: "original",
      seller: "ผู้ขาย",
      expiryNote: "ตรวจแล้ว",
      applicationMethod: "ใช้ตามฉลาก",
      storageNote: "เก็บตามฉลาก",
    };
    state.samples = readySamples();
    state.samples[0] = {
      ...state.samples[0],
      baseline: { ...state.samples[0].baseline, initialCondition: "observe" },
    };

    const readiness = calculateReadiness(state);
    expect(readiness.sections.samples).toBe("warning");
    expect(readiness.status).toBe("partially_ready");
    expect(readiness.canStart).toBe(true);
    expect(readiness.blockers).toEqual([]);
  });
});

describe("Rose Trial Sample Preparation persistence and rendering", () => {
  it("saves and reloads sample details with stable IDs and no load write", () => {
    const { setItem } = installStorage();
    const state = createDefaultRoseTrialState();
    state.samples = updateTrialSamples(state.samples, "P-T1-02", {
      status: "ready",
      sampleLabel: "ป้ายสีฟ้า",
      cuttingLength: "11.5",
      nodeCount: "4",
      initialCondition: "observe",
      notes: "ใบมีรอยเล็กน้อย",
    });

    expect(saveRoseTrialState(state)).toBe(true);
    const writesAfterSave = setItem.mock.calls.length;
    const loaded = loadRoseTrialState();

    expect(loaded.status).toBe("valid");
    expect(loaded.state.samples.map((sample) => sample.id)).toEqual(EXPECTED_IDS);
    expect(loaded.state.samples.at(-1)?.baseline).toMatchObject({
      sampleLabel: "ป้ายสีฟ้า",
      length: "11.5",
      nodeCount: "4",
      initialCondition: "observe",
      note: "ใบมีรอยเล็กน้อย",
    });
    expect(setItem).toHaveBeenCalledTimes(writesAfterSave);
  });

  it("loads an older valid v2 payload with missing UI fields using safe defaults", () => {
    const { store, setItem } = installStorage();
    const oldState = createDefaultRoseTrialState();
    for (const sample of oldState.samples) {
      delete sample.baseline.sampleLabel;
      sample.baseline.initialCondition = "";
    }
    store.set(ROSE_TRIAL_STORAGE_KEY, JSON.stringify(oldState));

    const loaded = loadRoseTrialState();

    expect(loaded.status).toBe("valid");
    expect(loaded.state.samples.every((sample) => sample.baseline.sampleLabel === "")).toBe(true);
    expect(loaded.state.samples.every((sample) => sample.baseline.initialCondition === "normal")).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("reset defaults restore all eight samples to pending normal state", () => {
    const reset = createDefaultRoseTrialState();
    expect(reset.samples.map((sample) => sample.id)).toEqual(EXPECTED_IDS);
    expect(reset.samples.every((sample) => sample.status === "pending")).toBe(true);
    expect(reset.samples.every((sample) => sample.baseline.initialCondition === "normal")).toBe(true);
  });

  it("renders all four groups, eight IDs, labels, and summary without local storage", () => {
    const state = createDefaultRoseTrialState();
    const html = renderToStaticMarkup(React.createElement(SamplePreparationSection, {
      groupConfig: state.groupConfig,
      samples: state.samples,
      sectionStatus: "blocked",
      onUpdateSample: vi.fn(),
    }));

    expect(html).toContain("Sample Preparation");
    expect(html).toContain("0 / 8 ตัวอย่างพร้อม");
    for (const id of EXPECTED_IDS) expect(html).toContain(id);
    expect(html).toContain("ระบบชำในน้ำ");
    expect(html).toContain("ระบบชำในพีทมอส");
    expect(html).toContain("Sample Label");
    expect(html).toContain("ความยาวกิ่ง");
    expect(html).toContain("จำนวนข้อ");
  });
});
