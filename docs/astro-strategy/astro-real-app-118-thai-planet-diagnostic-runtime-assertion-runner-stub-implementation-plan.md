# ASTRO-REAL-APP-DEV-118 — Thai Planet Diagnostic Runtime Assertion Runner Stub Implementation Plan

เอกสารวางแผนจัดทำระบบตรวจสอบความปลอดภัยเชิงรันไทม์ระดับควบคุมสัญญาการทำงาน (Runtime Assertion Runner Stub Implementation Plan) สำหรับปฏิทินดาวไทยจำลอง v0.1

---

## 1. Purpose (วัตถุประสงค์)

วัตถุประสงค์ของงานรอบ **DEV-118** คือการออกแบบและวางแผนอย่างละเอียดสำหรับการอัปเกรดสคริปต์ตรวจสอบความสอดคล้องระดับสัญญาประเภทข้อมูลและตัวแปรแบบอินเมมโมรี (Runtime Assertion Runner) จากสคริปต์ตรวจสอบแบบกึ่งจำลองพฤติกรรม (Script Stub) ในรอบก่อนหน้า ให้กลายเป็นตัวรันเนอร์ที่เข้มงวดและมีความสามารถในการสแกนตรวจสอบสัญญาข้อมูล (Technical Contracts) คลาสโครงสร้างประเภท และการจัดวางส่วนแสดงผลจำลองเชิงเทคนิคอย่างเป็นระบบ 

เพื่อเตรียมความพร้อมสำหรับตั๋วพัฒนา **DEV-119** โดยที่การวางแผนรอบนี้จะยึดหลักความปลอดภัย ไม่สร้างหรือแก้ไขลอจิกการคำนวณตำแหน่งดวงชะตาโหราศาสตร์จริง ไม่ปะปนข้อมูล หรือเรียกใช้ LocalStorage และระบบประมวลผลกลยุทธ์หลักใดๆ ทั้งสิ้น

---

## 2. Scope & Non-goals (ขอบเขตและข้อยกเว้นการทำงาน)

### ขอบเขตการวางแผน (In Scope)
* **การจัดวางเอกสารแผนงานเท่านั้น (Documentation-only)**: ดำเนินงานเฉพาะการวิเคราะห์ สถาปัตยกรรม และวางโครงสร้างเพื่อเตรียมอัปเกรดระบบตรวจสอบในเฟสถัดไป
* **การประเมินทางเลือกสถาปัตยกรรม (Implementation Strategy Comparison)**: วิเคราะห์แนวทางการอัปเกรดสคริปต์รันเนอร์ของ Node.js (CommonJS, TS/tsx, หรือการสร้างสคริปต์ใหม่)
* **การระบุหัวข้อตรวจสอบ (Assertion Categories)**: กำหนดกลุ่มกฎทดสอบสัญญาเชิงรันไทม์อย่างครอบคลุมตั้งแต่ความสอดคล้องประเภทดาวเคราะห์ (Planet ID) ไปจนถึงป้ายแจ้งเตือนภาษาไทย (Copy Safety Labels)
* **การนิยามนโยบาย Fixture และความล้มเหลว (Fixture & Failure Policy)**: ล็อกเงื่อนไขการห้ามหลุดรอดของข้อมูลทดสอบหรือความล้มเหลวที่ปล่อยผ่าน (Silent Passes)

