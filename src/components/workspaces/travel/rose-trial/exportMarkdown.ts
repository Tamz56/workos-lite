import type {
  ChecklistCategory,
  ChecklistStatus,
  PreparationChecklistItem,
  ReadinessLevel,
  ReadinessResult,
  RoseTrialState,
  Treatment,
} from "./types";
import {
  CHECKLIST_CATEGORY_LABELS,
  CHECKLIST_STATUS_LABELS,
} from "./defaults";

interface GenerateRoseTrialMarkdownOptions {
  isDirty?: boolean;
}

const EMPTY_VALUE = "ยังไม่ได้ระบุ";

const READINESS_LABELS: Record<ReadinessLevel, string> = {
  not_ready: "ยังไม่พร้อม",
  partially_ready: "พร้อมบางส่วน",
  ready_for_day0: "พร้อมเริ่ม Day 0",
};

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function displayText(value: unknown): string {
  const text = asText(value).trim();
  return text.length > 0 ? text : EMPTY_VALUE;
}

function displayNumber(value: unknown): string {
  const numberValue = asFiniteNumber(value);
  return numberValue === null ? EMPTY_VALUE : String(numberValue);
}

function tableCell(value: unknown): string {
  const text = typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : displayText(value);

  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function numberCell(value: unknown): string {
  const numberValue = asFiniteNumber(value);
  return numberValue === null ? EMPTY_VALUE : String(numberValue);
}

function formatDifference(value: unknown): string {
  const numberValue = asFiniteNumber(value);
  if (numberValue === null) return EMPTY_VALUE;
  if (numberValue === 0) return "ครบ";
  return numberValue > 0 ? `ขาด ${numberValue}` : `เกิน ${Math.abs(numberValue)}`;
}

function getStatusLabel(status: ChecklistStatus | undefined): string {
  return status ? CHECKLIST_STATUS_LABELS[status] ?? EMPTY_VALUE : EMPTY_VALUE;
}

function getCategoryLabel(category: ChecklistCategory | undefined): string {
  return category ? CHECKLIST_CATEGORY_LABELS[category] ?? EMPTY_VALUE : EMPTY_VALUE;
}

function getReadinessLabel(status: ReadinessLevel | undefined): string {
  return status ? READINESS_LABELS[status] ?? EMPTY_VALUE : EMPTY_VALUE;
}

function formatChecklistRows(items: PreparationChecklistItem[]): string[] {
  return items.map((item) => {
    const quantity = item.requiredQuantity === null ? EMPTY_VALUE : numberCell(item.requiredQuantity);
    const importance = item.isCritical ? "จำเป็น" : "ทางเลือก";
    return `| ${tableCell(item.name)} | ${quantity} | ${tableCell(item.unit)} | ${importance} | ${tableCell(getStatusLabel(item.status))} | ${tableCell(item.notes)} |`;
  });
}

function formatTreatmentRows(treatments: Treatment[]): string[] {
  if (treatments.length === 0) {
    return [`| ${EMPTY_VALUE} | ${EMPTY_VALUE} | ${EMPTY_VALUE} | ${EMPTY_VALUE} | ${EMPTY_VALUE} | ${EMPTY_VALUE} |`];
  }

  return treatments.map((treatment) =>
    `| ${tableCell(treatment.code)} | ${tableCell(treatment.name)} | ${numberCell(treatment.cuttingCount)} | ${tableCell(treatment.inputName)} | ${tableCell(treatment.description)} | ${tableCell(treatment.notes)} |`
  );
}

function getDuplicateTreatmentCodes(treatments: Treatment[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  treatments.forEach((treatment) => {
    const code = asText(treatment.code).trim();
    if (!code) return;
    if (seen.has(code)) {
      duplicates.add(code);
      return;
    }
    seen.add(code);
  });

  return [...duplicates];
}

function buildActionItems(state: RoseTrialState, readiness: ReadinessResult): string[] {
  const items: string[] = [];

  if (!asText(state.pilot.trialName).trim()) {
    items.push("ระบุชื่อการทดลอง");
  }
  if (!asText(state.pilot.goal).trim()) {
    items.push("ระบุเป้าหมายการทดลอง");
  }
  if (!asText(state.batch.batchName).trim()) {
    items.push("ระบุชื่อ Batch");
  }

  readiness.criticalMissingItems.forEach((item) => {
    items.push(`เตรียมรายการจำเป็น: ${displayText(item.name)} (${getCategoryLabel(item.category)})`);
  });

  readiness.optionalPendingItems.forEach((item) => {
    items.push(`พิจารณารายการทางเลือก: ${displayText(item.name)} (${getCategoryLabel(item.category)})`);
  });

  if (readiness.cuttingDifference !== 0) {
    items.push(
      readiness.cuttingDifference > 0
        ? `จัดสรรจำนวนกิ่งใน Treatment เพิ่มอีก ${readiness.cuttingDifference} กิ่ง`
        : `ลดจำนวนกิ่งใน Treatment ลง ${Math.abs(readiness.cuttingDifference)} กิ่ง`
    );
  }

  getDuplicateTreatmentCodes(state.treatments).forEach((code) => {
    items.push(`แก้ Treatment code ซ้ำ: ${code}`);
  });

  state.treatments.forEach((treatment) => {
    if (!asText(treatment.code).trim()) {
      items.push(`ระบุ Treatment code สำหรับกลุ่ม: ${displayText(treatment.name)}`);
    }
    if (!asText(treatment.name).trim()) {
      items.push(`ระบุชื่อ Treatment สำหรับรหัส: ${displayText(treatment.code)}`);
    }
  });

  if (items.length === 0) {
    return ["- [x] ผ่านเงื่อนไขความพร้อมที่ระบบกำหนด"];
  }

  return items.map((item) => `- [ ] ${item}`);
}

export function generateRoseTrialMarkdown(
  state: RoseTrialState,
  readiness: ReadinessResult,
  exportedAt: string,
  options: GenerateRoseTrialMarkdownOptions = {}
): string {
  const pilot = state.pilot;
  const batch = state.batch;
  const checklistItems = Array.isArray(state.checklistItems) ? state.checklistItems : [];
  const treatments = Array.isArray(state.treatments) ? state.treatments : [];
  const readinessReasons = readiness.reasons.length > 0
    ? readiness.reasons.map((reason) => `- ${reason}`)
    : ["- ไม่มีเงื่อนไขค้างตามเกณฑ์ปัจจุบัน"];
  const dirtyNotice = options.isDirty
    ? [
        "> เอกสารนี้สร้างจากข้อมูลปัจจุบันบนหน้าจอ ซึ่งอาจยังไม่ได้บันทึกลงในเครื่อง",
        "",
      ]
    : [];

  const sections: string[] = [
    "# Rose Trial Preparation Summary",
    "",
    `โครงการ: Green Fineness — Nutrient Planner App`,
    `โมดูล: Rose Trial Lab`,
    `วันที่ส่งออก: ${displayText(exportedAt)}`,
    `สถานะความพร้อม: ${getReadinessLabel(readiness.status)}`,
    "",
    ...dirtyNotice,
    "## 1. ภาพรวมการทดลอง",
    "",
    `- ชื่อการทดลอง: ${displayText(pilot.trialName)}`,
    `- พืช: ${displayText(pilot.cropName)}`,
    `- เป้าหมาย: ${displayText(pilot.goal)}`,
    `- สถานที่: ${displayText(pilot.location)}`,
    `- วันที่คาดว่าจะเริ่ม: ${displayText(pilot.expectedStartDate)}`,
    `- หมายเหตุ: ${displayText(pilot.notes)}`,
    "",
    "## 2. ข้อมูล Batch",
    "",
    `- ชื่อ Batch: ${displayText(batch.batchName)}`,
    `- จำนวนกิ่งทั้งหมด: ${displayNumber(batch.totalCuttings)}`,
    `- วันที่วางแผนเริ่ม: ${displayText(batch.plannedStartDate)}`,
    `- จำนวน Treatment: ${treatments.length}`,
    `- จำนวนกิ่งที่จัดสรรแล้ว: ${displayNumber(readiness.assignedCuttings)}`,
    `- ส่วนต่างจำนวนกิ่ง: ${formatDifference(readiness.cuttingDifference)}`,
    `- หมายเหตุ: ${displayText(batch.notes)}`,
    "",
    "## 3. สรุปความพร้อม",
    "",
    `- สถานะรวม: ${getReadinessLabel(readiness.status)}`,
    `- รายการทั้งหมด: ${displayNumber(readiness.totalItems)}`,
    `- รายการพร้อม: ${displayNumber(readiness.readyItems)}`,
    `- Critical items ที่ยังไม่พร้อม: ${readiness.criticalMissingItems.length}`,
    `- Optional items ที่ยังไม่พร้อม: ${readiness.optionalPendingItems.length}`,
    `- จำนวนกิ่งทั้งหมด: ${displayNumber(readiness.totalCuttings)}`,
    `- จำนวนกิ่งที่จัดสรรใน Treatment: ${displayNumber(readiness.assignedCuttings)}`,
    "",
    "เหตุผลที่ยังไม่พร้อม:",
    ...readinessReasons,
    "",
    "## 4. Checklist การเตรียม",
    "",
  ];

  const categories = Object.entries(CHECKLIST_CATEGORY_LABELS) as [ChecklistCategory, string][];
  let hasChecklistSection = false;
  categories.forEach(([category, label]) => {
    const categoryItems = checklistItems.filter((item) => item.category === category);
    if (categoryItems.length === 0) return;
    hasChecklistSection = true;
    sections.push(
      `### ${label}`,
      "",
      "| รายการ | จำนวน | หน่วย | ความสำคัญ | สถานะ | หมายเหตุ |",
      "|---|---:|---|---|---|---|",
      ...formatChecklistRows(categoryItems),
      ""
    );
  });

  if (!hasChecklistSection) {
    sections.push("ยังไม่มีรายการ Checklist", "");
  }

  sections.push(
    "## 5. Treatment Setup",
    "",
    "| รหัส | ชื่อกลุ่ม | จำนวนกิ่ง | สารหรือวัสดุที่ใช้ | คำอธิบาย | หมายเหตุ |",
    "|---|---|---:|---|---|---|",
    ...formatTreatmentRows(treatments),
    "",
    "## 6. รายการที่ต้องดำเนินการต่อ",
    "",
    ...buildActionItems(state, readiness),
    "",
    "## 7. ข้อจำกัดของข้อมูล",
    "",
    "- เอกสารนี้เป็น snapshot ของข้อมูลการเตรียมทดลอง ณ เวลาที่ส่งออก",
    "- สถานะความพร้อมอ้างอิงจากเงื่อนไขภายในระบบปัจจุบัน",
    "- ไม่ได้ยืนยันว่าการปักชำจะออกรากหรือประสบผลสำเร็จ",
    "- ผลจริงอาจขึ้นกับต้นแม่ คุณภาพกิ่ง วัสดุปักชำ น้ำ แสง ความชื้น อุณหภูมิ การจัดการ และปัจจัยแวดล้อมอื่น"
  );

  return sections.join("\n").trimEnd() + "\n";
}
