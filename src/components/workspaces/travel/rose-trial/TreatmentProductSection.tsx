"use client";

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, FlaskConical } from "lucide-react";
import { evaluateTreatmentProductReadiness } from "./readiness";
import type {
  ReadinessSectionStatus,
  TreatmentProductPackaging,
  TreatmentProductRecord,
  TreatmentProductStatus,
} from "./types";

interface TreatmentProductSectionProps {
  product: TreatmentProductRecord;
  sectionStatus: ReadinessSectionStatus;
  onUpdate: (patch: Partial<TreatmentProductRecord>) => void;
}

const PRODUCT_STATUS_LABELS: Record<TreatmentProductStatus, string> = {
  not_selected: "ยังไม่ได้เลือก",
  selected: "เลือกแล้ว",
  ordered: "สั่งซื้อแล้ว",
  received: "ได้รับสินค้าแล้ว — รอตรวจ",
  ready_to_use: "ตรวจสินค้าแล้ว — พร้อมใช้",
};

const PACKAGING_LABELS: Record<TreatmentProductPackaging, string> = {
  original: "บรรจุภัณฑ์เดิม",
  repacked: "แบ่งบรรจุ",
  repacked_unknown: "แบ่งบรรจุ — รายละเอียดยังไม่ทราบ",
  unknown: "ไม่ทราบ",
};

const SECTION_STATUS_LABELS: Record<ReadinessSectionStatus, string> = {
  pending: "ยังไม่เริ่ม",
  blocked: "มีสิ่งที่ต้องแก้",
  warning: "ต้องตรวจ",
  ready: "พร้อม",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{children}</span>;
}

