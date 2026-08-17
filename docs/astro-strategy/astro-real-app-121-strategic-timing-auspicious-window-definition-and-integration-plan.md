# ASTRO-REAL-APP-121 — Strategic Timing & Auspicious Window Definition and Integration Plan

Status: Definition and integration plan only  
Working mode: Docs-only  
Implementation status: Not approved / not started

> **Reconciliation Status — Wave 1 Baseline Recovery**
>
> - Recovery Status: Historical artifact recovered into current reconciliation lineage
> - Current Authority: Candidate strategic timing baseline; runtime integration pending review
> - Original Provenance: feat/project-docs-sqlite-persistence @ 668d5beeccc03edd5157e15ea33e0f215b570936
> - Current-Lineage Review: **STRATEGIC_TIMING_REVIEW_REQUIRED** — compatibility with current runtime structures and Astro architecture pending
> - Note: Historical body is preserved unchanged. Prior design status does not automatically constitute current implementation authority.

## Objective and Boundary

กำหนดบทบาท ข้อมูลเชิงแนวคิด ผลลัพธ์ และจุดเชื่อมต่อของ **Strategic Timing & Auspicious Window — ฤกษ์และจังหวะเวลาเชิงยุทธศาสตร์** เพื่อช่วยประเมินวันหรือช่วงเวลาของเหตุการณ์สำคัญ แล้วแปลงผลให้เป็นแนวทางปฏิบัติที่ผู้ใช้ตรวจสอบและนำไปวางแผนได้

เอกสารนี้ไม่เปลี่ยน production code, route, UI, database schema หรือ persistence contract และไม่ implement ระบบคำนวณฤกษ์จริง

## 1. Module Definition

Strategic Timing เป็นชั้นวิเคราะห์ระหว่างข้อมูลดวง/เวลา กับระบบวางแผนและสะท้อนผลเดิม:

```text
Natal / Transit / Thai Timing / Chinese Metaphysics
                         ↓
             Strategic Timing Analysis
                         ↓
      Daily Brief / Weekly View / Event Assessment
                         ↓
              Strategic Planning Notes
                         ↓
                Reflection Log
                         ↓
              Reflection History
```

ชั้นความหมายต้องแยกจากกัน:

| Layer | หน้าที่ | สิ่งที่ห้ามสับสน |
| --- | --- | --- |
| คำอ่านเชิงดวง | อธิบายสัญญาณหรือบริบทจาก source layer | ไม่ใช่ข้อเท็จจริงหรือคำสั่ง |
| การประเมินเชิงเวลา | ประเมินความเหมาะสมของช่วงเวลาต่อกิจกรรมเฉพาะ | ไม่ใช่คำรับประกันผล |
| การตีความเชิงกลยุทธ์ | เชื่อมจังหวะกับเป้าหมาย ข้อจำกัด และความพร้อม | ไม่แทนการประเมินความเสี่ยงจริง |
| ข้อเสนอเชิงปฏิบัติ | บอกสิ่งที่ควรเตรียม ทำ ชะลอ หรือทบทวน | ต้องให้ผู้ใช้ยืนยันก่อนบันทึกหรือดำเนินการ |
| ข้อจำกัดของระบบ | แสดงข้อมูลที่ขาด ความขัดแย้ง confidence และ uncertainty | ห้ามทำให้ความแม่นยำดูสูงเกินหลักฐาน |

ระบบไม่รับประกันผลลัพธ์ ไม่ใช้ฤกษ์แทนข้อมูล ข้อเท็จจริง การตรวจเอกสาร หรือคำแนะนำด้านกฎหมาย การเงิน สุขภาพ และความปลอดภัย ช่วงเวลาที่ไม่ส่งเสริมไม่ใช่ข้อห้ามและต้องไม่ใช้ภาษาสร้างความกลัว หากเปลี่ยนวันไม่ได้ ระบบต้องช่วยปรับวิธีดำเนินงาน ลดขอบเขตการตัดสินใจ และเพิ่ม checkpoint ผู้ใช้เป็นผู้ตัดสินใจขั้นสุดท้ายเสมอ

