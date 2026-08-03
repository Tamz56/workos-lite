"use client";

// GF-APP-075 — Rose Trial Day 0 Client Component
// Stage 2D — Day 0 Setup MVP

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  FlaskConical,
  ShieldAlert,
  Save,
  FileText,
  Tag,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  ChevronLeft,
  Thermometer,
  CloudSun,
  Eye,
  TrendingUp,
} from "lucide-react";

import type {
  RoseDay0State,
  Day0TrialSnapshot,
  Day0TreatmentSnapshot,
  Day0StartInfo,
  SourcePlantRecord,
  CuttingSetup,
  PropagationSetup,
  Day0Environment,
  TrialUnit,
  Day0Deviation,
  Day0Observation,
  Day0Status,
} from "./types";
import { createDefaultRoseDay0State, HUMIDITY_SYSTEM_LABELS } from "./defaults";
import { loadRoseDay0State, saveRoseDay0State, clearRoseDay0State } from "./storage";
import {
  copyRoseDay0Markdown,
  createRoseDay0MarkdownPreview,
  formatRoseDay0SavedTimestamp,
  getPreparationSnapshotChangeReasons,
  regenerateRoseDay0TrialUnits,
  type Day0MarkdownPreview,
} from "./logic";
import { loadRoseTrialState } from "../storage";
import { determineDay0Mode, shouldAccessLegacyDay0Storage } from "../day0SetupWorkflow";
import { calculateReadiness as calculatePrepReadiness } from "../readiness";
import { Toast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import Day0SetupWorkflow from "./Day0SetupWorkflow";

// ─── Completion Validation Logic ──────────────────────────────────────────────

export function validateCompletion(state: RoseDay0State): { isValid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const { startInfo, cuttingSetup, propagationSetup, trialUnits } = state;

  if (!startInfo.actualStartDate) {
    reasons.push("กรุณาระบุวันที่เริ่มต้นปักชำจริง");
  }

  const cuttingsCount = cuttingSetup.actualCuttingCount || 0;
  if (cuttingsCount <= 0) {
    reasons.push("จำนวนกิ่งปักชำจริงต้องมากกว่า 0");
  }

  // Treatment cutting counts sum check
  const assignedSum = state.trialSnapshot.treatments.reduce((sum, t) => {
    const act = state.treatments.find((tr) => tr.code === t.code);
    return sum + (act?.cuttingCount || 0);
  }, 0);

  if (assignedSum !== cuttingsCount) {
    reasons.push(`จำนวนกิ่งจริงรวมกลุ่ม (${assignedSum} กิ่ง) ไม่สอดคล้องกับกิ่งปักชำจริงทั้งหมด (${cuttingsCount} กิ่ง)`);
  }

  if (trialUnits.length !== cuttingsCount) {
    reasons.push(`ต้องสร้างรหัสกิ่งปักชำรายตัวให้ครบถ้วนก่อนเสร็จสิ้น (สร้างแล้ว ${trialUnits.length}/${cuttingsCount})`);
  }

  if (!propagationSetup.mediumName.trim()) {
    reasons.push("กรุณาระบุชื่อวัสดุปักชำจริง");
  }

  if (!startInfo.location.trim()) {
    reasons.push("กรุณาระบุสถานที่ทดลองจริง");
  }

  // Check Direct Observation
  const obsText = state.observation.directObservation.trim();
  if (!obsText) {
    reasons.push("กรุณาระบุข้อมูลสังเกตการณ์เชิงทัศนสัมผัส (Direct Observation) อย่างน้อยหนึ่งรายการ");
  }

  return {
    isValid: reasons.length === 0,
    reasons,
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RoseDay0Client() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"loading" | "blocker" | "setup" | "legacy">("loading");

  // States
  const [state, setState] = useState<RoseDay0State | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isCorrupt, setIsCorrupt] = useState(false);
  const [corruptJson, setCorruptJson] = useState<string | null>(null);

  // Notifications
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // Confirm dialogs
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [exportPreview, setExportPreview] = useState<Day0MarkdownPreview | null>(null);
  const [snapshotChangeReasons, setSnapshotChangeReasons] = useState<string[]>([]);

  // Custom Deviation Modal State
  const [addDeviationOpen, setAddDeviationOpen] = useState(false);
  const [newDeviation, setNewDeviation] = useState<Omit<Day0Deviation, "id">>({
    area: "",
    plannedValue: "",
    actualValue: "",
    reason: "",
    possibleImpact: "",
    notes: "",
  });

  // Load state on mount
  const initializeOrLoadDay0State = () => {
    const prep = loadRoseTrialState().state;
    const readiness = calculatePrepReadiness(prep);
    const result = loadRoseDay0State();
    if (result.isCorrupt) {
      setIsCorrupt(true);
      setCorruptJson(result.rawJson);
      return;
    }

    if (result.state) {
      setSnapshotChangeReasons(getPreparationSnapshotChangeReasons(result.state.trialSnapshot, prep));
      setState(result.state);
    } else {
      // Create initial snapshot from Prep
      const treatmentsSnapshot: Day0TreatmentSnapshot[] = prep.treatments.map((t) => ({
        code: t.code,
        name: t.name,
        description: t.description,
        cuttingCount: t.cuttingCount || 0,
        inputName: t.inputName || "",
        notes: t.notes || "",
      }));

      const snapshot: Day0TrialSnapshot = {
        trialName: prep.pilot.trialName,
        cropName: prep.pilot.cropName,
        goal: prep.pilot.goal,
        batchName: prep.batch.batchName,
        plannedStartDate: prep.batch.plannedStartDate,
        totalCuttings: prep.batch.totalCuttings || 0,
        treatments: treatmentsSnapshot,
        readinessStatus: readiness.status,
        sourceUpdatedAt: prep.updatedAt,
      };

      const freshState = createDefaultRoseDay0State(snapshot);
      // Initialize treatments in Day 0 with snapshot values
      freshState.treatments = prep.treatments.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.description,
        cuttingCount: t.cuttingCount || 0,
        inputName: t.inputName || "",
        notes: t.notes || "",
        source: t.source || "default",
      }));

      saveRoseDay0State(freshState);
      setSnapshotChangeReasons(getPreparationSnapshotChangeReasons(freshState.trialSnapshot, prep));
      setState(freshState);
    }
  };

  const handleWorkflowStarted = () => {
    setMode("legacy");
    initializeOrLoadDay0State();
  };

  useEffect(() => {
    setMounted(true);

    // 1. Load Preparation state to check readiness gate
    const prep = loadRoseTrialState().state;
    const readiness = calculatePrepReadiness(prep);
    const currentMode = determineDay0Mode(prep.pilotStart, readiness.canStart);
    setMode(currentMode);

    if (!shouldAccessLegacyDay0Storage(currentMode)) {
      return;
    }

    // 2. Load Day 0 state
    const result = loadRoseDay0State();
    if (result.isCorrupt) {
      setIsCorrupt(true);
      setCorruptJson(result.rawJson);
      return;
    }

    if (result.state) {
      setSnapshotChangeReasons(getPreparationSnapshotChangeReasons(result.state.trialSnapshot, prep));
      setState(result.state);
    } else {
      // Create initial snapshot from Prep
      const treatmentsSnapshot: Day0TreatmentSnapshot[] = prep.treatments.map((t) => ({
        code: t.code,
        name: t.name,
        description: t.description,
        cuttingCount: t.cuttingCount || 0,
        inputName: t.inputName || "",
        notes: t.notes || "",
      }));

      const snapshot: Day0TrialSnapshot = {
        trialName: prep.pilot.trialName,
        cropName: prep.pilot.cropName,
        goal: prep.pilot.goal,
        batchName: prep.batch.batchName,
        plannedStartDate: prep.batch.plannedStartDate,
        totalCuttings: prep.batch.totalCuttings || 0,
        treatments: treatmentsSnapshot,
        readinessStatus: readiness.status,
        sourceUpdatedAt: prep.updatedAt,
      };

      const freshState = createDefaultRoseDay0State(snapshot);
      // Initialize treatments in Day 0 with snapshot values
      freshState.treatments = prep.treatments.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.description,
        cuttingCount: t.cuttingCount || 0,
        inputName: t.inputName || "",
        notes: t.notes || "",
        source: t.source || "default",
      }));

      saveRoseDay0State(freshState);
      setSnapshotChangeReasons(getPreparationSnapshotChangeReasons(freshState.trialSnapshot, prep));
      setState(freshState);
    }
  }, []);

  // Back to draft logic on edit
  const markAsDraft = (prevState: RoseDay0State) => {
    if (prevState.status === "completed") {
      return {
        ...prevState,
        status: "draft" as Day0Status,
        completedAt: null,
      };
    }
    return prevState;
  };

  // State update helpers
  const updateStartInfo = (fields: Partial<Day0StartInfo>) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        startInfo: { ...prev.startInfo, ...fields },
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateSourcePlant = (fields: Partial<SourcePlantRecord>) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        sourcePlant: { ...prev.sourcePlant, ...fields },
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateCuttingSetup = (fields: Partial<CuttingSetup>) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        cuttingSetup: { ...prev.cuttingSetup, ...fields },
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updatePropagationSetup = (fields: Partial<PropagationSetup>) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        propagationSetup: { ...prev.propagationSetup, ...fields },
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateEnvironment = (fields: Partial<Day0Environment>) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        environment: { ...prev.environment, ...fields },
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateObservationField = (fields: Partial<Day0Observation>) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        observation: { ...prev.observation, ...fields },
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateActualTreatmentCutting = (code: string, count: number) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        treatments: prev.treatments.map((tr) =>
          tr.code === code ? { ...tr, cuttingCount: count } : tr
        ),
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateActualTreatmentInput = (code: string, inputName: string) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        treatments: prev.treatments.map((tr) =>
          tr.code === code ? { ...tr, inputName } : tr
        ),
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateActualTreatmentNotes = (code: string, notes: string) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        treatments: prev.treatments.map((tr) =>
          tr.code === code ? { ...tr, notes } : tr
        ),
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  const updateTrialUnitField = (unitId: string, fields: Partial<TrialUnit>) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        trialUnits: prev.trialUnits.map((u) =>
          u.id === unitId ? { ...u, ...fields } : u
        ),
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  // Auto-detect and sync deviations list
  const runAutoDeviationsCheck = () => {
    if (!state) return;
    const newDevs: Day0Deviation[] = [];

    // 1. Mismatch cuttings counts
    const plannedCuttings = state.trialSnapshot.totalCuttings;
    const actualCuttings = state.cuttingSetup.actualCuttingCount;
    if (plannedCuttings !== actualCuttings) {
      newDevs.push({
        id: `dev-cuttings-${crypto.randomUUID()}`,
        area: "จำนวนกิ่งรวมใน Batch",
        plannedValue: `${plannedCuttings} กิ่ง`,
        actualValue: `${actualCuttings} กิ่ง`,
        reason: "ปรับจำนวนเนื่องจากกิ่งที่ตัดได้จริงหน้างานไม่ตรงแผน",
        possibleImpact: "สัดส่วนข้อมูลตัวแทนของแต่ละ Treatment เปลี่ยนแปลงเล็กน้อย",
        notes: "",
      });
    }

    // 2. Mismatch start date
    const plannedDate = state.trialSnapshot.plannedStartDate;
    const actualDate = state.startInfo.actualStartDate;
    if (plannedDate && plannedDate !== actualDate) {
      newDevs.push({
        id: `dev-date-${crypto.randomUUID()}`,
        area: "วันที่คาดว่าจะเริ่มปักชำ",
        plannedValue: plannedDate,
        actualValue: actualDate,
        reason: "เลื่อนกำหนดการเตรียมวัสดุและกิ่งพันธุ์ไม่ทัน",
        possibleImpact: "ไม่กระทบโดยตรงต่อผลการออกราก",
        notes: "",
      });
    }

    // 3. Treatment cutting counts mismatches
    for (const pTreatment of state.trialSnapshot.treatments) {
      const aTreatment = state.treatments.find((tr) => tr.code === pTreatment.code);
      if (aTreatment && pTreatment.cuttingCount !== aTreatment.cuttingCount) {
        newDevs.push({
          id: `dev-tr-${pTreatment.code}-${crypto.randomUUID()}`,
          area: `จำนวนกิ่งใน Treatment ${pTreatment.code}`,
          plannedValue: `${pTreatment.cuttingCount} กิ่ง`,
          actualValue: `${aTreatment.cuttingCount} กิ่ง`,
          reason: "เกลี่ยยอดกิ่งตามกิ่งที่ตัดได้จริง",
          possibleImpact: "ความน่าเชื่อถือทางสถิติอาจลดลงในกลุ่มที่จำนวนกิ่งน้อยลง",
          notes: "",
        });
      }
    }

    // Preserve existing custom (user added) deviations
    const customDevs = state.deviations.filter((d) => !d.id.startsWith("dev-cuttings-") && !d.id.startsWith("dev-date-") && !d.id.startsWith("dev-tr-"));

    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        deviations: [...newDevs, ...customDevs],
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });

    setToastType("success");
    setToastMessage(`ตรวจสอบเรียบร้อยแล้ว ตรวจพบการเปลี่ยนแปลง ${newDevs.length} หัวข้อ`);
    setToastVisible(true);
  };

  const addCustomDeviation = () => {
    if (!newDeviation.area.trim()) return;

    const dev: Day0Deviation = {
      id: `dev-custom-${crypto.randomUUID()}`,
      ...newDeviation,
    };

    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        deviations: [...prev.deviations, dev],
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });

    setNewDeviation({
      area: "",
      plannedValue: "",
      actualValue: "",
      reason: "",
      possibleImpact: "",
      notes: "",
    });
    setAddDeviationOpen(false);

    setToastType("success");
    setToastMessage("เพิ่มบันทึกข้อเบี่ยงเบนจากแผนการทดลองแล้ว");
    setToastVisible(true);
  };

  const deleteDeviation = (id: string) => {
    setState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        deviations: prev.deviations.filter((d) => d.id !== id),
      };
      setIsDirty(true);
      return markAsDraft(updated);
    });
  };

  // Main Actions
  const handleSave = () => {
    if (!state) return;
    const success = saveRoseDay0State(state);
    if (success) {
      setIsDirty(false);
      const loaded = loadRoseDay0State();
      if (loaded.state) setState(loaded.state);
      setToastType("success");
      setToastMessage("บันทึกร่างตั้งต้น Day 0 เรียบร้อยแล้ว");
    } else {
      setToastType("error");
      setToastMessage("ไม่สามารถบันทึกข้อมูลได้");
    }
    setToastVisible(true);
  };

  const handleResetConfirm = () => {
    if (!state) return;
    clearRoseDay0State();
    // Re-generate fresh defaults with initial snapshot
    const fresh = createDefaultRoseDay0State(state.trialSnapshot);
    fresh.treatments = state.trialSnapshot.treatments.map((t) => ({
      id: `tr-${crypto.randomUUID()}`,
      code: t.code,
      name: t.name,
      description: t.description,
      cuttingCount: t.cuttingCount,
      inputName: t.inputName,
      notes: t.notes,
      source: "default",
    }));

    saveRoseDay0State(fresh);
    setState(fresh);
    setIsDirty(false);
    setResetDialogOpen(false);
    setToastType("success");
    setToastMessage("ล้างข้อมูล Day 0 และรีเซ็ตกลับสู่เริ่มต้นแล้ว");
    setToastVisible(true);
  };

  const handleCompleteConfirm = () => {
    if (!state) return;
    const check = validateCompletion(state);
    if (!check.isValid) {
      setToastType("error");
      setToastMessage("กรุณาแก้ไขข้อผิดพลาดก่อนบันทึกเสร็จสมบูรณ์");
      setToastVisible(true);
      setCompleteDialogOpen(false);
      return;
    }

    const updated: RoseDay0State = {
      ...state,
      status: "completed",
      completedAt: new Date().toISOString(),
    };

    saveRoseDay0State(updated);
    setState(updated);
    setIsDirty(false);
    setCompleteDialogOpen(false);
    setToastType("success");
    setToastMessage("บันทึกการตั้งต้น Day 0 เสร็จสมบูรณ์เรียบร้อยแล้ว!");
    setToastVisible(true);
  };

  const handleExportMarkdown = () => {
    if (!state) return;
    setExportPreview(createRoseDay0MarkdownPreview(state));
  };

  const handleCopyMarkdownPreview = async () => {
    if (!exportPreview) return;
    const result = await copyRoseDay0Markdown(exportPreview.markdown);
    if (result.ok) {
      setToastType("success");
      setToastMessage("คัดลอก Day 0 Markdown ลงคลิปบอร์ดแล้ว");
    } else {
      setToastType("error");
      setToastMessage(result.errorMessage || "ไม่สามารถคัดลอกเอกสารลงคลิปบอร์ดได้");
    }
    setToastVisible(true);
  };

  // Re-generate Trial Units handler
  const executeRegenerateTrialUnits = () => {
    if (!state) return;

    const result = regenerateRoseDay0TrialUnits(state);
    setState(result.state);
    setIsDirty(true);
    setGenerateConfirmOpen(false);

    if (result.warnings.length > 0) {
      setToastType("info");
      setToastMessage(`จัดเรียงข้อมูลรหัสกิ่งใหม่แล้ว: ${result.warnings.join(", ")}`);
    } else {
      setToastType("success");
      setToastMessage(`สร้างรหัสกิ่งปักชำรายตัวจำนวน ${result.state.trialUnits.length} กิ่งเสร็จสมบูรณ์`);
    }
    setToastVisible(true);
  };

  const handleRegenerateTrialUnits = () => {
    if (!state) return;
    if (state.trialUnits.length > 0) {
      // มีกิ่งเดิมอยู่แล้ว ขอความเห็นชอบก่อนทับ
      setGenerateConfirmOpen(true);
    } else {
      executeRegenerateTrialUnits();
    }
  };

  // Error recovery state if localStorage corrupted
  const handleCorruptStateRecovery = () => {
    clearRoseDay0State();
    setIsCorrupt(false);
    // Reload window to trigger default recovery
    window.location.reload();
  };

  if (!mounted || mode === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm font-semibold text-neutral-400">กำลังโหลดข้อมูลระบบ...</p>
      </div>
    );
  }

  // Gate check screen
  if (mode === "blocker") {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 space-y-6">
        <div className="rounded-2xl border border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 p-6 text-center space-y-4 shadow-sm">
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-rose-700 dark:text-rose-400">
            ขั้นตอนการเตรียมความพร้อม (Preparation Checklist) ยังไม่พร้อม
          </h1>
          <p className="text-sm text-rose-600/90 dark:text-rose-400/80 leading-relaxed">
            ระบบตรวจสอบพบว่า รายการความพร้อมจำเป็นของโปรเจกต์ กุหลาบ (Rose Trial Lab) ยังจัดหาไม่ครบถ้วน หรือข้อมูลพื้นฐานยังระบุไม่ถูกต้องครบถ้วน
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push("/workspaces/travel")}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
              กลับไปหน้าจัดการความพร้อม
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Corrupt state warning screen
  if (isCorrupt) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 space-y-6">
        <div className="rounded-2xl border border-amber-200 dark:border-amber-950 bg-amber-50 dark:bg-amber-950/20 p-6 text-center space-y-4 shadow-sm">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h1 className="text-lg font-bold text-amber-700 dark:text-amber-400">
            ตรวจพบความเสียหายของฐานข้อมูลการบันทึก (Corrupted Data)
          </h1>
          <p className="text-sm text-amber-600/90 dark:text-amber-400/80 leading-relaxed">
            โครงสร้างไฟล์ Day 0 ที่ถูกจัดเก็บในบราวเซอร์นี้เกิดความไม่เข้ากันหรือเสียหาย ไม่สามารถอ่านค่าต่อได้
          </p>
          <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg text-left overflow-x-auto text-[10px] text-neutral-500 font-mono">
            {corruptJson ? corruptJson.substring(0, 300) + "..." : "ไม่พบข้อมูล"}
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => router.push("/workspaces/travel")}
              className="px-5 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold hover:bg-neutral-50"
            >
              กลับไปก่อน
            </button>
            <button
              onClick={handleCorruptStateRecovery}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              ซ่อมแซมและกู้คืนดีฟอลต์
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "setup") {
    return <Day0SetupWorkflow onStarted={handleWorkflowStarted} />;
  }

  if (!state) return null;

  const validation = validateCompletion(state);
  const savedTimestampLabel = formatRoseDay0SavedTimestamp(state.updatedAt);

  return (
    <div className="w-full max-w-3xl mx-auto overflow-x-hidden px-4 py-6 md:px-6 md:py-8 space-y-6 pb-24">
      {/* Back button and page status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => router.push("/workspaces/travel")}
          className="flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          กลับหน้าเตรียมความพร้อม
        </button>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              state.status === "completed"
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
            }`}
          >
            {state.status === "completed" ? "Day 0 เสร็จสมบูรณ์" : "แบบร่าง (Draft)"}
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-100 dark:border-rose-900/40 p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-rose-500" />
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              ปักหมุดบันทึกการเริ่มต้นทดลอง (Day 0 Setup)
            </h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            ตรวจสอบข้อมูลและเก็บรายละเอียดทางเทคนิคของกิ่งปักชำกุหลาบ ต้นแม่ที่คัด และรหัสกิ่งปลูกในวันเริ่มดำเนินการจริง
          </p>
        </div>
      </div>

      {/* ─── Section 1: Preparation Snapshot ─────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="snapshot-heading">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="snapshot-heading" className="min-w-0 text-sm font-bold text-neutral-500 uppercase tracking-widest">
            1. ข้อมูลแผนการทดลองต้นแบบ (Preparation Snapshot)
          </h2>
          <span className="text-xs text-neutral-400">Locked Snapshot</span>
        </div>

        {snapshotChangeReasons.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="font-bold">
                  ข้อมูล Preparation ปัจจุบันมีการเปลี่ยนแปลงหลังจากสร้าง Day 0
                </p>
                <p>
                  Day 0 ยังคงใช้ snapshot เดิมเพื่อรักษาประวัติการเริ่มทดลอง
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 p-4 space-y-3.5 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="font-semibold block text-neutral-400 mb-0.5">ชื่อแผนการทดลอง:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-bold">{state.trialSnapshot.trialName}</span>
            </div>
            <div>
              <span className="font-semibold block text-neutral-400 mb-0.5">พืชเป้าหมาย:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-bold">{state.trialSnapshot.cropName}</span>
            </div>
            <div>
              <span className="font-semibold block text-neutral-400 mb-0.5">Batch ตามแผน:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-bold">{state.trialSnapshot.batchName}</span>
            </div>
            <div>
              <span className="font-semibold block text-neutral-400 mb-0.5">จำนวนกิ่งรวมตามแผน:</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-bold">{state.trialSnapshot.totalCuttings} กิ่ง</span>
            </div>
          </div>
          <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/80">
            <p className="flex items-center gap-1 text-[10px] text-neutral-400">
              <Info className="h-3.5 w-3.5" />
              ข้อมูล Snapshot นี้ถูกบันทึกเมื่อกดปุ่มเริ่มและจะไม่เปลี่ยนตาม Preparation เดิม เพื่อประวัติวิจัยที่ถาวร
            </p>
            <p className="mt-1 text-[10px] font-semibold text-neutral-400">
              {savedTimestampLabel}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 2: Start Information ────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="start-info-heading">
        <h2 id="start-info-heading" className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          2. ข้อมูลการดำเนินงานจริง (Start Information)
        </h2>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                วันที่เริ่มทดลองจริง <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={state.startInfo.actualStartDate}
                onChange={(e) => updateStartInfo({ actualStartDate: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Start Time */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                เวลาเริ่มปักชำจริง
              </label>
              <input
                type="time"
                value={state.startInfo.actualStartTime}
                onChange={(e) => updateStartInfo({ actualStartTime: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Operator Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ผู้ควบคุมการทดลอง (Operator)
              </label>
              <input
                type="text"
                value={state.startInfo.operatorName}
                onChange={(e) => updateStartInfo({ operatorName: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="ระบุชื่อผู้ดำเนินการ"
              />
            </div>

            {/* Actual Location */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                สถานที่ดำเนินการจริง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={state.startInfo.location}
                onChange={(e) => updateStartInfo({ location: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น โรงเรือน A ชั้นวางที่ 2"
              />
            </div>
          </div>

          {/* Weather / Ambient */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              สภาพอากาศและระดับความแปรปรวนภายนอกโรงเรือน
            </label>
            <input
              type="text"
              value={state.startInfo.weatherInfo}
              onChange={(e) => updateStartInfo({ weatherInfo: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น มีเมฆมาก ฝนตกปรอยๆ ความชื้นสัมพัทธ์ในอากาศสูง"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              บันทึกข้อสังเกตเพิ่มเติมวันเริ่มต้น
            </label>
            <textarea
              rows={2}
              value={state.startInfo.notes}
              onChange={(e) => updateStartInfo({ notes: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="ข้อสังเกตทั่วไปเกี่ยวกับการเริ่มดำเนินการ..."
            />
          </div>
        </div>
      </section>

      {/* ─── Section 3: Source Plant Record ──────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="source-plant-heading">
        <h2 id="source-plant-heading" className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          3. ข้อมูลประวัติและสิ่งที่สังเกตได้จากต้นแม่พันธุ์กุหลาบ (Source Plant Record)
        </h2>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Source Plant ID */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                รหัสต้นแม่ (Source Plant ID)
              </label>
              <input
                type="text"
                value={state.sourcePlant.sourcePlantId}
                onChange={(e) => updateSourcePlant({ sourcePlantId: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น ROSE-MOTHER-001"
              />
            </div>

            {/* Cultivar Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  ชื่อพันธุ์กุหลาบ
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    id="unknown-cultivar"
                    checked={state.sourcePlant.isUnknownCultivar}
                    onChange={(e) =>
                      updateSourcePlant({
                        isUnknownCultivar: e.target.checked,
                        cultivarName: e.target.checked ? "ไม่ทราบสายพันธุ์แน่ชัด" : "",
                      })
                    }
                    className="h-3 w-3 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="unknown-cultivar" className="text-[10px] text-neutral-400 font-bold">
                    ไม่ทราบพันธุ์
                  </label>
                </div>
              </div>
              <input
                type="text"
                disabled={state.sourcePlant.isUnknownCultivar}
                value={state.sourcePlant.cultivarName}
                onChange={(e) => updateSourcePlant({ cultivarName: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-400"
                placeholder="เช่น Bishop's Castle"
              />
            </div>

            {/* Origin */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                แหล่งที่มากิ่งพันธุ์
              </label>
              <input
                type="text"
                value={state.sourcePlant.sourceOrigin}
                onChange={(e) => updateSourcePlant({ sourceOrigin: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น สวนกิ่งทอง หรือซื้อจากกาดคำเที่ยง"
              />
            </div>

            {/* Estimated Age */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                อายุต้นแม่พันธุ์โดยประมาณ
              </label>
              <input
                type="text"
                value={state.sourcePlant.estimatedAge}
                onChange={(e) => updateSourcePlant({ estimatedAge: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น 1 ปี 6 เดือน"
              />
            </div>

            {/* Health */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ประเมินสุขภาพต้นแม่พันธุ์ทั่วไป
              </label>
              <input
                type="text"
                value={state.sourcePlant.overallHealth}
                onChange={(e) => updateSourcePlant({ overallHealth: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น แข็งแรงดี ใบเขียวเข้ม ไม่มีใบร่วง"
              />
            </div>

            {/* Pests / Diseases */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ศัตรูพืชหรือโรคกุหลาบที่สังเกตพบในวันเริ่ม
              </label>
              <input
                type="text"
                value={state.sourcePlant.observedPestsOrDiseases}
                onChange={(e) => updateSourcePlant({ observedPestsOrDiseases: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น ไม่พบสิ่งผิดปกติ หรือมีรอยเพลี้ยไฟประปราย"
              />
            </div>

            {/* Fertilized Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                วันที่ได้รับปุ๋ยครั้งล่าสุด (ถ้าทราบ)
              </label>
              <input
                type="date"
                value={state.sourcePlant.lastFertilizedDate}
                onChange={(e) => updateSourcePlant({ lastFertilizedDate: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              />
            </div>

            {/* Sprayed Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                วันที่พ่นสารป้องกันกำจัดโรค/แมลงครั้งล่าสุด (ถ้าทราบ)
              </label>
              <input
                type="date"
                value={state.sourcePlant.lastSprayedDate}
                onChange={(e) => updateSourcePlant({ lastSprayedDate: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              หมายเหตุเชิงลึกต้นแม่พันธุ์
            </label>
            <textarea
              rows={2}
              value={state.sourcePlant.notes}
              onChange={(e) => updateSourcePlant({ notes: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="บันทึกสภาพทางสรีรวิทยาเพิ่มเติม..."
            />
          </div>
        </div>
      </section>

      {/* ─── Section 4: Cutting Setup ────────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="cutting-setup-heading">
        <h2 id="cutting-setup-heading" className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          4. ข้อมูลและคุณสมบัติทางกายภาพกิ่งปักชำจริง (Cutting Setup)
        </h2>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Actual Cutting Count */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                จำนวนกิ่งปักชำจริงที่ใช้ทดลอง <span className="text-rose-500">*</span>
                <span className="text-[10px] text-neutral-400 lowercase font-medium">
                  (ตามแผน: {state.trialSnapshot.totalCuttings} กิ่ง)
                </span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={state.cuttingSetup.actualCuttingCount || ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                  updateCuttingSetup({ actualCuttingCount: val });
                }}
                className={`w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border ${
                  (state.cuttingSetup.actualCuttingCount || 0) <= 0
                    ? "border-rose-300 dark:border-rose-900/60 focus:ring-rose-500"
                    : "border-neutral-200 dark:border-neutral-800 focus:ring-rose-500"
                } rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2`}
              />
              {(state.cuttingSetup.actualCuttingCount || 0) <= 0 && (
                <p className="text-xs text-rose-500">จำนวนกิ่งปักชำจริงต้องมากกว่า 0</p>
              )}
            </div>

            {/* Cutting Type Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ชนิดกิ่งพันธุ์โดยประมาณ
              </label>
              <input
                type="text"
                value={state.cuttingSetup.cuttingTypeDescription}
                onChange={(e) => updateCuttingSetup({ cuttingTypeDescription: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น กิ่งกึ่งแก่กึ่งอ่อน (semi-hardwood)"
              />
            </div>

            {/* Target Length */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ความยาวเป้าหมายเฉลี่ย (เซนติเมตร)
              </label>
              <input
                type="text"
                value={state.cuttingSetup.targetLengthCm}
                onChange={(e) => updateCuttingSetup({ targetLengthCm: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น 10-15"
              />
            </div>

            {/* Target Node Count */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                จำนวนข้อหรือตากิ่งเฉลี่ย
              </label>
              <input
                type="text"
                value={state.cuttingSetup.targetNodeCount}
                onChange={(e) => updateCuttingSetup({ targetNodeCount: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น 3-4"
              />
            </div>

            {/* Remaining Leaf Count */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                จำนวนใบที่คงไว้หลังลิดใบออก
              </label>
              <input
                type="text"
                value={state.cuttingSetup.remainingLeafCount}
                onChange={(e) => updateCuttingSetup({ remainingLeafCount: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น เหลือใบย่อย 2-3 ใบช่วงยอด"
              />
            </div>

            {/* Buds/Flowers Removed */}
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="buds-flowers-removed"
                checked={state.cuttingSetup.isBudsOrFlowersRemoved}
                onChange={(e) =>
                  updateCuttingSetup({ isBudsOrFlowersRemoved: e.target.checked })
                }
                className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="buds-flowers-removed" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                เด็ดดอกตูมและตาดอกออกทั้งหมดแล้ว
              </label>
            </div>
          </div>

          {/* Base Preparation */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              วิธีตัดแต่งและเตรียมนอกโคนกิ่ง
            </label>
            <input
              type="text"
              value={state.cuttingSetup.basePreparationMethod}
              onChange={(e) => updateCuttingSetup({ basePreparationMethod: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น กรีดแผลด้านข้างโคนกิ่ง 2 แผล หรือเฉือนปากฉลาม 45 องศา"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              หมายเหตุเพิ่มเติมความสมบูรณ์กิ่ง
            </label>
            <textarea
              rows={2}
              value={state.cuttingSetup.notes}
              onChange={(e) => updateCuttingSetup({ notes: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="สภาพแวดล้อมระหว่างกักกิ่งพันธุ์..."
            />
          </div>
        </div>
      </section>

      {/* ─── Section 5: Propagation Setup ────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="propagation-setup-heading">
        <h2 id="propagation-setup-heading" className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          5. สภาพและวัสดุอุปกรณ์ตั้งต้นระบบปักชำจริง (Propagation Setup)
        </h2>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5 space-y-5">
          {/* Subsection: Medium */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-900 pb-1.5">
              ข้อมูลวัสดุปักชำจริง (Propagation Medium) <span className="text-rose-500">*</span>
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  ชื่อวัสดุปักชำหลัก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.mediumName}
                  onChange={(e) => updatePropagationSetup({ mediumName: e.target.value })}
                  className={`w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border ${
                    !state.propagationSetup.mediumName.trim()
                      ? "border-rose-300 dark:border-rose-900/60 focus:ring-rose-500"
                      : "border-neutral-200 dark:border-neutral-800 focus:ring-rose-500"
                  } rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2`}
                  placeholder="เช่น เพอร์ไลต์ 100% หรือสูตรเพอร์ไลต์ผสมพีทมอส"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  ส่วนผสมอื่นๆ ที่ระบุได้
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.mediumIngredients}
                  onChange={(e) => updatePropagationSetup({ mediumIngredients: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น เพอร์ไลต์ ขุยมะพร้าวละเอียด"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  อัตราส่วนผสมจริง
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.mediumRatio}
                  onChange={(e) => updatePropagationSetup({ mediumRatio: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น 1:1 หรือ 70:30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  ระดับความชื้นแรกชำของวัสดุ
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.initialMediumMoisture}
                  onChange={(e) => updatePropagationSetup({ initialMediumMoisture: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น ชื้นหมาด พอดีไม่แฉะเกินไป"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                วิธีการจัดการล้างทำความสะอาด/ฆ่าเชื้อก่อนปักชำ
              </label>
              <textarea
                rows={2}
                value={state.propagationSetup.mediumPreparation}
                onChange={(e) => updatePropagationSetup({ mediumPreparation: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น การล้างฝุ่นออกและแช่สารป้องกันเชื้อราเบาๆ..."
              />
            </div>
          </div>

          {/* Subsection: Container */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-900 pb-1.5">
              ข้อมูลภาชนะชำจริง (Container Details)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  ประเภทภาชนะชำ
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.containerType}
                  onChange={(e) => updatePropagationSetup({ containerType: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น ถาดหลุมพลาสติก"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  ขนาดเฉลี่ย
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.containerSize}
                  onChange={(e) => updatePropagationSetup({ containerSize: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น ถ้วย 2 นิ้ว หรือ 4 ซม."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  จำนวนภาชนะจริง
                </label>
                <input
                  type="number"
                  min="0"
                  value={state.propagationSetup.containerQuantity === null ? "" : state.propagationSetup.containerQuantity}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                    updatePropagationSetup({ containerQuantity: val });
                  }}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="ไม่ระบุ"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has-drainage-holes"
                  checked={state.propagationSetup.hasDrainageHoles}
                  onChange={(e) =>
                    updatePropagationSetup({ hasDrainageHoles: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="has-drainage-holes" className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  มีรูระบายน้ำใต้ก้นภาชนะดี
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="one-cutting-per-container"
                  checked={state.propagationSetup.isOneCuttingPerContainer}
                  onChange={(e) =>
                    updatePropagationSetup({ isOneCuttingPerContainer: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="one-cutting-per-container" className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  ปักชำแยก 1 กิ่งต่อ 1 ภาชนะ
                </label>
              </div>
            </div>
          </div>

          {/* Subsection: Water */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-900 pb-1.5">
              ข้อมูลน้ำที่ใช้ปลูก (Water Record)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  แหล่งที่มาของน้ำ
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.waterSource}
                  onChange={(e) => updatePropagationSetup({ waterSource: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น น้ำประปาพักคลอรีน หรือน้ำกรอง RO"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">
                    pH น้ำ
                  </label>
                  <input
                    type="text"
                    value={state.propagationSetup.waterPh}
                    onChange={(e) => updatePropagationSetup({ waterPh: e.target.value })}
                    className="w-full px-2 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">
                    EC น้ำ (mS/cm)
                  </label>
                  <input
                    type="text"
                    value={state.propagationSetup.waterEc}
                    onChange={(e) => updatePropagationSetup({ waterEc: e.target.value })}
                    className="w-full px-2 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">
                    อุณหภูมิน้ำ (°C)
                  </label>
                  <input
                    type="text"
                    value={state.propagationSetup.waterTemp}
                    onChange={(e) => updatePropagationSetup({ waterTemp: e.target.value })}
                    className="w-full px-2 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                หมายเหตุข้อสังเกตเรื่องน้ำ
              </label>
              <input
                type="text"
                value={state.propagationSetup.waterNotes}
                onChange={(e) => updatePropagationSetup({ waterNotes: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="การผสมน้ำยาเร่งรากหรือการล้างคลอรีน..."
              />
            </div>
          </div>

          {/* Subsection: Humidity System */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-900 pb-1.5">
              ระบบรักษาความชื้นสัมพัทธ์ (Humidity Control)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  ระบบควบคุมหลัก
                </label>
                <select
                  value={state.propagationSetup.humiditySystemType}
                  onChange={(e) => updatePropagationSetup({ humiditySystemType: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                >
                  {Object.entries(HUMIDITY_SYSTEM_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  รูปแบบช่องเปิด/ระบายอากาศ
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.humidityVentType}
                  onChange={(e) => updatePropagationSetup({ humidityVentType: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น มีรูระบายปรับหมุน หรือพลาสติกเจาะรู"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  วิธีควบคุมเปิดระบายอากาศ
                </label>
                <input
                  type="text"
                  value={state.propagationSetup.humidityVentMethod}
                  onChange={(e) => updatePropagationSetup({ humidityVentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น เปิดฝาระบายเช้า-เย็น ครั้งละ 15 นาที"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 6: Environment Record ───────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="environment-heading">
        <h2 id="environment-heading" className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          6. ข้อมูลสภาพแวดล้อมโดยรอบในจุดทดลองจริง (Environment)
        </h2>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Light Source Indoor / Outdoor */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                สภาพแวดล้อมพื้นที่หลัก
              </label>
              <select
                value={state.environment.isIndoor ? "indoor" : "outdoor"}
                onChange={(e) => updateEnvironment({ isIndoor: e.target.value === "indoor" })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              >
                <option value="outdoor">กึ่งร่มสแลนกลางแจ้ง (Outdoor/Shed)</option>
                <option value="indoor">ในอาคาร/ห้องแล็บ (Indoor Lab)</option>
              </select>
            </div>

            {/* Shade Light Estimate */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ระดับแสงโดยประมาณ
              </label>
              <input
                type="text"
                value={state.environment.lightIntensityEstimate}
                onChange={(e) => updateEnvironment({ lightIntensityEstimate: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น แสงกรอง 50% หรือไฟปลูก LED 16 ชม."
              />
            </div>

            {/* Direct Sun chance */}
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="direct-sunlight"
                checked={state.environment.hasDirectSunlight}
                onChange={(e) => updateEnvironment({ hasDirectSunlight: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="direct-sunlight" className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                มีแสงแดดส่องกระทบโคนกิ่งโดยตรง
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Temp & Humidity if read */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-neutral-400" />
                  อุณหภูมิแวดล้อม (°C)
                </label>
                <input
                  type="text"
                  value={state.environment.temperatureCelsius}
                  onChange={(e) => updateEnvironment({ temperatureCelsius: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น 28.5 (หรือเขียน 'ไม่ได้วัด')"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                  <CloudSun className="h-3.5 w-3.5 text-neutral-400" />
                  ความชื้นสัมพัทธ์ (%)
                </label>
                <input
                  type="text"
                  value={state.environment.relativeHumidityPercent}
                  onChange={(e) => updateEnvironment({ relativeHumidityPercent: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                  placeholder="เช่น 65% (หรือเขียน 'ไม่ได้วัด')"
                />
              </div>
            </div>

            {/* Wind conditions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ลม / อัตราถ่ายเทอากาศ
              </label>
              <input
                type="text"
                value={state.environment.windConditions}
                onChange={(e) => updateEnvironment({ windConditions: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น ลมพัดโชยดี หรืออับลม"
              />
            </div>

            {/* Rain conditions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                ความเสี่ยงที่จะโดนน้ำฝน
              </label>
              <input
                type="text"
                value={state.environment.rainConditions}
                onChange={(e) => updateEnvironment({ rainConditions: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น มีโอกาสสาดกระเซ็นถ้าระดับฝนตกหนัก"
              />
            </div>

            {/* Rain protection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                อุปกรณ์ป้องกันฝน
              </label>
              <input
                type="text"
                value={state.environment.rainProtection}
                onChange={(e) => updateEnvironment({ rainProtection: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="เช่น มีสแลนกรองด้านบนและด้านข้างปิดพลาสติกใสกันฝนสาด"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 7: Treatment Confirmation ───────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="treatments-confirm-heading">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-500" />
            <h2 id="treatments-confirm-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              7. ข้อมูลสารทดสอบและจัดกลุ่มกิ่งจริง (Treatments Confirmation)
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Section D (Day 0)</span>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5 space-y-4 shadow-sm">
          {/* Treatments input setup */}
          <div className="space-y-4">
            {state.trialSnapshot.treatments.map((pt) => {
              const aTreatment = state.treatments.find((tr) => tr.code === pt.code);
              return (
                <div
                  key={pt.code}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/10"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs">
                      {pt.code}
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold">
                      ตามแผน: {pt.cuttingCount} กิ่ง | ปักชำจริง: {aTreatment?.cuttingCount || 0} กิ่ง
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Input name actual */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        สารเร่ง/วัสดุที่ใช้จริง
                      </label>
                      <input
                        type="text"
                        value={aTreatment?.inputName || ""}
                        onChange={(e) => updateActualTreatmentInput(pt.code, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                        placeholder="เช่น IBA 3000 ppm หรือเขียน 'ไม่ได้ใช้'"
                      />
                    </div>

                    {/* Actual count */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        จำนวนกิ่งปักชำจริงในกลุ่มนี้ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={aTreatment?.cuttingCount || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                          updateActualTreatmentCutting(pt.code, val);
                        }}
                        className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  {/* Notes / method */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      รายละเอียดการเตรียมและวิธีปฏิบัติจริง (เช่น แช่น้ำยากี่วินาที)
                    </label>
                    <input
                      type="text"
                      value={aTreatment?.notes || ""}
                      onChange={(e) => updateActualTreatmentNotes(pt.code, e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                      placeholder="เช่น จุ่มสารเร่งรากนาน 5 วินาทีก่อนปักชำ"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trial Unit generator trigger button */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-xs text-neutral-400 flex items-center gap-1">
              <Info className="h-4 w-4" />
              สร้างรหัสรายกิ่งตามจำนวนปักชำจริงในกลุ่ม
            </div>
            <button
              onClick={handleRegenerateTrialUnits}
              className="flex w-full items-center justify-center gap-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 sm:w-auto"
            >
              <Layers className="h-3.5 w-3.5" />
              สร้าง/อัปเดต รหัสกิ่งปักชำรายกิ่ง
            </button>
          </div>
        </div>
      </section>

      {/* ─── Section 8: Trial Units ──────────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="trial-units-heading">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Tag className="h-5 w-5 text-neutral-500" />
            <h2 id="trial-units-heading" className="min-w-0 text-base font-bold text-neutral-900 dark:text-white">
              8. บัญชีรหัสกิ่งปักชำรายตัว (Trial Units)
            </h2>
          </div>
          <span className="text-xs text-neutral-400">สร้างแล้ว {state.trialUnits.length} กิ่ง</span>
        </div>

        {state.trialUnits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 p-8 text-center text-xs text-neutral-400">
            <AlertTriangle className="h-8 w-8 text-neutral-300 dark:text-neutral-800 mx-auto mb-2" />
            ยังไม่มีรหัสกิ่งปักชำรายตัว กรุณากดปุ่ม &quot;สร้าง/อัปเดต รหัสกิ่งปักชำรายกิ่ง&quot; ในส่วนด้านบน
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {state.trialUnits.map((unit) => {
              return (
                <div
                  key={unit.id}
                  className="min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex min-w-0 flex-col gap-1 border-b border-neutral-100 dark:border-neutral-900 pb-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 break-all font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {unit.id}
                    </span>
                    <span className="w-fit px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-[10px] text-neutral-400 font-bold">
                      {unit.treatmentCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {/* Container Code */}
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">
                        รหัสกระถางปลูก
                      </label>
                      <input
                        type="text"
                        value={unit.containerCode}
                        onChange={(e) => updateTrialUnitField(unit.id, { containerCode: e.target.value })}
                        className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                        placeholder="เช่น POT-A1"
                      />
                    </div>

                    {/* Initial condition */}
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block">
                        สภาพเบื้องต้นกิ่งชำ
                      </label>
                      <input
                        type="text"
                        value={unit.initialCondition}
                        onChange={(e) => updateTrialUnitField(unit.id, { initialCondition: e.target.value })}
                        className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-0.5">
                    <input
                      type="text"
                      value={unit.notes}
                      onChange={(e) => updateTrialUnitField(unit.id, { notes: e.target.value })}
                      className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 focus:ring-rose-500 rounded text-xs text-neutral-500 dark:text-neutral-400 focus:outline-none focus:ring-1"
                      placeholder="บันทึกหมายเหตุเพิ่มเติมรายกิ่ง..."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Section 9: Observations, Interpretation, and Uncertainty ───────── */}
      <section className="space-y-3" aria-labelledby="obs-heading">
        <h2 id="obs-heading" className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          9. บันทึกการสังเกตเชิงลึกวันแรกปักชำ (Day 0 Observation)
        </h2>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5 space-y-4 shadow-sm">
          {/* Direct Observation */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="h-4 w-4" />
              การสังเกตโดยตรง (Direct Observation) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={state.observation.directObservation}
              onChange={(e) => updateObservationField({ directObservation: e.target.value })}
              className={`w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border ${
                !state.observation.directObservation.trim()
                  ? "border-rose-300 dark:border-rose-900/60 focus:ring-rose-500"
                  : "border-neutral-200 dark:border-neutral-800 focus:ring-rose-500"
              } rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2`}
              placeholder="สิ่งที่สังเกตเห็นทางกายภาพในวันเริ่มทดลองชำ เช่น 'กิ่งปักชำสีเขียวสดดีทุกข้อ, แผลตัดเฉียงประณีตดีไม่มีรอยฉีกขาดของเยื่อไม้, วัสดุชำเพอร์ไลต์ผสมพีทมอสอุ้มน้ำหมาดดีไม่เกาะตัวกันแน่น'"
            />
            {!state.observation.directObservation.trim() && (
              <p className="text-xs text-rose-500">กรุณาระบุบันทึกการสังเกตโดยตรงในวันตั้งต้นเพื่อเก็บข้อมูล</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Interpretation */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-neutral-400" />
                การตีความวิเคราะห์เบื้องต้น (Interpretation)
              </label>
              <textarea
                rows={2}
                value={state.observation.interpretation}
                onChange={(e) => updateObservationField({ interpretation: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="การวิเคราะห์เชิงลึกกิ่งพันธุ์..."
              />
            </div>

            {/* Uncertainty */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-neutral-400" />
                กรอบความไม่แน่นอนเชิงวิทยาศาสตร์ (Uncertainty)
              </label>
              <textarea
                rows={2}
                value={state.observation.uncertainty}
                onChange={(e) => updateObservationField({ uncertainty: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-xl text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
                placeholder="ความไม่แน่นอนวันแรกชำ..."
              />
            </div>
          </div>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200/50 dark:border-neutral-800/80">
            <p className="flex items-start gap-1 text-[10px] text-neutral-400 leading-relaxed">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                **มาตรฐาน GF-APP-075**: บันทึกการวิจัยต้องแยกส่วนระหว่าง <strong>สิ่งที่เห็น (Direct Observation)</strong> ออกจาก <strong>การตีความวิเคราะห์เชิงทฤษฎี</strong> เพื่อความน่าเชื่อถือทางวิทยาศาสตร์ขั้นสูงสุด
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 10: Deviations Log ──────────────────────────────────────── */}
      <section className="space-y-3" aria-labelledby="deviations-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 id="deviations-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              10. บันทึกประเด็นเบี่ยงเบนจากแผนการทดลอง (Deviation Log)
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runAutoDeviationsCheck}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors"
            >
              สแกนตรวจสอบออโต้
            </button>
            <button
              onClick={() => setAddDeviationOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มข้อเบี่ยงเบน
            </button>
          </div>
        </div>

        {state.deviations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 p-8 text-center text-xs text-neutral-400">
            ไม่มีข้อเบี่ยงเบนจากแผนการเตรียมตัวในการเริ่ม Day 0 (หรือกดปุ่มสแกนออโต้เพื่อเปรียบเทียบกิ่งปลูกจริงเทียบกับแผน)
          </div>
        ) : (
          <div className="space-y-3">
            {state.deviations.map((dev) => (
              <div
                key={dev.id}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 shadow-sm relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 flex-1 min-w-0">
                    <p className="font-bold text-neutral-800 dark:text-neutral-200 text-sm leading-snug">
                      หัวข้อ: {dev.area}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-neutral-50 dark:bg-neutral-900 p-2 rounded-lg">
                      <div>
                        <span className="text-neutral-400 block font-semibold">ตามแผน:</span>
                        <span className="text-neutral-700 dark:text-neutral-300 font-bold">{dev.plannedValue || "—"}</span>
                      </div>
                      <div>
                        <span className="text-rose-500 block font-semibold">ปฏิบัติจริง:</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{dev.actualValue || "—"}</span>
                      </div>
                    </div>
                    <p>
                      <span className="font-semibold text-neutral-400">เหตุผลความจำเป็น:</span> {dev.reason || "—"}
                    </p>
                    <p>
                      <span className="font-semibold text-neutral-400">คาดการณ์ผลกระทบ:</span> {dev.possibleImpact || "—"}
                    </p>
                    {dev.notes && (
                      <p>
                        <span className="font-semibold text-neutral-400">หมายเหตุเพิ่ม:</span> {dev.notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDeviation(dev.id)}
                    className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-neutral-400 hover:text-rose-600 shrink-0"
                    title="ลบรายการ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Section 11: Completion Validation Summary & Warnings ────────────── */}
      <section className="space-y-3" aria-labelledby="validation-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <h2 id="validation-heading" className="text-base font-bold text-neutral-900 dark:text-white">
              สรุปความสมบูรณ์ในการตั้งต้นการทดลอง
            </h2>
          </div>
          <span className="text-xs text-neutral-400">Completion Gate</span>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
          {validation.isValid ? (
            <div className="flex items-start gap-3.5 px-4 py-4 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/30">
              <Check className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 leading-snug">
                  ผ่านเกณฑ์ความสมบูรณ์ตั้งต้น Day 0 เรียบร้อย
                </p>
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/80 leading-relaxed font-semibold">
                  กรอกข้อมูลตั้งต้นและบันทึกกิ่งปักชำรายตัวเรียบร้อยครบทุกหัวข้อ สามารถกดทำเครื่องหมายเสร็จสมบูรณ์ได้
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3.5 px-4 py-4 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/30">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400 leading-snug">
                  ข้อมูลยังไม่ครบตามเกณฑ์ (Validation Gate Mismatch)
                </p>
                <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80 leading-relaxed font-semibold">
                  ยังมีเงื่อนไขบังคับเชิงลึกวิจัยสำหรับการตั้งต้น Day 0 ที่ยังไม่ถูกต้องหรือไม่ได้กรอกข้อมูล
                </p>
              </div>
            </div>
          )}

          {/* Validation Warnings List */}
          {validation.reasons.length > 0 && (
            <div className="p-4 bg-neutral-50/50 dark:bg-neutral-900/30">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
                จุดที่ต้องการดำเนินการแก้ไขก่อนส่งมอบ:
              </p>
              <ul className="space-y-1.5">
                {validation.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ─── Actions Buttons Toolbar ─────────────────────────────────────────── */}
      <section className="space-y-4" aria-label="แถบการดำเนินการสำหรับ Day 0">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Reset Day 0 Button */}
            <button
              onClick={() => setResetDialogOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-600 dark:text-neutral-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              รีเซ็ต Day 0
            </button>

            {/* Save Draft Button */}
            <button
              onClick={handleSave}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold border transition-colors ${
                isDirty
                  ? "bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:hover:bg-rose-900/30 dark:text-rose-400"
                  : "bg-neutral-50 border-neutral-200 text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-500"
              }`}
            >
              <Save className="h-4 w-4" />
              บันทึกร่าง Day 0
            </button>

            {/* Export Markdown Button */}
            <button
              onClick={handleExportMarkdown}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <FileText className="h-4 w-4" />
              ส่งออก Markdown
            </button>

            {/* Completed Gate Button */}
            <button
              onClick={() => setCompleteDialogOpen(true)}
              disabled={!validation.isValid}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all ${
                validation.isValid
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-200/50 dark:border-neutral-800/80 cursor-not-allowed"
              }`}
            >
              <Check className="h-4 w-4" />
              เสร็จสมบูรณ์ Day 0
            </button>
          </div>

          {isDirty && (
            <p className="mt-3 text-xs text-amber-500 font-semibold flex items-center gap-1 animate-pulse">
              <Info className="h-4 w-4" />
              พบประเด็นแก้ไขแบบร่าง Day 0 ที่ยังไม่บันทึก — กรุณากดปุ่ม &quot;บันทึกร่าง Day 0&quot; เพื่อเซฟเก็บลงบราวเซอร์
            </p>
          )}
        </div>
      </section>

      {/* ─── Add Custom Deviation Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={addDeviationOpen}
        title="บันทึกส่วนเบี่ยงเบนจากแผนการทดลอง"
        onClose={() => setAddDeviationOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-3">
          {/* Area */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              หัวข้อส่วนเบี่ยงเบน <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newDeviation.area}
              onChange={(e) => setNewDeviation((prev) => ({ ...prev, area: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น เปลี่ยนสัดส่วนสารเร่ง T1 หรือเปลี่ยนพื้นที่ชำ"
            />
          </div>

          {/* Planned Value */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              ค่าตามแผนที่ตั้งไว้ (Planned Value)
            </label>
            <input
              type="text"
              value={newDeviation.plannedValue}
              onChange={(e) => setNewDeviation((prev) => ({ ...prev, plannedValue: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น แอร์ 25 องศา"
            />
          </div>

          {/* Actual Value */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              ค่าที่เกิดขึ้นจริงหน้างาน (Actual Value)
            </label>
            <input
              type="text"
              value={newDeviation.actualValue}
              onChange={(e) => setNewDeviation((prev) => ({ ...prev, actualValue: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น อุณหภูมิห้องจริง 29 องศา"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              สาเหตุความจำเป็น
            </label>
            <input
              type="text"
              value={newDeviation.reason}
              onChange={(e) => setNewDeviation((prev) => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น เครื่องปรับอากาศในแล็บชำเสียหายชั่วคราว"
            />
          </div>

          {/* Possible Impact */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              คาดการณ์ผลกระทบเชิงวิจัย
            </label>
            <input
              type="text"
              value={newDeviation.possibleImpact}
              onChange={(e) => setNewDeviation((prev) => ({ ...prev, possibleImpact: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:ring-rose-500 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2"
              placeholder="เช่น คาดว่าจะส่งผลให้อัตราความชื้นในโดมระเหยเร็วกว่าปกติ"
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3.5 pt-4 border-t border-neutral-100 dark:border-neutral-900">
            <button
              type="button"
              onClick={() => setAddDeviationOpen(false)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={addCustomDeviation}
              disabled={!newDeviation.area.trim()}
              className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-bold transition-all disabled:opacity-50"
            >
              บันทึกข้อเบี่ยงเบน
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Reset Confirmation Dialog ────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        title="รีเซ็ตข้อมูล Day 0 ใหม่ทั้งหมด?"
        message="การกระทำนี้จะล้างข้อมูลที่คุณกรอกในหน้าสรุปตั้งต้นนี้ทั้งหมด รวมถึงประวัติแบบร่างใน localStorage และกลับไปกัก snapshot เริ่มแรกใหม่จากการเตรียมพร้อม คุณต้องการยืนยันใช่หรือไม่?"
        confirmText="ยืนยันการล้างข้อมูล"
        cancelText="ยกเลิก"
        danger
        onConfirm={handleResetConfirm}
        onCancel={() => setResetDialogOpen(false)}
      />

      {/* ─── Complete Gate Confirmation Dialog ─────────────────────────────────── */}
      <ConfirmDialog
        isOpen={completeDialogOpen}
        title="ยืนยันบันทึก Day 0 เสร็จสมบูรณ์?"
        message={`เมื่อเสร็จสมบูรณ์แล้ว ระบบจะบันทึกสถานะการตั้งต้นการทดลองวิจัยกุหลาบอย่างเป็นทางการเพื่อเริ่มนับ Timeline การปักชำ\n\n- ยอดกิ่งรวมที่ใช้จริง: ${state.cuttingSetup.actualCuttingCount} กิ่ง\n- รหัสกิ่งประจำตัว: ROSE-${state.batch.batchName || "B1"}-... (จัดลำดับถูกต้อง)\n\nคุณต้องการยืนยันการตั้งต้นวิจัยนี้ใช่หรือไม่?`}
        confirmText="เสร็จสมบูรณ์ Day 0"
        cancelText="ยกเลิก"
        onConfirm={handleCompleteConfirm}
        onCancel={() => setCompleteDialogOpen(false)}
      />

      {/* ─── Regenerate Confirm Modal ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={generateConfirmOpen}
        title="มีรหัสกิ่งปักชำรายตัวเดิมอยู่แล้ว ยืนยันการจัดเรียงใหม่?"
        message={`ระบบจะจัดสร้างรายการกิ่งใหม่ตามจำนวนกิ่งจริงในแต่ละ Treatment
ข้อมูลของรหัสกิ่งที่ยังตรงกันจะถูกเก็บไว้
รายการที่เกินจากจำนวนใหม่อาจถูกนำออก`}
        confirmText="ยืนยันจัดเรียงใหม่"
        cancelText="ยกเลิก"
        onConfirm={executeRegenerateTrialUnits}
        onCancel={() => setGenerateConfirmOpen(false)}
      >
        <div className="pt-2 text-xs text-rose-500 font-semibold">
          * ข้อแนะนำ: ตรวจสอบจำนวนกิ่งรวมจริงในแต่ละ Treatment ให้ถูกต้องก่อนกดยืนยัน
        </div>
      </ConfirmDialog>

      <Modal
        isOpen={exportPreview !== null}
        title="ตัวอย่าง Markdown — Day 0"
        onClose={() => setExportPreview(null)}
        maxWidth="max-w-3xl"
      >
        {exportPreview && (
          <div className="space-y-4 pt-3">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              สร้างเมื่อ:{" "}
              {new Date(exportPreview.generatedAt).toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <textarea
              readOnly
              value={exportPreview.markdown}
              className="h-[55vh] w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-700 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setExportPreview(null)}
                className="rounded-xl border border-neutral-200 px-5 py-2.5 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handleCopyMarkdownPreview}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-rose-700"
              >
                คัดลอก Markdown
              </button>
            </div>
          </div>
        )}
      </Modal>

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
