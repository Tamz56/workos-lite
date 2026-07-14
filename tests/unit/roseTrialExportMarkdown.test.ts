import { describe, expect, it } from "vitest";
import { createDefaultRoseTrialState } from "@/components/workspaces/travel/rose-trial/defaults";
import { generateRoseTrialMarkdown } from "@/components/workspaces/travel/rose-trial/exportMarkdown";
import { calculateReadiness } from "@/components/workspaces/travel/rose-trial/readiness";
import type { PreparationChecklistItem, RoseTrialState, Treatment } from "@/components/workspaces/travel/rose-trial/types";

const EXPORTED_AT = "2026-07-11T00:00:00.000Z";

function createReadyState(): RoseTrialState {
  const state = createDefaultRoseTrialState();
  return {
    ...state,
    pilot: {
      ...state.pilot,
      trialName: "Rose Trial Ready",
      goal: "ตรวจความพร้อมของการเตรียมทดลองปักชำ",
      location: "โรงเรือนทดลอง",
      expectedStartDate: "2026-07-12",
    },
    batch: {
      ...state.batch,
      batchName: "Batch Ready",
      totalCuttings: 2,
      plannedStartDate: "2026-07-12",
    },
    checklistItems: state.checklistItems.map((item) => ({
      ...item,
      status: "ready",
    })),
    treatments: state.treatments.map((treatment) => ({
      ...treatment,
      cuttingCount: 1,
    })),
    inventory: state.inventory.map((item) => ({
      ...item,
      availableQuantity: item.requiredQuantity,
      usableQuantity: item.requiredQuantity,
      status: "ready",
    })),
    treatmentProduct: {
      ...state.treatmentProduct,
      status: "ready_to_use",
      packagingType: "original",
      seller: "ผู้ขายที่ตรวจสอบแล้ว",
      expiryNote: "ตรวจแล้ว",
      applicationMethod: "ใช้ตามข้อมูลผู้ขาย",
      storageNote: "เก็บตามข้อมูลผู้ขาย",
    },
  };
}

function exportState(state: RoseTrialState, isDirty = false): string {
  return generateRoseTrialMarkdown(state, calculateReadiness(state), EXPORTED_AT, { isDirty });
}

