import {
  assessInventoryItem,
  calculateMissingQuantity,
  summarizeInventoryReadiness,
} from "./inventory";
import type { InventoryItem } from "./types";

export type InventoryViewFilter =
  | "action_required"
  | "purchase"
  | "available_check"
  | "ready"
  | "shortage"
  | "critical"
  | "optional"
  | "all";

export const INVENTORY_VIEW_FILTERS: readonly {
  id: InventoryViewFilter;
  label: string;
}[] = [
  { id: "action_required", label: "ยังต้องจัดการ" },
  { id: "purchase", label: "ต้องซื้อ" },
  { id: "available_check", label: "มีแล้ว — ต้องตรวจ" },
  { id: "ready", label: "พร้อมใช้" },
  { id: "shortage", label: "ขาดจำนวน" },
  { id: "critical", label: "จำเป็น" },
  { id: "optional", label: "ทางเลือก" },
  { id: "all", label: "ทั้งหมด" },
];

export interface InventoryDisplaySummary {
  totalCount: number;
  criticalReadyCount: number;
  criticalNeedsActionCount: number;
  purchaseNeededCount: number;
  checkCount: number;
  optionalCount: number;
}

export function matchesInventoryViewFilter(
  item: InventoryItem,
  filter: InventoryViewFilter
): boolean {
  const assessment = assessInventoryItem(item);
  const missingQuantity = calculateMissingQuantity(item);

  switch (filter) {
    case "action_required":
      return assessment.level !== "ready";
    case "purchase":
      return item.status !== "not_needed" &&
        (item.status === "procure" || missingQuantity > 0);
    case "available_check":
      return item.status === "available";
    case "ready":
      return item.status === "ready" && assessment.level === "ready";
    case "shortage":
      return item.status !== "not_needed" && missingQuantity > 0;
    case "critical":
      return item.priority === "A";
    case "optional":
      return item.priority === "B";
    case "all":
      return true;
  }
}

export function filterInventoryItems(
  items: readonly InventoryItem[],
  filter: InventoryViewFilter
): InventoryItem[] {
  return items.filter((item) => matchesInventoryViewFilter(item, filter));
}

export function summarizeInventoryDisplay(
  items: readonly InventoryItem[]
): InventoryDisplaySummary {
  const readinessSummary = summarizeInventoryReadiness(items);

  return {
    totalCount: items.length,
    criticalReadyCount: readinessSummary.criticalReady,
    criticalNeedsActionCount: items.filter((item) =>
      item.priority === "A" && assessInventoryItem(item).level === "blocked"
    ).length,
    purchaseNeededCount: filterInventoryItems(items, "purchase").length,
    checkCount: items.filter((item) => item.status === "available").length,
    optionalCount: items.filter((item) => item.priority === "B").length,
  };
}

export function getInventoryItemDisplayMessage(item: InventoryItem): string {
  if (item.status === "not_needed") {
    return "ระบุว่าไม่ใช้ในรอบนี้";
  }

  const assessment = assessInventoryItem(item);
  const missingQuantity = assessment.missingQuantity;
  let message: string;

  if (assessment.messages.includes("ข้อมูลจำนวนไม่ถูกต้อง")) {
    message = "ข้อมูลจำนวนไม่ถูกต้อง — กรุณาตรวจจำนวนอีกครั้ง";
  } else if (item.status === "procure") {
    message = "ต้องซื้อก่อนเริ่ม Day 0";
  } else if (item.status === "available") {
    message = "มีของแล้ว แต่ยังต้องตรวจจำนวนที่ใช้ได้จริง";
  } else if (missingQuantity > 0) {
    message = `ยังขาด ${missingQuantity} ${item.unit}`;
  } else if (assessment.level === "ready") {
    message = "พร้อมใช้ครบตามจำนวน";
  } else {
    message = assessment.messages[0] ?? "ยังต้องตรวจความพร้อม";
  }

  if (item.priority === "B" && assessment.level === "warning") {
    return `รายการทางเลือก — ไม่ขวางการเริ่ม Day 0 • ${message}`;
  }

  return message;
}
