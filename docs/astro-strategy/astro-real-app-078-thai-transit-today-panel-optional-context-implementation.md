# ASTRO-REAL-APP-DEV-078 — Thai Transit Today Panel Optional Context Implementation

เอกสารรายงานการทดลองและผสานผลลัพธ์ของ **Thai Transit Runtime Adapter v0.1** เข้าสู่หน้าจอหลักของแอปพรีวิวอย่างเป็นทางการ

---

## 1. Goal & Objectives (เป้าหมาย)

เป้าหมายหลักของงานนี้คือการผสานข้อมูลแวดล้อมจากศาสตร์ดวงดาวไทย (Thai Transit Strategy Context) เข้าสู่แผงควบคุมหลักประจำวัน (`AstroTodayPanel`) ในรูปแบบการ์ดตัวเลือกพับปิดเริ่มต้น (Optional Collapsible Context Card) โดยไม่รบกวนการตัดสินใจของ Today Engine หลัก และหลีกเลี่ยงการบันทึกหรือบันทึกข้อมูลลบหรือคำทำนายตายตัวลงสู่อุปกรณ์ใดๆ เพื่อรักษาความผาสุกทางจิตใจและความเป็นส่วนตัวของผู้ใช้

---

## 2. Scope & Design Implementation (สเปกการพัฒนา)

### 2.1 UI Layout & Placement
- จัดวางการ์ดดวงจรไทยไว้ถัดลงมาจาก `Chinese Metaphysics Context` และอยู่เหนือส่วน metadata/disclaimer ล่างสุดของ Today Panel
- ค่าเริ่มต้นจะทำการปิดรายละเอียดไว้ (Collapsed by default) โดยแสดงหัวข้อข้อสรุปสั้น ๆ เพียง 1-2 บรรทัด
- ขยายการแสดงผลเมื่อคลิก "▼ ขยาย" เพื่อเปิดเผยรายละเอียดเรือนชะตาที่กำลังจร, โหมดงานที่ส่งเสริม, และโหมดงานที่ควรชะลอหรือเลี่ยง

### 2.2 Parent Data Flow & Hydration Safety
- นำเข้าฟังก์ชันคำนวณ `buildThaiTransitStrategyOutput` จากอแดปเตอร์ pure-TS
- คำนวณเฉพาะฝั่ง Client-side ภายหลังจากหน้า Hydrated (`isHydrated === true`) ผ่าน React `useEffect`
- ประเมินผลลัพธ์โดยดึงวันเกิดจาก Birth Profile มาหาค่าลัคนาประมาณการผ่านฟังก์ชัน `getZodiacFromWeekday` และนำเข้าระดับความล้า/พลังงานจาก `loadedHistory[0]?.dailyCheckinSnapshot`
- ส่งผ่าน props `thaiTransitContext` และ `thaiTransitFallbackNote` สู่ `<AstroTodayPanel />` โดยปราศจากการเขียนหรือบันทึกใดๆ ลงใน LocalStorage

### 2.3 Copy Safety (ความปลอดภัยถ้อยคำภาษา)
- การคุมโทนภาษาและงดเว้นคำทำนายเชิงลบอย่างเข้มงวด
- ปราศจากคำต้องห้ามเด็ดขาด เช่น "เคราะห์", "ซวย", "อุบัติเหตุ", "พัง", "ห้ามทำเด็ดขาด"
- ใช้คำแนะนำเชิงประคองสติ เช่น "ควรชะลอการตัดสินใจ", "สลับพักเมื่อรู้สึกตึงเครียด", "เหมาะแก่งานเบื้องหลัง"

---

## 3. Files Changed (ไฟล์ที่แก้ไข)

1. [AstroTodayPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx)
   - เพิ่ม Props: `thaiTransitContext`, `thaiTransitFallbackNote`, `showThaiTransitContext`, และ `defaultThaiTransitCollapsed`
   - กำหนดสเตตัสเริ่มต้นของตัวขยายปิดพับอิงตาม `defaultThaiTransitCollapsed`
   - ครอบบล็อกการเรนเดอร์และการแสดงข้อผิดพลาดภายใต้เงื่อนไข `showThaiTransitContext && thaiTransitContext`

2. [AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx)
   - นำเข้า `buildThaiTransitStrategyOutput`
   - เพิ่มฟังก์ชันตัวช่วยแปลงวันเกิดเป็นลัคนาประมาณการ `getZodiacFromWeekday` และ `getBirthWeekday`
   - ประกาศ state variables: `thaiTransitContext` และ `thaiTransitFallbackNote`
   - เรียกคำนวณสดเฉพาะใน `useEffect` ตอน mount โหลดข้อมูลเริ่มต้น, สลับแท็บ และฟังก์ชันล้างรีเซ็ตข้อมูลทั้งหมด
   - แนบตัวบ่งชี้ความล้า `recentReflectionContext` ที่สกัดจากประวัติสะท้อนคิดชิ้นล่าสุด

---

## 4. Safety Audit & Preserved Behaviors

- **No LocalStorage Persistence:** ข้อมูลดวงจรไทยคำนวณสดในหน่วยความจำ (RAM) เท่านั้น ไม่มีการเขียนลง LocalStorage
- **Reflection History Integrity:** สิทธิ์การเขียนลง `ReflectionHistory` ยังคงเดิมและไม่ถูกดึงดาวจรไปแนบเซฟในตัวแปรประวัติหลัก
- **No Chinese/Thai Astrology Core Alteration:** ไม่รบกวนผลสัมฤทธิ์ของโมดูลยามไทยและธาตุจีนดั้งเดิม
