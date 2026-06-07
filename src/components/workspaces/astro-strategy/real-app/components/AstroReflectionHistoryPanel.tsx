"use client";

import * as React from "react";
import { History, ClipboardList, Trash2, RefreshCw } from "lucide-react";

export interface ReflectionHistoryItem {
  id: string;
  version: number;
  createdAt: string;
  updatedAt?: string;
  reflectionDate: string;
  reflectionMode: string;
  reflectionSummary: string;
  noticedNotes: string;
  nextRightAction: string;
  strategyMode: string;
  dailyCheckinSnapshot: {
    energyLevel: string;
    clarityLevel: string;
    workloadPressure: string;
    focusCondition: string;
    bodySignal: string;
    todayIntention: string;
    cautionNote: string;
  };
  markdownSnapshot: string;
}

export type AstroReflectionHistoryPanelProps = {
  historyLogs?: ReflectionHistoryItem[];
  historySaveStatus?: string;
  copiedAllHistoryStatus?: string;
  copiedHistoryId?: string | null;
  
  onCopyAllHistory?: () => void;
  onClearAllHistory?: () => void;
  onCopyHistoryItem?: (item: ReflectionHistoryItem) => void;
  onLoadFromHistory?: (item: ReflectionHistoryItem) => void;
  onDeleteFromHistory?: (id: string) => void;
};

const MOCK_HISTORY_LOGS: ReflectionHistoryItem[] = [
  {
    id: "h1",
    version: 1,
    createdAt: "2026-06-01 10:00:00",
    reflectionDate: "2026-06-01",
    reflectionMode: "Focus",
    reflectionSummary: "ทดลองทำตามคำแนะนำการจัดระบบงานในจังหวะประคองและจัดระบบ",
    noticedNotes: "รู้สึกทำงานอย่างเป็นระบบขึ้นเมื่อจัดเวลาทำทีละงานย่อยตามลำดับ",
    nextRightAction: "เขียนเอกสารแผนการพัฒนาต่อวันพรุ่งนี้",
    strategyMode: "Stabilize & Structure",
    dailyCheckinSnapshot: {
      energyLevel: "steady",
      clarityLevel: "clear",
      workloadPressure: "normal",
      focusCondition: "deep_focus",
      bodySignal: "normal",
      todayIntention: "จัดโครงสร้างโฟลเดอร์สำหรับโมดูลแอปจริง",
      cautionNote: ""
    },
    markdownSnapshot: ""
  },
  {
    id: "h2",
    version: 1,
    createdAt: "2026-05-28 15:30:00",
    reflectionDate: "2026-05-28",
    reflectionMode: "Restore",
    reflectionSummary: "ใช้เวลาช่วงบ่ายพักตามแผน ปฏิเสธงานด่วนที่สามารถเลื่อนได้ไปก่อน",
    noticedNotes: "ช่วยลดความล้าของสมองและไม่เกิดอาการหมดไฟเมื่อต้องลุยงานดึก",
    nextRightAction: "ทบทวนแผนระยะยาวร่วมกับทีม",
    strategyMode: "Pause & Calibrate",
    dailyCheckinSnapshot: {
      energyLevel: "low",
      clarityLevel: "moderate",
      workloadPressure: "heavy",
      focusCondition: "recovery",
      bodySignal: "tense",
      todayIntention: "ประคองงานค้างและปิดหน้าจอให้เร็วขึ้น",
      cautionNote: "ตึงหลังช่วงบ่าย"
    },
    markdownSnapshot: ""
  }
];

