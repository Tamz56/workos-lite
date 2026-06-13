# ASTRO-REAL-APP-DEV-066 — Chinese Metaphysics Today Panel Optional Context Plan

## Goal
จัดทำแผนงานการผสานระบบหน้าจอแสดงผล (UI Integration Plan) สำหรับการนำข้อมูลวิเคราะห์ห้าธาตุและรอบฤดูกาลจีนจาก **Chinese Metaphysics Adapter v0.1** เข้าไปแสดงผลบนแผงควบคุมวันนี้ (**AstroTodayPanel**) ในลักษณะกล่องข้อมูลเสริมลำดับสอง (Secondary Optional Context Card) โดยรักษาระดับความสำคัญความปลอดภัยทางกายภาพของ Today Timing Engine และไม่ทำให้หน้าจอเกิดความหนาแน่นของข้อมูลมากเกินไป (Information Overload)

---

## Scope
- เหตุผลความจำเป็นในการจัดทำแผนการบูรณาการ UI ก่อนเริ่มลงมือเขียนโค้ดจริง
- สถานะปัจจุบันของ Chinese Metaphysics Adapter v0.1
- แม่แบบการดึงข้อมูลและจัดการของระบบยามไทยเดิม (Thai Today Context Pattern)
- กฎลำดับความสำคัญของข้อมูล (Today Engine Hierarchy Rule)
- การจัดวางตำแหน่ง UI (UI Placement) และป้ายคำนำเสนอ (Card Label)
- ตรรกะพฤติกรรมพับเก็บได้และการปรับลดลำดับพื้นที่สายตา (Collapsed & Secondary card behavior)
- แผนภูมิการไหลของข้อมูล (Data Flow) และพร็อพส์สำหรับแผงควบคุม Today Panel
- แผนป้องกันข้อผิดพลาด Hydration และความปลอดภัยตอนโหลดหน้าไคลเอนต์ (Client Mount Safety)
- ตรรกะการขจัดข้อขัดแย้งของสัญญาณข้ามศาสตร์ (Conflict Handling)
- การลดความหนาแน่นทางสายตาและการปกป้องสิทธิ์ในการเลือกปิด/เปิดของผู้ใช้ (User Autonomy)
- ตัวอย่างคำศัพท์และเกณฑ์ความปลอดภัยบนหน้าจอ UI (Safe/Unsafe Copy)
- รายงานผลกระทบระดับฐานข้อมูลและการโอนย้ายข้อมูล JSON สำรอง
- แผนการตรวจรับคุณภาพในการพัฒนารันไทม์จริงในอนาคต (Manual QA Plan)

## Non-scope
- การเขียนโปรแกรมแก้ไขโค้ด React หรือ CSS รันไทม์ในรอบงานนี้ (Documentation-only)
- การเขียนประวัติการวิเคราะห์จีนลงในฐานข้อมูลประวัติสะสมหรือ LocalStorage
- การดัดแปลงหน้าจอวางแผนรายสัปดาห์ (Weekly) หรือรายเดือน (Monthly) ในเฟสนี้

---

## Why UI Integration Plan Is Needed Before Implementation
1. **การรักษาความสะอาดและผ่อนคลายสายตาของพื้นที่ทำงาน (Cognitive Calmness & Clutter Mitigation)**:
   การเพิ่มกล่องข้อมูลจากศาสตร์โหราศาสตร์ระบบที่สอง (ถัดจากระบบไทย) หากไม่มีการวางแผนสัดส่วนพื้นที่หน้าจออย่างระมัดระวัง อาจทำให้ส่วนติดต่อผู้ใช้ (UI) เกิดความเทอะทะ รบกวนสายตาของผู้ใช้ที่ต้องการจดจ่อกับงาน การล็อกหน้าตาและกลไกพับเก็บล่วงหน้าช่วยรักษาพื้นที่โล่ง
2. **รักษาเสถียรภาพของกระบวนการ Hydration ใน Next.js**:
   การหลีกเลี่ยงข้อผิดพลาด Hydration Mismatch จำเป็นต้องวางลำดับเหตุการณ์ (State Lifecycle) จากหน้า Parent Preview ลงไปยัง Today Panel ให้ผ่าน `mounted` state ที่ถูกต้องเช่นเดียวกับระบบไทย
3. **การล็อกลำดับการตัดสินใจหักล้างของสัญญาณ (Composer Override Rules)**:
   เพื่อไม่ให้ข้อเตือนภัยความเหนื่อยล้าของ Today Engine และยามระมัดระวังของไทยถูกสัญญาณธาตุสนับสนุนเชิงรุกของจีนกลบหายไป จึงต้องวางกฎการควบคุมพฤติกรรม (Hierarchy of Truth) ให้เรียบร้อย

---