export function TreatmentProductSection({ product, sectionStatus, onUpdate }: TreatmentProductSectionProps) {
  const sectionPanelId = `${useId()}-treatment-product-panel`;
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const readiness = evaluateTreatmentProductReadiness(product);
  const isRepacked = product.packagingType === "repacked" || product.packagingType === "repacked_unknown";
  const inputClass = "w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200";
  const hasRecordedProduct = product.status !== "not_selected" && Boolean(product.productName.trim());
  const summary = hasRecordedProduct
    ? `บันทึกแล้ว • ${product.productName.trim()} • ${SECTION_STATUS_LABELS[readiness.status]}`
    : "ยังไม่ได้บันทึกผลิตภัณฑ์";

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-white dark:border-emerald-900/60 dark:bg-neutral-950" aria-labelledby="treatment-product-heading">
      <button
        type="button"
        aria-expanded={isSectionOpen}
        aria-controls={sectionPanelId}
        onClick={() => setIsSectionOpen((current) => !current)}
        className="flex min-h-11 w-full min-w-0 items-start justify-between gap-3 bg-emerald-50/70 px-4 py-3 text-left hover:bg-emerald-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35"
      >
        <span className="flex min-w-0 items-start gap-2">
          <FlaskConical className="mt-0.5 h-5 w-5 flex-shrink-0 text-fuchsia-500" />
          <span className="min-w-0">
            <span id="treatment-product-heading" className="block break-words text-base font-bold text-neutral-900 dark:text-white">
              บันทึกผลิตภัณฑ์ Treatment (Treatment Product Record)
            </span>
            <span className="mt-1 block break-words text-xs font-semibold text-neutral-600 dark:text-neutral-300">{summary}</span>
          </span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-2">
          <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${
            sectionStatus === "ready"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : sectionStatus === "blocked"
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          }`}>
            {SECTION_STATUS_LABELS[sectionStatus]}
          </span>
          <ChevronDown className={`mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-300 ${isSectionOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      <div id={sectionPanelId} hidden={!isSectionOpen} className="min-w-0 border-t border-emerald-100 p-4 dark:border-emerald-950/60">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="space-y-4 border-b border-neutral-200 bg-gradient-to-r from-fuchsia-50 to-rose-50 p-4 dark:border-neutral-800 dark:from-fuchsia-950/20 dark:to-rose-950/20 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-500">Selected Treatment</p>
              <p className="mt-1 break-words text-lg font-black text-neutral-900 dark:text-white">Clonex Rooting Gel</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">ใช้กับกลุ่ม W-T1 และ P-T1 เท่านั้น</p>
            </div>
            <label className="min-w-0 sm:w-64">
              <FieldLabel>สถานะผลิตภัณฑ์</FieldLabel>
              <select
                value={product.status}
                onChange={(event) => onUpdate({ status: event.target.value as TreatmentProductStatus })}
                className={`${inputClass} mt-1`}
              >
                {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              ["Product role", product.productType],
              ["Active ingredient", product.activeIngredient],
              ["Form", product.form],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-white/70 bg-white/70 p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
                <p className="mt-1 break-words text-sm font-bold text-neutral-800 dark:text-neutral-200">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-4 md:p-5">
          {(readiness.blockers.length > 0 || readiness.warnings.length > 0) && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {readiness.blockers.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                  <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Blocker</p>
                  <ul className="mt-2 space-y-1">{readiness.blockers.map((message) => <li key={message} className="break-words">• {message}</li>)}</ul>
                </div>
              )}
              {readiness.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                  <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Warning</p>
                  <ul className="mt-2 space-y-1">{readiness.warnings.map((message) => <li key={message} className="break-words">• {message}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {readiness.status === "ready" && (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> ข้อมูลผลิตภัณฑ์พร้อมตามเงื่อนไข Pilot
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="min-w-0 space-y-1">
              <FieldLabel>ชื่อสินค้าที่ได้รับ *</FieldLabel>
              <input value={product.productName} onChange={(event) => onUpdate({ productName: event.target.value })} className={inputClass} />
            </label>
            <label className="min-w-0 space-y-1">
              <FieldLabel>แบรนด์</FieldLabel>
              <input value={product.brand} onChange={(event) => onUpdate({ brand: event.target.value })} className={inputClass} />
            </label>
            <label className="min-w-0 space-y-1">
              <FieldLabel>ผู้ขาย</FieldLabel>
              <input value={product.seller} onChange={(event) => onUpdate({ seller: event.target.value })} className={inputClass} />
            </label>
            <label className="min-w-0 space-y-1">
              <FieldLabel>Product URL (ไม่บังคับ)</FieldLabel>
              <input type="url" value={product.productUrl} onChange={(event) => onUpdate({ productUrl: event.target.value })} className={inputClass} />
            </label>
            <label className="min-w-0 space-y-1">
              <FieldLabel>ขนาดที่ซื้อ</FieldLabel>
              <input value={product.purchasedSize} onChange={(event) => onUpdate({ purchasedSize: event.target.value })} className={inputClass} />
            </label>
            <label className="min-w-0 space-y-1">
              <FieldLabel>ราคา</FieldLabel>
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.purchasePrice ?? ""}
                onChange={(event) => {
                  if (event.target.value === "") return onUpdate({ purchasePrice: null });
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value >= 0) onUpdate({ purchasePrice: value });
                }}
                className={inputClass}
              />
            </label>
            <label className="min-w-0 space-y-1">
              <FieldLabel>ประเภทบรรจุภัณฑ์</FieldLabel>
              <select value={product.packagingType} onChange={(event) => onUpdate({ packagingType: event.target.value as TreatmentProductPackaging })} className={inputClass}>
                {Object.entries(PACKAGING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          {isRepacked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              Pilot นี้ทดสอบผลิตภัณฑ์ในสภาพที่ผู้ใช้ซื้อได้จริง ผลจึงสะท้อนสินค้าที่ได้รับจากผู้ขาย รวมถึงการแบ่งบรรจุและการเก็บรักษาก่อนถึงผู้ใช้
            </div>
          )}

          <details className="rounded-xl border border-neutral-200 dark:border-neutral-800" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">วันที่และสภาพผลิตภัณฑ์</summary>
            <div className="grid grid-cols-1 gap-4 border-t border-neutral-200 p-4 dark:border-neutral-800 md:grid-cols-2">
              {([
                ["วันที่ซื้อ", "purchaseDate"],
                ["วันที่ได้รับ", "receivedDate"],
                ["วันที่เปิดใช้", "openedDate"],
              ] as const).map(([label, field]) => (
                <label key={field} className="min-w-0 space-y-1">
                  <FieldLabel>{label}</FieldLabel>
                  <input type="date" value={product[field]} onChange={(event) => onUpdate({ [field]: event.target.value })} className={inputClass} />
                </label>
              ))}
              <label className="min-w-0 space-y-1 md:col-span-2">
                <FieldLabel>วันหมดอายุหรือหมายเหตุวันหมดอายุ</FieldLabel>
                <input value={product.expiryNote} onChange={(event) => onUpdate({ expiryNote: event.target.value })} className={inputClass} />
              </label>
              <label className="min-w-0 space-y-1 md:col-span-2">
                <FieldLabel>สี / ความสม่ำเสมอของเจล / กลิ่นหรือข้อสังเกต</FieldLabel>
                <textarea rows={2} value={product.appearanceNote} onChange={(event) => onUpdate({ appearanceNote: event.target.value })} className={inputClass} />
              </label>
              <label className="min-w-0 space-y-1 md:col-span-2">
                <FieldLabel>วิธีเก็บรักษา</FieldLabel>
                <textarea rows={2} value={product.storageNote} onChange={(event) => onUpdate({ storageNote: event.target.value })} className={inputClass} />
              </label>
            </div>
          </details>

          <details className="rounded-xl border border-neutral-200 dark:border-neutral-800">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">วิธีใช้และข้อจำกัด</summary>
            <div className="space-y-4 border-t border-neutral-200 p-4 dark:border-neutral-800">
              <label className="block min-w-0 space-y-1">
                <FieldLabel>วิธีใช้ตามฉลากหรือผู้ขาย</FieldLabel>
                <textarea rows={2} value={product.applicationMethod} onChange={(event) => onUpdate({ applicationMethod: event.target.value })} className={inputClass} />
              </label>
              <label className="block min-w-0 space-y-1">
                <FieldLabel>ข้อจำกัดและหมายเหตุของสินค้า</FieldLabel>
                <textarea rows={3} value={product.limitationNote} onChange={(event) => onUpdate({ limitationNote: event.target.value })} className={inputClass} />
              </label>
            </div>
          </details>

          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 text-sm text-neutral-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/10 dark:text-neutral-300">
            <p className="font-bold text-fuchsia-700 dark:text-fuchsia-300">สรุปการใช้ใน Pilot</p>
            <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div><dt className="inline font-semibold">กลุ่มที่ใช้: </dt><dd className="inline">W-T1 และ P-T1</dd></div>
              <div><dt className="inline font-semibold">วิธีใช้: </dt><dd className="inline">ใช้บริเวณโคนกิ่งก่อนชำ</dd></div>
              <div><dt className="inline font-semibold">ความถี่: </dt><dd className="inline">1 ครั้งใน Day 0</dd></div>
              <div><dt className="inline font-semibold">การเติมซ้ำ: </dt><dd className="inline">ไม่ใช้</dd></div>
              <div className="sm:col-span-2"><dt className="inline font-semibold">การเติมลง medium: </dt><dd className="inline">ไม่เติมลงน้ำและไม่ผสมลงพีทมอส</dd></div>
            </dl>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
