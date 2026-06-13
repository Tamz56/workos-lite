# ASTRO-REAL-APP-DEV-056 — Thai Astrology Adapter v0.1 Implementation

## Goal
อิมพลีเมนต์โมดูลคำนวณรันไทม์ **Thai Astrology Strategy Layer adapter v0.1** เป็นไลบรารี Pure TypeScript แบบเก็บข้อมูลและประมวลผลภายในเครื่องผู้ใช้ทั้งหมด (Local-first) เพื่อมอบชุดคำชี้แนะเชิงกลยุทธ์ จังหวะเวลาระดับย่อย (ยามอุบากอง) และรอบธาตุวันเกิด โดยปราศจากการเปลี่ยนแปลง UI หรือแก้ไขระบบ Today/Weekly Engine หลักในเฟสนี้

---

## Scope
- การอัปเดตไฟล์กำหนดประเภทข้อมูล `astroRealAppTypes.ts`
- การจัดสร้างไฟล์คำนวณและเก็บคลังข้อมูลฤกษ์ยามท้องถิ่น `astroRealAppThaiAstrologyAdapter.ts`
- การออกแบบลอจิกแบ่งช่วงเวลา 5 ยาม และการตรวจเช็ควันเกิดประเคราะห์คู่กับปฏิทินเป้าหมาย
- รายละเอียดข้อความปลอดภัยและการหลีกเลี่ยงตรรกะความเชื่อที่ฟันธง (Non-deterministic outputs)

## Non-scope
- การสร้างและต่อเติมแผงหน้าจอ UI บนหน้าแอปพลิเคชันจริง
- การบันทึกหรือเขียนข้อมูลผลลัพธ์ลง LocalStorage ของผู้ใช้ในรอบนี้
- การเปลี่ยนหรือเขียนทับประวัติสะท้อนคิดเดิมในฐานข้อมูล

---

## Files Changed

1. **[MODIFY]** [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts)
   - เพิ่มอินเตอร์เฟซและประเภทตัวแปร `ThaiAstroTimingContext`, `ThaiAstroStrategyOutput` และฟิลด์เสริมที่เกี่ยวข้องในลักษณะ Optional
2. **[NEW]** [astroRealAppThaiAstrologyAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiAstrologyAdapter.ts)
   - โมดูลคำนวณฤกษ์ยามท้องถิ่น ตารางยามอุบากอง และระบบธาตุสัมพันธ์ไทยแบบ Static Dictionary

---

## Adapter Responsibilities

1. **Yam Ubakong Contextual Mapping**:
   แปลงค่าเวลาเป้าหมาย (HH:MM) ไปสู่ช่วงยามทำงานกลางวัน 5 ช่วงหลัก (ยามละ 144 นาที ตั้งแต่ 06:00 ถึง 18:00) และจับคู่กับวันปัจจุบันเพื่อสกัดสัญญาณ ความหมาย และคำแนะนำการประคองความคิดที่สัมพันธ์กัน
2. **Element Alignment Analysis**:
   วิเคราะห์คู่ธาตุระหว่างธาตุวันเกิดของผู้ใช้ (คำนวณจาก Birth Weekday) ร่วมกับธาตุวันปัจจุบัน เพื่อให้คะแนนความสอดคล้องเชิงสัญญะ (Symbolic Alignment Score)
3. **Synthesis & Safety Formatting**:
   รวบรวมบทวิเคราะห์ทั้งหมด แปลงมาเป็นข้อแนะนำการปฏิบัติตนทีละขั้น (Suggested Actions) และล้างรูปแบบถ้อยคำผ่านตัวกรอง disclaimers และเกณฑ์ความปลอดภัยทางจิตวิทยา

---

## Type Definitions
```typescript
export type ThaiAstroLayerSource = string;
export type ThaiAstroSignal = string;
export type ThaiAstroSymbolicAlignment = number;
export type ThaiAstroCautionLevel = "low" | "medium" | "high";

export interface ThaiAstroTimingContext {
  readonly isBirthWeekdayCycle: boolean;
  readonly currentYamIndex?: number;
  readonly rawTimeChecked: string;
}

export interface ThaiAstroStrategyOutput {
  readonly layerName: string;
  readonly source: ThaiAstroLayerSource;
  readonly timingContext: ThaiAstroTimingContext;
  readonly thaiAstroSignal: ThaiAstroSignal;
  readonly symbolicMeaning: string;
  readonly strategyImplication: string;
  readonly suggestedAction: string;
  readonly reflectionPrompt: string;
  readonly cautionNote: string;
  readonly cautionLevel: ThaiAstroCautionLevel;
  readonly symbolicAlignment: ThaiAstroSymbolicAlignment;
  readonly confidenceNotes: string;
  readonly safetyDisclaimer: string;
  readonly generatedAt: string;
}
```