describe("generateRoseTrialMarkdown", () => {
  it("exports the default state without crashing", () => {
    const markdown = exportState(createDefaultRoseTrialState());

    expect(markdown).toContain("# Rose Trial Preparation Summary");
    expect(markdown).toContain("สถานะความพร้อม: ยังไม่พร้อม");
    expect(markdown).toContain("## 6. รายการที่ต้องดำเนินการต่อ");
  });

  it("exports a ready state", () => {
    const markdown = exportState(createReadyState());

    expect(markdown).toContain("สถานะความพร้อม: พร้อมเริ่ม Day 0");
    expect(markdown).toContain("- [x] ผ่านเงื่อนไขความพร้อมที่ระบบกำหนด");
  });

  it("exports a partially ready state", () => {
    const state = createReadyState();
    state.checklistItems[2] = {
      ...state.checklistItems[2],
      isCritical: false,
      status: "to_buy",
    };

    const markdown = exportState(state);

    expect(markdown).toContain("สถานะความพร้อม: พร้อมบางส่วน");
    expect(markdown).toContain("พิจารณารายการทางเลือก");
  });

  it("shows missing required fields", () => {
    const state = createReadyState();
    state.pilot.trialName = "";
    state.pilot.goal = "";
    state.batch.batchName = "";

    const markdown = exportState(state);

    expect(markdown).toContain("ชื่อการทดลอง: ยังไม่ได้ระบุ");
    expect(markdown).toContain("- [ ] ระบุชื่อการทดลอง");
    expect(markdown).toContain("- [ ] ระบุเป้าหมายการทดลอง");
    expect(markdown).toContain("- [ ] ระบุชื่อ Batch");
  });

  it("uses placeholder text for empty notes", () => {
    const markdown = exportState(createReadyState());

    expect(markdown).toContain("- หมายเหตุ: ยังไม่ได้ระบุ");
  });

  it("groups checklist items by Thai category", () => {
    const markdown = exportState(createDefaultRoseTrialState());

    expect(markdown).toContain("### อุปกรณ์");
    expect(markdown).toContain("### วัสดุปักชำ");
    expect(markdown).toContain("| รายการ | จำนวน | หน่วย | ความสำคัญ | สถานะ | หมายเหตุ |");
  });

  it("includes user-created checklist items", () => {
    const state = createReadyState();
    const item: PreparationChecklistItem = {
      id: "user-item-1",
      name: "ถุงซิปเก็บตัวอย่าง",
      category: "label_and_record",
      isCritical: false,
      requiredQuantity: 3,
      unit: "ใบ",
      status: "ready",
      notes: "เพิ่มเอง",
      source: "user",
    };
    state.checklistItems.push(item);

    const markdown = exportState(state);

    expect(markdown).toContain("ถุงซิปเก็บตัวอย่าง");
    expect(markdown).toContain("ทางเลือก");
  });

  it("includes T0 and T1 treatments", () => {
    const markdown = exportState(createReadyState());

    expect(markdown).toContain("| T0 | Control | 1 |");
    expect(markdown).toContain("| T1 | Rooting Treatment | 1 |");
  });

  it("includes user-created treatments", () => {
    const state = createReadyState();
    const treatment: Treatment = {
      id: "treatment-user",
      code: "T2",
      name: "Extra Treatment",
      description: "สังเกตเฉพาะกลุ่ม",
      cuttingCount: 0,
      inputName: "วัสดุทดสอบ",
      notes: "เพิ่มเอง",
      source: "user",
    };
    state.batch.totalCuttings = 2;
    state.treatments.push(treatment);

    const markdown = exportState(state);

    expect(markdown).toContain("| T2 | Extra Treatment | 0 | วัสดุทดสอบ |");
  });

  it("escapes pipe characters in table cells", () => {
    const state = createReadyState();
    state.checklistItems[0].name = "กรรไกร | ใบมีด";
    state.treatments[0].notes = "A | B";

    const markdown = exportState(state);

    expect(markdown).toContain("กรรไกร \\| ใบมีด");
    expect(markdown).toContain("A \\| B");
  });

  it("handles multiline notes in table cells", () => {
    const state = createReadyState();
    state.checklistItems[0].notes = "บรรทัดแรก\nบรรทัดสอง";

    const markdown = exportState(state);

    expect(markdown).toContain("บรรทัดแรก<br>บรรทัดสอง");
  });

  it("handles empty checklist", () => {
    const state = createReadyState();
    state.checklistItems = [];

    const markdown = exportState(state);

    expect(markdown).toContain("ยังไม่มีรายการ Checklist");
  });

  it("handles empty treatments", () => {
    const state = createReadyState();
    state.treatments = [];

    const markdown = exportState(state);

    expect(markdown).toContain("| ยังไม่ได้ระบุ | ยังไม่ได้ระบุ | ยังไม่ได้ระบุ |");
  });

  it("includes unsaved state notice", () => {
    const markdown = exportState(createReadyState(), true);

    expect(markdown).toContain("เอกสารนี้สร้างจากข้อมูลปัจจุบันบนหน้าจอ ซึ่งอาจยังไม่ได้บันทึกลงในเครื่อง");
  });

  it("preserves Thai text", () => {
    const state = createReadyState();
    state.pilot.location = "โรงเรือนพัชรา";

    const markdown = exportState(state);

    expect(markdown).toContain("โรงเรือนพัชรา");
    expect(markdown).toContain("ข้อจำกัดของข้อมูล");
  });

  it("does not add overclaim wording", () => {
    const markdown = exportState(createReadyState());

    expect(markdown).not.toContain("รากออกแน่นอน");
    expect(markdown).not.toContain("สำเร็จแน่นอน");
    expect(markdown).not.toContain("เร่งรากแบบเห็นผล");
  });

  it("includes export timestamp", () => {
    const markdown = exportState(createReadyState());

    expect(markdown).toContain(`วันที่ส่งออก: ${EXPORTED_AT}`);
  });

  it("includes cautious limitation text", () => {
    const markdown = exportState(createReadyState());

    expect(markdown).toContain("เอกสารนี้เป็น snapshot ของข้อมูลการเตรียมทดลอง ณ เวลาที่ส่งออก");
    expect(markdown).toContain("ไม่ได้ยืนยันว่าการปักชำจะออกรากหรือประสบผลสำเร็จ");
  });
});
