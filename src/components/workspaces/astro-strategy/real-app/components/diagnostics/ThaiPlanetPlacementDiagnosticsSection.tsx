"use client";

import * as React from "react";
import { ThaiPlanetPlacementDebugPanel } from "./ThaiPlanetPlacementDebugPanel";
import { buildThaiPlanetPlacementRuntimeAdapterV01 } from "../../data/astroRealAppThaiPlanetPlacementAdapter";
import { ThaiPlanetPlacementInput } from "../../data/astroRealAppTypes";

interface ThaiPlanetPlacementDiagnosticsSectionProps {
  variant?: "production" | "preview";
  className?: string;
}

/**
 * ThaiPlanetPlacementDiagnosticsSection
 * Wrapper component สำหรับจัดแสดงพฤทีวิเคราห์พิกัดดาวเคราะห์ไทยจำลอง v0.1
 * ถูกจำกัดขอบเขตการทำงานให้อ่านค่าแบบ In-memory ล้วน และมี Visibility Gate (สวิตช์ Toggle) ควบคุมความปลอดภัย
 */
export function ThaiPlanetPlacementDiagnosticsSection({
  variant = "preview",
  className = "",
}: ThaiPlanetPlacementDiagnosticsSectionProps) {
  // Gate 2: ตัวแปรสลับเปิด-ปิดระบบวินิจฉัย (เริ่มต้นเป็น false / collapsed ตามข้อตกลง)
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);

  // สร้าง In-memory input fixture ที่ใช้เฉพาะค่า placeholder-safe ทั้งหมด
  const diagnosticInput = React.useMemo<ThaiPlanetPlacementInput>(() => {
    return {
      birthDate: "pending-reference-validation",
      birthTime: "pending-reference-validation",
      birthLocation: {
        label: "pending-reference-validation",
        timezone: "Asia/Bangkok",
      },
      calendarSystem: "pending-reference-validation",
      calculationSystem: "pending-reference-validation",
    };
  }, []);

  // เรียกใช้ตัวประสานรันไทม์จำลอง v0.1 (In-memory เท่านั้น ไม่เข้าถึง LocalStorage หรือ Composer)
  const runtimeResult = React.useMemo(() => {
    return buildThaiPlanetPlacementRuntimeAdapterV01(diagnosticInput);
  }, [diagnosticInput]);

  // Gate 1: ป้องกันไม่ให้เรนเดอร์ในโหมด Production โดยเด็ดขาด (ประกาศหลัง Hooks เพื่อความปลอดภัย)
  if (variant === "production") {
    return null;
  }

  return (
    <div
      className={`border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-xl p-5 font-sans ${className}`}
      id="thai-planet-diagnostics-section"
    >
      {/* ส่วนหัวเรื่องและปุ่ม Visibility Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-neutral-200 tracking-tight flex items-center gap-2">
            <span>⚙️ Thai Planet Placement Diagnostics</span>
            <span className="bg-neutral-800 text-neutral-400 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-neutral-700">
              Dev-Only
            </span>
          </h2>
          <p className="text-xs text-neutral-400 leading-normal">
            ตัววินิจฉัยและสอบทานสัญญาข้อมูลปฏิทินดวงดาวไทยจำลอง v0.1 สำหรับผู้พัฒนา
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDiagnostics((prev) => !prev)}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide border transition-all cursor-pointer select-none ${
            showDiagnostics
              ? "bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-950/60"
              : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700/80"
          }`}
        >
          {showDiagnostics ? "🔒 ซ่อนข้อมูลวินิจฉัย" : "👁️ แสดงข้อมูลวินิจฉัย"}
        </button>
      </div>

      {/* Copy Safety & Info Notice Board */}
      <div className="mt-4 bg-neutral-950/40 border border-neutral-800 rounded-lg p-4 text-xs leading-relaxed space-y-2">
        <p className="font-bold text-neutral-300 flex items-center gap-1.5">
          <span>⚠️ Copy Safety & Data Guardrails:</span>
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-5 text-neutral-400">
          <li><strong>Diagnostic only</strong>: สำหรับการวินิจฉัยโครงร่างเท่านั้น</li>
          <li><strong>Stub-only</strong>: ทำงานด้วยระบบ Interface Stub จำลองผล</li>
          <li><strong>Not validated</strong>: ยังไม่ผ่านกระบวนการสอบเทียบความถูกต้อง</li>
          <li><strong>Pending reference validation</strong>: รอตรวจเช็กความเที่ยงตรงเทียบกรณีศึกษา</li>
          <li><strong>Not used for interpretation</strong>: ห้ามใช้ในการออกผลวิเคราะห์ดวงชะตา</li>
          <li><strong>No real Thai planet placement is displayed</strong>: ไม่มีองศา/ราศีของดาวเคราะห์จริง</li>
          <li><strong>Not persisted</strong>: ไร้การเข้าถึงหรือเขียนบันทึกค่าลง LocalStorage</li>
        </ul>
      </div>

      {/* แสดงคอมโพเนนต์วินิจฉัยย่อยแบบปิดเมื่อ showDiagnostics === true */}
      {showDiagnostics && (
        <div className="mt-5 border-t border-neutral-800 pt-5">
          <ThaiPlanetPlacementDebugPanel
            runtimeResult={runtimeResult}
            isVisible={showDiagnostics}
          />
        </div>
      )}
    </div>
  );
}
