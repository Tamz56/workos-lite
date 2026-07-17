import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PreparationChecklistSection } from "@/components/workspaces/travel/rose-trial/PreparationChecklistSection";
import {
  buildPreparationChecklistCategoryViews,
  filterPreparationChecklistItems,
  getPreparationChecklistFeedback,
  getVisiblePreparationChecklistCategoryIds,
  summarizePreparationChecklist,
} from "@/components/workspaces/travel/rose-trial/preparationChecklistView";
import type {
  ChecklistStatus,
  PreparationChecklistItem,
} from "@/components/workspaces/travel/rose-trial/types";

function checklistItem(
  id: string,
  status: ChecklistStatus,
  overrides: Partial<PreparationChecklistItem> = {}
): PreparationChecklistItem {
  return {
    id,
    name: `รายการ ${id}`,
    category: "equipment",
    isCritical: true,
    requiredQuantity: 1,
    unit: "ชิ้น",
    status,
    notes: "",
    source: "default",
    ...overrides,
  };
}

const allStatuses = [
  checklistItem("buy", "to_buy"),
  checklistItem("ordered", "ordered"),
  checklistItem("have", "have"),
  checklistItem("received", "received", { isCritical: false }),
  checklistItem("ready", "ready"),
  checklistItem("not-needed", "not_needed", { isCritical: false }),
];

describe("Preparation Checklist presentation selectors", () => {
  it("summarizes all approved Checklist counts without replacing readiness", () => {
    expect(summarizePreparationChecklist(allStatuses, 3)).toEqual({
      totalCount: 6,
      day0PassedCount: 2,
      readyCount: 1,
      notNeededCount: 1,
      actionRequiredCount: 4,
      toBuyCount: 1,
      orderedCount: 1,
      pendingInspectionCount: 2,
      criticalMissingCount: 3,
    });
  });

  it("keeps ready and not-needed separate while both pass Day 0", () => {
    const summary = summarizePreparationChecklist(allStatuses, 0);
    expect(summary.day0PassedCount).toBe(2);
    expect(summary.readyCount).toBe(1);
    expect(summary.notNeededCount).toBe(1);
  });

  it("filters action-required items", () => {
    expect(filterPreparationChecklistItems(allStatuses, "action_required").map((item) => item.id))
      .toEqual(["buy", "ordered", "have", "received"]);
  });

  it("filters to-buy items", () => {
    expect(filterPreparationChecklistItems(allStatuses, "to_buy").map((item) => item.id))
      .toEqual(["buy"]);
  });

  it("filters ordered items", () => {
    expect(filterPreparationChecklistItems(allStatuses, "ordered").map((item) => item.id))
      .toEqual(["ordered"]);
  });

  it("combines have and received without duplicates", () => {
    expect(filterPreparationChecklistItems(allStatuses, "have_or_received").map((item) => item.id))
      .toEqual(["have", "received"]);
  });

  it("filters ready without including not-needed", () => {
    expect(filterPreparationChecklistItems(allStatuses, "ready").map((item) => item.id))
      .toEqual(["ready"]);
  });

  it("filters critical items", () => {
    expect(filterPreparationChecklistItems(allStatuses, "critical").map((item) => item.id))
      .toEqual(["buy", "ordered", "have", "ready"]);
  });

  it("filters optional items", () => {
    expect(filterPreparationChecklistItems(allStatuses, "optional").map((item) => item.id))
      .toEqual(["received", "not-needed"]);
  });

  it("returns all items for the all filter", () => {
    expect(filterPreparationChecklistItems(allStatuses, "all")).toEqual(allStatuses);
  });

  it("preserves item order and does not mutate inputs", () => {
    const items = [
      checklistItem("third", "ready", { isCritical: false }),
      checklistItem("first", "to_buy", { isCritical: false }),
      checklistItem("second", "ordered"),
    ];
    const snapshot = structuredClone(items);
    const result = filterPreparationChecklistItems(items, "optional");

    expect(result.map((item) => item.id)).toEqual(["third", "first"]);
    expect(result[0]).toBe(items[0]);
    expect(items).toEqual(snapshot);
  });

  it("uses the full category for progress while rows use the active filter", () => {
    const items = [
      checklistItem("pending", "to_buy"),
      checklistItem("passed", "ready"),
    ];
    const [category] = buildPreparationChecklistCategoryViews(items, "action_required");

    expect(category.items.map((item) => item.id)).toEqual(["pending"]);
    expect(category.progress).toEqual({
      totalCount: 2,
      day0PassedCount: 1,
      actionRequiredCount: 1,
      criticalMissingCount: 1,
    });
  });

  it("omits categories with no filtered results", () => {
    const items = [
      checklistItem("pending", "to_buy"),
      checklistItem("ready-area", "ready", { category: "trial_area" }),
    ];

    expect(buildPreparationChecklistCategoryViews(items, "action_required").map((view) => view.category))
      .toEqual(["equipment"]);
  });

  it("derives the categories that must open when a filter changes", () => {
    const items = [
      checklistItem("buy-equipment", "to_buy"),
      checklistItem("ordered-area", "ordered", { category: "trial_area" }),
      checklistItem("ready-medium", "ready", { category: "propagation_medium" }),
    ];

    expect(getVisiblePreparationChecklistCategoryIds(items, "action_required"))
      .toEqual(["equipment", "trial_area"]);
    expect(getVisiblePreparationChecklistCategoryIds(items, "ready"))
      .toEqual(["propagation_medium"]);
  });

  it.each([
    ["to_buy", "ยังไม่ผ่าน Day 0 — ต้องจัดซื้อ"],
    ["ordered", "ยังไม่ผ่าน Day 0 — สั่งซื้อแล้วและรอรับ"],
    ["have", "ยังไม่ผ่าน Day 0 — มีของแล้วแต่ยังต้องตรวจพร้อมใช้"],
    ["received", "ยังไม่ผ่าน Day 0 — ได้รับแล้วแต่ยังต้องตรวจพร้อมใช้"],
    ["ready", "ผ่านเกณฑ์ Day 0 — พร้อมใช้"],
    ["not_needed", "ผ่านเกณฑ์ Day 0 — ระบุว่าไม่จำเป็น"],
  ] as const)("derives feedback for %s", (status, expected) => {
    expect(getPreparationChecklistFeedback(status)).toBe(expected);
  });
});

