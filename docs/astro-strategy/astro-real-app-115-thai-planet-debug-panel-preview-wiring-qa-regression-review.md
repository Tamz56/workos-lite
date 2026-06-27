# Thai Planet Debug Panel Preview Wiring QA & Regression Review (ASTRO-REAL-APP-DEV-115)

เอกสารรายงานการตรวจสอบความถดถอยของระบบ (Regression Review) และการประกันคุณภาพ (QA) เพื่อสอบทานและยืนยันความปลอดภัยของการผสานส่วนการวินิจฉัยพิกัดดาวเคราะห์ไทย v0.1 เข้าสู่พื้นที่จำลองในรอบ DEV-114

---

## 1. Purpose (วัตถุประสงค์)

วัตถุประสงค์หลักของใบงาน DEV-115 คือการทำ Regression Review และตรวจสอบแบบประเมินความปลอดภัยเชิงรหัสโปรแกรม (Source Integrity) และความปลอดภัยของคำอธิบาย (Copy Safety) เพื่อให้มั่นใจได้ว่า:
* ระบบวินิจฉัยดาวเคราะห์ไทยจำลอง v0.1 ถูกกักขอบเขตไว้เฉพาะภายใต้หน้าเครื่องมือจำลองผู้พัฒนา (Preview Data Tools)
* ไม่มีจุดรั่วไหลของชุดข้อมูลจำลอง (Stub-only inputs) หรือผลการคำนวณที่ไม่ได้สัดส่วนดาราศาสตร์จริงไปปะปนกับกลไกคำแนะนำชีวิตหลักของผู้ใช้ (Today/Weekly/Monthly Strategy)
* โครงสร้างของข้อมูลไม่มีผลข้างเคียงหรือกระทำการเขียนลงระบบบันทึกค่าภายในเครื่อง (LocalStorage)

---

## 2. Scope and Non-goals (ขอบเขตและข้อยกเว้น)

### ขอบเขตในการตรวจสอบ (In Scope)
* รีวิวและตรวจสอบพฤติกรรมโค้ดของไฟล์ทั้ง 8 ไฟล์ที่ระบุในสเปก
* ตรวจสอบ Visibility Guards และโครงสร้างสวิตช์ Toggle (Gate 1 และ Gate 2)
* ทดสอบคอมไพล์ Production Build และรันสคริปต์ตรวจสอบการประกันคุณภาพเพื่อดึงรายงานผลลัพธ์
* จัดทำรายงาน QA และรายงานทบทวนแบบไร้การแก้ไขโค้ด `src/`

### ข้อยกเว้นการทำงาน (Non-goals)
* ไม่ใช่การเปลี่ยนลอจิกการคำนวณหรือเพิ่มพิกัดดาวดาราศาสตร์จริง
* ไม่ปรับปรุงหน้าจอคำแนะนำผู้ใช้อื่น เช่น Today Panel, Weekly Grid, หรือ Composer Strategy
* ไม่แก้ไขระบบ LocalStorage หรือเพิ่ม Dependencies ใดๆ

---

## 3. Files Reviewed (รายการไฟล์ที่ผ่านการรีวิว)