## 2. Primary Use Cases

| Use case | เป้าหมาย | ข้อมูลขั้นต่ำ | ผลลัพธ์ที่ควรแสดง | ความเสี่ยงในการตีความ | Strategic Planning | Reflection Log |
| --- | --- | --- | --- | --- | --- | --- |
| UC-01 เลือกเวลาประชุม | เพิ่มความชัดเจนและความร่วมมือ | เป้าหมาย ผู้ร่วม เวลา/เขตเวลา ความยืดหยุ่น | window, agenda order, preparation, caution | เข้าใจว่าเวลาที่ดีแก้ agenda ที่ไม่พร้อมได้ | draft สิ่งที่ต้องเตรียมและ follow-up | บันทึกคุณภาพการฟัง ความชัดเจน และข้อตกลง |
| UC-02 เลือกเวลาเจรจา | รักษาอำนาจต่อรองและลดการตอบรับเร็วเกินไป | คู่เจรจา ความสัมพันธ์ เงื่อนไขสำคัญ reversibility | window, decision boundary, review period | ใช้ฤกษ์แทนข้อมูลเงื่อนไขหรือ leverage | draft ขอบเขตและ slow-down conditions | บันทึกการเปลี่ยนเงื่อนไข แรงกดดัน และผลจริง |
| UC-03 เลือกเวลาเดินทาง | ลดความเร่งรีบและรักษาพลังงาน | วัน เวลา เส้นทาง เขตเวลา ความยืดหยุ่น | travel window, buffer, preparation/recovery | มองข้ามสภาพอากาศ ตารางเดินทาง หรือความปลอดภัย | draft buffer และ next small action | บันทึก delay ความเหนื่อยล้า และปัจจัยภายนอก |
| UC-04 เลือกเวลาเริ่มโปรเจกต์ | เริ่มเมื่อ scope ทรัพยากรและเจ้าของงานพร้อม | เป้าหมาย ขอบเขต ผู้รับผิดชอบ วัน/เวลา constraints | readiness conditions, kickoff window, first checkpoint | เข้าใจว่า kickoff เท่ากับความสำเร็จของโครงการ | draft focus, owner และ review date | บันทึก readiness, scope drift และการส่งมอบแรก |
| UC-05 เลือกเวลานำเสนองาน | เพิ่มความพร้อม ความชัดเจน และการตอบคำถาม | ผู้ฟัง เป้าหมาย รูปแบบ เวลา decision importance | rehearsal/preparation window, presentation window, Q&A caution | ใช้ช่วงเวลาชดเชยเนื้อหาหรือหลักฐานไม่พอ | draft rehearsal และ evidence checklist | บันทึกคำถาม การตอบสนอง และ decision outcome |
| UC-06 เลือกเวลาลงนาม/ยืนยัน | ลดความผิดพลาดและคงพื้นที่ทบทวน | เอกสาร คู่สัญญา ผลผูกพัน reversibility เวลา | review window, signing conditions, items to defer | ใช้ฤกษ์แทน legal review | draft review items และ explicit decision gate | บันทึกว่ามีการตรวจเอกสาร/เปลี่ยนเงื่อนไขหรือไม่ |
| UC-07 ชำระ รับ หรือให้ยืมเงิน | ปกป้องสภาพคล่องและหลักฐาน | จำนวน/วัตถุประสงค์ แหล่งคืน เงินสำรอง เอกสาร third party | liquidity checks, transfer separation, review date | ใช้ฤกษ์อนุมัติธุรกรรมหรือเชื่อว่าคืนแน่นอน | draft guardrails, maximum acceptable loss, checkpoint | บันทึกการโอน หลักฐาน การคืน และผลต่อความสัมพันธ์ |
| UC-08 นัดหมายที่เปลี่ยนไม่ได้ | ดำเนินงานได้โดยลดความเสี่ยง | รายละเอียดนัด ข้อจำกัด เป้าหมาย สิ่งที่ต้องตัดสินใจ/โอน/ลงนาม | fixed-mode sequence, limits, checkpoints, written note | ตีความ caution เป็นเหตุให้ยกเลิกโดยไม่จำเป็น | draft agenda, decision boundary และ follow-up | บันทึกว่ามาตรการใดช่วยหรือไม่ช่วย |

