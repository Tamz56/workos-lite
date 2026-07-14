import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InventorySection } from "@/components/workspaces/travel/rose-trial/InventorySection";
import { TreatmentProductSection } from "@/components/workspaces/travel/rose-trial/TreatmentProductSection";
import {
  createDefaultRoseTrialState,
  createDefaultTreatmentProduct,
} from "@/components/workspaces/travel/rose-trial/defaults";
import {
  assessInventoryItem,
  calculateMissingQuantity,
  mergeInventoryWithDefaults,
  summarizeInventoryReadiness,
  updateInventoryItems,
} from "@/components/workspaces/travel/rose-trial/inventory";
import {
  calculateReadiness,
  evaluateTreatmentProductReadiness,
} from "@/components/workspaces/travel/rose-trial/readiness";
import {
  loadRoseTrialState,
  ROSE_TRIAL_STORAGE_KEY,
  saveRoseTrialState,
} from "@/components/workspaces/travel/rose-trial/storage";
import type { InventoryItem, TreatmentProductRecord } from "@/components/workspaces/travel/rose-trial/types";

function readyProduct(overrides: Partial<TreatmentProductRecord> = {}): TreatmentProductRecord {
  return {
    ...createDefaultTreatmentProduct(),
    status: "ready_to_use",
    packagingType: "original",
    seller: "ร้านตัวอย่าง",
    expiryNote: "ตรวจฉลากแล้ว",
    applicationMethod: "ใช้ตามข้อมูลผู้ขาย",
    storageNote: "เก็บในที่เหมาะสมตามข้อมูลผู้ขาย",
    ...overrides,
  };
}

function readyItem(priority: InventoryItem["priority"] = "A"): InventoryItem {
  return {
    id: `item-${priority}`,
    category: "equipment",
    name: priority === "A" ? "กรรไกร" : "Timer",
    requiredQuantity: 2,
    availableQuantity: 2,
    usableQuantity: 2,
    unit: "ชิ้น",
    status: "ready",
    priority,
    note: "",
    lastCheckedAt: null,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Rose Trial Inventory helpers", () => {
  it("derives missing quantity without storing it", () => {
    expect(calculateMissingQuantity({ ...readyItem(), usableQuantity: 0 })).toBe(2);
    expect(calculateMissingQuantity({ ...readyItem(), usableQuantity: 5 })).toBe(0);
  });

  it("blocks critical shortages and warns for optional shortages", () => {
    const critical = { ...readyItem("A"), usableQuantity: 1 };
    const optional = { ...readyItem("B"), usableQuantity: 0 };
    const summary = summarizeInventoryReadiness([critical, optional]);

    expect(assessInventoryItem(critical)).toMatchObject({ level: "blocked", missingQuantity: 1 });
    expect(assessInventoryItem(optional)).toMatchObject({ level: "warning", missingQuantity: 2 });
    expect(summary.blockers).toHaveLength(1);
    expect(summary.warnings).toHaveLength(1);
  });

  it("rejects ready status when usable quantity is insufficient", () => {
    const assessment = assessInventoryItem({ ...readyItem(), usableQuantity: 1 });
    expect(assessment.messages).toContain("สถานะระบุว่าพร้อม แต่จำนวนที่ใช้ได้จริงยังไม่ครบ");
  });

  it("marks invalid integer quantities and updates immutably", () => {
    const original = [readyItem()];
    const updated = updateInventoryItems(original, original[0].id, { availableQuantity: 3 });

    expect(original[0].availableQuantity).toBe(2);
    expect(updated[0].availableQuantity).toBe(3);
    expect(updated).not.toBe(original);
    expect(assessInventoryItem({ ...readyItem(), usableQuantity: 1.5 }).messages).toContain("ข้อมูลจำนวนไม่ถูกต้อง");
  });

  it("adds new canonical defaults without overwriting existing user fields", () => {
    const oldState = createDefaultRoseTrialState();
    const oldItem = { ...oldState.inventory[0], status: "ready" as const, note: "เก็บข้อความนี้", usableQuantity: 8 };
    const merged = mergeInventoryWithDefaults([oldItem]);

    expect(merged.length).toBeGreaterThan(1);
    expect(merged[0]).toMatchObject({ status: "ready", note: "เก็บข้อความนี้", usableQuantity: 8 });
  });
});

