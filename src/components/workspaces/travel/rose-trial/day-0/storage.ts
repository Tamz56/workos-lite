// GF-APP-075 — Rose Trial Day 0 localStorage Adapter
// Stage 2D — Day 0 Setup MVP

import type { RoseDay0State } from "./types";

const DAY0_STORAGE_KEY = "gf:rose-trial:day0:v1";

export interface LoadResult {
  state: RoseDay0State | null;
  isCorrupt: boolean;
  rawJson: string | null;
}

/**
 * โหลดข้อมูล Day 0 state จาก localStorage พร้อมแจ้งเตือนหากข้อมูลเสียหาย
 */
export function loadRoseDay0State(): LoadResult {
  if (typeof window === "undefined") {
    return { state: null, isCorrupt: false, rawJson: null };
  }

  const raw = window.localStorage.getItem(DAY0_STORAGE_KEY);
  if (!raw) {
    return { state: null, isCorrupt: false, rawJson: null };
  }

  try {
    const parsed = JSON.parse(raw);

    // ตรวจสอบความถูกต้องของ schema ขั้นต่ำ (version 1)
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      parsed.trialSnapshot &&
      parsed.startInfo &&
      parsed.sourcePlant &&
      parsed.cuttingSetup &&
      parsed.propagationSetup &&
      parsed.environment &&
      Array.isArray(parsed.trialUnits) &&
      Array.isArray(parsed.deviations)
    ) {
      return { state: parsed as RoseDay0State, isCorrupt: false, rawJson: raw };
    }

    // ถ้าโครงสร้างพัง (แต่ JSON แปลงได้)
    return { state: null, isCorrupt: true, rawJson: raw };
  } catch (e) {
    // ถ้า JSON พัง
    console.error("Failed to parse Rose Day 0 state from localStorage:", e);
    return { state: null, isCorrupt: true, rawJson: raw };
  }
}

/**
 * บันทึก Day 0 state
 */
export function saveRoseDay0State(state: RoseDay0State): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stateToSave: RoseDay0State = {
      ...state,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DAY0_STORAGE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    console.error("Failed to save Rose Day 0 state to localStorage:", error);
    return false;
  }
}

/**
 * ล้างข้อมูล Day 0 จาก localStorage
 */
export function clearRoseDay0State(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(DAY0_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear Rose Day 0 state:", error);
  }
}
