// GF-APP-075 — Rose Trial Lab localStorage Adapter
// Stage 2B: Local storage helper utility functions

import type {
  RoseTrialState,
  ChecklistCategory,
  ChecklistStatus,
} from "./types";
import { createDefaultRoseTrialState } from "./defaults";

const STORAGE_KEY = "gf:rose-trial:v1";

const VALID_CHECKLIST_CATEGORIES: readonly ChecklistCategory[] = [
  "equipment",
  "propagation_medium",
  "container",
  "humidity_system",
  "treatment_input",
  "sanitation",
  "label_and_record",
  "trial_area",
];

const VALID_CHECKLIST_STATUSES: readonly ChecklistStatus[] = [
  "have",
  "to_buy",
  "ordered",
  "received",
  "ready",
  "not_needed",
];

const VALID_SOURCES = ["default", "user"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isSource(value: unknown): value is "default" | "user" {
  return VALID_SOURCES.includes(value as "default" | "user");
}

function isChecklistCategory(value: unknown): value is ChecklistCategory {
  return VALID_CHECKLIST_CATEGORIES.includes(value as ChecklistCategory);
}

function isChecklistStatus(value: unknown): value is ChecklistStatus {
  return VALID_CHECKLIST_STATUSES.includes(value as ChecklistStatus);
}

function isValidPilot(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.trialName) &&
    isString(value.cropName) &&
    isString(value.goal) &&
    isString(value.location) &&
    isString(value.expectedStartDate) &&
    isString(value.notes)
  );
}

function isValidBatch(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.batchName) &&
    isFiniteInteger(value.totalCuttings) &&
    value.totalCuttings >= 0 &&
    isString(value.plannedStartDate) &&
    isString(value.notes)
  );
}

function isValidChecklistItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isString(value.name) &&
    isChecklistCategory(value.category) &&
    typeof value.isCritical === "boolean" &&
    (value.requiredQuantity === null || isFiniteNonNegativeNumber(value.requiredQuantity)) &&
    isString(value.unit) &&
    isChecklistStatus(value.status) &&
    isString(value.notes) &&
    isSource(value.source)
  );
}

function isValidTreatment(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isString(value.code) &&
    isString(value.name) &&
    isString(value.description) &&
    isFiniteInteger(value.cuttingCount) &&
    value.cuttingCount >= 0 &&
    isString(value.inputName) &&
    isString(value.notes) &&
    isSource(value.source)
  );
}

function isValidRoseTrialState(value: unknown): value is RoseTrialState {
  return (
    isRecord(value) &&
    value.version === 1 &&
    isValidPilot(value.pilot) &&
    isValidBatch(value.batch) &&
    Array.isArray(value.checklistItems) &&
    value.checklistItems.every(isValidChecklistItem) &&
    Array.isArray(value.treatments) &&
    value.treatments.every(isValidTreatment) &&
    (value.updatedAt === null || isString(value.updatedAt))
  );
}

/**
 * โหลดข้อมูล state ล่าสุดจาก localStorage
 * ปลอดภัยสำหรับ SSR และจัดการกรณีข้อมูลเสียหรือเวอร์ชันไม่ตรงได้อย่างถูกต้อง
 */
export function loadRoseTrialState(): RoseTrialState {
  if (typeof window === "undefined") {
    return createDefaultRoseTrialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultRoseTrialState();
    }

    const parsed = JSON.parse(raw);

    if (isValidRoseTrialState(parsed)) {
      return parsed;
    }

    console.warn("localStorage data schema is mismatch, fallback to default state.");
    return createDefaultRoseTrialState();
  } catch (error) {
    console.error("Failed to parse rose trial state from localStorage:", error);
    return createDefaultRoseTrialState();
  }
}

/**
 * บันทึกข้อมูล state ลงใน localStorage
 */
export function saveRoseTrialState(state: RoseTrialState): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stateToSave: RoseTrialState = {
      ...state,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    console.error("Failed to save rose trial state to localStorage:", error);
    return false;
  }
}

/**
 * ล้างข้อมูลใน localStorage เพื่อเริ่มใหม่
 */
export function clearRoseTrialState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
    return false;
  }
}
