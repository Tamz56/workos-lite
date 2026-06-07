"use client";

import * as React from "react";
import { User, Save, RefreshCw, AlertCircle, CheckCircle2, Calendar, Clock, MapPin, Globe, Info } from "lucide-react";
import {
  loadAstroBirthProfile,
  saveAstroBirthProfile,
  resetAstroBirthProfileToDefault,
  validateAstroBirthProfile
} from "../data/astroRealAppBirthProfileStorageAdapter";
import { AstroBirthProfile, AstroBirthProfileValidationIssue } from "../data/astroRealAppTypes";

export function AstroBirthProfilePanel() {
  const [profile, setProfile] = React.useState<AstroBirthProfile>({
    displayName: "",
    fullName: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    timezone: "Asia/Bangkok",
    utcOffset: "+07:00",
    birthWeekday: "Thursday",
    notes: ""
  });

  const [validationIssues, setValidationIssues] = React.useState<AstroBirthProfileValidationIssue[]>([]);
  const [saveStatus, setSaveStatus] = React.useState<{ success: boolean; message: string } | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Load profile on client mount
  React.useEffect(() => {
    const loaded = loadAstroBirthProfile();
    setProfile({
      displayName: loaded.displayName || "",
      fullName: loaded.fullName || "",
      birthDate: loaded.birthDate || "",
      birthTime: loaded.birthTime || "",
      birthPlace: loaded.birthPlace || "",
      timezone: loaded.timezone || "Asia/Bangkok",
      utcOffset: loaded.utcOffset || "+07:00",
      birthWeekday: loaded.birthWeekday || "Thursday",
      notes: loaded.notes || "",
      updatedAt: loaded.updatedAt,
      schemaVersion: loaded.schemaVersion
    });
    setIsHydrated(true);
  }, []);

  const handleFieldChange = (field: keyof AstroBirthProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const validation = validateAstroBirthProfile(profile);
    if (!validation.isValid) {
      setValidationIssues(validation.issues);
      setSaveStatus({ success: false, message: "กรุณาแก้ไขข้อผิดพลาดก่อนบันทึกข้อมูล" });
      return;
    }

    const result = saveAstroBirthProfile(profile);
    if (result.success) {
      setValidationIssues([]);
      setSaveStatus({ success: true, message: "บันทึกข้อมูลโปรไฟล์ดวงเกิดสำเร็จ" });
      if (result.profile) {
        setProfile(result.profile);
      }
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus({ success: false, message: result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    }
  };

  const handleResetToDefault = () => {
    const confirmed = window.confirm(
      "คุณต้องการรีเซ็ตโปรไฟล์ดวงเกิดเป็นค่าเริ่มต้น (คุณตั้ม) ใช่หรือไม่?\nการกระทำนี้จะเขียนทับข้อมูลที่คุณกรอกไว้ทั้งหมด"
    );
    if (confirmed) {
      const result = resetAstroBirthProfileToDefault();
      if (result.success && result.profile) {
        setProfile(result.profile);
        setValidationIssues([]);
        setSaveStatus({ success: true, message: "รีเซ็ตโปรไฟล์เป็นค่าเริ่มต้นเรียบร้อยแล้ว" });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({ success: false, message: result.error || "เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล" });
      }
    }
  };

  const getFieldError = (field: keyof AstroBirthProfile) => {
    const issue = validationIssues.find(i => i.field === field);
    return issue ? issue.message : null;
  };

  if (!isHydrated) {
    return (
      <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-6 text-center text-slate-350 text-xs font-medium">
        กำลังโหลดข้อมูลโปรไฟล์ดวงเกิด...
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-5 sm:p-6 space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          <div>
            <h4 className="text-sm font-semibold text-slate-200">โปรไฟล์ดวงเกิดสำหรับวางแผนเชิงกลยุทธ์ (Birth Profile)</h4>
            <p className="text-[10px] text-slate-400">ระบุตำแหน่งของดวงดาว ณ เวลาเกิดเพื่อจำลองจังหวะจริยธรรมส่วนบุคคล</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-300 flex items-center gap-1.5 self-start sm:self-center">
          {profile.updatedAt && (
            <span className="font-mono text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
              อัปเดตล่าสุด: {new Date(profile.updatedAt).toLocaleDateString("th-TH")} {new Date(profile.updatedAt).toLocaleTimeString("th-TH")}
            </span>
          )}
          {profile.schemaVersion && (
            <span className="font-mono text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40 font-bold">
              v{profile.schemaVersion}
            </span>
          )}
        </div>
      </div>

      {/* Save / Error Feedback Alert */}
      {saveStatus && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 animate-fadeIn ${
            saveStatus.success
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/30 border-rose-500/30 text-rose-300"
          }`}
        >
          {saveStatus.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{saveStatus.message}</span>
        </div>
      )}

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* displayName */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <span>👤 ชื่อเรียกแสดงผล (Display Name)</span>
            <span className="text-rose-450 text-[10px] font-normal">*จำเป็น</span>
          </label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => handleFieldChange("displayName", e.target.value)}
            placeholder="เช่น คุณตั้ม, ตั้ม"
            className={`w-full bg-slate-950 border ${
              getFieldError("displayName") ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-violet-500/50"
            } rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500`}
          />
          {getFieldError("displayName") && (
            <p className="text-rose-400 text-[10px] mt-0.5">{getFieldError("displayName")}</p>
          )}
        </div>

        {/* fullName */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <span>📝 ชื่อเต็มตามระเบียน (Full Name)</span>
            <span className="text-rose-450 text-[10px] font-normal">*จำเป็น</span>
          </label>
          <input
            type="text"
            value={profile.fullName}
            onChange={(e) => handleFieldChange("fullName", e.target.value)}
            placeholder="เช่น อภิรักษ์, อภิรักษ์ ประเปโซ"
            className={`w-full bg-slate-950 border ${
              getFieldError("fullName") ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-violet-500/50"
            } rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500`}
          />
          {getFieldError("fullName") && (
            <p className="text-rose-400 text-[10px] mt-0.5">{getFieldError("fullName")}</p>
          )}
        </div>

        {/* birthDate */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>📅 วันเกิด (Birth Date)</span>
            <span className="text-rose-450 text-[10px] font-normal">*จำเป็น</span>
          </label>
          <input
            type="date"
            value={profile.birthDate}
            onChange={(e) => handleFieldChange("birthDate", e.target.value)}
            className={`w-full bg-slate-950 border ${
              getFieldError("birthDate") ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-violet-500/50"
            } rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all [color-scheme:dark]`}
          />
          {getFieldError("birthDate") && (
            <p className="text-rose-400 text-[10px] mt-0.5">{getFieldError("birthDate")}</p>
          )}
        </div>

        {/* birthTime */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>⏰ เวลาเกิด (Birth Time)</span>
            <span className="text-rose-450 text-[10px] font-normal">*จำเป็น</span>
          </label>
          <input
            type="time"
            value={profile.birthTime}
            onChange={(e) => handleFieldChange("birthTime", e.target.value)}
            className={`w-full bg-slate-950 border ${
              getFieldError("birthTime") ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-violet-500/50"
            } rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all [color-scheme:dark]`}
          />
          {getFieldError("birthTime") && (
            <p className="text-rose-400 text-[10px] mt-0.5">{getFieldError("birthTime")}</p>
          )}
        </div>

        {/* birthPlace */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>📍 สถานที่เกิด (Birth Place)</span>
            <span className="text-rose-450 text-[10px] font-normal">*จำเป็น</span>
          </label>
          <input
            type="text"
            value={profile.birthPlace}
            onChange={(e) => handleFieldChange("birthPlace", e.target.value)}
            placeholder="เช่น Siriraj Hospital, Bangkok, Thailand"
            className={`w-full bg-slate-950 border ${
              getFieldError("birthPlace") ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-violet-500/50"
            } rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500`}
          />
          {getFieldError("birthPlace") && (
            <p className="text-rose-400 text-[10px] mt-0.5">{getFieldError("birthPlace")}</p>
          )}
        </div>

        {/* timezone */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>🌐 เขตเวลาเกิด (Timezone)</span>
            <span className="text-rose-450 text-[10px] font-normal">*จำเป็น</span>
          </label>
          <input
            type="text"
            value={profile.timezone}
            onChange={(e) => handleFieldChange("timezone", e.target.value)}
            placeholder="เช่น Asia/Bangkok"
            className={`w-full bg-slate-950 border ${
              getFieldError("timezone") ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-violet-500/50"
            } rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500`}
          />
          {getFieldError("timezone") && (
            <p className="text-rose-400 text-[10px] mt-0.5">{getFieldError("timezone")}</p>
          )}
        </div>

        {/* utcOffset */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 block">⏱️ ค่าเบี่ยงเบนเวลา (UTC Offset)</label>
          <input
            type="text"
            value={profile.utcOffset}
            onChange={(e) => handleFieldChange("utcOffset", e.target.value)}
            placeholder="เช่น +07:00, -05:00"
            className="w-full bg-slate-950 border border-slate-700 focus:border-violet-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* birthWeekday */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-200 block">📅 วันเกิดตามรอบสุริยคติ (Birth Weekday)</label>
          <select
            value={profile.birthWeekday}
            onChange={(e) => handleFieldChange("birthWeekday", e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 focus:border-violet-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all [color-scheme:dark]"
          >
            <option value="Sunday">วันอาทิตย์ (Sunday)</option>
            <option value="Monday">วันจันทร์ (Monday)</option>
            <option value="Tuesday">วันอังคาร (Tuesday)</option>
            <option value="Wednesday">วันพุธ (Wednesday)</option>
            <option value="Thursday">วันพฤหัสบดี (Thursday)</option>
            <option value="Friday">วันศุกร์ (Friday)</option>
            <option value="Saturday">วันเสาร์ (Saturday)</option>
          </select>
        </div>

        {/* notes */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-200 block">✏️ บันทึกหมายเหตุส่วนบุคคล (Notes)</label>
          <textarea
            value={profile.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            placeholder="จดบันทึกประเด็นที่สังเกตเพิ่มเติมเกี่ยวกับวันเกิดหรือจริยธรรมสะท้อนคิด..."
            rows={2}
            className="w-full bg-slate-950 border border-slate-700 focus:border-violet-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all resize-none placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Button Controls Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-700/60">
        <button
          onClick={handleResetToDefault}
          type="button"
          className="w-full sm:w-auto py-2 px-4 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>รีเซ็ตโปรไฟล์เริ่มต้น</span>
        </button>

        <button
          onClick={handleSave}
          type="button"
          className="w-full sm:w-auto py-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-950/20 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>บันทึกข้อมูลดวงเกิด</span>
        </button>
      </div>

      {/* Ethics Disclaimer Callout */}
      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-start gap-3 mt-4">
        <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] text-slate-350 leading-relaxed">
          <p className="font-bold text-slate-200">ข้อควรทราบเกี่ยวกับข้อมูลสะท้อนคิดส่วนบุคคล</p>
          <p>
            ข้อมูลนี้จัดเก็บในเครื่องคอมพิวเตอร์ของคุณเท่านั้น และนำไปใช้เพื่อช่วยเหลือในกระบวนการทบทวนไตร่ตรอง 
            และสนับสนุนการวางแผนเชิงกลยุทธ์ส่วนตัวเท่านั้น **ไม่ใช่คำทำนายตายตัว ล่วงรู้อนาคต หรือถือเป็นคำแนะนำทางการแพทย์/การวินิจฉัยโรคใดๆ**
          </p>
        </div>
      </div>
    </div>
  );
}
