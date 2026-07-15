import type { RoseTrialLoadResult, RoseTrialStateV2 } from "./types";
import {
  createDefaultRoseTrialState,
  createDefaultPilotStartRecord,
  createDefaultTreatmentProduct,
} from "./defaults";
import { normalizeDay0Workflow } from "./day0SetupWorkflow";
import { normalizeSamplePreparationFields } from "./samplePreparation";
import { mergeInventoryWithDefaults } from "./inventory";
import {
  isRoseTrialStateV1,
  isRoseTrialStateV2,
  migrateRoseTrialStateV1,
} from "./migration";

export const ROSE_TRIAL_STORAGE_KEY = "gf:rose-trial:v1";

function defaultResult(status: RoseTrialLoadResult["status"], issue?: string): RoseTrialLoadResult {
  return {
    state: createDefaultRoseTrialState(),
    status,
    ...(issue ? { issue } : {}),
  };
}

/**
 * Reads Preparation state without writing or repairing localStorage. A valid v1
 * payload is migrated in memory and is persisted as v2 only after explicit Save.
 */
export function loadRoseTrialState(): RoseTrialLoadResult {
  if (typeof window === "undefined") {
    return defaultResult("empty");
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(ROSE_TRIAL_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to read rose trial state from localStorage:", error);
    return defaultResult("corrupt", "ไม่สามารถอ่านข้อมูลการเตรียมจากเครื่องได้");
  }

  if (!raw) {
    return defaultResult("empty");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    console.error("Failed to parse rose trial state from localStorage:", error);
    return defaultResult("corrupt", "ข้อมูลการเตรียมในเครื่องไม่ใช่ JSON ที่อ่านได้");
  }

  if (isRoseTrialStateV2(parsed)) {
    const day0Workflow = normalizeDay0Workflow(parsed.day0Workflow);
    const pilotStart = {
      ...createDefaultPilotStartRecord(),
      ...parsed.pilotStart,
    };
    const treatmentProduct = {
      ...createDefaultTreatmentProduct(),
      ...parsed.treatmentProduct,
    };
    return {
      state: {
        ...parsed,
        day0Workflow,
        pilotStart,
        treatmentProduct,
        inventory: mergeInventoryWithDefaults(parsed.inventory),
        samples: normalizeSamplePreparationFields(parsed.samples),
      },
      status: "valid",
    };
  }

  if (isRoseTrialStateV1(parsed)) {
    const migration = migrateRoseTrialStateV1(parsed);
    return {
      state: migration.state,
      status: "migrated",
      ...(migration.issues.length > 0 ? { issue: migration.issues.join(" • ") } : {}),
    };
  }

  if (typeof parsed === "object" && parsed !== null && "version" in parsed) {
    const version = (parsed as { version?: unknown }).version;
    if (version !== 1 && version !== 2) {
      return defaultResult("unsupported", `ไม่รองรับข้อมูล Preparation version ${String(version)}`);
    }
  }

  console.warn("localStorage data schema is invalid; using a fresh v2 state without overwriting storage.");
  return defaultResult("corrupt", "โครงสร้างข้อมูลการเตรียมในเครื่องไม่ถูกต้อง");
}

export function saveRoseTrialState(state: RoseTrialStateV2): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stateToSave: RoseTrialStateV2 = {
      ...state,
      version: 2,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(ROSE_TRIAL_STORAGE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    console.error("Failed to save rose trial state to localStorage:", error);
    return false;
  }
}

export function clearRoseTrialState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    window.localStorage.removeItem(ROSE_TRIAL_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
    return false;
  }
}