## Baseline Adapter & UI Status
* **Chinese Metaphysics Adapter v0.1**: ได้รับการพัฒนาและทดสอบ QA ในระดับรันไทม์เสร็จสิ้นแล้ว โดยคืนค่าข้อมูลในรูปแบบอินเตอร์เฟซ `ChineseMetaphysicsStrategyOutput`
* **Thai Today Context**: เรนเดอร์อยู่ใน `AstroTodayPanel` ด้านล่างสุดเป็นกล่องข้อความยามไทยแบบพับเก็บได้
* **Today Timing Engine**: เรนเดอร์โหมดสมาธิหลัก (`Stabilize & Structure` | `Focus & Deliver` | `Pause & Calibrate`) บริเวณส่วนบนสุดของ Today Panel

---

## Proposed Data Flow & Props

เสนอเส้นทางการไหลของข้อมูลดังนี้:

```text
[AstroRealAppPreview] (Parent Page Container)
  │
  ├─► 1. รอสถานะ Hydration Mounted = true (ผ่าน React useEffect)
  ├─► 2. คำนวณเอาท์พุตยามไทย (Thai Astro Output)
  ├─► 3. คำนวณเอาท์พุตห้าธาตุจีน (Chinese Metaphysics Output)
  │
  ▼
[chineseMetaphysicsOutput] (Optional State Object)
  │
  └─► ส่งต่อเป็น Props ──► [AstroTodayPanel]
```

### Proposed Props in AstroTodayPanel
เสนอเพิ่มฟิลด์ใน interface `AstroTodayPanelProps` ของ `AstroTodayPanel.tsx` ในลักษณะ Optional:
```typescript
export interface AstroTodayPanelProps {
  // ... props เดิม
  readonly thaiAstroOutput?: ThaiAstroStrategyOutput;
  readonly chineseAstroOutput?: ChineseMetaphysicsStrategyOutput; // [NEW Props]
}
```

---

## Proposed UI Placement & Collapsible Card Behavior

### 1. UI Placement (การจัดวางตำแหน่ง)
* กล่องข้อมูลวิเคราะห์จีนจะถูกจัดวางอยู่ **บริเวณด้านล่างสุดของแผงควบคุมวันนี้ (Today Panel)** เหนือ Metadata เล็กน้อย และอยู่ **ใต้กล่องข้อมูลยามไทยเดิม**
* ลำดับการเรนเดอร์ส่วนท้ายของ Today Panel:
  1. Main Recommendations & Action Items
  2. 🧭 ยามอุบากองไทยประกอบการทบทวน (Thai Astrology Context Card)
  3. ☯️ คำแนะนำธาตุและฤดูกาลจีน (Chinese Metaphysics Context Card) - [NEW Placement]
  4. Disclaimer & Engine Metadata

### 2. Card Label (ป้ายคำและดีไซน์)
* ใช้ชื่อหัวข้อกำกับ: **`☯️ คำแนะนำธาตุและฤดูกาลจีน (Chinese Metaphysics Context)`** เพื่อแบ่งแยกขอบเขตศาสตร์อย่างชัดเจน

### 3. Collapsible / Secondary Behavior (การพับและปรับลำดับความสำคัญ)
* **Default Collapsed (ปิดพับตามค่าเริ่มต้น)**: เนื่องจากเลเยอร์จีนเป็นข้อมูลภาพรวมรายวันเชิงฤดูกาล (Macro-temporal) ซึ่งอัปเดตช้ากว่ายามไทยรายชั่วโมง จึงกำหนดให้การเรนเดอร์ครั้งแรกอยู่ในสถานะ **"ปิดพับซ่อนรายละเอียด (Collapsed)"** เสมอ เพื่อลดความบกพร่องทางสายตา (Visual clutter)
* ผู้ใช้สามารถคลิกที่แถบหัวข้อเพื่อกางออกอ่านคำวิเคราะห์เชิงลึก (เช่น `Suggested Action` และ `Caution Note`) ได้ตามความพึงพอใจ
* ** settings Toggle**: ผู้ใช้มีสิทธิ์กดสลับปิดแสดงผลเลเยอร์จีนทั้งหมดได้ตลอดเวลาผ่านปุ่ม Sidebar

```text
+---------------------------------------------------------------+
|                       TODAY PLANNING BRIEF                    |
|  [Main Content Areas...]                                      |
|                                                               |
|  🧭 ยามอุบากองไทยประกอบการทบทวน (Thai Context)    [กางออกอยู่] |
|                                                               |
|  ☯️ คำแนะนำธาตุและฤดูกาลจีน (Chinese Context)       [คลิกเพื่อกาง] |
|                                                               |
|  -----------------------------------------------------------  |
|  [Disclaimer & Engine Metadata...]                            |
+---------------------------------------------------------------+
```

---

## Client Mount & Hydration Safety Plan
* **Hydration Safety**: ตัวแปรสถานะ `chineseAstroOutput` ในหน้าจอ Parent `AstroRealAppPreview` จะต้องเริ่มต้นด้วยค่า `undefined` เสมอในฝั่งเซิร์ฟเวอร์ และจะเริ่มทำการคำนวณและประมวลผล Adapter หลังตัวแปร `mounted` กลายเป็น `true` ใน React `useEffect` ฝั่งเบราว์เซอร์เท่านั้น ป้องกัน hydration mismatch 100%

---

## Conflict Handling Logic (การจัดการสัญญาณขัดแย้งข้ามศาสตร์)

