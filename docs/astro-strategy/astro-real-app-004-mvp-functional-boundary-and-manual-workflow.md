# ASTRO-REAL-APP-004 — MVP Functional Boundary & Manual Workflow

* **สถานะของเอกสาร (Document Status)**: Approved / Docs-only / Ready for Stage
* **รหัสอ้างอิงของงาน**: ASTRO-REAL-APP-004
* **วันที่เขียน**: 11 กรกฎาคม 2026

---

## 1. Document Status

เอกสารฉบับนี้อยู่ในสถานะ **Approved / Docs-only / Ready for Stage** ใช้เพื่อกำหนดขอบเขตการทำงานของ MVP ในระดับเอกสารเท่านั้น ยังไม่อนุญาตให้แปลงเป็นหน้าจอ ระบบอัตโนมัติ เส้นทางข้อมูล โค้ด หรือกลไกคำนวณใด ๆ

---

## 2. Purpose of This Document

เอกสารฉบับนี้จัดทำขึ้นเพื่อกำหนด **ขอบเขตฟังก์ชันขั้นต่ำของ MVP แบบ manual-first** สำหรับ Astro Real App โดยต่อยอดจากเอกสาร ASTRO-REAL-APP-001 ถึง ASTRO-REAL-APP-003 และบันทึก QA ที่เกี่ยวข้อง

เป้าหมายหลักคือระบุว่า MVP รอบแรกควรรับคำถามแบบใด ต้องใช้บริบทอะไร ทำงานเป็นลำดับอย่างไร ส่งมอบผลลัพธ์แบบใด ต้องให้ผู้ใช้ใช้ดุลพินิจตรงจุดใด ต้องหยุดเมื่อใด และควรบันทึก Reflection อย่างไร โดยยังคงเป็นการออกแบบเชิงเอกสาร ไม่ใช่การออกแบบหน้าจอหรือระบบ

---

## 3. Source Documents and Approved Direction

เอกสารนี้อ้างอิงแหล่งข้อมูลต่อไปนี้:

1. `astro-real-app-001-project-definition-and-scope.md`
2. `qa-real-app-001-project-definition-and-scope.md`
3. `astro-real-app-002-product-goals-users-and-core-use-cases.md`
4. `qa-real-app-002-product-goals-users-and-core-use-cases.md`
5. `astro-real-app-003-mvp-use-case-prioritization-and-decision-criteria.md`
6. `qa-real-app-003-mvp-use-case-prioritization-and-decision-criteria.md`

ทิศทางที่ได้รับการอนุมัติแล้ว:

* **Main MVP Use Case**: `UC-03 — Decision Support Review`
* **Pilot Scenario**: `UC-04 — Project Alignment Review`
* **Supporting Layer**: `UC-07 — Decision and Outcome Reflection`
* **Initial Pilot Project**: `Green Fineness Content Direction`
* **Deferred Pilot Candidates**: `Nutrient Planner / Rose Trial`, `WorkOS-Lite Development Priority`

---

## 4. MVP Functional Definition

MVP ของ Astro Real App ในรอบนี้คือ:

**กระบวนการทบทวนการตัดสินใจเชิงยุทธศาสตร์แบบ manual-first สำหรับผู้ใช้รายเดียว โดยรับคำถามเกี่ยวกับโปรเจกต์หนึ่งประเด็นต่อหนึ่งรอบ จัดโครงสร้างบริบท แยกคำอ่านเชิงดวงออกจากการตีความและข้อเสนอเชิงปฏิบัติ และบันทึกผลย้อนหลังเพื่อใช้ทบทวนคุณค่าของกรอบ Astro Strategy**

MVP นี้ไม่ใช่:

* ระบบอัตโนมัติ
* กลไกคำนวณ
* แอปที่ตัดสินใจแทนผู้ใช้
* ระบบให้คะแนนคำตอบ
* ระบบสำหรับผู้ใช้ทั่วไป
* ระบบหลายศาสตร์เต็มรูปแบบ
* ระบบรับรองความแม่นยำ

---

## 5. Manual-first Operating Principle

หลักการทำงานของ MVP ต้องเป็น manual-first อย่างเคร่งครัด:

* ใช้ข้อมูลที่ผู้ใช้และเอกสารเดิมจัดเตรียมด้วยมือ
* ใช้ judgment ของผู้ใช้ในทุก Decision Gate
* ไม่สร้างผลลัพธ์อัตโนมัติ
* ไม่ดึงข้อมูลดาวหรือบริบทจากระบบอื่นอัตโนมัติ
* สามารถทดลองและปรับกรอบด้วยเอกสารก่อน implementation
* ทุกข้อเสนอเป็นข้อมูลประกอบ ไม่ใช่คำตัดสิน
* ข้อจำกัดในโลกจริงมีความสำคัญเหนือสัญญาณเชิงดวง

---

## 6. Primary User and Pilot Context

ผู้ใช้หลักของ MVP รอบนี้คือ **คุณตั้ม / อภิรักษ์** ในฐานะผู้ใช้รายเดียว ผู้ตัดสินใจขั้นสุดท้าย และเจ้าของบริบทโปรเจกต์จริง

บริบท Pilot แรกคือ **Green Fineness Content Direction** โดยเน้นการทบทวนทิศทางเนื้อหา การจัดลำดับความสำคัญ การเลือกงานที่ควรเดินหน้า ชะลอ ลดขอบเขต หรือทดลองขนาดเล็กก่อน

MVP ต้องจำกัดอยู่กับการช่วยคิดและช่วยทบทวนการตัดสินใจ ไม่ใช่การสร้าง Content Strategy ใหม่ทั้งระบบ ไม่ใช่การวิเคราะห์ Backlog ทั้งหมด และไม่ใช่การตัดสินใจแทนเจ้าของโปรเจกต์

---

## 7. Supported Decision Question Types

คำถามที่รองรับใน Pilot แรกต้องเกี่ยวข้องกับ Green Fineness Content Direction เช่น:

* ควรให้ความสำคัญกับงานหรือหัวข้อใดก่อน
* ควรเดินหน้าหรือชะลอโปรเจกต์ย่อยใด
* ควรลดขอบเขตงานส่วนใด
* ควรใช้ทรัพยากร เวลา และพลังงานกับเรื่องใด
* ควรทดลองขนาดเล็กก่อนหรือไม่
* ข้อมูลใดยังขาดก่อนตัดสินใจ

คำถามที่รับเข้ากระบวนการต้องมีคุณสมบัติดังนี้:

* มีขอบเขตชัด
* เป็นหนึ่งประเด็นหลักต่อหนึ่งรอบ
* มีทางเลือกหรือการตัดสินใจที่ระบุได้
* มีบริบทและข้อจำกัดจริง
* สามารถกลับมาทบทวนผลภายหลังได้

---

## 8. Unsupported Question Types

คำถามต่อไปนี้อยู่นอกขอบเขต MVP:

* การทำนายความตายหรือเหตุร้าย
* การวินิจฉัยสุขภาพ
* การตัดสินใจทางการเงินจากดวงเพียงอย่างเดียว
* การกล่าวหาหรือตัดสินบุคคลอื่น
* การรับรองความสำเร็จ
* คำถามที่ไม่มีทางเลือกหรือบริบทเพียงพอ
* คำถามหลายโปรเจกต์หลายประเด็นในรอบเดียว
* คำถามที่ต้องใช้กลไกคำนวณที่ยังไม่ผ่านการรับรอง
* คำถามที่ผู้ใช้ต้องการให้ระบบตัดสินใจแทน

---

## 9. Minimum Required Context

บริบทขั้นต่ำที่ต้องมีในระดับแนวคิด:

* Decision Question
* Pilot Project
* Current Situation
* Available Options
* Desired Outcome
* Real-world Constraints
* Known Risks
* Missing Information
* Relevant Personal Context
* Existing Astro Context ที่ผ่านการทบทวนแล้ว
* Decision Deadline หากมี

ข้อมูลเหล่านี้เป็นขอบเขตบริบทเชิงเอกสาร ไม่ใช่ข้อกำหนดฟอร์ม ไม่ใช่การกำหนดช่องข้อมูล และไม่ใช่การกำหนดโครงสร้างจัดเก็บ

---

## 10. Manual Input Boundary

ขอบเขตการป้อนข้อมูลแบบ manual มีหลักดังนี้:

* ผู้ใช้ต้องเตรียมคำถามและบริบทจริงด้วยตนเอง
* Existing Astro Context ต้องเป็นข้อมูลที่ผ่านการทบทวนแล้ว ไม่ใช่ข้อมูลที่ดึงหรือคำนวณใหม่ในรอบนี้
* หากข้อมูลไม่พอ ต้องหยุดและขอเติมบริบทก่อนเดินต่อ
* หากคำถามมีหลายประเด็น ต้องแยกเป็นรอบย่อย ไม่รวมหลายการตัดสินใจในรอบเดียว
* หากข้อจำกัดจริงขัดกับข้อเสนอเชิงดวง ให้ถือข้อจำกัดจริงเป็นเงื่อนไขนำ

---

## 11. Manual Review Workflow

ลำดับ manual workflow ระดับเอกสาร:

1. **Frame the Decision Question** — ระบุคำถามหลักให้ชัดว่าเป็นการตัดสินใจเรื่องใด
2. **Confirm Scope** — ยืนยันว่าเป็นหนึ่งโปรเจกต์ หนึ่งประเด็น และหนึ่งรอบการประเมิน
3. **Gather Real-world Context** — รวบรวมสถานการณ์จริง ข้อจำกัด เวลา ทรัพยากร และความเสี่ยง
4. **Identify Available Options** — ระบุทางเลือกที่มีอยู่จริง
5. **Review Existing Astro Context** — ใช้เฉพาะบริบทเชิงดวงที่มีอยู่และผ่านการทบทวนแล้ว
6. **Separate Interpretation Layers** — แยก Layer 1, Layer 2 และ Layer 3 ออกจากกัน
7. **Compare Options and Trade-offs** — เปรียบเทียบทางเลือก ผลได้ ผลเสีย และความเสี่ยง
8. **Identify Missing Information** — ระบุข้อมูลที่ยังไม่พอสำหรับการตัดสินใจ
9. **Produce Practical Recommendation** — เสนอแนวทางปฏิบัติแบบไม่ตัดสินแทนผู้ใช้
10. **User Decision Gate** — ผู้ใช้ตัดสินใจว่าจะเดินหน้า ชะลอ ลดขอบเขต ทดลอง หรือหาข้อมูลเพิ่ม
11. **Record Decision** — บันทึกคำถาม ทางเลือก เหตุผล และสิ่งที่เลือก
12. **Reflection After Outcome** — กลับมาทบทวนเมื่อมีผลลัพธ์หรือข้อมูลเพียงพอ

workflow นี้เป็น conceptual/manual workflow ไม่ใช่ UI flow ไม่ใช่ automation specification และแต่ละขั้นสามารถหยุดเพื่อขอข้อมูลเพิ่มได้

---

## 12. Interpretation Layers

MVP ต้องคงโครงสร้าง 3 ชั้น:

### Layer 1 — คำอ่านเชิงดวง

* ระบุหลักหรือข้อมูลที่ใช้
* ระบุข้อจำกัด
* ระบุความไม่แน่ชัด
* หลีกเลี่ยงการฟันธงผลลัพธ์

### Layer 2 — การตีความเชิงกลยุทธ์

* เชื่อมกับโปรเจกต์ Green Fineness Content Direction
* เปรียบเทียบกับข้อจำกัดจริง
* แยกข้อสังเกตออกจากข้อเท็จจริง
* ระบุจุดที่ต้องใช้ judgment ของผู้ใช้

### Layer 3 — ข้อเสนอเชิงปฏิบัติ

* ทางเลือก
* Trade-offs
* ความเสี่ยง
* สิ่งที่ควรเตรียม
* Next Step
* แผนสำรอง

---

## 13. Decision Support Output

ผลลัพธ์ระดับแนวคิดควรมีส่วนประกอบดังนี้:

1. Context Summary
2. Decision Question
3. Scope Confirmation
4. Options Under Review
5. Layer 1 — Astro Reading
6. Layer 2 — Strategic Interpretation
7. Supporting Factors
8. Risks and Real-world Constraints
9. Missing Information
10. Options and Trade-offs
11. Layer 3 — Practical Recommendation
12. User Decision
13. Next Step
14. Reflection Trigger

โครงสร้างนี้เป็น output outline เชิงเอกสาร ไม่ใช่ UI specification และไม่ใช่ข้อกำหนดการจัดเก็บข้อมูล

---

## 14. Project Alignment Pilot Boundary

Pilot Scenario คือ **UC-04 — Project Alignment Review** ภายใต้แกนหลัก **UC-03 — Decision Support Review**

Initial Pilot Project คือ **Green Fineness Content Direction**