### ข้อยกเว้นการทำงาน (Non-goals)
* **ห้ามแก้ไขโค้ดซอร์สหลัก**: จะไม่มีการแก้ไขหรือสร้างไฟล์ใดๆ ภายใต้ไดเรกทอรี `src/` หรือปรับปรุง UI ในคอมโพเนนต์ใดๆ
* **ห้ามแก้ไขสคริปต์จริงในรอบนี้**: จะไม่มีการเขียนโค้ดเพิ่มเติมหรือเปลี่ยนแปลงคำสั่งในไดเรกทอรี `scripts/` ในรอบ DEV-118
* **ห้ามคำนวณตำแหน่งองศาดาวจริง**: ไม่เขียนสูตรทางโหราศาสตร์ดาราศาสตร์ ไม่ใช้ Ephemeris จริง หรือดึงข้อมูลจากภายนอก
* **ห้ามเชื่อมต่อ LocalStorage หรือ Composer**: จะไม่มีการดึงข้อมูลจาก local database ของผู้ใช้ และไม่ทำลอจิกวิเคราะห์ทับซ้อนระบบแนะนำกลยุทธ์
* **ห้ามเพิ่ม dependencies ใน package.json**: รักษาขนาดโครงการดั้งเดิมโดยไม่มีการนำเข้า npm packages ใหม่

---

## 3. Current Script Baseline (การประเมินสคริปต์ในปัจจุบัน)

