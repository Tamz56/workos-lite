// GF-APP-075 — Rose Trial Lab Types
// Stage 2B: Form State + localStorage types

export type ChecklistStatus =
  | "have"       // มีแล้ว
  | "to_buy"     // ต้องซื้อ
  | "ordered"    // สั่งซื้อแล้ว
  | "received"   // ได้รับแล้ว
  | "ready"      // พร้อมใช้
  | "not_needed"; // ไม่จำเป็น

export type ChecklistCategory =
  | "equipment"
  | "propagation_medium"
  | "container"
  | "humidity_system"
  | "treatment_input"
  | "sanitation"
  | "label_and_record"
  | "trial_area";

export type TrialStatus =
  | "planning"   // วางแผน
  | "ready"      // พร้อม
  | "active"     // กำลังดำเนินการ
  | "completed"  // เสร็จสิ้น
  | "archived";  // เก็บถาวร

export type ReadinessLevel =
  | "not_ready"        // ยังไม่พร้อม
  | "partially_ready"  // พร้อมบางส่วน
  | "ready_for_day0";  // พร้อมเริ่ม Day 0

export interface PilotOverview {
  trialName: string;
  cropName: string;
  goal: string;
  location: string;
  expectedStartDate: string; // YYYY-MM-DD หรือ ''
  notes: string;
}

export interface BatchSetup {
  batchName: string;
  totalCuttings: number;
  plannedStartDate: string; // YYYY-MM-DD หรือ ''
  notes: string;
}

export interface PreparationChecklistItem {
  id: string;
  name: string;
  category: ChecklistCategory;
  isCritical: boolean;
  requiredQuantity: number | null;
  unit: string;
  status: ChecklistStatus;
  notes: string;
  source: "default" | "user";
}

export interface Treatment {
  id: string;
  code: string;
  name: string;
  description: string;
  cuttingCount: number;
  inputName: string;
  notes: string;
  source: "default" | "user";
}

export interface RoseTrialState {
  version: number;
  pilot: PilotOverview;
  batch: BatchSetup;
  checklistItems: PreparationChecklistItem[];
  treatments: Treatment[];
  updatedAt: string | null;
}

export interface ReadinessResult {
  status: ReadinessLevel;
  totalItems: number;
  readyItems: number;
  criticalMissingItems: PreparationChecklistItem[];
  optionalPendingItems: PreparationChecklistItem[];
  totalCuttings: number;
  assignedCuttings: number;
  cuttingDifference: number;
  reasons: string[];
}
