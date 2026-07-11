# ASTRO-REAL-APP-005 — Manual Pilot Case Definition & Evaluation Plan

* **สถานะของเอกสาร (Document Status)**: Approved / Docs-only / Ready for Stage
* **รหัสอ้างอิงของงาน**: ASTRO-REAL-APP-005
* **วันที่เขียน**: 11 กรกฎาคม 2026

---

## 1. Document Status

เอกสารฉบับนี้อยู่ในสถานะ **Approved / Docs-only / Ready for Stage** ใช้เพื่อกำหนดกรณี Manual Pilot และ Evaluation Plan สำหรับ Astro Real App เท่านั้น ยังไม่อนุญาตให้สร้าง UI, code, route, database, calculation logic, automation หรือ WorkOS integration

---

## 2. Purpose of This Document

เอกสารนี้จัดทำขึ้นเพื่อกำหนดกรณีทดลอง Manual Pilot หนึ่งกรณีสำหรับ **Green Fineness Content Direction** และกำหนดแผนประเมินผลว่า framework ของ Astro Strategy เพิ่มคุณค่าให้การทบทวนการตัดสินใจจริงหรือไม่

เอกสารนี้ต่อยอดจาก ASTRO-REAL-APP-001 ถึง 004 โดยลงรายละเอียดเฉพาะระดับเอกสารว่า Pilot Question ควรเป็นอะไร ใช้บริบทขั้นต่ำอะไร มีทางเลือกใดอยู่ระหว่างทบทวน เก็บหลักฐานอะไร ประเมินอย่างไร และต้องหยุดหรือปรับเมื่อใด

---

## 3. Source Documents and Approved Foundation

เอกสารนี้อ้างอิง:

1. `astro-real-app-001-project-definition-and-scope.md`
2. `qa-real-app-001-project-definition-and-scope.md`
3. `astro-real-app-002-product-goals-users-and-core-use-cases.md`
4. `qa-real-app-002-product-goals-users-and-core-use-cases.md`
5. `astro-real-app-003-mvp-use-case-prioritization-and-decision-criteria.md`
6. `qa-real-app-003-mvp-use-case-prioritization-and-decision-criteria.md`
7. `astro-real-app-004-mvp-functional-boundary-and-manual-workflow.md`
8. `qa-real-app-004-mvp-functional-boundary-and-manual-workflow.md`

Approved Foundation:

* **Main MVP Use Case**: `UC-03 — Decision Support Review`
* **Pilot Scenario**: `UC-04 — Project Alignment Review`
* **Supporting Layer**: `UC-07 — Decision and Outcome Reflection`
* **Initial Pilot Project**: `Green Fineness Content Direction`
* **Primary User**: คุณตั้ม / อภิรักษ์
* **Operating Mode**: Manual-first
* **Boundary**: One project / one decision question / one review cycle

---

## 4. Manual Pilot Definition

Manual Pilot คือ:

**การทดลองทบทวนการตัดสินใจเชิงยุทธศาสตร์หนึ่งกรณีจาก Green Fineness Content Direction โดยใช้ข้อมูลและบริบทที่จัดเตรียมด้วยมือ แยก Astro Reading, Strategic Interpretation และ Practical Recommendation ออกจากกัน ให้ผู้ใช้อนุมัติทุก Decision Gate และกลับมาทบทวนผลเมื่อมีหลักฐานหรือข้อมูลเพียงพอ**

Manual Pilot นี้ไม่ใช่:

* ระบบทำนาย
* ระบบอัตโนมัติ
* ระบบให้คะแนนความแม่นยำ
* Calculation engine
* ระบบตัดสินใจแทนผู้ใช้
* Content Strategy ใหม่ทั้งระบบ
* การประเมินหลายโปรเจกต์พร้อมกัน
* ระบบสำหรับผู้ใช้ทั่วไป

---

## 5. Pilot Objective

Pilot นี้ต้องทดสอบว่า:

* คำถามชัดขึ้นหรือไม่
* ข้อมูลจริงกับการตีความถูกแยกออกจากกันหรือไม่
* ทางเลือกและ Trade-offs ชัดขึ้นหรือไม่
* ข้อมูลที่ขาดถูกระบุหรือไม่
* ผู้ใช้กำหนด Next Step ได้หรือไม่
* User Agency ยังคงอยู่หรือไม่
* สามารถทบทวนเหตุผลย้อนหลังได้หรือไม่
* Astro Layer เพิ่มคุณค่าหรือไม่
* Strategic Review ทั่วไปเพียงพออยู่แล้วในส่วนใด
* ควร Continue, Adjust หรือ Stop Pilot หรือไม่

