import { createDefaultDay0Workflow } from "./defaults";
import { checkDay0EntryConditions } from "./readiness";
import type { Day0WorkflowState, RoseTrialStateV2 } from "./types";

export const DAY0_SAMPLE_IDS = [
  "W-T0-01",
  "W-T0-02",
  "W-T1-01",
  "W-T1-02",
  "P-T0-01",
  "P-T0-02",
  "P-T1-01",
  "P-T1-02",
] as const;

export const DAY0_GROUP_IDS = ["W-T0", "W-T1", "P-T0", "P-T1"] as const;

export const DAY0_CHECKLIST_IDS = [
  "readiness_reviewed",
  "sample_ids_verified",
  "workspace_ready",
  "workspace_clean",
  "containers_labeled",
  "sample_labels_ready",
  "tools_cleaned",
  "medium_prepared",
  "treatment_product_ready",
] as const;

const STEP_ONE_CHECKLIST_IDS = DAY0_CHECKLIST_IDS.slice(0, 3);
const STEP_TWO_CHECKLIST_IDS = DAY0_CHECKLIST_IDS.slice(3);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStringSet(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const allowedSet = new Set(allowed);
  return [...new Set(value.filter((item): item is string =>
    typeof item === "string" && allowedSet.has(item)
  ))];
}

export function isExactUniqueSet(
  value: readonly string[],
  expected: readonly string[]
): boolean {
  if (value.length !== expected.length || new Set(value).size !== value.length) return false;
  const actual = new Set(value);
  return expected.every((item) => actual.has(item));
}

export function normalizeDay0Workflow(value: unknown): Day0WorkflowState {
  const defaults = createDefaultDay0Workflow();
  if (!isRecord(value)) return defaults;

  const rawSteps = Array.isArray(value.steps) ? value.steps : [];
  const steps = defaults.steps.map((defaultStep) => {
    const candidate = rawSteps.find((step) =>
      isRecord(step) && step.id === defaultStep.id
    );
    if (!isRecord(candidate)) return defaultStep;
    return {
      id: defaultStep.id,
      completed: typeof candidate.completed === "boolean" ? candidate.completed : false,
      completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : null,
    };
  });

  return {
    steps,
    currentStep: Number.isInteger(value.currentStep) &&
      Number(value.currentStep) >= 1 && Number(value.currentStep) <= 6
      ? Number(value.currentStep)
      : defaults.currentStep,
    completedChecklist: normalizeStringSet(value.completedChecklist, DAY0_CHECKLIST_IDS),
    sampleConfirmations: normalizeStringSet(value.sampleConfirmations, DAY0_SAMPLE_IDS),
    groupConfirmations: normalizeStringSet(value.groupConfirmations, DAY0_GROUP_IDS),
    placementConfirmations: normalizeStringSet(value.placementConfirmations, DAY0_SAMPLE_IDS),
    finalConfirm: typeof value.finalConfirm === "boolean" ? value.finalConfirm : false,
    notes: typeof value.notes === "string" ? value.notes : "",
  };
}

export function isDay0SetupStepComplete(
  workflow: Day0WorkflowState,
  step: number
): boolean {
  if (step === 1) return STEP_ONE_CHECKLIST_IDS.every((id) => workflow.completedChecklist.includes(id));
  if (step === 2) return STEP_TWO_CHECKLIST_IDS.every((id) => workflow.completedChecklist.includes(id));
  if (step === 3) return isExactUniqueSet(workflow.sampleConfirmations, DAY0_SAMPLE_IDS);
  if (step === 4) return isExactUniqueSet(workflow.groupConfirmations, DAY0_GROUP_IDS);
  if (step === 5) return isExactUniqueSet(workflow.placementConfirmations, DAY0_SAMPLE_IDS);
  if (step === 6) return workflow.finalConfirm;
  return false;
}

export function isDay0SetupComplete(workflow: Day0WorkflowState): boolean {
  return [1, 2, 3, 4, 5, 6].every((step) => isDay0SetupStepComplete(workflow, step));
}

export type PilotStartTransitionStatus =
  | "started"
  | "already_started"
  | "entry_blocked"
  | "workflow_incomplete"
  | "save_failed";

export interface PilotStartTransitionResult {
  state: RoseTrialStateV2;
  status: PilotStartTransitionStatus;
  blockers: string[];
}

export function hasPilotStarted(pilotStart: RoseTrialStateV2["pilotStart"]): boolean {
  if (!pilotStart) return false;
  return pilotStart.started === true || Boolean(pilotStart.startedAt);
}

export function createPilotStartTransition(
  state: RoseTrialStateV2,
  startedAt: string
): PilotStartTransitionResult {
  if (hasPilotStarted(state.pilotStart)) {
    return { state, status: "already_started", blockers: [] };
  }

  const entry = checkDay0EntryConditions(state);
  if (!entry.canStart) {
    return { state, status: "entry_blocked", blockers: entry.blockers };
  }

  if (!isDay0SetupComplete(state.day0Workflow)) {
    return {
      state,
      status: "workflow_incomplete",
      blockers: ["กรุณาทำขั้นตอน Day 0 Setup และยืนยันรายการทั้งหมดให้ครบ"],
    };
  }

  return {
    state: {
      ...state,
      pilotStart: {
        started: true,
        startedAt,
        startConfirmation: true,
        lockedGroupSnapshot: state.groupConfig.map((group) => ({ ...group })),
        lockedSampleIds: state.samples.map((sample) => sample.id),
      },
    },
    status: "started",
    blockers: [],
  };
}

export function persistPilotStart(
  state: RoseTrialStateV2,
  startedAt: string,
  save: (nextState: RoseTrialStateV2) => boolean
): PilotStartTransitionResult {
  const transition = createPilotStartTransition(state, startedAt);
  if (transition.status !== "started") return transition;
  if (!save(transition.state)) {
    return { state, status: "save_failed", blockers: ["ไม่สามารถบันทึกการเริ่ม Pilot ได้"] };
  }
  return transition;
}

export function determineDay0Mode(
  pilotStart: RoseTrialStateV2["pilotStart"],
  canStart: boolean
): "blocker" | "setup" | "legacy" {
  if (hasPilotStarted(pilotStart)) {
    return "legacy";
  }
  return canStart ? "setup" : "blocker";
}

export function shouldAccessLegacyDay0Storage(mode: "blocker" | "setup" | "legacy"): boolean {
  return mode === "legacy";
}
