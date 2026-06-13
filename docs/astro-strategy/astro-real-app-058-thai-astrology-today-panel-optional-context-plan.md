# ASTRO-REAL-APP-DEV-058 — Thai Astrology Today Panel Optional Context Plan

## Goal
จัดทำแผนงานการผสานระบบหน้าจอแสดงผล (UI Integration Plan) สำหรับการนำข้อมูลวิเคราะห์ฤกษ์ยามท้องถิ่นจาก **Thai Astrology Adapter v0.1** เข้าไปแสดงผลบนแผงควบคุมวันนี้ (**AstroTodayPanel**) ในลักษณะกล่องข้อมูลเสริมเชิงเลือก (Optional Context Card) โดยไม่ไปทดแทนหรือเบียดบังข้อมูลวิเคราะห์กลยุทธ์หลักของ Today Timing Engine ในปัจจุบัน

---

## Scope
- การออกแบบการส่งผ่านข้อมูล (Proposed Data Flow) จากหน้าหลักไปยังแผงควบคุม Today Panel
- การจัดวางตำแหน่ง UI (UI Placement) และหน้าตาการนำเสนอ (UI Layout)
- กลไกการพับ/ขยายกล่องข้อความยามไทย (Collapsible/Secondary Card Behavior) เพื่อรักษาพื้นที่สายตา
- แนวทางการควบคุมภาษาที่สอดคล้องกับจริยธรรมจิตวิทยาและ Disclaimers ท้ายกล่อง
- แผนป้องกันข้อผิดพลาด Hydration และการป้องกันระบบล่ม (Fallback & Safety Rules)
- ตรรกะจัดการข้อขัดแย้งของคำแนะนำระหว่างฤกษ์ยามท้องถิ่นและเครื่องยนต์หลัก (Conflict Handling)
- รายการประเมินสิทธิ์และพื้นที่ข้อมูลสำรอง JSON (Storage & Data Portability implications)

## Non-scope
- การเขียนโปรแกรมหรือปรับปรุงรหัสไฟล์รันไทม์ในโฟลเดอร์ `src/` (Documentation-only)
- การบันทึกหรือบันทึกประวัติยามไทยลง LocalStorage ในเฟสนี้

---

## Why Thai Astrology Should Enter as Optional Context First

1. **การปกป้องสิทธิ์การตัดสินใจและความสงบทางอารมณ์ (User Autonomy & Cognitive Calmness)**:
   เนื่องจากโหราศาสตร์ทางเลือกมีระดับความละเอียดอ่อนเชิงความเชื่อต่างกัน การยัดเยียดข้อมูลฤกษ์ยามยามอุบากองลงไปเป็นเกณฑ์หลักอาจสร้างความอึดอัดใจหรือวิตกกังวลแก่ผู้ใช้บางกลุ่ม การจัดวางเป็น "ข้อมูลเสริมเชิงเลือก (Optional Context)" ที่ยุบเก็บได้ตั้งแต่เริ่มต้น ช่วยรักษาบรรยากาศการจดจ่อที่ผ่อนคลาย (Low-stress environment)
2. **รักษาความเสถียรของเครื่องยนต์วางแผน Today Timing Engine ดั้งเดิม**:
   ระบบ Daily Timing Brief ของ Today Engine เป็นระบบหลักที่ผ่านการทดสอบ Smoketest เสถียรแล้ว การต่อพ่วงข้อมูลยามท้องถิ่นในฐานะ Optional props ช่วยลดความเสี่ยงจากการแทรกแซงตรรกะคำนวณเดิม และป้องกันการพังของ UI (No Regression Target)

---

## Current Today Panel & Adapter Baseline
- **AstroTodayPanel**: ปัจจุบันรับข้อมูลผ่านพร็อพส์ (strategyMode, strategyDirection, workRecommendations, riskPreventions, recoveryAnchors, reflectionPrompt) และเรนเดอร์ใน Grid Layout โดยมีส่วนแสดง Metadata ท้ายสุด
- **Thai Astrology Adapter**: โมดูลเดี่ยว Pure TS คำนวณเอาท์พุตประเภท `ThaiAstroStrategyOutput` จากอินพุตวันเกิดและวันเวลาเป้าหมาย

---

## Proposed Data Flow

