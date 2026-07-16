"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2 } from "lucide-react";
import {
  assessInventoryItem,
  INVENTORY_CATEGORY_GROUPS,
  INVENTORY_STATUS_LABELS,
  summarizeInventoryReadiness,
} from "./inventory";
import {
  filterInventoryItems,
  getInventoryItemDisplayMessage,
  INVENTORY_VIEW_FILTERS,
  summarizeInventoryDisplay,
  type InventoryViewFilter,
} from "./inventoryView";
import type {
  InventoryItem,
  InventoryStatus,
  ReadinessSectionStatus,
} from "./types";

interface InventorySectionProps {
  items: InventoryItem[];
  sectionStatus: ReadinessSectionStatus;
  onUpdateItem: (itemId: string, patch: Partial<InventoryItem>) => void;
}

const SECTION_STATUS_LABELS: Record<ReadinessSectionStatus, string> = {
  pending: "ยังไม่เริ่ม",
  blocked: "มีสิ่งที่ต้องแก้",
  warning: "ต้องตรวจ",
  ready: "พร้อม",
};

function QuantityInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number | undefined | null;
  onCommit: (value: number) => void;
}) {
  const getSafeDisplayValue = (val: number | undefined | null): string => {
    return typeof val === "number" && Number.isFinite(val) ? String(val) : "";
  };

  const [draft, setDraft] = useState(() => getSafeDisplayValue(value));

  useEffect(() => {
    setDraft(getSafeDisplayValue(value));
  }, [value]);

  return (
    <label className="min-w-0 space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          if (next !== "" && !/^\d+$/.test(next)) return;
          setDraft(next);
          if (next !== "") {
            const num = Number(next);
            if (Number.isFinite(num) && !Number.isNaN(num) && num >= 0) {
              if (value !== num) {
                onCommit(num);
              }
            }
          }
        }}
        onBlur={() => {
          if (draft === "") {
            setDraft("0");
            if (value !== 0) {
              onCommit(0);
            }
          } else {
            const num = Number(draft);
            if (Number.isFinite(num) && !Number.isNaN(num) && num >= 0) {
              setDraft(String(num));
              if (value !== num) {
                onCommit(num);
              }
            } else {
              setDraft(getSafeDisplayValue(value));
            }
          }
        }}
        className="w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      />
    </label>
  );
}

