"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2 } from "lucide-react";
import {
  assessInventoryItem,
  INVENTORY_CATEGORY_GROUPS,
  INVENTORY_STATUS_LABELS,
  summarizeInventoryReadiness,
} from "./inventory";
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
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

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
          if (next !== "") onCommit(Number(next));
        }}
        onBlur={() => {
          if (draft === "") setDraft(String(value));
        }}
        className="w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      />
    </label>
  );
}

export function InventorySection({ items, sectionStatus, onUpdateItem }: InventorySectionProps) {
  const summary = summarizeInventoryReadiness(items);

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
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Critical ready", `${summary.criticalReady} / ${summary.criticalTotal}`],
          ["ต้องซื้อ", String(summary.procureCount)],
          ["ต้องตรวจ", String(summary.checkCount)],
          ["Optional warning", String(summary.optionalWarningCount)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="break-words text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
            <p className="mt-1 text-lg font-black text-neutral-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {summary.blockers.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Critical blockers {summary.blockers.length} รายการ
          </div>
          <ul className="mt-2 space-y-1 text-xs text-rose-600 dark:text-rose-400">
            {summary.blockers.slice(0, 5).map((message) => <li key={message} className="break-words">• {message}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {INVENTORY_CATEGORY_GROUPS.map((group) => {
          const groupItems = items.filter((item) => group.categories.includes(item.category));
          if (groupItems.length === 0) return null;
          return (
            <details key={group.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              <summary className="cursor-pointer select-none bg-neutral-50 px-4 py-3 text-sm font-bold text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                {group.label} <span className="font-medium text-neutral-400">({groupItems.length})</span>
              </summary>
              <div className="grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 xl:grid-cols-2">
                {groupItems.map((item) => {
                  const assessment = assessInventoryItem(item);
                  return (
                    <article key={item.id} className="min-w-0 space-y-3 bg-white p-4 dark:bg-neutral-950">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-bold text-neutral-900 dark:text-white">{item.name}</h3>
                          <p className="mt-1 text-xs text-neutral-400">ต้องใช้ {item.requiredQuantity} {item.unit}</p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                          item.priority === "A"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                        }`}>
                          {item.priority === "A" ? "Critical" : "Optional"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <QuantityInput label="จำนวนที่มี" value={item.availableQuantity} onCommit={(value) => onUpdateItem(item.id, { availableQuantity: value })} />
                        <QuantityInput label="จำนวนที่ใช้ได้จริง" value={item.usableQuantity} onCommit={(value) => onUpdateItem(item.id, { usableQuantity: value })} />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="min-w-0 space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">สถานะ</span>
                          <select
                            value={item.status}
                            onChange={(event) => onUpdateItem(item.id, { status: event.target.value as InventoryStatus })}
                            className="w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                          >
                            {Object.entries(INVENTORY_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <label className="min-w-0 space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">วันที่ตรวจล่าสุด</span>
                          <input
                            type="date"
                            value={item.lastCheckedAt ?? ""}
                            onChange={(event) => onUpdateItem(item.id, { lastCheckedAt: event.target.value || null })}
                            className="w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                          />
                        </label>
                      </div>

                      <label className="block min-w-0 space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">หมายเหตุ</span>
                        <textarea
                          rows={2}
                          value={item.note}
                          onChange={(event) => onUpdateItem(item.id, { note: event.target.value })}
                          className="w-full min-w-0 resize-y rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                        />
                      </label>

                      <div className={`flex min-w-0 items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                        assessment.level === "blocked"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300"
                          : assessment.level === "warning"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                      }`}>
                        {assessment.level === "ready" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                        <span className="min-w-0 break-words">
                          {assessment.messages.length > 0
                            ? assessment.messages.join(" • ")
                            : `จำนวนที่ขาด: ${assessment.missingQuantity} ${item.unit}`}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
