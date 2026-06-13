# ASTRO-REAL-APP-DEV-067 — Chinese Metaphysics Today Panel Optional Context Implementation

## Goal
อิมพลีเมนต์และเชื่อมโยงชุดข้อมูลวิเคราะห์ห้าธาตุและรอบฤดูกาลของ **Chinese Metaphysics Adapter v0.1** เข้าไปแสดงผลบนแผงควบคุมวันนี้ (**AstroTodayPanel**) เป็นกล่องข้อความเสริมชนิดซ่อนพับได้ประจำวัน (Optional Collapsible Context Card) และรันลอจิกวิเคราะห์บนฝั่งไคลเอนต์เบราว์เซอร์เท่านั้นหลัง Mount สำเร็จเพื่อหลีกเลี่ยง Hydration Mismatches ใน Next.js

---

## Scope
- การดัดแปลงคอมโพเนนต์ `AstroTodayPanel.tsx` เพื่อรับพร็อพส์เลเยอร์จีนและแสดงกล่องเสริมแบบซ่อนพับได้เป็นค่าเริ่มต้น (Collapsed by default)
- การดัดแปลงหน้าหลัก `AstroRealAppPreview.tsx` เพื่อนำเข้าตัวแปลง ประมวลผลสดบนไคลเอนต์หลัง mount/สลับแท็บ/รีเซ็ต และส่ง props ลง Today Panel
- การรักษาลำดับความสำคัญของตัวเอนจิ้นหลัก (Today Engine Hierarchy)
- การคุมภาษา Disclaimers ความปลอดภัยกลยุทธ์จิตวิทยาและปกป้องสิทธิ์ผู้ใช้ (User Autonomy)

## Non-scope
- การเขียนข้อมูลเอาท์พุตจีนลง LocalStorage ในเฟสนี้
- การแก้ไขฐานข้อมูลประวัติหรือระบบนำเข้า/ส่งออก JSON
- การดัดแปลงหน้าจอรายสัปดาห์หรือรายเดือน

---

## Files Changed

1. **[MODIFY] [AstroTodayPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx)**
   - นำเข้าประเภทอินเตอร์เฟซ `ChineseMetaphysicsStrategyOutput`
   - เพิ่ม Props `chineseAstroContext` และ `chineseAstroFallbackNote` ลงใน `AstroTodayPanelProps`
   - บรรจุ React state `chineseAstroExpanded` กำหนดการปิดพับเป็นค่าเริ่มต้น (false)
   - เรนเดอร์การ์ดจีน `☯️ คำแนะนำธาตุและฤดูกาลจีน` ด้านล่างสุด ใต้การ์ดยามไทยและเหนือ metadata
2. **[MODIFY] [AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx)**
   - นำเข้าตัวแปลง `buildChineseMetaphysicsStrategyOutput`
   - เพิ่ม state `chineseAstroContext` และ `chineseAstroFallbackNote`
   - เชื่อมต่อการวิเคราะห์สดฝั่ง Client ภายใน React `useEffect` (3 จุด: Mount, Tab Active, Reset All)
   - ส่งผ่าน props ลงสู่ `<AstroTodayPanel />`

---

## UI Placement & Styling
- แสดงผลในลักษณะกล่องขอบบางโค้งมนสี Slate เข้ม (`bg-slate-950/40 border-slate-800/80 p-5 rounded-xl`) ล้อไปกับดีไซน์การ์ดยามไทยดั้งเดิม
- ประดับไอคอนเข็มทิศพร้อมป้ายกำกับ **`☯️ คำแนะนำธาตุและฤดูกาลจีน (Chinese Metaphysics Context)`**
- มีปุ่มสวิตช์ปิด/เปิดสำหรับพับย่อการ์ดแบบ Accordion ภายในเครื่องไคลเอนต์เพื่อรักษาความสะอาดทางสายตา (Default Collapsed)

---