export function InventorySection({ items, sectionStatus, onUpdateItem }: InventorySectionProps) {
  const [activeFilter, setActiveFilter] = useState<InventoryViewFilter>("action_required");
  const readinessSummary = summarizeInventoryReadiness(items);
  const displaySummary = summarizeInventoryDisplay(items);
  const filteredItems = filterInventoryItems(items, activeFilter);

  const summaryItems = [
    ["รายการทั้งหมด", displaySummary.totalCount],
    ["รายการจำเป็นพร้อม", displaySummary.criticalReadyCount],
    ["รายการจำเป็นยังไม่พร้อม", displaySummary.criticalNeedsActionCount],
    ["ต้องจัดซื้อ", displaySummary.purchaseNeededCount],
    ["มีแล้ว — ต้องตรวจ", displaySummary.checkCount],
    ["รายการทางเลือก", displaySummary.optionalCount],
  ] as const;

  return (
    <section className="space-y-3" aria-labelledby="inventory-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Boxes className="h-5 w-5 flex-shrink-0 text-sky-500" />
          <h2 id="inventory-heading" className="text-base font-bold text-neutral-900 dark:text-white">
            คลังของจริงสำหรับ Pilot (Inventory Check)
          </h2>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${
          sectionStatus === "ready"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : sectionStatus === "blocked"
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        }`}>
          {SECTION_STATUS_LABELS[sectionStatus]}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        Inventory Check ใช้ตรวจความพร้อมของของจริงสำหรับ Pilot นี้ ส่วน Preparation Checklist เดิมยังคงใช้เป็นรายการเตรียมงานทั่วไปในช่วงเปลี่ยนผ่าน
        ป้าย “จำเป็น” และ “ทางเลือก” แสดงระดับความสำคัญของรายการ ส่วนสถานะด้านล่างแสดงว่าของพร้อมใช้งานหรือไม่
      </p>

      <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-3">
        {summaryItems.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="break-words text-[10px] font-bold tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="mt-1 text-lg font-black text-neutral-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {readinessSummary.blockers.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            รายการจำเป็นที่ยังไม่พร้อม {readinessSummary.blockers.length} รายการ
          </div>
          <ul className="mt-2 space-y-1 text-xs text-rose-600 dark:text-rose-400">
            {readinessSummary.blockers.slice(0, 5).map((message) => <li key={message} className="break-words">• {message}</li>)}
          </ul>
        </div>
      )}

      <div className="min-w-0 max-w-full space-y-2">
        <div className="max-w-full overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {INVENTORY_VIEW_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`min-h-11 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                    isActive
                      ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-sky-300 hover:text-sky-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
                  }`}
                >
                  {isActive && <span aria-hidden="true" className="mr-1">✓</span>}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <p className="break-words">
            กำลังแสดง <strong className="text-neutral-800 dark:text-neutral-200">{filteredItems.length}</strong> จาก {items.length} รายการ
          </p>
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className="min-h-11 rounded-lg px-3 py-2 font-bold text-sky-700 hover:bg-sky-50 disabled:cursor-default disabled:text-neutral-400 disabled:hover:bg-transparent dark:text-sky-300 dark:hover:bg-sky-950/30"
            disabled={activeFilter === "all"}
          >
            ดูทั้งหมด
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {INVENTORY_CATEGORY_GROUPS.map((group) => {
          const groupItems = filteredItems.filter((item) => group.categories.includes(item.category));
          if (groupItems.length === 0) return null;
          return (
            <details open key={group.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              <summary className="cursor-pointer select-none bg-neutral-50 px-4 py-3 text-sm font-bold text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                {group.label} <span className="font-medium text-neutral-400">({groupItems.length})</span>
              </summary>
              <div className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 xl:grid-cols-2">
                {groupItems.map((item) => {
                  const assessment = assessInventoryItem(item);
                  return (
                    <article key={item.id} className={`min-w-0 space-y-3 p-4 ${
                      assessment.level === "blocked"
                        ? "bg-rose-50/40 dark:bg-rose-950/10"
                        : assessment.level === "ready"
                          ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                          : "bg-white dark:bg-neutral-950"
                    }`}>
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 basis-48">
                          <h3 className="break-words text-sm font-bold text-neutral-900 dark:text-white">{item.name}</h3>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                          item.priority === "A"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                        }`}>
                          {item.priority === "A" ? "จำเป็น" : "ทางเลือก"}
                        </span>
                      </div>

                      <div className={`flex min-w-0 items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                        assessment.level === "blocked"
                          ? "bg-rose-100/70 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                          : assessment.level === "warning"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                            : "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      }`}>
                        {assessment.level === "ready" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                        <span className="min-w-0 break-words">{getInventoryItemDisplayMessage(item)}</span>
                      </div>

                      <div className="grid min-w-0 grid-cols-2 gap-3">
                        <div className="min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                          <p className="break-words text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">จำนวนที่ต้องใช้</p>
                          <p className="mt-1 break-words text-sm font-bold text-neutral-800 dark:text-neutral-200">{item.requiredQuantity} {item.unit}</p>
                        </div>
                        <div className="min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                          <p className="break-words text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">จำนวนที่ยังขาด</p>
                          <p className="mt-1 break-words text-sm font-bold text-neutral-800 dark:text-neutral-200">{assessment.missingQuantity} {item.unit}</p>
                        </div>
                        <QuantityInput label="จำนวนที่มี" value={item.availableQuantity} onCommit={(value) => onUpdateItem(item.id, { availableQuantity: value })} />
                        <QuantityInput label="จำนวนที่ใช้ได้จริง" value={item.usableQuantity} onCommit={(value) => onUpdateItem(item.id, { usableQuantity: value })} />
                      </div>

                      <label className="block min-w-0 space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">สถานะ</span>
                        <select
                          value={item.status}
                          onChange={(event) => onUpdateItem(item.id, { status: event.target.value as InventoryStatus })}
                          className="w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                        >
                          {Object.entries(INVENTORY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>

                      <details className="min-w-0 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                        <summary className="min-h-11 cursor-pointer select-none px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                          รายละเอียดเพิ่มเติม
                        </summary>
                        <div className="min-w-0 space-y-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
                          <label className="block min-w-0 space-y-1">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">วันที่ตรวจล่าสุด</span>
                            <input
                              type="date"
                              value={item.lastCheckedAt ?? ""}
                              onChange={(event) => onUpdateItem(item.id, { lastCheckedAt: event.target.value || null })}
                              className="w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                            />
                          </label>
                          <label className="block min-w-0 space-y-1">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">หมายเหตุ</span>
                            <textarea
                              rows={2}
                              value={item.note}
                              onChange={(event) => onUpdateItem(item.id, { note: event.target.value })}
                              className="w-full min-w-0 resize-y rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                            />
                          </label>
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="min-w-0 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">ไม่มีรายการในมุมมองนี้</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">ลองเลือกตัวกรองอื่นหรือกด “ดูทั้งหมด”</p>
          </div>
        )}
      </div>
    </section>
  );
}
