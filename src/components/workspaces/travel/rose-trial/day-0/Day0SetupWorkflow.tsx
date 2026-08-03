"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  ShieldAlert,
  AlertTriangle,
  Check,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Play,
} from "lucide-react";

import type { RoseTrialStateV2 } from "../types";
import { createDefaultDay0Workflow } from "../defaults";
import { loadRoseTrialState, saveRoseTrialState } from "../storage";
import { checkDay0EntryConditions } from "../readiness";
import {
  hasPilotStarted,
  isDay0SetupStepComplete,
  persistPilotStart,
} from "../day0SetupWorkflow";
import { Toast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

const STEPS = [
  { number: 1, name: "Final Readiness Review", label: "ตรวจความพร้อมสุดท้าย" },
  { number: 2, name: "Workspace Preparation", label: "เตรียมพื้นที่และอุปกรณ์" },
  { number: 3, name: "Cutting Preparation", label: "เตรียมกิ่งชำ" },
  { number: 4, name: "Group Treatment", label: "ดำเนินการตามกลุ่มทดลอง" },
  { number: 5, name: "Placement Confirmation", label: "ตรวจสอบตัวอย่าง" },
  { number: 6, name: "Start Pilot Confirmation", label: "ยืนยันและเริ่ม Pilot" },
];

interface Day0SetupWorkflowProps {
  onStarted?: () => void;
}

export default function Day0SetupWorkflow({ onStarted }: Day0SetupWorkflowProps) {
  const router = useRouter();
  const startInFlightRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<RoseTrialStateV2 | null>(null);

  // Entry gate check status
  const [entryStatus, setEntryStatus] = useState<{ canStart: boolean; blockers: string[]; warnings: string[] }>({
    canStart: false,
    blockers: [],
    warnings: [],
  });

  // UI state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const result = loadRoseTrialState();
    if (result.state) {
      setState(result.state);
      setEntryStatus(checkDay0EntryConditions(result.state));
    }
  }, []);

  if (!mounted || !state) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-500 font-medium">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  const workflow = state.day0Workflow;
  const isStarted = hasPilotStarted(state.pilotStart);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const saveState = (updated: RoseTrialStateV2): boolean => {
    if (!saveRoseTrialState(updated)) {
      showToast("ไม่สามารถบันทึกข้อมูล Day 0 Setup ได้ กรุณาลองอีกครั้ง", "error");
      return false;
    }
    setState(updated);
    return true;
  };

  const handleCheckboxChange = (
    category: "completedChecklist" | "sampleConfirmations" | "groupConfirmations" | "placementConfirmations",
    itemId: string
  ) => {
    if (isStarted) return; // Read-only once started

    const currentList = workflow[category] || [];
    const newList = currentList.includes(itemId)
      ? currentList.filter(id => id !== itemId)
      : [...currentList, itemId];

    const updated = {
      ...state,
      day0Workflow: {
        ...workflow,
        [category]: newList,
      },
    };
    saveState(updated);
  };

  const isStepComplete = (stepNum: number): boolean =>
    isDay0SetupStepComplete(workflow, stepNum);

  const handleStepChange = (step: number) => {
    if (isStarted) return; // Read-only

    // Verify step entry conditions before moving forward
    if (step > workflow.currentStep) {
      if (workflow.currentStep === 1 && !isStepComplete(1)) {
        showToast("กรุณายืนยันการตรวจสอบความพร้อมสุดท้ายในทุกหัวข้อก่อนผ่านไปขั้นถัดไป", "error");
        return;
      }
      if (workflow.currentStep === 2 && !isStepComplete(2)) {
        showToast("กรุณาเตรียมความพร้อมสำหรับหัวข้อวิจัยจำเป็นให้ครบทั้ง 6 รายการ", "error");
        return;
      }
      if (workflow.currentStep === 3 && !isStepComplete(3)) {
        showToast("กรุณายืนยันการตรวจสอบและตัดแต่งกิ่งชำให้ครบทั้ง 8 กิ่ง", "error");
        return;
      }
      if (workflow.currentStep === 4 && !isStepComplete(4)) {
        showToast("กรุณายืนยันการดำเนินการสำหรับกลุ่มทดลองให้ครบทั้ง 4 กลุ่ม", "error");
        return;
      }
      if (workflow.currentStep === 5 && !isStepComplete(5)) {
        showToast("กรุณายืนยันการวางตัวอย่างในภาชนะให้ครบทั้ง 8 กิ่ง", "error");
        return;
      }
    }

    const updated = {
      ...state,
      day0Workflow: {
        ...workflow,
        currentStep: step,
      },
    };
    saveState(updated);
  };

  const handleResetWorkflow = () => {
    if (isStarted) return;
    const updated = {
      ...state,
      day0Workflow: createDefaultDay0Workflow(),
    };
    if (saveState(updated)) {
      setResetDialogOpen(false);
      showToast("รีเซ็ตขั้นตอน Day 0 เรียบร้อยแล้ว", "success");
    }
  };

  const handleStartPilot = () => {
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;
    try {
      const latest = loadRoseTrialState();
      const result = persistPilotStart(
        latest.state,
        new Date().toISOString(),
        saveRoseTrialState
      );

      if (result.status === "started" || result.status === "already_started") {
        setState(result.state);
        setEntryStatus(checkDay0EntryConditions(result.state));
        onStarted?.();
        if (result.status === "started") {
          showToast("เริ่ม Pilot การทดลองเรียบร้อยแล้ว!", "success");
        }
        return;
      }

      showToast(result.blockers[0] ?? "ยังไม่สามารถเริ่ม Pilot ได้", "error");
    } finally {
      startInFlightRef.current = false;
    }
  };

  // ─── Blocker screen when NOT started and cannot start ────────────────────
  if (!isStarted && !entryStatus.canStart) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 space-y-6">
        <div className="rounded-2xl border border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 p-6 text-center space-y-4 shadow-sm">
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-rose-700 dark:text-rose-400">
            ขั้นตอนการเตรียมความพร้อม (Preparation Checklist) ยังไม่พร้อม
          </h1>
          <p className="text-sm text-rose-600/90 dark:text-rose-400/80 leading-relaxed">
            ระบบตรวจสอบพบว่า รายการความพร้อมจำเป็นของโปรเจกต์ยังจัดเตรียมไม่ครบถ้วน หรือข้อมูลพื้นฐานยังระบุไม่ถูกต้อง
          </p>
          <div className="text-left bg-white dark:bg-neutral-900 border border-rose-100 dark:border-rose-900 p-4 rounded-xl space-y-2">
            <h2 className="text-xs font-bold text-rose-600 uppercase tracking-wider">รายการที่ต้องแก้ไข (Blockers):</h2>
            <ul className="text-xs text-rose-700 dark:text-rose-400 list-disc list-inside space-y-1">
              {entryStatus.blockers.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push("/workspaces/travel/rose-trial")}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              กลับไปหน้าจัดการความพร้อม
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render Step contents ────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">รายละเอียด Pilot:</h3>
        <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
          <p><span className="font-semibold">ชื่อการทดลอง:</span> {state.pilot.trialName}</p>
          <p><span className="font-semibold">Batch:</span> {state.batch.batchName}</p>
          <p><span className="font-semibold">พืชเป้าหมาย:</span> {state.pilot.cropName}</p>
          <p><span className="font-semibold">จำนวนเป้าหมาย:</span> 8 กิ่งชำ (4 กลุ่มทดลอง กลุ่มละ 2 ซ้ำ)</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">สถานะความพร้อมรายเซกชัน:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-3 bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-500">Inventory Status</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Ready</span>
          </div>
          <div className="p-3 bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-500">Treatment Product</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Ready</span>
          </div>
          <div className="p-3 bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-500">Sample Prep</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Ready</span>
          </div>
        </div>
      </div>

      {entryStatus.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-950 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="font-bold">ข้อควรระวัง/แจ้งเตือน (Warnings):</p>
              <ul className="list-disc list-inside space-y-0.5">
                {entryStatus.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">ตรวจสอบและยืนยันความถูกต้อง:</h3>
        <div className="space-y-3">
          {[
            { id: "readiness_reviewed", text: "ฉันได้ตรวจสอบข้อมูลและโครงสร้างแผนการทดลองของกิ่งชำทั้ง 8 กิ่งแล้ว" },
            { id: "sample_ids_verified", text: "ฉันได้ตรวจสอบว่ารหัสตัวอย่าง (W-T0-01 ถึง P-T1-02) ตรงกับกลุ่มทดลองและมีความถูกต้อง" },
            { id: "workspace_ready", text: "ฉันยืนยันว่าพื้นที่จัดตั้งทดลองและสภาพแวดล้อมมีความพร้อม" }
          ].map(item => (
            <label key={item.id} className="flex items-start gap-3 p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg cursor-pointer transition-colors text-xs text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                disabled={isStarted}
                checked={workflow.completedChecklist.includes(item.id)}
                onChange={() => handleCheckboxChange("completedChecklist", item.id)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <span>{item.text}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500 leading-relaxed">
        กรุณาเตรียมความพร้อมของสถานที่ทำงาน อุปกรณ์ และวัสดุปักชำตามคู่มือจัดตั้งความปลอดภัยของโครงการ
      </p>
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">เช็คลิสต์เตรียมพื้นที่และอุปกรณ์ (Workspace Setup):</h3>
        <div className="space-y-3">
          {[
            { id: "workspace_clean", text: "พื้นที่ทำงานสะอาดและพร้อม: พื้นที่จัดเตรียมกิ่งชำและชั้นวางได้รับการเช็ดฆ่าเชื้อด้วยแอลกอฮอล์เรียบร้อย" },
            { id: "containers_labeled", text: "ป้ายรหัสกลุ่มทดลองครบ: ติดป้ายบอกรหัสกลุ่ม W-T0, W-T1, P-T0, P-T1 ที่ขวดโหลหรือกระถางแต่ละชิ้นชัดเจน" },
            { id: "sample_labels_ready", text: "ป้ายตัวอย่างครบ 8 กิ่ง: จัดเตรียมป้าย tag รหัสตัวอย่าง W-T0-01 ถึง P-T1-02 เรียบร้อย" },
            { id: "tools_cleaned", text: "อุปกรณ์ตัดและเครื่องมือพร้อม: กรรไกรตัดแต่งกิ่ง คัตเตอร์ และสารทำความสะอาดอุปกรณ์เตรียมไว้เรียบร้อย" },
            { id: "medium_prepared", text: "เตรียมน้ำและวัสดุปลูกพร้อม: เตรียมน้ำสะอาดสำหรับโหล และพีทมอสที่แช่น้ำหมาดตามสัดส่วนในภาชนะแล้ว" },
            { id: "treatment_product_ready", text: "สารเร่งราก (Clonex) พร้อม: เจล Clonex วางประจำจุดเตรียมพร้อมสำหรับกลุ่มปักชำกระตุ้นสาร" }
          ].map(item => (
            <label key={item.id} className="flex items-start gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg cursor-pointer transition-colors text-xs text-neutral-700 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-900">
              <input
                type="checkbox"
                disabled={isStarted}
                checked={workflow.completedChecklist.includes(item.id)}
                onChange={() => handleCheckboxChange("completedChecklist", item.id)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="leading-relaxed">{item.text}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500 leading-relaxed">
        ตรวจสอบกิ่งชำแต่ละตัวอย่าง และทำเครื่องหมายยืนยันว่ากิ่งมีความสด สลัดตาข้าง ดอก หรือใบล่างออกตามข้อกำหนด และเตรียมรอยตัดโคนกิ่งเรียบร้อยแล้ว
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {state.samples.map(sample => (
          <div key={sample.id} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">{sample.id}</span>
                <span className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-500 rounded font-semibold uppercase">{sample.medium === "water" ? "น้ำ" : "พีทมอส"} - {sample.treatmentRole}</span>
              </div>
              <div className="text-[10px] text-neutral-500 space-y-0.5">
                <p>ต้นแม่พันธุ์: {sample.baseline?.motherPlantId || "-"}</p>
                <p>ความยาว: {sample.baseline?.length || "-"} ซม. | STEM: {sample.baseline?.stemDiameter || "-"} มม.</p>
                <p>จำนวนข้อ: {sample.baseline?.nodeCount || "-"} | ใบเหลือนั่งร้าน: {sample.baseline?.leafCount || "-"}</p>
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg cursor-pointer text-[11px] text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                disabled={isStarted}
                checked={workflow.sampleConfirmations.includes(sample.id)}
                onChange={() => handleCheckboxChange("sampleConfirmations", sample.id)}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <span>ตรวจสอบและเตรียมกิ่งสำเร็จ</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
        ข้อพึงระวัง: ข้อมูลนี้เป็นเพียงบันทึกกระบวนการทดลอง ควรติดตามสภาพกิ่งจริงและดำเนินการตามฉลากผลิตภัณฑ์อย่างเคร่งครัด ผลการออกรากอาจมีความแปรปรวนตามสภาพของกิ่งปักชำและการจัดการ
      </div>
      <div className="space-y-3">
        {[
          { id: "W-T0", title: "กลุ่ม W-T0 (ในน้ำ / Control - 2 กิ่ง)", desc: "ปักชำในขวดโหลน้ำเปล่า (ห้ามสัมผัสเจลเร่งราก Clonex)", check: "ยืนยันการปักชำในน้ำ (Control) จำนวน 2 กิ่งครบถ้วน" },
          { id: "W-T1", title: "กลุ่ม W-T1 (ในน้ำ / Clonex - 2 กิ่ง)", desc: "ทาโคนกิ่งด้วย Clonex Rooting Gel (สารสำคัญ IBA เจล) ความยาว 1-2 ซม. ก่อนปักลงโหลน้ำ", check: "ยืนยันการทาโคนกิ่งด้วย Clonex และปักชำในน้ำ 2 กิ่งครบถ้วน" },
          { id: "P-T0", title: "กลุ่ม P-T0 (พีทมอส / Control - 2 กิ่ง)", desc: "ปักชำในวัสดุพีทมอสชื้น (ห้ามสัมผัสเจลเร่งราก Clonex)", check: "ยืนยันการปักชำในพีทมอส (Control) จำนวน 2 กิ่งครบถ้วน" },
          { id: "P-T1", title: "กลุ่ม P-T1 (พีทมอส / Clonex - 2 กิ่ง)", desc: "ทาโคนกิ่งด้วย Clonex Rooting Gel (สารสำคัญ IBA เจล) ความยาว 1-2 ซม. ก่อนปักลงพีทมอส", check: "ยืนยันการทาโคนกิ่งด้วย Clonex และปักชำในพีทมอส 2 กิ่งครบถ้วน" },
        ].map(group => (
          <div key={group.id} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{group.title}</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">{group.desc}</p>
            <label className="flex items-center gap-2 mt-2 p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                disabled={isStarted}
                checked={workflow.groupConfirmations.includes(group.id)}
                onChange={() => handleCheckboxChange("groupConfirmations", group.id)}
                className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <span>{group.check}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep5 = () => {
    const confirmedCount = workflow.placementConfirmations.length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
          <span>ความคืบหน้าการจัดวาง:</span>
          <span>จัดวางแล้ว {confirmedCount}/8 กิ่ง</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {state.samples.map(sample => (
            <label key={sample.id} className="flex items-start gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-xl cursor-pointer transition-colors text-xs text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <input
                type="checkbox"
                disabled={isStarted}
                checked={workflow.placementConfirmations.includes(sample.id)}
                onChange={() => handleCheckboxChange("placementConfirmations", sample.id)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <div className="min-w-0">
                <span className="font-bold text-neutral-900 dark:text-white block">{sample.id}</span>
                <span className="text-[10px] text-neutral-400">กลุ่มปักชำ: {sample.medium === "water" ? "โหลน้ำ" : "ถาดพีทมอส"} ({sample.treatmentCode})</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderStep6 = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
        <h3 className="font-bold text-neutral-800 dark:text-neutral-200">สรุปการดำเนินการ Day 0:</h3>
        <p>• ตรวจสอบความพร้อมสุดท้าย: สำเร็จ</p>
        <p>• เตรียมความพร้อมสถานที่และวัสดุปลูก: เรียบร้อย</p>
        <p>• การเตรียมแต่งกิ่งชำ: ครบถ้วน 8 กิ่ง</p>
        <p>• บันทึกการให้ทรีทเมนต์รายกลุ่ม: ครบทั้ง 4 กลุ่ม</p>
        <p>• จัดวางลงตำแหน่งทดลอง: ครบทั้ง 8 จุด</p>
        <p className="mt-2 text-[10px] text-neutral-400 italic">
          หมายเหตุ: การทดลองนี้มีขนาดตัวอย่างจำกัด (8 กิ่ง) การบันทึกข้อมูลมีวัตถุประสงค์เพื่อติดตามพฤติกรรมในขอบเขตการจัดทำตัวอย่างวิจัยเท่านั้น ไม่ใช่การรับประกันผลการออกรากหรือพิสูจน์เชิงวิทยาศาสตร์ทั่วไป
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
          บันทึกเพิ่มเติมของ Day 0 (Optional Note):
        </label>
        <textarea
          disabled={isStarted}
          value={workflow.notes}
          onChange={(e) => {
            if (isStarted) return;
            saveState({
              ...state,
              day0Workflow: { ...workflow, notes: e.target.value }
            });
          }}
          placeholder="บันทึกสภาพอากาศภายนอก สภาพกิ่ง หรือข้อสังเกตเพิ่มเติมอื่นๆ ในวันแรก..."
          className="w-full h-24 p-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl text-xs focus:ring-rose-500 focus:outline-none focus:ring-2"
        />
      </div>

      <label className="flex items-start gap-3 p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-xl cursor-pointer transition-colors text-xs text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
        <input
          type="checkbox"
          disabled={isStarted}
          checked={workflow.finalConfirm}
          onChange={(e) => {
            if (isStarted) return;
            saveState({
              ...state,
              day0Workflow: { ...workflow, finalConfirm: e.target.checked }
            });
          }}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
        />
        <div className="min-w-0">
          <span className="font-bold block mb-0.5">ฉันขอยืนยันว่าการตั้งค่าเริ่มต้น Day 0 เสร็จสมบูรณ์แล้ว</span>
          <span className="text-[10px] text-neutral-500 block leading-relaxed">
            เมื่อกดปุ่มเริ่ม ระบบจะบันทึกและล็อกข้อมูลกลุ่มทดลองและรหัสกิ่งทั้งหมดสำหรับเริ่มการวัดผลประจำวันต่อไป
          </span>
        </div>
      </label>

      {!isStarted && (
        <button
          onClick={handleStartPilot}
          disabled={!workflow.finalConfirm}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-md transition-all ${
            workflow.finalConfirm
              ? "bg-rose-600 hover:bg-rose-700 text-white active:scale-95 cursor-pointer animate-fadeIn"
              : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-neutral-200/50 dark:border-neutral-800/80"
          }`}
        >
          <Play className="h-4 w-4" />
          เริ่มต้นการทดลองปักชำ (Start Pilot)
        </button>
      )}
    </div>
  );

  // ─── Render Completed UI State ───────────────────────────────────────────
  const renderCompletedState = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50 dark:bg-emerald-950/20 p-6 text-center space-y-4 shadow-sm">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
        <h1 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
          Day 0 บันทึกเสร็จสมบูรณ์และเริ่มการทดลองเรียบร้อยแล้ว
        </h1>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
          <p>เวลาเริ่มทดลอง: <span className="font-bold text-neutral-700 dark:text-neutral-300">{state.pilotStart.startedAt ? new Date(state.pilotStart.startedAt).toLocaleString("th-TH") : ""}</span></p>
          <p>จำนวนตัวอย่างวิจัย: <span className="font-bold text-neutral-700 dark:text-neutral-300">8 กิ่งชำ</span></p>
        </div>
        {workflow.notes.trim() && (
          <div className="text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl space-y-1.5 max-w-md mx-auto">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">บันทึกเพิ่มเติม Day 0:</span>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap">{workflow.notes}</p>
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ขั้นตอนที่บันทึกข้อมูลแล้ว (Day 0 Workflow Summary):</h2>
        <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          {[
            "1. ตรวจความพร้อมสุดท้าย (Readiness checklist verified)",
            "2. เตรียมพื้นที่และอุปกรณ์ (Clean and prepared workspace list)",
            "3. ตรวจแต่งกิ่งและโคนกิ่งปักชำ (8 samples trimmed)",
            "4. การให้ทรีทเมนต์ (4 groups checked)",
            "5. จัดวางประจำจุดทดลอง (8 replicates placed)",
            "6. ยืนยันสิ้นสุด Day 0 (Final start confirmed)"
          ].map((text, idx) => (
            <div key={idx} className="flex items-center gap-2.5 p-2 bg-white dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800/80 rounded-lg">
              <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 flex justify-center">
        <button
          onClick={() => router.push("/workspaces/travel/rose-trial")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          กลับไปหน้าจัดการความพร้อม
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      {/* ─── Top Header Navigation ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="min-w-0">
          <button
            onClick={() => router.push("/workspaces/travel/rose-trial")}
            className="group inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            ย้อนกลับไป Preparation
          </button>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-rose-500" />
            Day 0 Setup Workflow
          </h1>
        </div>

        {/* Reset workflow button, only if not started */}
        {!isStarted && (
          <button
            onClick={() => setResetDialogOpen(true)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all"
            title="รีเซ็ตขั้นตอนการกรอกทั้งหมดกลับไปที่ขั้นตอนแรก"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            รีเซ็ตขั้นตอน Day 0
          </button>
        )}
      </div>

      {/* ─── Main Content Body ─────────────────────────────────────────────── */}
      {isStarted ? (
        renderCompletedState()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Steps Indicator Panel (Left sidebar in Desktop, top block in Mobile) */}
          <div className="lg:col-span-4 space-y-3.5 bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xs font-black text-neutral-400 uppercase tracking-widest pb-2 border-b border-neutral-200 dark:border-neutral-800">
              ขั้นตอนทั้งหมด (6 Steps):
            </h2>
            <nav className="flex flex-col gap-2">
              {STEPS.map(step => {
                const isActive = step.number === workflow.currentStep;
                const isDone = isStepComplete(step.number);

                return (
                  <button
                    key={step.number}
                    disabled={isStarted || step.number > workflow.currentStep && !isStepComplete(step.number - 1)}
                    onClick={() => handleStepChange(step.number)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    <div className={`h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white text-rose-600"
                        : isDone
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                    }`}>
                      {isDone && !isActive ? <Check className="h-3 w-3" /> : step.number}
                    </div>
                    <span className="truncate">{step.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Current Step Active Panel (Right area) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-900">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                  Step {workflow.currentStep} of 6
                </span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  {STEPS.find(s => s.number === workflow.currentStep)?.label}
                </span>
              </div>

              {/* Step Components */}
              {workflow.currentStep === 1 && renderStep1()}
              {workflow.currentStep === 2 && renderStep2()}
              {workflow.currentStep === 3 && renderStep3()}
              {workflow.currentStep === 4 && renderStep4()}
              {workflow.currentStep === 5 && renderStep5()}
              {workflow.currentStep === 6 && renderStep6()}

              {/* Steps Next / Back controls */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-900 flex justify-between gap-3 text-xs font-bold">
                {workflow.currentStep > 1 && (
                  <button
                    onClick={() => handleStepChange(workflow.currentStep - 1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    ย้อนกลับ
                  </button>
                )}
                {workflow.currentStep < 6 && (
                  <button
                    onClick={() => handleStepChange(workflow.currentStep + 1)}
                    disabled={!isStepComplete(workflow.currentStep)}
                    className={`ml-auto flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white transition-all ${
                      isStepComplete(workflow.currentStep)
                        ? "bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer shadow-sm"
                        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-neutral-200/50 dark:border-neutral-800/80"
                    }`}
                  >
                    ขั้นตอนถัดไป
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Reset Dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        title="รีเซ็ตความคืบหน้าขั้นตอน Day 0?"
        message="การกระทำนี้จะล้างเครื่องหมายเช็คลิสต์และข้อมูลขั้นตอนการกรอก Day 0 ทั้งหมดที่คุณกรอกไว้ในส่วน Workflow นี้ คุณต้องการรีเซ็ตใช่หรือไม่?"
        confirmText="ยืนยันการรีเซ็ต"
        cancelText="ยกเลิก"
        danger
        onConfirm={handleResetWorkflow}
        onCancel={() => setResetDialogOpen(false)}
      />

      {/* Toast Notification feedbacks */}
      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