สคริปต์จำลองการวินิจฉัยดวงดาวในปัจจุบันคือ [check-thai-planet-placement-contract.cjs](file:///Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs) ซึ่งทำหน้าที่ประเมินความสอดคล้องของโครงสร้างสถาปัตยกรรมผ่านคำสั่ง Node.js โดยมีผลการทดสอบหลักที่ประเมินผ่านข้อความพิมพ์ดังนี้:

* **Planet ID coverage**: ตรวจสอบโครงร่างว่าครอบคลุมป้ายจำลองของดาวเคราะห์ทั้ง 10 ดวง (รหัส 0-9) โดยยังไม่รันโมดูลอินเตอร์เฟสหลัก
* **Placeholder non-validation**: ยืนยันว่าค่าราศีและองศาที่สุ่มหรือระบุใน Fixtures ใช้สตริงจำลองความปลอดภัย `'pending-reference-validation'`
* **Comparable count guard**: การนับสัดส่วนการสอบเทียบดวงดาวในระบบทดสอบต้องส่งกลับค่าเป็น `0`
* **Not-comparable guard**: ยืนยันว่าตำแหน่งดวงดาวที่ยกเว้นการเปรียบเทียบในระบบต้องครบถ้วนทั้ง `10` ดวง
* **Adapter status guard**: ยืนยันว่าค่าสัญลักษณ์สถานะการทำงานของอแดปเตอร์ที่ตรวจสอบได้คือ `'stub-only'` หรือคืนสถานะในส่วนวินิจฉัยเป็น `'diagnostic'`
* **Metadata-only generatedAt**: ตรวจวัดว่าตัวแปรเวลาเป็นเพียง metadata และไม่มีการเรียกแปลงค่าปฏิทินย้อนหลัง
* **UI isolation**: สแกนไฟล์การวิเคราะห์หลัก `AstroRealAppPreview.tsx` เพื่อตรวจสอบว่าไม่มีการเรียกใช้อแดปเตอร์รันไทม์จริง (`buildThaiPlanetPlacementRuntimeAdapterV01`) โดยพลการ
* **LocalStorage isolation**: ตรวจสอบการไม่มีโค้ดเขียนหรือประมวลผล Storage ภายในอแดปเตอร์จำลอง

---

## 4. Target Future Behavior (พฤติกรรมเป้าหมายที่คาดหวังในรันเนอร์ใหม่)

ในสคริปต์รันเนอร์ที่จะปรับปรุงในเฟสถัดไป (เช่น DEV-119) ตัวรันเนอร์จะต้องทลายข้อจำกัดการรายงานแบบ "Script Stub" (ที่ระบุเพียงสถานะ *Non-executing import pending*) ไปเป็นการดึงหรือจำลองพฤติกรรมอินเมมโมรีผ่านออบเจกต์จริง โดยประมวลผลผ่านเมทอดจริงและส่งผลการตรวจสอบเป็นประเภท **Passed / Failed** ที่จับต้องได้จริง รวมถึงเงื่อนไขการหยุดการคอมไพล์ (Build Stop) ทันทีหากตรวจพบความเสี่ยงหรือประเภทข้อมูลไม่สอดคล้องตามรูปสัญญา

---

## 5. Proposed Implementation Strategy (แนวทางการจัดสร้างระบบรันเนอร์)

ทีมพัฒนาได้ทำการวิเคราะห์และเปรียบเทียบแนวทางจัดทำระบบตรวจสอบความปลอดภัยเชิงรันไทม์ไว้ 3 รูปแบบ ดังนี้:

### Option A — การเสริมขีดความสามารถบนไฟล์ CommonJS (CJS) เดิม (Recommended)
* **การดำเนินการ**: ปรับปรุงและแก้ไขไฟล์ [check-thai-planet-placement-contract.cjs](file:///Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs) ให้ดึงออบเจกต์ Fixture และจำลองพารามิเตอร์แบบ in-memory มาทำการ Loop เปรียบเทียบค่าความถูกต้องของ API สัญญาโดยตรง
* **ข้อดี**: มีความเสี่ยงต่ำสุด ไม่มีปัญหากับสปิริตการบิวด์ของเครื่องคอมไพเลอร์หลัก ไม่ส่งผลกระทบต่อ `package.json` และรันได้โดยตรงผ่านคำสั่ง `node` พื้นฐาน
* **ข้อจำกัด**: ไม่สามารถเชื่อมต่อกับ TypeScript Types เชิงรันไทม์ได้โดยตรง (แต่ทดแทนได้ด้วยการทำโครงร่างสแกนฟิลด์คีย์เชิงคุณภาพและเขียนโครงสร้าง Mocked Interface)

### Option B — การจัดตั้งไฟล์รันเนอร์ใหม่แยกต่างหาก (New Runner File)
* **การดำเนินการ**: สร้างสคริปต์ใหม่เช่น `check-thai-planet-placement-assertion.cjs` และคงสภาพไฟล์สคริปต์เดิมไว้เป็นประวัติการทดสอบ
* **ข้อดี**: รักษาประวัติการสร้างไฟล์ดั้งเดิม ปราศจากความเสี่ยงของการขัดกันทางฟังก์ชันเดิม
* **ข้อจำกัด**: เพิ่มจำนวนไฟล์และเพิ่มความบวมในการดูแลรักษาสคริปต์ทดสอบโดยไม่มีความจำเป็น

### Option C — การย้ายไปใช้ TypeScript / tsx Runner
* **การดำเนินการ**: แปลงไฟล์สคริปต์ตรวจสอบให้เป็นไฟล์ `.ts` และเรียกใช้ผ่าน `npx tsx` เพื่อให้ตรวจสอบประเภทข้อมูล (Types) ร่วมกับไฟล์หลักในโปรเจกต์
* **ข้อดี**: ได้การตรวจสอบระดับ Static Type-safety ที่แท้จริงร่วมกับตัวแปรจากไฟล์ `astroRealAppTypes.ts`
* **ข้อจำกัด**: มีความเสี่ยงเรื่องสถาปัตยกรรมเครื่องมือที่ไม่ได้มาตรฐาน และอาจทำให้กระบวนการตรวจสอบ CI ล้มเหลวหากเครื่องปลายทางไม่มี `tsx` ในการเรียกใช้งานโลคอล อีกทั้งอาจมีประเด็นเรื่อง CommonJS กับ ESM Module Contamination

> [!IMPORTANT]
> **ข้อเสนอแนะ**: แนะนำให้เลือก **Option A** (ปรับปรุงโค้ดตรวจสอบบนโครงไฟล์เดิมของ CJS ให้มีความลึกซึ้งและตรวจเช็กโครงสร้างผลลัพธ์ของ Adapter อย่างเข้มงวด) เพื่อรักษาความเป็นระบบระเบียบ ปลอดภัยสูงสุด และตรงกับนโยบาย Anti-Bloat / No speculative architecture ของโครงการ

---

## 6. Proposed Assertion Categories (ประเภทข้อตกลงตรวจสอบรันไทม์)

ในอนาคต สคริปต์ทดสอบรันเนอร์จะทำการตรวจสอบข้อมูลจำลองเชิงรันไทม์แยกตามหมวดหมู่ (Assertion Categories) ดังต่อไปนี้:

1. **Planet ID coverage assertion**: ตรวจเช็กว่ารายการผลลัพธ์มีรหัส `planetId` ครบถ้วนตั้งแต่ `0` ถึง `9` และห้ามมีค่าอื่นแปลกปลอม
2. **Runtime result count assertion**: บังคับให้โครงสร้างชุดผลลัพธ์ `results` ต้องมีขนาดอาร์เรย์เท่ากับ `10` เสมอ
3. **Placeholder-only signRasi assertion**: ฟิลด์ `signRasi` ของดวงดาวจำลองทุกดวงต้องมีค่าเท่ากับ `'pending-reference-validation'` หรือ `'unavailable'` เท่านั้น ห้ามเป็นชื่อราศีจริงในภาษาไทยหรืออังกฤษ
4. **Placeholder-only degree assertion**: ฟิลด์ `degree` ของดวงดาวต้องเป็นค่า `'pending-reference-validation'` หรือ `'unavailable'` เท่านั้น ห้ามมีตัวเลขที่สะท้อนองศาดาวเคราะห์จริง
5. **Special status unavailable/pending assertion**: ยืนยันว่าค่า `specialStatus` มีสถานะปลอดภัยที่แสดงว่าข้อมูลยังไม่พร้อมคำนวณ
6. **Adapter status stub-only assertion**: ฟิลด์ `adapterStatus` ของอะแดปเตอร์รันไทม์ต้องยืนยันตัวตนสถานะเป็น `'stub-only'`
7. **Confidence pending assertion**: ค่าความเชื่อมั่นระดับดาวเคราะห์ `confidence` ต้องมีค่าเท่ากับ `'pending'` เท่านั้น
8. **Validation status not-validated assertion**: สถานะตรวจสอบ `validationStatus` ต้องระบุเป็น `'not-validated'` เสมอ
9. **Comparable count equals 0 assertion**: ในผลลัพธ์ความปลอดภัย (`safetySummary`) ค่า `comparableCount` ต้องเป็น `0` เมื่อป้อนข้อมูล Fixture จำลอง
10. **Not-comparable count equals 10 assertion**: ในผลลัพธ์ความปลอดภัย `notComparableCount` ต้องมีค่าเป็น `10`
11. **Pending count equals 10 assertion**: ค่าสรุปการนับจุดดาวจำลองใน `pendingCount` ต้องเป็น `10`
12. **generatedAt exists and valid ISO string assertion**: ประทับเวลา `generatedAt` ต้องแสดงรูปแบบสากล (ISO) และต้องทำหน้าที่เพียงเก็บข้อมูล metadata สถิติเท่านั้น
13. **Astrology Values Static Guard**: สแกนและตรวจจับข้อห้ามห้ามใช้ข้อมูลองศาจริง หรือชื่อราศีจริง เช่น เมษ, พฤษภ, เมถุน, กรกฎ, สิงห์, กันย์, ตุลย์, พิจิก, ธนู, มกร, กุมภ์, มีน หรือองศาที่เจาะจง
14. **LocalStorage API Static Guard**: ตรวจเช็กว่าภายในโค้ดอแดปเตอร์ไม่มีคำสั่งเรียกใช้งาน `localStorage`
15. **Strategy Engine Contamination Guard**: เช็กโค้ดว่าไม่มีการอิมพอร์ตหรือใช้ฟังก์ชัน `buildNatalTransitStrategyComposerOutput` หรือการ Wiring ข้อมูลสตับเข้าไปที่ระบบ Composer โดยตรง
16. **Copy Safety Phrase Guard**: ตรวจสอบการพิมพ์หรืออ้างอิงคำอธิบายภาษาเพื่อยืนยันข้อตกลงว่านี่คือผลการวินิจฉัยเชิงทดลองเท่านั้น

---

## 7. Fixture Policy (นโยบายชุดข้อมูลทดสอบ)

การรันระบบตรวจสอบจะดึงหรือจำลองพารามิเตอร์ผ่านฟิกซ์เจอร์ในหน่วยความจำ (In-memory Placeholder Fixtures) เท่านั้น:

* **ค่าที่อนุญาตให้ใช้ในการอ้างอิงนำเข้า**:
  * `pending-reference-validation`
  * `unavailable`
  * `stub-only`
  * `pending`
  * `not-validated`
  * `not-comparable`
* **ข้อมูลต้องห้าม (Strict Prohibitions)**:
  * ห้ามใช้วันเดือนปีเกิดจริงและเวลาเกิดจริงที่เป็นลักษณะดวงทดสอบที่มีความเคลื่อนไหวทางดวงดาวจริง
  * ห้ามป้อนพิกัดละติจูด/ลองจิจูดของสถานที่จริงเพื่อการทดสอบ
  * ห้ามใส่ค่าคาดหวังของดวงดาวเป็นชื่อราศีจริงหรือองศาจริง

---

## 8. Failure Policy (นโยบายความล้มเหลว)

เพื่อให้ตัวตรวจสอบเป็นผู้รักษาความปลอดภัยระบบที่เข้มงวดและไม่ยอมให้ข้อผิดพลาดหลุดผ่าน (Non-silent failure):

* **กระบวนการรายงานความล้มเหลว**: หากการตรวจสอบ Assertion ข้อใดข้อหนึ่งล้มเหลว สคริปต์รันเนอร์ต้องทำการพิมพ์ป้ายรายงาน `Status: Failed` พร้อมระบุรายละเอียดคีย์และสาเหตุเชิงวิเคราะห์ความเสี่ยง
* **คำสั่งหยุดทำงานด้วย Non-zero Exit**: บังคับให้รันคำสั่ง `process.exit(1)` เพื่อแจ้งให้ CLI หรือทูลการจัดการ Build ทราบว่าตัวตรวจสอบไม่ผ่านเกณฑ์ ห้ามพิมพ์ `Passed` หรือสลัดฟิลด์ทิ้งโดยเด็ดขาด

---

## 9. Terminal Output Format (รูปแบบการพิมพ์รายงานบนเทอร์มินัล)

ในอนาคต สคริปต์ที่อัปเกรดแล้วจะให้รายงานดังต่อไปนี้:

### กรณีการทดสอบผ่านทั้งหมด (Passed)
```text
============================================================
THAI PLANET DIAGNOSTIC RUNTIME CONTRACT RUNNER REPORT
============================================================
Status: Passed

Checks:
* Planet ID coverage: Passed
* Placeholder-only signRasi: Passed
* Placeholder-only degree: Passed
* Adapter status stub-only: Passed
* Safety summary comparable count: Passed
* Safety summary not-comparable count: Passed
* generatedAt metadata-only: Passed
* LocalStorage isolation: Passed
* Strategy isolation: Passed
* Copy safety labels check: Passed
============================================================
```

### กรณีการทดสอบไม่ผ่าน (Failed)
```text
============================================================
THAI PLANET DIAGNOSTIC RUNTIME CONTRACT RUNNER REPORT
============================================================
Status: Failed

Failures:
* [Placeholder-only signRasi] Expected: "pending-reference-validation", Observed: "aries"
  Risk: Real astrology sign leaked into runtime stub.
* [LocalStorage isolation] Expected: No localStorage calls, Observed: "localStorage.setItem"
  Risk: Side-effect detected in mock adapter.

Remediation:
Please revert calculations to stub placeholders in astroRealAppThaiPlanetPlacementAdapter.ts.
============================================================
```

---

## 10. Static Guard Policy (นโยบายความปลอดภัยทาง static code)

รันเนอร์จะไม่รันเบราว์เซอร์จริง แต่จะใช้วิธีการวิเคราะห์ Static Source (สแกนแบบ Regex หรือ indexOf) ในไฟล์ซอร์สเป้าหมาย เพื่อเฝ้าระวังคำค้นต้องห้ามเหล่านี้:

* `localStorage`
* `buildNatalTransitStrategyComposerOutput`
* `AstroTodayPanel` wiring
* คำหรือข้อความบ่งชี้ความเที่ยงตรงของดวงจริงในไฟล์รหัสหรือการออกคำทำนายจำลอง เช่น `accurate placement`, `real chart`, `ดาวอยู่ราศี`, `ผลดวงจริง`, `ใช้ทำนาย`, `validated placement`

---

## 11. Dependency Policy (นโยบายแพ็คเกจเสริมนอกระบบ)

* ยึดนโยบาย **No new dependency** อย่างเข้มงวด
* ไม่นำเอาโมดูลทดสอบภายนอก เช่น Jest, Mocha, Chai, Vitest หรือซอฟต์แวร์วิเคราะห์บิวด์อื่นเข้ามาในสโคปนี้
* ตัวรันเนอร์หลักจะขับเคลื่อนด้วยคำสั่ง Node.js ดั้งเดิมและฟังก์ชันของไฟล์ระบบคอมมอนเจเอสเท่านั้น

---

## 12. Risk Review (การประเมินปัจจัยเสี่ยง)

| ปัจจัยเสี่ยงเชิงระบบ | ระดับความเสี่ยง | แนวทางกักกันและบรรเทาผลกระทบ |
|---|---|---|
| **False Confidence Risk** | ปานกลาง | เขียนระบุให้ชัดเจนในผลลัพธ์ว่า "นี่คือตัววัดความสอดคล้องทางเทคนิคจำลองเพื่อวินิจฉัย ไม่ใช่ระบบการรับรองความถูกต้องของการทำนายดวงจริง" |
| **Astrology Oracle Leak** | สูง | ยึดนโยบายห้ามใช้ดวงคนเกิดจริงหรือค่าองศาจริงในฟิกซ์เจอร์โดยเด็ดขาด |
| **Dependency Creep** | ต่ำ | ไม่อนุญาตให้แก้ไขไฟล์ `package.json` หรืออ้างอิงสคริปต์ที่ดาวน์โหลดจากแหล่งภายนอก |
| **Static Guard False Positives** | ต่ำ | หากระบบประเมินคำค้นและพบคำที่ใกล้เคียงแต่ปลอดภัย (เช่น คำอธิบายความปลอดภัยเชิงจริยธรรม) สคริปต์จะไม่ขัดขวางการบิวด์หากได้รับการประกาศขอยกเว้นอย่างถูกต้อง |

---

## 13. Recommended Implementation Ticket (ข้อแนะนำในการทำงานถัดไป)

แนะนำแผนงานตั๋วถัดไปคือ:
* **รหัสงาน**: **ASTRO-REAL-APP-DEV-119 — Thai Planet Diagnostic Runtime Assertion Runner Stub Implementation**
* **เป้าหมาย**: ลงมือเขียนโค้ดอัปเกรดตัวตรวจวัดรันไทม์ภายในไฟล์ [check-thai-planet-placement-contract.cjs](file:///Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs) ให้ครอบคลุมทุก Assertion categories ที่นิยามไว้ตามแผนงานนี้ โดยไม่ปรับเปลี่ยนโครงร่างโฟลเดอร์หลักหรือแก้ไขไฟล์ต้นฉบับใน `src/` ของระบบปฏิทินดาวไทยจำลอง v0.1