describe("PreparationChecklistSection", () => {
  it("renders the approved summary, default filter, callout, progress, and compact row", () => {
    const pending = checklistItem("pending", "to_buy", {
      name: "กรรไกรตัดกิ่งสำหรับทดสอบข้อความภาษาไทยแบบยาว",
      requiredQuantity: 2,
      unit: "อัน",
    });
    const passed = checklistItem("passed", "ready");
    const pendingMedium = checklistItem("pending-medium", "ordered", {
      category: "propagation_medium",
      name: "วัสดุปักชำที่สั่งแล้ว",
    });
    const readyArea = checklistItem("ready-area", "ready", {
      category: "trial_area",
      name: "พื้นที่พร้อมแล้ว",
    });
    const html = renderToStaticMarkup(React.createElement(PreparationChecklistSection, {
      items: [pending, passed, pendingMedium, readyArea],
      readiness: { criticalMissingItems: [pending, pendingMedium] },
      onAddItem: vi.fn(),
      onEditItem: vi.fn(),
      onDeleteItem: vi.fn(),
      onUpdateItem: vi.fn(),
    }));

    expect(html).toContain("รายการทั้งหมด");
    expect(html).toContain("ผ่านเกณฑ์ Day 0");
    expect(html).toContain("ยังต้องจัดการ");
    expect(html).toContain("ต้องซื้อ");
    expect(html).toContain("สั่งซื้อแล้ว");
    expect(html).toContain("มีของแล้ว — รอตรวจ");
    expect(html).toContain("รายการจำเป็นที่ยังไม่พร้อม 2 รายการ");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("ดูทั้งหมด");
    expect(html).toContain("กำลังแสดง");
    expect(html).toContain("ผ่าน 1/2");
    expect(html).toContain("ยังต้องจัดการ 1");
    expect(html).toContain("จำเป็นขาด 1");
    expect(html).toContain("แสดง 1 รายการ");
    expect(html).toContain("กรรไกรตัดกิ่งสำหรับทดสอบข้อความภาษาไทยแบบยาว");
    expect(html).toContain("จำเป็น");
    expect(html).toContain("ยังไม่ผ่าน Day 0 — ต้องจัดซื้อ");
    expect(html).toContain("จำนวนที่วางแผน");
    expect(html).toContain(">2</span>");
    expect(html).toContain(">อัน</span>");
    expect(html).toContain("แก้ไข");
    expect(html).toContain("พร้อมใช้ — นับผ่าน Day 0");
    expect(html).toContain("ยุบทุกหมวด");
    expect(html).toContain("ขยายทุกหมวด");
    expect(html).toContain('data-visual-system="soft-botanical"');
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(2);
    const controlledPanelIds = Array.from(
      html.matchAll(/aria-controls="([^"]+)"/g),
      (match) => match[1]
    );
    expect(controlledPanelIds).toHaveLength(2);
    controlledPanelIds.forEach((panelId) => {
      expect(html).toContain(`id="${panelId}"`);
    });
    expect(html.indexOf(`id="${controlledPanelIds[0]}"`)).toBeLessThan(html.lastIndexOf(pending.name));
    expect(html).not.toContain("พื้นที่ทดลอง");
    expect(html).not.toContain("พื้นที่พร้อมแล้ว");
    expect(html).not.toContain("Critical");
    expect(html).not.toContain("Optional");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
  });

  it("renders the calm callout when all critical items pass", () => {
    const html = renderToStaticMarkup(React.createElement(PreparationChecklistSection, {
      items: [checklistItem("ready", "ready")],
      readiness: { criticalMissingItems: [] },
      onAddItem: vi.fn(),
      onEditItem: vi.fn(),
      onDeleteItem: vi.fn(),
      onUpdateItem: vi.fn(),
    }));

    expect(html).toContain("รายการจำเป็นผ่านเกณฑ์ Day 0 แล้ว");
  });

  it("keeps the existing modal readiness and quantity helper copy in the parent", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/RoseTrialLabClient.tsx"),
      "utf8"
    );

    expect(source).toContain("ระบบนับรายการนี้ว่าพร้อมเมื่อเลือก “พร้อมใช้” หรือ “ไม่จำเป็น” เท่านั้น");
    expect(source).toContain("จำนวนนี้ใช้สำหรับวางแผนการเตรียม ไม่ใช่จำนวนคงเหลือ");
  });

  it("keeps accordion state local and has no storage access", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/PreparationChecklistSection.tsx"),
      "utf8"
    );

    expect(source).toContain("useState<Set<ChecklistCategory>>");
    expect(source).toContain("setOpenCategories(new Set(getVisiblePreparationChecklistCategoryIds(items, filter)))");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
  });
});