```text
[AstroRealAppPreview] (Parent Container)
  │
  ├─► 1. ตรวจสอบสถานะ Mount ในเบราว์เซอร์ (Hydration Mounted = true)
  ├─► 2. ดึงค่า clientTime (HH:MM) ปัจจุบัน
  ├─► 3. เรียก calculateThaiAstrologyStrategy(birthProfile, targetDate, clientTime)
  │
  ▼
[thaiAstroOutput] (Optional State Object)
  │
  └─► ส่งต่อลงไปเป็น Props ตัวเลือกให้กับ ──► [AstroTodayPanel]
```

---

## Proposed UI Placement & Collapsible Card Behavior

กล่องข้อมูลยามไทยจะถูกจัดวางเป็น **"การประเมินจังหวะย่อย (Secondary Context Block)"** ขนาดเล็กที่ปิดพับได้ อยู่บริเวณตอนล่างของ `AstroTodayPanel` (เหนือระดับ Metadata และ Disclaimer เดิมเล็กน้อย) เพื่อความกะทัดรัดและไม่ขัดขวางสายตา:

```text
+-------------------------------------------------------------+
|                     DAILY TIMING BRIEF                      |
|  [Today's Mode & Strategic Direction]                       |
|  [Work Rec / Risk Prevention / Recovery Anchor]             |
|                                                             |
|  +-------------------------------------------------------+  |
|  | 🧭 จังหวะเวลาไทยประกอบการทบทวน (Thai Timing Context)  |  |
|  |   [ ยามปลอดโปร่ง (สี่จักรา) | สอดคล้อง: 90% ] [คลิกปิด] |  |
|  |   -------------------------------------------------   |  |
|  |   * ทิศทางเชิงฤกษ์: จังหวะเอื้อต่อความโปร่งของสมาธิ...  |  |
|  |   * คำแนะนำปฏิบัติ: เปิดโหมดห้ามรบกวน 45 นาที...       |  |
|  |   * ข้อสังเกต: ระวังการสลับเปิดหน้างานบ่อยครั้ง...        |  |
|  |   * Disclaimer: ใช้เพื่อสะท้อนและตั้งสมาธิเท่านั้น       |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  [การคำนวณ: rule-based | เอนจิ้น: ... ]                      |
+-------------------------------------------------------------+
```

### รายละเอียดกลไกการแสดงผล (Collapsible State)
- **สถานะเริ่มต้น (Default Open State)**: กำหนดให้ผู้ใช้สลับปิด/เปิดในเมนูการตั้งค่า Left panel หากไม่ได้เปิดใช้ กล่องนี้จะไม่ถูกคำนวณหรือเรนเดอร์เลย
- **ปุ่มยุบพับ (Accordion Switch)**: เมื่อเรนเดอร์ ตัวกล่องจะมีปุ่มสำหรับยุบข้อความคำชี้แนะเชิงลึกให้เหลือเพียงแค่ป้ายหัวข้อและสัญลักษณ์ยามสั้นๆ (เช่น `🧭 ยามปลอดโปร่ง (สี่จักรา)`) เพื่อความเรียบร้อยของหน้าจอ

---

## Copy-Safety & Accessibility Guide
- **ฉลากภาษาไทยกำกับ**: บังคับใช้คำระบุขอบเขตชัดเจน เช่น **"จังหวะเวลาไทยประกอบการทบทวน"** หรือ **"คำแนะนำจังหวะรอบยามย่อย (Thai Timing Context)"** เพื่อไม่ให้เกิดการเข้าใจสับสนว่าเป็นโหมด Today Engine ปัจจุบัน
- **การคัดกรองขอบเขตเนื้อหา**:
  - **แสดงผลเฉพาะ**: สัญญาณยาม, อุปมาอุปไมยธรรมชาติ, การจัดการเวลาสมาธิ (suggestedAction) และจุดเฝ้าสังเกตความล้า (cautionNote)
  - **ห้ามแสดง**: คำทำนายเรื่องโชคลาภเงินทอง เคราะห์ร้ายลี้ลับ หรือสุขภาพที่อวดอ้างทางการแพทย์
- **disclaimer ยึดโยงความมีสติ (Safety Disclaimer)**: ทุกหน้าการเปิดแสดงผลยามไทย ต้องมี Disclaimer ขนาดอักษรเล็กระบุท้ายการตั้งคำเตือนเสมอ

---

## Hydration Safety Plan
เพื่อป้องกันไม่ให้ Next.js แจ้ง hydration mismatch ล้มเหลวจากการคำนวณเวลาเบราว์เซอร์ไม่ตรงกับเซิร์ฟเวอร์ตอน prerender:
- **ลอจิกควบคุม**:
  - ห้ามดึงค่าเวลาปัจจุบันหรือวันในฝั่งเซิร์ฟเวอร์ ให้กำหนดค่าเริ่มต้นเป็น `null`
  - ทำการ Mount หน้าจอและคำนวณเอาท์พุตยามไทยในเบราว์เซอร์ผู้ใช้หลัง `useEffect` รันเสร็จสิ้นเท่านั้น
  - หาก `clientTime` ยังไม่พร้อม ให้ซ่อนกล่อง context card นี้อย่างเงียบๆ

