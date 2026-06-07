# ระบบรายงานการทดสอบโอนย้ายข้อมูลเดิมฝั่งไคลเอนต์ (Legacy Migration Dry Run UI)

เอกสารสำหรับขั้นตอนพัฒนา `ASTRO-REAL-APP-DEV-017B` เพื่ออธิบายเป้าหมาย ขอบเขต ข้อกำหนดด้านความปลอดภัย และวิธีการใช้งานแผงตรวจสอบระบบจำลองการโอนย้ายข้อมูล

---

## 1. เป้าหมาย (Goal)
พัฒนาระบบตรวจสอบ (Scanner) ข้อมูลเดิมใน LocalStorage จากระบบโปรโตไทป์เก่า และแสดงผลรายงานแบบจำลอง (Dry Run) บนหน้าจอของแอปจริง เพื่อประเมินจำนวนเรคคอร์ด ขนาด และสถานะความเข้ากันได้ของข้อมูลก่อนเริ่มกระบวนการเขียนข้อมูลและโอนย้ายจริงในอนาคต

---

## 2. ขอบเขตงาน (Scope)
* **เครื่องมือสแกน (Migration Scanner)**: พัฒนาตัวเชื่อมจำลอง `buildLegacyMigrationDryRunReport` เพื่อสแกนคีย์เวอร์ชันโปรโตไทป์ทั้งหมด 9 คีย์
* **การจำลองสถานะ**: แมปข้อมูลเดิมเข้ากับคีย์ปลายทาง และรายงานสถานะของแต่ละคีย์ ได้แก่:
  * `ready` - ตรวจพบข้อมูลเดิม และคีย์เป้าหมายใหม่ยังว่างอยู่ พร้อมทำการโอนย้ายได้ปลอดภัย
  * `skip-target-exists` - ข้ามการโอนย้าย เนื่องจากคีย์เป้าหมายของแอปใหม่มีข้อมูลถูกบันทึกไว้ก่อนแล้ว ป้องกันไม่ให้เขียนทับข้อมูลทดสอบของผู้ใช้
  * `missing-legacy` - คีย์ของโปรโตไทป์เดิมไม่มีการบันทึกข้อมูลไว้ในเครื่อง
  * `parse-error` - ตรวจพบข้อมูลในคีย์เดิม แต่ไม่สามารถ Parse เป็นวัตถุ JSON ได้
* **อินเตอร์เฟซผู้ใช้ (Dry Run UI)**: เพิ่มแท็บ/ส่วนควบคุม "ตรวจสอบการโอนย้ายข้อมูลเดิม (Legacy Migration Dry Run)" ในหน้าจอ Data Tools พร้อมมีปุ่มเรียกใช้งานจำลอง

---

## 3. สิ่งที่อยู่นอกเหนือขอบเขต (Non-Scope)
* **ไม่มีการเริ่มกระบวนการโอนย้ายข้อมูลจริง**: จะไม่มีคำสั่งเขียนค่าลงคีย์เนมสเปซแอปจริงใหม่ `astro-real-app:*` หรือดัดแปลงข้อมูลดั้งเดิมในขั้นตอนนี้
* **ไม่มีการเคลียร์หรือลบคีย์ระบบเดิม**: คีย์ดั้งเดิมยังคงจัดเก็บสภาพสมบูรณ์ทุกประการ

---

## 4. หลักประกันความปลอดภัยข้อมูล (Safety Guarantees)
* **Read-Only Access**: ฟังก์ชันการทำงานทั้งหมดทำการอ่านผ่าน `localStorage.getItem` เท่านั้น ไม่มีการเรียก `setItem` หรือ `removeItem` กับคีย์ใดๆ ทั้งสิ้นในปุ่มกด Dry Run นี้
* **Isolated Environment**: ข้อมูลหน้าโปรโตไทป์ปกติจะไม่ถูกแอปจริงขัดขวางหรือขัดจังหวะการทำข้อมูล

---

## 5. ไฟล์ที่แก้ไข (Files Changed)
* **`[NEW]`** [astroRealAppMigrationDryRunAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppMigrationDryRunAdapter.ts) — อะแดปเตอร์สแกนเนอร์โอนย้ายจำลอง
* **`[MODIFY]`** [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts) — ขยายโมเดลคีย์แมปและรายงานผล
* **`[MODIFY]`** [AstroPreviewDataToolsPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroPreviewDataToolsPanel.tsx) — ส่วนควบคุมแสดงตาราง Dry Run และรายงานสรุป

---

## 6. ขั้นตอนการทดสอบด้วยตนเอง (Manual QA Steps)
1. เปิดหน้า Real App Preview: `/workspaces/astro-strategy/real-app-preview`
2. คลิกเลือกแท็บ **"⚙️ เครื่องมือข้อมูล" (Data Tools)** ที่แถบนำทาง
3. ค้นหาส่วน **"ตรวจสอบการโอนย้ายข้อมูลเดิม (Legacy Migration Dry Run)"**
4. คลิกปุ่ม **"จำลองการโอนย้าย (Run Dry Run)"**
5. สังเกตผลลัพธ์:
   - ตารางแสดงรายงานสรุปจำนวนคีย์ประวัติเดิมที่ตรวจพบ
   - ตารางแจกแจงสถานะของ 9 คีย์เดิม พร้อมแสดงค่า Bytes ขนาดข้อมูล และสถานะ (เช่น `missing-legacy` หรือ `ready` หากมีข้อมูลค้างอยู่เดิม)
   - ตรวจสอบผ่าน Developer Tools Application/Storage ของบราวเซอร์ว่าไม่มีการเขียนคีย์ใดๆ เกิดขึ้นหลังกดปุ่ม

---

## 7. ข้อเสนอแนะสำหรับ DEV-018 (Future DEV-018 Recommendation)
* พัฒนาฟังก์ชันโอนย้ายจริง (Copy-Only Converter) ที่จะคัดลอกข้อมูลดั้งเดิมหลังจากผู้ใช้กดยอมรับคำขอ (Consent Popup) พร้อมซิงก์ Astrology Engine
