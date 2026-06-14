# ASTRO-REAL-APP-DEV-083 — Composer Runtime Adapter QA & Regression Review

เอกสารสรุปรายงานการประเมินคุณภาพและตรวจสอบผลกระทบข้างเคียง (QA & Regression Review) ของ **Natal + Transit Strategy Composer Runtime Adapter v0.1**

---

## 1. Goal (เป้าหมาย)

ตรวจสอบและยืนยันคุณภาพความสมบูรณ์เชิงสถาปัตยกรรมและการประสานสัญญาณของอแดปเตอร์ Composer (`astroRealAppNatalTransitStrategyComposer.ts`) ซึ่งพัฒนาใน DEV-082 เพื่อยืนยันว่า:
- ทำงานในลักษณะ Standalone / Pure logic (ไม่มี React, ไม่มี UI import)
- ปราศจากผลกระทบข้างเคียง (No side effects, No window/document/localStorage read/write)
- คุมกฎถ้อยคำภาษาและการกรองสัญญาณรบกวน (Signal Suppression) ได้ถูกต้องครบถ้วน

---

## 2. Source Integrity Audit (การตรวจสอบความถูกต้องของรหัส)

ผลจากการสแกนซอร์สโค้ด [astroRealAppNatalTransitStrategyComposer.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppNatalTransitStrategyComposer.ts) ยืนยันข้อมูลด้านความสะอาดดังนี้:
* **ไม่มี window / document / localStorage**: ทำงานบนหน่วยความจำ RAM อย่างเป็นเอกเทศ
* **ไม่มี fetch / external API**: ประมวลผลลัพธ์แบบสถิติกำหนดเองภายในระบบ (In-memory computation)
* **ไม่มี React / UI component import**: นำเข้าเฉพาะอินเทอร์เฟซประเภทข้อมูลดิบจาก `astroRealAppTypes` เท่านั้น
* **ไม่มี side effects / route changes / schema write**: ไม่มีคำสั่งหรือผลการดำเนินการใดๆ ที่สร้างผลกระทบต่อภายนอก (Pure Function)

---

## 3. Output Contract Alignment (ความสอดคล้องของเอาท์พุต)

รายการฟิลด์ข้อมูลที่ส่งออกตรงตามสเปกของข้อตกลงข้อมูลขาออก DEV-081 ครบถ้วน:
- `layerName`: ระบุค่า `"Natal + Transit Strategy Composer"`
- `source`: ระบุค่า `"ArborDesk Strategy Composer v0.1"`
- `strategyDate`: ส่งต่อวันเป้าหมายจร YYYY-MM-DD
- `strategyMode`: ประเมินโหมดหลัก (`Focus`, `Stabilize`, `Pause`, `Review`, `Recover`)
- `primaryRecommendation`: คำแนะนำเด่นสุด 1 ข้อ (1-2 บรรทัด)
- `secondaryRecommendation`: รายการข้อปฏิบัติย่อย 2-3 จุด
- `cautionLevel`: ระดับข้อเตือนสังเกต (`low`, `medium`, `high`)
- `focusWindow`: ช่วงเวลาประครองสมาธิ
- `workModePriority`: รายการประเภทงานแนะนำ
- `recoveryPriority`: กิจกรรมฟื้นฟูเบา ๆ
- `decisionGuidance`: แนวทางประกอบการตัดสินใจเรื่องตึงเครียด
- `supportingSignals`: รายการรหัสสัญญาณจรที่ผ่านการกรองแล้ว
- `suppressedSignals`: ประวัติสัญญาณดาวจรที่ถูกระงับ
- `conflictResolutionNotes`: บันทึกคำอธิบายสั้นของตรรกะระบบ
- `reflectionPrompt`: คำถามชวนสะท้อนสติ
- `confidenceNotes`: รายละเอียดการFallbackและความมั่นใจ
- `safetyDisclaimer`: ข้อความคำชี้แจงความปลอดภัยข้อมูลประจำระบบ
- `generatedAt`: ISO Timestamp

---

## 4. Priority Rule & Low-Burnout Review (ลำดับความสำคัญ)