---

## Fallback & Graceful Degradation (การจัดการข้อผิดพลาด)
- หากข้อมูล Birth Profile ของผู้ใช้ไม่มีการระบุค่า หรือตัว Adapter คำนวณล้มเหลวเนื่องจากฟอร์แมตวันที่ผิดพลาด **กล่องข้อมูลยามไทยจะซ่อนตัวหายไปโดยอัตโนมัติ (Graceful Fallback)**
- ระบบการทำงานหลักของ Today Panel และ Daily Brief ดั้งเดิมจะยังคงแสดงผลและทำงานได้สมบูรณ์เป็นปกติ โดยไม่มีการชะงักงันของหน้าจอแอปพลิเคชัน

---

## Conflict Handling with Today Timing Engine
- หากยามอุบากองท้องถิ่นแนะแนวทางขัดแย้งกับ Today Engine:
  - ให้ระบบ Composer ยึดถือ Today Engine เป็นหลัก และแสดงข้อแนะนำคู่ขนานแบบให้ทางเลือกเชิงสมาธิ
  - หากสเตตัสความล้าสะสมในประวัติสูง ระบบจะสับปรับความสำคัญของยามไทยเชิงรุกลง และดึงข้อเตือนสติความระมัดระวัง (Low-burnout priority) ขึ้นเตือนควบคู่กับการทำสมาธิ (Meditation Layer) เสมอ

---

## Storage & Data Portability Implications
- **ไม่มีการบันทึก (No Persistence in v0.1)**: ข้อมูลยามไทยที่เรนเดอร์ใน UI จะคำนวณและประมวลผลสดบนหน่วยความจำของหน้าเบราว์เซอร์เท่านั้น และยังไม่มีการบันทึกคีย์เสริมลง LocalStorage เพื่อป้องกันปัญหาความหนาแน่นของข้อมูลประวัติสะสมพังทลาย
- **ความปลอดภัยในการโอนย้าย**: แผนงานนี้รักษาความสมบูรณ์ในการดาวน์โหลดนำเข้าสำรองข้อมูลเดิมของ v3 ไว้ได้อย่างดีเลิศ

---

## Accessibility and Readability Notes
- คาร์ดเสริมของยามไทยต้องรักษาระดับอัตราส่วนความต่างสี (Contrast Ratio) ที่เหมาะสม เช่น ใช้พื้นหลังสีเทาเข้มขอบบางเฉียบตัดกับข้อความสีขาวนวล และกำหนด `aria-expanded` เพื่อระบุสถานะการเปิด/ปิดสำหรับผู้ใช้ที่เรียกใช้เครื่องมืออ่านหน้าจอ (Screen readers)

---

## Future Manual QA Plan
1. **ทดสอบ UI Toggling (สวิตช์ปิด/เปิด)**:
   - ทดสอบกดสวิตช์เปิด/ปิด Thai Layer ในแผงควบคุมหลัก และตรวจสอบว่ากล่อง context card ปรากฏและซ่อนตัวตามสั่งอย่างเสถียร
2. **ทดสอบ Hydration Smoke Test**:
   - รีเฟรชหน้าเบราว์เซอร์รัวๆ 5 รอบ ตรวจสอบในดีบักคอนโซลของ Next.js ว่าไม่มีการแจ้งเตือน Hydration Mismatches เกิดขึ้น
3. **ทดสอบ Mixed Signals Preview**:
   - ป้อนวันประเมินเป้าหมายที่ขัดแย้งกับธาตุเกิด และสังเกตการปรับโทนคำแนะนำการเตือนใจเชิงกลยุทธ์ว่าเป็นไปตามเกณฑ์ Low-burnout หรือไม่

---

## Recommended Next Task
* **ASTRO-REAL-APP-DEV-059 — First Implementation: Thai Astro Strategy Layer v0.1** (ลงมืออิมพลีเมนต์และเชื่อมโยง UI Today Panel ในเฟสถัดไป)

---

## Final Integration Plan Verdict

```text
Thai Today Context Plan Approved: Optional collapsed UI placement defined, hydration safety secured, read-only status locked, and Today Engine hierarchy preserved.
```