Pilot ต้องจำกัดให้เหลือ:

* หนึ่งโปรเจกต์จริง
* หนึ่งคำถามหลัก
* หนึ่งรอบการประเมิน
* Manual context
* Manual interpretation
* Manual decision
* Manual reflection

ห้ามขยายไปสู่:

* วิเคราะห์ Backlog ทั้งหมด
* จัดอันดับทุกโปรเจกต์
* สร้าง Content Strategy ใหม่ทั้งระบบ
* Auto scoring
* Auto scheduling
* Auto publish decision
* WorkOS integration

---

## 15. Reflection and Outcome Review

UC-07 รองรับการทบทวนระดับแนวคิดหลังมีผลลัพธ์หรือข้อมูลเพียงพอ โดยใช้คำถามสะท้อนดังนี้:

* คำถามเดิมคืออะไร
* ผู้ใช้เลือกอะไร
* ใช้เหตุผลอะไร
* ข้อจำกัดจริงคืออะไร
* สิ่งใดเกิดขึ้น
* สิ่งใดไม่เกิดขึ้น
* อะไรอาจเกิดจากการเตรียมตัว
* อะไรอาจเกิดจากปัจจัยภายนอก
* คำอ่านส่วนใดมีประโยชน์
* คำอ่านส่วนใดไม่ชัดหรือไม่เกี่ยวข้อง
* บทเรียนสำหรับรอบถัดไป

Reflection ต้องเกิดตามเหตุการณ์หรือเมื่อมีข้อมูลเพียงพอ ไม่กำหนดรอบเวลาตายตัว

---

## 16. User Judgment and Approval Points

MVP ต้องมี User Gate อย่างน้อย:

* **Scope Approval** — ผู้ใช้ยืนยันขอบเขตคำถาม
* **Context Approval** — ผู้ใช้ยืนยันว่าบริบทเพียงพอและถูกต้อง
* **Interpretation Review** — ผู้ใช้ทวนว่าการตีความไม่เกินข้อมูลจริง
* **Recommendation Review** — ผู้ใช้ตรวจข้อเสนอและ trade-offs ก่อนใช้ประกอบการตัดสินใจ
* **Final Decision** — ผู้ใช้เป็นผู้เลือกทางเดินเอง
* **Reflection Confirmation** — ผู้ใช้ยืนยันบทเรียนและสิ่งที่ควรปรับในรอบถัดไป

ระบบหรือเอกสารไม่สามารถข้าม User Gate ได้

---

## 17. Stop / Limit Conditions

ต้องหยุดหรือจำกัดคำตอบเมื่อ:

* คำถามกว้างเกินไป
* มีหลายการตัดสินใจในรอบเดียว
* ข้อมูลไม่พอ
* ความเสี่ยงสูง
* เกี่ยวข้องกับสุขภาพ กฎหมาย หรือการเงินที่ต้องใช้ผู้เชี่ยวชาญ
* ต้องใช้ข้อมูลบุคคลอื่นโดยไม่มีความยินยอม
* คำอ่านหลายศาสตร์ขัดแย้งกันและยังไม่มีหลักประสาน
* ผู้ใช้ต้องการคำตอบแบบฟันธง
* ผู้ใช้ขอให้ระบบตัดสินใจแทน
* ไม่สามารถแยกข้อมูลจริงออกจากการตีความได้

เมื่อเกิดเงื่อนไขเหล่านี้ ผลลัพธ์ที่เหมาะสมคือชะลอคำตอบ ลดขอบเขต ขอข้อมูลเพิ่ม หรือแนะนำให้ใช้ผู้เชี่ยวชาญที่เกี่ยวข้อง

---

## 18. Functional In Scope

สิ่งที่อยู่ในขอบเขต MVP:

* การรับคำถามเชิงตัดสินใจหนึ่งประเด็นต่อหนึ่งรอบ
* การจัดโครงสร้างบริบทจริง
* การแยกคำอ่านเชิงดวง การตีความเชิงกลยุทธ์ และข้อเสนอเชิงปฏิบัติ
* การเปรียบเทียบทางเลือกและ trade-offs
* การระบุข้อจำกัดจริง ความเสี่ยง และข้อมูลที่ยังขาด
* การเสนอ recommendation แบบประกอบการตัดสินใจ
* การบันทึกเหตุผลของผู้ใช้และผลลัพธ์ภายหลังในระดับเอกสาร
* การทบทวนคุณค่าของ Astro Layer หลังเกิดผลลัพธ์จริง

