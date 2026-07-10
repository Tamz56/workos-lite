// GF-APP-075 — Rose Trial Lab Default State
// Stage 2B: ข้อมูลเริ่มต้นสำหรับ Rose Trial Lab

import type {
  RoseTrialState,
  ChecklistStatus,
  ChecklistCategory,
} from "./types";

export const DEFAULT_ROSE_TRIAL_STATE: RoseTrialState = {
  version: 1,
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
