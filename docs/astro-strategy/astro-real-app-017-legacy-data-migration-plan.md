# แผนการโอนย้ายข้อมูลเดิมและการทดสอบระบบแห้ง (Legacy Data Migration Plan & Dry Run) — Astro Real App

เอกสารฉบับนี้จัดทำขึ้นเพื่อวางแผนความมั่นคงของข้อมูลผู้ใช้ในการโอนย้ายข้อมูลจากระบบโปรโตไทป์เดิม (`astro-strategy:*` และ `astro.strategy.*`) เข้าสู่ระบบเนมสเปซของแอปจริงตัวใหม่ (`astro-real-app:*`) โดยคำนึงถึงความเสี่ยงสูงสุดคือข้อมูลสะท้อนคิด (Reflection Logs) และข้อมูลการตั้งค่าวันเกิดสูญหาย

---

## 1. วัตถุประสงค์ (Purpose)
เพื่อหลีกเลี่ยงสภาวะข้อมูลว่างเปล่า (Data Legacy Disconnect) เมื่อผู้ใช้สลับมาหน้าแอปจริงตัวใหม่ และควบคุมความเสี่ยงของกระบวนการโอนย้ายข้อมูลบนฝั่งไคลเอนต์ (LocalStorage) ให้มีความน่าเชื่อถือ ปลอดภัย และย้อนกลับได้เสมอ

---

## 2. รายการคีย์ข้อมูลระบบเดิม (Legacy Key Inventory)
จากการตรวจสอบในโปรโตไทป์หลัก มีการใช้งานคีย์ของ LocalStorage ดังต่อไปนี้:

| คีย์ระบบเดิม (Legacy Key) | ประเภทข้อมูล | รายละเอียด / หน้าที่ในระบบเดิม |
|---|---|---|
| `astro-strategy:reflection-history:v1` | Array of Object | ประวัติบันทึกสะท้อนคิดของระบบเวอร์ชัน 1 |
| `astro-strategy:planning-notes:v1` | Object | โน้ตแผนงานเชิงกลยุทธ์เวอร์ชัน 1 (Focus Next, Slow Down, Small Action, Review Later) |
| `astro-strategy:reflection-log:v1` | Object | ดราฟต์การพิมพ์สะท้อนคิดค้างคาที่ยังไม่ได้กดเซฟลงประวัติ |
| `astro.strategy.reflections` | Array of Object | ประวัติสะท้อนคิดเวอร์ชันดั้งเดิม (Legacy v0) |
| `astro.strategy.birthDate` | String (`YYYY-MM-DD`) | วันเกิดที่ใช้คำนวณรอบดาราศาสตร์ |
| `astro.strategy.birthTime` | String (`HH:MM`) | เวลาเกิดที่ใช้คำนวณรอบดาราศาสตร์ |
| `astro.strategy.birthPlace` | String | สถานที่เกิดที่ใช้คำนวณรอบดาราศาสตร์ |
| `astro.strategy.cycleGoal` | String | เป้าหมายรอบเวลาของการประเมินปัจจุบัน |
| `astro.strategy.cyclePeriod` | Number / String | ระยะเวลาประเมินรอบกลยุทธ์ปัจจุบัน |

---

## 3. คีย์เป้าหมายแอปจริง (Real-App Target Keys)
ระบบแอปจริงตัวใหม่จะจัดระเบียบคีย์ในเนมสเปซเด็ดขาด เพื่อป้องกันการปนเปื้อนข้อมูล:

| คีย์ระบบใหม่ (Target Key) | ประเภทข้อมูล | รายละเอียด |
|---|---|---|
| `astro-real-app:reflection-history:v1` | Array of Object (versioned) | ประวัติสะท้อนคิดตัวจริงและข้อมูล Snapshot จังหวะรายวัน |
| `astro-real-app:planning-notes:v1` | Object (versioned) | แผนกลยุทธ์เชิงปฏิบัติรายวัน |
| `astro-real-app:reflection-draft:v1` | Object (versioned) | ดราฟต์พิมพ์ค้างชั่วคราว |
| `astro-real-app:birth-profile:v1` | Object (versioned) | ข้อมูลดวงเกิดที่รวบรวม (birthDate, birthTime, birthPlace) ไว้ในวัตถุเดียว |
| `astro-real-app:cycle-config:v1` | Object (versioned) | ข้อมูลเป้าหมายรอบและระยะเวลา (cycleGoal, cyclePeriod) |

---

## 4. สมมติฐานโครงสร้างข้อมูล (Data Shape Assumptions)
ในการโอนย้าย เราต้องแปลงโครงสร้างเก่าเข้าสู่รูปแบบ Envelope `AstroPersistedPayload<T>` ดังนี้:
1. **Reflection History Item**:
   - *เก่า*: อาจเป็น JSON ดิบหรือไม่มีเวอร์ชันหุ้ม
   - *ใหม่*: ครอบหุ้มด้วย `{ version: 1, updatedAt: string, data: ReflectionHistoryItem[] }`