## 3. Event Input Model

นี่คือ conceptual model ไม่ใช่ TypeScript type หรือ database schema

### Required or minimum-context fields

- Event title และ Event category
- Date, approximate start time และ approximate end time
- Time flexibility และ whether the appointment can be changed
- Location, timezone และ Online / On-site
- Participants และ relationship context โดยเก็บเท่าที่จำเป็น
- Financial involvement และ whether money will be transferred during the event
- Decision importance, reversibility และ whether a final decision is required during the event
- User objective และ known constraints
- Whether documents or contracts are involved

`Time flexibility` ใช้ค่าต่อไปนี้:

- `Fully flexible`
- `Date fixed, time flexible`
- `Date and time fixed`
- `Approximate window only`
- `Unknown`

หากเวลา เขตเวลา เป้าหมาย หรือข้อจำกัดสำคัญไม่ครบ ระบบต้องลด confidence และบอกข้อมูลที่ต้องเติม ห้ามสมมติความแม่นยำเอง

## 4. Event Categories

| Category | น้ำหนักการประเมินเฉพาะกิจกรรม |
| --- | --- |
| Meeting | ความชัดเจน การฟัง ความร่วมมือ agenda และ follow-up |
| Negotiation | อำนาจต่อรอง ความขัดแย้ง เงื่อนไขที่เปลี่ยนได้ และการไม่รีบยอมรับ |
| Presentation | ความพร้อมของเนื้อหา/หลักฐาน ความชัดเจน การตอบคำถาม และ audience readiness |
| Project Start | scope ทรัพยากร owner dependencies และ checkpoint แรก |
| Travel | buffer time ความเหนื่อยล้า timezone ความปลอดภัย และความเสี่ยงจากการเร่งรีบ |
| Signing | ความพร้อมของข้อมูล ผลผูกพัน legal review reversibility และโอกาสทบทวน |
| Payment | ความถูกต้อง เอกสาร สภาพคล่อง ผู้รับ และความย้อนกลับได้ |
| Lending / Borrowing | แหล่งเงินคืน dependency ความสัมพันธ์ สภาพคล่อง และ maximum acceptable loss |
| Collection / Debt Follow-up | หลักฐาน ลำดับการสื่อสาร ความเป็นไปได้ของแผนคืน และ escalation boundary |
| Authority Contact | รูปแบบการสื่อสาร ลำดับขั้น หลักฐาน ผู้มีอำนาจตัดสินใจ และ follow-up protocol |

เหตุการณ์ที่มีหลายกิจกรรมเสี่ยงสูง เช่น ประชุม + ลงนาม + โอนเงิน ควรแยกการประเมินและ checkpoint แม้เกิดวันเดียวกัน

## 5. Timing Result Model

ผลลัพธ์ไม่ใช้คะแนนตัวเลขเดี่ยวโดยไม่มีคำอธิบาย และแบ่งเป็น:

- **A. Supportive Window:** เหมาะกับกิจกรรมหลักภายใต้ความพร้อมจริง
- **B. Usable with Conditions:** ทำได้เมื่อปฏิบัติตามเงื่อนไขลดความเสี่ยง
- **C. Caution Window:** ควรจำกัดขอบเขต ชะลอการตัดสินใจบางชนิด หรือเพิ่ม review
- **D. Recovery / Preparation Window:** เหมาะกับเตรียมข้อมูล ทบทวน พัก หรือจัดระบบมากกว่าการตัดสินใจภายนอก

ทุก window ต้องมี:

