# Article-to-WorkOS Import Package Specification (workos-arbor-import-v0.1)

เอกสารระบุข้อกำหนดมาตรฐานในการสร้างโครงสร้างข้อมูล (JSON payload) จาก Arbor / ChatGPT เพื่อนำเข้าสู่ระบบความจำและการจัดเก็บของ WorkOS-Lite / ArborDesk ผ่านอินเทอร์เฟซ **Arbor Inbox**

---

## 1. วัตถุประสงค์ (Purpose)
เพื่อกำหนดข้อตกลงร่วมกัน (Protocol) ระหว่าง AI Agent (Arbor/ChatGPT) และระบบ WorkOS-Lite ในการส่งต่อข้อมูลที่มีโครงสร้าง (Structured Data) เช่น บทความที่เขียนเสร็จแล้ว, แผนการทำโครงการ (Project Brief), ปฏิทินคอนเทนต์ (Content Plan) หรือชุดรายการงานที่รอคิว (Backlog) เข้าสู่ระบบอย่างรวดเร็ว ปลอดภัย และไร้ความผิดพลาด

---

## 2. รูปแบบแพ็กเกจที่รองรับ (Supported Package Types)
มาตรฐานนี้รองรับประเภทข้อมูลนำเข้าหลัก 4 รูปแบบ ดังนี้:

1. **Green Fineness Article Package**
   - แพ็กเกจนำเข้าบทความคอนเทนต์ของ Green Fineness ประกอบด้วยเอกสารเนื้อหาบทความหลัก (`article_note`) และชุดรายการงานย่อยอีก 7 รายการที่ต้องดำเนินการตามขั้นตอนการตลาดและการตรวจสอบ
2. **Project Brief Package**
   - แพ็กเกจสำหรับจัดตั้งโครงการใหม่ ประกอบด้วยตัวโครงการ (`project`), โน้ตรายละเอียดโครงการ/เป้าหมายขอบเขตงาน (`note`) และงานขั้นตอนแรกเริ่ม (Initial Tasks)
3. **Content Plan Package**
   - แพ็กเกจสำหรับปฏิทินงานหรือแผนงานเนื้อหาเป็นงวด ๆ ประกอบด้วยโครงการหลัก และโน้ตบันทึกไอเดีย/หัวข้อบทความหลายรายการเพื่อเตรียมหยิบไปเขียน
4. **Backlog / Task Set Package**
   - แพ็กเกจนำรายการงาน (Tasks) จำนวนมากเข้าสู่โครงการที่มีอยู่แล้วในระบบเพื่อขยายขอบเขตการติดตามความคืบหน้า

---

## 3. โครงสร้างแพ็กเกจข้อมูลแต่ละประเภท (Package Structures)

### 3.1 Green Fineness Article Package Structure
ต้องนำเสนอข้อมูลครบถ้วนทั้งตัวบทความและกระบวนการทำงานย่อย (Marketing/Editorial Steps) ประกอบด้วย:
- **`project` (1 รายการ)**: โครงการเนื้อหาปลายทาง เช่น "Green Fineness Content"
- **`article_note` (1 รายการ)**: จัดเก็บเนื้อหาหลักของบทความ, ข้อมูลนักเขียน, Pillar, Stage และความพยายามทางการตลาด
- **`task` (7 รายการ)**: บังคับประกอบด้วย 7 ส่วนงานเหล่านี้:
  1. *Claim Review*: ตรวจสอบความถูกต้องและข้อเท็จจริงทางการแพทย์/โภชนาการ
  2. *Image Brief*: คำสั่งจ้างงานกราฟิกและภาพประกอบ
  3. *SEO / Website Fields*: รวบรวม Keyword, Title, Description
  4. *Facebook Group Post*: ข้อเขียนสำหรับเผยแพร่ในกลุ่ม Facebook
  5. *Page Post*: ข้อเขียนสำหรับแชร์บนแฟนเพจ
  6. *Personal Post*: ข้อเขียนสำหรับโพสต์ผ่านโปรไฟล์ส่วนตัว
  7. *Analytics Tracking*: ตัวบ่งชี้ประเมินผลการเข้าชม

### 3.2 Project Brief Package Structure
เน้นที่การจัดตั้งและประกาศเป้าหมายโครงการใหม่:
- **`project` (1 รายการ)**: ระบุชื่อโครงการเป้าหมาย
- **`note` (1 รายการ)**: บันทึกข้อมูลข้อตกลงโครงการ (Brief / Scope / Deliverables / OKRs)
- **`task` (หลายรายการ)**: งานขั้นแรกเพื่อมอบหมายทีมงานหรือเตรียมระบบ