---

## 6. Primary User and Pilot Context

ผู้ใช้หลักคือ **คุณตั้ม / อภิรักษ์** ในฐานะเจ้าของโปรเจกต์ ผู้ถือบริบทจริง และผู้ตัดสินใจขั้นสุดท้าย

Pilot Context คือ **Green Fineness Content Direction** โดยจำกัดเฉพาะการทบทวนทิศทางการใช้เวลา พลังงาน และทรัพยากรระหว่างงาน Knowledge Content กับความเป็นไปได้ในการทดลอง Video Studio ขนาดเล็ก

---

## 7. Pilot Boundary

จำกัด Pilot ให้:

* Green Fineness Content Direction หนึ่งโปรเจกต์
* หนึ่งคำถามหลัก
* หนึ่งรอบการประเมิน
* Manual context
* Manual interpretation
* Manual decision
* Manual reflection
* Existing Astro Context ที่ผ่านการทบทวนแล้ว
* User Gate ในทุกจุดสำคัญ

ห้ามขยายไป:

* วิเคราะห์ Content Backlog ทั้งหมด
* จัดอันดับทุกบทความ
* จัดอันดับทุกโปรเจกต์
* สร้าง Content Strategy ใหม่ทั้งระบบ
* Auto scoring
* Auto scheduling
* Auto publishing
* WorkOS integration
* Calculation engine
* Multi-discipline synthesis
* AI agent workflow

---

## 8. Candidate Pilot Question Types

### Option A — Priority Decision

คำถามเกี่ยวกับการให้ความสำคัญกับงานหรือทิศทางใดก่อน

* **Use case fit**: เหมาะกับ UC-03 เพราะช่วยจัดลำดับทางเลือกเชิงยุทธศาสตร์
* **ข้อดี**: ช่วยลด cognitive overload และทำให้เห็น trade-offs ระหว่างทิศทางงาน
* **ข้อควรระวัง**: อาจกว้างเกินไป ต้องลดให้เหลือทางเลือกที่เปรียบเทียบได้จริง

### Option B — Continue / Pause Decision

คำถามเกี่ยวกับการเดินหน้าหรือชะลอโปรเจกต์ย่อยหนึ่งรายการ

* **Use case fit**: เหมาะเมื่อมี sub-project ที่ระบุชัด
* **ข้อดี**: ตัดสินใจได้ตรงและวัดผลภายหลังได้ง่าย
* **ข้อควรระวัง**: ต้องมีข้อมูลเวลา ทรัพยากร ภาระงาน และผลกระทบเพียงพอ

### Option C — Scope Reduction Decision

คำถามเกี่ยวกับการลดขอบเขตเพื่อรักษาคุณภาพและความต่อเนื่องของงานหลัก

* **Use case fit**: เหมาะกับการรักษา momentum ของ Knowledge Content
* **ข้อดี**: มีขอบเขตค่อนข้างชัดและทบทวนผลได้
* **ข้อควรระวัง**: ต้องไม่กลายเป็นการลดคุณค่าหลักของ Green Fineness Content Direction

### Option D — Small Experiment Decision

คำถามเกี่ยวกับการทดลองแนวทางใหม่ในขนาดเล็กก่อนตัดสินใจขยาย

* **Use case fit**: เหมาะกับ manual-first Pilot เพราะจำกัดความเสี่ยง
* **ข้อดี**: ความเสี่ยงค่อนข้างต่ำและเหมาะกับการเก็บ outcome evidence
* **ข้อควรระวัง**: ต้องกำหนดขนาดทดลองไม่ให้กินทรัพยากรของงานหลักเกินไป

---

## 9. Final Pilot Question

**Final Pilot Question**:

ภายใต้การรักษา Green Fineness Knowledge Content ให้ดำเนินต่อเนื่อง คุณตั้มควรกำหนดรูปแบบ Video Studio ขั้นต่ำ แล้วทดลองผลิตคลิปต้นแบบ 1 คลิปด้วยเครื่องมือที่มีอยู่ ภายใต้เพดานทรัพยากรและค่าใช้จ่ายที่กำหนด ก่อนตัดสินใจ Continue, Adjust หรือ Stop หรือไม่

สถานะของคำถาม:

