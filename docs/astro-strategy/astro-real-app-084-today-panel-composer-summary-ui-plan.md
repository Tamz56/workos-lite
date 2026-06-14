# ASTRO-REAL-APP-DEV-084 — Today Panel Composer Summary UI Plan

แผนสถาปัตยกรรมการนำเสนอส่วนสรุปผลการประสานกลยุทธ์ (Composer Summary Layer) บนแผงควบคุมวันนี้ (Today Panel)

---

## 1. Goal (เป้าหมาย)

วางแผนการแสดงผลข้อมูลเอาท์พุตจาก **Natal + Transit Strategy Composer v0.1** เข้าไปผสานในแผงข้อมูลวันนี้ (`AstroTodayPanel`) ในลักษณะของเลเยอร์บทสรุปทิศทางแบบกระชับ (Strategy Summary Layer) อ่านง่าย สบายตา โดยไม่มีการเพิ่มการ์ดขนาดยักษ์ใหม่ซ้อนหลายชั้น เพื่อประหยัดภาระทางสายตาและสมาธิของผู้ใช้ และยังคงไม่ทำการแก้ไขโค้ดรันไทม์ของ UI ในรอบนี้

---

## 2. UI Placement (ตำแหน่งจัดวางบนหน้าจอ)

เพื่อความสอดคล้องตามเกณฑ์สายตา (Visual Hierarchy) และความสัมพันธ์ของศาสตร์ ข้อเสนอแนะของ Composer Summary Layer จะถูกจัดวางไว้ดังนี้:
* **ตำแหน่งหลัก**: อยู่ส่วนบนสุดถัดจาก **Daily Timing Brief Header** แต่อยู่เหนือการแสดงผลดั้งเดิมของ Today Mode (Today’s Mode: Stabilize / Focus)
* **โครงสร้างการเรียงลำดับดิ่ง**:
  1. Daily Timing Brief Header & Subtitle
  2. **[NEW] Composer Strategy Summary (ข้อเสนอแนะประสานกลยุทธ์รวม - เลเยอร์ใหม่)**
  3. Today's Mode & Strategic Direction (Today Engine เดิม)
  4. Work Recommendation / Risk Prevention / Recovery Anchor (Today Engine ย่อยเดิม)
  5. Expandable Context Cards (ยามไทยอุบากอง, ธาตุจีนย่อย, ดวงดาวจรไทยย่อย)
  6. Disclaimers และ Metadata ล่างสุด

---

## 3. Display Purpose (วัตถุประสงค์การสื่อสาร)

เลเยอร์บทสรุปกลยุทธ์รวม (Composer Summary) จะมีหน้าที่ตอบคำถามเชิงสมาธิและการทำงาน 4 ข้อสำคัญในสายตาแรกเห็นของผู้ใช้:
1. **วันนี้น้ำหนักการทำงานหลักควรอยู่ในโหมดใด?** (strategyMode)
2. **อะไรคือทิศทางหรือยุทธศาสตร์ข้อเด่นสุดที่แนะนำในวันนี้?** (primaryRecommendation)
3. **เรื่องใดที่ควรชะลอการตัดสินใจชิ้นใหญ่?** (decisionGuidance)
4. **คำถามสำหรับเช็คอินสะท้อนจิตใจและการล้าคืออะไร?** (reflectionPrompt)

---

## 4. Card Content Structure (โครงสร้างเนื้อหาส่วนสรุป)

การจำกัดรูปแบบเนื้อหาให้อยู่ในกรอบกระชับ (Compact/Clean) ประกอบด้วย:
* **`strategyMode`**: แสดงสถานะโหมดสะท้อนสติหลัก (Focus / Stabilize / Pause / Review / Recover) พ่วงด้วยสีบ่งทิศทางที่สบายตา
* **`primaryRecommendation`**: สรุปประโยคแนะนำข้อเด่นที่สุด 1 ข้อถ้วน
* **`cautionLevel`**: แสดงป้ายบอกความตึงเครียด (low / medium / high)
* **`workModePriority`**: ลิสต์สั้น 2-3 จุดของประเภทงานที่ควรลุยก่อน
* **`recoveryPriority`**: ลิสต์สั้นข้อแนะนำการยืดเส้นยืดสายหรือพักเบา ๆ
* **`decisionGuidance`**: คำเตือนสติเกี่ยวกับการเจรจาตึงเครียด
* **`reflectionPrompt`**: คำถามชวนคิดสำหรับวันนั้น
* **`confidenceNotes`**: บันทึกสั้นแจ้งคะแนนความสมบูรณ์และ fallback (แสดงขนาดเล็กมาก)
* **`safetyDisclaimer`**: คำชี้แจงความปลอดภัยของข้อมูลแบบย่อ

---

## 5. Relationship with Existing Cards (ความสัมพันธ์กับแผงดั้งเดิม)

* **Today Engine (แกนหลักดั้งเดิม)**: ยังคงทำหน้าที่เป็นเอนจิ้นเบื้องหลังและให้ข้อมูลดิบ (Baseline)
* **Composer Summary (เลเยอร์วิเคราะห์รวมใหม่)**: ทำหน้าที่รวบรวมตรรกะความล้า และประสานความขัดแย้งของดาราศาสตร์จร นำเสนอรวบยอดเป็นทิศทางสูงสุด
* **Thai Transit / Chinese Metaphysics (การ์ดย่อยประกอบข้างล่าง)**: ทำหน้าที่เป็นเพียง **หลักฐานทางสถิติประกอบ** (Expandable evidence layers) ซึ่งพับปิดไว้เพื่อไม่ให้แย่งพื้นที่การทำงานของสรุปหลัก

