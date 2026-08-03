import type {
  ChecklistCategory,
  ChecklistStatus,
  PreparationChecklistItem,
} from "./types";

export type PreparationChecklistFilter =
  | "action_required"
  | "to_buy"
  | "ordered"
  | "have_or_received"
  | "ready"
  | "critical"
  | "optional"
  | "all";

export interface PreparationChecklistSummary {
  totalCount: number;
  day0PassedCount: number;
  readyCount: number;
  notNeededCount: number;
  actionRequiredCount: number;
  toBuyCount: number;
  orderedCount: number;
  pendingInspectionCount: number;
  criticalMissingCount: number;
}

export interface PreparationChecklistCategoryProgress {
  totalCount: number;
  day0PassedCount: number;
  actionRequiredCount: number;
  criticalMissingCount: number;
}

export interface PreparationChecklistCategoryView {
  category: ChecklistCategory;
  items: PreparationChecklistItem[];
  progress: PreparationChecklistCategoryProgress;
}

export const PREPARATION_CHECKLIST_FILTERS: ReadonlyArray<{
  id: PreparationChecklistFilter;
  label: string;
}> = [
  { id: "action_required", label: "ยังต้องจัดการ" },
  { id: "to_buy", label: "ต้องซื้อ" },
  { id: "ordered", label: "สั่งซื้อแล้ว" },
  { id: "have_or_received", label: "มีของแล้ว — รอตรวจ" },
  { id: "ready", label: "พร้อมใช้" },
  { id: "critical", label: "รายการจำเป็น" },
  { id: "optional", label: "รายการทางเลือก" },
  { id: "all", label: "ทั้งหมด" },
];

function passesDay0(status: ChecklistStatus): boolean {
  return status === "ready" || status === "not_needed";
}

export function matchesPreparationChecklistFilter(
  item: PreparationChecklistItem,
  filter: PreparationChecklistFilter
): boolean {
  switch (filter) {
    case "action_required":
      return !passesDay0(item.status);
    case "to_buy":
      return item.status === "to_buy";
    case "ordered":
      return item.status === "ordered";
    case "have_or_received":
      return item.status === "have" || item.status === "received";
    case "ready":
      return item.status === "ready";
    case "critical":
      return item.isCritical;
    case "optional":
      return !item.isCritical;
    case "all":
      return true;
  }
}

export function filterPreparationChecklistItems(
  items: readonly PreparationChecklistItem[],
  filter: PreparationChecklistFilter
): PreparationChecklistItem[] {
  return items.filter((item) => matchesPreparationChecklistFilter(item, filter));
}

export function summarizePreparationChecklist(
  items: readonly PreparationChecklistItem[],
  criticalMissingCount: number
): PreparationChecklistSummary {
  const readyCount = items.filter((item) => item.status === "ready").length;
  const notNeededCount = items.filter((item) => item.status === "not_needed").length;

  return {
    totalCount: items.length,
    day0PassedCount: readyCount + notNeededCount,
    readyCount,
    notNeededCount,
    actionRequiredCount: items.filter((item) => !passesDay0(item.status)).length,
    toBuyCount: items.filter((item) => item.status === "to_buy").length,
    orderedCount: items.filter((item) => item.status === "ordered").length,
    pendingInspectionCount: items.filter(
      (item) => item.status === "have" || item.status === "received"
    ).length,
    criticalMissingCount,
  };
}

export function summarizePreparationChecklistCategory(
  items: readonly PreparationChecklistItem[],
  category: ChecklistCategory
): PreparationChecklistCategoryProgress {
  const categoryItems = items.filter((item) => item.category === category);

  return {
    totalCount: categoryItems.length,
    day0PassedCount: categoryItems.filter((item) => passesDay0(item.status)).length,
    actionRequiredCount: categoryItems.filter((item) => !passesDay0(item.status)).length,
    criticalMissingCount: categoryItems.filter(
      (item) => item.isCritical && !passesDay0(item.status)
    ).length,
  };
}

export function buildPreparationChecklistCategoryViews(
  items: readonly PreparationChecklistItem[],
  filter: PreparationChecklistFilter
): PreparationChecklistCategoryView[] {
  const filteredItems = filterPreparationChecklistItems(items, filter);
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return categories.flatMap((category) => {
    const categoryItems = filteredItems.filter((item) => item.category === category);
    if (categoryItems.length === 0) return [];

    return [{
      category,
      items: categoryItems,
      progress: summarizePreparationChecklistCategory(items, category),
    }];
  });
}

export function getVisiblePreparationChecklistCategoryIds(
  items: readonly PreparationChecklistItem[],
  filter: PreparationChecklistFilter
): ChecklistCategory[] {
  return buildPreparationChecklistCategoryViews(items, filter).map(({ category }) => category);
}

export function getPreparationChecklistFeedback(status: ChecklistStatus): string {
  switch (status) {
    case "to_buy":
      return "ยังไม่ผ่าน Day 0 — ต้องจัดซื้อ";
    case "ordered":
      return "ยังไม่ผ่าน Day 0 — สั่งซื้อแล้วและรอรับ";
    case "have":
      return "ยังไม่ผ่าน Day 0 — มีของแล้วแต่ยังต้องตรวจพร้อมใช้";
    case "received":
      return "ยังไม่ผ่าน Day 0 — ได้รับแล้วแต่ยังต้องตรวจพร้อมใช้";
    case "ready":
      return "ผ่านเกณฑ์ Day 0 — พร้อมใช้";
    case "not_needed":
      return "ผ่านเกณฑ์ Day 0 — ระบุว่าไม่จำเป็น";
  }
}