2. **Strategy Planning Notes**:
   - *เก่า*: วัตถุแบบแบนราบ มีฟิลด์ตรงๆ
   - *ใหม่*: ครอบหุ้มด้วย `{ version: 1, updatedAt: string, data: AstroPlanningNotes }`
3. **Birth Profile**:
   - *เก่า*: คีย์แยกเป็นสายอักขระเดี่ยวๆ 3 ชิ้น (`birthDate`, `birthTime`, `birthPlace`)
   - *ใหม่*: จับมัดรวมเป็นโครงสร้างชิ้นเดียว `{ version: 1, updatedAt: string, data: { birthDate, birthTime, birthPlace } }`

---

## 5. กฎระเบียบความปลอดภัยขั้นเด็ดขาด (Safety Boundaries)

### กฎการคัดลอกเท่านั้น (Copy-Only Migration Principle)
* กระบวนการย้ายข้อมูลจะทำในรูปแบบ **"คัดลอกและแปลงรูปข้อมูลจากคีย์เดิมไปวางที่คีย์เป้าหมายใหม่"** เท่านั้น
* **ห้ามลบคีย์เดิม (No Delete)**: คีย์ดั้งเดิมทั้งหมดในกลุ่ม `astro-strategy:*` และ `astro.strategy.*` ต้องไม่มีการสั่ง `removeItem` หรือเคลียร์ค่าใดๆ ทิ้ง เพื่อให้ผู้ใช้สามารถถอยกลับไปใช้โปรโตไทป์เดิมได้โดยไม่มีข้อมูลสูญหาย

### กฎห้ามเขียนทับข้อมูลแอปจริงเดิม (No Overwrite Rule)
* หากในเนมสเปซใหม่ (`astro-real-app:*`) มีข้อมูลที่ผู้ใช้เคยทดลองเซฟหรือบันทึกอยู่ก่อนแล้ว **ห้ามทำการเขียนทับข้อมูลนั้นอย่างเด็ดขาด** ให้ข้ามการโอนย้ายคีย์นั้นเพื่อรักษาข้อมูลล่าสุดที่ผู้ใช้ทำบนแอปจริง

### การยืนยันสิทธิ์จากผู้ใช้งาน (User Confirmation & Consent)
* ห้ามทำเบื้องหลังเงียบๆ (Silent Migration) โดยไม่บอกผู้ใช้
* ก่อนทำการโอนย้ายจริง ต้องแสดงป๊อปอัปแจ้งเตือนพร้อมอธิบายว่า "พบข้อมูลประวัติและค่าเริ่มต้นจากโปรโตไทป์เก่า คุณต้องการโอนย้ายข้อมูลมายังระบบใหม่ใช่หรือไม่?" และรอให้ผู้ใช้คลิกอนุมัติก่อนเริ่มคัดลอกข้อมูลจริง

---

## 6. พฤติกรรมการทดสอบระบบแห้ง (Dry-Run Behavior)
เมื่อเปิดหน้ารายงาน Dry Run ระบบจะทำการ:
1. สแกนหาความมีอยู่และขนาดข้อมูล (ไบต์) ของคีย์ระบบเดิมทั้งหมด
2. จำลองผลลัพธ์การแมปคีย์และการหุ้ม Payload
3. สรุปผลรายงานออกมาเป็นชนิดข้อมูล `MigrationDryRunReport` เพื่อแสดงบนหน้าจอ Data Tools โดยจะแสดง:
   - ตรวจพบค่าอะไรบ้าง
   - จะถูกโอนย้ายไปที่คีย์ไหน
   - มีการขัดแย้งของข้อมูล (Collision) หรือไม่ (เช่น คีย์ใหม่มีค่าอยู่แล้ว)
   - ข้อมูลมีความสมบูรณ์เพียงพอจะย้ายหรือไม่
4. **โดยในระหว่างการทำ Dry-Run นี้ จะไม่มีการเรียก `localStorage.setItem` บนคีย์เป้าหมายใหม่โดยเด็ดขาด**

---

## 7. รายการข้อมูลที่ห้ามโอนย้ายในระยะนี้ (What Must Not Be Migrated Yet)
* **Astrology Calculation Constants**: ค่าคงที่ดาราศาสตร์หรือผลลัพธ์การอ่านที่ไม่ใช่ข้อมูลดิบที่ผู้ใช้ป้อน
* **Drafts (ถ้าไม่จำเป็น)**: ข้อมูลสะท้อนคิดดราฟต์พิมพ์ค้าง (`astro-strategy:reflection-log:v1`) เป็นข้อมูลชั่วคราวระดับนาที ไม่จำเป็นต้องบังคับย้ายหากย้ายยากหรือไม่มีข้อมูลเด่นชัด (แต่ควรซัพพอร์ตคีย์ประวัติจริงเป็นหลัก)

---

## 8. แผนงานระยะถัดไป (Proposed DEV-017B / DEV-018 Scope)
* **DEV-017B**: พัฒนา **AstroRealAppMigrationAdapter** และแสดงกล่องข้อความจำลองรายงาน Dry Run บนหน้า Data Tools
* **DEV-018**: รวม Astrology Engine และปรับปรุงโครงสร้างการคำนวณดาราศาสตร์ตามดวงเกิดจริง
