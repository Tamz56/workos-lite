# ระบบโอนย้ายข้อมูลเดิมแบบควบคุมด้วยการยืนยันตัวตน (Controlled Legacy Data Migration Confirmation Flow)

เอกสารสำหรับขั้นตอนพัฒนา `ASTRO-REAL-APP-DEV-018` เพื่อสรุปการอิมพลีเมนต์และการทำงานจริงของการโอนย้ายข้อมูลจากระบบเดิมแบบได้รับการยืนยันและปลอดภัย

---

## 1. เป้าหมาย (Goal)
เพิ่มปุ่มควบคุมและกลไกการโอนย้ายข้อมูล (Migration Executor) จากระบบโปรโตไทป์เดิม (`astro-strategy:*`, `astro.strategy.*`) ไปยังแอปใหม่ (`astro-real-app:*`) โดยต้องมีการยืนยันความยินยอม (Consent Confirmation Checkbox) จากผู้ใช้ก่อนดำเนินการ และคัดลอกเฉพาะจุดที่ว่างอยู่เท่านั้น โดยไม่ทำข้อมูลใดๆ สูญหาย

---

## 2. ขอบเขตงาน (Scope)
* **ตัวโอนย้ายข้อมูลจริง (Migration Executor)**: อิมพลีเมนต์ฟังก์ชัน `copyLegacyKeyToTargetIfEmpty` และ `migrateReadyLegacyKeysWithConfirmation` คัดลอกค่าจากคีย์เก่าไปยังคีย์ใหม่
* **การป้องกันความเสียหาย (Safe Envelope wrapping)**: สแกนข้อมูลในคีย์เดิม หากข้อมูลไม่อยู่ในรูป Payload Wrapper `{ version, data, updatedAt }` ระบบจะทำการแปลงรูปให้อยู่ในโครงสร้างใหม่โดยอัตโนมัติก่อนเขียน
* **อินเตอร์เฟซผู้ใช้แบบควบคุม**:
  * แสดงกล่องข้อความคำเตือน (Safety Callout)
  * แสดงเช็กบ็อกซ์ยืนยัน: "ฉันเข้าใจและยอมรับว่าการกระทำนี้จะคัดลอกข้อมูลเดิมเฉพาะจุดที่พร้อมใช้งานเท่านั้น และไม่มีการลบข้อมูลระบบเก่าออก"
  * ปุ่ม "คัดลอกข้อมูลที่พร้อมใช้งาน" จะถูกปิดการทำงาน (Disabled) ไว้จนกว่าจะมีการรัน Dry Run ตรวจพบข้อมูลพร้อมย้าย และผู้ใช้ติ๊กยอมรับเช็กบ็อกซ์เท่านั้น
  * แสดงบันทึกผลการโอนย้าย (Execution Result Report) สรุปจำนวนคีย์ที่สำเร็จ ข้าม หรือล้มเหลว

---

## 3. สิ่งที่อยู่นอกเหนือขอบเขต (Non-Scope)
* **ไม่มีการลบข้อมูลประวัติเก่า**: จะไม่มีการลบคีย์ดั้งเดิมออกจากเครื่อง (ไม่มีการใช้ `removeItem` บนคีย์เก่า)
* **ไม่มีการเขียนทับข้อมูลใหม่**: หากคีย์ปลายทางมีข้อมูลสะสมอยู่แล้ว ระบบจะรายงานผลข้ามการทำงานทันทีเพื่อป้องกันข้อมูลพรีวิวสูญหาย

---

## 4. หลักประกันความปลอดภัย (Safety Guarantees)
1. **Double Check immediately before write**: ตรวจเช็กสถานะการมีอยู่ของคีย์เป้าหมายใหม่ในเครื่องอีกครั้งทันทีก่อนการเรียกคำสั่งเซฟลงบราวเซอร์
2. **Read-Only on Old Namespace**: ข้อมูลเนมสเปซดั้งเดิมทุกคีย์ยังคงเดิมไม่มีการแก้ไข

---

## 5. ไฟล์ที่แก้ไข (Files Changed)
* **`[MODIFY]`** [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts) — เพิ่มไทป์ `MigrationExecutionResult` และโมเดลที่เกี่ยวข้อง
* **`[MODIFY]`** [astroRealAppMigrationDryRunAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppMigrationDryRunAdapter.ts) — อิมพลีเมนต์ฟังก์ชัน `copyLegacyKeyToTargetIfEmpty` และ `migrateReadyLegacyKeysWithConfirmation`
* **`[MODIFY]`** [AstroPreviewDataToolsPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroPreviewDataToolsPanel.tsx) — ส่วนติดต่อผู้ใช้ ป๊อปอัปผลลัพธ์การย้ายจริง และอินพุตเช็กบ็อกซ์ยอมรับ

---

## 6. ขั้นตอนการทดสอบด้วยตนเอง (Manual QA Steps)
1. เปิดหน้า Real App Preview: `/workspaces/astro-strategy/real-app-preview`
2. คลิกเลือกแท็บ **"⚙️ เครื่องมือข้อมูล" (Data Tools)** ที่แถบนำทาง
3. คลิกปุ่ม **"จำลองการโอนย้าย (Run Dry Run)"** สังเกตปุ่มย้ายจริงด้านล่างยังคงปิดการทำงาน (Disabled)
4. ติ๊กเครื่องหมายยอมรับความปลอดภัยที่เช็กบ็อกซ์ยืนยัน -> สังเกตว่าปุ่ม **"คัดลอกข้อมูลที่พร้อมใช้งาน (Copy Ready Legacy Data)"** เปลี่ยนสถานะเป็น Active
5. กดปุ่มโอนย้าย -> สังเกตว่าระบบรายงานผลการบันทึกสรุปจำนวน และรายละเอียดคีย์แต่ละตัว
6. ในเครื่องมือบราวเซอร์ (Application/Storage) ตรวจดูว่าคีย์เป้าหมายใหม่ถูกบันทึกและหุ้มเวอร์ชันถูกต้อง
7. กดสแกน Dry Run ซ้ำอีกครั้ง -> สังเกตว่าสถานะของคีย์ที่ถูกโอนย้ายแล้วจะเปลี่ยนเป็น `skip-target-exists` แทนที่ `ready` โดยอัตโนมัติ

---

## 7. แผนการย้อนคืน (Rollback Note)
หากเกิดข้อผิดพลาด สามารถกดรีเซ็ตข้อมูลผ่านปุ่มเคลียร์ข้อมูลใน Data Tools หรือใช้คีย์โปรโตไทป์เดิมประมวลผลต่อได้ทันทีเนื่องจากไม่มีการดัดแปลงข้อมูลประวัติในระบบเก่า