* **Status**: Final Pilot Question
* **Approval State**: Approved by User
* **Decision Type**: Small Experiment Decision
* **Initial Pilot Boundary**: One storyboard / one workflow / one prototype clip
* **Main Work Protection**: Green Fineness Knowledge Content continues as the existing core work
* **Tool Boundary**: Use currently available tools first
* **Spending Boundary**: Define a spending ceiling before purchasing additional tools
* **Production Boundary**: No continuous production commitment in this Pilot
* **Evaluation Outcome**: Continue / Adjust / Stop

เอกสารนี้อนุมัติคำถาม Pilot และขอบเขตการทดลองแล้ว แต่ยังไม่ฟันธงว่าให้เลือก Option ใดเป็นผลลัพธ์สุดท้ายของการตัดสินใจ

---

## 9.1 Pilot Question Approval Record

* **Final Pilot Question**: Approved
* **Decision Type**: Small Experiment Decision
* **Initial Pilot Boundary**: One storyboard / one workflow / one prototype clip
* **Main Work Protection**: Green Fineness Knowledge Content continues as the existing core work
* **Tool Boundary**: Use currently available tools first
* **Spending Boundary**: Define a spending ceiling before purchasing additional tools
* **Production Boundary**: No continuous production commitment in this Pilot
* **Evaluation Outcome**: Continue / Adjust / Stop

ผลของ record นี้คือ Pilot Question Gate ผ่านแล้ว แต่ Context Approval, Option Approval, Astro Context Approval, Recommendation Review, Final Decision และ Reflection Gate ยังต้องใช้ User Gate ตามลำดับ workflow

---

## 10. Pilot Question Approval Criteria

คำถาม Pilot พร้อมอนุมัติเมื่อ:

* เป็นหนึ่งคำถามหลัก
* อยู่ใน Green Fineness Content Direction
* มีทางเลือกเปรียบเทียบชัด
* ไม่มีหลายโปรเจกต์ปะปน
* มีบริบทจริงเพียงพอ
* มีข้อจำกัดด้านเวลา พลังงาน และทรัพยากร
* สามารถเก็บ Outcome Evidence ได้
* สามารถ Reflection ได้ภายหลัง
* ไม่ต้องใช้ Calculation Engine
* ไม่ต้องใช้ข้อมูลบุคคลอื่น
* ผู้ใช้ยืนยันว่าคำถามตรงกับการตัดสินใจจริง

---

## 11. Minimum Pilot Context

ข้อมูลขั้นต่ำระดับแนวคิด:

* Pilot Question
* Current Situation
* Options Under Review
* Desired Outcome
* Available Time
* Available Energy
* Available Budget หรือ Resource Constraint
* Existing Commitments
* Known Risks
* Missing Information
* Green Fineness Decision History ที่เกี่ยวข้อง
* Existing Astro Context ที่ผ่านการทบทวนแล้ว
* Decision Deadline หากมี

รายการนี้เป็น **context checklist** ไม่ใช่ database fields ไม่ใช่ form schema และไม่ใช่ storage specification

---

## 12. Options Under Review

ทางเลือกภายใต้ Final Pilot Question:

* **Option A — Design First**
  กำหนดรูปแบบคลิปขั้นต่ำให้ชัดก่อน โดยยังไม่ผลิตคลิปจริง
* **Option B — Design + One-Clip Pilot**
  กำหนดรูปแบบขั้นต่ำ แล้วผลิต Storyboard 1 ชุด, Workflow 1 รอบ และ Prototype Clip 1 คลิป ด้วยเครื่องมือที่มีอยู่
* **Option C — Tool Research Before Production**
  ศึกษาเครื่องมือ ค่าใช้จ่าย และข้อจำกัดก่อนเริ่มผลิตคลิป
* **Option D — Defer the Pilot**
  ชะลอ Video Studio ในรอบนี้ โดย Green Fineness Knowledge Content ยังคงดำเนินต่อเป็นงานหลัก

สถานะของทางเลือก:

* ทางเลือกยังเป็นร่าง
* ผู้ใช้ต้องยืนยันความเป็นไปได้
* ผู้ใช้ยังต้องผ่าน Option Approval Gate ก่อนเริ่ม Execution
* ห้ามสร้างทางเลือกที่ทำไม่ได้ในโลกจริง
* ไม่ควรมีทางเลือกมากเกินจำเป็น

---

## 13. Manual Pilot Workflow

ลำดับ Manual Pilot Workflow:

