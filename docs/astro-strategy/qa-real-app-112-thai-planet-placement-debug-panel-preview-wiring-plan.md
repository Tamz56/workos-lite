# QA Real App 112 — Thai Planet Placement Debug Panel Preview Wiring Plan QA Record

เอกสารรายงานการประกันคุณภาพ (QA Checklist) สำหรับตรวจสอบความสอดคล้องเชิงสถาปัตยกรรม นโยบายจำกัดพื้นที่แสดงผล (Wiring Surface) และการป้องกันคำบรรยายเชิงจรรยาบรรณทางวิชาชีพของแผนผสานติดตั้งคอมโพเนนต์ปฏิทินไทย v0.1

---

## 1. Scope Check (การตรวจสอบขอบเขตงาน)

การตรวจสอบความสมบูรณ์เชิงเป้าหมายของใบงานจัดทำแผนปฏิบัติการ DEV-112 ดำเนินการผ่านเกณฑ์ประเมิน 100%:

| หัวข้อตรวจสอบ | ความต้องการตามสเปก | สถานะประกันคุณภาพ | รายละเอียด / บันทึกผลลัพธ์ |
|---|---|---|---|
| **Wiring Plan Only** | จัดทำเฉพาะเอกสารแผนงาน 2 ฉบับ ห้ามแก้ไขไฟล์โค้ดใน `src/` | **PASS** | ไม่มีซอร์สโค้ดหลักตัวใดถูกเปลี่ยนแปลงหรือแก้ไข |
| **Wiring Surface** | ต้องวางแผนติดตั้งบนเครื่องมือฝั่งนักพัฒนา / วินิจฉัยจำลองเท่านั้น | **PASS** | กำหนดตำแหน่งใน Preview route ภายใต้ส่วน Data Tools / Diagnostics |
| **Visibility Gate** | วางแผนระบบเปิด-ปิดอย่างเหมาะสม (เช่น สวิตช์ toggle) | **PASS** | ออกแบบโดยใช้ `variant === 'preview'` ร่วมกับ Flag `showDiagnostics` |
| **No LocalStorage changes** | วางเงื่อนไขห้ามบันทึกข้อมูลดวงชะตาลง Storage | **PASS** | สั่งควบคุมให้ส่งข้อมูล In-memory ล้วนและห้ามแก้ไข Profile schema |
| **No Strategy Engine Link** | ห้ามให้ข้อมูลไหลเข้า Today/Weekly/Monthly หรือ Composer | **PASS** | กำหนดขอบข่ายการห้ามนำพาข้อมูลจำลองไปออกคำแนะนำอย่างถาวร |
| **Metadata only time** | ค่า `generatedAt` จะต้องไม่ทำตัวเป็นเวลาคำนวณดาราศาสตร์ | **PASS** | กำหนดให้มีสถานะเป็น metadata ของประวัติการทำงานในเบราว์เซอร์เท่านั้น |
| **No stage/commit** | ห้าม stage หรือ commit จนกว่าจะสั่งโดยตรงจากผู้ใช้ | **PASS** | คงสถานะไฟล์ไว้ในระดับ untracked เพื่อความรอบคอบ |

---

## 2. Files Reviewed (ไฟล์ที่ร่วมสอบทานในการวางแผน)

