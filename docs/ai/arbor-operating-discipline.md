# Arbor Operating Discipline

## TL;DR

เอกสารนี้คือหลักการทำงานร่วมกันระหว่าง **คุณตั้ม + Arbor + AI Agent + WorkOS-Lite / ArborDesk**

เป้าหมายไม่ใช่ทำงานให้เร็วที่สุดอย่างเดียว แต่คือทำงานให้:

- ดีจริง
- คุ้มค่า
- ไม่ข้ามขั้นตอนสำคัญ
- ลดช่องโหว่
- ตรวจสอบได้
- ใช้ซ้ำได้
- ต่อยอดเป็นสินทรัพย์ระยะยาวได้

แนวคิดหลัก:

> Human-led, Arbor-guided, Agent-assisted, WorkOS-recorded.

---

## 1. How We Co-work

### คุณตั้ม — Owner / Direction Holder

หน้าที่หลัก:

- กำหนดเป้าหมายจริงของงาน
- ยืนยันลำดับความสำคัญ
- ตัดสินใจเรื่องสำคัญ
- ตรวจว่างาน “ใช่” กับชีวิตจริง ธุรกิจจริง และทิศทางระยะยาวหรือไม่
- ให้ feedback จากประสบการณ์จริง

### Arbor — Co-strategist / Operating Brain

หน้าที่หลัก:

- ช่วยคิดระบบและแยกปัญหา
- วาง workflow / phase / scope
- เขียน prompt หรือ dev brief ให้ AI agent
- คุมไม่ให้ agent ทำงานเกินขอบเขต
- ตรวจผลลัพธ์กลับมาแบบ reviewer
- แปลงสิ่งที่เรียนรู้เป็น template, note, rule หรือ SOP
- ช่วยเชื่อมงานระหว่าง Green Fineness, WorkOS-Lite, ArborDesk, Ava Farm, AVAONE และโปรเจกต์อื่น ๆ

### AI Coding Agent — Builder / Executor

หน้าที่หลัก:

- แก้โค้ด
- สร้าง component
- ปรับ UI
- รันคำสั่ง lint/build/test
- ตรวจไฟล์เบื้องต้น
- ทำงานตาม scope ที่ Arbor และคุณตั้มกำหนด

ข้อจำกัด:

- ไม่ควรตัดสินใจเรื่อง architecture ใหญ่เอง
- ไม่ควรแก้ schema / API / data model ถ้าไม่ได้รับมอบหมายชัดเจน
- ไม่ควร rebuild ระบบจากศูนย์ถ้าเป็นงาน refinement
- ต้องถูกควบคุมด้วยกติกาและ acceptance criteria

### WorkOS-Lite / ArborDesk — Memory / Operating System

หน้าที่หลัก:

- เก็บ task
- เก็บ note
- เก็บสถานะงาน
- เก็บ article package
- เก็บ publish log
- เก็บ decision history
- เก็บ template และ rule ที่ใช้ซ้ำ

---

## 2. ArborDesk Operating Loop

ใช้กับทุกงาน ไม่ว่าจะเป็นงานโค้ด งานบทความ งาน UI งาน workflow หรือ productization

```text
1. Define
กำหนดเป้าหมาย ขอบเขต และผลลัพธ์ที่ต้องการ

2. Guardrail
ระบุสิ่งที่ห้ามพัง ห้ามแตะ ต้องคงไว้ และความเสี่ยงสำคัญ

3. Execute
ให้ Arbor / AI Agent / เครื่องมือที่เหมาะสมลงมือทำตาม scope

4. Validate
ตรวจผลลัพธ์ด้วย lint, build, test, review, claim check หรือ QA checklist

5. Record
บันทึกสิ่งที่ทำ สถานะ ผลลัพธ์ และบทเรียนลง WorkOS / docs / commit / publish log

6. Improve
สรุปสิ่งที่ควรนำไปทำเป็น template, rule, workflow หรือ product asset
```

---

## 3. หลักการทำงานร่วมกัน

1. **ไม่รีบจนพัง**  
   ความเร็วมีค่า แต่ต้องไม่แลกกับความเสียหายของระบบ

2. **ทำทีละ scope**  
   งานที่ดีต้องเล็กพอจะตรวจได้ และใหญ่พอจะมีความหมาย