1. Confirm Pilot Question
2. Confirm One-project Boundary
3. Confirm Current Situation
4. Confirm Available Options
5. Confirm Real-world Constraints
6. Review Existing Astro Context
7. Produce Layer 1 — Astro Reading
8. Produce Layer 2 — Strategic Interpretation
9. Compare Options and Trade-offs
10. Identify Missing Information
11. Produce Layer 3 — Practical Recommendation
12. User Recommendation Review
13. User Final Decision
14. Record Decision and Reason
15. Wait for Outcome Evidence
16. Conduct Reflection
17. Evaluate Pilot Value
18. Decide Continue / Adjust / Stop

workflow นี้เป็น conceptual/manual workflow ไม่ใช่ UI flow และไม่ใช่ automation specification แต่ละขั้นสามารถหยุด ขอข้อมูลเพิ่ม หรือย้อนกลับได้ ห้ามกำหนด fixed reflection interval

---

## 14. Interpretation Layers

### Layer 1 — Astro Reading

* หลักหรือบริบทเชิงดวงที่ใช้
* ความเกี่ยวข้องกับคำถาม
* ข้อจำกัด
* ความไม่แน่ชัด
* สิ่งที่ไม่ควรใช้สรุป
* ห้ามฟันธง

### Layer 2 — Strategic Interpretation

* ข้อเท็จจริงของโปรเจกต์
* ข้อจำกัดด้านเวลา พลังงาน และทรัพยากร
* ทางเลือกจริง
* Trade-offs
* ความเสี่ยง
* Missing Information
* ความแตกต่างระหว่าง Astro Insight กับ Strategic Reasoning ทั่วไป

### Layer 3 — Practical Recommendation

* Recommendation
* Alternative Option
* Conditions Before Action
* Missing Information
* Next Step
* Fallback Plan
* User Decision Gate

---

## 15. Evidence to Record

หลักฐานที่ควรเก็บ:

* Pilot Question
* Context Summary
* Options Considered
* Astro Context Used
* Layer 1 Reading
* Layer 2 Interpretation
* Layer 3 Recommendation
* Risks
* Missing Information
* User Decision
* Reason for Decision
* Action Taken
* Outcome Evidence
* Reflection
* Astro Layer Value Assessment
* Strategic Review Value Assessment
* Identified Gaps
* Proposed Adjustment

รายการนี้เป็น evidence checklist ไม่ใช่ database schema ไม่ใช่ data model และไม่กำหนด persistence

---

## 16. Evaluation Dimensions

### 1. Question Clarity

* **จุดประสงค์**: ตรวจว่าคำถามชัดพอสำหรับหนึ่งรอบการตัดสินใจหรือไม่
* **คำถามประเมิน**: คำถามมีประเด็นเดียวและระบุทางเลือกได้จริงหรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Pilot Question, Options Considered, User Approval
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: สรุปว่าคำถามชัดเพราะอ่านแล้วรู้สึกตรงใจ แต่ยังไม่มีขอบเขตการตัดสินใจจริง

### 2. Context Completeness

* **จุดประสงค์**: ตรวจว่ามีบริบทจริงเพียงพอสำหรับการทบทวนหรือไม่
* **คำถามประเมิน**: เวลา พลังงาน ทรัพยากร ความเสี่ยง และข้อผูกพันถูกระบุครบพอหรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Context Summary, Known Risks, Existing Commitments, Missing Information
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: ถือว่าบริบทครบเพราะมีข้อมูลเยอะ แต่ยังขาดข้อจำกัดที่มีผลต่อการตัดสินใจ

### 3. Layer Separation

* **จุดประสงค์**: ตรวจว่า Astro Reading, Strategic Interpretation และ Practical Recommendation แยกกันชัดหรือไม่
* **คำถามประเมิน**: แต่ละ Layer มีขอบเขตและภาษาแยกกันหรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Layer 1 Reading, Layer 2 Interpretation, Layer 3 Recommendation
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: นำคำอ่านเชิงดวงไปปนกับข้อเท็จจริงของโปรเจกต์

### 4. Option Quality

* **จุดประสงค์**: ตรวจว่าทางเลือกเป็นไปได้จริงและเปรียบเทียบกันได้
* **คำถามประเมิน**: ทางเลือกมีความแตกต่าง มีข้อแลกเปลี่ยน และไม่มากเกินจำเป็นหรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Options Under Review, Trade-offs, User Option Approval
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: สร้างทางเลือกที่ดูดีแต่ทำไม่ได้ในโลกจริง

### 5. Missing Information Detection

