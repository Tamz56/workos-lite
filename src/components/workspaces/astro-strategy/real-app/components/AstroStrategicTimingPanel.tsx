"use client";

import * as React from "react";
import { 
  Compass, 
  ShieldAlert, 
  Activity, 
  Clock, 
  FileText, 
  Info
} from "lucide-react";

// Mock data structures
interface MockAssessment {
  id: string;
  category: string;
  objective: string;
  sampleTime: string;
  practicalReadiness: string;
  highStakesStatus: boolean;
  mockLabel: string;
}

export function AstroStrategicTimingPanel({
  onNavigateToTab
}: {
  onNavigateToTab?: (tabId: "today" | "timing" | "weekly" | "monthly" | "reflection" | "history" | "planning" | "profile" | "guide" | "tools") => void;
}) {
  // State for previewing different required UI states in Stage 1
  const [uiState, setUiState] = React.useState<"initial" | "mock_event" | "insufficient" | "saved_empty">("mock_event");
  
  // State for capacity preview toggles (mock only, no storage connection)
  const [capacityState, setCapacityState] = React.useState<"normal" | "near" | "reached">("normal");

  // Predetermined mock assessments for Event Decomposition
  const mockAssessments: MockAssessment[] = [
    {
      id: "asm_1",
      category: "Travel",
      objective: "ออกเดินทางไปตรวจสวนส้มสายน้ำผึ้งและเจรจาร่วมทุนปุ๋ยอินทรีย์แปลง Rose Trial",
      sampleTime: "10:30 น. (16 กรกฎาคม 2026)",
      practicalReadiness: "เตรียมยานพาหนะและทวนสเปกพิกัดสวนเรียบร้อย",
      highStakesStatus: false,
      mockLabel: "Travel Mock Assessment — ข้อมูลตัวอย่าง"
    },
    {
      id: "asm_2",
      category: "Meeting / Negotiation",
      objective: "เจรจาสัญญาร่วมทุนทำสัญญากลุ่ม Green Fineness ชุดใหม่",
      sampleTime: "14:00 น. (16 กรกฎาคม 2026)",
      practicalReadiness: "ร่างวาระการประชุมและตัวเลขส่วนแบ่งส่งให้พาร์ทเนอร์ล่วงหน้าแล้ว",
      highStakesStatus: true,
      mockLabel: "Negotiation Mock Assessment — ข้อมูลตัวอย่าง"
    },
    {
      id: "asm_3",
      category: "Lending / Payment",
      objective: "โอนชำระงวดแรกสำหรับการเช่าที่ดินทำแปลงวิจัย Rose Trial 3",
      sampleTime: "15:00 น. (16 กรกฎาคม 2026)",
      practicalReadiness: "ยอดเงินสำรองผ่านการอนุมัติในรอบทบทวนรายไตรมาสแล้ว",
      highStakesStatus: true,
      mockLabel: "Lending / Payment — High-Stakes Mock Assessment"
    },
    {
      id: "asm_4",
      category: "Project Start",
      objective: "ปล่อยชุดบทความวิจัย Green Fineness ตอนที่ 1 เข้าระบบคลังความรู้",
      sampleTime: "09:00 น. (17 กรกฎาคม 2026)",
      practicalReadiness: "บทความผ่านการตรวจทานถ้อยคำและความถูกต้องของหลักฐานอ้างอิงครบถ้วน",
      highStakesStatus: false,
      mockLabel: "Project Start Mock Assessment — ข้อมูลตัวอย่าง"
    }
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6 text-left">
      
      {/* Page Title & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-violet-400" /> 🕰 ฤกษ์และจังหวะเวลา — Strategic Timing
          </h3>
          <p className="text-xs text-slate-400">ประเมินและคัดกรองช่วงเวลากิจกรรมเชิงกลยุทธ์ย่อยแยกตามมิติ</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateToTab?.("today")}
          className="px-3 py-1.5 rounded bg-slate-950 text-slate-350 border border-slate-800 text-xs hover:bg-slate-900 transition-all font-medium self-start sm:self-center"
        >
          ➔ กลับหน้าสรุปวันนี้
        </button>
      </div>

      {/* Addition 1: Stage Status Notice - Visible clearly without scrolling, not intrusive */}
      <div className="bg-violet-950/40 border border-violet-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-xs font-bold text-violet-200 block">Stage 1 — Static Interface Preview</strong>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            ข้อมูลในหน้านี้เป็นตัวอย่างสำหรับตรวจโครงสร้างการใช้งาน ยังไม่ได้เชื่อมระบบคำนวณฤกษ์หรือบันทึกข้อมูลจริง
          </p>
        </div>
      </div>

      {/* UI States Selector for Manual Verification */}
      <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-slate-350">ทดสอบสถานะหน้าจอ (UI State Preview Selector):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setUiState("mock_event")}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              uiState === "mock_event"
                ? "bg-violet-950 text-violet-200 border border-violet-500/30"
                : "bg-slate-900 text-slate-400 border border-transparent"
            }`}
          >
            1. Mock Event State
          </button>
          <button
            onClick={() => setUiState("initial")}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              uiState === "initial"
                ? "bg-violet-950 text-violet-200 border border-violet-500/30"
                : "bg-slate-900 text-slate-400 border border-transparent"
            }`}
          >
            2. Initial / Empty State
          </button>
          <button
            onClick={() => setUiState("insufficient")}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              uiState === "insufficient"
                ? "bg-violet-950 text-violet-200 border border-violet-500/30"
                : "bg-slate-900 text-slate-400 border border-transparent"
            }`}
          >
            3. Insufficient Data State
          </button>
          <button
            onClick={() => setUiState("saved_empty")}
            className={`px-3 py-1.5 rounded transition-all font-semibold ${
              uiState === "saved_empty"
                ? "bg-violet-950 text-violet-200 border border-violet-500/30"
                : "bg-slate-900 text-slate-400 border border-transparent"
            }`}
          >
            4. Saved Assessments Empty
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Event List and Capacity Preview */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Capacity Preview Section */}
          <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              พื้นที่จัดเก็บข้อมูล (Capacity Preview)
            </h4>
            
            {/* Toggles to change capacity preview state (Static preview, no enforcement) */}
            <div className="flex gap-2 text-[10px]">
              <button 
                onClick={() => setCapacityState("normal")}
                className={`px-2 py-0.5 rounded font-semibold ${capacityState === "normal" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30" : "bg-slate-900 text-slate-400"}`}
              >
                ปกติ (85)
              </button>
              <button 
                onClick={() => setCapacityState("near")}
                className={`px-2 py-0.5 rounded font-semibold ${capacityState === "near" ? "bg-amber-950 text-amber-300 border border-amber-500/30" : "bg-slate-900 text-slate-400"}`}
              >
                ใกล้เต็ม (95)
              </button>
              <button 
                onClick={() => setCapacityState("reached")}
                className={`px-2 py-0.5 rounded font-semibold ${capacityState === "reached" ? "bg-rose-950 text-rose-300 border border-rose-500/30" : "bg-slate-900 text-slate-400"}`}
              >
                เต็ม (100)
              </button>
            </div>

            {capacityState === "normal" && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-emerald-400 font-semibold">สถานะปกติ</span>
                  <span className="text-slate-350 font-mono">85 / 100 Events</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: "85%" }}></div>
                </div>
              </div>
            )}

            {capacityState === "near" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-amber-400 font-semibold">⚠️ ความจุใกล้เต็ม</span>
                  <span className="text-slate-350 font-mono">95 / 100 Events</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: "95%" }}></div>
                </div>
                <p className="text-[10px] text-amber-400 leading-normal">
                  ความจุประเมินผลในบราวเซอร์ของคุณกำลังจะเต็ม โปรดทบทวนและลบกิจกรรมเก่าออกบ้างเพื่อความคล่องตัว
                </p>
              </div>
            )}

            {capacityState === "reached" && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-rose-450 font-semibold">❌ จัดเก็บเต็มขีดจำกัด</span>
                  <span className="text-slate-350 font-mono">100 / 100 Events</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full" style={{ width: "100%" }}></div>
                </div>
                <p className="text-[10px] text-rose-400 leading-normal">
                  ระงับการสร้างกิจกรรมใหม่ชั่วคราว ระบบไม่มีกลไกลบข้อมูลเก่าอัตโนมัติ (No Auto-Pruning) เพื่อรักษาข้อมูลของผู้ใช้ไว้สูงสุด
                </p>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  <button disabled className="py-1 rounded bg-slate-900 text-slate-500 border border-slate-800 text-[9px] cursor-not-allowed font-medium" title="Available in a later stage">
                    ลบ Event
                  </button>
                  <button disabled className="py-1 rounded bg-slate-900 text-slate-500 border border-slate-800 text-[9px] cursor-not-allowed font-medium" title="Available in a later stage">
                    ส่งออกสำรอง
                  </button>
                  <button disabled className="py-1 rounded bg-slate-900 text-slate-500 border border-slate-800 text-[9px] cursor-not-allowed font-medium" title="Available in a later stage">
                    ยกเลิก
                  </button>
                </div>
                <span className="block text-[8px] text-slate-500 text-center italic">*ปุ่มควบคุมทั้งหมดปิดใช้งานใน Stage 1 (Available in a later stage)</span>
              </div>
            )}
          </div>

          {/* List of mock events (static preview only) */}
          <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                รายการประเมินกิจกรรม
              </h4>
              <button disabled className="p-1 rounded bg-slate-900 hover:bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed text-[10px]" title="Available in a later stage">
                + เพิ่ม
              </button>
            </div>
            
            {uiState === "initial" ? (
              <p className="text-xs text-slate-450 italic py-4 text-center">ยังไม่มีการประเมินกิจกรรมที่สร้าง</p>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-violet-950/30 border border-violet-500/20 rounded-lg text-left">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[9px] font-mono text-slate-450 border border-slate-800 block w-max">
                    Multi-Assessment Event
                  </span>
                  <h5 className="font-bold text-xs text-slate-100 mt-1 truncate">
                    โครงการแปลงวิจัย Rose Trial & Green Fineness
                  </h5>
                  <div className="text-[9px] text-slate-450 mt-1">
                    ข้อมูลตัวอย่าง — 16 กรกฎาคม 2026
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Content views depending on uiState */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* ----------------- STATE 1: Initial / Empty State ----------------- */}
          {uiState === "initial" && (
            <div className="bg-slate-950/50 border border-slate-850 p-8 rounded-xl text-center space-y-4">
              <Compass className="w-12 h-12 text-slate-700 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-200">
                เริ่มต้นใช้งานระบบประเมินจังหวะเวลากลยุทธ์
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                นี่คือหน้าต่างคัดกรองช่วงเวลาสำคัญ เช่น การจัดทัพเจรจา การลงนาม การโอนชำระเงิน หรือการปล่อยชุดคอนเทนต์ เพื่อป้องกันความล้าของสมองและลดความเสี่ยง
              </p>
              <div className="pt-2">
                <button
                  disabled
                  className="px-4 py-2 rounded-lg bg-slate-900 text-slate-500 border border-slate-800 text-xs font-semibold cursor-not-allowed"
                >
                  สร้างกิจกรรมวิเคราะห์ (Disabled in Stage 1)
                </button>
              </div>
            </div>
          )}

          {/* ----------------- STATE 3: Insufficient Data State ----------------- */}
          {uiState === "insufficient" && (
            <div className="bg-slate-950/50 border border-slate-850 p-8 rounded-xl text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-amber-500/70 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-200">ข้อมูลไม่เพียงพอในการประมวลผล (Insufficient Data)</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                ตรวจไม่พบข้อมูลพิกัดสถานที่ เขตเวลา หรือ profileดวงเกิดของคุณในขณะนี้ กรุณาตั้งค่าโปรไฟล์ดวงเกิดและการลงทะเบียนเบื้องต้นก่อนใช้งาน
              </p>
              <p className="text-[10px] text-slate-500 italic">
                *ระบบจะไม่แสดงผลลัพธ์ประมาณการเดาเมื่อมีข้อมูลอินพุตไม่เพียงพอเพื่อความแม่นยำสูงสุด
              </p>
            </div>
          )}

          {/* ----------------- STATE 4: Saved Assessments Empty State ----------------- */}
          {uiState === "saved_empty" && (
            <div className="bg-slate-950/50 border border-slate-850 p-8 rounded-xl text-center space-y-4">
              <FileText className="w-10 h-10 text-slate-700 mx-auto" />
              <h4 className="font-bold text-sm text-slate-200">ประวัติการบันทึก</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                ยังไม่มีการประเมินที่บันทึกไว้
              </p>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 inline-block text-[11px] text-slate-400">
                การบันทึกแบบ Local-first จะถูกเพิ่มใน Stage ถัดไป
              </div>
            </div>
          )}

          {/* ----------------- STATE 2: Mock Event State (Main Showcase) ----------------- */}
          {uiState === "mock_event" && (
            <div className="space-y-5">
              
              {/* Mock Event Parameters - Labeled Static Preview */}
              <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl space-y-4 relative">
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[8px] font-semibold text-violet-300 font-mono">
                  ข้อมูลตัวอย่าง — Static Preview
                </span>

                <div className="border-b border-slate-850 pb-3">
                  <span className="px-2 py-0.5 rounded bg-violet-950/50 border border-violet-500/20 text-[9px] font-mono text-violet-300">
                    Event Container (ระดับโครงการ)
                  </span>
                  <h4 className="font-bold text-sm text-slate-100 mt-2">
                    โครงการแปลงวิจัย Rose Trial & Green Fineness
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[10px]">วันเวลาดำเนินการ:</span>
                    <strong className="text-slate-200 font-medium">16 กรกฎาคม 2026 (10:00 น.)</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[10px]">เขตเวลา (Timezone):</span>
                    <strong className="text-slate-200 font-medium">Asia/Bangkok (UTC+7)</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[10px]">ความยืดหยุ่น:</span>
                    <strong className="text-slate-200 font-medium">วันคงที่ เลื่อนเวลาในวันได้</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-350 space-y-1">
                  <span className="text-slate-500 block text-[10px]">ข้อจำกัดและเงื่อนไข:</span>
                  <p className="bg-slate-900/50 p-2.5 rounded border border-slate-850">
                    ต้องส่งร่างสัญญาร่วมทุนและแผนวิเคราะห์เปรียบเทียบ Rose Trial 3 ให้ทีมงานกฎหมายล่วงหน้า และดำเนินการประชุมเจรจาเสร็จสิ้นภายในช่วงเย็น
                  </p>
                </div>
              </div>

              {/* Event Decomposition: Showing 4 separate Assessments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    การจำลองแตกกิจกรรมประเมินผล (Event Decomposition)
                  </h4>
                  <span className="text-[10px] text-rose-400 font-semibold animate-pulse">
                    *ผลวิเคราะห์แต่ละชิ้นแยกอิสระจากกัน
                  </span>
                </div>
                
                <div className="bg-rose-950/15 border border-rose-500/20 p-3 rounded-lg text-center text-[10px] text-rose-300">
                  ⚠️ <strong>ข้อพึงระวังหลัก:</strong> ผลของ Assessment หนึ่งจะไม่ถูกนำไปใช้ตัดสินผลการตัดสินใจของอีก Assessment โดยอัตโนมัติ
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockAssessments.map(asm => (
                    <div 
                      key={asm.id}
                      className={`p-4 rounded-xl border space-y-3 ${
                        asm.highStakesStatus
                          ? "bg-slate-950/60 border-indigo-500/20 hover:border-indigo-500/30"
                          : "bg-slate-950/60 border-slate-850 hover:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-[9px] font-semibold text-slate-300 border border-slate-800">
                          {asm.category}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">{asm.mockLabel}</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300">
                        <p><strong>เป้าหมายย่อย:</strong> {asm.objective}</p>
                        <p className="text-[11px] text-slate-400"><strong>เวลาปฏิบัติงาน:</strong> {asm.sampleTime}</p>
                        <p className="text-[11px] text-slate-450 italic"><strong>ความพร้อมเชิงกายภาพ:</strong> {asm.practicalReadiness}</p>
                      </div>

                      {asm.highStakesStatus && (
                        <div className="px-2 py-1 rounded bg-rose-950/30 border border-rose-500/20 text-[10px] text-rose-350 font-bold w-max">
                          เดิมพันสูง (High-Stakes Status)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Levels of Timing Windows */}
              <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-violet-400" /> ช่วงหน้าต่างวิเคราะห์เวลาจำลอง (Timing Windows)
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono">เขตเวลา: Asia/Bangkok (UTC+7)</span>
                </div>

                <div className="space-y-3">
                  
                  {/* Supportive Window */}
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-emerald-400 font-bold flex items-center gap-1">
                        🟢 1. Supportive Window (ส่งเสริมพิเศษ)
                      </strong>
                      <span className="font-bold text-emerald-300 font-mono">14:00 น. — 15:30 น.</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      เหมาะแก่กิจกรรมการเปิดเจรจาหรือลงนามที่เน้นสัญญาระยะยาว มีความเข้ากันของดวงจรและระดับสมาธิสูง
                    </p>
                    <span className="block text-[9px] text-slate-500 italic mt-1">
                      *Mock Timing Result — ยังไม่ได้เชื่อมระบบคำนวณ
                    </span>
                  </div>

                  {/* Usable with conditions */}
                  <div className="p-3 bg-yellow-950/20 border border-yellow-500/20 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-yellow-450 font-bold flex items-center gap-1">
                        🟡 2. Usable with Conditions (ทำได้เมื่อสอดคล้องเงื่อนไข)
                      </strong>
                      <span className="font-bold text-yellow-300 font-mono">09:30 น. — 11:30 น.</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      ดำเนินงานนัดหมายได้โดยมีเงื่อนไขว่าต้องส่งเอกสารตรวจทานล่วงหน้าและไม่คุยตัวเลขปากเปล่าเด็ดขาด
                    </p>
                    <span className="block text-[9px] text-slate-500 italic mt-1">
                      *Mock Timing Result — ยังไม่ได้เชื่อมระบบคำนวณ
                    </span>
                  </div>

                  {/* Caution Window */}
                  <div className="p-3 bg-orange-950/20 border border-orange-500/20 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-orange-400 font-bold flex items-center gap-1">
                        🟠 3. Caution Window (ควรระวังจำกัดกรอบ)
                      </strong>
                      <span className="font-bold text-orange-350 font-mono">16:30 น. — 18:00 น.</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      มีความล้าทางกายภาพสมองสะสม ควรชะลอการตกลงข้อผูกพันทางการเงินเพื่อป้องกันการด่วนตัดสินใจผิดพลาด
                    </p>
                    <span className="block text-[9px] text-slate-500 italic mt-1">
                      *Mock Timing Result — ยังไม่ได้เชื่อมระบบคำนวณ
                    </span>
                  </div>

                  {/* Recovery / Prep Window */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-slate-400 font-bold flex items-center gap-1">
                        🔵 4. Recovery / Preparation Window (พักผ่อนเตรียมข้อมูล)
                      </strong>
                      <span className="font-bold text-slate-300 font-mono">หลัง 19:00 น. เป็นต้นไป</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      ควรพักสมอง ปิดหน้าจอ และทบทวนข้อมูลหลังบ้านเบา ๆ เพื่อเตรียมความพร้อมสำหรับดำเนินงานในวันถัดไป
                    </p>
                    <span className="block text-[9px] text-slate-500 italic mt-1">
                      *Mock Timing Result — ยังไม่ได้เชื่อมระบบคำนวณ
                    </span>
                  </div>

                </div>
              </div>

              {/* Addition 2: Source Layers and Confidence Preview */}
              <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                  <Activity className="w-4 h-4 text-violet-400" /> แหล่งข้อมูลวิเคราะห์และความมั่นใจ (Source Layers & Confidence Preview)
                </h4>
                
                {/* Source Layers Table */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    ข้อมูลตั้งต้นที่เรียกใช้ (Source Layers)
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono text-slate-300">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">Birth Profile:</span>
                      <span className="text-emerald-400 font-semibold">Available</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">Thai Timing:</span>
                      <span className="text-rose-450 font-semibold">Not connected in Stage 1</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">Thai Lunar:</span>
                      <span className="text-rose-450 font-semibold">Not connected in Stage 1</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">Thai Transit:</span>
                      <span className="text-rose-450 font-semibold">Not connected in Stage 1</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">Chinese Metaphysics:</span>
                      <span className="text-rose-450 font-semibold">Not connected in Stage 1</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">Category Logic:</span>
                      <span className="text-amber-400 font-semibold">Requires implementation</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">Practical Constraints:</span>
                      <span className="text-amber-400 font-semibold">Requires implementation</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                      <span className="text-slate-500 block">User Readiness:</span>
                      <span className="text-amber-400 font-semibold">Requires implementation</span>
                    </div>
                  </div>
                </div>

                {/* Confidence Preview (3 Dimensions) */}
                <div className="space-y-2.5 pt-2 border-t border-slate-850">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    ระดับความน่าเชื่อถือจำลอง (Confidence Preview)
                  </span>
                  
                  <div className="space-y-2 text-xs text-slate-350">
                    <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850 flex flex-col gap-0.5">
                      <span className="text-slate-500 font-medium">1. Input completeness:</span>
                      <strong className="text-slate-200">Moderate — ใช้ข้อมูลตัวอย่างบางส่วน</strong>
                    </div>
                    
                    <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850 flex flex-col gap-0.5">
                      <span className="text-slate-500 font-medium">2. Timing interpretation:</span>
                      <strong className="text-slate-200">Insufficient Data — ยังไม่เชื่อมระบบคำนวณ</strong>
                    </div>
                    
                    <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850 flex flex-col gap-0.5">
                      <span className="text-slate-500 font-medium">3. Practical decision readiness:</span>
                      <strong className="text-slate-200">Limited — ยังไม่มี checklist และข้อมูลจริงครบถ้วน</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Predetermined High-Stakes Guardrail Mock Scenario */}
              <div className="bg-rose-950/20 border border-rose-500/25 p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-rose-400 border-b border-rose-500/10 pb-2">
                  <ShieldAlert className="w-5 h-5 text-rose-450" />
                  <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-100">
                    🚨 การป้องกันความเสี่ยงสูงภัย (High-Stakes Decision Guardrail)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-900 text-[8px] font-semibold text-rose-200 font-mono w-max block">
                  Lending / Payment — High-Stakes Mock Assessment
                </span>
                
                <p className="text-xs text-slate-350 leading-relaxed">
                  เนื่องจากกิจกรรมย่อยประเภทธุรกรรมทางการเงินหรือการชำระเงินนี้มีขอบข่ายความเสี่ยงสูง ระบบจึงจัดเตรียมรายการปฏิบัติเพื่อความปลอดภัยดังต่อไปนี้:
                </p>

                {/* Practical action checklist without fortune-telling copy */}
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-2.5 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-850">
                  <li>
                    <strong className="text-slate-200">ตรวจเงินสำรองจำเป็น</strong>: ตรวจสอบกระแสเงินสดสำรองว่าไม่ได้ถูกดึงไปใช้จนเบียดบังความต้องการพื้นฐาน
                  </li>
                  <li>
                    <strong className="text-slate-200">กันงบเดินทาง</strong>: คัดแยกค่าใช้จ่ายสำหรับการเดินทางออกจากการประสานนิติกรรมธุรกรรมหลัก
                  </li>
                  <li>
                    <strong className="text-slate-200">ตรวจแหล่งเงินคืน</strong>: ทบทวนวิเคราะห์ความเสี่ยงของเงื่อนไขการชำระหรือแหล่งที่มาของกระแสเงินที่จะโอนกลับ
                  </li>
                  <li>
                    <strong className="text-slate-200">ตรวจการพึ่งพาบุคคลที่สาม</strong>: สอบถามขอบข่ายพิกัดการพึ่งพิงคู่สัญญาและทีมกฎหมายภายนอกอย่างรัดกุม
                  </li>
                  <li>
                    <strong className="text-slate-200">ทำหลักฐานเป็นลายลักษณ์อักษร</strong>: ข้อผูกผันทางการเงินต้องกระทำผ่านสัญญาลายเซ็นและมีเอกสารรับรองชัดเจน
                  </li>
                  <li>
                    <strong className="text-slate-200">กำหนดวันทบทวน</strong>: ปักกำหนดจุดตรวจสอบความก้าวหน้าและการติดตามผลหลังโอนชำระงวดแรก
                  </li>
                </ul>
              </div>

              {/* Fixed Appointment Guidance */}
              <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-amber-400 border-b border-slate-850 pb-2">
                  <Compass className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-xs sm:text-sm tracking-wide text-slate-100">
                    🎯 คู่มือนัดหมายแบบคงที่ (Fixed Appointment Guidance)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  เมื่อกิจกรรมนัดหมายกำหนดเวลาคงที่ไม่สามารถปรับเปลี่ยนเวลาตามจังหวะส่งเสริมได้ ให้เน้นจัดระบบกลยุทธ์เชิงเนื้อหาดังนี้เพื่อควบคุมความปลอดภัย:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-350">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1">
                    <span className="text-amber-400 font-semibold block text-[10px]">1. เปิดด้วยเป้าหมายและขอบเขต</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">ตั้งกรอบการประชุมเรื่องเป้าหมายสูงสุดให้เสร็จสิ้นในครึ่งแรกของการนัดหมาย</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1">
                    <span className="text-amber-400 font-semibold block text-[10px]">2. คุยข้อมูลก่อนตัวเลข</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">ตกลงข้อมูลรายละเอียดพื้นฐานเชิงสถิติให้เรียบร้อยก่อนเจรจาต่อรองเรื่องจำนวนเงิน</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1">
                    <span className="text-amber-400 font-semibold block text-[10px]">3. แยกประชุมออกจากการโอนเงิน</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">ห้ามตกลงโอนยอดเงินสดในทันทีระหว่างพูดคุยเจรจา ให้มีรอบตรวจสอบภายหลัง</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1">
                    <span className="text-amber-400 font-semibold block text-[10px]">4. ไม่ลงนามเมื่อเอกสารไม่ครบ</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">เลื่อนลงนามสัญญาทันทีหากพบรายละเอียดส่วนแนบท้ายไม่สมบูรณ์</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1">
                    <span className="text-amber-400 font-semibold block text-[10px]">5. สรุปเป็นลายลักษณ์อักษร</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">มีเอกสารบันทึกข้อตกลงหลังการประชุมส่งมอบให้กับคู่สนทนาภายใน 24 ชม.</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1">
                    <span className="text-amber-400 font-semibold block text-[10px]">6. กำหนด follow-up checkpoint</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">กำหนดเวลาเจรจารอบสองที่แน่ชัดไว้ล่วงหน้าเพื่อติดตามงาน</span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1">
                    <span className="text-amber-400 font-semibold block text-[10px]">7. เว้นช่วงทบทวนก่อนภาระย้อนกลับยาก</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">หลีกเลี่ยงการกู้ยืมและนิติกรรมที่ลากจูงจนเกิดหนี้ผูกพันกู้คืนยาก</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-2">
                  *ข้อสังเกต: ระบบไม่แนะนำให้ยกเลิกการนัดหมายสำคัญของธุรกิจเพียงเพราะช่วงเวลาดังกล่าวทับซ้อนกับ Caution timing ในเชิงสัญลักษณ์
                </p>
              </div>

              {/* Planning & Reflection Draft Previews - Read-only */}
              <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-violet-300 border-b border-slate-850 pb-2">
                  <FileText className="w-4.5 h-4.5 text-violet-400" />
                  <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-100">
                    🔗 ตัวอย่างจำลองการส่งข้อมูลส่งต่อ (Planning & Reflection Previews)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Planning Draft Preview */}
                  <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-850 flex flex-col justify-between space-y-3">
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        ร่างส่งแผนกลยุทธ์ (Planning Draft)
                      </span>
                      <div className="space-y-1.5 text-[11px] text-slate-350 bg-slate-950/50 p-2.5 rounded border border-slate-900 font-mono">
                        <div><strong className="text-slate-200">Focus Next:</strong> เจรจาร่างสัญญาร่วมทุนGreen Fineness</div>
                        <div><strong className="text-slate-200">Slow Down:</strong> ลดการตกลงจ่ายโอนเงินในสัปดาห์นี้</div>
                        <div><strong className="text-slate-200">Next Small Action:</strong> คุยข้อกังวลสัญญากับคู่เจรจา</div>
                        <div><strong className="text-slate-200">Review Later:</strong> ตรวจสัญญารอบสองร่วมกับบัญชี</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="w-full py-1.5 rounded bg-slate-900 text-slate-500 border border-slate-800 text-[10px] cursor-not-allowed font-semibold"
                    >
                      ส่งออกร่างไปยังแผนกลยุทธ์ (Coming in a later stage)
                    </button>
                  </div>

                  {/* Reflection Draft Preview */}
                  <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-850 flex flex-col justify-between space-y-3">
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        ร่างบันทึกสะท้อนคิด (Reflection Prompt)
                      </span>
                      <div className="space-y-1.5 text-[11px] text-slate-350 bg-slate-950/50 p-2.5 rounded border border-slate-900 font-mono">
                        <div><strong className="text-slate-200">หัวข้อสะท้อน:</strong> ประเมินโครงการ Rose Trial & Green Fineness</div>
                        <div><strong className="text-slate-200">กิจกรรมปฏิบัติ:</strong> ลงนามและชำระธุรกรรมการร่วมทุน</div>
                        <div><strong className="text-slate-200">คำถามสะท้อนคิด:</strong> การลงนามจัดทำสัญญาครั้งนี้มีการตกลงเป็นลายลักษณ์อักษรเรียบร้อยและทบทวนความครบถ้วนของเอกสารแล้วหรือไม่?</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="w-full py-1.5 rounded bg-slate-900 text-slate-500 border border-slate-800 text-[10px] cursor-not-allowed font-semibold"
                    >
                      ร่างคำถามสะท้อนคิด (Coming in a later stage)
                    </button>
                  </div>

                </div>
              </div>

              {/* Ethical safety guidelines banner */}
              <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl text-[10px] text-slate-500 leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-650 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-400 block font-semibold mb-0.5">กรอบจริยธรรมข้อมูลความปลอดภัย (Ethical Guardrail)</strong>
                  <span>
                    ระบบคัดกรองจังหวะเวลาใช้สัญวิทยาเพื่อทบทวนทักษะและระดับสมาธิส่วนบุคคล ไม่รับรองการพยากรณ์โชคชะตา ชี้จุดรวย หรือแทนที่การปรึกษาทางกฎหมาย บัญชี หรือแพทย์ผู้เชี่ยวชาญ
                  </span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
