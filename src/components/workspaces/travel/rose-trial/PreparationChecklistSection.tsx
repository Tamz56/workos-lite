"use client";

import { useId, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Edit2,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { CHECKLIST_CATEGORY_LABELS, CHECKLIST_STATUS_LABELS } from "./defaults";
import {
  PREPARATION_CHECKLIST_FILTERS,
  buildPreparationChecklistCategoryViews,
  filterPreparationChecklistItems,
  getPreparationChecklistFeedback,
  getVisiblePreparationChecklistCategoryIds,
  summarizePreparationChecklist,
  type PreparationChecklistFilter,
} from "./preparationChecklistView";
import type {
  ChecklistCategory,
  ChecklistStatus,
  PreparationChecklistItem,
  ReadinessResult,
} from "./types";

interface PreparationChecklistSectionProps {
  items: readonly PreparationChecklistItem[];
  readiness: Pick<ReadinessResult, "criticalMissingItems">;
  onAddItem: () => void;
  onEditItem: (item: PreparationChecklistItem) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, fields: Partial<PreparationChecklistItem>) => void;
}

const STATUS_TONES: Record<ChecklistStatus, {
  accent: string;
  feedback: string;
  select: string;
}> = {
  to_buy: {
    accent: "border-l-orange-400",
    feedback: "text-orange-800 dark:text-orange-300",
    select: "border-orange-200 bg-orange-50/80 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-200",
  },
  ordered: {
    accent: "border-l-sky-400",
    feedback: "text-sky-800 dark:text-sky-300",
    select: "border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200",
  },
  have: {
    accent: "border-l-amber-400",
    feedback: "text-amber-800 dark:text-amber-300",
    select: "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200",
  },
  received: {
    accent: "border-l-lime-500",
    feedback: "text-lime-800 dark:text-lime-300",
    select: "border-lime-200 bg-lime-50/80 text-lime-900 dark:border-lime-900/60 dark:bg-lime-950/20 dark:text-lime-200",
  },
  ready: {
    accent: "border-l-emerald-500",
    feedback: "text-emerald-800 dark:text-emerald-300",
    select: "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200",
  },
  not_needed: {
    accent: "border-l-stone-400",
    feedback: "text-stone-600 dark:text-stone-300",
    select: "border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200",
  },
};

const FILTER_MARKERS: Partial<Record<PreparationChecklistFilter, string>> = {
  to_buy: "bg-orange-400",
  ordered: "bg-sky-400",
  have_or_received: "bg-amber-400",
  ready: "bg-emerald-500",
};

