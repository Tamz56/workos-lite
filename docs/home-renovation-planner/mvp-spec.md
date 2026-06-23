# HOME-RENOVATION-PLANNER-001 — MVP Specification

## 1. Document Status
* **Version:** 1.1.0 (Revision 1)
* **Status:** `DRAFT` (รอการตรวจสอบและอนุมัติ)
* **Date:** 2026-06-23
* **Author:** Antigravity AI
* **Reference Decision:** [app-placement-decision.md](file:///Users/tamz/projects/workos-lite/docs/home-renovation-planner/app-placement-decision.md)

---

## 2. Product Purpose
เป็นแอปพลิเคชันขนาดเล็กแบบ Single-user สำหรับบันทึกความต้องการ จัดการงบประมาณ และติดตามงานปรับปรุงบ้าน (Home Renovation) ทั้งแบบลงมือทำเอง (DIY) หรือจ้างช่างภายนอกบางส่วน เพื่อป้องกันงบบานปลายและช่วยลำดับขั้นตอนงานช่างอย่างเป็นระบบ โดยทำงานได้รวดเร็วและตอบโจทย์จริงโดยไม่สร้างความซับซ้อนเกินความจำเป็น (ไม่ซับซ้อนไปกว่าการจดข้อมูลลงโปรแกรม Spreadsheet)

---

## 3. MVP Principle
1. **ความเรียบง่ายและใช้งานได้จริง (Simple & Pragmatic):** เน้นการทำงานแบบตารางข้อมูล (Grid) และการบันทึกค่าใช้จ่ายที่สะดวก รวดเร็ว ไม่เพิ่มขั้นตอนการทำงานที่ซับซ้อน
2. **ไม่ซับซ้อนกว่าไฟล์ชีท (Sheet-like Flow):** การแก้ไขข้อมูลตัวเลขและสถานะทำได้รวดเร็ว และมีการอัปเดตผลรวมแบบเรียลไทม์
3. **เน้นวินัยการเงิน (Budget Discipline):** สรุปงบประมาณจริงและงบประมาณสำรองจำแนกส่วนการประมาณการออกจากค่าใช้จ่ายจริงอย่างชัดเจน
4. **ความปลอดภัยและการประเมินความรับผิดชอบ (Safety & Responsibility):** ระบุประเภทและระดับความเสี่ยงของงานอย่างชัดเจน เพื่อแจ้งเตือนการจัดการงานช่างที่เป็นระบบและปลอดภัย

---

## 4. Core User Scenario
* **ผู้ใช้:** เจ้าของบ้านที่ต้องการรีโนเวต "ห้องน้ำเก่า" ด้วยตัวเองบางส่วนและจ้างช่างในงานเฉพาะทาง
* **สถานการณ์การใช้งาน:**
  1. เข้าสู่ Dashboard และตั้งโครงการใหม่ชื่อ **"ห้องน้ำ DIY"** กำหนดงบประมาณ (budget) 25,000 บาท พร้อมระบุเงินสำรองฉุกเฉิน (contingencyPercent) 15%
  2. ลิสต์ของที่จะซื้อ เช่น ท่อน้ำทิ้ง, ซิลิโคน, สีทาผนัง โดยตั้งราคาประมาณการต่อหน่วยไว้เพื่อวางแผน
  3. ลิสต์งานที่จะทำ เช่น ทุบบ่อน้ำเดิม, ปูพื้นใหม่, เปลี่ยนฝักบัว, ทาสีผนัง
  4. ทำเครื่องหมายแยกประเภทงานว่าส่วนใดทำเองได้ (DIY, DIY_WITH_HELPER) และงานชิ้นใดที่ความเสี่ยงสูงที่ควรระมัดระวัง (เช่น ทุบผนังลึก หรือระบบน้ำ)
  5. อัปเดตราคาซื้อจริง (actualUnitPrice) และปรับเปลี่ยนสถานะการซื้อ (purchaseStatus) / สถานะการส่งของ (deliveryStatus)
  6. เปลี่ยนสถานะงานปฏิบัติ (Task status) ตามความคืบหน้า เพื่อดูความคืบหน้าของโครงการ

---

## 5. MVP Scope
ระบบเวอร์ชันเริ่มต้น (MVP) จะประกอบด้วย 4 โมดูลหลัก:
1. **Dashboard:** แสดงภาพรวมสถานะการเงินรวมของทุกโครงการ (งบประมาณโครงการทั้งหมด, ค่าใช้จ่ายจริงที่เกิดขึ้นแล้ว, งบประมาณคงเหลือจริง)
2. **Projects Manager:** หน้ารายการโครงการและหน้าดูรายละเอียดโครงการ (Project Details)
3. **Items Manager (Shopping List):** จัดการรายการวัสดุและอุปกรณ์ที่ต้องซื้อ คำนวณราคาประมาณการเทียบกับราคาซื้อจริง
4. **Tasks Checklist:** ลำดับขั้นตอนงานที่ต้องปฏิบัติการในโครงการ แยกประเภทความรับผิดชอบ (ทำเอง/จ้างช่าง) และประเมินระดับความเสี่ยง

---

## 6. Out of Scope (ไม่ทำใน MVP)
* *ไม่มี* ระบบสมัครสมาชิกและการยืนยันตัวตน (Login/Authentication) — ทำเป็น Local Single-user App
* *ไม่มี* ระบบแจ้งเตือน (Notifications / Push Notifications)
* *ไม่มี* ระบบ OCR สแกนใบเสร็จ หรือบาร์โค้ดสแกนเนอร์ (Barcode/Receipt Scanner)
* *ไม่มี* ระบบจัดการผู้รับเหมาหรือร้านค้าแบบละเอียด (Vendor/Supplier Relationship Manager)
* *ไม่มี* ระบบบัญชีแยกประเภทเต็มรูปแบบ (Double-Entry Bookkeeping)
* *ไม่มี* Mobile Native App (เน้นทำเป็น Web App ที่รองรับการเปิดบนหน้าจอมือถือ/Responsive)
* *ไม่มี* ระบบชำระเงินออนไลน์ (Payment Gateways)

---

## 7. Core Pages & UI Flow

### A. Dashboard
* **สรุปการเงินการรีโนเวตทั้งหมด (Total Financial KPI Cards):**
  * งบประมาณโครงการรวมทั้งหมด (Total Renovate Budget)
  * ค่าใช้จ่ายจริงรวมที่จ่ายไปแล้ว (Total Actual Spend)
  * งบประมาณคงเหลือจริง (Total Remaining Budget)
* **ตารางสรุปโครงการ (Active Projects Grid):**
  * รายชื่อโครงการที่อยู่ระหว่างดำเนินการ
  * แถบแสดงความคืบหน้าของงาน (Progress Bar %) และสถานะทางการเงิน (งบประมาณโครงการ/ค่าใช้จ่ายจริง)
* **ลิงก์ด่วน (Quick Actions):** ปุ่มสำหรับสร้างโครงการใหม่ด่วน

### B. Projects List
* แสดงการ์ดโครงการทั้งหมดที่มีในฐานข้อมูล พร้อมระบุระดับความสำคัญ (priority), สถานะโครงการ (status), และประเภทโครงการ (type)
* ปุ่มสำหรับค้นหาและกรองโครงการตามสถานะ

### C. Project Detail (หน้ารวมศูนย์ของแต่ละโครงการ)
แบ่งออกเป็น Tab ต่างๆ เพื่อการจัดการข้อมูลที่ชัดเจน:
* **Tab 1: Overview & Budget Summary**
  * รายละเอียดทั่วไป: ชื่อโครงการ, พื้นที่ (area), ประเภทโครงการ (type), รายละเอียด/หมายเหตุ (notes)
  * ตัวเลขการเงินเฉพาะโครงการ: งบประมาณตั้งต้น (budget), % เงินสำรองฉุกเฉิน (contingencyPercent), ยอดเงินสำรองฉุกเฉิน (Contingency Amount), งบประมาณคาดการณ์สุทธิ (Project Forecast Total), ยอดใช้จ่ายจริง (Project Actual Spend), ยอดคงเหลือ (Remaining Budget)
* **Tab 2: Items (ตารางซื้อของ)**
  * ตารางแสดงรายการวัสดุอุปกรณ์ที่ต้องจัดซื้อ สามารถแก้ไขค่าได้รวดเร็ว (Inline edit หรือ Simple Form)
  * ตัวอย่างฟิลด์: ชื่อของ, จำนวน, ราคาประมาณการต่อหน่วย, ราคาซื้อจริงต่อหน่วย, ร้านค้า, สถานะจัดซื้อ (purchaseStatus), สถานะส่งของ (deliveryStatus)
* **Tab 3: Tasks (Checklist งานปฏิบัติ)**
  * รายการงานช่างที่จะต้องทำในโครงการ
  * ตัวอย่างฟิลด์: ชื่องาน, ระดับความเสี่ยง (riskLevel), ประเภทผู้ดำเนินงาน (workType), สถานะงาน (status), และข้อความเตือนความปลอดภัย (หากเป็นงานเสี่ยงสูง)

### D. Items View (ภาพรวมสินค้าทั้งหมด)
* หน้ารวมตารางของที่จะต้องซื้อจากทุกโครงการ เพื่อให้ผู้ใช้สามารถรวมรายการซื้อไปสั่งซื้อหรือไปร้านวัสดุก่อสร้างในครั้งเดียว (Bulk Buying view) สามารถกรองดูเฉพาะโครงการได้

### E. Tasks View (ภาพรวมงานทั้งหมด)
* หน้ารวมงานทั้งหมดจากทุกโครงการเพื่อดูตารางเวลาและความคืบหน้าภาพรวม

---

## 8. Data Model Summary

### 8.1 Project
| Field Name | Data Type | Constraint / Validation | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key | ไอดีเฉพาะของโครงการ |
| `name` | String | Required | ชื่อโครงการ (เช่น ห้องน้ำ DIY) |
| `area` | String | Optional | พื้นที่ปฏิบัติงาน (เช่น ห้องน้ำชั้นล่าง) |
| `type` | Enum | Required | รูปแบบโครงการ: `DIY`, `DIY_WITH_HELPER`, `PARTIAL_CONTRACTOR`, `CONTRACTOR` |
| `status` | Enum | Required, Default: `PLANNING` | สถานะโครงการ: `PLANNING`, `PRICE_COMPARING`, `BUYING`, `WAITING_ITEMS`, `IN_PROGRESS`, `PAUSED`, `DONE` |
| `priority` | Enum | Required, Default: `MEDIUM` | ความเร่งด่วน: `LOW`, `MEDIUM`, `HIGH` |
| `budget` | Decimal / Float | Required, Default: 0 | งบประมาณตั้งต้นที่ได้รับจัดสรรสำหรับโครงการนี้ |
| `contingencyPercent`| Float | Default: 0 | เปอร์เซ็นต์เงินสำรองฉุกเฉิน (0-100) |
| `startDate` | Date / String | Optional | วันที่เริ่มโครงการ |
| `targetDate` | Date / String | Optional | วันที่เป้าหมายเสร็จสิ้นโครงการ |
| `notes` | Text | Optional | บันทึกความต้องการเพิ่มเติม |
| `createdAt` | DateTime | Auto-fill | เวลาที่สร้างข้อมูล |
| `updatedAt` | DateTime | Auto-update | เวลาที่ปรับปรุงข้อมูล |

### 8.2 Item
| Field Name | Data Type | Constraint / Validation | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key | ไอดีเฉพาะของสินค้า |
| `projectId` | String (UUID) | Foreign Key -> Project | ความสัมพันธ์กับโครงการ |
| `category` | String | Optional | หมวดหมู่ของวัสดุ (เช่น เครื่องมือ, สี, สุขภัณฑ์) |
| `name` | String | Required | ชื่อวัสดุ/อุปกรณ์ (เช่น สายฝักบัว) |
| `description` | String | Optional | คำอธิบายรายละเอียดสินค้า |
| `quantity` | Integer | Default: 1, >= 1 | จำนวนสินค้า |
| `unit` | String | Default: 'pcs' | หน่วยนับของสินค้า (เช่น ชิ้น, ถัง, แผ่น) |
| `estimatedUnitPrice`| Decimal / Float | Default: 0 | ราคาประมาณการต่อหน่วย (ตัวเลขสำหรับแผนงาน) |
| `actualUnitPrice` | Decimal / Float | Default: 0 | ราคาจ่ายจริงต่อหน่วย (ใส่เมื่อจัดซื้อแล้ว) |
| `storeName` | String | Optional | ร้านค้าที่จำหน่าย |
| `productUrl` | String | Optional | ลิงก์ร้านค้าออนไลน์เพื่อการสั่งซื้อซ้ำหรือตรวจสอบราคา |
| `purchaseStatus` | Enum | Required, Default: `NOT_BOUGHT` | สถานะจัดซื้อ: `NOT_BOUGHT`, `COMPARING`, `IN_CART`, `ORDERED`, `RECEIVED`, `CANCELLED` |
| `deliveryStatus` | Enum | Required, Default: `NOT_ORDERED` | สถานะการจัดส่ง: `NOT_ORDERED`, `WAITING_SHIPMENT`, `SHIPPING`, `RECEIVED`, `PROBLEM` |
| `receivedDate` | Date / String | Optional | วันที่ได้รับสินค้าหน้างาน |
| `notes` | Text | Optional | หมายเหตุเพิ่มเติม |
| `createdAt` | DateTime | Auto-fill | เวลาที่สร้างข้อมูล |
| `updatedAt` | DateTime | Auto-update | เวลาที่ปรับปรุงข้อมูล |

### 8.3 Task
| Field Name | Data Type | Constraint / Validation | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key | ไอดีเฉพาะของงานปฏิบัติการ |
| `projectId` | String (UUID) | Foreign Key -> Project | ความสัมพันธ์กับโครงการ |
| `title` | String | Required | ชื่องานที่ต้องทำ (เช่น ทุบผนังบ่อน้ำ) |
| `description` | String | Optional | รายละเอียดเพิ่มเติมเกี่ยวกับวิธีการทำงาน |
| `status` | Enum | Required, Default: `NOT_STARTED` | สถานะงาน: `NOT_STARTED`, `WAITING_ITEMS`, `READY`, `IN_PROGRESS`, `DONE`, `PAUSED`, `CANCELLED` |
| `workType` | Enum | Required, Default: `DIY` | ผู้ดำเนินงาน: `DIY`, `DIY_WITH_HELPER`, `SHOULD_HIRE`, `MUST_HIRE` |
| `riskLevel` | Enum | Required, Default: `LOW` | ระดับความเสี่ยง: `LOW`, `MEDIUM`, `HIGH` |
| `requiredItemIds` | Array of String (UUID) | Optional | รายการอุปกรณ์/วัสดุที่จำเป็นต้องมีก่อนเริ่มงานนี้ |
| `plannedDate` | Date / String | Optional | วันที่วางแผนปฏิบัติการ |
| `completedDate` | Date / String | Optional | วันที่งานเสร็จสมบูรณ์ |
| `notes` | Text | Optional | รายละเอียดขั้นตอนช่างหรือเครื่องมือที่ต้องใช้ |
| `createdAt` | DateTime | Auto-fill | เวลาที่สร้างข้อมูล |
| `updatedAt` | DateTime | Auto-update | เวลาที่ปรับปรุงข้อมูล |

---

## 9. Status Enums

### 9.1 Project Enums
* **Project Type:**
  * `DIY` (ทำเองทั้งหมดคนเดียว)
  * `DIY_WITH_HELPER` (ทำเองโดยมีผู้ช่วย/ครอบครัวช่วยคอยพยุงหน้างาน)
  * `PARTIAL_CONTRACTOR` (จ้างช่างบางส่วน ทำเองบางส่วน)
  * `CONTRACTOR` (จ้างผู้รับเหมา/ช่างทำงานทั้งหมดเป็นหลัก)
* **Project Status:**
  * `PLANNING`: วางแผน/เตรียมสเปกและงานปฏิบัติ
  * `PRICE_COMPARING`: อยู่ระหว่างสืบหาและเปรียบเทียบราคาสินค้า/วัสดุ
  * `BUYING`: อยู่ระหว่างดำเนินการสั่งซื้อวัสดุ
  * `WAITING_ITEMS`: กำลังรอวัสดุจัดส่งมาถึงหน้างาน
  * `IN_PROGRESS`: อยู่ระหว่างลงมือทำงานรีโนเวตหน้างานจริง
  * `PAUSED`: หยุดพักโครงการชั่วคราว
  * `DONE`: เสร็จสิ้นโครงการสมบูรณ์แล้ว
* **Project Priority:**
  * `LOW` / `MEDIUM` / `HIGH`

### 9.2 Item Enums
* **Item purchaseStatus (สถานะจัดซื้อ):**
  * `NOT_BOUGHT`: ยังไม่ได้ดำเนินการซื้อ
  * `COMPARING`: กำลังเปรียบเทียบราคาและโปรโมชันของแต่ละร้าน
  * `IN_CART`: เพิ่มสินค้าเข้าตะกร้าสินค้าเตรียมสั่งซื้อแล้ว
  * `ORDERED`: ทำการสั่งซื้อและชำระเงินเรียบร้อยแล้ว
  * `RECEIVED`: ได้รับสินค้าและตรวจสอบความครบถ้วนแล้ว
  * `CANCELLED`: ยกเลิกรายการซื้อนี้
* **Item deliveryStatus (สถานะจัดส่ง):**
  * `NOT_ORDERED`: ยังไม่ได้ส่งคำสั่งซื้อหรือยังไม่มีกำหนดจัดส่ง
  * `WAITING_SHIPMENT`: ผู้ขายกำลังเตรียมจัดส่งพัสดุ
  * `SHIPPING`: อยู่ระหว่างกระบวนการจัดส่งโดยบริษัทขนส่ง
  * `RECEIVED`: สินค้ามาถึงหน้างานเรียบร้อยแล้ว
  * `PROBLEM`: พบปัญหาในการจัดส่ง (เช่น สินค้าชำรุดเสียหาย, สูญหายระหว่างทาง, ส่งไม่ตรงสเปก)

### 9.3 Task Enums
* **Task Status:**
  * `NOT_STARTED`: ยังไม่ได้เริ่มทำงาน
  * `WAITING_ITEMS`: รอกลุ่มวัสดุอุปกรณ์ที่จำเป็น (`requiredItemIds`) มาส่งถึงหน้างานก่อน
  * `READY`: พร้อมลงมือปฏิบัติงาน (อุปกรณ์และแรงงานพร้อม)
  * `IN_PROGRESS`: อยู่ระหว่างกระบวนการลงมือช่างหน้างานจริง
  * `DONE`: งานเสร็จเรียบร้อยและผ่านการตรวจสอบระดับความพึงพอใจ
  * `PAUSED`: หยุดพักงานนี้ชั่วคราว
  * `CANCELLED`: ยกเลิกงานปฏิบัติชิ้นนี้
* **Task workType (ประเภทผู้ดำเนินงาน):**
  * `DIY` (ทำเองได้คนเดียว)
  * `DIY_WITH_HELPER` (ทำเองแต่ควรมีคนช่วยประคองเพื่อความสะดวกและปลอดภัย)
  * `SHOULD_HIRE` (แนะนำให้จ้างช่างฝีมือเฉพาะทางเพื่อผลลัพธ์และความปลอดภัยที่ดีขึ้น)
  * `MUST_HIRE` (อันตรายหรือต้องใช้ทักษะใบอนุญาตวิชาชีพสูง ต้องใช้ช่างที่เหมาะสมเท่านั้น)
* **Task riskLevel (ระดับความเสี่ยง):**
  * `LOW` (ต่ำ - ปลอดภัยสูง)
  * `MEDIUM` (ปานกลาง - ควรระมัดระวัง)
  * `HIGH` (สูง - มีความเสี่ยงต่อร่างกายหรือโครงสร้างบ้าน ต้องมีการประเมินอย่างรอบคอบ)

---

## 10. Calculation Rules (สูตรการคำนวณ)
ตัวเลขทั้งหมดจะแบ่งออกเป็น 2 กลุ่มอย่างชัดเจน คือ **กลุ่มประมาณการ (Estimated/Forecast)** และ **กลุ่มใช้จ่ายจริง (Actual Spend)** เพื่อป้องกันความสับสนงบประมาณ

### 10.1 สูตรสำหรับฝั่งสินค้า (Items)
1. **ราคารวมประมาณการของแต่ละรายการ (Item Estimated Total):**
   $$\text{estimatedTotal} = \text{quantity} \times \text{estimatedUnitPrice}$$
2. **ราคารวมจ่ายจริงของแต่ละรายการ (Item Actual Total):**
   $$\text{actualTotal} = \text{quantity} \times \text{actualUnitPrice}$$

### 10.2 สูตรสำหรับฝั่งโครงการ (Project Summary)
1. **งบประมาณรวมประมาณการวัสดุอุปกรณ์ (Project Estimated Budget):**
   $$\text{Project Estimated Budget} = \sum \text{estimatedTotal ของ Items ทั้งหมดในโครงการ}$$
   *(คำนวณจากทุก Item ที่สถานะ `purchaseStatus` ไม่ใช่ `CANCELLED`)*
2. **ยอดเงินสำรองฉุกเฉินสำหรับโครงการ (Contingency Amount):**
   $$\text{Contingency Amount} = \text{Project Estimated Budget} \times \left( \frac{\text{contingencyPercent}}{100} \right)$$
3. **งบประมาณคาดการณ์รวมยอดสำรอง (Project Forecast Total):**
   $$\text{Project Forecast Total} = \text{Project Estimated Budget} + \text{Contingency Amount}$$
4. **ยอดใช้จ่ายจริงสุทธิสะสม (Project Actual Spend - ค่าใช้จ่ายจริง):**
   $$\text{Project Actual Spend} = \sum \text{actualTotal ของ Items ทั้งหมดที่จัดซื้อแล้ว}$$
   *(คำนวณจาก Item ที่ระบุ `actualUnitPrice` หรือมีสถานะ `purchaseStatus` เป็น `ORDERED` หรือ `RECEIVED`)*
5. **งบประมาณคงเหลือจริง (Remaining Budget):**
   $$\text{Remaining Budget} = \text{budget} - \text{Project Actual Spend}$$
   *(โดย `budget` คือตัวเลขงบประมาณตั้งต้นที่จัดสรรไว้ของตัวโครงการ)*

---

## 11. Bathroom DIY Seed Data (ข้อมูลตั้งต้นห้องน้ำ DIY)
> [!NOTE]
> **หมายเหตุข้อตกลง (Placeholder Estimate):** 
> เพื่อความปลอดภัยและหลีกเลี่ยงการชี้นำด้านราคาก่อสร้างที่ไม่ตรงตามสภาพตลาดจริง ราคาประมาณการตั้งต้น (estimatedUnitPrice) และราคาจริง (actualUnitPrice) ของสินค้าทุกรายการจะถูกตั้งค่าเริ่มต้นไว้ที่ **0 บาท** ผู้ใช้ควรระบุราคาจริงหลังจากทำการสำรวจตลาดและร้านวัสดุก่อสร้างในพื้นที่จริงเรียบร้อยแล้ว

### Project Model Setup
* **name:** ห้องน้ำ DIY
* **area:** ห้องน้ำเดิมในบ้านเก่า
* **type:** `DIY_WITH_HELPER`
* **status:** `PLANNING`
* **priority:** `HIGH`
* **budget:** 25,000 บาท
* **contingencyPercent:** 15% *(คำนวณงบฉุกเฉินและงบประมาณคาดการณ์ได้หลังจากลงราคาประเมิน)*
* **notes:** ไม่รื้อโครงสร้างใหญ่ ทำเองเป็นหลัก มีงานทุบกำแพงบ่อน้ำเก็บน้ำเดิมประมาณ 1×1 เมตรหรือเล็กกว่า ปูหรือปิดทับพื้นเดิม เปลี่ยนอุปกรณ์สุขภัณฑ์ และทาสีผนัง

### Initial Items List (21 รายการ)
*ตั้งราคาประมาณการต่อหน่วย (estimatedUnitPrice) และราคาจริง (actualUnitPrice) เป็น 0 เพื่อรอผู้ใช้งานป้อนราคาจริง*

| Name | Quantity | Unit | Estimated Unit Price (THB) | Actual Unit Price (THB) | Category | purchaseStatus | deliveryStatus | notes |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| สายฝักบัว | 1 | pcs | 0 | 0 | อุปกรณ์น้ำดี | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| หัวฝักบัว | 1 | pcs | 0 | 0 | อุปกรณ์น้ำดี | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| อ่างล้างหน้า | 1 | pcs | 0 | 0 | สุขภัณฑ์ | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| ก๊อกอ่างล้างหน้า | 1 | pcs | 0 | 0 | อุปกรณ์น้ำดี | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| ท่อน้ำทิ้งอ่างล้างหน้า | 1 | pcs | 0 | 0 | อุปกรณ์น้ำเสีย | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| ซิลิโคนกันน้ำ | 2 | pcs | 0 | 0 | ยาแนวและประสาน | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| สีทาผนังห้องน้ำ | 1 | bucket | 0 | 0 | สีทับหน้าป้องกันเชื้อรา | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| สีรองพื้น | 1 | bucket | 0 | 0 | สีรองพื้นปูนเก่า | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| สีทาพื้น หรือวัสดุปิดทับพื้น | 1 | set | 0 | 0 | วัสดุปูพื้น | `NOT_BOUGHT` | `NOT_ORDERED` | - |
| กระเบื้องยางกันน้ำ หรือกระเบื้องสำหรับปูทับ | 1 | box | 0 | 0 | วัสดุปูพื้น | `NOT_BOUGHT` | `NOT_ORDERED` | พื้นที่ประมาณ 4 ตร.ม. |
| กาวหรือวัสดุติดตั้งพื้น | 1 | pcs | 0 | 0 | วัสดุปูพื้น | `NOT_BOUGHT` | `NOT_ORDERED` | เคมีภัณฑ์หน้างาน |
| ค้อน | 1 | pcs | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | สำหรับงานทุบ |
| สิ่ว | 1 | pcs | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | สำหรับสกัดปูน |
| แว่นตานิรภัย | 2 | pcs | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | อุปกรณ์เซฟตี้ |
| ถุงมือ | 4 | pair | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | ถุงมือผ้าเคลือบยาง |
| หน้ากากกันฝุ่น | 1 | box | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | ป้องกันฝุ่นละออง |
| ถุงใส่เศษปูน | 1 | pack | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | กระสอบสานหนา |
| แปรงทาสี | 2 | pcs | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | ขนาด 3 นิ้ว |
| ลูกกลิ้งทาสี | 2 | pcs | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | ขนาด 9 นิ้ว พร้อมถาด |
| กระดาษทราย | 1 | pack | 0 | 0 | เครื่องมือช่าง | `NOT_BOUGHT` | `NOT_ORDERED` | ขัดหน้าผนังปูนเดิม |
| น้ำยาทำความสะอาดพื้นเดิม | 1 | bottle | 0 | 0 | อุปกรณ์ความสะอาด | `NOT_BOUGHT` | `NOT_ORDERED` | ล้างคราบฝังแน่น |

### Initial Tasks List (20 งาน)
| Title | workType | riskLevel | status | notes / instructions |
| :--- | :--- | :--- | :--- | :--- |
| วัดขนาดห้องน้ำ | `DIY` | `LOW` | `NOT_STARTED` | วัดละเอียดกว้าง×ยาว×สูง เพื่อคำนวณปริมาณสีและกระเบื้อง |
| ถ่ายรูปสภาพเดิม | `DIY` | `LOW` | `NOT_STARTED` | ถ่ายรูปไว้เป็น reference ก่อนเริ่มงานและหลังทำ |
| ตรวจพื้นเดิมว่ามีหลุดร่อนหรือไม่ | `DIY` | `LOW` | `NOT_STARTED` | เคาะตรวจสอบความแน่นหนาของพื้นเดิมเพื่อประเมินหน้างาน |
| ตรวจความชื้นและน้ำรั่ว | `DIY` | `MEDIUM` | `NOT_STARTED` | ตรวจเช็กคราบซึมและรอยหยดน้ำตามข้อต่อ |
| เลือกวิธีทำพื้นใหม่ | `DIY` | `LOW` | `NOT_STARTED` | ตัดสินใจเลือกใช้สีทาพื้นปูนทับหน้าหรือวางระบบแผ่นพื้นกันน้ำ |
| เปรียบเทียบราคาวัสดุพื้น | `DIY` | `LOW` | `NOT_STARTED` | ค้นหาร้านออนไลน์เทียบกับห้างวัสดุเพื่อเซฟค่าใช้จ่าย |
| เตรียมอุปกรณ์ป้องกัน | `DIY` | `LOW` | `NOT_STARTED` | จัดเตรียมแว่นนิรภัย ถุงมือ และหน้ากากให้พร้อมก่อนเริ่มงานจริง |
| ทุบกำแพงบ่อน้ำเก็บน้ำเดิม | `DIY_WITH_HELPER` | `HIGH` | `NOT_STARTED` | ค่อยๆ ทุบโดยระวังระบบท่อน้ำดีที่อาจซ่อนอยู่ในกำแพงบ่อปูนเดิม |
| เก็บเศษปูน | `DIY_WITH_HELPER` | `MEDIUM` | `NOT_STARTED` | ขนเศษปูนใส่กระสอบเตรียมขนย้ายไปทิ้งตามกฎเทศบาล |
| ทำความสะอาดพื้นที่ | `DIY` | `LOW` | `NOT_STARTED` | กวาดและล้างหน้างานให้ปราศจากฝุ่นละอองก่อนการปูพื้นหรือทาสี |
| เตรียมพื้นเดิมก่อนปูหรือทา | `DIY` | `MEDIUM` | `NOT_STARTED` | อุดรอยแตกร้าวของปูน ขจัดคราบมัน และทิ้งให้พื้นผิวแห้งสนิท |
| ปูพื้นใหม่หรือทาสีพื้น | `DIY_WITH_HELPER` | `MEDIUM` | `NOT_STARTED` | ปฏิบัติตามคู่มือวัสดุอย่างเคร่งครัดเรื่องระยะเวลาเซ็ตตัว |
| เปลี่ยนสายฝักบัว | `DIY` | `LOW` | `NOT_STARTED` | พันเทปพันเกลียวรอบเกลือก่อนขันยึดเพื่อกันรั่วซึม |
| เปลี่ยนหัวฝักบัว | `DIY` | `LOW` | `NOT_STARTED` | ขันประกบกับสายฝักบัวใหม่ให้แน่นพอดีมือ |
| เปลี่ยนอ่างล้างหน้า | `SHOULD_HIRE` | `HIGH` | `NOT_STARTED` | งานเจาะยึดพุกผนังปูนน้ำหนักมาก ควรมีช่างช่วยประคองหรือยึดระดับ |
| เปลี่ยนก๊อกและท่อน้ำทิ้ง | `DIY` | `MEDIUM` | `NOT_STARTED` | จัดวางระดับก๊อกให้มั่นคงและสวมท่อระบายน้ำทิ้งดักกลิ่น |
| เตรียมผนังก่อนทาสี | `DIY` | `MEDIUM` | `NOT_STARTED` | ขัดกระดาษทรายลอกฟิล์มสีเดิมที่เป็นฝุ่นและหลุดล่อนออก |
| ทาสีผนังหรือเพดาน | `DIY` | `MEDIUM` | `NOT_STARTED` | ทาสีรองพื้นปูนเก่า 1 รอบ ทิ้งให้แห้ง ทาทับหน้าป้องกันรา 2 รอบ |
| ตรวจรอยรั่ว | `DIY` | `MEDIUM` | `NOT_STARTED` | ทดสอบเปิดวาล์วน้ำทุกจุดทิ้งไว้ 30 นาที สังเกตว่าไม่มีจุดซึมหยด |
| ตรวจความเรียบร้อยก่อนใช้งานจริง | `DIY` | `LOW` | `NOT_STARTED` | เช็ดทำความสะอาด ยาแนว และเก็บงานเก็บสีจุดบกพร่อง |

---

## 12. Safety and Risk Rules (ข้อกำหนดความปลอดภัย)
> [!WARNING]
> **การประเมินความปลอดภัยก่อนดำเนินงาน:**
> เพื่อความปลอดภัยในทรัพย์สินและร่างกาย ผู้ใช้งานควรตรวจสอบอย่างระมัดระวังก่อนเริ่มกระบวนการช่าง

### 12.1 มาตรการแจ้งเตือนความปลอดภัยสำหรับงานเฉพาะทาง
* **งานความเสี่ยงสูง (riskLevel: HIGH หรือ workType: MUST_HIRE):** งานไฟฟ้า (เช่น ติดเต้าเสียบใหม่, ตู้เบรกเกอร์), งานรื้อผนังรับน้ำหนัก, หรือท่อประปาหลัก
* **ข้อความเตือนความปลอดภัยในแอป (UX Safety Alert):** 
  หากตรวจพบงานที่มีเกณฑ์ความปลอดภัยสูง ระบบควรขึ้นข้อความเตือนที่แสดงโทนสุภาพและเป็นมิตรเพื่อเป็นมาตรการป้องกันแก่ผู้ใช้ เช่น:
  > “งานนี้มีความเสี่ยงสูง ควรตรวจสอบตำแหน่งท่อ สายไฟ หรือโครงสร้างเดิมก่อนเริ่ม และพิจารณาให้ช่างที่เหมาะสมช่วยประเมิน”

---

## 13. UX/UI Guidelines (แนวทางการออกแบบหน้าจอ)
* **Desktop Recommended Layout:**
  * Left sidebar: 280px (แสดงเมนูหลักและรายชื่อโครงการ)
  * Center workspace: ขั้นต่ำ 600px (พื้นที่แสดงข้อมูลตารางรายการซื้อของและ checklist)
  * Right Panel: 360px - 400px (แสดงข้อมูลเชิงประเมินทางการเงินเฉพาะจุด และข้อควรระวังความปลอดภัยเมื่อทำการคลิกเลือก Task)
* **Visual Representation:**
  * การแสดงผลสีในแอปควรใช้โทนสีที่สุภาพ ไม่ฉูดฉาดเกินไป ใช้สีบ่งบอกประเภทความเร่งด่วนและประเภทงานอย่างเรียบง่าย
  * แถบความคืบหน้า (Progress bar) ทำงานสัมพันธ์กับสถานะงานที่เปลี่ยนเป็น `DONE`

---

## 14. Acceptance Criteria (เกณฑ์การยอมรับของระบบ MVP)
เกณฑ์ทดสอบการยอมรับการทำงานพื้นฐานของระบบ (ไม่ครอบคลุมการลบข้อมูลจริงหรือ hard-delete เพื่อความปลอดภัยของข้อมูลในเวอร์ชันเริ่มต้น):
1. **การจัดการโครงการ:** สามารถเพิ่มและแก้ไข Project ได้อย่างถูกต้องครบถ้วน
2. **การจัดการวัสดุ:** สามารถเพิ่มและแก้ไข Item รวมถึงปรับเปลี่ยนสถานะการจัดซื้อ (`purchaseStatus`) และสถานะจัดส่ง (`deliveryStatus`) ได้จริง
3. **การจัดการงานปฏิบัติ:** สามารถเพิ่มและแก้ไข Task รวมถึงปรับเปลี่ยนสถานะงานปฏิบัติ (`status`) ได้
4. **ความถูกต้องทางการเงิน:** ระบบคำนวณและแสดงความแตกต่างระหว่างงบประมาณประมาณการ (`Project Estimated Budget`/`Project Forecast Total`) และค่าใช้จ่ายจริงที่เกิดขึ้นแล้ว (`Project Actual Spend`) ได้ถูกต้องเรียลไทม์
5. **การจัดการข้อมูลที่ไม่ใช้แล้ว:** สำหรับรายการที่ไม่ใช้แล้วในระบบ ให้เปลี่ยนสถานะเป็น `CANCELLED` หรือ `PAUSED` ก่อน เพื่อเป็นแนวทางปฏิบัติแทนการลบข้อมูลถาวร (Hard Delete) ในเฟส MVP

---

## 15. Optional Future Extensions (ฟีเจอร์เสริมในอนาคต)
* **Project Categories:** คัดแยกประเภทงานย่อย
* **Calendar & Timeline View:** บันทึกปฏิทินงานช่าง
* **Templates Library:** รูปแบบรายการงานมาตรฐานสำหรับผู้ใช้เริ่มใหม่
* **Data Export:** ระบบบันทึกหรือส่งออกข้อมูลออกเป็นไฟล์ภายนอก
* **Photo / Bill Attachments:** ถ่ายรูปใบเสร็จและภาพก่อน/หลังรีโนเวต

---

## 16. Next Implementation Step (แผนขั้นตอนถัดไป)
1. ผู้ใช้ทำการประเมินข้อกำหนด MVP Specification ฉบับแก้ไขรอบ Revision 1 นี้จนครบถ้วนและอนุมัติความต้องการหลัก
2. เตรียมกระบวนการสแตนด์อโลนแอปพลิเคชัน (Vite + React + LocalStorage) ในการสร้าง repository แยก
3. ยืนยันแนวทางการพัฒนาแบบ Standalone โดยแยกโค้ดเบสของแอปแต่งบ้านนี้ออกจากระบบหลักของ WorkOS-Lite อย่างชัดเจน