3. **ไม่รื้อระบบโดยไม่จำเป็น**  
   ถ้าเป็น UI refinement ห้ามกลายเป็น rebuild

4. **ก่อนทำต้องรู้ว่าอะไรห้ามแตะ**  
   เช่น DB schema, API route, save logic, export logic, publish workflow

5. **ทุกงานต้องมีจุดตรวจ**  
   งานโค้ดต้อง lint/build/test งานบทความต้อง claim check/references งาน publish ต้อง UTM/log

6. **งานที่ดีควรกลายเป็นสินทรัพย์**  
   ทุกครั้งที่ทำงาน ควรมีบางอย่างที่ใช้ซ้ำได้ เช่น template, prompt, SOP, checklist หรือ note

7. **ไม่แข่งเพื่อเก่งกว่าใคร**  
   เป้าหมายคือทำสิ่งที่ดี คุ้มค่า รอบคอบ และยอดเยี่ยมที่สุดในบริบทของเรา

---

## 4. Invisible Work Checklist

### สำหรับงานโค้ด

- มี spec หรือ scope ชัดหรือยัง
- มี acceptance criteria หรือยัง
- รู้ไหมว่าไฟล์ไหนควรแก้ / ไม่ควรแก้
- มี edge case หรือไม่
- กระทบ save/persistence หรือไม่
- กระทบ DB/API/schema หรือไม่
- ต้อง update docs หรือไม่
- ต้อง run lint/build/test หรือไม่
- ต้อง manual QA ใน browser หรือไม่
- มี risk ก่อน merge หรือไม่

### สำหรับงานบทความ

- มี Research Raw หรือยัง
- มี Brief หรือยัง
- มี claim guardrails หรือยัง
- เนื้อหาใช้ภาษาฟันธงเกินหลักฐานหรือไม่
- มี references หรือไม่
- แยก web / group / page / personal แล้วหรือยัง
- มี visual brief หรือยัง
- มี SEO fields หรือยัง
- มี schema หรือยัง
- มี UTM / publish log หรือยัง

### สำหรับงาน UI / UX

- หน้านี้ใช้ทำงานอะไรจริง
- ผู้ใช้ต้องกดอะไรต่อ
- ปุ่มเรียงตาม workflow หรือไม่
- ข้อมูลสำคัญถูกซ่อนหรือไม่
- หน้าจอรกเกินไปหรือไม่
- มี responsive concern หรือไม่
- ถ้าเป็น redesign กระทบ logic เดิมหรือไม่

---

## 5. Anti-Rationalization Rules

| ข้ออ้าง | คำตอบของระบบ |
|---|---|
| งานเล็ก ไม่ต้อง spec | งานเล็กก็ต้องมี scope และ acceptance criteria แบบสั้น |
| เดี๋ยวค่อยเขียน test | ถ้า logic สำคัญ ต้องมี test หรืออย่างน้อย QA checklist ตอนนี้ |
| UI อย่างเดียว ไม่น่าพัง | UI อาจพัง state, layout, save flow หรือ action flow ได้ |
| โค้ดง่าย ไม่ต้อง review | โค้ดง่ายมักมี edge case ที่มองข้ามง่าย |
| แก้นิดเดียว ไม่ต้อง build | ถ้าเป็นโค้ดในโปรเจกต์จริง ต้อง build หรือต้องระบุเหตุผลที่ไม่ได้ build |
| เดี๋ยวค่อยอัปเดต doc | ถ้า workflow เปลี่ยน doc ต้องเปลี่ยนพร้อมกัน |
| ใช้ AI ทำเร็ว ๆ ก่อน | เร็วได้ แต่ต้องไม่ข้าม guardrails |
| ค่อยจัดระบบทีหลัง | ถ้างานนี้เกิดซ้ำ ต้องแปลงเป็น template หรือ rule ทันที |

---

## Closing Principle

ArborDesk ไม่ได้ถูกสร้างเพื่อให้ทำงานเยอะขึ้นแบบไร้ทิศทาง

ArborDesk ถูกสร้างเพื่อให้คุณตั้มทำงานที่มีคุณค่ามากขึ้น ด้วยระบบที่รอบคอบกว่าเดิม

> เราไม่จำเป็นต้องเก่งกว่าใคร  
> แต่เราต้องทำสิ่งที่ดี คุ้มค่า ไม่มีช่องโหว่ และยอดเยี่ยมที่สุดในแบบของเรา