describe("Rose Trial Treatment Product readiness", () => {
  it("passes Ready to Use and keeps Product URL optional", () => {
    const result = evaluateTreatmentProductReadiness(readyProduct({ productUrl: "" }));
    expect(result).toEqual({ blockers: [], warnings: [], status: "ready" });
  });

  it.each(["not_selected", "selected", "ordered", "received"] as const)(
    "blocks status %s",
    (status) => {
      expect(evaluateTreatmentProductReadiness(readyProduct({ status })).blockers)
        .toContain("Treatment Product: สินค้ายังไม่อยู่ในสถานะพร้อมใช้");
    }
  );

  it("warns for repacked and missing supporting information without blocking", () => {
    const result = evaluateTreatmentProductReadiness(readyProduct({
      packagingType: "repacked",
      expiryNote: "",
      applicationMethod: "",
      storageNote: "",
    }));

    expect(result.blockers).toEqual([]);
    expect(result.warnings).toHaveLength(4);
    expect(result.status).toBe("warning");
  });

  it("blocks blank product name and preserves locked Clonex identity defaults", () => {
    const defaults = createDefaultTreatmentProduct();
    expect(defaults).toMatchObject({
      productName: "Clonex Rooting Gel",
      productType: "Commercial Rooting Treatment",
      activeIngredient: "IBA",
      form: "Gel",
    });
    expect(evaluateTreatmentProductReadiness(readyProduct({ productName: "" })).blockers)
      .toContain("Treatment Product: กรุณาระบุชื่อสินค้า");
    expect(evaluateTreatmentProductReadiness(readyProduct({ productName: "ผลิตภัณฑ์อื่น" })).blockers)
      .toContain("Treatment Product: สินค้าที่เลือกต้องตรงกับ Clonex Rooting Gel ตาม Pilot contract");
  });
});

describe("Rose Trial Inventory and Product components", () => {
  it("renders Inventory categories, quantities, status, and missing information", () => {
    const state = createDefaultRoseTrialState();
    const html = renderToStaticMarkup(React.createElement(InventorySection, {
      items: state.inventory,
      sectionStatus: "blocked",
      onUpdateItem: vi.fn(),
    }));

    expect(html).toContain("Inventory Check");
    expect(html).toContain("กิ่งและวัสดุพืช");
    expect(html).toContain("สถานที่ทดลอง");
    expect(html).toContain("จำนวนที่ใช้ได้จริง");
    expect(html).toContain("ยังขาด");
  });

  it("renders Clonex identity, packaging note, and cautious Pilot application summary", () => {
    const html = renderToStaticMarkup(React.createElement(TreatmentProductSection, {
      product: readyProduct({ packagingType: "repacked" }),
      sectionStatus: "warning",
      onUpdate: vi.fn(),
    }));

    expect(html).toContain("Clonex Rooting Gel");
    expect(html).toContain("Commercial Rooting Treatment");
    expect(html).toContain("ผลิตภัณฑ์ในสภาพที่ผู้ใช้ซื้อได้จริง");
    expect(html).toContain("ไม่เติมลงน้ำและไม่ผสมลงพีทมอส");
    expect(html).not.toContain("เร่งรากแน่นอน");
  });
});

describe("Rose Trial Inventory and Product persistence", () => {
  it("saves and reloads Inventory and Product edits without writing during load", () => {
    const store = new Map<string, string>();
    const setItem = vi.fn((key: string, value: string) => store.set(key, value));
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem,
        removeItem: vi.fn((key: string) => store.delete(key)),
      },
    });
    const state = createDefaultRoseTrialState();
    state.inventory = updateInventoryItems(state.inventory, state.inventory[0].id, {
      availableQuantity: 8,
      usableQuantity: 8,
      status: "ready",
      note: "ตรวจแล้ว",
    });
    state.treatmentProduct = readyProduct({ seller: "ผู้ขายจริง" });

    expect(saveRoseTrialState(state)).toBe(true);
    const writesAfterSave = setItem.mock.calls.length;
    const loaded = loadRoseTrialState();

    expect(loaded.status).toBe("valid");
    expect(loaded.state.inventory[0]).toMatchObject({ usableQuantity: 8, status: "ready", note: "ตรวจแล้ว" });
    expect(loaded.state.treatmentProduct.seller).toBe("ผู้ขายจริง");
    expect(setItem).toHaveBeenCalledWith(ROSE_TRIAL_STORAGE_KEY, expect.any(String));
    expect(setItem).toHaveBeenCalledTimes(writesAfterSave);
    expect(calculateReadiness(loaded.state).sections.inventory).toBe("blocked");
  });
});
