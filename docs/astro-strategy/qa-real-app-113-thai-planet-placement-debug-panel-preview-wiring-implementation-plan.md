# QA Real App 113 — Thai Planet Placement Debug Panel Preview Wiring Implementation Plan QA Record

เอกสารรายงานการประกันคุณภาพ (QA Checklist) สำหรับตรวจสอบความถูกต้องเชิงปฏิบัติการ ทิศทางข้อมูลในรันไทม์ และการยืนยันคำบรรยายจำลองความปลอดภัยของแผนปฏิบัติการเชื่อมต่อระดับโค้ดโปรแกรม (Wiring Implementation Plan) ปฏิทินไทย v0.1

---

## 1. Scope Check (การตรวจสอบขอบเขตงาน)

การตรวจสอบความสมบูรณ์ตามความต้องการของใบงาน DEV-113 ดำเนินการผ่านเกณฑ์ประเมิน 100% ครบถ้วน:

| หัวข้อตรวจสอบ | ความต้องการตามสเปก | สถานะประกันคุณภาพ | รายละเอียด / บันทึกผลลัพธ์ |
|---|---|---|---|
| **Implementation Plan Only** | จัดทำเฉพาะเอกสารแผนงาน 2 ฉบับ ห้ามแก้ไขไฟล์โค้ดใน `src/` | **PASS** | ไม่มีซอร์สโค้ดเดิมหรือใหม่ถูกแก้ไขในรอบนี้ |
| **Wiring Target Surface** | แผนงานต้องระบุพื้นที่แสดงผลเป็น preview/debug-only เท่านั้น | **PASS** | กำหนดตำแหน่งใน Preview route ภายใต้ส่วน Data Tools / Diagnostics |
| **Future Files Identified** | ต้องระบุไฟล์เป้าหมายที่จะสร้าง/แก้ไขในอนาคตอย่างชัดเจน | **PASS** | ระบุไฟล์ Wrapper Component และไฟล์ Preview หลักที่จะแก้ไขภายหลัง |
| **Visibility Gate** | ระบุเงื่อนไขการกรองความปลอดภัยและสวิตช์เปิด-ปิด | **PASS** | ออกแบบโดยใช้เงื่อนไขรันไทม์ `variant === 'preview' && showDiagnostics === true` |
| **Fixture/Input Strategy** | ใช้ placeholder-only และไม่ถือเป็นข้อมูลดวงเกิดจริงที่ validated | **PASS** | กำหนดค่าเริ่มต้นเป็นสตริงจำลองสถานะรอตรวจสอบ |
| **No LocalStorage changes** | วางเงื่อนไขห้ามบันทึกข้อมูลตำแหน่งดวงดาวลงคีย์หน่วยความจำ | **PASS** | บังคับทิศทางข้อมูลแบบ In-memory ล้วนและปราศจาก side-effects |
| **No Strategy Engine Link** | ห้ามให้ข้อมูลไหลเข้า Today/Weekly/Monthly หรือ Composer | **PASS** | กำหนดขอบข่ายการตัดแยกความสัมพันธ์ของข้อมูลดวงดาวจำลองถาวร |
| **Metadata only time** | ยืนยันสถานะของ `generatedAt` ว่าไม่ใช่เวลาดาราศาสตร์คำนวณ | **PASS** | ระบุเป็น metadata บันทึกจังหวะการทำงานในเบราว์เซอร์เท่านั้น |
| **No stage/commit** | ห้าม stage หรือ commit จนกว่าจะได้รับอนุมัติใน chat | **PASS** | เก็บไฟล์ใหม่ไว้ในฐานะ untracked/unstaged เพื่อรอรับตรวจ |

---

## 2. Files Reviewed (ไฟล์ที่ร่วมสอบทานในการวางแผน)