---

## 19. Functional Out of Scope

สิ่งที่ไม่อยู่ในขอบเขต MVP:

* UI
* UX screen flow
* Wireframe
* Source code
* React component
* Route
* Database
* Migration
* Calculation logic
* Scoring algorithm
* Ephemeris
* AI agent implementation
* WorkOS integration implementation
* Notification
* Deployment
* การวิเคราะห์หลายโปรเจกต์พร้อมกัน
* การรับรองความสำเร็จหรือความแม่นยำ
* การตัดสินใจแทนผู้ใช้

---

## 20. Risks and Guardrails

ความเสี่ยงและ guardrails ที่ต้องควบคุม:

* **Scope creep** — จำกัดหนึ่งโปรเจกต์ หนึ่งคำถาม หนึ่งรอบ
* **Confirmation bias** — บันทึกทั้งสิ่งที่ตรงและไม่ตรงกับคำอ่าน
* **False confidence** — ห้ามแปล recommendation เป็นคำรับรองผล
* **Astrology vs ordinary strategy ambiguity** — แยกเสมอว่าส่วนใดคือคำอ่าน ส่วนใดคือกลยุทธ์ทั่วไป
* **Incomplete context** — ข้อมูลไม่พอต้องหยุด
* **Overreliance on symbolic timing** — ข้อจำกัดจริงนำสัญญาณเชิงดวงเสมอ
* **Decision substitution** — ผู้ใช้ต้องเป็นผู้ตัดสินใจขั้นสุดท้าย
* **Privacy of personal context** — ใช้เฉพาะบริบทที่จำเป็นและผู้ใช้ยินยอม
* **Mixing multiple disciplines too early** — ไม่ผสมหลายศาสตร์หากยังไม่มีหลักประสาน
* **Premature automation** — รักษารอบนี้เป็นเอกสารและ manual workflow เท่านั้น

---

## 21. Manual Pilot Evidence

หลักฐานที่ควรเก็บจาก Pilot แบบ manual:

* Decision Question
* Context Summary
* Options Considered
* Interpretation Layers
* Recommendation
* User Decision
* Reason for Decision
* Outcome Evidence
* Reflection
* Identified Gaps
* Proposed Adjustment

รายการนี้เป็น checklist เชิงหลักฐาน ไม่ใช่โครงสร้างฐานข้อมูล

---

## 22. Success Indicators

Manual Pilot ถือว่ามีคุณค่าเมื่อ:

* ช่วยให้คำถามชัดขึ้น
* ช่วยแยกข้อมูลจริงออกจากการตีความ
* ช่วยให้เห็นทางเลือกและ Trade-offs
* ช่วยระบุข้อมูลที่ยังขาด
* ช่วยให้ผู้ใช้กำหนด Next Step
* ไม่ตัดสินใจแทนผู้ใช้
* สามารถทบทวนเหตุผลย้อนหลัง
* สามารถระบุได้ว่า Astro Layer เพิ่มคุณค่าหรือไม่
* ไม่สร้างความกลัวหรือ False Confidence
* ผู้ใช้เห็นว่ากรอบนี้ควรทดลองต่อ

Success Indicators เหล่านี้ไม่รับรองว่าผลการตัดสินใจจะสำเร็จ

---

## 23. Open Questions

คำถามเปิดสำหรับการทบทวนถัดไป:

1. Pilot แรกควรเริ่มจากคำถาม Green Fineness Content Direction ประเภทใดจึงชัดและปลอดภัยที่สุด?
2. Existing Astro Context ขั้นต่ำที่ผ่านการทบทวนแล้วควรประกอบด้วยอะไรบ้าง?
3. จะวัดว่า Astro Layer เพิ่มคุณค่าจริง หรือเป็นเพียงคำแนะนำเชิงกลยุทธ์ทั่วไปได้อย่างไร?
4. Reflection ควรเกิดเมื่อมีหลักฐานแบบใดจึงเพียงพอ?
5. หากคำอ่านเชิงดวงไม่ชัด ควรตัดออกจากรอบนั้นหรือคงไว้พร้อมข้อจำกัด?
6. จะป้องกันการเลือกเฉพาะตัวอย่างที่สนับสนุนความเชื่อเดิมได้อย่างไร?
7. Pilot ควรถือว่าล้มเหลวหรือควรถอยกลับเมื่อเกิดสัญญาณใด?