1. **Today Engine Hierarchy**: หากเอนจิ้นหลักระบุระดับความล้าให้พักผ่อน (`Pause & Calibrate`) เอาท์พุตจีนของธาตุไฟจะถูกระบบ Composer ปรับลดโทนโดยอัตโนมัติ โดยระบุเตือนเป็นลำดับแรกให้ผู้ใช้นอนหลับพักสายตาก่อนการออกกำลังเขียนโค้ด
2. **ข้ามศาสตร์ไทยและจีน (Mixed Reflection Signals)**: หากรอบยามไทยระบุเป็นยามระมัดระวัง (ศูนย์สองตัว) แต่รอบธาตุจีนชี้ทิศทางคู่มิตรเชิงสนับสนุน บน UI จะดึงคำอธิบายข้อขัดแย้งมารวมประเมินโดยระบุสถานะ **"Mixed Reflection Signals (พลังงานรอบวันแสดงสัญญาณกึ่งกลาง)"** และแนะนำให้ผู้ใช้ลดความเร็วการทำงาน ตรวจสอบความถูกต้องอย่างรอบคอบ แทนการทุ่มพลังทั้งหมด

---

## Copy-Safety & Language Guide for UI
* **ห้ามปรากฏ**: คำจำพวก "ดวงชะตาขาด", "วันนี้อันตราย", "จะเกิดอุบัติเหตุ", "จะประสบความสำเร็จรวยเงินล้าน"
* **ตัวอย่างข้อความที่ปลอดภัย (Safe UI Copy)**:
  * *"รอบฤดูกาลธาตุทองหนุนนำในวันนี้พิจารณาใช้สมาธิเพื่อปรับปรุงโค้ดระบบเก่า (Refactor) แทนการเริ่มสร้างโมดูลใหม่"*
* **ตัวอย่างข้อความต้องห้าม (Unsafe UI Copy)**:
  * *" BaZi ของวันนี้เป็นศัตรูกับธาตุเกิด จะทำให้โค้ดที่ส่งในบ่ายนี้พังพินาศและถูกติติงรุนแรง"*

---

## Storage & Data Safety Implications
* **ไม่มีการเขียนข้อมูลลง LocalStorage (No Write to Storage)**: ในเฟสการผสานหน้าจอนี้ ข้อมูลผลลัพธ์ของจีนจะรันสดบนสเตตของเบราว์เซอร์เท่านั้น ปราศจากการบันทึกหรือบันทึกประวัติย่อยลง LocalStorage หรือ IndexedDB
* **ไม่กระทบ Schema ข้อมูลนำเข้า/ส่งออก (Data Portability Preservation)**: เนื่องจากไม่มีการบันทึกฟิลด์ถาวรลงในฐานข้อมูลประวัติสะสม การประมวลผล Backup JSON ของระบบ MVP-v3 ดั้งเดิมจึงทำงานได้อย่างปลอดภัย 100% โดยไม่มีข้อผิดพลาด Schema ปรากฏ

---

## Manual QA Plan for Future Implementation

1. **UI Toggling Verification**:
   - ทดสอบเปิดใช้งานและซ่อนตัวแปรเมตาฟิสิกส์จีนบนหน้า Preview Data Tools และตรวจสอบการแสดงผล/การซ่อนตัวบน `AstroTodayPanel`
2. **Collapsible State Verification**:
   - ตรวจสอบว่าคาร์ดจีนมีขนาดกะทัดรัดและปิดพับเป็นค่าเริ่มต้น (Collapsed by default) และขยายตัวออกได้ราบรื่นเมื่อคลิก
3. **Hydration Mismatch Scan**:
   - ทดสอบรีเฟรชหน้าบราวเซอร์พรีวิว 5 ครั้ง เพื่อยืนยันว่าไม่มี Hydration Error ในคอนโซลดีบักเกอร์
4. **Mixed Signals Synthesis Test**:
   - ตรวจสอบข้อเตือนใจ (Caution Wording) เมื่อจังหวะฤกษ์ไทยและจีนขัดแย้งกัน ว่าระบบเรนเดอร์คำแนะนำพักผ่อนอย่างประนีประนอมตามเกณฑ์ Low-burnout หรือไม่

---

## Rollback Considerations
* หากหน้าจอเกิดปัญหา Hydration Error หรือ UI ประสบความหน่วงสะสม ให้กดปิดการเรนเดอร์เลเยอร์จีนผ่าน Toggle switch และย้อนโค้ดกลับไปยัง commit จุดที่ปลอดภัยนี้ได้ทันที

---

## Recommended Next Task
* **ASTRO-REAL-APP-DEV-067 — Chinese Metaphysics Today Panel Optional Context Implementation** (ลงมือพัฒนาเขียนโปรแกรมและเชื่อมต่อ UI สำหรับการ์ดข้อมูลเสริมจีน v0.1 ใน Today Panel)

---

## Final Integration Plan Verdict

```text
Chinese Metaphysics UI Integration Plan Locked: Establishes a collapsible secondary context layout below the Thai layer, preserves Today Engine priority, prevents hydration mismatch, and blocks LocalStorage writes.
```