### 3.3 Content Plan Package Structure
เน้นการขยายฐานเนื้อหาและการจัดระเบียบคอนเทนต์:
- **`project` (1 รายการ)**: เชื่อมโยงโครงการหลัก
- **`note` (หลายรายการ)**: รวบรวมเนื้อหาบทความย่อยตามแผนงาน (บทความหลัก, คำถามที่พบบ่อย, เอกสารอ้างอิง)
- **`task` (หลายรายการ)**: งานเตรียมเขียนคิวหรือประสานงานทีมกราฟิก

### 3.4 Backlog / Task Set Package Structure
เน้นการโหลดชุดงานจำนวนมาก:
- **`task` (หลายรายการ)**: รายการงานที่มีสถานะ 'inbox' หรือ 'planned' เพื่อนำเข้าสู่ระบบความจำโครงการ

---

## 4. Field Mapping ไปยัง Schema `workos-arbor-import-v0.1`

การแมปฟิลด์ JSON จากมาตรฐานนำเข้าเข้าสู่คุณสมบัติของฐานข้อมูลระบบ มีข้อกำหนดดังนี้:

| JSON Field (Item Level) | Target Type | Database Destination | Mapping Logic / Transformation Rule |
| :--- | :--- | :--- | :--- |
| **`title`** | `project` | `projects.name` | บันทึกเป็นชื่อโครงการโดยตรง |
| **`status`** | `project` | `projects.status` | เช็กสถานะให้อยู่ในกลุ่ม `inbox`, `planned`, `done` เท่านั้น |
| **`title`** | `note` / `article_note` | `notes.title` | บันทึกชื่อโน้ต หากชื่อซ้ำจะต่อท้ายด้วย Timestamp อัตโนมัติ |
| **`content`** | `note` / `article_note` | `notes.plain_text` / `content_html` | แปลง markdown หรือ plain text เป็นโครงสร้างย่อยของ Tiptap HTML/JSON |
| **`targetProject`** | `note` / `task` / `article_note` | `notes.project_id` / `tasks.title` | แปลงชื่อโครงการเป็น Slug ID ปลายทาง และใช้เติม prefix ใน Task Title |
| **`title`** | `task` | `tasks.title` | แปลงเป็นรูปแบบ `project:<project-slug> <title>` ในฐานข้อมูลโดยอัตโนมัติ |
| **`status`** | `task` | `tasks.status` | เช็กสถานะให้อยู่ในกลุ่ม `inbox`, `planned`, `in_progress`, `review`, `done` |
| **`workspace`** | `task` | `tasks.workspace` | นำค่าเข้าฟังก์ชัน `normalizeWorkspace` หากไม่มีให้ fallback เป็น `"personal"` |
| **`nextActions`** | `article_note` | `notes.plain_text` | เขียนสรุปรายการงานต่อท้ายลงในเนื้อหา Plain text / HTML ของ Note |
| **`metadata`** | `article_note` | `notes.plain_text` | เขียนข้อมูลคู่ของ Key-Value ต่อท้ายลงในเนื้อหา Plain text / HTML ของ Note |

---

## 5. กฎความปลอดภัยและการนำเข้า (Safety Rules)

เพื่อให้เกิดเสถียรภาพสูงสุดในการใช้งานร่วมกับ AI:
1. **Append-Only Action**: ระบบจะทำหน้าที่ "บันทึกต่อท้าย" เท่านั้น ห้ามลบข้อมูลเก่า Merging หรือ Overwrite ข้อมูลเดิมโดยเด็ดขาด
2. **Project Creation Guard**: โครงการที่มีชื่อหรือ Slug ซ้ำในฐานข้อมูลจะถูกมองข้าม (Skip) การสร้าง โดยไม่บันทึกทับโครงการเก่า และจะผูกโน้ต/งานปลายทางเข้ากับ ID ของโครงการเก่าทันที
3. **Validation Lock**: ข้อมูลที่ส่งเข้ามาทั้งหมดจะต้องผ่านการตรวจสอบ Syntax JSON, ตรวจทาน version, ตรวจทานประเภทไอเทม และตรวจสอบว่ามีเป้าหมายโครงการ (`targetProject`) พร้อมรองรับอย่างถูกต้อง หากไม่ครบถ้วนหน้าจอ Preview จะปฏิเสธการนำเข้าและแสดง Error ทันที
4. **No Merging**: หากนำเข้าแพ็กเกจเดิมซ้ำ ข้อมูล Notes และ Tasks เดิมจะถูกสร้างขึ้นมาใหม่เป็นรายการใหม่ทั้งหมด (โดย Notes จะเปลี่ยนชื่อเพื่อไม่ให้ทับซ้อน) ผู้เขียนต้องเป็นผู้จัดระเบียบเอง