- Window label, start time และ end time พร้อม timezone
- Suitability level
- Suitable activities และ activities to defer
- Risk note
- Preparation recommendation และ decision recommendation
- Confidence level และ explanation of uncertainty
- Source layers used
- Practical constraints

Confidence อธิบายเชิงคุณภาพ เช่น `Higher context`, `Moderate context`, `Limited context` พร้อมเหตุผล ไม่เท่ากับโอกาสสำเร็จและไม่ควรแปลงเป็นคำรับประกัน

## 6. Fixed Appointment Mode

เมื่อเปลี่ยนวัน/เวลาไม่ได้ ระบบเปลี่ยนจาก “เลือกเวลา” เป็น “ออกแบบวิธีดำเนินงาน” และต้องตอบ:

1. เปิดการสนทนาด้วยบริบทและเป้าหมายใด
2. เรื่องใดคุยก่อนเพื่อสร้างข้อเท็จจริงร่วม
3. เรื่องใดคุยภายหลังเมื่อข้อมูลพร้อม
4. เรื่องใดไม่ควรตัดสินใจทันที
5. ควรเว้นเวลาทบทวนเท่าใด โดยระบุว่าเป็นคำแนะนำตามความเสี่ยง ไม่ใช่กฎตายตัว
6. ต้องเตรียมข้อมูลหรือเอกสารใด
7. ควรมีผู้ร่วมตรวจสอบ เช่น legal/accounting/เจ้าของงาน หรือไม่
8. กำหนด follow-up checkpoint เมื่อใด
9. ควรแยกการสนทนาจากการโอนเงินหรือการลงนามหรือไม่
10. ต้องมี written acknowledgement หรือ meeting note หรือไม่

```text
วันที่เปลี่ยนไม่ได้
→ ปรับลำดับกิจกรรม
→ จำกัดขอบเขตการตัดสินใจ
→ เพิ่ม checkpoint
→ แยกการพูดคุยออกจากการยืนยัน
→ บันทึกข้อตกลงเป็นลายลักษณ์อักษร
```

## 7. Integration with Daily Timing Brief

Daily Timing Brief แสดง **Summary Card เท่านั้น** ไม่ทำซ้ำ Event Assessment แบบเต็ม:

- Today’s dominant timing theme
- Best general window
- Caution window
- Recommended action
- Decision caution
- Recovery anchor
- Link to detailed Strategic Timing view

```text
ฤกษ์และจังหวะวันนี้

จังหวะเด่น:
ช่วงเวลาส่งเสริม:
ช่วงใช้งานได้แบบมีเงื่อนไข:
ช่วงควรชะลอ:
สิ่งที่เหมาะจะทำ:
สิ่งที่ยังไม่ควรรีบตัดสินใจ:
```

Summary ต้องใช้ metadata/fallback และ safety language ของ Today เดิม ไม่ขยายหน้า Daily ให้ยาว และไม่แทนผลประเมินเหตุการณ์เฉพาะ

## 8. Integration with Weekly Timing View

Weekly View เป็นระดับเปรียบเทียบรายวัน ส่วน Strategic Timing วิเคราะห์เหตุการณ์และช่วงเวลาโดยละเอียด แนวคิด `Weekly Opportunity Map` ควรเปรียบเทียบวันที่เหมาะกับ:

- นัดหมาย, Deep Work, เจรจา, การเงิน, เดินทาง และเริ่มโปรเจกต์
- พัก/ทบทวน
- วันที่มีความเสี่ยงจาก Context Switching

Map ต้องแสดงเหตุผลย่อและ uncertainty ไม่ทำให้สีหรือ ranking กลายเป็นคำตัดสินเด็ดขาด การเลือกวันจาก Weekly จึงค่อยเปิด Event Assessment พร้อมข้อมูลวันที่แบบ draft

## 9. Integration with Strategic Planning Notes

Strategic Planning Notes เดิมยังเป็นพื้นที่แผนงานหลัก Strategic Timing ไม่สร้าง planner ใหม่ และแปลคำแนะนำเป็น draft mapping:

