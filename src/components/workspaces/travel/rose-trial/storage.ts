// GF-APP-075 — Rose Trial Lab localStorage Adapter
// Stage 2B: Local storage helper utility functions

import type { RoseTrialState } from "./types";
import { DEFAULT_ROSE_TRIAL_STATE } from "./defaults";

const STORAGE_KEY = "gf:rose-trial:v1";

/**
 * โหลดข้อมูล state ล่าสุดจาก localStorage
 * ปลอดภัยสำหรับ SSR และจัดการกรณีข้อมูลเสียหรือเวอร์ชันไม่ตรงได้อย่างถูกต้อง
 */
export function loadRoseTrialState(): RoseTrialState {
  if (typeof window === "undefined") {
    return DEFAULT_ROSE_TRIAL_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ROSE_TRIAL_STATE;
    }

    const parsed = JSON.parse(raw);

    // ตรวจสอบโครงสร้างพื้นฐานและเวอร์ชัน
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      parsed.pilot &&
      parsed.batch &&
      Array.isArray(parsed.checklistItems) &&
      Array.isArray(parsed.treatments)
    ) {
      return parsed as RoseTrialState;
    }

    console.warn("localStorage data schema is mismatch, fallback to default state.");
    return DEFAULT_ROSE_TRIAL_STATE;
  } catch (error) {
    console.error("Failed to parse rose trial state from localStorage:", error);
    return DEFAULT_ROSE_TRIAL_STATE;
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
export function clearRoseTrialState(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}
