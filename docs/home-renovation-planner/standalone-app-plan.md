# HOME-RENOVATION-PLANNER-002 — Standalone App Plan

## 1. Document Status
* **Version:** 1.0.0
* **Status:** `DRAFT` (รอการตรวจสอบและอนุมัติ)
* **Date:** 2026-06-23
* **Author:** Antigravity AI
* **Relation to mvp-spec.md:** เอกสารฉบับนี้เป็นแผนการจัดวางสถาปัตยกรรม (Architectural & Deployment Plan) เพื่อเตรียมการสร้างแอปพลิเคชันเดี่ยว (Standalone App) ในอนาคต โดยอ้างอิงและแปลงความต้องการจากสเปกหลัก [mvp-spec.md](file:///Users/tamz/projects/workos-lite/docs/home-renovation-planner/mvp-spec.md) ไปสู่โค้ดเบสจริงอย่างเป็นระบบ

---

## 2. Decision Recap
* **Planning Workspace Only:** โค้ดเบสของ **WorkOS-Lite** ในปัจจุบันจะทำหน้าที่เป็นเพียงพื้นที่จัดเก็บข้อมูล เอกสารการวางแผน และเอกสารสเปก (Planning/Spec Workspace) สำหรับระบบ Home Renovation Planner เท่านั้น
* **Standalone Deployment:** เพื่อปกป้องความเสถียรและหลีกเลี่ยงปัญหาความซับซ้อนของข้อมูล (Domain & Code Bloat) ตัวแอปพลิเคชันจริงจะถูกพัฒนาในรูปแบบ **Standalone Repository / Application** แยกต่างหากอย่างเด็ดขาด
* **No Repo Creation in this Step:** ในขั้นตอนหรือรอบการทำงานนี้ **จะยังไม่มีการสร้าง Repository จริง** หรือเขียนโค้ดเริ่มต้นใดๆ ทั้งสิ้น โดยจำกัดขอบเขตไว้ที่การวางแผนทางเอกสารฉบับนี้เท่านั้น

---

## 3. Recommended Repo Name
ตัวเลือกชื่อ Repository ที่เหมาะสมสำหรับแอปพลิเคชันเดี่ยวนี้:
1. `home-renovation-planner`
2. `house-project-tracker`
3. `diy-house-planner`

* **Recommendation (ข้อเสนอแนะ):** แนะนำให้ใช้ชื่อ **`home-renovation-planner`**
* **เหตุผล:** สื่อสารวัตถุประสงค์การใช้งานและประเภทระบบชัดเจนที่สุด สอดคล้องกับโครงสร้างเอกสารของสเปกดั้งเดิม และเข้าใจได้ง่ายสำหรับทั้งเจ้าของบ้านช่าง และนักพัฒนาทั่วไป

---

## 4. Recommended Tech Stack
เพื่อรักษาความเรียบง่ายระดับสูงสุดตามนโยบาย MVP เราขอแนะนำชุดสแต็ค (Tech Stack) ต่อไปนี้:
* **Frontend Core:** `Vite` + `React` (TypeScript)
  * *เหตุผล:* ตั้งค่าระบบรวดเร็ว (Scaffold ได้ภายใน 1 นาที) มีขนาด Bundle ขนาดเล็ก และ TypeScript จะช่วยป้องกัน Bug จากระดับประเภทข้อมูล (Enums/Types)
* **Styling (CSS):** `Vanilla CSS` หรือ `CSS Modules`
  * *เหตุผล:* รักษาความเรียบง่าย ควบคุมพฤติกรรม UI ได้ง่ายตามนโยบายการออกแบบที่ดูสะอาดตา และไม่เพิ่มภาระความซับซ้อนของ Library ขนาดใหญ่
* **Persistence (Data Source):** `LocalStorage` (Web Storage API)
  * *เหตุผล:* ตอบโจทย์การใช้งานของแอปสไตล์ Single-user ได้อย่างสมบูรณ์แบบโดยไม่ต้องมี Database Engine/Server หรือ Backend API
* **Backend / Auth:** `None`
  * *เหตุผล:* ไม่มีความจำเป็นต้องรัน Backend Server หรือฐานข้อมูลภายนอก และไม่ต้องมีระบบล็อกอิน (No Auth Required) สำหรับเวอร์ชันเริ่มต้น
* **UI Library:** `None` (หรือใช้เพียง Icon Library เช่น `lucide-react` เพื่อความรวดเร็วในการตกแต่ง UI)
  * *เหตุผล:* หลีกเลี่ยง UI Library สำเร็จรูปขนาดใหญ่เพื่อควบคุมความง่ายในการจัดหน้าจอที่เหมือน Spreadsheet และลดภาระ Technical Debt

---

## 5. Why This Stack?
1. **ตั้งต้นได้อย่างรวดเร็ว (Fast Time-to-Market):** โครงสร้าง Vite + React ทำให้เริ่มงานพัฒนาได้ทันทีโดยแทบไม่มี Overhead ในการติดตั้งระบบ
2. **เหมาะสมสำหรับ Single-User Local App:** การทำงานบนบราวเซอร์และเก็บข้อมูลลงใน LocalStorage ช่วยให้แอปทำงานได้ทันทีโดยไม่ต้องเชื่อมต่ออินเทอร์เน็ต และมีความปลอดภัยของข้อมูลส่วนตัวระดับสูง
3. **การเปลี่ยนผ่านราบรื่นในอนาคต (Easy Migration Path):** เนื่องจากเราเขียนข้อมูลเป็น Domain Model/Types ที่มีระเบียบใน TypeScript หากในอนาคตต้องการย้ายระบบไปรันบน Database หรือมี Backend API ก็สามารถทำได้ง่ายเพียงแค่เขียน Repository layer ใหม่
4. **แยกความรับผิดชอบอย่างเป็นเอกเทศ (Isolated Codebase):** ไม่สร้างภาระผูกพันหรือ Technical Overlap กับ WorkOS-Lite ช่วยลดโอกาสที่โค้ดส่วนหนึ่งจะทำให้แอปอีกฝั่งพังลง (Zero Regression Risk)

---

## 6. Initial App Architecture (โครงสร้างโฟลเดอร์เริ่มต้น)
เมื่อสร้าง Standalone Repository สำเร็จ โครงสร้างโฟลเดอร์ของแอปพลิเคชันจะถูกจัดวางดังนี้:

```text
home-renovation-planner/
├── public/
├── src/
│   ├── app/                 # สำหรับ Router และ Provider หลัก
│   ├── components/          # UI Components ส่วนกลางที่ใช้ร่วมกัน (เช่น Button, Card, Modal)
│   ├── data/                # แหล่งข้อมูลเริ่มต้นและ LocalStorage handler
│   │   ├── seedBathroomDiy.ts
│   │   └── localStorageRepository.ts
│   ├── domain/              # โครงสร้างแบบจำลองข้อมูล (Types & Logic)
│   │   ├── project.ts
│   │   ├── item.ts
│   │   ├── task.ts
│   │   └── calculations.ts  # ฟังก์ชันคำนวณงบประมาณ
│   ├── features/            # แบ่งส่วนโมดูลหลักของหน้าจอทำงาน
│   │   ├── dashboard/       # หน้าจอภาพรวมระบบ
│   │   ├── projects/        # หน้าจอจัดการโครงการ (List, Detail, Overview)
│   │   ├── items/           # หน้าจอรวมรายการสินค้าที่จะซื้อ
│   │   └── tasks/           # หน้าจอรวมรายการงานปฏิบัติช่าง
│   ├── lib/                 # Utility ฟังก์ชันภายนอกหรือ Helpers
│   ├── styles/              # ไฟล์ CSS และ Design Tokens
│   ├── types/               # โครงสร้าง Type เสริมทั่วไป
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
└── tsconfig.json
```

---

## 7. Core Domain Files
ไฟล์ Domain Logic หลักที่จะต้องถูกประกาศสร้างในโค้ดเบสเพื่อควบคุมพฤติกรรมข้อมูลของระบบ:
1. `src/domain/project.ts` — กำหนดโครงสร้าง TypeScript Interface และ Type Guard ของ `Project` พร้อมตัวแปร Enum ต่างๆ
2. `src/domain/item.ts` — กำหนดโครงสร้าง Interface ของ `Item` และ Enum `purchaseStatus` กับ `deliveryStatus`
3. `src/domain/task.ts` — กำหนดโครงสร้าง Interface ของ `Task` และ Enum `status`, `workType`, `riskLevel`
4. `src/domain/calculations.ts` — บรรจุฟังก์ชันคำนวณตัวเลขงบประมาณทั้งหมด (เช่น `calculateItemEstimatedTotal`, `calculateProjectActualSpend`, `calculateRemainingBudget`) 
5. `src/data/seedBathroomDiy.ts` — เก็บค่าคงที่ของ Seed Data ชุดเริ่มต้นของโครงการห้องน้ำ DIY ทั้งหมด
6. `src/data/localStorageRepository.ts` — ฟังก์ชันสำหรับอ่าน/เขียน (Get/Set) ข้อมูลจาก LocalStorage ของบราวเซอร์

---

## 8. Initial Routes / Screens
เส้นทาง (Paths) ในการเปลี่ยนหน้าจอเพื่อแสดงผลสำหรับแอปสแตนด์อโลน:
* `/` — หน้าจอ Dashboard หลักสรุปผลทางการเงิน
* `/projects` — หน้ารายการโครงการทั้งหมด
* `/projects/:projectId` — หน้าดูรายละเอียดความคืบหน้าของโครงการย่อยนั้นๆ
* `/items` — หน้าจอศูนย์รวมรายการของที่จะซื้อทั้งหมด (Bulk-buying view)
* `/tasks` — หน้าจอรวม Checklist งานทั้งหมด
*(หมายเหตุ: ปฏิทินหรือ Calendar View ไม่รวมอยู่ในแกนหลักของ MVP จะถูกพัฒนาในเฟสถัดไป)*

---

## 9. Local Data Strategy
* **Seed Data Injection:** เมื่อผู้ใช้เปิดใช้งานแอปพลิเคชันเป็นครั้งแรก ระบบจะทำการตรวจสอบข้อมูลใน LocalStorage หากยังไม่มีข้อมูลอยู่ ระบบจะนำเข้า Seed Data จาก `seedBathroomDiy.ts` เพื่อสร้างโครงการ "ห้องน้ำ DIY" ขึ้นมาโดยอัตโนมัติ เพื่อให้ผู้ใช้สามารถทดลองใช้งานและทำความเข้าใจระบบได้ทันที
* **LocalStorage Namespace:** กำหนดคีย์เฉพาะเจาะจง (Unique Key) เพื่อป้องกันข้อมูลทับซ้อนกับระบบอื่น เช่น:
  `home-renovation-planner:v1`
* **Backup/Export (Future Phase):** แม้ว่าจะยังไม่ใช่ฟีเจอร์สำหรับ Milestone แรก แต่ระบบโครงสร้างข้อมูลควรเอื้อต่อการเขียนฟังก์ชันแปลงข้อมูลออกเป็น JSON/Markdown หรือแปลงค่ากลับมานำเข้า (Import/Export) ในอนาคตเพื่อความปลอดภัยของข้อมูล

---

## 10. First Implementation Milestone
ใน Milestone แรกของการพัฒนาโค้ดจริง (เมื่อเริ่มดำเนินการ) จะเน้นไปที่การสร้างแอปพลิเคชันแบบ **Read-only Prototype** เพื่อการจำลองและตรวจสอบความถูกต้องของข้อมูลก่อน โดยมีรายละเอียดงานดังนี้:
1. **Scaffold & Shell App:** สร้างโปรเจกต์ Vite + React และจัดโครงสร้างโฟลเดอร์ตามหัวข้อที่ 6
2. **Domain Types Setup:** สร้างไฟล์สำหรับกำหนด Interface และ Enum ทั้งหมด
3. **Seed Data Setup:** นำเข้าโครงการ "ห้องน้ำ DIY" พร้อม Items และ Tasks
4. **Core UI Shell:** ทำแถบนำทาง (Navbar / Sidebar) และโครงหน้าหลัก
5. **Screens (Read-Only):**
   * *Dashboard:* แสดงยอดงบประมาณรวมและ Progress Bar ของห้องน้ำ DIY
   * *Project Detail (Overview):* แสดงค่าการเงินทั้งหมด
   * *Items Preview Tab:* แสดงตารางรายการซื้อของ 21 รายการ (พร้อมราคา 0 บาทตาม Spec)
   * *Tasks Preview Tab:* แสดง Checklist งาน 20 งาน แยกสัญลักษณ์ระดับความเสี่ยงตามที่กำหนด
*(หมายเหตุ: ยังไม่บังคับทำระบบเพิ่ม/แก้ไข/ลบ (CRUD) แบบสมบูรณ์ใน Milestone 1 เพื่อความรวดเร็วในการประเมินผล UI)*

---

## 11. What Not To Build Yet (ไม่ทำเด็ดขาดในเฟสแรก)
เพื่อรักษาความเรียบง่ายและไม่ขยายฟีเจอร์เกินความต้องการของ MVP:
* **ระบบล็อกอิน (Login / User Session)**
* **ฐานข้อมูลหรือเซิร์ฟเวอร์หลังบ้าน (Backend Server / Cloud Databases)**
* **ปฏิทินแสดงตารางเวลาปฏิบัติงาน (Calendar / Timeline)**
* **ระบบแจ้งเตือนทางข้อความหรือพุช (Notifications / Push Alerts)**
* **สแกนใบเสร็จหรือบาร์โค้ด (OCR Scanner / Barcode scanner)**
* **แนบรูปภาพสินค้าหรือใบเสร็จ (Image / Bill Attachment Upload)**
* **ระบบส่งเมลจัดซื้อจัดจ้างช่าง (Contractor / Vendor Management)**
* **ระบบชำระเงินออนไลน์ (Payment Integration)**
* **Mobile Native App (iOS/Android App)**
* **การจัดการสิทธิ์การเข้าถึงแบบละเอียด (Role-based Permissions)**
* **แผนภาพโครงการ Gantt Chart**

---

## 12. Migration Path From Spec To App
การย้ายข้อมูลและแปลข้อกำหนดจากเอกสาร Spec สู่การเขียนโค้ดจริงจะดำเนินการเป็นขั้นเป็นตอนดังนี้:
1. **ศึกษา Blueprint:** ใช้ไฟล์ `mvp-spec.md` เป็นแนวทางหลัก (Source of Truth) ของความต้องการระบบ
2. **เขียน Types & Enums:** แปลความต้องการจากข้อมูล Data Model Summary (บทที่ 8) และ Status Enums (บทที่ 9) ไปสร้างเป็น Types/Enums ใน TypeScript เป็นจุดเริ่มต้นแรกสุด
3. **เขียน Logic การคำนวณ:** นำกฎการเงินในบทที่ 10 ของสเปกมาเขียนฟังก์ชันคำนวณคณิตศาสตร์ใน `calculations.ts` และรัน Unit Test ทดสอบความถูกต้อง
4. **จำลอง Seed Data:** แปลข้อมูลตารางในบทที่ 11 ไปเขียนเป็น Object Array ใน `seedBathroomDiy.ts`
5. **สร้าง Layout & Screens:** เขียน UI Component เพื่อนำข้อมูล Object เหล่านั้นไปสร้างหน้าจอและตารางตามสเปก
6. **ทำระบบ CRUD:** เพิ่มความสามารถในการโต้ตอบและบันทึกข้อมูล (เพิ่ม/แก้ไข/เปลี่ยนสถานะ) ลงสู่ LocalStorage

---

## 13. QA Checklist For First Prototype
เกณฑ์สำหรับตรวจสอบคุณภาพเมื่อทำ Prototype แรกสำเร็จ (ใช้เช็กผลงาน):
* [ ] สามารถสั่งรัน Dev Server และโหลดหน้าจอแอปพลิเคชันได้โดยไม่เกิด Error บน Console
* [ ] หน้า Dashboard แสดงโครงการตั้งต้น "ห้องน้ำ DIY" ขึ้นมาโดยอัตโนมัติ
* [ ] แถบการเงินประมาณการและใช้จ่ายจริงแสดงผลได้ถูกต้องตามข้อมูลที่ผู้ใช้ป้อน
* [ ] หน้าตาราง Items แสดงรายการของ 21 รายการถูกต้อง พร้อมแสดงราคาเป็น 0 บาทเป็นค่าเริ่มต้น
* [ ] หน้าตาราง Tasks แสดงงาน 20 รายการครบถ้วน และมีสัญลักษณ์เตือนความปลอดภัยในข้อที่มีความเสี่ยงสูงอย่างสุภาพและชัดเจน
* [ ] **ความสะอาดของ Workspace:** ไม่มีไฟล์โค้ด (JS, TS, TSX) หรือ Routing ใหม่ใดๆ หลุดเข้าไปเปลี่ยนแปลงในระบบหลักของ WorkOS-Lite

---

## 14. Next Step Recommendation
* **รีวิวแผน:** ให้ผู้ใช้ตรวจสอบและพิจารณาอนุมัติทิศทางสถาปัตยกรรมของแผนงานเดี่ยวฉบับนี้
* **Commit เอกสารแผน:** ทำการ Stage และ Commit ไฟล์ `standalone-app-plan.md` นี้เก็บเข้าประวัติในโฟลเดอร์เอกสาร
* **เริ่มเฟสพัฒนา:** ภายหลังจากที่เอกสารสเปกและแผนงานได้รับการบันทึกทั้งหมดเรียบร้อยแล้ว ค่อยดำเนินการสั่งสร้าง Standalone Application (เช่น การรันคำสั่ง Scaffold โปรเจกต์แยกนอกไดเรกทอรีของ WorkOS-Lite) ต่อไป
