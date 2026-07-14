"use client";

// GF-APP-075 — Rose Trial Lab Client Component
// Stage 2B: Form State + localStorage persistence

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Flower2,
  Layers,
  CheckSquare,
  FlaskConical,
  ShieldAlert,
  Save,
  FileText,
  Play,
  Tag,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  RotateCcw,
  Edit2,
  Check,
} from "lucide-react";

import type {
  RoseTrialStateV2,
  PilotOverview,
  BatchSetup,
  PreparationChecklistItem,
  Treatment,
  ChecklistStatus,
  ChecklistCategory,
  InventoryItem,
  TreatmentProductRecord,
} from "./types";
import {
  createDefaultRoseTrialState,
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_CATEGORY_LABELS,
} from "./defaults";
import {
  loadRoseTrialState,
  saveRoseTrialState,
  clearRoseTrialState,
} from "./storage";
import { calculateReadiness, parseIntegerInput } from "./readiness";
import { mergeInventoryWithDefaults, updateInventoryItems } from "./inventory";
import { InventorySection } from "./InventorySection";
import { TreatmentProductSection } from "./TreatmentProductSection";
import { SamplePreparationSection } from "./SamplePreparationSection";
import {
  updateTrialSamples,
  type SamplePreparationPatch,
} from "./samplePreparation";
import { generateRoseTrialMarkdown } from "./exportMarkdown";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