| Existing field | Draft content |
| --- | --- |
| Focus Next | สิ่งสำคัญที่เหมาะทำในจังหวะถัดไป |
| Slow Down | สิ่งที่ไม่ควรรีบตัดสินใจหรือควรเพิ่มเงื่อนไข |
| Next Small Action | การเตรียมข้อมูล เอกสาร หรือการติดต่อขั้นแรก |
| Review Later | เรื่องและ checkpoint ที่ต้องกลับมาทบทวน |

ข้อกำหนด integration:

- แสดง preview ก่อนส่ง และให้ผู้ใช้แก้ไขได้
- ค่าเริ่มต้นเป็น suggestion/draft
- ห้ามเขียนทับข้อความเดิมอัตโนมัติ
- เมื่อมีข้อมูลเดิม ให้ใช้ append-only หรือ explicit confirmation ที่ระบุ destination ชัดเจน
- การ cancel ต้องไม่เปลี่ยน Planning Notes
- implementation ภายหลังต้องรักษา hydration/autosave contract เดิม

## 10. Integration with Reflection Log

หลังเหตุการณ์ ระบบเตรียม Reflection Entry แบบ draft และให้ผู้ใช้ตรวจสอบก่อนบันทึกลง Reflection Log / Reflection History เดิม ไม่สร้าง history ใหม่ โดย prompt ครอบคลุม:

- เหตุการณ์เกิดใน window ที่ประเมินหรือไม่ และผลจริงเป็นอย่างไร
- มีความขัดแย้งหรือเงื่อนไขเปลี่ยนหรือไม่
- การตัดสินใจเกิดภายใต้ความเร่งรีบหรือไม่
- คำแนะนำใดช่วยได้จริง/ไม่สอดคล้อง
- ปัจจัยภายนอกใดที่ระบบไม่ทราบ
- ผู้ใช้มีข้อมูลและพลังงานเพียงพอหรือไม่
- มีการรับปาก ลงนาม หรือโอนเงินเกินขอบเขตหรือไม่
- ครั้งต่อไปควรปรับอะไร

Draft ควรแนบ event reference, assessed window, source summary และ capture time เท่าที่จำเป็น ข้อมูล history เก่าที่ยังไม่มี timing context ต้องอ่านได้ตามเดิม

## 11. Personal Learning Loop

```text
Prediction
→ Event
→ Observation
→ Reflection
→ Pattern Review
→ Future Adjustment
```

แยกสถานะความรู้เป็น:

- **Observed pattern:** สิ่งที่เกิดและสังเกตได้
- **User interpretation:** ความหมายที่ผู้ใช้ให้กับเหตุการณ์
- **System hypothesis:** สมมติฐานเพื่อทดสอบต่อ ยังไม่ใช่ข้อสรุป
- **Confirmed recurring pattern:** รูปแบบที่เกิดซ้ำ มีบริบทเพียงพอ และผู้ใช้ยืนยัน

V1 ไม่ปรับน้ำหนักอัตโนมัติจากเหตุการณ์ไม่กี่ครั้ง และไม่ใช้เหตุการณ์เดียวพิสูจน์ว่าการพยากรณ์ถูกหรือผิดทั้งหมด

## 12. Source Layer Model

ชั้นข้อมูลที่อาจใช้ในอนาคต:

- Birth profile
- Thai astrology timing
- Thai lunar calendar
- Planetary transit
- Chinese metaphysics
- Day and hour quality
- Personal cycle
- Event category
- Practical constraints
- User energy and readiness
- Historical reflections

ทุกผลต้องแสดง `Source layers used`, ข้อมูลที่ขาด, confidence และ uncertainty การรวมหลายศาสตร์ต้องไม่สร้างภาพความแม่นยำเกินหลักฐาน และข้อมูลเชิงดวงต้องไม่อยู่เหนือข้อเท็จจริงด้านกฎหมาย การเงิน สุขภาพ หรือความปลอดภัย

## 13. Conflict Resolution

ลำดับความสำคัญ:

1. Safety and legal constraints
2. Financial and contractual facts
3. Practical readiness
4. Event objective
5. Personal energy and health
6. Timing interpretation
7. Symbolic or reflective layers

ระบบต้องแสดง conflict note แยก source ที่สนับสนุน/เตือนและผลต่อกิจกรรม เช่น วันเหมาะประชุมแต่เอกสารไม่พร้อมลงนาม หรือ timing สนับสนุนแต่ผู้ใช้พักไม่พอ ห้ามรวมทุกศาสตร์เป็นคะแนนเดียวที่ซ่อนเหตุผล ผลที่เหมาะสมอาจเป็น `Usable with Conditions` พร้อมแยก “คุยได้” ออกจาก “ยังไม่ลงนาม/โอน”

## 14. Lending and Financial Decision Guardrails

ใช้กับการให้ยืม ยืม ค้ำประกัน ลงทุนร่วม สำรองเงินให้คู่ค้า/เพื่อน ใช้เงินส่วนตัวช่วยธุรกิจ โอนก่อนมีเอกสาร และเงินก้อนที่ทับกับค่าเดินทางหรือค่าใช้จ่ายจำเป็น

ระบบห้ามใช้ฤกษ์เป็นเหตุผลหลักในการอนุมัติหรือปฏิเสธ และต้องตรวจ/เตือน:

- Liquidity protection, essential expense reserve, travel budget protection และ emergency reserve
- Repayment source, repayment dependency และกรณีพึ่งคู่ค้าหรือบุคคลที่สาม
- Written acknowledgement, review date และหลักฐานธุรกรรม
- Maximum acceptable loss และความสามารถรับความล่าช้า
- Relationship and business separation
- Reversibility และสิทธิ/กระบวนการตรวจสอบ
- ควรแยกการประชุม การยืนยัน การลงนาม และการโอนหรือไม่

หากการคืนเงินขึ้นกับบุคคลที่สาม ต้องบอกชัดว่าความเสี่ยงไม่ได้อยู่ในการควบคุมของผู้ยืมทั้งหมด หากข้อมูลสภาพคล่อง เอกสาร หรือแหล่งคืนไม่ครบ ผลต้องชะลอการตัดสินใจทางการเงิน ไม่ใช่ชดเชยด้วย supportive timing

## 15. UI Information Architecture (Concept Only)

ชื่อเมนูเสนอ: **🕰 ฤกษ์และจังหวะเวลา — Strategic Timing** ใกล้ Daily Timing Brief, Weekly Timing View และ Monthly Strategy

หน้าหลักเชิงแนวคิด:

1. Today Timing Summary
2. Event Assessment Form
3. Timing Windows
4. Fixed Appointment Guidance
5. Strategic Action Translation
6. Save to Strategic Planning
7. Prepare Reflection Entry

เนื่องจาก navigation ปัจจุบันมีหลายรายการ ควรพิจารณา subview/grouping ก่อนเพิ่ม top-level item การตัดสินใจนี้ยังเปิดอยู่ เอกสารนี้ไม่กำหนด component, CSS, layout หรือ production UI

## 16. V1 Scope

V1 ที่เสนอรองรับ:

- Event input, category, date, approximate time และ timezone
- Flexible / fixed appointment
- Supportive / usable / caution / recovery windows พร้อมคำอธิบาย
- Strategic recommendations และ Fixed Appointment Guidance
- Local save แบบ local-first โดยต้องออกแบบ contract แยกและอนุมัติก่อน implementation
- Preview แล้วส่ง recommendation draft ไป Strategic Planning
- สร้าง Reflection Log draft หลัง event โดยผู้ใช้ยืนยันก่อนบันทึก
- Source layer summary, confidence และ uncertainty explanation

## 17. Explicit Non-Goals

V1 ยังไม่ทำ:

- Notification automation หรือ post-event reminder automation
- Calendar sync, Google Calendar write หรือ automatic rescheduling
- Full electional astrology engine หรือ minute-level astronomical precision
- Automatic financial/lending/investment approval หรือ score
- Gambling/lottery recommendation หรือ lottery number generation
- Automatic prediction accuracy claims หรือ personal model retraining
- Database migration, multi-user sharing หรือ public horoscope publishing
- Automatic overwrite ของ Strategic Planning หรือ automatic save ของ Reflection Log
- Automatic transfer/payment action

## 18. Data Ownership and Privacy

- Event, reflection และข้อมูลการเงินเป็นข้อมูลส่วนตัว; participant อาจเป็นข้อมูลบุคคลอื่น
- V1 ควร local-first และเก็บเท่าที่จำเป็น (data minimization)
- ควรเก็บ relationship context แทน identity รายละเอียดสูงเมื่อเพียงพอ
- ห้ามส่งข้อมูลการเงินออกภายนอกโดยไม่แจ้งและขอ explicit confirmation
- ผู้ใช้ต้องดู แก้ export และลบข้อมูลของตนได้
- แยก personal reflection ออกจากข้อความเผยแพร่
- การ export หรือเชื่อมระบบอื่นต้อง preview destination และให้ผู้ใช้ยืนยัน
- retention และ deletion behavior ต้องนิยามก่อน implementation

## 19. Future Expansion

หลัง V1 และผ่าน review gate อาจพิจารณา:

- Calendar integration และ upcoming event review
- Travel timing และ timezone-aware travel planning
- Meeting preparation checklist และ contract review checkpoint
- Project launch timing
- Personal pattern calibration และ recurring relationship pattern review
- Notification before caution windows
- WorkOS-Lite project task integration
- Multi-event/candidate-date comparison และ event sequence planning
- Post-event review reminders

ทุกข้อเป็น future option ไม่ใช่ commitment และต้องมี scope/consent/privacy review แยก

## 20. Open Questions Before Implementation

1. Strategic Timing เป็นแท็บหลักหรือ subview ของ Daily Timing
2. ต้องใช้ข้อมูลเวลาเกิดละเอียดระดับใด
3. V1 ต้องรองรับ timezone อื่นเพียงใด
4. Event หนึ่งมีหลายกิจกรรมย่อยหรือควรแยก event
5. ประชุม ลงนาม และโอนเงินวันเดียวกันต้องแยก assessment อย่างไร
6. retention และ deletion ของ assessment เป็นอย่างไร
7. confidence explanation ใช้ vocabulary ใด
8. Reflection Log มีบทบาทต่อคำแนะนำอนาคตโดยไม่ auto-retrain อย่างไร
9. เกณฑ์ใดถือเป็น high-stakes decision
10. ต้องมี manual override และ audit note หรือไม่
11. เปรียบเทียบ candidate dates ได้กี่วัน
12. เก็บ participant identity หรือ relationship context เท่านั้น
13. ผู้ใช้เลือก source layer เองได้หรือไม่
14. แสดงเวลาระดับชั่วโมงหรือช่วงกว้างตาม confidence
15. ส่ง Planning draft แบบ merge หรือ append; เมื่อใดต้อง explicit confirmation เพิ่ม

## Integration Contract Summary

```text
Timing Analysis
→ Daily / Weekly
→ Strategic Planning
→ Reflection Log
→ Reflection History
```

หลัก gate คือ analysis อ่าน context ที่จำเป็น, Daily/Weekly แสดงสรุปหรือเปรียบเทียบ, Planning รับเฉพาะ draft ที่ผู้ใช้ตรวจ, Reflection รับ draft หลังเหตุการณ์ และ History ใช้ระบบเดิมเท่านั้น ไม่มี automatic overwrite หรือระบบข้อมูลซ้ำ

## Implementation Gate

ก่อน implementation ต้องอนุมัติอย่างน้อย: navigation placement, event contract, local persistence key/envelope/hydration/fallback, confidence language, high-stakes rules, retention/deletion และ merge/append behavior งาน ASTRO-REAL-APP-121 หยุดที่ definition and integration plan นี้