การสอบทานโค้ดดำเนินการโดยระมัดระวังบนไฟล์เป้าหมายต่อไปนี้:
1. **[AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx)** (หน้าองค์ประกอบจำลอง)
2. **[ThaiPlanetPlacementDiagnosticsSection.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDiagnosticsSection.tsx)** (Diagnostics Wrapper)
3. **[ThaiPlanetPlacementDebugPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx)** (แผงวินิจฉัยดาวไทย)
4. **[AstroTodayPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx)** (คอมโพเนนต์แนะนำจังหวะวันนี้)
5. **[astroRealAppThaiPlanetPlacementAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts)** (ตัวจัดการรันไทม์จำลอง v0.1)
6. **[astroRealAppThaiPlanetPlacementSafety.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts)** (กลไกตรวจสอบความปลอดภัย)
7. **[astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts)** (นิยามสัญญากับประเภทข้อมูล)
8. **[check-thai-planet-placement-contract.cjs](file:///Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs)** (สคริปต์ตรวจวัดสัญญาอัตโนมัติ)
9. **[qa-real-app-114-thai-planet-placement-debug-panel-preview-wiring-implementation.md](file:///Users/tamz/projects/workos-lite/docs/astro-strategy/qa-real-app-114-thai-planet-placement-debug-panel-preview-wiring-implementation.md)** (รายงานตรวจสอบในรอบก่อนหน้า)

---

## 4. Wiring Surface & Data Tools Confirmation (การสอบทานพื้นผิวหน้าจอ)

จากการประเมินโครงสร้างรหัส:
* คอมโพเนนต์ `ThaiPlanetPlacementDiagnosticsSection` ถูกเรียกใช้เพียงจุดเดียวใน `AstroRealAppPreview.tsx` ภายใต้เงื่อนไข `activeTab === "tools"`
* แท็บ "tools" (เครื่องมือข้อมูล) เป็นแท็บที่ถูกแสดงผลเฉพาะเมื่ออยู่ในโหมดจำลอง (`variant !== "production"`) เท่านั้น ทำให้มั่นใจได้ว่าผู้ใช้งานในโหมดใช้งานจริง (Production Tab Layout) จะไม่สามารถเห็นหรือเข้าถึงจุดนี้ได้เด็ดขาด

---

## 5. Visibility Gate Review (การประเมินสวิตช์ปิดกั้น)

ตัวกรองการเข้าถึงทำหน้าที่เป็น Security Gate สองระดับ:
* **Gate ระดับบน (Parent Guard)**: ตรวจสอบสถานะการเชื่อมต่อ `activeTab === "tools" && variant !== "production"`
* **Gate ระดับล่าง (Local Guard)**: มีสถานะเปิด-ปิดระบบวินิจฉัย `showDiagnostics` ในตัว Wrapper เริ่มต้นเป็น `false` (ยุบพับเก็บไว้เสมอ)
* **Gate ยืนยันความปลอดภัย**: คอมโพเนนต์จะคืนค่า `null` ในระดับบนสุดของโค้ดทันทีหากตัวแปร `variant` ถูกส่งค่ามาเป็น `"production"`

---

## 6. LocalStorage Isolation Review (การแยกขาดจาก LocalStorage)

จากการตรวจค้นหาคำสั่ง `localStorage` ทั้งหมดในโค้ดรอบ DEV-114:
* โค้ดของคอมโพเนนต์ `ThaiPlanetPlacementDiagnosticsSection` ไม่มีส่วนใดที่ประมวลผล ดึงค่า หรืออัปเดตข้อมูลเข้าไปหา LocalStorage
* ชุดข้อมูลนำเข้า (Input Fixture) ถูกส่งค่าผ่าน `React.useMemo` ในหน่วยความจำ (In-memory) และประมวลผลสดใหม่ในแต่ละรอบของการเปิดวินิจฉัยเท่านั้น

---

## 7. Strategy Engine Isolation Review (การแยกขาดจากระบบคำแนะนำหลัก)

* ข้อมูล `runtimeResult` ของปฏิทินไทย v0.1 ไม่ถูกส่งผ่าน Props เข้าไปที่ `AstroTodayPanel` หรือคอมโพเนนต์การวิเคราะห์กลยุทธ์อื่นๆ
* ไม่มีส่วนเกี่ยวข้องกับ `NatalTransitStrategyComposer` ทำให้ยืนยันได้ว่าลอจิกวิเคราะห์จังหวะชีวิตหลักของผู้ใช้ยังคงถูกต้อง สมบูรณ์ และไม่มีสิ่งปลอมแปลงปะปน

---

## 8. Copy Safety & Placeholder Safety (ความปลอดภัยของคำอธิบายและชุดข้อมูลจำลอง)

* **ชุดข้อมูลจำลอง (Input Fixture)**: ใช้ค่าทดสอบที่ระบุชัดว่า `"pending-reference-validation"` บนวันเกิด เวลาเกิด พิกัดสถานที่เกิด และการเลือกปฏิทิน
* **แผงแสดงผลวินิจฉัย (Diagnostics Panel Output)**:
  * แสดงค่าองศาและราศีเป็นสตริงข้อมูลจำลองที่คัดลอกไม่ได้และไม่ใช่ข้อมูลจริง
  * ตรวจสอบคำอธิบายเพื่อความปลอดภัย (Copy Safety Labels) ปรากฏคำว่า `"Diagnostic only"`, `"Stub-only"`, `"Not validated"`, `"Pending reference validation"`, `"Not used for interpretation"`, `"No real Thai planet placement is displayed"`, `"Not persisted"` ครบถ้วน
* **Metadata-only Time**: ค่า `generatedAt` ใน adapter ทำหน้าที่ชี้วัดวินาทีการทำงานของ React เท่านั้น ไม่มีลอจิกคำนวณทางดาราศาสตร์

---

## 9. Verification Summary (สรุปรายงานการทดสอบ)

### 9.1. ESLint & TypeScript Checks
* **คำสั่งที่รัน**:
  ```bash
  node node_modules/eslint/bin/eslint.js src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDiagnosticsSection.tsx src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs
  ```
* **ผลลัพธ์**: ผ่านสำเร็จ 100% มีเพียง warning จากไฟล์สคริปต์ของ `check-thai-planet-placement-contract.cjs` ที่อยู่นอกสโคปลินต์เบราว์เซอร์ ซึ่งจัดเป็น **accepted non-blocking warning**

### 9.2. Next.js Production Build
* **คำสั่งที่รัน**:
  ```bash
  NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next build --webpack
  ```
* **ผลลัพธ์**: โครงการหลักผ่านการตรวจสอบ Static Page Generation, Compilation และ Trace Collection สำเร็จโดยสมบูรณ์

### 9.3. Manual Diagnostic Script
* **คำสั่งที่รัน**:
  ```bash
  node scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs
  ```
* **ผลลัพธ์**: ตรวจสอบเกณฑ์และเงื่อนไขความถูกต้องแสดงสถานะ **Status: Passed** ทุกหมวดหมู่

---

## 10. Risk Review (การประเมินความเสี่ยง)

| ปัจจัยเสี่ยงที่อาจเกิดขึ้น | ระดับความเสี่ยง | มาตรการควบคุมที่ใช้จริงในรหัสโปรแกรม |
|---|---|---|
| ผู้ใช้งานในโหมด Production มองเห็นกล่องวินิจฉัย | ต่ำมาก (Very Low) | มี Parent guard และการคืนค่า `null` ทันทีเมื่อตรวจเจอ `variant === "production"` |
| ข้อมูลวินิจฉัยขัดแย้งกับสคริปต์เทคนิค | ต่ำ (Low) | ดักจับและควบคุมความสอดคล้องผ่านนิยาม Types ของ `ThaiPlanetPlacementInput` และมีตรวจวัดสัญญาโดยสคริปต์อัตโนมัติ |
| ข้อมูลจำลองรั่วไหลเข้า LocalStorage | ปราศจากความเสี่ยง (Zero Risk) | ไม่มีการนำเข้า Adapter / Logic ไปบันทึกใน Storage Adapter หรือ Composer แต่อย่างใด |

---

## 11. Recommendation for DEV-116 Handoff (ข้อเสนอแนะในการส่งต่อใบงานถัดไป)

* โครงสร้างของคอมโพเนนต์วินิจฉัย v0.1 ได้รับการผสานเชื่อมต่อในพื้นที่ที่ปลอดภัยอย่างสมบูรณ์แล้ว
* ในรอบการทำงานถัดไป (**ASTRO-REAL-APP-DEV-116**) แนะนำให้เริ่มกระบวนการจัดทำลอจิกการคำนวณปฏิทินไทยหรือโครงร่างวิเคราะห์เชิงวิทยาศาสตร์ต่อไปได้อย่างมั่นใจ โดยคงพฤติกรรมความปลอดภัยและการกักแยกขอบเขตข้อมูลเช่นนี้ไว้