## Data Flow
1. เมื่อผู้ใช้เข้าหน้าจอและบราวเซอร์ Prerender โครงร่างหลักเสร็จสิ้น React `useEffect` ทำการตั้งค่า `isHydrated = true`
2. ดึง Birth Profile จาก localStorage และเรียกใช้ `buildChineseMetaphysicsStrategyOutput(birthProfile, targetDateStr)`
3. บันทึกผลลัพธ์ลง state `chineseAstroContext` และส่งผ่าน props ลงสู่ `<AstroTodayPanel />`
4. เมื่อเรนเดอร์ หน้าจอจะปิดพับซ่อนความเห็นเชิงลึกไว้จนกว่าผู้ใช้จะคลิกหัวข้อยกขึ้นอ่าน

---

## Hydration Safety & Fallback Behavior
* **Hydration Safety**: หลีกเลี่ยงหน้าจอกระพริบ (Hydration errors) โดยเริ่มการคำนวณสดและแมปปฏิทินปอยต์เวลาเฉพาะหลัง mount เสร็จสิ้นสมบูรณ์
* **Fallback Behavior**: หากตัวประมวลผลจีนทำงานขัดข้องหรือ Birth Profile ว่างเปล่า การ์ดจีนจะซ่อนตัวหายไปอย่างไร้รอยต่อ (Graceful Fallback) โดยไม่ส่งผลกระทบให้ Today Panel ล่มเสียหาย

---

## Conflict Handling & Autonomy
* **Today Engine Priority**: ตรรกะประมวลผลระดับสถิติ Today Engine คุมพลังงานสูงสุด หาก Today Engine สั่งผ่อนตัว `Pause & Calibrate` จะทำการปรับลดโทนคำแนะนำกระตือรือร้นของจีนลงทันที
* **Thai Layer Compatibility**: แสดงผลคู่กันได้อย่างกลมกลืน ถ้าเกิด Mixed signals ข้ามระบบ จะมีประโยคเตือนสติประนีประนอมในกล่องคำชี้แนะ
* **Preserving Autonomy**: มี safety disclaimer กวาดล้างคำชี้นำกรรมลิขิตออกไปอย่างหมดจด ท้ายข้อความเสนอภาษาเตือนใจเชิงเลือกทำเท่านั้น

---

## Storage & Portability Behavior
* **No Persistence**: ยังไม่มีการบันทึกเอาท์พุตลงใน LocalStorage ทำให้ไม่มีผลกระทบต่อความเสถียรข้อมูล JSON นำเข้า/ส่งออกเดิมของ MVP-v3 (Data Portability 100%)

---

## Manual QA Verification Steps
1. **การตรวจสอบการปิดพับหัวข้อ (Collapsible QA)**:
   - เปิดหน้าพรีวิวและยืนยันว่าการ์ดจีนแสดงผลในลักษณะปิดหัวข้อไว้ตามดีไซน์ และขยายกางข้อแนะนำออกได้เสร็จสมบูรณ์เมื่อคลิก
2. **การตรวจสอบกรณีไม่ระบุประวัติดวงเกิด (No-Profile QA)**:
   - ลองลบหรือเคลียร์ Birth Profile และตรวจเช็คว่า Today Panel สลับแสดง fallback อย่างปลอดภัยโดยไม่ค้าง
3. **การตรวจสอบความลื่นไหลหลังรีเซ็ตข้อมูล (Reset QA)**:
   - กดปุ่ม Reset All Data ในพรีวิวบอร์ดเพื่อยืนยันว่าไม่มี hydration mismatch และระบบคำนวณข้อมูลใหม่ขึ้นมาได้ถูกต้อง
4. **การรัน ESLint และ Next.js Build**:
   - เพื่อยืนยันว่าซอร์สโค้ดผ่านสะอาดและพร้อมต่อการผลิตจริง

---

## Recommended Next Task
* **ASTRO-REAL-APP-DEV-068 — Chinese Metaphysics Today Panel Optional Context QA & Copy Safety Review** (ทดสอบความปลอดภัยจริยธรรมของ UI เลเยอร์จีนและการสแกนถ้อยคำหน้าจอจริง)
