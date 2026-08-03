import { describe, expect, it } from "vitest";
import {
  filterInventoryItems,
  getInventoryItemDisplayMessage,
  summarizeInventoryDisplay,
} from "@/components/workspaces/travel/rose-trial/inventoryView";
import type { InventoryItem } from "@/components/workspaces/travel/rose-trial/types";

function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "inventory-test",
    category: "equipment",
    name: "อุปกรณ์ทดสอบ",
    requiredQuantity: 2,
    availableQuantity: 2,
    usableQuantity: 2,
    unit: "ชิ้น",
    status: "ready",
    priority: "A",
    note: "",
    lastCheckedAt: null,
    ...overrides,
  };
}

describe("Rose Trial Inventory presentation selectors", () => {
  it("summarizes display counts from existing inventory assessments", () => {
    const items = [
      inventoryItem({ id: "critical-ready" }),
      inventoryItem({ id: "critical-procure", status: "procure", usableQuantity: 0 }),
      inventoryItem({ id: "optional-check", priority: "B", status: "available" }),
      inventoryItem({ id: "optional-ready", priority: "B" }),
    ];

    expect(summarizeInventoryDisplay(items)).toEqual({
      totalCount: 4,
      criticalReadyCount: 1,
      criticalNeedsActionCount: 1,
      purchaseNeededCount: 1,
      checkCount: 1,
      optionalCount: 2,
    });
  });

  it("includes blocked and warning items in action-required", () => {
    const blocked = inventoryItem({ id: "blocked", status: "procure" });
    const warning = inventoryItem({ id: "warning", priority: "B", status: "available" });
    const ready = inventoryItem({ id: "ready" });

    expect(filterInventoryItems([blocked, warning, ready], "action_required"))
      .toEqual([blocked, warning]);
  });

  it("includes both procure and shortage items in purchase without duplicates", () => {
    const procureAndShort = inventoryItem({ id: "both", status: "procure", usableQuantity: 0 });
    const short = inventoryItem({ id: "short", usableQuantity: 1 });
    const ready = inventoryItem({ id: "ready" });
    const result = filterInventoryItems([procureAndShort, short, ready], "purchase");

    expect(result.map((item) => item.id)).toEqual(["both", "short"]);
    expect(new Set(result.map((item) => item.id)).size).toBe(result.length);
  });

  it("excludes not-needed items from purchase, shortage, and ready filters", () => {
    const notNeeded = inventoryItem({
      id: "not-needed",
      status: "not_needed",
      availableQuantity: 0,
      usableQuantity: 0,
    });

    expect(filterInventoryItems([notNeeded], "purchase")).toEqual([]);
    expect(filterInventoryItems([notNeeded], "shortage")).toEqual([]);
    expect(filterInventoryItems([notNeeded], "ready")).toEqual([]);
  });

  it("filters ready, critical, and optional items by their approved contracts", () => {
    const ready = inventoryItem({ id: "ready" });
    const notReady = inventoryItem({ id: "not-ready", status: "available" });
    const optional = inventoryItem({ id: "optional", priority: "B" });
    const items = [ready, notReady, optional];

    expect(filterInventoryItems(items, "ready")).toEqual([ready, optional]);
    expect(filterInventoryItems(items, "critical")).toEqual([ready, notReady]);
    expect(filterInventoryItems(items, "optional")).toEqual([optional]);
  });

  it("keeps invalid quantities in action-required", () => {
    const invalid = inventoryItem({ usableQuantity: Number.NaN });
    expect(filterInventoryItems([invalid], "action_required")).toEqual([invalid]);
  });

  it("preserves input order and never mutates the source array or items", () => {
    const items = [
      inventoryItem({ id: "third", priority: "B" }),
      inventoryItem({ id: "first", priority: "B" }),
      inventoryItem({ id: "second", priority: "A" }),
    ];
    const snapshot = structuredClone(items);
    const result = filterInventoryItems(items, "optional");

    expect(result.map((item) => item.id)).toEqual(["third", "first"]);
    expect(result[0]).toBe(items[0]);
    expect(items).toEqual(snapshot);
  });

  it("derives a ready message", () => {
    expect(getInventoryItemDisplayMessage(inventoryItem()))
      .toBe("พร้อมใช้ครบตามจำนวน");
  });

  it("derives an available-but-needs-check message", () => {
    expect(getInventoryItemDisplayMessage(inventoryItem({ status: "available" })))
      .toBe("มีของแล้ว แต่ยังต้องตรวจจำนวนที่ใช้ได้จริง");
  });

  it("derives a shortage message when status is ready", () => {
    expect(getInventoryItemDisplayMessage(inventoryItem({ usableQuantity: 1 })))
      .toBe("ยังขาด 1 ชิ้น");
  });

  it("derives a purchase message", () => {
    expect(getInventoryItemDisplayMessage(inventoryItem({ status: "procure" })))
      .toBe("ต้องซื้อก่อนเริ่ม Day 0");
  });

  it("explains that an optional warning does not block Day 0", () => {
    expect(getInventoryItemDisplayMessage(inventoryItem({
      priority: "B",
      status: "available",
    }))).toContain("รายการทางเลือก — ไม่ขวางการเริ่ม Day 0");
  });

  it("derives a not-used message before quantity feedback", () => {
    expect(getInventoryItemDisplayMessage(inventoryItem({
      status: "not_needed",
      usableQuantity: 0,
    }))).toBe("ระบุว่าไม่ใช้ในรอบนี้");
  });
});