---

## 6. Prompt สำหรับส่งให้ Arbor / ChatGPT เตรียม Payload

เมื่อต้องการให้ AI สร้าง JSON Payload นำเข้าข้อมูล ให้คัดลอกคำสั่งควบคุม (System Prompt) ด้านล่างส่งต่อให้ AI:

```markdown
คุณคือ Arbor Assistant หน้าที่ของคุณคือการอ่านข้อมูลและเปลี่ยนรายละเอียดดังกล่าวให้เป็นไฟล์ JSON Payload มาตรฐาน `workos-arbor-import-v0.1` เพื่อพร้อมนำเข้าสู่ Arbor Inbox โดยตรง

กฎเหล็กในการสร้าง JSON:
1. ห้ามใส่ Comment ทุกชนิด (เช่น // หรือ /*)
2. ห้ามใส่ Trailing Comma ท้าย Object หรือ Array
3. ใช้ฟิลด์บังคับในระดับบนสุด: "schemaVersion" (ค่าเป็น "workos-arbor-import-v0.1"), "source" (แหล่งที่มาของคุณ), "importBatchTitle" (ชื่อชุดนำเข้า) และ "items" (Array รายการนำเข้า)
4. ประเภทไอเทม (items[].type) ต้องเป็นหนึ่งในสี่ตัวนี้เท่านั้น: "project", "note", "task", "article_note"
5. สำหรับ item "task" บังคับกำหนด "targetProject", "title", "status" (ค่าเป็น inbox, planned, in_progress, review, done) และ "workspace" (ค่าเป็น content, travel, personal, admin, inbox, finance, marketing, system, other)
6. สำหรับ item "note" บังคับกำหนด "targetProject", "title", "content"
7. สำหรับ item "article_note" บังคับกำหนด "targetProject", "title", "status", "content" และสามารถระบุ "nextActions" (Array สตริง) และ "metadata" (Object) เพิ่มได้
8. รูปแบบชื่อของรายการ Task สำหรับงานเนื้อหาให้ใช้รูปแบบ: "GF Article — [ชื่อขั้นตอนย่อย]: [ชื่อบทความ]"
```

---

## 7. ข้อมูลตัวอย่าง (Examples)

ตัวอย่างไฟล์ JSON นำเข้าที่พัฒนาขึ้นตามมาตรฐาน:
- **Green Fineness Article Package**: [gf-article-import-example.json](file:///Users/tamz/projects/workos-lite/docs/arbor/examples/gf-article-import-example.json)
- **Project Brief Package**: [project-brief-import-example.json](file:///Users/tamz/projects/workos-lite/docs/arbor/examples/project-brief-import-example.json)

---

## 8. คู่มือการตรวจสอบสำหรับ AI (QA Checklist for AI)

ก่อนส่งมอบ JSON Payload ให้ผู้ใช้ปลายทางไปรันนำเข้าใน Arbor Inbox เสมอ ให้ตรวจทานเงื่อนไขเหล่านี้:
- [ ] 1. โครงสร้างเป็น Valid JSON 100% (ทดลองประเมินผ่าน parser)
- [ ] 2. ไม่มีเครื่องหมายจุลภาคเกินท้ายแถว (No trailing commas)
- [ ] 3. ฟิลด์ `schemaVersion` มีค่าเท่ากับ `"workos-arbor-import-v0.1"` พอดี
- [ ] 4. มีการประกาศสร้าง `project` ก่อนที่จะสร้าง `note`/`task` ที่พาดพิงโครงการนั้น ๆ ในชุดข้อมูลเดียวกัน
- [ ] 5. โครงการเป้าหมายในฟิลด์ `targetProject` สะกดตรงกันในทุกไอเทม (Case-sensitive)
- [ ] 6. ทุก ๆ รายการ `task` มีฟิลด์ `workspace` ที่สะกดถูกต้องตรงตามระบบ
- [ ] 7. (สำหรับบทความ Green Fineness) มี Task ครบถ้วนทั้ง 7 รายการด้วยรูปแบบหัวข้อที่ถูกต้อง
