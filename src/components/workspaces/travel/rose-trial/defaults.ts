// GF-APP-075 — Rose Trial Lab Default State
// Stage 2B: ข้อมูลเริ่มต้นสำหรับ Rose Trial Lab

import type {
  RoseTrialStateV2,
  ChecklistStatus,
  ChecklistCategory,
  PilotGroupConfig,
  InventoryItem,
  TreatmentProductRecord,
  Day0WorkflowState,
  Day0WorkflowStepId,
  PilotStartRecord,
} from "./types";
import { generateTrialSamples } from "./sampleGeneration";

const DEFAULT_GROUP_CONFIG: readonly PilotGroupConfig[] = [
  { id: "W-T0", medium: "water", treatmentRole: "control", treatmentCode: "T0", replicateCount: 2, locked: true },
  { id: "W-T1", medium: "water", treatmentRole: "treatment", treatmentCode: "T1", replicateCount: 2, locked: true },
  { id: "P-T0", medium: "peat_moss", treatmentRole: "control", treatmentCode: "T0", replicateCount: 2, locked: true },
  { id: "P-T1", medium: "peat_moss", treatmentRole: "treatment", treatmentCode: "T1", replicateCount: 2, locked: true },
];

export function createDefaultPilotGroupConfig(): PilotGroupConfig[] {
  return DEFAULT_GROUP_CONFIG.map((group) => ({ ...group }));
}

const DEFAULT_INVENTORY_DEFINITIONS: ReadonlyArray<
  Pick<InventoryItem, "id" | "category" | "name" | "requiredQuantity" | "unit" | "priority">
> = [
  { id: "inventory-trial-cuttings", category: "plant_material", name: "กิ่งพันธุ์สำหรับการทดลอง", requiredQuantity: 8, unit: "กิ่ง", priority: "A" },
  { id: "inventory-water-containers", category: "container", name: "ภาชนะสำหรับกลุ่ม Water", requiredQuantity: 4, unit: "ใบ", priority: "A" },
  { id: "inventory-peat-containers", category: "container", name: "ภาชนะสำหรับกลุ่ม Peat Moss", requiredQuantity: 4, unit: "ใบ", priority: "A" },
  { id: "inventory-peat-moss", category: "growing_medium", name: "พีทมอส", requiredQuantity: 1, unit: "ชุด", priority: "A" },
  { id: "inventory-clonex", category: "treatment_product", name: "Clonex Rooting Gel", requiredQuantity: 1, unit: "ชุด", priority: "A" },
  { id: "inventory-scissors", category: "equipment", name: "กรรไกรตัดกิ่ง", requiredQuantity: 1, unit: "อัน", priority: "A" },
  { id: "inventory-labels", category: "labeling", name: "ป้ายระบุ Sample", requiredQuantity: 8, unit: "ชิ้น", priority: "A" },
  { id: "inventory-cleaning-materials", category: "sanitation", name: "วัสดุทำความสะอาดอุปกรณ์", requiredQuantity: 1, unit: "ชุด", priority: "A" },
  { id: "inventory-trial-location", category: "trial_area", name: "พื้นที่วางการทดลอง", requiredQuantity: 1, unit: "พื้นที่", priority: "A" },
];

export function createDefaultInventory(): InventoryItem[] {
  return DEFAULT_INVENTORY_DEFINITIONS.map((item) => ({
    ...item,
    availableQuantity: 0,
    usableQuantity: 0,
    status: "procure",
    note: "",
    lastCheckedAt: null,
  }));
}

export function createDefaultTreatmentProduct(): TreatmentProductRecord {
  return {
    productName: "Clonex Rooting Gel",
    brand: "Clonex",
    productType: "Commercial Rooting Treatment",
    form: "Gel",
    activeIngredient: "IBA",
    seller: "",
    productUrl: "",
    packagingType: "repacked_unknown",
    status: "selected",
    purchasedSize: "",
    purchasePrice: null,
    purchaseDate: "",
    receivedDate: "",
    openedDate: "",
    expiryNote: "",
    storageNote: "",
    appearanceNote: "",
    applicationMethod: "",
    limitationNote: "",
  };
}

const WORKFLOW_STEP_IDS: readonly Day0WorkflowStepId[] = [
  "workspace_preparation",
  "container_labeling",
  "water_preparation",
  "peat_preparation",
  "tool_cleaning",
  "sample_recording",
  "allocation_confirmation",
  "control_preparation",
  "clonex_preparation",
  "clonex_application",
  "sample_placement",
  "day0_evidence",
  "trial_placement",
  "final_confirmation",
];

