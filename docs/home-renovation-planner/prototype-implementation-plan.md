# HOME-RENOVATION-PLANNER-003 — Standalone Prototype Implementation Plan

## 1. Document Status
* **Version:** 1.0.0
* **Status:** `DRAFT` (รอการตรวจสอบและอนุมัติ)
* **Date:** 2026-06-23
* **Author:** Antigravity AI
* **Related Documents:**
  * [app-placement-decision.md](file:///Users/tamz/projects/workos-lite/docs/home-renovation-planner/app-placement-decision.md)
  * [mvp-spec.md](file:///Users/tamz/projects/workos-lite/docs/home-renovation-planner/mvp-spec.md)
  * [standalone-app-plan.md](file:///Users/tamz/projects/workos-lite/docs/home-renovation-planner/standalone-app-plan.md)

---

## 2. Purpose
เอกสารฉบับนี้จัดทำขึ้นเพื่อกำหนด **แผนและขั้นตอนการปฏิบัติการ (Implementation Plan)** ในการพัฒนาแอปพลิเคชันโปรโตไทป์ตัวแรก (First Prototype) ในรูปแบบแอปเดี่ยว (Standalone App) 
> [!IMPORTANT]
> เอกสารฉบับนี้ทำหน้าที่เป็นเพียงแผนงานชี้แนะขั้นตอนเท่านั้น **จะยังไม่มีการสร้างไดเรกทอรีแอปพลิเคชันจริง Scaffold โครงสร้างโปรเจกต์ ติดตั้ง package หรือแก้ไขโค้ดใดๆ ของระบบหลักในรอบการทำงานนี้**

---

## 3. Prototype Goal
เป้าหมายหลักในการสร้างแอปพลิเคชันเวอร์ชันโปรโตไทป์แรก (Read-only Prototype):
1. **การแสดงผลข้อมูลตั้งต้นสำเร็จ:** ระบบต้องดึงข้อมูลโครงการตั้งต้น **"ห้องน้ำ DIY"** ขึ้นมาแสดงผลได้อย่างถูกต้อง
2. **การทวนสอบ Data Model:** ทดสอบโครงสร้างฟิลด์และตัวแปร Enum ทั้งหมดว่าสัมพันธ์กันอย่างราบรื่น
3. **การตรวจสอบสูตรคำนวณ:** ตรวจทานความถูกต้องในการรันตัวเลขทางคณิตศาสตร์ตามสูตรการเงิน
4. **ความครบถ้วนของหน้าจอหลัก:** ผู้ใช้สามารถดูหน้า Dashboard, Projects List, Project Detail, Items list และ Tasks list ได้ครบในสถานะจำลอง (Read-only Preview)
5. **การแยกแยะความรับผิดชอบ:** ยังไม่มีระบบบันทึก เพิ่ม ลบ หรือแก้ไขข้อมูล (CRUD) ใดๆ ในรอบแรก เพื่อป้องกันความซับซ้อน

---

## 4. Target Repository
* **Repository Name:** `home-renovation-planner`
* **Suggested Absolute Path:** `/Users/tamz/projects/home-renovation-planner`
* **นโยบายความเสถียร:** **ห้ามทำการสร้างไดเรกทอรีนี้ ห้ามรัน git init หรือ scaffold โค้ดในพาธนี้ในรอบงานปัจจุบัน** จนกว่าเอกสารนี้จะได้รับการยืนยันและอนุมัติจากผู้ใช้งาน

---

## 5. Tech Stack
* **Build Tool:** `Vite` (React + TypeScript)
* **CSS Framework:** `Vanilla CSS`
* **Persistence:** `LocalStorage` (หรือจำลอง In-memory Data สำหรับหน้าจอ Read-only Prototype)
* **Backend & Auth:** `None` (ไม่มีการตั้งเซิร์ฟเวอร์หรือฐานข้อมูลใดๆ)

---

## 6. Initial Implementation Scope (ขอบเขตงานในโปรโตไทป์แรก)
1. **Scaffold Project:** ตั้งต้นระบบนอกไดเรกทอรีของ WorkOS-Lite
2. **Domain Layer:** สร้าง Interfaces และ Types สำหรับ Project, Item, Task
3. **Calculations Engine:** เขียน Logic ประมวลตัวเลขการเงิน (Forecast, Spent, Remaining, Contingency)
4. **Seed Data Injector:** จัดการโหลดข้อมูลห้องน้ำ DIY เข้าสู่ระบบ Local Storage เมื่อเปิดแอปครั้งแรก
5. **UI Shell & Navigation:** ทำแถบนำทางสลับเปลี่ยนหน้าจอ
6. **Read-Only Screens:**
   * *Dashboard:* แสดงยอดตัวเลขและ Progress Bar
   * *Project Detail:* สรุปงบประมาณพร้อม Tab แสดงรายการ Items (21 รายการ) และ Tasks (20 รายการ)
   * *Items View:* แสดงสินค้าทั้งหมดพร้อมแยกสถานะจัดซื้อและจัดส่ง
   * *Tasks View:* แสดง Checklist งาน พร้อมแยกสถานะ ความยาก และประเภทแรงงาน
7. **Safety Alert Display:** แสดงกรอบข้อความเตือนความปลอดภัยสุภาพอย่างชัดเจนในงานที่มีระดับความเสี่ยงสูง (`riskLevel: HIGH` หรือ `workType: MUST_HIRE`)

---

## 7. Out of Scope for Prototype (สิ่งที่ยังไม่สร้าง)
เพื่อควบคุมไม่ให้สเปกบานปลายในเฟสแรก:
* ฟอร์มสร้าง/แก้ไข/ลบ โครงการหรือสินค้า (Create/Edit/Delete Forms)
* ระบบยืนยันตัวตนหรือล็อกอิน (Login / Authentication)
* ฐานข้อมูลถาวรหรือการเรียก API (Cloud / Remote Databases)
* การจัดส่งอีเมลหรือพุชเตือนภัย (Notifications)
* ปฏิทินปฏิบัติงานหรือแผนภาพแกนต์ (Calendar / Gantt chart)
* ระบบสแกนและอ่านใบเสร็จ (Receipt OCR / Barcode scanner)
* การอัปโหลดรูปภาพใบเสร็จหรือแนบหลักฐาน (Image/Attachment Upload)
* การแบ่งปันข้อมูลและระบบผู้รับเหมา (Vendor Management)
* ท่อทางจัดส่งและพอร์ตการชำระเงิน (Payment integration)
* ระบบจัดการสิทธิ์การเข้าถึงข้อมูล (Permissions)
* การเชื่อมต่อหรือผสานรวมเข้ากับ WorkOS-Lite (WorkOS-Lite integration)

---

## 8. File Creation Plan (รายการไฟล์ที่จะถูกสร้างใน Standalone App)
เมื่อเริ่มทำการสร้างแอปเดี่ยวจริง โครงสร้างไฟล์ที่จะนำเข้าประกอบด้วย:
* `package.json` — คอนฟิกการติดตั้ง dependencies ขั้นต่ำ
* `index.html` — โครง HTML หลัก
* `src/main.tsx` — จุดเริ่มต้นการติดตั้ง React
* `src/App.tsx` — ตัวจัดการ Router และ Layout หลัก
* `src/domain/project.ts` — ตัวแปรประเภทข้อมูลและ Interface ของ Project
* `src/domain/item.ts` — โครงสร้างและ Enum ของสินค้าจัดซื้อ
* `src/domain/task.ts` — โครงสร้างและ Enum ของงานปฏิบัติช่าง
* `src/domain/calculations.ts` — ฟังก์ชันการเงิน (Estimated, Spent, Forecast, Remaining)
* `src/data/seedBathroomDiy.ts` — ข้อมูลตั้งต้น 21 รายการของใช้ และ 20 รายการงาน
* `src/data/localStorageRepository.ts` — ตัวดึงข้อมูลเบื้องต้นและเซฟเข้า LocalStorage
* `src/features/dashboard/DashboardPage.tsx` — คอมโพเนนต์ Dashboard
* `src/features/projects/ProjectsPage.tsx` — คอมโพเนนต์แสดงโปรเจกต์ทั้งหมด
* `src/features/projects/ProjectDetailPage.tsx` — คอมโพเนนต์ดูรายละเอียดและ Tabs
* `src/features/items/ItemsPage.tsx` — คอมโพเนนต์รวมศูนย์รายการซื้อของ
* `src/features/tasks/TasksPage.tsx` — คอมโพเนนต์รวมศูนย์ Checklist งานปฏิบัติ
* `src/styles/global.css` — ออกแบบระบบ CSS สี และ Layout พื้นฐาน

---

## 9. Implementation Order (ลำดับขั้นตอนการลงมือปฏิบัติ)
การพัฒนาโค้ดจะต้องเรียงลำดับดังนี้เพื่อให้ง่ายต่อการสืบค้นข้อผิดพลาด:
1. **สร้างระบบเดี่ยวภายนอก (Scaffold Standalone):** ตั้งไดเรกทอรีใหม่นอก WorkOS-Lite และรันคำสั่งโครงสร้างเบื้องต้น
2. **สร้าง Domain Types:** นำข้อมูล Enum และ Interface ไปเขียนลง TypeScript
3. **เขียนระบบคำนวณงบประมาณ:** เขียนฟังก์ชันทางคณิตศาสตร์ใน `calculations.ts`
4. **ทำข้อมูล Seed Data:** สร้าง Object ชุดข้อมูลเริ่มต้น "ห้องน้ำ DIY"
5. **สร้าง Repository Handler:** เขียน Logic การ Get/Set ข้อมูลกับ LocalStorage
6. **ทำ Layout & Navigation:** จัดทำ Navbar / Sidebar เพื่ออำนวยความสะดวกในการเปลี่ยนหน้าจอ
7. **สร้างหน้าจอแบบ Read-only:** เขียนโค้ด UI ในโฟลเดอร์ `src/features/` ดึงข้อมูลโครงการขึ้นมาแสดงผลตาม Tabs
8. **ปรับปรุง CSS:** ปรับ Layout Grid, Flexbox และ CSS ให้รองรับ Responsive (Mobile view)
9. **รันคำสั่งบิวด์ระบบ:** ทดสอบการคอมไพล์โค้ดด้วย Lint และ Build
10. **รายงานประเมินผล:** รายงานสถานะ Git Status และผลการรัน

---

## 10. Calculation Test Cases
เกณฑ์การทดสอบฟังก์ชันคณิตศาสตร์ (ใน `src/domain/calculations.ts`):
* **Test Case 1 (Estimated Price Zero):**
  * *เงื่อนไข:* ราคาสินค้าทุกชิ้น (`estimatedUnitPrice`) ถูกตั้งเป็น 0 บาท
  * *ผลลัพธ์ที่ถูกต้อง:* `Project Estimated Budget` = 0 บาท
* **Test Case 2 (Base Case Budget):**
  * *เงื่อนไข:* ตั้งงบประมาณโครงการ (`budget`) = 25,000 บาท, ยังไม่มีสินค้าใดจัดซื้อสำเร็จ (`Project Actual Spend` = 0)
  * *ผลลัพธ์ที่ถูกต้อง:* `Remaining Budget` = 25,000 บาท
* **Test Case 3 (Actual Spend Summation):**
  * *เงื่อนไข:* สินค้าชิ้นหนึ่งมีจำนวน 2 ชิ้น, ราคาจ่ายจริง 150 บาท, และมี `purchaseStatus` = `RECEIVED` หรือ `ORDERED`
  * *ผลลัพธ์ที่ถูกต้อง:* ยอดเงิน 300 บาท จะต้องถูกนำมารวมใน `Project Actual Spend` ของโครงการย่อยนั้นๆ
* **Test Case 4 (Cancellation Excluded):**
  * *เงื่อนไข:* สินค้าชิ้นหนึ่งถูกยกเลิกการสั่งซื้อ (`purchaseStatus` = `CANCELLED`)
  * *ผลลัพธ์ที่ถูกต้อง:* สินค้าชิ้นนี้จะต้องไม่ถูกนำไปคิดยอดในประมาณการงบประมาณรวม (`Project Estimated Budget`)

---

## 11. UI Acceptance Criteria
เกณฑ์การประเมินความถูกต้องทาง UI ของระบบโปรโตไทป์แรก:
* [ ] เปิดแอปพลิเคชันขึ้นมาได้โดยไม่มีจอบอร์ดพังหรือมี Error สีแดงใน Console Log
* [ ] หน้า Dashboard แสดงโครงการ "ห้องน้ำ DIY" ขึ้นมาโดยอัตโนมัติเป็นโครงการเริ่มต้น
* [ ] หน้าแสดงโครงการ (Project list) แสดงข้อมูลความสำคัญ `HIGH` และสถานะ `PLANNING` ได้ถูกต้อง
* [ ] หน้ารายละเอียดโครงการ (Project Detail) แสดงผลอย่างน้อย 3 Tabs: Overview, Items, Tasks
* [ ] รายการใน Tab ซื้อของ (Items preview) แสดงรายการสินค้าครบ 21 รายการถูกต้อง
* [ ] รายการใน Tab งาน (Tasks preview) แสดงงานช่างครบ 20 รายการถูกต้อง
* [ ] งานชิ้นใดที่มีระดับความเสี่ยงสูง (`riskLevel: HIGH` หรือ `workType: MUST_HIRE`) จะต้องปรากฏข้อความแจ้งเตือนความปลอดภัยที่สุภาพ
* [ ] ไม่มีช่องป้อนข้อมูล (Forms) หรือฟังก์ชัน CRUD นอกเหนือจากขอบเขตแผน MVP ปรากฏอยู่บนหน้าจอ

---

## 12. QA / Verification Plan
ขั้นตอนทดสอบคุณภาพโค้ดเมื่อรันแอปเดี่ยวจริง (ใช้รันในเครื่องของผู้พัฒนา):
1. **การติดตั้ง Package:**
   ```bash
   npm install
   ```
   *(ผลลัพธ์ที่คาดหวัง: ติดตั้งสำเร็จโดยไม่มีข้อขัดแย้งของรุ่น Dependency)*
2. **การตรวจสอบความสะอาดของโค้ด:**
   ```bash
   npm run lint
   ```
   *(ผลลัพธ์ที่คาดหวัง: ผ่านการตรวจสอบมาตรฐาน หรือไม่มี Error รุนแรง)*
3. **การทดสอบความถูกต้องของการคอมไพล์บิวด์:**
   ```bash
   npm run build
   ```
   *(ผลลัพธ์ที่คาดหวัง: บิวด์โปรเจกต์เป็นไฟล์ Production สแตติกได้สำเร็จไร้ Error)*
4. **ตรวจสอบความบริสุทธิ์ของ Workspace:**
   ```bash
   git status --short
   ```
   *(ผลลัพธ์ที่คาดหวัง: แสดงเฉพาะการเปลี่ยนแปลงที่ถูกต้อง ไม่มีไฟล์ขยะติดอยู่)*

---

## 13. WorkOS-Lite Protection Rules
* **ห้ามทำการบันทึกโค้ด (JS, TS, TSX, CSS):** ของแอปแต่งบ้านนี้ลงในระบบหลักของ WorkOS-Lite
* **ห้ามแตะต้องโฟลเดอร์หลัก:** โฟลเดอร์ `src/` ของ WorkOS-Lite จะต้องไม่มีไฟล์ใดเปลี่ยนรูป
* **ห้ามเพิ่มเติมสิทธิ์นำทาง:** ห้ามแก้ไข Navigation Menu ในแอปหลักเพื่อชี้ลิงก์มายังโมดูลใหม่นี้
* **ห้ามทำการ Migration ฐานข้อมูลหลัก:** ระบบ SQLite และฐานข้อมูลของ WorkOS-Lite จะต้องไม่เปลี่ยนสกีมา
* **ที่จัดเก็บเอกสาร:** เอกสารฉบับนี้และเอกสารวางแผนที่เกี่ยวข้องสามารถจัดเก็บในโฟลเดอร์ `docs/home-renovation-planner/` ใน WorkOS-Lite ได้เท่านั้น

---

## 14. Next Step After This Document
1. **การตรวจทานแผน:** ให้ผู้ใช้ตรวจสอบรายละเอียดขั้นตอนและแผนการตรวจสอบคุณภาพ
2. **Commit เอกสารนี้:** บันทึกไฟล์ `prototype-implementation-plan.md` นี้เก็บเข้าประวัติในไดเรกทอรีเอกสาร
3. **เริ่มขั้นตอนสตรีมการสร้างแอป:** เมื่อผู้ใช้มีคำสั่งยืนยันและอนุมัติ จึงเริ่มแยกโปรเจกต์ไปสร้างแอปเดี่ยวภายนอกได้