ผู้พัฒนาได้ตรวจสอบสัญญาข้อมูลและความเรียบร้อยจากไฟล์เหล่านี้เพื่อประกอบการเขียนแผน:
* [ThaiPlanetPlacementDebugPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx) (คอมโพเนนต์ React)
* [astroRealAppThaiPlanetPlacementAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts) (ตัวประสานผล Adapter)
* [astroRealAppThaiPlanetPlacementSafety.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts) (ตัวตรวจเช็กความปลอดภัย)
* [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts) (ประเภทข้อมูลปฏิทินไทย)
* [qa-real-app-111-thai-planet-placement-debug-panel-source-integrity-copy-safety-review.md](file:///Users/tamz/projects/workos-lite/docs/astro-strategy/qa-real-app-111-thai-planet-placement-debug-panel-source-integrity-copy-safety-review.md) (รายงาน QA DEV-111)

---

## 3. Wiring Surface Review (การประเมินพื้นที่เชื่อมต่อ)

* หน้าจอเป้าหมายที่แผนอนุมัติให้เชื่อมโยงในอนาคตคือ **Preview Route (เช่น `/workspaces/astro-strategy/real-app-preview`) โดยจำกัดให้อยู่ในแถบวินิจฉัย (Diagnostics Panel) หรือแท็บ Data Tools**
* **ห้ามแสดงผล** บนส่วนควบคุมหรือหน้าจอของแอปพลิเคชันหลัก (Production Routes)

---

## 4. Data Flow Review (การประเมินทิศทางการไหลของข้อมูล)

* ข้อมูลจาก Profile เกิดชั่วคราวถูกส่งผ่านฟังก์ชัน Adapter `buildThaiPlanetPlacementRuntimeAdapterV01` ออกมาเป็น in-memory object
* ข้อมูลดังกล่าวถูกส่งให้ `ThaiPlanetPlacementDebugPanel` ผ่าน Prop `runtimeResult` เท่านั้น
* ไม่มีการส่งข้อมูลนี้ต่อไปยังคอมโพเนนต์แสดงผลของ Today Guidance, Weekly Grid หรือ Monthly View

---

## 5. Copy Safety Review (การทบทวนความปลอดภัยของภาษาบรรยาย)

* แผนการระบุอย่างเข้มงวดให้จัดเตรียมคำชี้แจงความปลอดภัยบนหน้าจอ: `"Diagnostic only"`, `"Stub-only"`, `"Not validated"`, `"Pending reference validation"`, `"Not used for interpretation"`, `"No real Thai planet placement is displayed"`, `"Not persisted"`
* ห้ามมิให้มีการเคลมตำแหน่งดวงชะตาจริงหรือคำแปลสัญลักษณ์ทางโหราศาสตร์เด็ดขาด

---

## 6. LocalStorage Non-interaction Confirmation (การยืนยันการไม่ยุ่งเกี่ยวกับ LocalStorage)

* แผนการยืนยันว่าการเชื่อมต่อในอนาคต **จะไม่มี** การเรียกใช้คำสั่งเขียนหรือบันทึกค่าลง LocalStorage
* ค่า `generatedAt` ในออบเจกต์วินิจฉัยจะทำหน้าที่เป็นข้อมูล Metadata สรุปประวัติการเรียกใช้ของระบบ React component เท่านั้น ไม่ได้เชื่อมโยงกับเวลาดาราศาสตร์จริง

---

## 7. Strategy Engine Non-interaction Confirmation (การตัดขาดจากแกนประมวลผลกลยุทธ์)

* แผนยืนยันความปลอดภัยว่าข้อมูล `runtimeResult` ของปฏิทินไทย v0.1 จะต้องไม่เป็นตัวแปรนำเข้า (Parameters) ของ:
  - `AstroTodayPanel`
  - `NatalTransitStrategyComposer`
  - กลไกวิเคราะห์ความเห็นกลยุทธ์หลักทุกประเภท

---

## 8. Verification Commands (ผลลัพธ์การรันคำสั่งตรวจสอบ)

### 8.1. Git Status Check
```bash
git status --short
```
**ผลลัพธ์คำสั่ง:**
```bash
?? docs/astro-strategy/astro-real-app-112-thai-planet-placement-debug-panel-preview-wiring-plan.md
```
*(มีเพียงไฟล์เอกสารแผนการเชื่อมต่อที่เกิดขึ้นใหม่โดยยังไม่ได้รับการ stage)*

### 8.2. ESLint Check
```bash
node node_modules/eslint/bin/eslint.js src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs
```
**ผลลัพธ์คำสั่ง:**
```bash
/Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

✖ 1 problem (0 errors, 1 warning)
```
*(Accepted non-blocking warning จากการยกเว้นสคริปต์วินิจฉัย .cjs นอกพื้นที่ลินต์)*

### 8.3. Next.js Production Build
```bash
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next build --webpack
```
**ผลลัพธ์คำสั่ง:**
```bash
✓ Compiled successfully in 6.5s
  Running TypeScript ...
  Collecting page data using 9 workers ...
✓ Generating static pages using 9 workers (59/59) in 590.1ms
  Finalizing page optimization ...
  Collecting build traces ...
Route (app)
...
✓ Generating static pages successful
```

---

## 9. Final QA Result (ผลลัพธ์การประกันคุณภาพขั้นสุดท้าย)

* **ประเมินผล**: **ผ่าน (Passed)**
* **สรุปการวินิจฉัย**: เอกสารวางแผนเชื่อมหน้าจอ (Wiring Plan) ในใบงาน ASTRO-REAL-APP-DEV-112 ระบุข้อจำกัดในการเชื่อมต่อ UI เฉพาะสภาพแวดล้อมวินิจฉัย, นโยบายการกักกันพื้นที่ข้อมูล In-memory และระบบความปลอดภัยทางภาษาบรรยาย (Copy Safety) ได้สมบูรณ์และถูกต้องครบถ้วนตามเกณฑ์ความปลอดภัยทุกประการ