export function AstroReflectionHistoryPanel({
  historyLogs = MOCK_HISTORY_LOGS,
  historySaveStatus = "",
  copiedAllHistoryStatus = "",
  copiedHistoryId = null,
  onCopyAllHistory,
  onClearAllHistory,
  onCopyHistoryItem,
  onLoadFromHistory,
  onDeleteFromHistory,
}: AstroReflectionHistoryPanelProps) {
  // Filters State
  const [historySearchQuery, setHistorySearchQuery] = React.useState("");
  const [historyModeFilter, setHistoryModeFilter] = React.useState("all");
  const [historyEnergyFilter, setHistoryEnergyFilter] = React.useState("all");
  const [historyMonthFilter, setHistoryMonthFilter] = React.useState("all");

  const [localCopiedHistoryId, setLocalCopiedHistoryId] = React.useState<string | null>(null);
  const [localCopiedAllHistory, setLocalCopiedAllHistory] = React.useState(false);

  // Derived values
  const uniqueModes = React.useMemo(() => {
    return Array.from(
      new Set(
        historyLogs
          .flatMap((log) => [log.reflectionMode, log.strategyMode])
          .filter(Boolean)
      )
    );
  }, [historyLogs]);

  const uniqueEnergies = React.useMemo(() => {
    return Array.from(
      new Set(
        historyLogs
          .map((log) => log.dailyCheckinSnapshot?.energyLevel)
          .filter(Boolean)
      )
    );
  }, [historyLogs]);

  const filteredHistoryLogs = React.useMemo(() => {
    return historyLogs.filter((log) => {
      if (historySearchQuery.trim()) {
        const query = historySearchQuery.toLowerCase();
        const reflectionSummaryText = (log.reflectionSummary || "").toLowerCase();
        const noticedNotesText = (log.noticedNotes || "").toLowerCase();
        const nextRightActionText = (log.nextRightAction || "").toLowerCase();
        const intentionText = (log.dailyCheckinSnapshot?.todayIntention || "").toLowerCase();
        const cautionNoteText = (log.dailyCheckinSnapshot?.cautionNote || "").toLowerCase();
        const reflectionModeText = (log.reflectionMode || "").toLowerCase();
        const strategyModeText = (log.strategyMode || "").toLowerCase();

        const matchesText =
          reflectionSummaryText.includes(query) ||
          noticedNotesText.includes(query) ||
          nextRightActionText.includes(query) ||
          intentionText.includes(query) ||
          cautionNoteText.includes(query) ||
          reflectionModeText.includes(query) ||
          strategyModeText.includes(query);

        if (!matchesText) return false;
      }

      if (historyModeFilter !== "all") {
        const matchesMode = log.reflectionMode === historyModeFilter || log.strategyMode === historyModeFilter;
        if (!matchesMode) return false;
      }

      if (historyEnergyFilter !== "all") {
        const matchesEnergy = log.dailyCheckinSnapshot?.energyLevel === historyEnergyFilter;
        if (!matchesEnergy) return false;
      }

      if (historyMonthFilter !== "all") {
        const dateStr = log.reflectionDate || log.createdAt;
        if (!dateStr) return false;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return false;
          const now = new Date();
          if (historyMonthFilter === "this-month") {
            const matchesThisMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            if (!matchesThisMonth) return false;
          } else if (historyMonthFilter === "last-month") {
            let targetYear = now.getFullYear();
            let targetMonth = now.getMonth() - 1;
            if (targetMonth < 0) {
              targetMonth = 11;
              targetYear -= 1;
            }
            const matchesLastMonth = d.getFullYear() === targetYear && d.getMonth() === targetMonth;
            if (!matchesLastMonth) return false;
          }
        } catch {
          return false;
        }
      }

      return true;
    });
  }, [historyLogs, historySearchQuery, historyModeFilter, historyEnergyFilter, historyMonthFilter]);

  const handleCopyItem = (item: ReflectionHistoryItem) => {
    if (onCopyHistoryItem) {
      onCopyHistoryItem(item);
    } else {
      navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      setLocalCopiedHistoryId(item.id);
      setTimeout(() => setLocalCopiedHistoryId(null), 2000);
    }
  };

  const handleCopyAll = () => {
    if (onCopyAllHistory) {
      onCopyAllHistory();
    } else {
      navigator.clipboard.writeText(JSON.stringify(historyLogs, null, 2));
      setLocalCopiedAllHistory(true);
      setTimeout(() => setLocalCopiedAllHistory(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4.5 h-4.5 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-200">ประวัติการสะท้อนคิดย้อนหลัง (Reflection History - {historyLogs.length}/20)</h4>
        </div>
        {historyLogs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleCopyAll}
              className="text-[10px] text-indigo-400 hover:text-indigo-350 active:text-indigo-500 font-semibold transition-colors flex items-center gap-1 border border-indigo-500/20 px-2.5 py-1 rounded bg-indigo-950/10 hover:bg-indigo-950/20 active:scale-[0.98]"
            >
              <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
              {copiedAllHistoryStatus ? copiedAllHistoryStatus : (localCopiedAllHistory ? "คัดลอกเรียบร้อย!" : "คัดลอกประวัติทั้งหมด")}
            </button>
            <button
              type="button"
              onClick={onClearAllHistory}
              className="text-[10px] text-rose-400 hover:text-rose-350 active:text-rose-500 font-semibold transition-colors flex items-center gap-1 border border-rose-500/20 px-2 py-1 rounded bg-rose-955/10 hover:bg-rose-955/20 active:scale-[0.98]"
            >
              <Trash2 className="w-3 h-3" /> ล้างประวัติทั้งหมด
            </button>
          </div>
        )}
      </div>

      {historySaveStatus && (
        <div className="text-xs text-indigo-350 font-medium animate-pulse">
          {historySaveStatus}
        </div>
      )}

      {historyLogs.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-slate-700 rounded-xl bg-slate-950/40 text-slate-300 italic space-y-1.5">
          <p className="text-xs">ยังไม่มีบันทึกประวัติการสะท้อนคิดถาวร</p>
          <p className="text-[10px] text-slate-300 max-w-xs mx-auto leading-relaxed not-italic">
            คุณสามารถเก็บบริบทและบันทึกของวันนี้ไว้เพื่อสังเกตแนวโน้มเชิงกลยุทธ์ย้อนหลัง โดยการกดปุ่ม <strong className="text-indigo-400 font-medium">&quot;บันทึกเข้าประวัติ (Save as History)&quot;</strong>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Panel */}
          <div className="bg-slate-950/70 border border-slate-700/60 rounded-lg p-4 space-y-3.5 text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
              <div>
                <h5 className="font-semibold text-slate-200">Reflection History Filters</h5>
                <p className="text-[10px] text-slate-350">ช่วยค้นและกรองประวัติสะท้อนคิดในเครื่องนี้</p>
              </div>
              <span className="text-[10px] text-slate-350 italic max-w-xs md:text-right">
                ตัวกรองนี้ทำงานเฉพาะบนข้อมูลที่อยู่ในเครื่องนี้เท่านั้น ไม่เปลี่ยนแปลง ไม่ลบ และไม่บันทึกค่าการกรองลงในระบบ
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="historySearch" className="block text-slate-300 font-medium mb-1">
                    Search Reflection <span className="text-[10px] text-slate-300 font-normal">(ค้นจากข้อความในบันทึก ความตั้งใจ หรือข้อควรระวัง)</span>
                </label>
                <input
                  id="historySearch"
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="ค้นหา..."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="historyMode" className="block text-slate-300 font-medium mb-1">
                    Mode <span className="text-[10px] text-slate-300 font-normal">(กรองตามโหมดหรือจังหวะที่บันทึกไว้)</span>
                  </label>
                  <select
                    id="historyMode"
                    value={historyModeFilter}
                    onChange={(e) => setHistoryModeFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="all">All</option>
                    {uniqueModes.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="historyEnergy" className="block text-slate-300 font-medium mb-1">
                    Energy <span className="text-[10px] text-slate-300 font-normal">(กรองตามระดับพลังงานที่เคยเช็กอิน)</span>
                  </label>
                  <select
                    id="historyEnergy"
                    value={historyEnergyFilter}
                    onChange={(e) => setHistoryEnergyFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="all">All</option>
                    {uniqueEnergies.map((energy) => (
                      <option key={energy} value={energy}>{energy}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="historyMonth" className="block text-slate-300 font-medium mb-1">
                    Month <span className="text-[10px] text-slate-300 font-normal">(กรองตามช่วงเดือนของบันทึก)</span>
                  </label>
                  <select
                    id="historyMonth"
                    value={historyMonthFilter}
                    onChange={(e) => setHistoryMonthFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="all">All</option>
                    <option value="this-month">This Month (เดือนนี้)</option>
                    <option value="last-month">Last Month (เดือนที่แล้ว)</option>
                  </select>
                </div>
              </div>

              {(historySearchQuery || historyModeFilter !== "all" || historyEnergyFilter !== "all" || historyMonthFilter !== "all") && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearchQuery("");
                      setHistoryModeFilter("all");
                      setHistoryEnergyFilter("all");
                      setHistoryMonthFilter("all");
                    }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-xs text-indigo-400 hover:text-indigo-350 rounded font-semibold transition-colors flex items-center gap-1 border border-slate-700/60 active:scale-[0.98]"
                  >
                    Clear Filters (ล้างตัวกรอง)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Count Summary */}
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium px-1">
            <span>Showing {filteredHistoryLogs.length} of {historyLogs.length} records</span>
            <span>แสดง {filteredHistoryLogs.length} จากทั้งหมด {historyLogs.length} บันทึก</span>
          </div>

          {filteredHistoryLogs.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-slate-700 rounded-xl bg-slate-950/40 text-slate-300 italic space-y-3">
              <p className="text-xs">ไม่พบบันทึกที่ตรงกับตัวกรอง ลองล้างตัวกรองหรือค้นด้วยคำที่กว้างขึ้น</p>
              <button
                type="button"
                onClick={() => {
                  setHistorySearchQuery("");
                  setHistoryModeFilter("all");
                  setHistoryEnergyFilter("all");
                  setHistoryMonthFilter("all");
                }}
                className="mx-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs text-indigo-400 hover:text-indigo-350 rounded font-semibold transition-colors flex items-center gap-1 border border-slate-700/60 active:scale-[0.98]"
              >
                Clear Filters (ล้างตัวกรอง)
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredHistoryLogs.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-slate-950/70 border border-slate-700 rounded-lg p-3 space-y-2 text-xs transition-all hover:border-slate-650"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-1.5">
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-indigo-300 block text-[10px]">
                        {item.createdAt}
                      </span>
                      <span className="text-[10px] text-slate-350 block">
                        วันที่กิจกรรม: <span className="font-mono text-slate-200">{item.reflectionDate}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-violet-950/50 text-violet-300 border border-violet-400/20 text-[9px] font-semibold">
                        {item.reflectionMode}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 text-[9px] font-semibold">
                        {item.strategyMode}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <p className="line-clamp-2 leading-relaxed">
                      <span className="text-slate-300 font-medium">สรุปสะท้อนคิด:</span> {item.reflectionSummary || "(ไม่มี)"}
                    </p>
                    {item.nextRightAction && (
                      <p className="line-clamp-1 leading-relaxed text-emerald-400/90">
                        <span className="text-slate-300 font-medium">Next Right Action:</span> {item.nextRightAction}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => handleCopyItem(item)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-[10px] text-slate-200 font-semibold rounded transition-colors flex items-center gap-1 border border-slate-600 active:scale-[0.98]"
                    >
                      <ClipboardList className="w-2.5 h-2.5 text-indigo-300" />
                      {copiedHistoryId === item.id || localCopiedHistoryId === item.id ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadFromHistory && onLoadFromHistory(item)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-[10px] text-slate-200 font-semibold rounded transition-colors flex items-center gap-1 border border-slate-600 active:scale-[0.98]"
                    >
                      <RefreshCw className="w-2.5 h-2.5 text-indigo-300" /> โหลดมาแทนที่
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFromHistory && onDeleteFromHistory(item.id)}
                      className="px-2 py-1 bg-slate-855 hover:bg-rose-955/20 text-[10px] text-rose-400 font-semibold rounded transition-colors flex items-center gap-1 border border-slate-700 hover:border-rose-500/20 active:scale-[0.98]"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
