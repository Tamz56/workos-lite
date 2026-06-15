# ASTRO-REAL-APP-DEV-097 — Thai Planet Placement Reference Case Matrix

เอกสารโครงสร้างตารางเปรียบเทียบกรณีศึกษาตำแหน่งดวงดาวไทย (Thai Planet Placement Reference Case Matrix) สำหรับจัดตั้งข้อมูลควบคุมและเกณฑ์สำหรับทดสอบระบบประมาณตำแหน่งดาวเคราะห์ไทย 10 ตำแหน่ง (0 ถึง 9) เพื่อรองรับการนำไปใช้พัฒนาเป็นแบบแผนสำหรับตัวแปลงข้อมูลรันไทม์ (DEV-098) โดยในเวอร์ชันนี้ข้อมูลทั้งหมดยังคงเป็นข้อมูลจำลองและใช้ค่าทดสอบทดแทนเพื่อความเสถียรเชิงระบบ

---

## 1. Purpose (วัตถุประสงค์)

เอกสารฉบับนี้ทำหน้าที่กำหนดโครงร่างและสร้างตัวอย่างตารางเปรียบเทียบกรณีศึกษา (Reference Case Matrix) เพื่อเตรียมพร้อมสำหรับกระบวนการตรวจสอบความสอดคล้องของลอจิกการประมาณตำแหน่งดวงดาวของปฏิทินไทยในขั้นตอนการพัฒนา Adapter ในอนาคต
* **บทบาทเอกสาร**:
  - เป็นเอกสารเชิงสถาปัตยกรรมและการวิจัยเปรียบเทียบ (Documentation-only)
  - ยังไม่ใช่โปรแกรมประมวลผลระบบรันไทม์ (Runtime Implementation)
  - ยังไม่ระบุ หรือสรุปราศีสถิตลองจิจูดของดาวเคราะห์ที่แท้จริง

---

## 2. Scope (ขอบเขตการดำเนินงาน)

* **สิ่งที่ครอบคลุมในเอกสาร**:
  - โครงสร้างตารางรายชื่อและบทบาทดวงดาว 10 ตำแหน่ง (Planet IDs 0 ถึง 9)
  - รูปแบบการบันทึกข้อมูลกำเนิดนำเข้าสำหรับการประมาณตำแหน่งดาวในอนาคต (Birth Profile Input Matrix)
  - รูปแบบข้อมูลสำหรับระบุผลลัพธ์ราศีและองศาคาดการณ์โดยประมาณ (Planet Placement Expected Output Matrix)
  - เกณฑ์ข้อตกลงและกฎเกณฑ์การประเมินความสอดคล้องก่อนนำไปใช้งานจริง (Validation Rules)
  - บันทึกความเสี่ยงเชิงลอจิกและความเหลื่อมล้ำทางปฏิทินดาราศาสตร์ (Risk Notes)
  - ข้อตกลงการประสานงานและข้อกำหนดการส่งต่อเพื่อพัฒนาโมดูล Adapter (Readiness path toward DEV-098)
* **สิ่งที่ไม่ครอบคลุมในเอกสาร (Non-Scope)**:
  - การแก้ไขโค้ดโปรแกรมต้นทางหรือไฟล์ระบบภายในไดเรกทอรี `src/` ทั้งปวง
  - การปรับแก้หรือเพิ่มโครงสร้างคุณสมบัติฐานข้อมูลระบบจัดเก็บข้อมูล (LocalStorage Behavior)
  - การระบุ หรือตัดสินความถูกต้องของตำแหน่งดาวที่แท้จริงระดับองศาหรือราศีสถิต
  - การคัดลอก คัดลอกแบบ scrape หรือนำเข้าเนื้อหาข้อมูลความรู้โหราศาสตร์ขนาดยาวจากภายนอก

---

## 3. Planet ID Coverage (ขอบเขตและบทบาทดาวเคราะห์)

