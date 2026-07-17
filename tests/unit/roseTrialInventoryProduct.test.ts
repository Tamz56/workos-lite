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
import type {
  InventoryItem,
  InventoryStatus,
  TreatmentProductRecord,
} from "@/components/workspaces/travel/rose-trial/types";

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

  it("defaults undefined/NaN quantities and invalid status safely during merge", () => {
    const item = {
      id: "inventory-clonex",
      category: "treatment_product" as const,
      name: "สารเร่งราก",
      requiredQuantity: 1,
      availableQuantity: undefined as unknown as number,
      usableQuantity: NaN,
      unit: "ชุด",
      status: "invalid-status" as unknown as InventoryStatus,
      priority: "A" as const,
      note: null as unknown as string,
      lastCheckedAt: undefined as unknown as string | null,
    };
    const merged = mergeInventoryWithDefaults([item]);
    const target = merged.find((i) => i.id === "inventory-clonex");
    expect(target).toBeDefined();
    expect(target?.availableQuantity).toBe(0);
    expect(target?.usableQuantity).toBe(0);
    expect(target?.status).toBe("procure");
    expect(target?.note).toBe("");
    expect(target?.lastCheckedAt).toBeNull();
  });

  it("preserves canonical unit/requiredQuantity and drops incomplete unknown items", () => {
    const canonicalItem = {
      id: "inventory-clonex",
      category: "equipment" as const,
      name: "wrong name",
      requiredQuantity: 99,
      availableQuantity: 1,
      usableQuantity: 1,
      unit: "wrong unit",
      status: "ready" as const,
      priority: "B" as const,
      note: "user note",
      lastCheckedAt: null,
    };
    const validUnknownItem = {
      id: "unknown-item-1",
      category: "equipment" as const,
      name: "อุปกรณ์นอกสารบบ",
      requiredQuantity: 1,
      availableQuantity: 2,
      usableQuantity: 2,
      unit: "เครื่อง",
      status: "ready" as const,
      priority: "B" as const,
      note: "",
      lastCheckedAt: null,
    };
    const invalidUnknownItem = {
      id: "unknown-item-2",
      category: "equipment" as const,
      name: "อุปกรณ์เสีย",
      requiredQuantity: 1,
      availableQuantity: 2,
      usableQuantity: 2,
      status: "ready" as const,
      priority: "B" as const,
      note: "",
      lastCheckedAt: null,
    };

    const merged = mergeInventoryWithDefaults([
      canonicalItem,
      validUnknownItem,
      invalidUnknownItem as unknown as InventoryItem
    ]);

    const hormone = merged.find((i) => i.id === "inventory-clonex");
    expect(hormone).toBeDefined();
    expect(hormone?.category).toBe("treatment_product");
    expect(hormone?.requiredQuantity).toBe(1);
    expect(hormone?.unit).toBe("ชุด");
    expect(hormone?.priority).toBe("A");
    expect(hormone?.usableQuantity).toBe(1);
    expect(hormone?.note).toBe("user note");

    const keptUnknown = merged.find((i) => i.id === "unknown-item-1");
    expect(keptUnknown).toBeDefined();
    expect(keptUnknown?.name).toBe("อุปกรณ์นอกสารบบ");

    const droppedUnknown = merged.find((i) => i.id === "unknown-item-2");
    expect(droppedUnknown).toBeUndefined();
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
    expect(html).toContain("รายการทั้งหมด");
    expect(html).toContain("รายการจำเป็นพร้อม");
    expect(html).toContain("รายการจำเป็นยังไม่พร้อม");
    expect(html).toContain("ต้องจัดซื้อ");
    expect(html).toContain("มีแล้ว — ต้องตรวจ");
    expect(html).toContain("รายการทางเลือก");
    expect(html).toContain("ยังต้องจัดการ");
    expect(html).toContain("พร้อมใช้");
    expect(html).toContain("ขาดจำนวน");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("ดูทั้งหมด");
    expect(html).toContain("กำลังแสดง");
    expect(html).toContain("กิ่งและวัสดุพืช");
    expect(html).toContain("สถานที่ทดลอง");
    expect(html).toContain("จำนวนที่ต้องใช้");
    expect(html).toContain("จำนวนที่มี");
    expect(html).toContain("จำนวนที่ใช้ได้จริง");
    expect(html).toContain("จำนวนที่ยังขาด");
    expect(html).toContain("<details");
    expect(html).toContain("รายละเอียดเพิ่มเติม");
    expect(html).toContain("จำเป็น");
    expect(html).toContain("ทางเลือก");
    expect(html).not.toContain("Critical");
    expect(html).not.toContain("Optional");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
  });

  it("does not render categories with no results in the default action-required view", () => {
    const html = renderToStaticMarkup(React.createElement(InventorySection, {
      items: [
        readyItem(),
        {
          ...readyItem("B"),
          id: "location-ready",
          category: "trial_area",
          name: "พื้นที่พร้อมแล้ว",
        },
        {
          ...readyItem(),
          id: "tool-procure",
          status: "procure",
          name: "เครื่องมือที่ต้องซื้อ",
        },
      ],
      sectionStatus: "blocked",
      onUpdateItem: vi.fn(),
    }));

    expect(html).toContain("เครื่องมือ");
    expect(html).toContain("เครื่องมือที่ต้องซื้อ");
    expect(html).not.toContain("สถานที่ทดลอง");
    expect(html).not.toContain("พื้นที่พร้อมแล้ว");
  });

  it("renders Clonex identity, packaging note, and cautious Pilot application summary", () => {
    const onUpdate = vi.fn();
    const html = renderToStaticMarkup(React.createElement(TreatmentProductSection, {
      product: readyProduct({ packagingType: "repacked" }),
      sectionStatus: "warning",
      onUpdate,
    }));

    expect(html).toContain('type="button"');
    expect(html).toContain('aria-expanded="false"');
    const panelId = html.match(/aria-controls="([^"]+-treatment-product-panel)"/)?.[1];
    expect(panelId).toBeTruthy();
    expect(html).toContain(`id="${panelId}" hidden=""`);
    expect(html).toContain("บันทึกแล้ว • Clonex Rooting Gel • ต้องตรวจ");
    expect(html).toContain("Clonex Rooting Gel");
    expect(html).toContain("Commercial Rooting Treatment");
    expect(html).toContain("ผลิตภัณฑ์ในสภาพที่ผู้ใช้ซื้อได้จริง");
    expect(html).toContain("ไม่เติมลงน้ำและไม่ผสมลงพีทมอส");
    expect(html).not.toContain("เร่งรากแน่นอน");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("shows the existing empty state without claiming readiness", () => {
    const product = {
      ...createDefaultTreatmentProduct(),
      productName: "",
      status: "not_selected" as const,
    };
    const html = renderToStaticMarkup(React.createElement(TreatmentProductSection, {
      product,
      sectionStatus: "blocked",
      onUpdate: vi.fn(),
    }));

    expect(html).toContain("ยังไม่ได้บันทึกผลิตภัณฑ์");
    expect(html).toContain("มีสิ่งที่ต้องแก้");
    expect(html).not.toContain("บันทึกแล้ว •");
  });

  it("renders QuantityInput with undefined value as empty input value in HTML", () => {
    const html = renderToStaticMarkup(React.createElement(InventorySection, {
      items: [
        {
          id: "item-test",
          category: "equipment",
          name: "กิ่งชำทดสอบ",
          requiredQuantity: 8,
          availableQuantity: undefined as unknown as number,
          usableQuantity: undefined as unknown as number,
          unit: "กิ่ง",
          status: "procure",
          priority: "A",
          note: "",
          lastCheckedAt: null,
        }
      ],
      sectionStatus: "blocked",
      onUpdateItem: vi.fn(),
    }));

    expect(html).toContain('value=""');
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