* **จุดประสงค์**: ตรวจว่า Pilot ช่วยระบุข้อมูลที่ยังขาดได้หรือไม่
* **คำถามประเมิน**: ข้อมูลที่ยังไม่พอถูกระบุชัดและมีผลต่อ decision หรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Missing Information, Recommendation Conditions, Reflection
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: ข้ามข้อมูลที่ยังขาดเพราะอยากสรุปคำตอบเร็วเกินไป

### 6. User Agency

* **จุดประสงค์**: ตรวจว่าสิทธิ์ตัดสินใจยังอยู่กับผู้ใช้
* **คำถามประเมิน**: ทุก Decision Gate ได้รับการอนุมัติจากผู้ใช้หรือไม่?
* **หลักฐานที่ใช้ประกอบ**: User Gate notes, Final Decision, Reason for Decision
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: ให้ recommendation กลายเป็นคำสั่งหรือคำตอบฟันธง

### 7. Practical Usefulness

* **จุดประสงค์**: ตรวจว่าผลลัพธ์ช่วยกำหนด next step ได้จริง
* **คำถามประเมิน**: ผู้ใช้เห็นขั้นตอนถัดไป เงื่อนไขก่อน action และ fallback plan หรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Layer 3 Recommendation, Next Step, Action Taken
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: recommendation ฟังดีแต่ไม่ลดความไม่ชัดเจนในการลงมือจริง

### 8. Astro Layer Added Value

* **จุดประสงค์**: ตรวจว่า Astro Layer เพิ่มมุมมองใหม่หรือช่วยจัดกรอบคำถามจริงหรือไม่
* **คำถามประเมิน**: Astro Layer เปลี่ยนมุมมอง ความระวัง หรือคำถามต่อไปอย่างมีประโยชน์หรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Astro Context Used, Layer 1 Reading, Astro Layer Value Assessment
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: สรุปว่ามีคุณค่าเพียงเพราะผู้ใช้รู้สึกว่าสอดคล้อง

### 9. Ordinary Strategy Comparison

* **จุดประสงค์**: ตรวจว่า Strategic Review ทั่วไปให้คำตอบเพียงพออยู่แล้วในส่วนใด
* **คำถามประเมิน**: หากไม่มี Astro Layer ข้อสรุปเชิงกลยุทธ์จะต่างจากเดิมแค่ไหน?
* **หลักฐานที่ใช้ประกอบ**: Ordinary Strategy Baseline, Astro Layer comparison, Practical Recommendation
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: ให้ภาษาเชิงสัญลักษณ์ทำให้คำแนะนำทั่วไปดูพิเศษเกินจริง

### 10. Reflection Quality

* **จุดประสงค์**: ตรวจว่าการทบทวนหลังผลลัพธ์ช่วยเรียนรู้จริงหรือไม่
* **คำถามประเมิน**: Reflection แยกผลลัพธ์จริง ปัจจัยภายนอก และบทเรียนได้หรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Outcome Evidence, Reflection, Proposed Adjustment
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: ใช้ความจำย้อนหลังแบบเลือกจำเฉพาะสิ่งที่ตรงกับคำอ่าน

### 11. Bias Control

* **จุดประสงค์**: ตรวจว่ากระบวนการลด confirmation bias และ pilot selection bias ได้หรือไม่
* **คำถามประเมิน**: มีการบันทึกสิ่งที่ไม่ตรง ไม่ชัด หรือไม่เกี่ยวข้องด้วยหรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Reflection, Identified Gaps, Astro Layer Value Assessment
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: เลือกเฉพาะหลักฐานที่ทำให้ Pilot ดูสำเร็จ

### 12. Continue / Adjust / Stop Decision

* **จุดประสงค์**: ตรวจว่าหลัง Pilot ผู้ใช้สามารถตัดสินใจทิศทางถัดไปได้
* **คำถามประเมิน**: หลักฐานเพียงพอที่จะ Continue, Adjust หรือ Stop หรือไม่?
* **หลักฐานที่ใช้ประกอบ**: Evaluation notes, Reflection Confirmation, User Approval
* **ความเสี่ยงจากการตีความเกินหลักฐาน**: รีบสรุปให้ Pilot ผ่านหรือล้มเหลว ทั้งที่หลักฐานยัง inconclusive

---

## 17. Evaluation Scale

ใช้ระดับเชิงบรรยายเท่านั้น:

* **Clear** — หลักฐานชัดและสอดคล้องกับประเด็นประเมิน
* **Partial** — มีหลักฐานบางส่วน แต่ยังไม่ครบหรือยังมีข้อสงสัย
* **Unclear** — หลักฐานไม่พอหรือไม่สามารถแยกความหมายได้
* **Not Applicable** — มิตินั้นไม่เกี่ยวข้องกับรอบ Pilot นี้

ห้าม:

* รวมคะแนน
* ถ่วงน้ำหนัก
* สร้าง Scoring Algorithm
* ใช้คะแนนวัดความแม่นยำของดวง
* ใช้คะแนนแทน User Judgment
* สร้าง Pass Rate เชิงตัวเลข

---

## 18. Astro Layer Value Review

ต้องแยกตรวจว่า Astro Layer:

* เพิ่มมุมมองใหม่หรือไม่
* ช่วยจัดกรอบคำถามหรือไม่
* ช่วยเห็นความเสี่ยงหรือข้อจำกัดหรือไม่
* เพียงย้ำสิ่งที่ Strategic Review ปกติระบุอยู่แล้วหรือไม่
* มีส่วนใดกว้าง ไม่ชัด หรือไม่เกี่ยวข้อง
* มีส่วนใดทำให้เกิด Confirmation Bias
* ควรคง ปรับ หรือตัดออกในรอบถัดไป

ห้ามสรุปว่ามีคุณค่าเพียงเพราะผู้ใช้รู้สึกสอดคล้อง

---

## 19. Ordinary Strategy Comparison

Baseline Comparison เชิงบรรยายต้องถามว่า:

* Strategic Review ที่ไม่มี Astro Layer ให้ข้อสรุปอะไร
* เมื่อเพิ่ม Astro Layer มีมุมมองใดเปลี่ยนไป
* การเปลี่ยนแปลงนั้นมีประโยชน์จริงหรือเพียงเพิ่มภาษาเชิงสัญลักษณ์
* Practical Recommendation เปลี่ยนหรือไม่
* Decision Quality ดีขึ้นในลักษณะใด
* มีส่วนใดที่ Astro Layer ไม่จำเป็น

รอบนี้ห้ามสร้าง Control Group หรือ experiment design เชิงสถิติ

---

## 20. Reflection Questions

Reflection ต้องครอบคลุม:

* คำถามเดิมชัดพอหรือไม่
* ผู้ใช้เลือกอะไร
* เหตุผลหลักคืออะไร
* ข้อจำกัดใดมีผลมาก
* ผลลัพธ์คืออะไร
* สิ่งใดไม่เกิดขึ้น
* ข้อเสนอใดช่วยได้
* ข้อเสนอใดกว้างหรือไม่เกี่ยวข้อง
* Astro Layer เพิ่มคุณค่าในส่วนใด
* Strategic Review ทั่วไปเพียงพอในส่วนใด
* มี Confirmation Bias หรือไม่
* มีข้อมูลใดถูกละเลย
* รอบถัดไปควรปรับอะไร
* ควร Continue, Adjust หรือ Stop

Reflection เกิดตามเหตุการณ์หรือเมื่อมีข้อมูลเพียงพอ ห้ามกำหนดจำนวนวันตายตัว

---

## 21. User Approval Gates

ต้องมี User Gate อย่างน้อย:

* Pilot Question Approval
* Context Approval
* Option Approval
* Astro Context Approval
* Interpretation Review
* Recommendation Review
* Final Decision
* Outcome Evidence Confirmation
* Reflection Confirmation
* Continue / Adjust / Stop Approval

ห้ามข้าม User Gate

---

## 22. Stop / Adjust Conditions

หยุดหรือปรับ Pilot เมื่อ:

* Pilot Question กว้างเกินไป
* มีหลายโปรเจกต์หรือหลายการตัดสินใจ
* ไม่มีทางเลือกชัด
* บริบทไม่เพียงพอ
* Astro Context ยังไม่ผ่านการทบทวน
* แยก Astro Layer ออกจาก Strategic Review ไม่ได้
* ผู้ใช้ต้องการคำตอบฟันธง
* ระบบเริ่มตัดสินใจแทน
* เกิดความกลัวหรือ False Confidence
* มีข้อมูลบุคคลอื่นโดยไม่มีความยินยอม
* ต้องใช้ Calculation Engine
* ต้องใช้หลายศาสตร์ที่ยังไม่มีหลักประสาน
* ไม่สามารถเก็บ Outcome Evidence
* Pilot ขยายไปเป็น Content Strategy ทั้งระบบ