export function createDefaultDay0Workflow(): Day0WorkflowState {
  return {
    steps: WORKFLOW_STEP_IDS.map((id) => ({ id, completed: false, completedAt: null })),
  };
}

export function createDefaultPilotStartRecord(): PilotStartRecord {
  return {
    started: false,
    startedAt: null,
    startConfirmation: false,
    lockedGroupSnapshot: [],
    lockedSampleIds: [],
  };
}

export const DEFAULT_ROSE_TRIAL_STATE: RoseTrialStateV2 = {
  version: 2,
  pilot: {
    trialName: "Rose Rooting Trial #1 — ทดลองปักชำกุหลาบ",
    cropName: "กุหลาบ",
    goal: "ทดสอบอัตราการออกรากของกิ่งปักชำกุหลาบ เปรียบเทียบระหว่างชุดควบคุม (T0) และชุดใช้สารเร่งราก (T1) โดยบันทึกอัตราการรอดและจำนวนรากต่อกิ่ง",
    location: "",
    expectedStartDate: "",
    notes: "",
  },
  batch: {
    batchName: "",
    totalCuttings: 0,
    plannedStartDate: "",
    notes: "",
  },
  checklistItems: [
    // ── อุปกรณ์ (equipment) ──
    {
      id: "equipment-pruning-shears",
      name: "กรรไกรตัดกิ่ง (ผ่านการฆ่าเชื้อ)",
      category: "equipment",
      isCritical: true,
      requiredQuantity: 1,
      unit: "อัน",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "equipment-cutting-blade",
      name: "มีดหรือใบมีดคมสำหรับตัดรอยเฉียง",
      category: "equipment",
      isCritical: true,
      requiredQuantity: 1,
      unit: "เล่ม",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "equipment-rubber-gloves",
      name: "ถุงมือยาง",
      category: "equipment",
      isCritical: false,
      requiredQuantity: 1,
      unit: "กล่อง",
      status: "to_buy",
      notes: "",
      source: "default",
    },

    // ── วัสดุปักชำ (propagation_medium) ──
    {
      id: "medium-perlite",
      name: "เพอร์ไลต์ (perlite)",
      category: "propagation_medium",
      isCritical: true,
      requiredQuantity: 5,
      unit: "ลิตร",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "medium-coco-peat",
      name: "ขุยมะพร้าว (coco peat)",
      category: "propagation_medium",
      isCritical: true,
      requiredQuantity: 5,
      unit: "ลิตร",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "medium-coarse-sand",
      name: "ทรายหยาบล้างสะอาด",
      category: "propagation_medium",
      isCritical: false,
      requiredQuantity: 2,
      unit: "ลิตร",
      status: "to_buy",
      notes: "",
      source: "default",
    },

    // ── ภาชนะ (container) ──
    {
      id: "container-propagation-pot",
      name: "ถาดปักชำหรือกระถางขนาดเล็กพร้อมรูระบายน้ำ",
      category: "container",
      isCritical: true,
      requiredQuantity: 5,
      unit: "ใบ",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "container-humidity-dome",
      name: "ฝาครอบพลาสติกใสหรือถุงใส (สร้าง humidity dome)",
      category: "container",
      isCritical: true,
      requiredQuantity: 5,
      unit: "ใบ",
      status: "to_buy",
      notes: "",
      source: "default",
    },

    // ── ระบบความชื้น (humidity_system) ──
    {
      id: "humidity-spray-bottle",
      name: "กระบอกฉีดน้ำพ่นหมอกขนาดเล็ก",
      category: "humidity_system",
      isCritical: true,
      requiredQuantity: 1,
      unit: "อัน",
      status: "to_buy",
      notes: "",
      source: "default",
    },

    // ── สารทดลอง (treatment_input) ──
    {
      id: "input-rooting-hormone",
      name: "สารเร่งรากกุหลาบ — IBA ผงหรือเจล (rooting hormone)",
      category: "treatment_input",
      isCritical: true,
      requiredQuantity: 1,
      unit: "กระปุก",
      status: "to_buy",
      notes: "",
      source: "default",
    },

    // ── การทำความสะอาด (sanitation) ──
    {
      id: "sanitation-alcohol",
      name: "แอลกอฮอล์ 70% สำหรับฆ่าเชื้ออุปกรณ์",
      category: "sanitation",
      isCritical: true,
      requiredQuantity: 1,
      unit: "ขวด",
      status: "to_buy",
      notes: "",
      source: "default",
    },

    // ── ป้ายและการบันทึก (label_and_record) ──
    {
      id: "record-labels",
      name: "ป้ายระบุ Treatment สำหรับ T0 และ T1",
      category: "label_and_record",
      isCritical: true,
      requiredQuantity: 10,
      unit: "ชิ้น",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "record-marker",
      name: "ปากกาเคมีกันน้ำสำหรับเขียนป้าย",
      category: "label_and_record",
      isCritical: false,
      requiredQuantity: 1,
      unit: "ด้าม",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "record-form",
      name: "แบบฟอร์มบันทึกการสังเกตรายวัน",
      category: "label_and_record",
      isCritical: false,
      requiredQuantity: 1,
      unit: "ชุด",
      status: "to_buy",
      notes: "",
      source: "default",
    },

    // ── พื้นที่ทดลอง (trial_area) ──
    {
      id: "area-shade",
      name: "พื้นที่ร่มเงา 50–70% แสง (หลีกเลี่ยงแดดตรง)",
      category: "trial_area",
      isCritical: true,
      requiredQuantity: 1,
      unit: "แห่ง",
      status: "to_buy",
      notes: "",
      source: "default",
    },
    {
      id: "area-rose-source",
      name: "แหล่งกิ่งพันธุ์กุหลาบที่สมบูรณ์ไม่เป็นโรค",
      category: "trial_area",
      isCritical: true,
      requiredQuantity: 1,
      unit: "แห่ง",
      status: "to_buy",
      notes: "",
      source: "default",
    },
  ],
  treatments: [
    {
      id: "treatment-t0",
      code: "T0",
      name: "Control",
      description: "ปักชำกิ่งกุหลาบด้วยวัสดุปลูกพื้นฐาน (เพอร์ไลต์ + ขุยมะพร้าว) โดยไม่ใช้สารเร่งราก ใช้เป็นค่าอ้างอิงเปรียบเทียบ",
      cuttingCount: 0,
      inputName: "ไม่มี (น้ำเปล่า)",
      notes: "",
      source: "default",
    },
    {
      id: "treatment-t1",
      code: "T1",
      name: "Rooting Treatment",
      description: "ปักชำกิ่งกุหลาบด้วยวัสดุปลูกชุดเดียวกันกับ T0 แต่จุ่มโคนกิ่งในสารเร่งราก IBA ตามความเข้มข้นที่กำหนดก่อนปักลงวัสดุ",
      cuttingCount: 0,
      inputName: "IBA Rooting Hormone",
      notes: "",
      source: "default",
    },
  ],
  groupConfig: createDefaultPilotGroupConfig(),
  inventory: createDefaultInventory(),
  treatmentProduct: createDefaultTreatmentProduct(),
  samples: generateTrialSamples(createDefaultPilotGroupConfig()),
  day0Workflow: createDefaultDay0Workflow(),
  pilotStart: createDefaultPilotStartRecord(),
  updatedAt: null,
};