export function PreparationChecklistSection({
  items,
  readiness,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onUpdateItem,
}: PreparationChecklistSectionProps) {
  const [activeFilter, setActiveFilter] = useState<PreparationChecklistFilter>("action_required");
  const summary = summarizePreparationChecklist(items, readiness.criticalMissingItems.length);
  const filteredItems = filterPreparationChecklistItems(items, activeFilter);
  const categoryViews = buildPreparationChecklistCategoryViews(items, activeFilter);
  const accordionId = useId();
  const [openCategories, setOpenCategories] = useState<Set<ChecklistCategory>>(
    () => new Set(getVisiblePreparationChecklistCategoryIds(items, "action_required"))
  );
  const criticalNames = readiness.criticalMissingItems.slice(0, 4).map((item) => item.name);
  const summaryItems = [
    { label: "รายการทั้งหมด", value: summary.totalCount, tone: "border-slate-200 bg-slate-50/80 text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100" },
    { label: "ผ่านเกณฑ์ Day 0", value: summary.day0PassedCount, tone: "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100" },
    { label: "ยังต้องจัดการ", value: summary.actionRequiredCount, tone: "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100" },
    { label: "ต้องซื้อ", value: summary.toBuyCount, tone: "border-orange-200 bg-orange-50/80 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-100" },
    { label: "สั่งซื้อแล้ว", value: summary.orderedCount, tone: "border-sky-200 bg-sky-50/80 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-100" },
    { label: "มีของแล้ว — รอตรวจ", value: summary.pendingInspectionCount, tone: "border-yellow-200 bg-yellow-50/80 text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-950/20 dark:text-yellow-100" },
    { label: "รายการจำเป็นที่ยังไม่พร้อม", value: summary.criticalMissingCount, tone: "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-100" },
  ] as const;
  const allVisibleCategoriesOpen = categoryViews.length > 0
    && categoryViews.every(({ category }) => openCategories.has(category));
  const allVisibleCategoriesCollapsed = categoryViews.length === 0
    || categoryViews.every(({ category }) => !openCategories.has(category));

  const changeFilter = (filter: PreparationChecklistFilter) => {
    setActiveFilter(filter);
    setOpenCategories(new Set(getVisiblePreparationChecklistCategoryIds(items, filter)));
  };

  const toggleCategory = (category: ChecklistCategory) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <section data-visual-system="soft-botanical" className="min-w-0 space-y-5 rounded-3xl border border-emerald-200/80 bg-stone-50/80 p-4 shadow-sm shadow-emerald-950/5 dark:border-emerald-900/50 dark:bg-stone-950/40 sm:p-5" aria-labelledby="checklist-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckSquare className="h-5 w-5" />
            </span>
            <h2 id="checklist-heading" className="break-words text-base font-bold text-neutral-900 dark:text-white">
              ค. รายการเตรียมอุปกรณ์และวัสดุ
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            ส่วนนี้ติดตามขั้นตอนการจัดหาและตรวจพร้อมใช้ ระบบนับผ่าน Day 0 เมื่อเลือก “พร้อมใช้” หรือ “ไม่จำเป็น” เท่านั้น
          </p>
          <p className="text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
            จำนวนใน Checklist ใช้วางแผน ส่วนจำนวนของที่มีและใช้ได้จริงตรวจใน Inventory Check
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onAddItem}
            className="flex min-h-11 items-center gap-1 rounded-xl border border-emerald-800 bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มรายการ
          </button>
          <span className="text-xs text-neutral-400">Section C</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-7">
        {summaryItems.map(({ label, value, tone }) => (
          <div key={label} className={`min-w-0 rounded-2xl border px-3 py-3 ${tone}`}>
            <p className="break-words text-[11px] font-bold leading-snug opacity-75">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
            {label === "ผ่านเกณฑ์ Day 0" && (
              <p className="mt-1 break-words text-[10px] opacity-70">
                พร้อมใช้ {summary.readyCount} • ไม่จำเป็น {summary.notNeededCount}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${
        readiness.criticalMissingItems.length > 0
          ? "border-orange-200 bg-orange-50/80 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-200"
          : "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"
      }`}>
        {readiness.criticalMissingItems.length > 0
          ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {readiness.criticalMissingItems.length > 0
              ? `รายการจำเป็นที่ยังไม่พร้อม ${readiness.criticalMissingItems.length} รายการ`
              : "รายการจำเป็นผ่านเกณฑ์ Day 0 แล้ว"}
          </p>
          {criticalNames.length > 0 && (
            <>
              <p className="mt-1 break-words text-xs font-semibold leading-relaxed">{criticalNames.join(" • ")}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-80">
                เปลี่ยนสถานะเป็น “พร้อมใช้” หรือ “ไม่จำเป็น” จึงจะผ่านเกณฑ์ Day 0
              </p>
            </>
          )}
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-2 dark:border-emerald-900/50 dark:bg-emerald-950/10">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1.5">
            {PREPARATION_CHECKLIST_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={activeFilter === filter.id}
                onClick={() => changeFilter(filter.id)}
                className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  activeFilter === filter.id
                    ? "border-emerald-800 bg-emerald-700 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-700"
                    : "border-emerald-200 bg-stone-50 text-emerald-900 hover:bg-emerald-100/70 dark:border-emerald-900/60 dark:bg-stone-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                }`}
              >
                {FILTER_MARKERS[filter.id] && (
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${FILTER_MARKERS[filter.id]}`} />
                )}
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
          <p>
            กำลังแสดง <strong className="text-neutral-800 dark:text-neutral-200">{filteredItems.length}</strong> จาก {items.length} รายการ
          </p>
          {activeFilter !== "all" && (
            <button type="button" onClick={() => changeFilter("all")} className="min-h-11 rounded-lg px-3 font-bold text-emerald-700 hover:bg-emerald-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
              ดูทั้งหมด
            </button>
          )}
        </div>
      </div>

      {categoryViews.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={allVisibleCategoriesCollapsed}
            onClick={() => setOpenCategories(new Set())}
            className="min-h-11 rounded-xl border border-emerald-200 bg-stone-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-900/60 dark:bg-stone-900 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
          >
            ยุบทุกหมวด
          </button>
          <button
            type="button"
            disabled={allVisibleCategoriesOpen}
            onClick={() => setOpenCategories(new Set(categoryViews.map(({ category }) => category)))}
            className="min-h-11 rounded-xl border border-emerald-200 bg-stone-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-900/60 dark:bg-stone-900 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
          >
            ขยายทุกหมวด
          </button>
        </div>
      )}

      <div className="space-y-3">
        {categoryViews.map(({ category, items: categoryItems, progress }) => {
          const isOpen = openCategories.has(category);
          const panelId = `${accordionId}-${category}`;

          return (
          <div key={category} className="min-w-0 overflow-hidden rounded-2xl border border-emerald-200/80 border-l-4 border-l-emerald-500 bg-stone-50 shadow-sm shadow-emerald-950/5 dark:border-emerald-900/60 dark:border-l-emerald-600 dark:bg-stone-950">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggleCategory(category)}
              className="flex min-h-11 w-full min-w-0 items-start gap-3 border-b border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-left hover:bg-emerald-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
            >
              <Tag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-bold text-emerald-950 dark:text-emerald-100">
                  {CHECKLIST_CATEGORY_LABELS[category]}
                </span>
                <span className="mt-0.5 block break-words text-xs text-emerald-800/70 dark:text-emerald-300/70">
                  แสดง {categoryItems.length} รายการ
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="rounded-full border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ผ่าน {progress.day0PassedCount}/{progress.totalCount}
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    ยังต้องจัดการ {progress.actionRequiredCount}
                  </span>
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                    จำเป็นขาด {progress.criticalMissingCount}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-stone-50 px-2 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-stone-900 dark:text-emerald-200">
                {isOpen ? "ยุบ" : "ขยาย"}
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            </button>

            <div id={panelId} hidden={!isOpen}>
            <ul className="divide-y divide-emerald-100 dark:divide-emerald-950">
              {categoryItems.map((item) => {
                const statusTone = STATUS_TONES[item.status];
                return (
                  <li key={item.id} className={`min-w-0 border-l-4 bg-white/90 px-4 py-3 transition-colors hover:bg-emerald-50/30 dark:bg-stone-950/90 dark:hover:bg-emerald-950/10 ${statusTone.accent}`}>
                    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words text-sm font-bold text-neutral-800 dark:text-neutral-200">{item.name}</p>
                          <button
                            type="button"
                            onClick={() => onUpdateItem(item.id, { isCritical: !item.isCritical })}
                            className={`min-h-7 shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${
                              item.isCritical
                                ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300"
                                : "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                            }`}
                          >
                            {item.isCritical ? "จำเป็น" : "ทางเลือก"}
                          </button>
                        </div>
                        <p className={`mt-1 break-words text-xs font-bold ${statusTone.feedback}`}>
                          {getPreparationChecklistFeedback(item.status)}
                        </p>
                        <div className="mt-2 inline-flex max-w-full flex-wrap items-baseline gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs dark:border-stone-800 dark:bg-stone-900">
                          <span className="font-semibold text-stone-500 dark:text-stone-400">จำนวนที่วางแผน</span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">{item.requiredQuantity === null ? "ไม่ระบุ" : item.requiredQuantity}</span>
                          <span className="text-stone-500 dark:text-stone-400">{item.unit}</span>
                        </div>
                      </div>

                      <label className="min-w-0 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        ขั้นตอนปัจจุบัน
                        <select
                          value={item.status}
                          onChange={(event) => onUpdateItem(item.id, { status: event.target.value as ChecklistStatus })}
                          className={`mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${statusTone.select}`}
                        >
                          {Object.entries(CHECKLIST_STATUS_LABELS).map(([status, label]) => (
                            <option key={status} value={status}>{label}</option>
                          ))}
                        </select>
                      </label>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button type="button" onClick={() => onEditItem(item)} className="flex min-h-11 items-center gap-1 rounded-xl border border-emerald-200 bg-stone-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-900/60 dark:bg-stone-900 dark:text-emerald-200 dark:hover:bg-emerald-950/30">
                          <Edit2 className="h-4 w-4" />
                          แก้ไข
                        </button>
                        {item.source === "user" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("ต้องการลบรายการนี้หรือไม่?")) onDeleteItem(item.id);
                            }}
                            className="flex min-h-11 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            </div>
          </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-8 text-center dark:border-emerald-900/60 dark:bg-emerald-950/10">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">ไม่มีรายการในมุมมองนี้</p>
          <button type="button" onClick={() => changeFilter("all")} className="mt-2 min-h-11 rounded-xl border border-emerald-200 bg-stone-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-900/60 dark:bg-stone-900 dark:text-emerald-200">
            ดูทั้งหมด
          </button>
        </div>
      )}
    </section>
  );
}