แนวทางตอบสนอง:

* Stop
* Reduce Scope
* Request More Context
* Remove Astro Layer
* Reframe Question
* Seek Appropriate Expert
* Return to User Gate

---

## 23. Pilot Success Indicators

Pilot ถือว่ามีหลักฐานสนับสนุนว่ากระบวนการมีคุณค่าเมื่อ:

* Pilot Question ได้รับ User Approval และยังคงเป็นหนึ่งคำถามหลัก
* ทางเลือกมีขอบเขตพอให้เปรียบเทียบ
* ผู้ใช้เห็น trade-offs ชัดขึ้น
* Missing Information ถูกระบุและใช้ตัดสินใจได้
* Recommendation ไม่ตัดสินใจแทนผู้ใช้
* ผู้ใช้กำหนด next step หรือเงื่อนไขก่อน action ได้
* มี Outcome Evidence เพียงพอสำหรับ Reflection
* แยกได้ว่า Astro Layer เพิ่มคุณค่า ตรงไหน หรือไม่เพิ่มตรงไหน
* Ordinary Strategy Comparison ช่วยลดการ overclaim
* ผู้ใช้สามารถตัดสินใจ Continue, Adjust หรือ Stop ได้จากหลักฐาน

Success Indicators ไม่รับรองว่าการตัดสินใจจะสำเร็จในโลกจริง

---

## 24. Pilot Failure or Inconclusive Conditions

Pilot อาจเป็น Inconclusive เมื่อ:

* คำถามไม่ใช่การตัดสินใจจริง
* ทางเลือกเปลี่ยนระหว่างทางจนเทียบไม่ได้
* ไม่มี Outcome Evidence
* ปัจจัยภายนอกครอบงำผลลัพธ์
* Reflection เกิดจากความจำที่ไม่เพียงพอ
* Astro Layer กับ Strategy Layer แยกไม่ออก
* ผู้ใช้ไม่สามารถระบุ Added Value
* มี Confirmation Bias สูง
* ข้อมูลเริ่มต้นไม่เพียงพอ

ห้ามตีความ Inconclusive ว่า Astro Layer ล้มเหลวหรือสำเร็จโดยอัตโนมัติ

---

## 25. Risks and Guardrails

ความเสี่ยงและ guardrails:

* **Scope creep** — จำกัดหนึ่งโปรเจกต์ หนึ่งคำถาม หนึ่งรอบ
* **Confirmation bias** — บันทึกทั้งสิ่งที่ตรง ไม่ตรง ไม่ชัด และไม่เกี่ยวข้อง
* **False confidence** — ห้ามใช้ Astro Layer เป็นคำรับรองผล
* **Pilot selection bias** — ตรวจว่าคำถามเป็น decision จริง ไม่ใช่คำถามที่เลือกมาให้ framework ดูดี
* **Outcome attribution error** — ระวังการโยงผลลัพธ์ทุกอย่างเข้ากับ Astro Layer
* **Astrology vs ordinary strategy ambiguity** — ต้องมี Ordinary Strategy Comparison
* **Incomplete context** — บริบทไม่พอต้องหยุดหรือขอข้อมูลเพิ่ม
* **Decision substitution** — Final Decision ต้องเป็นของผู้ใช้
* **Privacy of personal context** — ใช้เฉพาะบริบทที่จำเป็นและได้รับอนุมัติ
* **Premature automation** — ห้ามขยับสู่ระบบอัตโนมัติในรอบนี้
* **Overfitting to one case** — ห้ามสรุปจาก Pilot เดียวว่า framework ใช้ได้กับทุกกรณี
* **Evidence quality** — แยกหลักฐานจริงออกจากความจำหรือความรู้สึกย้อนหลัง

---

## 26. Open Questions

1. Final Pilot Question และขอบเขตที่อนุมัติแล้ว ยังสะท้อนการตัดสินใจจริงเมื่อเริ่ม Execution หรือไม่?
2. Current Situation ของ Green Fineness Content Direction มีข้อมูลใดต้องเติมก่อนเริ่ม Pilot?
3. Video Studio ขนาดเล็กหมายถึงขนาดทดลองระดับใดจึงไม่กินทรัพยากรหลักเกินไป?
4. Existing Astro Context ที่ผ่านการทบทวนแล้วพร้อมใช้หรือยัง?
5. Outcome Evidence แบบใดจึงเพียงพอสำหรับการ Reflection?
6. หาก Ordinary Strategy Review ให้ข้อสรุปชัดอยู่แล้ว Astro Layer ควรถูกลดบทบาทอย่างไร?
7. Pilot ควร Continue, Adjust หรือ Stop ด้วยหลักฐานระดับใด?

