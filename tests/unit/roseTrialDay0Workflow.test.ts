import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultDay0Workflow,
  createDefaultRoseTrialState,
} from "@/components/workspaces/travel/rose-trial/defaults";
import {
  DAY0_CHECKLIST_IDS,
  DAY0_GROUP_IDS,
  DAY0_SAMPLE_IDS,
  createPilotStartTransition,
  isDay0SetupStepComplete,
  isExactUniqueSet,
  normalizeDay0Workflow,
  persistPilotStart,
  hasPilotStarted,
  determineDay0Mode,
  shouldAccessLegacyDay0Storage,
} from "@/components/workspaces/travel/rose-trial/day0SetupWorkflow";
import { checkDay0EntryConditions } from "@/components/workspaces/travel/rose-trial/readiness";
import { generateTrialSamples } from "@/components/workspaces/travel/rose-trial/sampleGeneration";
import {
  loadRoseTrialState,
  ROSE_TRIAL_STORAGE_KEY,
  saveRoseTrialState,
} from "@/components/workspaces/travel/rose-trial/storage";
import type {
  RoseTrialStateV2,
  SampleInitialCondition,
  TrialSampleStatus,
} from "@/components/workspaces/travel/rose-trial/types";

function createReadyState(): RoseTrialStateV2 {
  const state = createDefaultRoseTrialState();
  state.pilot.trialName = "Rose Trial #1";
  state.pilot.goal = "Rooting rate";
  state.batch.batchName = "B1";
  state.batch.totalCuttings = 8;
  state.checklistItems = state.checklistItems.map((item) => ({
    ...item,
    status: "ready",
  }));
  state.treatments = [
    { id: "treatment-t0", code: "T0", name: "Control", description: "Water control", cuttingCount: 4, inputName: "Water", notes: "", source: "default" },
    { id: "treatment-t1", code: "T1", name: "Clonex", description: "Clonex treatment", cuttingCount: 4, inputName: "Clonex Gel", notes: "", source: "default" },
  ];
  state.inventory = state.inventory.map((item) => ({
    ...item,
    status: "ready",
    usableQuantity: item.requiredQuantity,
    availableQuantity: item.requiredQuantity,
  }));
  state.treatmentProduct = {
    ...state.treatmentProduct,
    brand: "Growth Technology",
    seller: "Hydro Store",
    packagingType: "original",
    status: "ready_to_use",
    expiryNote: "2028",
    storageNote: "Cool place",
    applicationMethod: "Follow label",
  };
  state.samples = generateTrialSamples(state.groupConfig).map((sample) => ({
    ...sample,
    status: "ready" as TrialSampleStatus,
    baseline: {
      ...sample.baseline,
      sampleLabel: `Tag ${sample.id}`,
      length: "10",
      nodeCount: "3",
      note: "Ready sample",
      initialCondition: "normal" as SampleInitialCondition,
    },
  }));
  return state;
}

function completeWorkflow(state: RoseTrialStateV2): RoseTrialStateV2 {
  return {
    ...state,
    day0Workflow: {
      ...state.day0Workflow,
      currentStep: 6,
      completedChecklist: [...DAY0_CHECKLIST_IDS],
      sampleConfirmations: [...DAY0_SAMPLE_IDS],
      groupConfirmations: [...DAY0_GROUP_IDS],
      placementConfirmations: [...DAY0_SAMPLE_IDS],
      finalConfirm: true,
    },
  };
}