* **ลำดับความสำคัญ**: ระบบสืบค้นและให้น้ำหนักแก่ระดับความล้าสะสมของผู้ใช้เป็นอันดับหนึ่ง เมื่อเหนื่อยล้าสูง (`isExtremelyFatigued`) โหมดจะถูกปรับเข้าสู่ `Recover` เสมอ และหากพลังงานของร่างกายต่ำ (`isLowEnergy`) จะปรับเข้าสู่ `Pause` โดยไม่ปล่อยให้ทัศนคติส่งเสริมของดวงดาวจรเข้ามา override หรือแก้ไขโหมดนี้
* **Signal Suppression**: สัญญาณ `TH_SIG_DEEP_WORK` และ `TH_SIG_REFACTOR` จะถูกกรองออกจากรายการแสดงผลหลักและบันทึกเหตุผลกำกับไว้เมื่อระดับความเหนื่อยล้าสะสมสูง

---

## 5. Conflict Handling Test Cases (กรณีทดสอบขัดแย้ง 8 รูปแบบ)

| กรณีทดสอบ | ทิศทางอินพุต | ผลลัพธ์คาดหวัง / ผลจริง | สเตตัส |
| :--- | :--- | :--- | :---: |
| **กรณีที่ 1** | Today Engine = Pause, Transit = Focus | ปรับเข้าหาจุดกลางความเสถียรที่ **Stabilize** | **Passed** |
| **กรณีที่ 2** | User Fatigue = High, Transit supports Deep Work | สลับโหมดเป็น **Recover** และปิดสัญญาณลุยงานทั้งหมด | **Passed** |
| **กรณีที่ 3** | ข้อมูล `natalStrategyProfile` หายไป | ทำงานได้ปกติ ปรับลดคะแนนมั่นใจลง 35% ใน `confidenceNotes` | **Passed** |
| **กรณีที่ 4** | ข้อมูล `thaiTransitContext` หายไป | ทำงานได้ปกติ ปรับลดคะแนนมั่นใจลง 10% และยืดหยุ่น fallback | **Passed** |
| **กรณีที่ 5** | ข้อมูล `todayTimingData` หายไป | ทำงานได้ปกติ ปรับลดคะแนนมั่นใจลง 15% และ fallback เป็นโหมด Focus | **Passed** |
| **กรณีที่ 6** | ข้อมูลเสริมข้ามศาสตร์ขัดแย้งกันขัดเจน | แสดงแยกป้ายใน `supportingSignals` โดยไม่นำมาลบล้างโหมดหลัก | **Passed** |
| **กรณีที่ 7** | สัญญาณวันจรมีความมั่นใจต่ำ | สลัดสัญญาณออกจาก supporting โดยไม่ประมวลผล | **Passed** |
| **กรณีที่ 8** | ไม่มีประวัติบันทึกสะท้อนคิดสะสม | ประเมินความล้าเป็นปกติ (low) และใช้ Today Engine ควบคุม | **Passed** |

---

## 6. Copy Safety Scan (การตรวจสอบความปลอดภัยของคำศัพท์)

ทำการประเมินคีย์เวิร์ดภาษาไทยของดวงจรอย่างละเอียด ไม่พบคีย์เวิร์ดต้องห้ามเชิงจิตวิทยาลบ:
* **คำว่า "เคราะห์"**: ไม่พบคำศัพท์โดดเดี่ยวหรือคำว่า "เคราะห์ร้าย / เคราะห์กรรม" มีเพียงคำว่า `"วิเคราะห์"` และ `"สังเคราะห์"` ซึ่งปรากฏเพื่อบรรยายเชิงการวิเคราะห์ระบบงานและการสังเคราะห์ความรู้ ไม่มีความหมายลบในสัญญะชะตาชีวิต
* **คำอื่น ๆ (ซวย, กาลกิณี, อุบัติเหตุ, งานพัง, เงินเสียแน่, ความรักพัง, ห้ามทำเด็ดขาด, จะเกิดแน่นอน, ดวงบังคับ, ต้องทำวันนี้เท่านั้น, ถ้าไม่ทำจะเสียโอกาส)**: ไม่พบในส่วนใดๆ ของเอกสารหรือซอร์สโค้ดอแดปเตอร์ 100%

---

## 7. Regression Review (การป้องกันการถดถอยเชิงพฤติกรรม)

* **UI Components**: ไฟล์ `AstroTodayPanel.tsx` และ `AstroRealAppPreview.tsx` ไม่มีการแก้ไขหรือเปลี่ยนแปลงตลอดการพัฒนา DEV-082 (ไม่มีผลกระทบต่อ UI)
* **Storage logic**: ข้อมูลการสำรองข้อมูล (Export / Import / Restore) และ schema ในประวัติสะท้อนคิดเก่ายังคงเดิมและทำงานได้เสถียร 100%
* **Context layers**: เลเยอร์ธาตุจีนย่อยและยามไทยอุบากองทำงานแยกย่อยเป็นอิสระดังเดิม