---

## 27. Docs-only Constraints

เอกสารนี้ไม่มีและไม่อนุญาต:

* UI
* UX screen flow
* Wireframe
* Prototype
* Source code
* React component
* Route
* API
* Database
* Schema
* Migration
* Calculation logic
* Scoring algorithm
* Ephemeris
* AI agent implementation
* WorkOS integration
* Notification
* Deployment

---

## 28. Review Gates

Review Gates สำหรับเอกสาร 005:

1. **Source Alignment Gate** — สอดคล้องกับเอกสาร 001 ถึง 004
2. **Approved Foundation Gate** — ยึด UC-03, UC-04, UC-07 และ Green Fineness Content Direction
3. **Pilot Question Gate** — Final Pilot Question ได้รับ User Approval แล้ว โดยยังต้องผ่าน Context และ Option Gates ก่อนเริ่ม Execution
4. **Boundary Gate** — จำกัดหนึ่งโปรเจกต์ หนึ่งคำถาม หนึ่งรอบ
5. **Evaluation Gate** — มี Evaluation Dimensions และ Evaluation Scale แบบบรรยาย
6. **Astro Value Gate** — มี Astro Layer Value Review
7. **Baseline Gate** — มี Ordinary Strategy Comparison
8. **Stop / Inconclusive Gate** — มี stop, adjust, failure และ inconclusive conditions
9. **Docs-only Gate** — ไม่มี implementation scope

---

## 29. Exit Criteria

เอกสาร 005 ถือว่าพร้อมเข้าสู่ Content Review Gate เมื่อ:

1. มี Manual Pilot Definition ชัดเจน
2. Final Pilot Question อยู่ในสถานะ Approved by User
3. ระบุ Candidate Pilot Question Types อย่างน้อย 4 ประเภท
4. ระบุ Minimum Pilot Context และ Options Under Review
5. มี Manual Pilot Workflow 18 ขั้น
6. แยก Interpretation Layers ครบ 3 ชั้น
7. มี Evidence to Record
8. มี Evaluation Dimensions ครบอย่างน้อย 12 มิติ
9. ใช้ Evaluation Scale แบบ Clear / Partial / Unclear / Not Applicable เท่านั้น
10. มี Astro Layer Value Review และ Ordinary Strategy Comparison
11. มี User Approval Gates, Stop / Adjust Conditions และ Inconclusive Conditions
12. QA Document ได้สถานะ Passed
13. ไม่มีไฟล์อื่นถูกแก้ไขนอกจากเอกสาร 005 และ QA 005

---

## 30. Recommended Next Document

เอกสารถัดไปที่แนะนำ:

**ASTRO-REAL-APP-006 — Manual Pilot Execution Record & Review Template**

เอกสาร 006 ต้องยังเป็น docs-only และห้ามเริ่มจนกว่า:

* ASTRO-REAL-APP-005 ผ่าน QA
* Pilot Question ได้รับ User Approval
* Evaluation Plan ได้รับ User Approval
* เอกสาร 005 ถูก Commit แล้ว

---

## 31. Decision Record

* **Final Pilot Question**: Approved
* **Decision Type**: Small Experiment Decision
* **Boundary**: One storyboard / one workflow / one prototype clip
* **Knowledge Content**: Remains core work
* **Tool Boundary**: Use current tools first
* **Spending Boundary**: Define spending ceiling before purchasing tools
* **Production Boundary**: No continuous production commitment
* **Evaluation Outcome**: Continue / Adjust / Stop

---

## 32. Current Status

* **Document Status**: Approved / Docs-only / Ready for Stage
* **Pilot Question Approval**: Approved by User
* **Evaluation Plan Approval**: Approved by User
* **Content Review Gate**: Passed
* **Current State**: Ready for Stage
* **Decision Type**: Small Experiment Decision
* **Initial Pilot Boundary**: One storyboard / one workflow / one prototype clip
* **Main Work Protection**: Green Fineness Knowledge Content continues as the existing core work
* **Tool Boundary**: Use currently available tools first
* **Spending Boundary**: Define a spending ceiling before purchasing additional tools
* **Production Boundary**: No continuous production commitment in this Pilot
* **Docs-only Compliance**: Maintained
* **Next Step**: Stage Gate for Astro 005 only