describe("Rose Trial Day 0 Workflow — Entry Gate", () => {
  it("allows warning-only preparation and keeps warning evidence", () => {
    const state = createReadyState();
    state.checklistItems[0].isCritical = false;
    state.checklistItems[0].status = "to_buy";

    const result = checkDay0EntryConditions(state);

    expect(result.canStart).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("blocks duplicate and unknown canonical samples without duplicate messages", () => {
    const state = createReadyState();
    state.samples[7] = { ...state.samples[0], baseline: { ...state.samples[0].baseline } };
    state.samples[6] = { ...state.samples[6], id: "UNKNOWN-01" };

    const result = checkDay0EntryConditions(state);

    expect(result.canStart).toBe(false);
    expect(result.blockers.some((item) => item.includes("Sample ID ซ้ำ"))).toBe(true);
    expect(result.blockers.some((item) => item.includes("นอก canonical set"))).toBe(true);
    expect(new Set(result.blockers).size).toBe(result.blockers.length);
  });

  it("blocks a wrong canonical group mapping", () => {
    const state = createReadyState();
    state.samples[0] = { ...state.samples[0], groupId: "W-T1" };

    const result = checkDay0EntryConditions(state);

    expect(result.canStart).toBe(false);
    expect(result.blockers.some((item) => item.includes("group mapping"))).toBe(true);
  });

  it("blocks excluded and unsuitable samples through the shared readiness source", () => {
    const state = createReadyState();
    state.samples[0].status = "excluded";
    state.samples[1].baseline.initialCondition = "unsuitable";

    const result = checkDay0EntryConditions(state);

    expect(result.canStart).toBe(false);
    expect(result.blockers.some((item) => item.includes("ถูกตัดออก"))).toBe(true);
    expect(result.blockers.some((item) => item.includes("ไม่เหมาะใช้"))).toBe(true);
  });
});

describe("Rose Trial Day 0 Workflow — Normalization", () => {
  it("normalizes null, non-array, unknown, duplicate, and invalid fields", () => {
    const normalized = normalizeDay0Workflow({
      steps: createDefaultDay0Workflow().steps,
      currentStep: 99,
      completedChecklist: ["readiness_reviewed", "readiness_reviewed", "unknown"],
      sampleConfirmations: ["W-T0-01", "W-T0-01", "UNKNOWN"],
      groupConfirmations: null,
      placementConfirmations: "not-an-array",
      finalConfirm: "yes",
      notes: 123,
    });

    expect(normalized.currentStep).toBe(1);
    expect(normalized.completedChecklist).toEqual(["readiness_reviewed"]);
    expect(normalized.sampleConfirmations).toEqual(["W-T0-01"]);
    expect(normalized.groupConfirmations).toEqual([]);
    expect(normalized.placementConfirmations).toEqual([]);
    expect(normalized.finalConfirm).toBe(false);
    expect(normalized.notes).toBe("");
  });

  it("supplies defaults for an old workflow while preserving its legacy steps", () => {
    const defaults = createDefaultDay0Workflow();
    const legacy = {
      steps: defaults.steps.map((step, index) => ({
        ...step,
        completed: index === 0,
        completedAt: index === 0 ? "2026-07-14T08:00:00.000Z" : null,
      })),
    };

    const normalized = normalizeDay0Workflow(legacy);

    expect(normalized.steps[0].completed).toBe(true);
    expect(normalized.currentStep).toBe(1);
    expect(normalized.sampleConfirmations).toEqual([]);
    expect(normalized.finalConfirm).toBe(false);
  });
});

describe("Rose Trial Day 0 Workflow — Exact Sets", () => {
  it("accepts exact sample and group sets regardless of order", () => {
    expect(isExactUniqueSet([...DAY0_SAMPLE_IDS].reverse(), DAY0_SAMPLE_IDS)).toBe(true);
    expect(isExactUniqueSet([...DAY0_GROUP_IDS].reverse(), DAY0_GROUP_IDS)).toBe(true);
  });

  it("rejects duplicate, unknown, and missing values even at the expected length", () => {
    const duplicateSamples = [...DAY0_SAMPLE_IDS];
    duplicateSamples[7] = duplicateSamples[0];
    const unknownSamples: string[] = [...DAY0_SAMPLE_IDS];
    unknownSamples[7] = "UNKNOWN";
    const duplicateGroups = [...DAY0_GROUP_IDS];
    duplicateGroups[3] = duplicateGroups[0];

    expect(isExactUniqueSet(duplicateSamples, DAY0_SAMPLE_IDS)).toBe(false);
    expect(isExactUniqueSet(unknownSamples, DAY0_SAMPLE_IDS)).toBe(false);
    expect(isExactUniqueSet(DAY0_SAMPLE_IDS.slice(0, 7), DAY0_SAMPLE_IDS)).toBe(false);
    expect(isExactUniqueSet(duplicateGroups, DAY0_GROUP_IDS)).toBe(false);
  });

  it("uses exact canonical confirmations for steps three through five", () => {
    const state = completeWorkflow(createReadyState());
    expect(isDay0SetupStepComplete(state.day0Workflow, 3)).toBe(true);
    expect(isDay0SetupStepComplete(state.day0Workflow, 4)).toBe(true);
    expect(isDay0SetupStepComplete(state.day0Workflow, 5)).toBe(true);

    state.day0Workflow.sampleConfirmations[7] = state.day0Workflow.sampleConfirmations[0];
    expect(isDay0SetupStepComplete(state.day0Workflow, 3)).toBe(false);
  });
});

describe("Rose Trial Day 0 Workflow — Start Lifecycle", () => {
  const startedAt = "2026-07-14T09:30:00.000Z";

  it("blocks an incomplete workflow", () => {
    const result = createPilotStartTransition(createReadyState(), startedAt);
    expect(result.status).toBe("workflow_incomplete");
    expect(result.state.pilotStart.startedAt).toBeNull();
  });

  it("revalidates the final Entry Gate before starting", () => {
    const state = completeWorkflow(createReadyState());
    state.samples[0].status = "excluded";

    const result = createPilotStartTransition(state, startedAt);

    expect(result.status).toBe("entry_blocked");
    expect(result.state.pilotStart.started).toBe(false);
  });

  it("starts warning-only preparation with an ISO timestamp", () => {
    const state = completeWorkflow(createReadyState());
    state.checklistItems[0].isCritical = false;
    state.checklistItems[0].status = "to_buy";

    const result = createPilotStartTransition(state, startedAt);

    expect(result.status).toBe("started");
    expect(result.state.pilotStart.startedAt).toBe(startedAt);
    expect(new Date(result.state.pilotStart.startedAt ?? "").toISOString()).toBe(startedAt);
  });

  it("is idempotent and never replaces an existing timestamp", () => {
    const first = createPilotStartTransition(completeWorkflow(createReadyState()), startedAt);
    const second = createPilotStartTransition(first.state, "2026-07-14T10:00:00.000Z");

    expect(first.status).toBe("started");
    expect(second.status).toBe("already_started");
    expect(second.state).toBe(first.state);
    expect(second.state.pilotStart.startedAt).toBe(startedAt);
  });

  it("keeps the original unstarted state when persistence fails", () => {
    const state = completeWorkflow(createReadyState());
    let calls = 0;

    const result = persistPilotStart(state, startedAt, () => {
      calls += 1;
      return false;
    });

    expect(calls).toBe(1);
    expect(result.status).toBe("save_failed");
    expect(result.state).toBe(state);
    expect(result.state.pilotStart.started).toBe(false);
  });
});

describe("Rose Trial Day 0 Workflow — Storage", () => {
  const store = new Map<string, string>();
  let writeCount = 0;

  beforeEach(() => {
    store.clear();
    writeCount = 0;
    const localStorage: Storage = {
      get length() { return store.size; },
      clear: () => store.clear(),
      getItem: (key) => store.get(key) ?? null,
      key: (index) => [...store.keys()][index] ?? null,
      removeItem: (key) => { store.delete(key); },
      setItem: (key, value) => {
        writeCount += 1;
        store.set(key, value);
      },
    };
    Object.defineProperty(globalThis, "window", {
      value: { localStorage },
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("normalizes malformed persisted workflow without writing on load", () => {
    const state = createReadyState();
    const malformed = {
      ...state,
      day0Workflow: {
        steps: state.day0Workflow.steps,
        currentStep: -4,
        completedChecklist: null,
        sampleConfirmations: ["W-T0-01", "W-T0-01", "UNKNOWN"],
        groupConfirmations: "bad",
        placementConfirmations: null,
        finalConfirm: "yes",
        notes: 42,
      },
    };
    store.set(ROSE_TRIAL_STORAGE_KEY, JSON.stringify(malformed));

    const result = loadRoseTrialState();

    expect(result.status).toBe("valid");
    expect(result.state.day0Workflow.currentStep).toBe(1);
    expect(result.state.day0Workflow.sampleConfirmations).toEqual(["W-T0-01"]);
    expect(result.state.day0Workflow.groupConfirmations).toEqual([]);
    expect(result.state.pilotStart.startedAt).toBeNull();
    expect(writeCount).toBe(0);
  });

  it("preserves the first startedAt value across save and refresh", () => {
    const startedAt = "2026-07-14T09:30:00.000Z";
    const transition = createPilotStartTransition(completeWorkflow(createReadyState()), startedAt);
    expect(saveRoseTrialState(transition.state)).toBe(true);

    const reloaded = loadRoseTrialState();

    expect(reloaded.state.pilotStart.started).toBe(true);
    expect(reloaded.state.pilotStart.startedAt).toBe(startedAt);
  });
});

describe("Rose Trial Day 0 Workflow — Mode Selection & Boundary Predicates", () => {
  it("evaluates lifecycle predicate correctly", () => {
    expect(hasPilotStarted({ started: true, startedAt: null, startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] })).toBe(true);
    expect(hasPilotStarted({ started: false, startedAt: "2026-07-14T08:00:00Z", startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] })).toBe(true);
    expect(hasPilotStarted({ started: false, startedAt: null, startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] })).toBe(false);
    expect(hasPilotStarted(undefined as unknown as RoseTrialStateV2["pilotStart"])).toBe(false);
  });

  it("determines day 0 mode correctly based on lifecycle and preparation readiness", () => {
    // 1. not started + Preparation blocked -> blocker mode
    expect(determineDay0Mode(
      { started: false, startedAt: null, startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] },
      false
    )).toBe("blocker");

    // 2. not started + Preparation ready -> setup workflow mode
    expect(determineDay0Mode(
      { started: false, startedAt: null, startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] },
      true
    )).toBe("setup");

    // 3. started + Preparation ready -> legacy Day 0 mode
    expect(determineDay0Mode(
      { started: true, startedAt: "2026-07-14T08:00:00Z", startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] },
      true
    )).toBe("legacy");

    // 4. started + Preparation blocked -> legacy Day 0 mode (bypasses readiness blocker)
    expect(determineDay0Mode(
      { started: true, startedAt: "2026-07-14T08:00:00Z", startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] },
      false
    )).toBe("legacy");

    // 5. started=false + valid startedAt -> legacy Day 0 mode (compatibility / recovery path)
    expect(determineDay0Mode(
      { started: false, startedAt: "2026-07-14T08:00:00Z", startConfirmation: false, lockedGroupSnapshot: [], lockedSampleIds: [] },
      false
    )).toBe("legacy");
  });

  it("enforces blocker storage guard contract correctly", () => {
    expect(shouldAccessLegacyDay0Storage("blocker")).toBe(false);
    expect(shouldAccessLegacyDay0Storage("setup")).toBe(false);
    expect(shouldAccessLegacyDay0Storage("legacy")).toBe(true);
  });
});