---

## Static Dictionary Strategy
เพื่อป้องกันข้อจำกัดความจุเบราว์เซอร์ล้นเร็ว (Storage Limit) ตัว Adapter เก็บตารางคำแปลและคำแนะนำเชิงปรัชญาธรรมชาติทั้งหมดไว้ในตัวแปรคงที่ (Static Constants: `THAI_YAM_IMPLICATIONS`, `THAI_YAM_DAILY_GRID`, `THAI_WEEKDAY_ELEMENT_MAP`, `THAI_ELEMENT_RELATIONS`) ภายในโค้ดรันไทม์ ทำให้ในการบันทึกประวัติสะท้อนคิดลงในเครื่องภายหลังจะจัดเก็บเพียงค่ารหัสและดัชนียามอย่างประหยัดที่สุด

---

## Safety and Copy Guardrails
- **ความปลอดภัยของถ้อยคำ**: คลังข้อความใช้ภาษาแนะนำสไตล์การทำงานและการจดจ่อ (Focus Wording) โดยปราศจากประโยคทวงเคราะห์กรรม หรือเคลมการรักษาโรค
- **ตัวอย่างการสกัดคำแนะนำฤกษ์ระวัง**: ยามศูนย์หนึ่งหรือยามมหาอุบาทว์ดั้งเดิม ถูกปรับภาษาใหม่เป็น **"ยามเฝ้าระวังความล้า (มหาอุบาทว์/ศูนย์หนึ่ง)"** และแนะนำให้ **"หลีกเลี่ยงการลงนามตกลงข้อเสนอที่มีความเร่งรีบในชั่วโมงนี้"** แทนประโยคข่มขู่สร้างความกลัว

---

## Storage & Portability Behavior
- ในสายงานพัฒนารอบนี้ **จะไม่มีการเขียนข้อมูลใดๆ ลง LocalStorage** เพื่อรักษาวินัยความมั่นคงของฐานข้อมูล MVP-v3
- โครงสร้างตัวแปร Optional ช่วยให้ข้อมูลประวัติที่ถูก Export ออกไป หรือนำเข้ากู้คืนเข้าสู่ระบบไม่พังและยังเข้ากันได้ย้อนหลัง 100%

---

## Hydration Safety Plan
ตัว Adapter เป็น Pure TypeScript ที่ไม่มีการดึง Browser API หรือประมวลผลเวลาเครื่องสดๆ ภายในลอจิกการสกัดค่า ช่วยขจัดปัญหา Hydration Mismatch ใน Next.js โดยผู้ใช้งานต้องส่งค่า `targetTime` เข้ามาเป็นสตริง และ UI คอมโพเนนต์ด้านนอกจะทำหน้าที่ Mount เวลาไคลเอนต์หลัง Hydration ผ่าน React `useEffect` ก่อนส่งต่อมาวิเคราะห์ผลลัพธ์

---

## Manual QA Verification Steps
1. **การตรวจสอบผลลัพธ์ยาม (Yam Mapping QA)**:
   - เรียกใช้ `buildThaiAstroStrategyOutput` โดยส่ง Input จำลองวันพฤหัสบดี เวลา `10:15` และตรวจสอบว่าผลลัพธ์สกัดได้ `yam-single-zero` (ยามศูนย์ตัวเดียว) หรือไม่
2. **การคัดกรองภาษาต้องห้าม (Ethics Scanning QA)**:
   - ตรวจสอบว่าเอาท์พุตไม่มีคำต้องห้ามใน Copy-safety และมี Disclaimer กำกับท้ายข้อความเสมอ
3. **การตรวจสอบ Build & Lint (Compilation QA)**:
   - ทดสอบรันคำสั่ง ESLint และ Next.js Build เพื่อตรวจสอบความสมบูรณ์และไม่มีข้อผิดพลาดคอมไพเลอร์

---

## Future UI Integration Recommendation
- เมื่อล็อก Adapter สำเร็จแล้ว ในงาน **DEV-058 (UI Plan)** แนะนำให้ออกแบบหน้ากล่องข้อแนะนำยามอุบากองย่อลงบน Right Sidebar ของ Today Panel โดยมีสวิตช์ปิด/เปิด Toggle ชัดเจนที่หน้า Settings หรือ Left panel เพื่อให้อำนาจความเป็นอิสระแก่ผู้ใช้เลือกซ่อนข้อมูลได้เสมอ

---

## Recommended Next Task
* **ASTRO-REAL-APP-DEV-057 — Chinese Metaphysics Layer Design**