ผู้พัฒนาได้วิเคราะห์โครงสร้างข้อมูลจากไฟล์เพื่อกำหนดสเปกแผนผสานโค้ดอย่างรัดกุม:
* [ThaiPlanetPlacementDebugPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx) (คอมโพเนนต์ React)
* [astroRealAppThaiPlanetPlacementAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts) ( Adapter รันไทม์)
* [astroRealAppThaiPlanetPlacementSafety.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts) (โมดูลตรวจเช็กความปลอดภัย)
* [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts) (ประเภทข้อมูลปฏิทินไทย)
* [astro-real-app-112-thai-planet-placement-debug-panel-preview-wiring-plan.md](file:///Users/tamz/projects/workos-lite/docs/astro-strategy/astro-real-app-112-thai-planet-placement-debug-panel-preview-wiring-plan.md) (แผนเชื่อมต่อโครงร่าง DEV-112)

---

## 3. Future File Boundary Review (การตรวจสอบขอบเขตไฟล์ในอนาคต)

แผนปฏิบัติการระบุพิกัดรหัสที่จะอาจถูกแตะต้องและกักขังขอบเขตไว้ชัดเจน:
* **อาจสร้างใหม่**: `ThaiPlanetPlacementDiagnosticsSection.tsx` (ทำหน้าที่เป็น Wrapper diagnostics)
* **อาจแก้ไขภายหลัง**: `AstroRealAppPreview.tsx` (สำหรับจัดวางคอมโพเนนต์ Wrapper ไปเรนเดอร์ด้านล่างสุด)
* **ห้ามแก้ไขเด็ดขาด**: `AstroTodayPanel.tsx` (หน้ารายงานผลหลักผู้ใช้งานจริง) และ LocalStorage Adapters

---

## 4. Data Flow Review (การตรวจสอบเส้นทางการไหลของข้อมูล)

* ข้อมูลจาก Profile ขาเข้าจะประมวลผลผ่าน `buildThaiPlanetPlacementRuntimeAdapterV01` เป็น in-memory object ในหน่วยความจำชั่วคราว
* ข้อมูลจำลองดังกล่าวส่งผ่านไปยัง Wrapper Component และ Debug Panel โดยไม่มีการบันทึกลงดิสก์
* ข้อมูลไม่ถูกนำส่งต่อไปยังระบบ Composer หรือระบบแสดงผลคำแนะนำใดๆ

---

## 5. Visibility Gate Review (การตรวจสอบสิทธิ์การแสดงผล)

* การเปิดแสดงผลถูกกำหนดเงื่อนไขผ่านตัวกรอง:
  ```typescript
  variant === 'preview' && showDiagnostics === true
  ```
  โดยแท็บตรวจสอบความสอดคล้องจะถูกพับและซ่อนไว้เริ่มต้นเสมอ เพื่อป้องกันการมองเห็นโดยพลการ

---

## 6. Copy Safety Review (การทบทวนความปลอดภัยของภาษาบรรยาย)

* แผนการบังคับให้จัดแสดงคำปฏิเสธอย่างชัดเจน: `"Diagnostic only"`, `"Stub-only"`, `"Not validated"`, `"Pending reference validation"`, `"Not used for interpretation"`, `"No real Thai planet placement is displayed"`, `"Not persisted"`
* ห้ามใช้ชื่อจักรราศีสถิตที่ระบุว่าเป็นตำแหน่งแท้จริงของดวงดาวหรือคำวิจารณ์ชี้ชะตาชีวิต (*ดาวอยู่ราศี…*, *ผลดวงจริง*, *ใช้ทำนาย*, *accurate placement*, *validated placement*)

---

## 7. LocalStorage Non-interaction Confirmation (การตัดขาดจาก LocalStorage)

* แผนการระบุชัดเจนว่าคอมโพเนนต์วินิจฉัยรวมถึงส่วน Wrapper ในอนาคต **จะไม่มี** การเรียกใช้คำสั่งเขียนหรือบันทึกค่าลง LocalStorage
* ค่า `generatedAt` ในออบเจกต์วินิจฉัยจะทำหน้าที่เป็นข้อมูล Metadata สรุปประวัติการเรียกใช้ของ React component บนเบราว์เซอร์เท่านั้น ไม่ใช่เวลาดาราศาสตร์คำนวณตำแหน่งองศาดาวจริง

---

## 8. Strategy Engine Non-interaction Confirmation (การยืนยันการไม่พัวพันกับ Composer)

* ข้อมูล `runtimeResult` ของปฏิทินไทย v0.1 จะต้องไม่เป็นตัวแปรนำเข้า (Parameters) ของ `AstroTodayPanel`, `NatalTransitStrategyComposer` และกลไกวิเคราะห์ความเห็นกลยุทธ์หลักทุกประเภท

---

## 9. Verification Commands (ผลลัพธ์การรันคำสั่งตรวจสอบ)

### 9.1. Git Status Check
```bash
git status --short
```
**ผลลัพธ์คำสั่ง:**
```bash
?? docs/astro-strategy/astro-real-app-113-thai-planet-placement-debug-panel-preview-wiring-implementation-plan.md
```
*(มีเพียงไฟล์เอกสารแผนปฏิบัติการระดับโค้ดที่เกิดขึ้นใหม่โดยยังไม่ได้รับการ stage)*

### 9.2. ESLint Check
```bash
node node_modules/eslint/bin/eslint.js src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs
```
**ผลลัพธ์คำสั่ง:**
```bash
/Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

✖ 1 problem (0 errors, 1 warning)
```
*(Accepted non-blocking warning จากการเพิกถอนไฟล์ CLI `check-thai-planet-placement-contract.cjs` ตามปกติวิสัย)*

### 9.3. Next.js Production Build
```bash
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next build --webpack
```
**ผลลัพธ์คำสั่ง:**
```bash
✓ Compiled successfully in 6.3s
  Running TypeScript ...
  Collecting page data using 9 workers ...
✓ Generating static pages using 9 workers (59/59) in 445.0ms
  Finalizing page optimization ...
  Collecting build traces ...
Route (app)
...
✓ Generating static pages successful
```

---

## 10. Final QA Result (ผลลัพธ์การประกันคุณภาพขั้นสุดท้าย)

* **ประเมินผล**: **ผ่าน (Passed)**
* **สรุปการวินิจฉัย**: เอกสารแผนปฏิบัติการผสานโค้ด (Wiring Implementation Plan) ในใบงาน ASTRO-REAL-APP-DEV-113 กำหนดรายการไฟล์ที่จะแก้ไข/สร้างใหม่จำกัดขอบเขตได้ชัดเจน, ทิศทางข้อมูลจำลองแบบ In-memory Props flow สอดคล้องตามสัญญาความปลอดภัย, กำหนด Visibility Gate และกลไกแยกขาดจาก LocalStorage และ Strategy Engine ครบถ้วนตามมาตรฐานวิศวกรรมความปลอดภัยดวงชะตาทุกประการ
