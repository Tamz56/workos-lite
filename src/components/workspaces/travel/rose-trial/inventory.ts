import { createDefaultInventory } from "./defaults";
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
  ReadinessSectionStatus,
} from "./types";

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  procure: "ต้องซื้อ",
  available: "มีแล้ว — ต้องตรวจ",
  ready: "พร้อม",
  not_needed: "ไม่จำเป็นในรอบนี้ / ไม่ใช้",
};

export interface InventoryCategoryGroup {
  id: string;
  label: string;
  categories: readonly InventoryCategory[];
}

export const INVENTORY_CATEGORY_GROUPS: readonly InventoryCategoryGroup[] = [
  { id: "plant", label: "กิ่งและวัสดุพืช", categories: ["plant_material"] },
  { id: "containers", label: "ภาชนะ", categories: ["container"] },
  { id: "medium", label: "วัสดุชำ", categories: ["growing_medium"] },
  { id: "treatment", label: "Treatment", categories: ["treatment_product"] },
  { id: "tools", label: "เครื่องมือ", categories: ["equipment", "labeling", "sanitation"] },
  { id: "location", label: "สถานที่ทดลอง", categories: ["trial_area"] },
];

export interface InventoryItemAssessment {
  missingQuantity: number;
  level: "ready" | "blocked" | "warning";
  messages: string[];
}

export interface InventoryReadinessSummary {
  criticalReady: number;
  criticalTotal: number;
  procureCount: number;
  checkCount: number;
  optionalWarningCount: number;
  blockers: string[];
  warnings: string[];
  status: ReadinessSectionStatus;
}

function isValidInventoryQuantity(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

export function calculateMissingQuantity(item: InventoryItem): number {
  if (!isValidInventoryQuantity(item.requiredQuantity) || !isValidInventoryQuantity(item.usableQuantity)) {
    return 0;
  }
  return Math.max(item.requiredQuantity - item.usableQuantity, 0);
}

export function assessInventoryItem(item: InventoryItem): InventoryItemAssessment {
  const invalidQuantity = !isValidInventoryQuantity(item.requiredQuantity) ||
    !isValidInventoryQuantity(item.availableQuantity) ||
    !isValidInventoryQuantity(item.usableQuantity);
  const missingQuantity = calculateMissingQuantity(item);
  const issues: string[] = [];

  if (invalidQuantity) issues.push("ข้อมูลจำนวนไม่ถูกต้อง");
  if (item.status === "procure") issues.push("ยังต้องซื้อ");
  if (item.status === "available") issues.push("ยังต้องตรวจของจริง");
  if (item.status === "ready" && missingQuantity > 0) {
    issues.push("สถานะระบุว่าพร้อม แต่จำนวนที่ใช้ได้จริงยังไม่ครบ");
  } else if (item.status !== "not_needed" && missingQuantity > 0) {
    issues.push(`ยังขาด ${missingQuantity} ${item.unit}`);
  }

  if (issues.length === 0 || item.status === "not_needed") {
    return { missingQuantity, level: "ready", messages: [] };
  }
  return {
    missingQuantity,
    level: item.priority === "A" ? "blocked" : "warning",
    messages: issues,
  };
}

export function summarizeInventoryReadiness(items: readonly InventoryItem[]): InventoryReadinessSummary {
  const criticalItems = items.filter((item) => item.priority === "A");
  const assessed = items.map((item) => ({ item, assessment: assessInventoryItem(item) }));
  const blockers = assessed
    .filter(({ assessment }) => assessment.level === "blocked")
    .flatMap(({ item, assessment }) => assessment.messages.map((message) => `Inventory: ${item.name} — ${message}`));
  const warnings = assessed
    .filter(({ assessment }) => assessment.level === "warning")
    .flatMap(({ item, assessment }) => assessment.messages.map((message) => `Inventory ทางเลือก: ${item.name} — ${message}`));

  return {
    criticalReady: criticalItems.filter((item) => assessInventoryItem(item).level === "ready").length,
    criticalTotal: criticalItems.length,
    procureCount: items.filter((item) => item.status === "procure").length,
    checkCount: items.filter((item) => item.status === "available").length,
    optionalWarningCount: assessed.filter(({ item, assessment }) => item.priority === "B" && assessment.level === "warning").length,
    blockers,
    warnings,
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
  };
}

export function updateInventoryItems(
  items: readonly InventoryItem[],
  itemId: string,
  patch: Partial<InventoryItem>
): InventoryItem[] {
  return items.map((item) => item.id === itemId ? { ...item, ...patch } : item);
}

export function mergeInventoryWithDefaults(items: readonly InventoryItem[]): InventoryItem[] {
  const defaults = createDefaultInventory();
  const existingById = new Map(items.map((item) => [item.id, item]));
  const defaultIds = new Set(defaults.map((item) => item.id));

  const isNonNegativeInteger = (value: unknown): boolean => {
    return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
  };

  const normalizeQuantity = (value: unknown): number => {
    return isNonNegativeInteger(value) ? (value as number) : 0;
  };

  const isValidStatus = (status: unknown): status is InventoryStatus => {
    return typeof status === "string" && ["procure", "available", "ready", "not_needed"].includes(status);
  };

  const merged = defaults.map((defaultItem) => {
    const existing = existingById.get(defaultItem.id);
    if (!existing) return defaultItem;

    return {
      ...defaultItem, // Strictly preserve category, name, unit, requiredQuantity, priority from canonical default
      availableQuantity: normalizeQuantity(existing.availableQuantity),
      usableQuantity: normalizeQuantity(existing.usableQuantity),
      status: isValidStatus(existing.status) ? existing.status : "procure",
      note: typeof existing.note === "string" ? existing.note : "",
      lastCheckedAt: typeof existing.lastCheckedAt === "string" || existing.lastCheckedAt === null
        ? existing.lastCheckedAt
        : null,
    };
  });

  const INVENTORY_CATEGORIES = [
    "growing_medium", "container", "treatment_product", "equipment",
    "labeling", "sanitation", "trial_area", "plant_material"
  ];
  const INVENTORY_PRIORITIES = ["A", "B"];

  const unknown = items
    .filter((item) => !defaultIds.has(item.id))
    .filter((item) => {
      // Structural minimum checks for unknown items
      return typeof item.id === "string" && item.id.trim() !== "" &&
        typeof item.name === "string" && item.name.trim() !== "" &&
        typeof item.unit === "string" && item.unit.trim() !== "" &&
        isNonNegativeInteger(item.availableQuantity) &&
        isNonNegativeInteger(item.usableQuantity) &&
        isNonNegativeInteger(item.requiredQuantity) &&
        isValidStatus(item.status) &&
        typeof item.category === "string" && INVENTORY_CATEGORIES.includes(item.category) &&
        typeof item.priority === "string" && INVENTORY_PRIORITIES.includes(item.priority);
    })
    .map((item) => {
      return {
        ...item,
        availableQuantity: normalizeQuantity(item.availableQuantity),
        usableQuantity: normalizeQuantity(item.usableQuantity),
        requiredQuantity: normalizeQuantity(item.requiredQuantity),
        note: typeof item.note === "string" ? item.note : "",
        lastCheckedAt: typeof item.lastCheckedAt === "string" || item.lastCheckedAt === null
          ? item.lastCheckedAt
          : null,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  // Deduplicate unknown items by id
  const seenIds = new Set(merged.map((i) => i.id));
  const uniqueUnknown: InventoryItem[] = [];
  for (const item of unknown) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueUnknown.push(item);
    }
  }

  return [...merged, ...uniqueUnknown];
}