การอ้างอิงรหัสดาวเคราะห์ 10 ตำแหน่ง (Planet IDs 0 ถึง 9) เป็นไปตามข้อตกลงที่เคยกำหนดไว้ในเอกสารสเปกแกนประมวลผลดวงดาว [astro-real-app-093-thai-planet-placement-approximation-plan.md](file:///Users/tamz/projects/workos-lite/docs/astro-strategy/astro-real-app-093-thai-planet-placement-approximation-plan.md) ซึ่งอ้างอิงโครงสร้างดวงดาวตามคัมภีร์โหราศาสตร์ไทย โดยกำหนดบทบาทจำลองและการใช้ค่าทดสอบทดแทนเพื่อรอการประเมินผลในอนาคตดังนี้:

| Planet ID (รหัสดาว) | Thai Label (ป้ายกำกับไทย) | Reference Role (บทบาทอ้างอิงเชิงระบบ) | Expected Placement Status (สถานะการสอบเทียบ) | Notes (หมายเหตุ) |
|---|---|---|---|---|
| 0 | pending-reference-validation | Sun / Surya-equivalent reference slot | pending-reference-validation | Placeholder only |
| 1 | pending-reference-validation | Moon / Chandra-equivalent reference slot | pending-reference-validation | Placeholder only |
| 2 | pending-reference-validation | Mars-equivalent reference slot | pending-reference-validation | Placeholder only |
| 3 | pending-reference-validation | Mercury-equivalent reference slot | pending-reference-validation | Placeholder only |
| 4 | pending-reference-validation | Jupiter-equivalent reference slot | pending-reference-validation | Placeholder only |
| 5 | pending-reference-validation | Venus-equivalent reference slot | pending-reference-validation | Placeholder only |
| 6 | pending-reference-validation | Saturn-equivalent reference slot | pending-reference-validation | Placeholder only |
| 7 | pending-reference-validation | Rahu-equivalent reference slot | pending-reference-validation | Placeholder only |
| 8 | pending-reference-validation | Ketu / Uranus / Thai-system-dependent reference slot | pending-reference-validation | Must be validated before runtime use |
| 9 | pending-reference-validation | Thai-system-dependent reference slot | pending-reference-validation | Must be validated before runtime use |

*หมายเหตุการอ้างอิง: บทบาทของรหัส 8 และ 9 ถูกกักตำแหน่งไว้ตามความสัมพันธ์เชิงโหราศาสตร์ไทย โดยจะยังไม่มีการเชื่อมโยงระบบการคำนวณลองจิจูดจริงจนกว่าจะผ่านการประเมินความพร้อมในใบงานระดับถัดไป*

---

## 4. Reference Case Input Matrix (ตารางข้อมูลเกิดกรณีศึกษาควบคุม)

แม่แบบข้อมูลนำเข้าสำหรับเก็บบันทึกประวัติและข้อมูลกำเนิดเพื่อใช้ทำการทดสอบเปรียบเทียบในอนาคต โดยกำหนดข้อมูลตัวแปรหลักจำลองดังตารางด้านล่าง:

| Case ID (รหัสกรณี) | Birth Date (วันเกิด) | Birth Time (เวลาเกิด) | Birth Location (สถานที่เกิด) | Timezone (เขตเวลา) | Calendar System (ระบบปฏิทินที่ระบุ) | Source Type (แหล่งอ้างอิงหลัก) | Reference Confidence (ความเชื่อมั่นอ้างอิง) | Validation Status (สถานะการตรวจสอบ) | Notes (หมายเหตุ) |
|---|---|---|---|---|---|---|---|---|---|
| TH-REF-001 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | Placeholder case only |
| TH-REF-002 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | Placeholder case only |
| TH-REF-003 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | Placeholder case only |

---

## 5. Planet Placement Expected Output Matrix (ตารางผลลัพธ์คาดการณ์ดาวเคราะห์)

โครงร่างตารางผลลัพธ์เชิงดาราศาสตร์คาดการณ์ของดาวเคราะห์ ๐ ถึง ๙ สำหรับใช้เปรียบเทียบความถูกต้องของโมดูลประมาณค่ารันไทม์ โดยใช้ค่าทดสอบทดแทน `pending-reference-validation` ทั้งหมด:

| Case ID | Planet ID | Expected Sign/Rasi (ราศีคาดหวัง) | Expected Degree (องศาคาดหวัง) | Expected Segment (ส่วนอ้างอิงนพเคราะห์/ฤกษ์) | Expected Special Status (สถานะวิปริตโคจร) | Validation Source Note (หมายเหตุแหล่งที่มา) | Runtime Comparison Status (สถานะเปรียบเทียบ) |
|---|---:|---|---|---|---|---|---|
| TH-REF-001 | 0 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 1 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 2 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 3 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 4 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 5 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 6 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 7 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 8 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |
| TH-REF-001 | 9 | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation | pending-reference-validation |

---

## 6. Validation Rules (กฎเกณฑ์การประเมินความสอดคล้อง)

เพื่อความมั่นคงและปลอดภัยของลอจิกการประมาณค่า จำเป็นต้องปฏิบัติตามเกณฑ์ควบคุมต่อไปนี้:
* **ความถูกต้องก่อนนำเข้าระบบ**: ข้อมูลในตารางสอบเทียบ (Reference Case) จะยังไม่ถือว่ามีความพร้อมใช้งานจนกว่าจะผ่านการตรวจสอบเทียบเคียงกับระบบอ้างอิงปฏิทินโหราศาสตร์ไทยที่ตกลงกันไว้
* **การจำกัดการใช้ข้อมูล Placeholder**: ห้ามเขียนโค้ดรันไทม์ใดๆ ที่พยายามนำค่าทดแทน `pending-reference-validation` ไปใช้ประมวลผลเป็นชุดทดสอบหรือประเมินค่าความสำเร็จเชิงโปรแกรม
* **การรักษามาตรฐานลิขสิทธิ์และการควบคุมข้อมูล**: ห้ามใช้การ Scrape ข้อมูลหรือคัดลอกข้อความเป็นสัดส่วนขนาดยาวจากเอกสารและตำราภายนอก หากมีกรณีที่ระบบคำนวณทางโหราศาสตร์ไทยสองระบบมีความคลาดเคลื่อนเชิงตำแหน่ง ให้ระบุชื่อระบบแยกตารางเพื่อไม่ให้ปะปนกัน
* **การปกป้องภาษาและถ้อยคำ**: การแปลผลลัพธ์ตำแหน่งดาวจะต้องรักษาเกณฑ์ความปลอดภัยของถ้อยคำอย่างเคร่งครัด โดยหลีกเลี่ยงการใช้คำทำนายลักษณะตัดสินแง่ลบ (เช่น deterministic negative wording, fear-based prediction terms หรือ hard-fate language)

---

## 7. Risk Notes (บันทึกระดับความเสี่ยง)

* **ความเบี่ยงเบนของรหัสประจำดาว (Planet ID Ambiguity)**: ความสับสนระหว่างป้ายกำกับดวงดาวในระบบไทยและบทบาทดาวเคราะห์สากล (เช่น รหัสเกตุ 9 ในปฏิทินไทยสุริยาตร์กับเกตุสากล) อาจส่งผลให้โมดูลตีความประเมินผิดตำแหน่งได้ จึงต้องควบคุมความถูกต้องของคู่ความสัมพันธ์ (Mapping) ให้ชัดเจนก่อนเขียนโค้ด
* **ความแตกต่างเชิงคณิตศาสตร์ปฏิทิน (Sidereal Mismatch)**: ความคลาดเคลื่อนระหว่างดวงดาวระบบสุริยยาตร์ไทยกับระบบสมผุสดาวทางดาราศาสตร์สากล (Lahiri Ayanamsa) มีความเหลื่อมล้ำโดยประมาณ 40 ถึง 50 ลิปดา ซึ่งอาจส่งผลให้ดาวเคราะห์ตกอยู่ในตำแหน่งราศีต่างกันได้ในช่วงคาบเกี่ยว
* **ความแม่นยำด้านเขตเวลาและเวลาเกิด**: การประมาณค่าบนไคลเอนต์จำเป็นต้องระบุเขตเวลาเกิดที่สอดคล้องกับพิกัดจริงเพื่อป้องกันความคลาดเคลื่อนสะสมหลายชั่วโมง ซึ่งอาจทำให้ดาวเคราะห์ที่โคจรเร็ว เช่น ดวงจันทร์ เคลื่อนย้ายราศีก่อนเวลาจริง
* **การวิเคราะห์แบบ Overfitting**: การออกแบบรหัสคำนวณรันไทม์โดยอิงเฉพาะกับกรณีศึกษาที่ยังไม่ได้ประเมินผลความพร้อมจริง (Unvalidated examples) จะทำให้เกิดข้อผิดพลาดในการตรวจสอบภาพรวมของระบบงาน

---

## 8. DEV-098 Handoff (ข้อกำหนดการส่งมอบ)

เอกสารฉบับนี้จะทำหน้าที่เป็นแบบร่างโครงสร้างตารางข้อมูลเพื่อส่งต่อการจัดทำแผนงานสำหรับตัวแปลงข้อมูลรันไทม์ (DEV-098) โดยกำหนดขอบเขตปฏิสัมพันธ์ของโมดูลดังนี้:
* **การจัดระเบียบข้อมูลนำเข้า (Normalized Input Shape)**: ออกแบบโครงสร้างรับข้อมูลวันและเวลาเกิดให้อยู่ในมาตรฐานเดียวกัน
* **การแปลงผลลัพธ์ (Comparison Result Format)**: กำหนดมาตรฐานข้อตกลงในการเปรียบเทียบค่าพิกัดราศีโดยประมาณกับข้อมูลในตาราง
* **ความตระหนักรู้ต่อสถานะความถูกต้อง (Validation Status Awareness)**: Adapter ที่พัฒนาจะต้องแยกแยะกรณีศึกษาที่ยังไม่ได้รับการสอบทานออกจากกรณีศึกษาควบคุมที่ผ่านการพิสูจน์แล้วได้อย่างชัดเจน
* **การทำงานอย่างไม่ทำลายสถานะระบบเดิม (Non-destructive State Integration)**: การจัดวางแผน Adapter จะต้องไม่มีคำสั่งหรือผลข้างเคียงใดๆ ที่รบกวนหน้าแสดงผล หรือข้อมูลประวัติสะสมของผู้ใช้ใน LocalStorage