import { loadRoseDay0State } from "./day-0/storage";
import type { RoseDay0State } from "./day-0/types";
import {
  buildTrialModeSummariesSafely,
  buildRoseTrialComparisonReport,
} from "../../../../lib/rose-trial-domain/summaries";
import {
  mapRoseDay0SnapshotToSnapshotRecord,
  mapRoseDay0ToActualRecord,
  mapRosePreparationToPlannedRecord,
} from "../../../../lib/rose-trial-domain/adapters";
import type { ActualLoadState } from "../../../../lib/rose-trial-domain/types";
import { TrialModeSummary } from "./TrialModeSummary";
import { TrialComparisonPanel } from "./TrialComparisonPanel";

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RoseTrialLabClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<RoseTrialStateV2>(() => createDefaultRoseTrialState());
  const [isDirty, setIsDirty] = useState(false);
  const [day0State, setDay0State] = useState<RoseDay0State | null>(null);
  const [day0Corrupt, setDay0Corrupt] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // Dialog/Modal states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [day0DialogOpen, setDay0DialogOpen] = useState(false);
  const [exportMarkdownOpen, setExportMarkdownOpen] = useState(false);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [exportedMarkdown, setExportedMarkdown] = useState("");
  const [checklistFilter, setChecklistFilter] = useState<"all" | "pending" | "ready">("all");

  // Checklist modals
  const [addChecklistItemOpen, setAddChecklistItemOpen] = useState(false);
  const [editChecklistItemOpen, setEditChecklistItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PreparationChecklistItem | null>(null);

  // New Checklist Item Form State
  const [newChecklistItem, setNewChecklistItem] = useState<{
    name: string;
    category: ChecklistCategory;
    isCritical: boolean;
    requiredQuantity: number | "";
    unit: string;
    status: ChecklistStatus;
    notes: string;
  }>({
    name: "",
    category: "equipment",
    isCritical: true,
    requiredQuantity: "",
    unit: "ชิ้น",
    status: "to_buy",
    notes: "",
  });

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const loaded = loadRoseTrialState();
    setState({
      ...loaded.state,
      inventory: mergeInventoryWithDefaults(loaded.state.inventory),
    });

    // Load Day 0 state read-only safely
    try {
      const day0Result = loadRoseDay0State();
      if (day0Result.isCorrupt) {
        setDay0Corrupt(true);
      } else {
        setDay0State(day0Result.state);
      }
    } catch (err) {
      console.error("Failed to load Day 0 state read-only:", err);
      setDay0Corrupt(true);
    }
  }, []);

  // Format date helper for Thai localization
  const formatThaiDate = (isoString: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // State update handlers
  const updatePilot = (fields: Partial<PilotOverview>) => {
    setState((prev) => ({
      ...prev,
      pilot: { ...prev.pilot, ...fields },
    }));
    setIsDirty(true);
  };

  const updateBatch = (fields: Partial<BatchSetup>) => {
    setState((prev) => ({
      ...prev,
      batch: { ...prev.batch, ...fields },
    }));
    setIsDirty(true);
  };

  const updateChecklistItem = (itemId: string, fields: Partial<PreparationChecklistItem>) => {
    setState((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) =>
        item.id === itemId ? { ...item, ...fields } : item
      ),
    }));
    setIsDirty(true);
  };

  const updateInventoryItem = (itemId: string, fields: Partial<InventoryItem>) => {
    setState((prev) => ({
      ...prev,
      inventory: updateInventoryItems(prev.inventory, itemId, fields),
    }));
    setIsDirty(true);
  };

  const updateTreatmentProduct = (fields: Partial<TreatmentProductRecord>) => {
    setState((prev) => ({
      ...prev,
      treatmentProduct: { ...prev.treatmentProduct, ...fields },
    }));
    setIsDirty(true);
  };

  const updateSample = (sampleId: string, patch: SamplePreparationPatch) => {
    setState((prev) => ({
      ...prev,
      samples: updateTrialSamples(prev.samples, sampleId, patch),
    }));
    setIsDirty(true);
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.name.trim()) return;

    const item: PreparationChecklistItem = {
      id: `user-item-${crypto.randomUUID()}`,
      name: newChecklistItem.name,
      category: newChecklistItem.category,
      isCritical: newChecklistItem.isCritical,
      requiredQuantity: newChecklistItem.requiredQuantity === "" ? null : Number(newChecklistItem.requiredQuantity),
      unit: newChecklistItem.unit || "ชิ้น",
      status: newChecklistItem.status,
      notes: newChecklistItem.notes,
      source: "user",
    };

    setState((prev) => ({
      ...prev,
      checklistItems: [...prev.checklistItems, item],
    }));
    setIsDirty(true);
    setAddChecklistItemOpen(false);

    // Reset Form
    setNewChecklistItem({
      name: "",
      category: "equipment",
      isCritical: true,
      requiredQuantity: "",
      unit: "ชิ้น",
      status: "to_buy",
      notes: "",
    });

    setToastType("success");
    setToastMessage("เพิ่มรายการใหม่แล้ว (บันทึกร่าง)");
    setToastVisible(true);
  };

  const deleteChecklistItem = (itemId: string) => {
    setState((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((item) => item.id !== itemId),
    }));
    setIsDirty(true);
    setToastType("success");
    setToastMessage("ลบรายการเรียบร้อยแล้ว");
    setToastVisible(true);
  };

  const updateTreatment = (treatmentId: string, fields: Partial<Treatment>) => {
    setState((prev) => ({
      ...prev,
      treatments: prev.treatments.map((t) =>
        t.id === treatmentId ? { ...t, ...fields } : t
      ),
    }));
    setIsDirty(true);
  };

  const addTreatment = () => {
    const codeNumber = state.treatments.length;
    const newT: Treatment = {
      id: `treatment-${crypto.randomUUID()}`,
      code: `T${codeNumber}`,
      name: `Treatment ${codeNumber}`,
      description: "",
      cuttingCount: 0,
      inputName: "",
      notes: "",
      source: "user",
    };

    setState((prev) => ({
      ...prev,
      treatments: [...prev.treatments, newT],
    }));
    setIsDirty(true);
    setToastType("success");
    setToastMessage("เพิ่มกลุ่มทดลองใหม่เรียบร้อย");
    setToastVisible(true);
  };

  const deleteTreatment = (treatmentId: string) => {
    const target = state.treatments.find((t) => t.id === treatmentId);
    if (!target || target.source === "default") {
      setToastType("error");
      setToastMessage("ไม่สามารถลบกลุ่มทดลองเริ่มต้นได้");
      setToastVisible(true);
      return;
    }

    setState((prev) => ({
      ...prev,
      treatments: prev.treatments.filter((t) => t.id !== treatmentId),
    }));
    setIsDirty(true);
    setToastType("success");
    setToastMessage("ลบกลุ่มทดลองแล้ว");
    setToastVisible(true);
  };

  // Main Action Handlers
  const handleSave = () => {
    const success = saveRoseTrialState(state);
    if (success) {
      setIsDirty(false);
      // Reload from storage to get updated timestamp
      const loaded = loadRoseTrialState();
      setState(loaded.state);
      setToastType("success");
      setToastMessage("บันทึกข้อมูลการเตรียมแล้ว");
    } else {
      setToastType("error");
      setToastMessage("ไม่สามารถบันทึกข้อมูลในเครื่องได้");
    }
    setToastVisible(true);
  };

  const handleReset = () => {
    const success = clearRoseTrialState();
    if (!success) {
      setResetDialogOpen(false);
      setToastType("error");
      setToastMessage("ไม่สามารถล้างข้อมูลในเครื่องได้ ข้อมูลเดิมยังคงอยู่");
      setToastVisible(true);
      return;
    }

    setState(createDefaultRoseTrialState());
    setIsDirty(false);
    setResetDialogOpen(false);
    setToastType("success");
    setToastMessage("รีเซ็ตข้อมูลเป็นค่าเริ่มต้นแล้ว");
    setToastVisible(true);
  };

  const handleDay0Confirm = () => {
    setDay0DialogOpen(false);
    saveRoseTrialState(state);
    setIsDirty(false);
    router.push("/workspaces/travel/rose-trial/day-0");
  };

  const handleExportMarkdown = () => {
    const snapshotAt = new Date().toISOString();
    const currentReadiness = calculateReadiness(state);
    setExportedAt(snapshotAt);
    setExportedMarkdown(generateRoseTrialMarkdown(state, currentReadiness, snapshotAt, { isDirty }));
    setExportMarkdownOpen(true);
  };

  const handleCopyMarkdown = async () => {
    if (!navigator.clipboard?.writeText) {
      setToastType("error");
      setToastMessage("ไม่สามารถคัดลอก Markdown ได้ กรุณาเลือกและคัดลอกจากช่องข้อความ");
      setToastVisible(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(exportedMarkdown);
      setToastType("success");
      setToastMessage("คัดลอก Markdown แล้ว");
    } catch {
      setToastType("error");
      setToastMessage("ไม่สามารถคัดลอก Markdown ได้ กรุณาเลือกและคัดลอกจากช่องข้อความ");
    }
    setToastVisible(true);
  };

  const readiness = calculateReadiness(state);

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm font-semibold text-neutral-400">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // Filter checklist items
  const filteredChecklistItems = state.checklistItems.filter((item) => {
    if (checklistFilter === "pending") {
      return item.status !== "ready" && item.status !== "not_needed";
    }
    if (checklistFilter === "ready") {
      return item.status === "ready" || item.status === "not_needed";
    }
    return true;
  });

  // Map read-only summaries behind a failure boundary; storage is never mutated here.
  const trialSummaries = buildTrialModeSummariesSafely(state, day0State, day0Corrupt);

  // Compute three-way comparison report safely at runtime
  let comparisonReport;
  try {
    const currentPlan = mapRosePreparationToPlannedRecord(state);
    const snapshotPlan = day0State ? mapRoseDay0SnapshotToSnapshotRecord(day0State.trialSnapshot) : null;
    const actual = day0State ? mapRoseDay0ToActualRecord(day0State) : null;
    const actualLoadState: ActualLoadState = day0Corrupt
      ? "corrupt"
      : day0State
        ? "valid"
        : "not_found";

    comparisonReport = buildRoseTrialComparisonReport({
      currentPlan,
      snapshotPlan,
      actual,
      actualLoadState,
    });
  } catch (err) {
    console.error("Failed to build comparison report:", err);
    comparisonReport = {
      overallStatus: "corrupt" as const,
      summaryText: "ข้อมูล Day 0 บางส่วนไม่สามารถอ่านได้",
      items: [],
      planChangeCount: 0,
      actualDeviationCount: 0,
      dataIssueCount: 0,
    };
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 py-6 md:px-6 md:py-8 xl:px-8 space-y-6 pb-24">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-100 dark:border-rose-900/40 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
              <Flower2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider truncate">
                GF-APP-075 — Nutrient Planner App
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-neutral-900 dark:text-white leading-snug break-words">
                {state.pilot.trialName || "ไม่ได้ระบุชื่อการทดลอง"}
              </h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 self-start">
            <span className="rounded-full bg-amber-100 dark:bg-amber-950/50 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              วางแผน
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">
                {isDirty ? "ยังไม่ได้บันทึก" : "บันทึกแล้ว"}
              </span>
            </div>
          </div>
        </div>
        {state.updatedAt && (
          <p className="mt-4 text-xs text-neutral-400">
            บันทึกล่าสุด: {formatThaiDate(state.updatedAt)}
          </p>
        )}
      </div>

      {/* Trial Mode Summary Cards */}
      <TrialModeSummary summaries={trialSummaries} />

      {/* Three-Way Comparison Panel */}
      <TrialComparisonPanel report={comparisonReport} />

      {/* ─── Section A: Pilot Overview ───────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="pilot-overview-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-rose-500" />
            <h2 id="pilot-overview-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              ก. ข้อมูลภาพรวมการทดลอง (Pilot Overview)
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Section A</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5">
          {/* Trial Name */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              ชื่อการทดลอง <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={state.pilot.trialName}
              onChange={(e) => updatePilot({ trialName: e.target.value })}
              className={`w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border ${
                !state.pilot.trialName.trim()
                  ? "border-rose-300 dark:border-rose-900/60 focus:ring-rose-500"
                  : "border-neutral-200 dark:border-neutral-800 focus:ring-rose-500"
              } rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2`}
              placeholder="เช่น Rose Rooting Trial #1"
            />
            {!state.pilot.trialName.trim() && (
              <p className="text-xs text-rose-500">กรุณาระบุชื่อการทดลอง</p>
            )}
          </div>

          {/* Crop Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              พืชที่ทดลอง
            </label>
            <input
              type="text"
              disabled
              value="กุหลาบ (Rose)"
              className="w-full px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
            />
          </div>

          {/* Expected Start Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              วันที่คาดว่าจะเริ่ม
            </label>
            <input
              type="date"
              value={state.pilot.expectedStartDate}
              onChange={(e) => updatePilot({ expectedStartDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              สถานที่ทดลอง
            </label>
            <input
              type="text"
              value={state.pilot.location}
              onChange={(e) => updatePilot({ location: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น โรงเรือนพัชรา หรือห้องแล็บ 2"
            />
          </div>

          {/* Project Code */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              รหัสโปรเจกต์
            </label>
            <input
              type="text"
              disabled
              value="GF-APP-075"
              className="w-full px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
            />
          </div>

          {/* Goal */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              เป้าหมายการทดลอง <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={state.pilot.goal}
              onChange={(e) => updatePilot({ goal: e.target.value })}
              className={`w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border ${
                !state.pilot.goal.trim()
                  ? "border-rose-300 dark:border-rose-900/60 focus:ring-rose-500"
                  : "border-neutral-200 dark:border-neutral-800 focus:ring-rose-500"
              } rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2`}
              placeholder="เป้าหมายเพื่อตรวจประเมิน..."
            />
            {!state.pilot.goal.trim() && (
              <p className="text-xs text-rose-500">กรุณาระบุเป้าหมายการทดลอง</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              หมายเหตุภาพรวม
            </label>
            <textarea
              rows={2}
              value={state.pilot.notes}
              onChange={(e) => updatePilot({ notes: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="บันทึกรายละเอียดเพิ่มเติม..."
            />
          </div>
        </div>
      </section>

      {/* ─── Section B: Batch Setup ──────────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="batch-setup-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-500" />
            <h2 id="batch-setup-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              ข. ตั้งค่า Batch (Batch Setup)
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Section B</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5">
          {/* Batch Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              ชื่อ Batch <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={state.batch.batchName}
              onChange={(e) => updateBatch({ batchName: e.target.value })}
              className={`w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border ${
                !state.batch.batchName.trim()
                  ? "border-rose-300 dark:border-rose-900/60 focus:ring-rose-500"
                  : "border-neutral-200 dark:border-neutral-800 focus:ring-rose-500"
              } rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2`}
              placeholder="เช่น Batch-Rose-A"
            />
            {!state.batch.batchName.trim() && (
              <p className="text-xs text-rose-500">กรุณาระบุชื่อ Batch</p>
            )}
          </div>

          {/* Total Cuttings */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              จำนวนกิ่งปักชำทั้งหมด <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={state.batch.totalCuttings || ""}
              onChange={(e) => {
                const val = parseIntegerInput(e.target.value, 0);
                if (val === null) return;
                updateBatch({ totalCuttings: val });
              }}
              className={`w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border ${
                (state.batch.totalCuttings || 0) <= 0
                  ? "border-rose-300 dark:border-rose-900/60 focus:ring-rose-500"
                  : "border-neutral-200 dark:border-neutral-800 focus:ring-rose-500"
              } rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2`}
              placeholder="จำนวนกิ่งปักชำทั้งหมด"
            />
            {(state.batch.totalCuttings || 0) <= 0 && (
              <p className="text-xs text-rose-500">จำนวนกิ่งปักชำต้องมากกว่า 0</p>
            )}
          </div>

          {/* Planned Start Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              วันที่เริ่มวางแผน
            </label>
            <input
              type="date"
              value={state.batch.plannedStartDate}
              onChange={(e) => updateBatch({ plannedStartDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
            />
          </div>

          {/* Display computed Treatment Count */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              จำนวนกลุ่มทดลอง (คำนวณ)
            </label>
            <input
              type="text"
              disabled
              value={`${state.treatments.length} กลุ่ม`}
              className="w-full px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              หมายเหตุ Batch
            </label>
            <textarea
              rows={2}
              value={state.batch.notes}
              onChange={(e) => updateBatch({ notes: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="บันทึกรายละเอียด Batch..."
            />
          </div>
        </div>
      </section>

      <InventorySection
        items={state.inventory}
        sectionStatus={readiness.sections.inventory}
        onUpdateItem={updateInventoryItem}
      />

      <TreatmentProductSection
        product={state.treatmentProduct}
        sectionStatus={readiness.sections.treatmentProduct}
        onUpdate={updateTreatmentProduct}
      />

      <SamplePreparationSection
        groupConfig={state.groupConfig}
        samples={state.samples}
        sectionStatus={readiness.sections.samples}
        onUpdateSample={updateSample}
      />

      {/* ─── Section C: Preparation Checklist ─────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="checklist-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-teal-500" />
            <h2 id="checklist-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              ค. รายการเตรียมอุปกรณ์และวัสดุ
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddChecklistItemOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มรายการ
            </button>
            <span className="text-xs text-neutral-400">Section C</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 max-w-sm">
          <button
            onClick={() => setChecklistFilter("all")}
            className={`flex-1 text-center py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all ${
              checklistFilter === "all"
                ? "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            ทั้งหมด ({state.checklistItems.length})
          </button>
          <button
            onClick={() => setChecklistFilter("pending")}
            className={`flex-1 text-center py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all ${
              checklistFilter === "pending"
                ? "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            ยังไม่พร้อม ({state.checklistItems.filter((i) => i.status !== "ready" && i.status !== "not_needed").length})
          </button>
          <button
            onClick={() => setChecklistFilter("ready")}
            className={`flex-1 text-center py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all ${
              checklistFilter === "ready"
                ? "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            พร้อมแล้ว ({state.checklistItems.filter((i) => i.status === "ready" || i.status === "not_needed").length})
          </button>
        </div>

        {/* Grouped Checklist */}
        <div className="space-y-4">
          {(Object.entries(CHECKLIST_CATEGORY_LABELS) as [ChecklistCategory, string][]).map(([catKey, catLabel]) => {
            const catItems = filteredChecklistItems.filter((item) => item.category === catKey);
            if (catItems.length === 0) return null;

            const categoryTotalReady = catItems.filter(
              (i) => i.status === "ready" || i.status === "not_needed"
            ).length;

            return (
              <div
                key={catKey}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Tag className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 break-words">
                      {catLabel}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-neutral-400 flex-shrink-0">
                    พร้อม: {categoryTotalReady} / {catItems.length}
                  </span>
                </div>

                {/* Category Items */}
                <ul className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 divide-y-0 divide-x-0">
                  {catItems.map((item) => {
                    const isItemReady = item.status === "ready" || item.status === "not_needed";
                    return (
                      <li
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-white dark:bg-neutral-950 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors odd:last:lg:col-span-2"
                      >
                        {/* Name & Critical */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                updateChecklistItem(item.id, { isCritical: !item.isCritical });
                              }}
                              title={item.isCritical ? "เปลี่ยนเป็นไม่จำเป็นต่อ Day 0" : "ทำเครื่องหมายเป็นอุปกรณ์จำเป็นต่อ Day 0"}
                              className={`mt-0.5 flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase px-2 py-0.5 rounded border transition-colors ${
                                item.isCritical
                                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-900/30"
                                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                              }`}
                            >
                              {item.isCritical ? "จำเป็น" : "เลือกได้"}
                            </button>
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug break-words">
                              {item.name}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                            {item.requiredQuantity !== null && (
                              <span className="font-semibold bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded">
                                จำนวน: {item.requiredQuantity} {item.unit}
                              </span>
                            )}
                            {item.notes && <span className="break-words max-w-full">| {item.notes}</span>}
                          </div>
                        </div>

                        {/* Status Select & Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Status Picker */}
                          <select
                            value={item.status}
                            onChange={(e) =>
                              updateChecklistItem(item.id, {
                                status: e.target.value as ChecklistStatus,
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                              isItemReady
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                                : "bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800"
                            } focus:outline-none focus:ring-1 focus:ring-rose-500`}
                          >
                            {Object.entries(CHECKLIST_STATUS_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>

                          {/* Edit Item Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setEditChecklistItemOpen(true);
                            }}
                            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="แก้ไขรายละเอียด"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Item Button (User-created only) */}
                          {item.source === "user" ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("ต้องการลบรายการนี้หรือไม่?")) {
                                  deleteChecklistItem(item.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title="ลบรายการ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <div className="w-8 h-8 flex-shrink-0" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section D: Treatment Setup ──────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="treatments-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-500" />
            <h2 id="treatments-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              ง. กำหนด Treatment
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addTreatment}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มกลุ่มทดลอง
            </button>
            <span className="text-xs text-neutral-400">Section D</span>
          </div>
        </div>

        {/* Cuttings Sum Check Banner */}
        {readiness.cuttingDifference !== 0 && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
            <div className="flex-1 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">ตรวจสอบจำนวนกิ่งปักชำ: </span>
              จำนวนรวมใน Batch คือ {readiness.totalCuttings} กิ่ง จัดกลุ่มลง Treatment แล้ว{" "}
              {readiness.assignedCuttings} กิ่ง (
              {readiness.cuttingDifference > 0
                ? `ขาดอีก ${readiness.cuttingDifference} กิ่ง`
                : `เกินไป ${Math.abs(readiness.cuttingDifference)} กิ่ง`}
              )
            </div>
          </div>
        )}

        {/* Treatment Cards list */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {state.treatments.map((t) => {
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-900 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs">
                      {t.code}
                    </span>
                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                      {t.source === "default" ? `กลุ่มเริ่มต้น: ${t.code}` : `กลุ่มทดลองสร้างเอง: ${t.code}`}
                    </span>
                  </div>
                  {t.source === "user" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("ต้องการลบกลุ่มทดลองนี้หรือไม่?")) {
                          deleteTreatment(t.id);
                        }
                      }}
                      className="text-xs font-semibold flex items-center gap-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2.5 py-1 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      ลบกลุ่ม
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Code */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                      รหัสกลุ่ม (Treatment Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={t.code}
                      onChange={(e) => updateTreatment(t.id, { code: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                      placeholder="เช่น T2"
                    />
                  </div>

                  {/* Cutting Count */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                      จำนวนกิ่งที่ทดสอบ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={t.cuttingCount || ""}
                      onChange={(e) => {
                        const val = parseIntegerInput(e.target.value, 0);
                        if (val === null) return;
                        updateTreatment(t.id, { cuttingCount: val });
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                      placeholder="จำนวนกิ่ง"
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                      ชื่อกลุ่มตัวอย่าง <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => updateTreatment(t.id, { name: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                      placeholder="เช่น ชุดเร่งรากเข้มข้นสูง"
                    />
                  </div>

                  {/* Input Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                      สารที่ใช้ทดสอบ
                    </label>
                    <input
                      type="text"
                      value={t.inputName}
                      onChange={(e) => updateTreatment(t.id, { inputName: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                      placeholder="เช่น IBA 3000 ppm"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                    คำอธิบายกลุ่มทดลอง
                  </label>
                  <textarea
                    rows={2}
                    value={t.description}
                    onChange={(e) => updateTreatment(t.id, { description: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                    placeholder="รายละเอียดขั้นตอนการทำ..."
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                    หมายเหตุเฉพาะกลุ่ม
                  </label>
                  <textarea
                    rows={1}
                    value={t.notes}
                    onChange={(e) => updateTreatment(t.id, { notes: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                    placeholder="บันทึกข้อความเฉพาะกลุ่ม..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section E: Readiness Summary ─────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="readiness-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <h2 id="readiness-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              จ. ประเมินความพร้อมก่อนเริ่ม Day 0
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Section E</span>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
          {/* Readiness Level Banner */}
          {readiness.status === "not_ready" ? (
            <div className="flex items-start gap-3.5 px-4 py-4 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/30">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400 leading-snug">
                  ยังไม่พร้อม (Not Ready)
                </p>
                <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80 leading-relaxed font-semibold">
                  มีข้อมูลสำคัญหรืออุปกรณ์จำเป็นที่ยังไม่เรียบร้อย กรุณาตรวจสอบตามสาเหตุหลักด้านล่างเพื่อเริ่มการทดลอง
                </p>
              </div>
            </div>
          ) : readiness.status === "partially_ready" ? (
            <div className="flex items-start gap-3.5 px-4 py-4 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30">
              <Info className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 leading-snug">
                  พร้อมบางส่วน (Partially Ready)
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400/80 leading-relaxed font-semibold">
                  ไม่มี blocker ที่ขัดขวางการเริ่ม Day 0 แต่ยังมีรายการที่ควรตรวจทบทวนก่อนดำเนินการ
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3.5 px-4 py-4 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/30">
              <Check className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 leading-snug">
                  พร้อมเริ่ม Day 0 (Ready for Day 0)
                </p>
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/80 leading-relaxed font-semibold">
                  ข้อมูลการปักชำ กลุ่มทดลอง และรายการเตรียมพร้อมเรียบร้อย 100% สามารถเริ่มต้นบันทึก Day 0 ได้เลย
                </p>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 divide-y divide-neutral-100 dark:divide-neutral-800 sm:grid-cols-2 md:grid-cols-4 sm:divide-y-0 md:divide-x border-b border-neutral-100 dark:border-neutral-900">
            <div className="flex flex-col items-center px-4 py-4 text-center">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                {readiness.totalItems > 0
                  ? Math.round((readiness.readyItems / readiness.totalItems) * 100)
                  : 0}
                %
              </span>
              <span className="mt-0.5 text-xs text-neutral-400">สัดส่วนพร้อมใช้</span>
            </div>
            <div className="flex flex-col items-center px-4 py-4 text-center">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                {readiness.readyItems}/{readiness.totalItems}
              </span>
              <span className="mt-0.5 text-xs text-neutral-400">รายการพร้อม</span>
            </div>
            <div className="flex flex-col items-center px-4 py-4 text-center">
              <span
                className={`text-2xl font-bold ${
                  readiness.criticalMissingItems.length > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {readiness.criticalMissingItems.length}
              </span>
              <span className="mt-0.5 text-xs text-neutral-400">ขาดรายการจำเป็น</span>
            </div>
            <div className="flex flex-col items-center px-4 py-4 text-center">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                {readiness.cuttingDifference === 0 ? "ครบ" : `${readiness.assignedCuttings}/${readiness.totalCuttings}`}
              </span>
              <span className="mt-0.5 text-xs text-neutral-400">ยอดกิ่งปักชำ</span>
            </div>
          </div>

          {/* Reasons box */}
          {readiness.reasons.length > 0 && (
            <div className="p-4 bg-neutral-50/50 dark:bg-neutral-900/30">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
                สาเหตุที่ขัดขวางการเริ่ม Day 0:
              </p>
              <ul className="space-y-1">
                {readiness.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ─── Actions Buttons Toolbar ─────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="การดำเนินการหลัก">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center w-full">
            {/* Reset Button */}
            <button
              onClick={() => setResetDialogOpen(true)}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              รีเซ็ตข้อมูล
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className={`w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border transition-colors ${
                isDirty
                  ? "bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:hover:bg-rose-900/30 dark:text-rose-400"
                  : "bg-neutral-50 border-neutral-200 text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-500"
              }`}
            >
              <Save className="h-4 w-4" />
              บันทึกการเตรียม
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportMarkdown}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <FileText className="h-4 w-4" />
              ส่งออก Markdown
            </button>

            {/* Ready Day 0 Button */}
            <button
              onClick={() => setDay0DialogOpen(true)}
              disabled={!readiness.canStart}
              className={`w-full sm:w-auto sm:ml-auto flex-shrink-0 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all ${
                readiness.canStart
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-200/50 dark:border-neutral-800/80 cursor-not-allowed"
              }`}
            >
              <Play className="h-4 w-4" />
              พร้อมเริ่ม Day 0
            </button>
          </div>

          {isDirty && (
            <p className="mt-3 text-xs text-amber-500 font-semibold flex items-center gap-1">
              <Info className="h-4 w-4" />
              ตรวจพบการแก้ไขที่ยังไม่ได้บันทึก — กรุณากดปุ่ม &quot;บันทึกการเตรียม&quot; เพื่อเก็บสถานะลงเครื่อง
            </p>
          )}
        </div>
      </section>

      {/* ─── Add Checklist Item Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={addChecklistItemOpen}
        title="เพิ่มรายการใหม่"
        onClose={() => setAddChecklistItemOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-3">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              ชื่อรายการ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newChecklistItem.name}
              onChange={(e) => setNewChecklistItem((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น กรรไกรตัดแต่งพิเศษ"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              หมวดหมู่
            </label>
            <select
              value={newChecklistItem.category}
              onChange={(e) =>
                setNewChecklistItem((prev) => ({
                  ...prev,
                  category: e.target.value as ChecklistCategory,
                }))
              }
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
            >
              {Object.entries(CHECKLIST_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                จำนวนที่ต้องการ
              </label>
              <input
                type="number"
                min="0"
                value={newChecklistItem.requiredQuantity}
                onChange={(e) =>
                  setNewChecklistItem((prev) => ({
                    ...prev,
                    requiredQuantity: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เว้นว่างได้"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                หน่วย
              </label>
              <input
                type="text"
                value={newChecklistItem.unit}
                onChange={(e) => setNewChecklistItem((prev) => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น ชิ้น, ลิตร"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              สถานะความพร้อม
            </label>
            <select
              value={newChecklistItem.status}
              onChange={(e) =>
                setNewChecklistItem((prev) => ({
                  ...prev,
                  status: e.target.value as ChecklistStatus,
                }))
              }
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
            >
              {Object.entries(CHECKLIST_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Critical toggle */}
          <div className="flex items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="new-item-critical"
              checked={newChecklistItem.isCritical}
              onChange={(e) =>
                setNewChecklistItem((prev) => ({ ...prev, isCritical: e.target.checked }))
              }
              className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="new-item-critical" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              จำเป็นต่อการเริ่ม Day 0 (Critical)
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              หมายเหตุ
            </label>
            <textarea
              rows={2}
              value={newChecklistItem.notes}
              onChange={(e) => setNewChecklistItem((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="ข้อแนะนำเพิ่มเติม..."
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3.5 pt-4 border-t border-neutral-100 dark:border-neutral-900">
            <button
              type="button"
              onClick={() => setAddChecklistItemOpen(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={addChecklistItem}
              disabled={!newChecklistItem.name.trim()}
              className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-bold transition-all disabled:opacity-50"
            >
              เพิ่มรายการ
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Checklist Item Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={editChecklistItemOpen && editingItem !== null}
        title="แก้ไขรายละเอียดรายการ"
        onClose={() => {
          setEditChecklistItemOpen(false);
          setEditingItem(null);
        }}
        maxWidth="max-w-md"
      >
        {editingItem && (
          <div className="space-y-4 pt-3">
            {/* Name (User-created only) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                ชื่อรายการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem((prev) => prev && { ...prev, name: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="ชื่อรายการ"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                หมวดหมู่
              </label>
              <select
                value={editingItem.category}
                onChange={(e) =>
                  setEditingItem((prev) => prev && {
                    ...prev,
                    category: e.target.value as ChecklistCategory,
                  })
                }
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              >
                {Object.entries(CHECKLIST_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  จำนวนที่ต้องการ
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingItem.requiredQuantity === null ? "" : editingItem.requiredQuantity}
                  onChange={(e) =>
                    setEditingItem((prev) => prev && {
                      ...prev,
                      requiredQuantity: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="ไม่ระบุ"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  หน่วย
                </label>
                <input
                  type="text"
                  value={editingItem.unit}
                  onChange={(e) => setEditingItem((prev) => prev && { ...prev, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                สถานะความพร้อม
              </label>
              <select
                value={editingItem.status}
                onChange={(e) =>
                  setEditingItem((prev) => prev && {
                    ...prev,
                    status: e.target.value as ChecklistStatus,
                  })
                }
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              >
                {Object.entries(CHECKLIST_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Critical toggle */}
            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="checkbox"
                id="edit-item-critical"
                checked={editingItem.isCritical}
                onChange={(e) =>
                  setEditingItem((prev) => prev && { ...prev, isCritical: e.target.checked })
                }
                className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="edit-item-critical" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                จำเป็นต่อการเริ่ม Day 0 (Critical)
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                หมายเหตุ
              </label>
              <textarea
                rows={2}
                value={editingItem.notes}
                onChange={(e) => setEditingItem((prev) => prev && { ...prev, notes: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-3.5 pt-4 border-t border-neutral-100 dark:border-neutral-900">
              <button
                type="button"
                onClick={() => {
                  setEditChecklistItemOpen(false);
                  setEditingItem(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingItem) {
                    updateChecklistItem(editingItem.id, {
                      name: editingItem.name,
                      category: editingItem.category,
                      isCritical: editingItem.isCritical,
                      requiredQuantity: editingItem.requiredQuantity,
                      unit: editingItem.unit,
                      status: editingItem.status,
                      notes: editingItem.notes,
                    });
                    setEditChecklistItemOpen(false);
                    setEditingItem(null);
                    setToastType("success");
                    setToastMessage("อัปเดตข้อมูลรายการแล้ว (บันทึกร่าง)");
                    setToastVisible(true);
                  }
                }}
                disabled={!editingItem.name.trim()}
                className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-bold transition-all disabled:opacity-50"
              >
                ยืนยันการแก้
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Export Markdown Preview Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={exportMarkdownOpen}
        title="ตัวอย่าง Markdown"
        onClose={() => setExportMarkdownOpen(false)}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Snapshot
            </p>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              สร้างเมื่อ: {formatThaiDate(exportedAt)}
            </p>
            {isDirty && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                เอกสารนี้สร้างจากข้อมูลปัจจุบันบนหน้าจอ ซึ่งอาจยังไม่ได้บันทึกลงในเครื่อง
              </p>
            )}
          </div>

          <textarea
            readOnly
            value={exportedMarkdown}
            className="min-h-[52vh] w-full resize-y rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-xs leading-relaxed text-neutral-100 outline-none focus:ring-2 focus:ring-rose-500"
            aria-label="ตัวอย่าง Markdown"
          />

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-900 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setExportMarkdownOpen(false)}
              className="rounded-xl px-5 py-2.5 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              คัดลอก Markdown
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Reset Dialog Confirmation ────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        title="รีเซ็ตข้อมูลการเตรียมตัวทดลอง?"
        message="การกระทำนี้จะล้างข้อมูลที่คุณกรอกทั้งหมดในหน้านี้ รวมถึงประวัติการบันทึกใน localStorage และกลับไปใช้ค่าเริ่มต้นสำหรับการทดลองปักชำกุหลาบ คุณต้องการรีเซ็ตข้อมูลใช่หรือไม่?"
        confirmText="ยืนยันการรีเซ็ต"
        cancelText="ยกเลิก"
        danger
        onConfirm={handleReset}
        onCancel={() => setResetDialogOpen(false)}
      />

      {/* ─── Day 0 Dialog Confirmation ────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={day0DialogOpen}
        title="พร้อมเริ่มต้นการทดลองปักชำ (Day 0)?"
        message={`ยินดีด้วย! ความพร้อมข้อมูลและรายการจำเป็นครบถ้วนสำหรับการทดลองปักชำกุหลาบ\n\nจำนวนกิ่งรวม: ${readiness.totalCuttings} กิ่ง\nกลุ่มการทดสอบ:\n${state.treatments.map((t) => ` - ${t.code} (${t.name}): ${t.cuttingCount} กิ่ง`).join("\n")}\n\nเมื่อยืนยันแล้ว ระบบจะบันทึกสถานะการเตรียมพร้อมสำหรับเริ่มทำการทดลอง`}
        confirmText="ยืนยันพร้อมเริ่ม"
        cancelText="กลับไปแก้ไข"
        onConfirm={handleDay0Confirm}
        onCancel={() => setDay0DialogOpen(false)}
      />

      {/* Toast Feedback */}
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