// ---- UI Maps ----

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  have: "มีแล้ว",
  to_buy: "ต้องซื้อ",
  ordered: "สั่งซื้อแล้ว",
  received: "ได้รับแล้ว",
  ready: "พร้อมใช้",
  not_needed: "ไม่จำเป็น",
};

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  equipment: "อุปกรณ์",
  propagation_medium: "วัสดุปักชำ",
  container: "ภาชนะ",
  humidity_system: "ระบบความชื้น",
  treatment_input: "สารทดลอง",
  sanitation: "การทำความสะอาด",
  label_and_record: "ป้ายและการบันทึก",
  trial_area: "พื้นที่ทดลอง",
};

export function createDefaultRoseTrialState(): RoseTrialStateV2 {
  const groupConfig = createDefaultPilotGroupConfig();
  return {
    ...DEFAULT_ROSE_TRIAL_STATE,
    version: 2,
    pilot: { ...DEFAULT_ROSE_TRIAL_STATE.pilot },
    batch: { ...DEFAULT_ROSE_TRIAL_STATE.batch },
    checklistItems: DEFAULT_ROSE_TRIAL_STATE.checklistItems.map((item) => ({ ...item })),
    treatments: DEFAULT_ROSE_TRIAL_STATE.treatments.map((treatment) => ({ ...treatment })),
    groupConfig,
    inventory: createDefaultInventory(),
    treatmentProduct: createDefaultTreatmentProduct(),
    samples: generateTrialSamples(groupConfig),
    day0Workflow: createDefaultDay0Workflow(),
    pilotStart: createDefaultPilotStartRecord(),
  };
}
