# ASTRO-REAL-APP-DEV-059 — Thai Astrology Today Panel Optional Context Implementation

## Goal
อิมพลีเมนต์และเชื่อมโยงชุดข้อมูลฤกษ์ยามของ **Thai Astrology Adapter v0.1** เข้าไปแสดงผลบนแผงควบคุมวันนี้ (**AstroTodayPanel**) เป็นกล่องข้อความเสริมชนิดซ่อนพับได้ (Optional Context Card) และรันลอจิกวิเคราะห์บนฝั่งไคลเอนต์เบราว์เซอร์เท่านั้นหลัง Mount สำเร็จเพื่อหลีกเลี่ยง Hydration mismatch ใน Next.js

---

## Scope
- การดัดแปลงคอมโพเนนต์ `AstroTodayPanel.tsx` เพื่อรับพร็อพส์ยามไทยและจัดการเรนเดอร์กล่องเสริม
- การดัดแปลงหน้าหลัก `AstroRealAppPreview.tsx` เพื่อคำนวณเอาท์พุตและส่งต่อผ่าน Props
- การป้องกันข้อผิดพลาด Hydration และกรณีข้อมูลดวงเกิดไม่พร้อม (Graceful Fallback)
- การคุมภาษาและ disclaimers ความปลอดภัยทางกลยุทธ์และจิตวิทยา

## Non-scope
- การเขียนข้อมูลยามไทยลง LocalStorage
- การเขียนข้อมูลหรือเพิ่มคีย์เสริมในระบบนำเข้า/ส่งออกดั้งเดิม
- การแก้ไขหรือเพิ่ม routes หรือหน้าแท็บการทำงานใหม่ในแอปพลิเคชัน

---

## Files Changed

1. **[MODIFY]** [AstroTodayPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx)
   - ขยาย `AstroTodayPanelProps` นำเข้า `ThaiAstroStrategyOutput` และเรนเดอร์กล่องข้อมูลยามไทยเหนือระดับ Metadata
2. **[MODIFY]** [AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx)
   - นำเข้า `buildThaiAstroStrategyOutput`, กำหนด states ยามไทย, ทำการคำนวณสดใน `useEffect` (ตอน Mount และสลับแท็บ และ Reset), และส่งผ่าน props เสริมลงสู่ Today Panel

---

## UI Placement & Styling
- กล่องยามไทยแสดงผลเป็นการประเมินรอบยามย่อย (Secondary Context Block) ขนาดกะทัดรัด
- ประดับด้วยไอคอน `Compass` สัญลักษณ์ยามแบบ Emoji และป้ายกำกับ: **"จังหวะเวลาไทยประกอบการทบทวน (Thai Timing Context)"**
- ใช้โทนสีเข้มหม่นตัดเส้นขอบบาง (`bg-slate-950/40 border-slate-800/80`) เพื่อความกลมกลืนและไม่ไปเด่นสะดุดตาทับถม Today Timing Brief หลัก
- นำเสนอข้อมูลที่จำเป็น ได้แก่: ชื่อยาม, อุปมาอุปไมยธรรมชาติ, ทัศนคติเชิงกลยุทธ์, คำแนะนำการจัดการสมาธิ และข้อระวังตัวสั้นๆ

---

## Data Flow
1. หลังจาก Hydration Mount สำเร็จ `AstroRealAppPreview` ดึง Birth Profile ในเครื่องและคำนวณเวลาเบราว์เซอร์จริง (HH:MM)
2. ส่งข้อมูลไปประเมินผลผ่าน `buildThaiAstroStrategyOutput` และบันทึกผลลง state `thaiAstroContext`
3. เรนเดอร์คอมโพเนนต์ย่อย `<AstroTodayPanel thaiAstroContext={...} thaiAstroFallbackNote={...} />`

---

## Hydration Safety & Fallback Behavior
- **Hydration Safety**:
  - หลีกเลี่ยง hydration mismatch โดยกำหนดให้ประมวลผลยามเฉพาะหลัง Mount สำเร็จในเบราว์เซอร์ (`isHydrated = true`)
- **Fallback Behavior**:
  - หากระบบคำนวณล้มเหลวหรือเกิด Error กล่องข้อความจะปิดตัวลงอย่างเงียบๆ (Graceful Fallback) โดยระบบ Today Panel หลักจะไม่พัง และแสดงผลคำเตือน fallback เพื่อแจ้งให้นักพัฒนาทราบในพรีวิว

---

## Copy-Safety & Storage Implications
- **Copy-safety**: ภาษาของฤกษ์ยามใน Adaptor ปราศจากคำพยากรณ์ลี้ลับเด็ดขาด และเสนอ disclaimers กำกับท้ายกล่องอย่างแน่นหนา
- **Storage**: เอาท์พุตประมวลผลสดและส่งตรงไปยัง UI ไคลเอนต์โดยไม่มีการบันทึกหรือเขียนข้อมูลเสริมนี้ลงใน LocalStorage ของประวัติสะสม ทำให้คุณสมบัติ Data Portability เสถียรปลอดภัยสูง

---

## Manual QA Verification Steps
1. **การตรวจสอบการแสดงผลตามปกติ (Normal UI Check)**:
   - เปิดหน้า `/workspaces/astro-strategy/real-app-preview` และตรวจสอบว่าส่วน "จังหวะเวลาไทยประกอบการทบทวน" แสดงผลในกล่องสี slate-950 ปลายนุ่มนวลสวยงามและข้อมูลถูกต้อง
2. **การตรวจสอบหลังรีเซ็ตข้อมูล (Reset Data QA)**:
   - กดปุ่ม Reset All Data ใน Preview Tools และตรวจสอบว่าข้อมูลยามไทยคำนวณใหม่ตาม Default Profile และหน้าจอไม่ล่มกระพริบ
3. **การตรวจสอบ Lint & Build (Compilation QA)**:
   - รันคำสั่ง ESLint เช็คโค้ด และรัน Next.js Build เพื่อยืนยันว่าคอมไพเลอร์เสถียร 100%

---

## Rollback Considerations
หากหน้าจอมีปัญหาประสิทธิภาพหรือกระพริบ:
- สามารถถอดถอนได้ทันทีโดยเอา props `thaiAstroContext` และ `thaiAstroFallbackNote` ออกจาก `<AstroTodayPanel />` ในไฟล์ `AstroRealAppPreview.tsx`

---

## Recommended Next Task
* **ASTRO-REAL-APP-DEV-060 — Copy Safety & Ethics QA for Advanced Layers**
