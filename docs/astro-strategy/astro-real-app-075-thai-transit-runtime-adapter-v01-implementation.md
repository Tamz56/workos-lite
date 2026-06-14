# ASTRO-REAL-APP-DEV-075 — Thai Transit Runtime Adapter v0.1 Implementation

## Goal
อิมพลีเมนต์โมดูลโปรแกรมประมวลผลดวงจรไทยเวอร์ชันเริ่มต้น (**Thai Transit Runtime Adapter v0.1**) ชนิด Standalone/Pure TypeScript โดยนำเอาแผนงานจาก DEV-072 และสัญญาข้อตกลง DEV-073 เป็นแม่แบบหลัก เพื่อสกัดแปลผลพิกัดดาวจร ตกเรือนสัมพันธ์ลัคนากำเนิด และความสัมพันธ์ของธาตุรายวัน ออกมาเป็นรหัสสัญญาณสั้น (Technical Signal IDs) และโหมดคำแนะนำกิจกรรมปฏิบัติงาน โดยไม่ดัดแปลง UI หรือเขียนบันทึกไฟล์ LocalStorage จริงเพื่อรักษาความมั่นคงปลอดภัยสูงสุดของระบบ

---

## Scope
- การอัปเดตประเภทข้อมูล `ThaiTransitStrategyOutput` และสัญญาย่อยอื่นๆ ใน [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts)
- การสร้างตัวแปลง [astroRealAppThaiTransitAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiTransitAdapter.ts) และฟังก์ชันหลัก `buildThaiTransitStrategyOutput(input)`
- การประมวลผลตำแหน่งดาวจรและเรือนชะตาตกกระทบสัมพันธ์ลัคนาแบบ Rule-based
- ตรรกะสกัดความสัมพันธ์สี่ธาตุ (ดิน น้ำ ลม ไฟ)
- ตรรกะป้องกันหมดไฟสะสม (Low-burnout priority) โดยการอิงข้อมูลประวัติอารมณ์ความรู้สึกจริงของผู้ใช้
- โทนคำศัพท์ที่ปลอดภัยและไม่มีคำทำนายโชคชะตาเชิงดิ่งลึก
- การจัดทำบันทึกความมั่นใจของข้อมูล (Confidence rating) และ Disclaimer ความปลอดภัย

## Non-scope
- การแก้ไขหน้าต่าง UI คอมโพเนนต์ หรือการเปลี่ยนแปลงโครงสร้างแสดงผล Today Panel
- การเขียนข้อมูลลง LocalStorage หรือแก้ไข Schema ฐานข้อมูลหลัก
- การเรียกใช้งาน API ระบบคลาวด์ภายนอก หรือดาวน์โหลดไลบรารีคำนวณขนาดใหญ่

---

## Files Changed

1. **[MODIFY] [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts)**
   - เพิ่มคีย์ประเภทข้อมูล: `ThaiTransitMode`, `ThaiTransitPlanetSummary`, `ThaiTransitHouseImpact`, `ThaiTransitElementRelationship`, `ThaiTransitSignalId`, `ThaiTransitWorkModeId`, และ `ThaiTransitStrategyOutput`
2. **[NEW] [astroRealAppThaiTransitAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiTransitAdapter.ts)**
   - นำเข้าประเภทอินเตอร์เฟซส่งกลับ
   - อิมพลีเมนต์ฟังก์ชัน `getZodiacElement`, `getApproximatedTransitZodiac`, `calculateElementRelationship`
   - พัฒนาฟังก์ชันหลัก `buildThaiTransitStrategyOutput` เพื่อคัดกรองสัญญาณ
   - ตั้งค่าเที่ยงวันกลางวันเพื่อกันชนโซนเวลา (Noon guard) เมื่อไม่ระบุเวลาเจาะจง

---

## Key Mapping Logic (ตรรกะการแปลงสัญญาณ)
* **Kamma (การงาน)** -> แปลงเป็นโหมด `structured_work`, `system_design`
* **Ari (อุปสรรค)** -> แปลงเป็นโหมด `qa_testing`, `debugging` เลี่ยงการริเริ่มงานหลัก
* **Lapa (ความสำเร็จ)** -> แปลงเป็นโหมด `delivery`, `summary_notes`
* **Vinas (เบื้องหลัง)** -> แปลงเป็นโหมด `research`, `system_cleanup` เลี่ยงการนัดประชุมใหญ่
* **Patni (ผู้คน)** -> แปลงเป็นโหมด `meeting`, `agreements`
* **Tanu (ตัวตน)** -> แปลงเป็นโหมด `self_pacing`, `energy_check`

---

## Low-Burnout Priority Override (การปกป้องสุขภาพจิตผู้ใช้)
ความล้าสะสมจริงมีน้ำหนักเหนือรอบวงโคจรดาวเคราะห์:
* หากตัวแปรนำเข้า `fatigueLevel === "high"` หรือ `energyLevel === "low"`
* ระบบจะสลับโหมด `transitMode = "Pause"` ทันที
* ล้างข้อชี้แนะงานหนักทั้งหมดออกไป และแทนที่ด้วยโหมดบำบัดฟื้นฟู ได้แก่ `recovery`, `review`, และ `low_intensity`
* บังคับให้งานหลัก `structured_work` และ `system_design` ตกไปอยู่ในกลุ่มการเลี่ยงทำงานหรือชะลอออกไปชั่วคราว (`avoidOrDelayModes`)

---

## Safe Language Scanning (การป้องกันคำศัพท์ไม่ปลอดภัย)
* ปราศจากคำต้องห้ามลี้ลับ: ไม่พบคำว่า "เคราะห์", "ซวย", "อุบัติเหตุ", "เงินเสียแน่", "รักพัง", "ห้ามออกจากบ้าน"
* แสดงถ้อยคำแนะแนวทางเลือกเชิงปฏิบัติด้านวิชาการเพื่อประคองวินัย: "ควรชะลอ", "ตรวจสอบซ้ำ", "จัดตารางเวลาสั้น ๆ พักสายตา", "ประเมินสมาธิ"
* คำประกาศความปลอดภัยเตือนสติประทับอยู่ในกล่องเอาท์พุตชัดเจน

---

## Next Roadmap
* **ASTRO-REAL-APP-DEV-076 — Thai Transit Output Contract & Copy Safety Review in AstroTodayPanel** (ผสาน UI เชื่อมต่ออแดปเตอร์ดวงจรไทยเข้ากับ Today Panel ในรอบถัดไป)
