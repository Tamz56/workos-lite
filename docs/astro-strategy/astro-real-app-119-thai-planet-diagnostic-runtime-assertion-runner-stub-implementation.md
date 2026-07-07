# ASTRO-REAL-APP-DEV-119 — Thai Planet Diagnostic Runtime Assertion Runner Stub Implementation

เอกสารรายละเอียดการพัฒนาตัววินิจฉัยและเช็กความสอดคล้องข้อมูลเชิงรันไทม์จำลอง (Runtime Assertion Runner Stub) ของดาวเคราะห์ไทย v0.1

---

## 1. Overview (ภาพรวมการพัฒนา)

ในรอบงาน **DEV-119** ได้ดำเนินงานอัปเกรดสคริปต์ตรวจความสอดคล้องตามสัญญาจากเดิมที่เป็นโครงร่างจำลอง ให้กลายเป็นตัวสแกนและทดสอบเชิงรันไทม์แบบทำงานจริง (Active Assertion Runner) ในระดับทดสอบท้องถิ่น (Local-only CLI Environment) โดยไม่กระทบต่อซอร์สโค้ดหลักของโปรเจกต์ `src/` แต่อย่างใด

---

## 2. Design Decisions & Implementation Details (รายละเอียดการพัฒนาเชิงเทคนิค)

### 2.1 สถาปัตยกรรม CommonJS (Option A)
ตามที่ได้รับอนุมัติเลือก Option A จากสเปกในรอบ DEV-118 ตัวรันเนอร์หลักยังคงพัฒนาอยู่ในรูปแบบ CommonJS (`.cjs`) ภายใต้ไฟล์เดิม:
[check-thai-planet-placement-contract.cjs](file:///Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs)
ใช้ Node.js Core APIs เช่น `fs` และ `path` ในการอ่านข้อมูล โดยไม่มีการเพิ่ม Dependencies ใน `package.json` หรือจำเป็นต้องทรานส์ไพล์ผ่านเครื่องมือภายนอก

### 2.2 โครงสร้างระบบสแกนและตรวจสอบทางเทคนิค (Assertion Engine)
สคริปต์ประกอบด้วยกระบวนการตรวจจับ 2 ชั้นหลัก:

1. **การตรวจสอบเชิงสถิต (Static Code Analysis & Guards)**:
   * ทำการเปิดและสแกนอ่านไฟล์อแดปเตอร์และไฟล์จำลองความปลอดภัย:
     * [astroRealAppThaiPlanetPlacementAdapter.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts)
     * [astroRealAppThaiPlanetPlacementSafety.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts)
   * ตรวจจับฟังก์ชันการทำงาน และเช็กการไม่มีอยู่ของคำสั่ง `localStorage`
   * ตรวจจับความกักแยกขอบเขตข้อมูล โดยต้องไม่มีคำสั่งเรียกหรืออิมพอร์ตระบบวางแผนกลยุทธ์หลัก `buildNatalTransitStrategyComposerOutput` หรือดึงอแดปเตอร์รันไทม์ไปฝังใน UI `AstroRealAppPreview.tsx` โดยไม่ได้รับอนุญาต
   * สแกนข้อห้ามการอ้างอิงคำดวงดาวจริง หรือการเคลมความเที่ยงตรงด้วยคำค้นเฉพาะ (เช่น `accurate placement`, `real chart`, `ดาวอยู่ราศี`, `ผลดวงจริง`, `ใช้ทำนาย`, `validated placement`)

2. **การทดสอบความถูกต้องระดับสัญญา (Runtime Contract Assertions)**:
   * ทำการเช็กโครงร่างคีย์และประเภทของออบเจกต์ผลลัพธ์การสืบทอดสัญญาจากอแดปเตอร์ โดยตรวจทานผลจำลอง `results` อาร์เรย์ขนาด 10 จุด
   * ตรวจสอบว่า `planetId` ครอบคลุมเฉพาะดวงดาวจำลอง 0-9
   * บังคับให้ค่าตำแหน่งราศีและองศาเป็นเพียงตัวจำลองความปลอดภัย (`pending-reference-validation` หรือ `unavailable`)
   * ยืนยันว่าค่าประเมินความปลอดภัย `safetySummary` คืนค่าเปรียบเทียบในกรณีทดสอบดวงดาวทั่วไปเป็น `comparableCount = 0` และ `notComparableCount = 10`
   * ตรวจวัดประทับเวลาสถิติ `generatedAt` ว่าเป็นค่า ISO String ที่ถูกต้อง

### 2.3 failure Policy (นโยบายเมื่อเกิดความล้มเหลว)
หากมีขั้นตอนการตรวจสอบใดตรวจพบความผิดพลาด ระบบจะรวบรวมข้อผิดพลาดทั้งหมดและรายงานลงเทอร์มินัลด้วยโครงสร้าง:
```text
Status: Failed
Failures:
* [check-name] Expected: ... Observed: ... Risk: ...
```
และสั่งหยุดประมวลผล build ทันทีด้วย `process.exit(1)` เพื่อป้องกันการไหลผ่านแบบเงียบ (Silent Passes)