---

## 24. Docs-only Constraints

ข้อจำกัดของเอกสารนี้:

* ไม่มี UI
* ไม่มี UX screen flow
* ไม่มี Wireframe
* ไม่มี Prototype
* ไม่มี Source code
* ไม่มี React component
* ไม่มี Route
* ไม่มี API
* ไม่มี Database
* ไม่มี Migration
* ไม่มี Calculation logic
* ไม่มี Scoring algorithm
* ไม่มี Ephemeris
* ไม่มี AI agent implementation
* ไม่มี WorkOS integration implementation
* ไม่มี Notification
* ไม่มี Deployment

เอกสารนี้เป็น Functional Boundary เชิงแนวคิดและ Manual Workflow เท่านั้น

---

## 25. Review Gates

Review Gates สำหรับงาน 004:

1. **Source Alignment Gate** — สอดคล้องกับ 001, 002 และ 003
2. **Approved Direction Gate** — ยึด UC-03, UC-04, UC-07 และ Green Fineness Content Direction
3. **Manual-first Gate** — ไม่ผลักเข้าสู่ระบบอัตโนมัติ
4. **User Judgment Gate** — มี User Gate ครบและผู้ใช้ไม่ถูกข้ามสิทธิ์ตัดสินใจ
5. **Stop Condition Gate** — ระบุจุดหยุดและข้อจำกัดชัดเจน
6. **Reflection Gate** — มีการทบทวนผลย้อนหลังแบบไม่กำหนดรอบเวลาตายตัว
7. **Docs-only Gate** — ไม่มีขอบเขต UI, code, route, database, migration หรือ deployment

---

## 26. Exit Criteria

เอกสาร 004 ถือว่าพร้อมเข้าสู่ Content Review Gate เมื่อ:

1. มีหัวข้อ Functional Boundary และ Manual Workflow ครบถ้วน
2. นิยาม MVP เป็นกระบวนการ manual-first ไม่ใช่ระบบอัตโนมัติ
3. ระบุคำถามที่รองรับและไม่รองรับชัดเจน
4. ระบุ Minimum Required Context โดยไม่กำหนดช่องฟอร์มหรือโครงสร้างจัดเก็บ
5. มี Manual Review Workflow 12 ขั้น
6. แยก Interpretation Layers ครบ 3 ชั้น
7. มี Decision Support Output ระดับแนวคิด
8. จำกัด Pilot ให้หนึ่งโปรเจกต์ หนึ่งคำถาม หนึ่งรอบ
9. มี User Gate, Stop Conditions, Reflection และ Success Indicators
10. QA Document ผ่านสถานะ Passed
11. ไม่มีไฟล์อื่นถูกแก้ไขนอกจากไฟล์เอกสาร 004 และ QA 004

---

## 27. Recommended Next Document

เอกสารถัดไปที่แนะนำคือ:

**ASTRO-REAL-APP-005 — Manual Pilot Case Definition & Evaluation Plan**

เอกสาร 005 ต้องยังเป็น docs-only และยังไม่ควรเริ่มจนกว่า:

* ASTRO-REAL-APP-004 ผ่าน QA
* Functional Boundary ได้รับ User Approval
* Manual Workflow ได้รับ User Approval
* เอกสาร 004 ถูก Commit แล้ว

---

## 28. Decision Record

* **Main MVP Use Case**: `UC-03 — Decision Support Review`
* **Pilot Scenario**: `UC-04 — Project Alignment Review`
* **Supporting Layer**: `UC-07 — Decision and Outcome Reflection`
* **Initial Pilot Project**: `Green Fineness Content Direction`
* **Manual-first boundary**: Approved by User
* **Pilot boundary**: One project / one question / one review cycle
* **Implementation exclusions**: No UI, schema, calculation logic, automation, or WorkOS integration

---

## 29. Current Status

* **Functional Boundary**: Approved by User
* **Manual Workflow**: Approved by User
* **Document QA**: Passed
* **Current State**: Ready for Stage
* **ขอบเขตปัจจุบัน**: สร้าง functional boundary และ manual workflow สำหรับ MVP เท่านั้น
* **การดำเนินงานต่อไป**: Stage เฉพาะเอกสาร 004 และ QA 004 ก่อน commit ในขั้นถัดไป