---

## 6. UI Density Control (การควบคุมความหนาแน่น)

* **กฎการจำกัดหนึ่งประโยค**: อนุญาตให้แสดงข้อความ `primaryRecommendation` สูงสุด 1-2 บรรทัด
* **การพับเก็บรหัสดิบ**: รายละเอียดรหัสสัญญะเบื้องหลัง เช่น `supportingSignals` และ `suppressedSignals` จะถูกบันทึกไว้ในโมดูลหลังบ้านเท่านั้น และจะยังไม่ถูกนำมาเรนเดอร์ใน UI เพื่อลดความรกของหน้าจอ

---

## 7. Props Interface Plan (แผนการขยายพร็อพส์อินเทอร์เฟซ)

แผนการขยายพร็อพส์อินเทอร์เฟซของ `AstroTodayPanelProps` ในรอบ DEV-085:

```typescript
export type AstroTodayPanelProps = {
  // ... Props เดิม
  
  /** ข้อมูลผลลัพธ์ที่ได้จากการควบรวมและประสาน Composer v0.1 */
  readonly composerStrategyContext?: NatalTransitStrategyComposerOutput | null;
  /** สวิตช์ปิด/เปิดความทัศนวิสัยของส่วนสรุปดลรวม */
  readonly showComposerStrategySummary?: boolean;
  /** กำหนดสเตตัสเริ่มต้นของการปิดกางของเลเยอร์วิเคราะห์สรุป */
  readonly defaultComposerSummaryCollapsed?: boolean;
  /** รูปแบบดีไซน์ของการ์ดสรุปย่อ */
  readonly composerSummaryVariant?: "compact" | "expanded";
};
```

---

## 8. Parent Data Flow Plan (แผนผังการไหลของข้อมูล)

ในหน้ารวมหลัก `AstroRealAppPreview.tsx` จะดำเนินการดังนี้:
1. ประมวลผลลัพธ์ผ่านฟังก์ชัน `buildNatalTransitStrategyComposerOutput(input)` ภายหลัง client mount และ hydration เสร็จสมบูรณ์แล้วเท่านั้น (`isHydrated === true` ใน `useEffect`)
2. นำข้อมูลจาก 4 แหล่ง ได้แก่ `todayTimingData` (Today Engine), `reflectionHistorySummary` (สถิติล้าจากประวัติบันทึก), `thaiTransitContext` (ดวงจร), และ `natalStrategyProfile` (โปรไฟล์เกิด)
3. ส่งผลลัพธ์ลงเป็น Props สู่ `<AstroTodayPanel />`
4. ไม่มีคำสั่งเขียนหรือบันทึกผลลัพธ์ดึกดำบรรพ์นี้ลง LocalStorage หรือ Reflection History เดิมเพื่อรักษาความเข้ากันได้ย้อนหลัง 100%

---

## 9. Copy Safety Guardrails (ความปลอดภัยของคำศัพท์)

* **คำต้องห้ามเด็ดขาด**: ห้ามใช้คำว่า "เคราะห์", "ซวย", "กาลกิณี", "อุบัติเหตุ", "เงินเสียแน่", "งานพัง", "ความรักพัง", "ห้ามทำเด็ดขาด", "จะเกิดแน่นอน", "ดวงบังคับ", "ต้องทำวันนี้เท่านั้น", "ถ้าไม่ทำจะเสียโอกาส"
* **การใช้คำแนะนำเชิงประคองสติ**:
  * *"วันนี้เหมาะกับการจัดลำดับงานที่ค้างให้ชัดเจน"*
  * *"ควรชะลอการทำข้อตกลงตึงเครียดออกไปก่อน"*
  * *"เหมาะแก่งานดีบักและแก้ไขข้อบกพร่องสะสม"*
  * *"หากรู้สึกล้าสะสม แนะนำให้แบ่งย่อยเป้าหมายงานให้เล็กลง"*
  * *"ใช้จังหวะเวลานี้เป็นสัญญาณแวดล้อมเพื่อประกอบการไตร่ตรองเท่านั้น ไม่ใช่ข้อยุติ"*

---

## 10. Future Implementation Sequence (แผนการทำงานถัดไป)

1. **DEV-085 — Today Panel Composer Summary UI Implementation**: นำเอาแผนงานนี้ไปเขียนโค้ดเพื่อเพิ่ม Props และส่วนแสดงเลเยอร์สรุปใน `AstroTodayPanel.tsx` และคำนวณเชื่อมต่อจริงใน `AstroRealAppPreview.tsx`
2. **DEV-086 — Composer Summary UI QA & Copy Safety Review**: ตรวจทานคุณภาพการเรนเดอร์และความสวยงาม และประเมิน Copy Safety รอบสองบน UI จริง
3. **DEV-088 — MVP-v4 Strategy Layer Checkpoint Summary**: จัดทำสรุปหลักการทำงานและความเสถียรของหน้าจอ Astro Strategy Lab v4 ทั้งหมด
