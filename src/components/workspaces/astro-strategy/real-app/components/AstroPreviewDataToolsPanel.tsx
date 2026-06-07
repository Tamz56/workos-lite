"use client";

import * as React from "react";
import { Database, Trash2, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, Play, Info } from "lucide-react";
import { buildLegacyMigrationDryRunReport, migrateReadyLegacyKeysWithConfirmation } from "../data/astroRealAppMigrationDryRunAdapter";
import { MigrationDryRunReport, MigrationExecutionResult } from "../data/astroRealAppTypes";
import { resetAstroBirthProfileToDefault } from "../data/astroRealAppBirthProfileStorageAdapter";

export type AstroPreviewDataToolsPanelProps = {
  onResetHistory: () => void;
  onResetPlanning: () => void;
  onResetDraft: () => void;
  onResetAll: () => void;
};

const KEYS = {
  REFLECTION_HISTORY: "astro-real-app:reflection-history:v1",
  PLANNING_NOTES: "astro-real-app:planning-notes:v1",
  REFLECTION_DRAFT: "astro-real-app:reflection-draft:v1",
  BIRTH_PROFILE: "astro-real-app:birth-profile:v1",
};

export function AstroPreviewDataToolsPanel({
  onResetHistory,
  onResetPlanning,
  onResetDraft,
  onResetAll,
}: AstroPreviewDataToolsPanelProps) {
  const [statuses, setStatuses] = React.useState<Record<string, boolean>>({
    history: false,
    planning: false,
    draft: false,
    birthProfile: false,
  });
  const [birthProfileMeta, setBirthProfileMeta] = React.useState<{
    version?: number;
    updatedAt?: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [report, setReport] = React.useState<MigrationDryRunReport | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [execResult, setExecResult] = React.useState<MigrationExecutionResult | null>(null);

  const updateStatuses = React.useCallback(() => {
    if (typeof window !== "undefined") {
      setStatuses({
        history: localStorage.getItem(KEYS.REFLECTION_HISTORY) !== null,
        planning: localStorage.getItem(KEYS.PLANNING_NOTES) !== null,
        draft: localStorage.getItem(KEYS.REFLECTION_DRAFT) !== null,
        birthProfile: localStorage.getItem(KEYS.BIRTH_PROFILE) !== null,
      });

      const bpRaw = localStorage.getItem(KEYS.BIRTH_PROFILE);
      if (bpRaw) {
        try {
          const parsed = JSON.parse(bpRaw);
          setBirthProfileMeta({
            version: parsed.version,
            updatedAt: parsed.updatedAt,
          });
        } catch {
          setBirthProfileMeta(null);
        }
      } else {
        setBirthProfileMeta(null);
      }
    }
  }, []);

  React.useEffect(() => {
    updateStatuses();
    // Listen for storage events (if modified in other tabs)
    window.addEventListener("storage", updateStatuses);
    return () => window.removeEventListener("storage", updateStatuses);
  }, [updateStatuses]);

  const showFeedback = (msg: string) => {
    setStatusMessage(msg);
    updateStatuses();
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const handleAction = (label: string, callback: () => void) => {
    const confirmedAction = window.confirm(`คุณต้องการลบ/รีเซ็ต "${label}" ใช่หรือไม่? การกระทำนี้จะมีผลทันทีและไม่สามารถเรียกคืนได้`);
    if (confirmedAction) {
      callback();
      showFeedback(`รีเซ็ต "${label}" สำเร็จ`);
    }
  };

  const handleResetBirthProfile = () => {
    const confirmedAction = window.confirm("คุณต้องการรีเซ็ตโปรไฟล์วันเกิดเป็นค่าเริ่มต้น (คุณตั้ม) ใช่หรือไม่?");
    if (confirmedAction) {
      const res = resetAstroBirthProfileToDefault();
      if (res.success) {
        showFeedback("รีเซ็ตโปรไฟล์วันเกิดสำเร็จ");
      } else {
        showFeedback(`รีเซ็ตล้มเหลว: ${res.error}`);
      }
    }
  };

  const handleRunDryRun = () => {
    const r = buildLegacyMigrationDryRunReport();
    setReport(r);
    showFeedback("สแกนข้อมูลเดิม (Dry Run) สำเร็จ");
  };

  const handleExecuteMigration = () => {
    const result = migrateReadyLegacyKeysWithConfirmation();
    setExecResult(result);
    updateStatuses();
    // Refresh the dry-run report to show targets now exist (skip-target-exists instead of ready)
    const updatedReport = buildLegacyMigrationDryRunReport();
    setReport(updatedReport);
    showFeedback(`โอนย้ายสำเร็จ คัดลอกแล้ว ${result.copiedCount} รายการ`);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> เครื่องมือจัดการข้อมูลพรีวิว (Data & Safety Tools)
          </h3>
          <p className="text-xs text-slate-300">ตรวจสอบ ตรวจสอบสถานะการจัดเก็บ และล้างข้อมูลจำลองเพื่อการพัฒนาและทดสอบ</p>
        </div>
      </div>

      {/* Safety Warning */}
      <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-200">
          <p className="font-semibold text-[13px]">คำเตือนความปลอดภัย (Safety Scope Boundary)</p>
          <p className="leading-relaxed">
            ปุ่มควบคุมการล้างข้อมูลเหล่านี้จะส่งผลกระทบต่อข้อมูล **Namespace ของหน้า Preview (`astro-real-app:`)** เท่านั้น
            ระบบจะไม่ไปอ่าน เขียน หรือลบข้อมูลใด ๆ ที่เป็นของหน้าโปรโตไทป์หลัก หรือระบบผู้ใช้งานหลัก เพื่อป้องกันการทำข้อมูลงานจริงสูญหาย
          </p>
        </div>
      </div>

      {/* Key Status List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">คีย์ตรวจวัดข้อมูล (LocalStorage Keys Status)</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. History */}
          <div className="bg-slate-950/70 border border-slate-750 p-4 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono block break-all">{KEYS.REFLECTION_HISTORY}</span>
              <p className="text-xs font-semibold text-slate-200">Reflection History (ประวัติสะท้อนคิด)</p>
              <div className="flex items-center gap-1 text-[11px] pt-1">
                {statuses.history ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> มีข้อมูลเก็บอยู่ (Exists)
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> ว่างเปล่า / ใช้ค่า Mock
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAction("ประวัติสะท้อนคิด (Reflection History)", onResetHistory)}
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้างเฉพาะประวัติ
            </button>
          </div>

          {/* 2. Planning Notes */}
          <div className="bg-slate-950/70 border border-slate-750 p-4 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono block break-all">{KEYS.PLANNING_NOTES}</span>
              <p className="text-xs font-semibold text-slate-200">Planning Notes (แผนเชิงกลยุทธ์)</p>
              <div className="flex items-center gap-1 text-[11px] pt-1">
                {statuses.planning ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> มีข้อมูลเก็บอยู่ (Exists)
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> ว่างเปล่า / ใช้ค่า Mock
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAction("แผนงานเชิงกลยุทธ์ (Planning Notes)", onResetPlanning)}
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้างเฉพาะแผนงาน
            </button>
          </div>

          {/* 3. Reflection Draft */}
          <div className="bg-slate-950/70 border border-slate-750 p-4 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono block break-all">{KEYS.REFLECTION_DRAFT}</span>
              <p className="text-xs font-semibold text-slate-200">Reflection Draft (ดราฟต์พิมพ์ค้าง)</p>
              <div className="flex items-center gap-1 text-[11px] pt-1">
                {statuses.draft ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> มีข้อมูลเก็บอยู่ (Exists)
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> ไม่มีดราฟต์ชั่วคราว
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAction("ดราฟต์ชั่วคราว (Reflection Draft)", onResetDraft)}
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้างเฉพาะดราฟต์
            </button>
          </div>

          {/* 4. Birth Profile */}
          <div className="bg-slate-950/70 border border-slate-750 p-4 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono block break-all">{KEYS.BIRTH_PROFILE}</span>
              <p className="text-xs font-semibold text-slate-200">Birth Profile (โปรไฟล์วันเกิด)</p>
              <div className="flex flex-col gap-1 text-[11px] pt-1">
                {statuses.birthProfile ? (
                  <>
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> มีข้อมูลเก็บอยู่ (Exists)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      v{birthProfileMeta?.version ?? "1"} | {birthProfileMeta?.updatedAt ? new Date(birthProfileMeta.updatedAt).toLocaleTimeString("en-GB") : "-"}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-405 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> ใช้ค่าตั้งต้น (คุณตั้ม)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleResetBirthProfile}
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-indigo-950/30 text-slate-300 hover:text-indigo-300 border border-slate-700 hover:border-indigo-900/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> รีเซ็ตโปรไฟล์ตั้งต้น
            </button>
          </div>
        </div>
      </div>

      {/* Legacy Migration Dry Run Section */}
      <div className="border-t border-slate-700/60 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-450" /> ตรวจสอบการโอนย้ายข้อมูลเดิม (Legacy Migration Dry Run)
            </h4>
            <p className="text-xs text-slate-300">
              จำลองการโอนย้ายข้อมูลจากระบบโปรโตไทป์เดิมเพื่อตรวจสอบความพร้อมก่อนแทนที่เพจจริง
            </p>
          </div>
          <button
            onClick={handleRunDryRun}
            className="py-2 px-4 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> จำลองการโอนย้าย (Run Dry Run)
          </button>
        </div>

        {/* Safety Note */}
        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl flex items-center gap-2 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span><strong>หมายเหตุความปลอดภัย</strong>: ทดสอบระบบแห้ง (Dry Run) เท่านั้น ไม่มีการคัดลอก ลบ หรือเขียนทับข้อมูลจริงใด ๆ ในระบบทั้งสิ้น</span>
        </div>

        {/* Report Results */}
        {report && (
          <div className="space-y-4 animate-fadeIn">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Legacy Keys Found</span>
                <span className="text-lg font-bold text-slate-200">{report.legacyKeysFound.length}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Ready to Migrate</span>
                <span className="text-lg font-bold text-emerald-450">
                  {report.mappings.filter(m => m.status === "ready").length}
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Skipped (Target Exists)</span>
                <span className="text-lg font-bold text-amber-400">
                  {report.mappings.filter(m => m.status === "skip-target-exists").length}
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Parse Errors</span>
                <span className="text-lg font-bold text-rose-450">
                  {report.mappings.filter(m => m.status === "parse-error").length}
                </span>
              </div>
            </div>

            {/* Mappings Detail Table */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold">
                      <th className="p-3">คีย์เดิม (Legacy Key)</th>
                      <th className="p-3">คีย์เป้าหมาย (Target Key)</th>
                      <th className="p-3">ขนาด (Bytes) / โครงสร้าง</th>
                      <th className="p-3 text-center">สถานะ</th>
                      <th className="p-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {report.mappings.map((m, idx) => {
                      let statusBadge = "bg-slate-900 text-slate-450 border-slate-800";
                      if (m.status === "ready") statusBadge = "bg-emerald-950/30 text-emerald-300 border-emerald-800/40";
                      if (m.status === "skip-target-exists") statusBadge = "bg-amber-950/30 text-amber-300 border-amber-800/40";
                      if (m.status === "parse-error") statusBadge = "bg-rose-950/30 text-rose-300 border-rose-800/40";

                      return (
                        <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-mono text-[10px] text-slate-400 break-all select-all">
                            {m.legacyKey}
                            {m.legacyExists && (
                              <span className="ml-1.5 px-1 bg-indigo-950 text-indigo-300 rounded text-[9px]">Exists</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400 break-all">
                            {m.targetKey}
                            {m.targetExists && (
                              <span className="ml-1.5 px-1 bg-teal-950 text-teal-300 rounded text-[9px]">Target Exists</span>
                            )}
                          </td>
                          <td className="p-3">
                            {m.legacyExists ? (
                              <span className="font-mono text-[11px]">
                                {m.bytesDetected} B
                                {m.itemCount !== undefined && ` (${m.itemCount} item${m.itemCount > 1 ? "s" : ""})`}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 border rounded-full text-[10px] font-semibold tracking-wide ${statusBadge}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 text-[11px] leading-tight">{m.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Controlled Migration Flow Block */}
        {(() => {
          const hasReadyItems = report !== null && report.mappings.some(m => m.status === "ready");
          const isButtonDisabled = !report || !hasReadyItems || !confirmed;
          const isCheckboxDisabled = !report || !hasReadyItems;

          return (
            <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-xl space-y-4 mt-4">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  ดำเนินการโอนย้ายข้อมูลจริง (Legacy Data Migration Execution)
                </h5>
                <p className="text-[11px] text-slate-400">
                  {isCheckboxDisabled
                    ? "กรุณากด 'จำลองการโอนย้าย (Run Dry Run)' ก่อนเพื่อสแกนและยืนยันข้อมูลพร้อมย้าย"
                    : "ระบบตรวจพบข้อมูลเดิมที่พร้อมโอนย้าย คุณสามารถดำเนินการคัดลอกข้อมูลมายังระบบใหม่ได้ตามกฎความปลอดภัย"}
                </p>
              </div>

              {/* Warning Callout */}
              <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-lg text-[11px] text-indigo-300">
                <strong>คำแนะนำความปลอดภัย</strong>: การโอนย้ายนี้จะทำงานแบบ <strong>Copy-Only</strong> โดยจะเขียนข้อมูลเฉพาะคีย์เป้าหมายแอปใหม่ที่ยังไม่มีการจัดเก็บข้อมูลใดๆ เท่านั้น จะไม่มีการลบหรือดัดแปลงข้อมูลประวัติในระบบดั้งเดิมใดๆ ทั้งสิ้น
              </div>

              {/* Checkbox & Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <label className={`flex items-start gap-2.5 text-xs max-w-lg select-none ${isCheckboxDisabled ? "text-slate-500 cursor-not-allowed" : "text-slate-350 cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={confirmed && !isCheckboxDisabled}
                    disabled={isCheckboxDisabled}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50"
                  />
                  <span>ฉันเข้าใจและยอมรับว่าการกระทำนี้จะคัดลอกข้อมูลเดิมเฉพาะจุดที่พร้อมใช้งานเท่านั้น และไม่มีการลบข้อมูลระบบเก่าออก</span>
                </label>

                <button
                  disabled={isButtonDisabled}
                  onClick={handleExecuteMigration}
                  className={`py-2 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    !isButtonDisabled
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                      : "bg-slate-850 text-slate-500 border border-slate-800/60 cursor-not-allowed"
                  }`}
                >
                  คัดลอกข้อมูลที่พร้อมใช้งาน (Copy Ready Legacy Data)
                </button>
              </div>

              {/* Execution Result Report */}
              {execResult && (
                <div className="mt-4 bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-200">ผลลัพธ์การโอนย้ายข้อมูล (Migration Result)</span>
                    <span className="text-[10px] text-slate-550 font-mono">{execResult.timestamp}</span>
                  </div>

                  {/* Summary Row */}
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-emerald-400">คัดลอกสำเร็จ: {execResult.copiedCount} รายการ</span>
                    <span className="text-slate-400">ข้าม: {execResult.skippedCount} รายการ</span>
                    {execResult.failedCount > 0 && <span className="text-rose-450">ล้มเหลว: {execResult.failedCount} รายการ</span>}
                  </div>

                  {/* Key Execution List */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/40 text-[11px] font-mono space-y-1">
                    {execResult.items.map((item, idx) => {
                      let statusColor = "text-slate-400";
                      if (item.status === "copied") statusColor = "text-emerald-400 font-bold";
                      if (item.status.startsWith("skipped-")) statusColor = "text-slate-500";
                      if (item.status === "failed") statusColor = "text-rose-400 font-bold";

                      return (
                        <div key={idx} className="py-1.5 flex flex-col sm:flex-row justify-between gap-1">
                          <div className="truncate text-slate-400 select-all max-w-sm" title={item.legacyKey}>
                            {item.legacyKey} → {item.targetKey}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={statusColor}>{item.status}</span>
                            {item.bytesTransferred !== undefined && (
                              <span className="text-slate-600 text-[10px]">({item.bytesTransferred} B)</span>
                            )}
                            {item.error && <span className="text-rose-550 text-[10px]" title={item.error}>{item.error}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Global Actions */}
      <div className="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {statusMessage ? (
          <span className="text-xs text-emerald-400 font-medium animate-pulse flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {statusMessage}
          </span>
        ) : (
          <span className="text-xs text-slate-300">
            ระบบเก็บข้อมูลแยกส่วน สามารถกดล้างคีย์ทั้งหมดเพื่อตั้งต้นใหม่เป็นข้อมูล Mock ได้เสมอ
          </span>
        )}

        <button
          onClick={() => handleAction("ข้อมูล Preview ทั้งหมด (Reset All Preview Data)", onResetAll)}
          className="py-2.5 px-5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-200 hover:text-rose-100 border border-rose-800/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm self-end"
        >
          <Trash2 className="w-4 h-4 text-rose-400" /> ล้างข้อมูลพรีวิวทั้งหมด (Reset All Data)
        </button>
      </div>
    </div>
  );
}
