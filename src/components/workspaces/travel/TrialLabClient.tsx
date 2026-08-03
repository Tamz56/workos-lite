"use client";

import React, { useState } from "react";
import {
  MOCK_PLANT_PROFILE,
  MOCK_TIMELINE_DAYS,
  MOCK_READINESS_GATE_RULES,
  MOCK_WEEKLY_SUMMARIES
} from "./gfTrialLabSimulation";
import {
  Settings,
  Activity,
  Clipboard,
  BookOpen,
  Award,
  AlertTriangle,
  Info,
  Calendar,
  AlertCircle,
  TrendingUp,
  Compass,
  Check,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function TrialLabClient() {
  const [activeTab, setActiveTab] = useState<"setup" | "checkin" | "input" | "weekly" | "review">("checkin");
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  // Find active day data
  const currentDayData = MOCK_TIMELINE_DAYS.find(d => d.day === selectedDayNum) || MOCK_TIMELINE_DAYS[0];

  // Helper for Status Badge styling
  const getStatusBadgeStyles = (color: "normal" | "watch" | "danger") => {
    switch (color) {
      case "normal":
        return "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "watch":
        return "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "danger":
        return "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    }
  };

  // Helper for Readiness Gate Risk badge
  const getRiskBadgeStyles = (score: "Low" | "Medium" | "High") => {
    switch (score) {
      case "Low":
        return "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Medium":
        return "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "High":
        return "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-20">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-600 text-white rounded-full">
                Green Fineness Trial Lab
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                Project Code: GF-APP-001
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Tomato Pot Rainy Season Trial 🍅
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-3xl">
              โครงการทดลองปลูกมะเขือเทศในกระถางผ้าฤดูฝน (21 วัน) — เรียนรู้วิธีเฝ้าระวังระบบรากขาดออกซิเจน
              และการควบคุมเชื้อโรคพืชตามหลักวิทยาศาสตร์โดยไม่ด่วนสรุปเร่งยาหรือสารเคมีเกินความจำเป็น
            </p>
          </div>
          <div className="flex flex-col items-end text-right md:border-l md:border-neutral-200 dark:border-neutral-800 md:pl-6">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">สถานะการจำลอง</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Prototype Active (10 Days Mock)</span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Thai Long-form Optimized</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-neutral-200 dark:border-neutral-800 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex space-x-1 min-w-max pb-px">
          <button
            onClick={() => setActiveTab("setup")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "setup"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>1. Setup (ข้อมูลเริ่มต้น)</span>
          </button>
          <button
            onClick={() => setActiveTab("checkin")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "checkin"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Simulated Check-in (ไทม์ไลน์จำลอง)</span>
          </button>
          <button
            onClick={() => setActiveTab("input")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "input"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>3. Input Event (เกตความพร้อม)</span>
          </button>
          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "weekly"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>4. Weekly Summary (สรุปรายสัปดาห์)</span>
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "review"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>5. Review (บทเรียนและผลลัพธ์)</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">

        {/* TAB 1: SETUP */}
        {activeTab === "setup" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Plant Configuration Info Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-emerald-600">📋</span> รายละเอียดการตั้งค่ากระถางทดลอง
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-neutral-100 dark:border-neutral-800/80 rounded-lg p-4 bg-neutral-50/50 dark:bg-neutral-950/20">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">ชนิดพืช / พืชสวนครัว</span>
                    <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{MOCK_PLANT_PROFILE.cropName}</span>
                  </div>
                  <div className="border border-neutral-100 dark:border-neutral-800/80 rounded-lg p-4 bg-neutral-50/50 dark:bg-neutral-950/20">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">สายพันธุ์ (Variety)</span>
                    <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{MOCK_PLANT_PROFILE.variety}</span>
                  </div>
                  <div className="border border-neutral-100 dark:border-neutral-800/80 rounded-lg p-4 bg-neutral-50/50 dark:bg-neutral-950/20">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">ขนาดกระถางปลูก</span>
                    <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{MOCK_PLANT_PROFILE.potSize}</span>
                  </div>
                  <div className="border border-neutral-100 dark:border-neutral-800/80 rounded-lg p-4 bg-neutral-50/50 dark:bg-neutral-950/20">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">ตำแหน่งและไมโครไคลเมต</span>
                    <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{MOCK_PLANT_PROFILE.locationDetails}</span>
                  </div>
                  <div className="border border-neutral-100 dark:border-neutral-800/80 rounded-lg p-4 bg-neutral-50/50 dark:bg-neutral-950/20">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">วันย้ายกล้าลงดินใหม่ (Transplant Date)</span>
                    <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      {MOCK_PLANT_PROFILE.transplantDate}
                    </span>
                  </div>
                  <div className="border border-neutral-100 dark:border-neutral-800/80 rounded-lg p-4 bg-neutral-50/50 dark:bg-neutral-950/20">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-medium">วันเพาะเมล็ดเริ่มต้น (Sowing Date)</span>
                    <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      {MOCK_PLANT_PROFILE.sowingDate}
                    </span>
                  </div>
                </div>

                <div className="mt-6 border border-neutral-100 dark:border-neutral-800 rounded-lg p-4 bg-emerald-50/20 dark:bg-emerald-950/10">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-semibold mb-1 text-emerald-800 dark:text-emerald-400">
                    สูตรผสมวัสดุปลูก (Growing Medium Formula)
                  </span>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
                    {MOCK_PLANT_PROFILE.mediumFormula}
                  </p>
                </div>
              </div>
            </div>

            {/* Microclimate Risks Card */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  ปัจจัยเสี่ยงหน้าฝนสะสม
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                  จากการสำรวจสภาพแวดล้อมที่ตั้งปลูกพบความเสี่ยงที่ต้องคอยเฝ้าระวังเป็นพิเศษ:
                </p>
                <div className="space-y-3">
                  {MOCK_PLANT_PROFILE.microclimateRisks.map((risk, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/60 dark:border-rose-950/30"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 flex items-center justify-center text-xs font-bold font-mono">
                        {index + 1}
                      </span>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {risk}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border border-neutral-100 dark:border-neutral-800/80 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-950/40">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    คำแนะนำจากบทเรียน GF-APP-001
                  </h4>
                  <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    หน้าฝนในระเบียงปูนมีปัญหาใหญ่อยู่ที่การเปลี่ยนผ่านของอุณหภูมิและความชื้นที่แกว่งตัวรุนแรง
                    การควบคุมวัสดุปลูกให้โปร่งและระบายอากาศจึงสำคัญที่สุด
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SIMULATED CHECK-IN */}
        {activeTab === "checkin" && (
          <div className="space-y-6">

            {/* Timeline Day Selector */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 md:p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3 font-mono">
                แถบจำลองการเดินทางของวันปลูก (Trial Timeline)
              </span>
              <div className="flex flex-wrap gap-2">
                {MOCK_TIMELINE_DAYS.map((dayData) => {
                  const isActive = selectedDayNum === dayData.day;
                  return (
                    <button
                      key={dayData.day}
                      onClick={() => setSelectedDayNum(dayData.day)}
                      className={`flex-1 min-w-[70px] md:min-w-[90px] py-2.5 px-3 rounded-lg border transition-all text-center ${
                        isActive
                          ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                          : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950/40 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                      }`}
                    >
                      <div className={`text-2xs block uppercase tracking-wide opacity-80 ${isActive ? "text-emerald-100" : "text-neutral-400"}`}>
                        Day
                      </div>
                      <div className="text-lg md:text-xl font-mono leading-none my-0.5">{dayData.day}</div>
                      <div className={`text-3xs truncate ${isActive ? "text-emerald-50" : "text-neutral-400"}`}>
                        {dayData.day === 1 ? "Start" : dayData.day === 21 ? "Flowers" : `D+${dayData.day - 1}`}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
                <span className="font-semibold text-neutral-800 dark:text-neutral-300">
                  {currentDayData.title}
                </span>
                <span className="font-mono">
                  วันที่จดจารึก: {currentDayData.date} | ระยะ: {currentDayData.growthStage}
                </span>
              </div>
            </div>

            {/* Interactive Grid: Mock Check-in vs Expected Output */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Column: Mock Check-in Form State (12 columns -> 5) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-neutral-100 dark:border-neutral-800/60 pb-3">
                    <h3 className="text-md font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                      <span className="text-emerald-600">📝</span> บันทึกของนักปลูก (Check-in)
                    </h3>
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded font-mono">
                      Input Fields
                    </span>
                  </div>

                  <div className="space-y-4">

                    {/* Weather & Soil */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          🌧️ สภาพอากาศในวัน
                        </span>
                        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                          {currentDayData.checkIn.weather}
                        </div>
                      </div>
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          🌱 สภาพดิน / ดินปลูก
                        </span>
                        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                          {currentDayData.checkIn.mediumState}
                        </div>
                      </div>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-800/60" />

                    {/* Top & Bottom Leaves */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          🍀 ยอดและใบส่วนบน
                        </span>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed font-sans">
                          {currentDayData.checkIn.topLeaves}
                        </p>
                      </div>
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          🍂 ใบส่วนล่างโคนต้น
                        </span>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed font-sans">
                          {currentDayData.checkIn.bottomLeaves}
                        </p>
                      </div>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-800/60" />

                    {/* Flowers/Fruits & Insects/Disease */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          🌼 ช่อดอก / ติดผล
                        </span>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed font-sans">
                          {currentDayData.checkIn.flowersFruits}
                        </p>
                      </div>
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          🐛 ศัตรูพืชและโรค
                        </span>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed font-sans">
                          {currentDayData.checkIn.insectsDisease}
                        </p>
                      </div>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-800/60" />

                    {/* EC & pH */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          ⚡ ค่า EC (ก้นกระถาง)
                        </span>
                        <div className="text-sm font-semibold font-mono text-neutral-800 dark:text-neutral-200 mt-0.5 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                          {currentDayData.checkIn.ecVal}
                        </div>
                      </div>
                      <div>
                        <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                          🧪 ค่า pH วัสดุปลูก
                        </span>
                        <div className="text-sm font-semibold font-mono text-neutral-800 dark:text-neutral-200 mt-0.5 flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5 text-teal-500" />
                          {currentDayData.checkIn.phVal}
                        </div>
                      </div>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-800/60" />

                    {/* Recent Inputs */}
                    <div>
                      <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                        🧪 สารอาหารที่ให้ล่าสุด (Recent Inputs)
                      </span>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 bg-emerald-50/40 dark:bg-emerald-950/10 p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-950/30">
                        {currentDayData.checkIn.recentInputs}
                      </p>
                    </div>

                  </div>
                </div>
              </div>

              {/* Right Column: Engine Response (12 columns -> 7) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">

                  {/* Status and Stress Indicator Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-100 dark:border-neutral-800/60 pb-3 mb-4">
                    <h3 className="text-md font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      ผลการวินิจฉัยและข้อแนะนำ (Engine Output)
                    </h3>

                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-neutral-400 dark:text-neutral-500">สถานะ:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeStyles(currentDayData.output.plantStatusColor)}`}>
                        {currentDayData.output.plantStatus}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-5">

                    {/* Likely Stress Area */}
                    <div>
                      <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                        ⚠️ สภาวะเครียดที่วิเคราะห์ได้ (Likely Stress)
                      </span>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-1">
                        {currentDayData.output.likelyStress}
                      </p>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-800/60" />

                    {/* Do Not Rush Alert (CRITICAL EDITORIAL GUARDRAIL) */}
                    <div className="bg-rose-50/50 dark:bg-rose-950/20 border-l-4 border-rose-500 dark:border-rose-700 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-rose-900 dark:text-rose-300 block uppercase tracking-wide">
                            คำเตือนใจนักปลูก (Do Not Rush! 🚫)
                          </span>
                          <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed font-sans">
                            {currentDayData.output.doNotRush}
                          </p>
                        </div>
                      </div>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-800/60" />

                    {/* Suggested Checks Checkbox List */}
                    <div>
                      <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase mb-2">
                        🔍 สิ่งที่ควรตรวจสอบเพิ่มทันที (Suggested Checks)
                      </span>
                      <div className="space-y-2">
                        {currentDayData.output.suggestedChecks.map((checkText, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-950/10 transition-colors"
                          >
                            <input
                              type="checkbox"
                              id={`check-${selectedDayNum}-${idx}`}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
                            />
                            <label
                              htmlFor={`check-${selectedDayNum}-${idx}`}
                              className="text-xs text-neutral-700 dark:text-neutral-300 select-none leading-relaxed cursor-pointer"
                            >
                              {checkText}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-800/60" />

                    {/* Follow-up Plan */}
                    <div>
                      <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-semibold block uppercase">
                        📅 แนวทางการติดตามผล (Follow-up Plan)
                      </span>
                      <div className="bg-neutral-50 dark:bg-neutral-950/40 p-3.5 rounded-lg border border-neutral-100 dark:border-neutral-800 mt-1">
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
                          {currentDayData.output.followUp}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: INPUT EVENT */}
        {activeTab === "input" && (
          <div className="space-y-6">

            {/* Header info */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-emerald-600" />
                Readiness Gate: ตรวจความพร้อมก่อนกระทำการ (เกตป้องกันสภาวะช็อค)
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2 max-w-4xl leading-relaxed">
                ก่อนจะลงมือบำรุงปุ๋ย ฉีดพ่นยา หรือให้สารปฏิปักษ์เสริมใดๆ หน้าฝนมีกฎเหล็กที่ต้องคำนึงถึง
                กรุณาตอบคำถามเหล่านี้ผ่านเกตเพื่อให้แน่ใจว่าพืชและสิ่งแวดล้อมพร้อมรับผลกระทบโดยตรง
                <strong> (ระบบจำลองเกตแบบ static เพื่อการทบทวนตามไกด์ไลน์ Green Fineness)</strong>
              </p>
            </div>

            {/* List of readiness gates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_READINESS_GATE_RULES.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h4 className="text-sm font-bold text-neutral-950 dark:text-white leading-tight">
                        {rule.actionName}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-2xs font-semibold font-mono border ${getRiskBadgeStyles(rule.riskScore)}`}>
                        Risk: {rule.riskScore}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-2xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed bg-neutral-50 dark:bg-neutral-950/40 p-2.5 rounded-lg border border-neutral-100/50 dark:border-neutral-800/40">
                      {rule.description}
                    </p>

                    {/* Question List */}
                    <div className="space-y-2.5">
                      <span className="text-3xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold block">
                        คำถามเช็คความพร้อมก่อนลงมือ:
                      </span>
                      {rule.readinessQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span className="text-xs text-neutral-600 dark:text-neutral-300 leading-normal">
                            {q}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ready Indicator Footer */}
                  <div className="mt-6 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
                    <span className="text-2xs text-neutral-500 dark:text-neutral-400 font-mono">
                      สถานะเกต:
                    </span>
                    <span className="text-2xs bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      พร้อมกระทำ (Passed)
                    </span>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 4: WEEKLY SUMMARY */}
        {activeTab === "weekly" && (
          <div className="space-y-6">

            {/* Header info */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Systematic Review: สรุปผลวิเคราะห์ระดับสัปดาห์
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2 max-w-4xl leading-relaxed">
                การวิเคราะห์เชิงระบบโดยแยกแยะระหว่าง **หลักฐานทางกายภาพที่ปรากฏจริง (Evidence)**,
                **การตีความที่เป็นไปได้ภายใต้หลักวิชาการ (Interpretation)** และ **สิ่งที่เป็นอคติหรือด่วนสรุปเกินหลักฐาน (What Not to Conclude Yet)**
                เพื่อป้องกันข้อผิดพลาดที่มักทำให้สูญเสียผลผลิตโดยไม่จำเป็น
              </p>
            </div>

            {/* List of weeks */}
            <div className="space-y-6">
              {MOCK_WEEKLY_SUMMARIES.map((summary, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Week Banner Title */}
                  <div className="bg-neutral-50 dark:bg-neutral-950/60 border-b border-neutral-200 dark:border-neutral-800 p-4 md:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="px-2.5 py-0.5 text-2xs font-bold font-mono bg-emerald-600 text-white rounded">
                        {summary.week}
                      </span>
                      <h4 className="text-sm md:text-base font-bold text-neutral-950 dark:text-white mt-1 sm:mt-0">
                        {summary.title}
                      </h4>
                    </div>
                  </div>

                  {/* Detail Grid */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Observed Evidence */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-neutral-950 dark:text-white flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800/80 pb-2">
                        <span className="text-blue-500 font-mono">🔍</span> 1. หลักฐานที่สังเกตได้จริง (Observed Evidence)
                      </h5>
                      <ul className="space-y-2 pl-1">
                        {summary.observedEvidence.map((item, itemIdx) => (
                          <li key={itemIdx} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-2 leading-relaxed">
                            <span className="text-neutral-400 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Careful Interpretation */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-neutral-950 dark:text-white flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800/80 pb-2">
                        <span className="text-emerald-500 font-mono">🔬</span> 2. การตีความอย่างรอบคอบ (Careful Interpretation)
                      </h5>
                      <ul className="space-y-2 pl-1">
                        {summary.carefulInterpretation.map((item, itemIdx) => (
                          <li key={itemIdx} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-start gap-2 leading-relaxed">
                            <span className="text-emerald-400 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* What Not to Conclude Yet */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800/80 pb-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        3. สิ่งที่ยังไม่ควรด่วนสรุปเด็ดขาด (What Not to Conclude Yet)
                      </h5>
                      <ul className="space-y-2 pl-1">
                        {summary.whatNotToConcludeYet.map((item, itemIdx) => (
                          <li
                            key={itemIdx}
                            className="text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2 leading-relaxed p-2.5 rounded-lg bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-950/20"
                          >
                            <span className="text-rose-500 mt-1">🚫</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 5: REVIEW */}
        {activeTab === "review" && (
          <div className="space-y-6">

            {/* Dashboard Mockup of Learnings */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Retrospective: วิเคราะห์บทเรียนผลลัพธ์การทดลอง 21 วัน
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-4xl">
                บทสรุปจากการทำลองปลูก มะเขือเทศในกระถางผ้า 7 แกลลอน ในสภาวะฤดูฝนสาดสะสม
                หัวใจสำคัญที่เรียนรู้ได้ในเชิงวิทยาศาสตร์คือการฝึกนิสัย &ldquo;หยุดคิด ตรวจเช็ค และอย่าเร่งรีบตอบสนองพืชด้วยสารเคมี&rdquo;
              </p>

              {/* Core takeaways box grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

                {/* Takeaway 1 */}
                <div className="border border-neutral-100 dark:border-neutral-800 p-5 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20">
                  <span className="text-2xl block mb-2">🍂</span>
                  <h4 className="text-sm font-bold text-neutral-950 dark:text-white mb-2">
                    ใบล่างเหลือง &ne; ขาดไนโตรเจน
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
                    ในหน้าฝน น้ำขังสะสมทำให้ออกซิเจนในระบบรากหมดไป พืชไม่สามารถหายใจระดับรากได้ ส่งผลให้เซลล์รากส่วนปลายชำรุด
                    พืชจึงไม่สามารถดูดซึมปุ๋ยขึ้นไปได้เลย อาการเหลืองที่ใบล่างคือผลพวงของการขังน้ำไม่ใช่ขาดปุ๋ย
                    การแก้ปัญหาที่ถูกจุดคือขยับรองก้นกระถางและงดให้น้ำเด็ดขาด ไม่ใช่การเติมปุ๋ยเคมีบำรุง
                  </p>
                </div>

                {/* Takeaway 2 */}
                <div className="border border-neutral-100 dark:border-neutral-800 p-5 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20">
                  <span className="text-2xl block mb-2">🥵</span>
                  <h4 className="text-sm font-bold text-neutral-950 dark:text-white mb-2">
                    ต้นสลดเหี่ยว &ne; ดินขาดน้ำ
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
                    สภาวะฝนหยุดตกแล้วแดดออกเปรี้ยงเฉียบพลันช่วงบ่าย ทำให้ยอดมะเขือเทศคายน้ำอย่างรวดเร็วเพื่อระบายความร้อน
                    แต่รากฝอยบอบช้ำจากสภาวะขาดอากาศก่อนหน้านี้ ทำให้ระบบท่อน้ำพืช (Vascular System) ดูดซึมน้ำไม่ทัน
                    หากเข้าใจผิดว่าดินแห้งแล้วรดน้ำซ้ำช่วงบ่ายที่มีความร้อนสูง น้ำจะไปต้มโคนต้นและรากให้เน่าอย่างถาวร
                    ทางแก้คือพลางแสงช่วงบ่ายและรอให้ดินคลายอุณหภูมิลงในช่วงเย็น
                  </p>
                </div>

                {/* Takeaway 3 */}
                <div className="border border-neutral-100 dark:border-neutral-800 p-5 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20">
                  <span className="text-2xl block mb-2">🦠</span>
                  <h4 className="text-sm font-bold text-neutral-950 dark:text-white mb-2">
                    โรคใบจุด &ne; ล้มเหลวต้องใช้ยาแรง
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
                    สปอร์ของเชื้อราใบจุด (Early Blight) อยู่ในสิ่งแวดล้อมตลอดเวลาและชอบกระโดดเจริญเติบโตที่ผิวใบที่เปียกชื้นและลมอับ
                    การตัดแต่งแต่งใบให้ทรงพุ่มลอยตัวสูงจากผิวดิน 4-6 นิ้ว เพื่อระบายลมร่วมกับการพ่นชีวภัณฑ์บีเอส (Bacillus subtilis)
                    ถือเป็นเครื่องมือที่ปลอดภัยสูงสุดและรักษาสมดุลชีวภาพในกระถางได้ดีกว่าสารเคมีสัมผัสที่ทำร้ายสิ่งมีชีวิตในดิน
                  </p>
                </div>

              </div>

              {/* Scientific loop section */}
              <div className="mt-8 border-t border-neutral-100 dark:border-neutral-800 pt-6">
                <h4 className="text-sm font-bold text-neutral-950 dark:text-white mb-4 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  วงจรปฏิบัติการวิเคราะห์พืชผลลัพธ์ (Arbor Scientific Observation Loop)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  <div className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-lg text-center bg-neutral-50/20 dark:bg-neutral-950/10">
                    <span className="text-lg font-bold block mb-1">1. สังเกตตา</span>
                    <span className="text-2xs text-neutral-500 dark:text-neutral-400">จดบันทึกอาการใบยอด ใบล่าง ทรงพุ่ม</span>
                  </div>
                  <div className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-lg text-center bg-neutral-50/20 dark:bg-neutral-950/10">
                    <span className="text-lg font-bold block mb-1">2. ตรวจวัดค่า</span>
                    <span className="text-2xs text-neutral-500 dark:text-neutral-400">วัด EC ก้นกระถางและวัด pH วัสดุปลูก</span>
                  </div>
                  <div className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-lg text-center bg-neutral-50/20 dark:bg-neutral-950/10">
                    <span className="text-lg font-bold block mb-1">3. กรองความพร้อม</span>
                    <span className="text-2xs text-neutral-500 dark:text-neutral-400">ตอบคำถามผ่าน Readiness Gate</span>
                  </div>
                  <div className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-lg text-center bg-neutral-50/20 dark:bg-neutral-950/10">
                    <span className="text-lg font-bold block mb-1">4. ควบคุมโดส</span>
                    <span className="text-2xs text-neutral-500 dark:text-neutral-400">ห้ามโหมปุ๋ยเคมีสูงจัด รอสังเกตรากเดิน</span>
                  </div>
                  <div className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-lg text-center bg-neutral-50/20 dark:bg-neutral-950/10">
                    <span className="text-lg font-bold block mb-1">5. ติดตามอย่างใจเย็น</span>
                    <span className="text-2xs text-neutral-500 dark:text-neutral-400">สังเกตผลกระทบสะสมใน 24-48 ชั่วโมง</span>
                  </div>
                </div>

                {/* Final reassurance banner */}
                <div className="mt-6 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-950/20 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                        บทเรียน 21 วันเสร็จสมบูรณ์
                      </span>
                      <p className="text-2xs text-neutral-500 dark:text-neutral-400">
                        พืชผ่านพ้นสภาวะหน้าฝนสะสมและผลิดอกบานสะพรั่งเป็นปกติ ดำเนินการทดลองต่อเพื่อสังเกตการติดช่อผล
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("checkin");
                      setSelectedDayNum(1);
                    }}
                    className="flex-shrink-0 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    เริ่มจำลองใหม่อีกรอบ <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
