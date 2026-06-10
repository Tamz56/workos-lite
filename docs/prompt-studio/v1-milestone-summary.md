# Prompt Studio v1 Milestone Summary & Regression QA Checklist

เอกสารสรุปความคืบหน้าทางเทคนิค รายการทรัพยากรระบบ (Technical Inventory) รายการตรวจสอบการทดสอบการถดถอย (Regression QA Checklist) และแผนพัฒนาขั้นต่อไป (Future Backlog) ของระบบ **Prompt Studio v1**

---

## 1. Completed Modules Summary (สรุปโมดูลที่พัฒนาแล้ว)

ระบบ Prompt Studio v1 ได้รับการพัฒนาและทดสอบครบถ้วนตาม Milestone ทั้งหมด 6 โมดูล ดังนี้:

* **PROMPT-STUDIO-001 — Prompt Template Studio MVP**
  * **เป้าหมาย**: สร้างระบบจัดการเทมเพลตสำหรับเขียน Prompt โดยแบ่งส่วนโครงสร้างออกเป็น System Prompt, Template Structure และ Constraints พร้อมรองรับการบันทึกจัดเก็บลง SQLite
* **PROMPT-STUDIO-002 — Compiled Prompt with User Input**
  * **เป้าหมาย**: แสดงผลการ Compile ในแผงแสดงผลด้านขวา โดยดึงตัวแปรในวงเล็บปีกกา `{var}` มาสร้างเป็นแบบฟอร์มให้กรอกข้อมูลแบบเรียลไทม์ และผสานข้อความรวมเป็น Prompt ที่พร้อมใช้งาน
* **PROMPT-STUDIO-003 — Human-friendly Input Field Builder**
  * **เป้าหมาย**: พัฒนาเครื่องมือสร้างฟิลด์อินพุตที่มีความยืดหยุ่นสูง รองรับฟิลด์หลายแบบ (Text, Textarea, Select Option) พร้อมกำหนด Label และ Placeholder ได้อย่างเป็นระบบ
* **PROMPT-STUDIO-004 — Prompt Run Log / Test History**
  * **เป้าหมาย**: เพิ่มตารางบันทึกการรันเพื่อประเมินผลลัพธ์ (Test Run History) โดยบันทึกสำเนาแบบจำลองข้อมูล (Snapshot) ในขณะที่ทำการทดสอบ ได้แก่ ค่าอินพุตและข้อความ Prompt สำเร็จ พร้อมใส่การประเมินคะแนน 1-5 ดาว
* **PROMPT-STUDIO-005 — Run Log UX Polish / Revision Workflow Lite**
  * **เป้าหมาย**: ปรับปรุงหน้าประวัติการรันให้ฟิลเตอร์ข้อมูลได้ง่ายขึ้น รองรับระบบจัดเก็บเอกสารอย่างไม่ทำลาย (Soft Archive) และเพิ่มระบบคัดลอก Notes สำหรับการแก้ไขรุ่นถัดไป (Next Revision Notes)
* **PROMPT-STUDIO-006 — Green Fineness Guardrail Presets**
  * **เป้าหมาย**: สร้างระบบควบคุมความปลอดภัยทางแบรนด์ (Brand Safety Guardrails) โดย Seeding แนวทางมาตรฐานของ Green Fineness 5 รายการ พร้อมคลังคำต้องห้าม (Risk Word Bank) นำมารวมในระบบคัดลอกและบันทึก Snapshot โดยอัตโนมัติ

---

## 2. Technical Inventory (รายการทรัพยากรทางเทคนิค)

### 2.1 Web Route หลัก
* **URL**: [http://localhost:3000/workspaces/prompt-studio](http://localhost:3000/workspaces/prompt-studio)
* **File path ของหน้าจอหลัก**: [PromptStudioClient.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/prompt-studio/PromptStudioClient.tsx)

### 2.2 Database Schema (SQLite)
ตารางหลักที่เกี่ยวข้องในฐานข้อมูลประกอบด้วย:

1. **`prompt_templates`** (ตารางสำหรับจัดเก็บเทมเพลต)
   * `id` (TEXT, PRIMARY KEY): รหัสระบุเทมเพลต
   * `title` (TEXT, NOT NULL): ชื่อของเทมเพลต
   * `system_prompt` (TEXT): คำสั่งระบบหลัก (System Prompt)
   * `template_structure` (TEXT): โครงสร้างแม่แบบเนื้อหา (มีตัวแปร `{var}`)
   * `constraints` (TEXT): ข้อจำกัดการสร้างผลลัพธ์
   * `input_fields` (TEXT, JSON string): โครงสร้างการตั้งค่าฟิลด์อินพุต
   * `guardrail_preset_ids` (TEXT, DEFAULT '[]', JSON string): รหัส Preset ที่เลือกใช้งาน
   * `created_at` / `updated_at` (TEXT)

2. **`guardrail_presets`** (ตารางจัดเก็บกฎเกณฑ์และแนวทางด้านความปลอดภัยของแบรนด์)
   * `id` (TEXT, PRIMARY KEY): รหัสระบุ preset
   * `name` (TEXT): ชื่อแนวทางควบคุมความปลอดภัย
   * `category` (TEXT, CHECK constraint): ประเภท ('tone', 'claims', 'sales', 'review', 'custom')
   * `description` (TEXT): รายละเอียดโดยสรุป
   * `content` (TEXT): คำสั่งสอนของแนวทางที่จะนำมารวมใน Prompt
   * `risk_words` (TEXT, JSON string): คลังคำเสี่ยงที่ห้ามใช้ พร้อมคำแนะนำการแก้ไข
   * `is_active` (INTEGER): สถานะการเปิดใช้งาน (0/1)

3. **`prompt_run_logs`** (ตารางจัดเก็บประวัติการรันและบันทึกผลการประเมิน)
   * `id` (TEXT, PRIMARY KEY): รหัสระบุ log
   * `prompt_template_id` (TEXT, FOREIGN KEY): รหัสเชื่อมโยงเทมเพลต
   * `input_snapshot` (TEXT, JSON string): สำเนาค่าอินพุตขณะรันทดสอบ
   * `compiled_prompt_snapshot` (TEXT): สำเนา Prompt ที่คอมไพล์สำเร็จขณะรัน
   * `output_notes` (TEXT): รายละเอียดผลลัพธ์การรันจาก AI (หรือบันทึกเสริม)
   * `rating` (INTEGER, CHECK 1-5): คะแนนการประเมินผลลัพธ์
   * `next_revision_notes` (TEXT): รายละเอียดบันทึกเพื่อการแก้ไขปรับปรุงรุ่นถัดไป
   * `summary` (TEXT, DEFAULT ''): ข้อความสรุปแบบสั้นของการรัน
   * `run_status` (TEXT, DEFAULT 'needs_revision'): สถานะผลการรัน ('useful', 'needs_revision', 'archived')

### 2.3 API Endpoints
* **`GET /api/prompt-templates`**: ดึงรายการเทมเพลตทั้งหมด
* **`POST /api/prompt-templates`**: บันทึกสร้างเทมเพลตใหม่ (รองรับส่ง `guardrail_preset_ids` และ `input_fields`)
* **`PATCH /api/prompt-templates/[id]`**: แก้ไขเทมเพลตที่มีอยู่ (บันทึกการเปิด/ปิด Guardrail และเพิ่มฟิลด์อินพุต)
* **`DELETE /api/prompt-templates/[id]`**: ลบเทมเพลตออกจากระบบ
* **`GET /api/prompt-guardrail-presets`**: ดึงรายการข้อกำหนดความปลอดภัยที่ active
* **`GET /api/prompt-run-logs?promptTemplateId={id}`**: ดึงประวัติการรันย้อนหลังของเทมเพลตนั้น ๆ (รองรับ Query filter: `runStatus`, `ratingFilter`)
* **`POST /api/prompt-run-logs`**: บันทึกประวัติการรันพร้อม Snapshot
* **`PATCH /api/prompt-run-logs`**: อัปเดตข้อมูลบันทึก คะแนน สถานะ และการ Archive บันทึกการรัน

### 2.4 Main UI Areas (พื้นที่หลักของหน้าจอ)
* **Left Sidebar (แผงนำทางซ้าย)**: รายชื่อเทมเพลตและปุ่ม "สร้างเทมเพลตใหม่ (+)"
* **Center Workspace (พื้นที่แก้ไขหลัก)**: ฟอร์มป้อนข้อมูลเทมเพลตหลัก (Title, System Prompt, Template Structure, Constraints), แผงสร้างปุ่ม Input Builder, และแผงติ๊กเลือก Green Fineness Guardrails
* **Right Panel (แผงผลลัพธ์ขวา)**: แบบฟอร์มอินพุตไดนามิก (สำหรับให้กรอกเพื่อ Compile), ปุ่มคัดลอก Prompt, และแสดงกล่องพรีวิวข้อความ Prompt ผลลัพธ์
* **Bottom Panel (แผงประวัติและผลการรัน)**: ปุ่มและฟอร์ม "บันทึกผลการรัน (Record Test Run)" พร้อมลิสต์รายการประวัติแบบย่อที่แสดงคะแนน สถานะ แผงฟิลเตอร์ และการขยายดู Snapshot แบบละเอียด

### 2.5 Green Fineness Guardrails Presets
ข้อมูลที่ทำการ Seed ลงฐานข้อมูล ประกอบด้วย:
1. **Green Fineness Core Tone** (Tone): ใช้ภาษาไทยที่สงบ ชัด อ่านง่าย มีบริบท ไม่เร่งเร้า ไม่ขายแรง และไม่ใช้ถ้อยคำที่ฟังดูเกินจริง
2. **Scientific Claim Caution** (Claims): เมื่อกล่าวถึงผลลัพธ์ทางพืช ดิน จุลินทรีย์ ปุ๋ย ธาตุอาหาร การเจริญเติบโต ผลผลิต คาร์บอน หรือสิ่งแวดล้อม ให้ใช้ถ้อยคำระมัดระวัง และหลีกเลี่ยงการสรุปผลแบบแน่นอนหากไม่มีหลักฐานเฉพาะเจาะจง
3. **Soil / Microbe / Fertilizer Claim Guardrail** (Claims): หลีกเลี่ยงการกล่าวว่าจุลินทรีย์ ปุ๋ย หรือสารบำรุง “ทำให้” พืชโต ดินฟื้น หรือผลผลิตเพิ่มแบบตรงตัวและแน่นอน ให้ใช้ภาษาที่สะท้อนความเกี่ยวข้องภายใต้บริบท
4. **Non-salesy Educational Content** (Sales): หลีกเลี่ยง CTA แบบเร่งเร้า คำโฆษณาเกินจริง หรือการพูดเหมือนขายนำ ให้เน้นการอธิบายความเข้าใจ เหตุผล บริบท และการนำไปพิจารณาใช้อย่างเหมาะสม
5. **Green Fineness Review Checklist** (Review): ก่อนส่งออกผลลัพธ์ ให้ตรวจความสงบ ความโปร่งใส ชัดเจน และความถูกต้องระมัดระวังตามหลักเกณฑ์

### 2.6 Run Log Snapshot Behavior
เมื่อมีการบันทึกประวัติรัน (Test Run):
* ระบบจะทำการแปลงค่าใน Inputs ทั้งหมด ณ ขณะนั้นให้อยู่ในรูป JSON และเก็บลง `input_snapshot`
* ระบบจะคำนวณเอาค่าอินพุตทั้งหมดมารวมกับ System Prompt, โครงสร้าง, Constraints, และคำแนะนำของ `[GUARDRAILS]` ในวินาทีนั้น ๆ บันทึกเก็บในรูป String ยาวลงฟิลด์ `compiled_prompt_snapshot`
* ข้อมูลใน snapshot จะคงเดิม (Immutable) แม้ภายหลังจะมีการแก้ไขคำสะกดในโครงสร้างเทมเพลต หรือเปลี่ยนค่าอินพุตในหน้าต่างแก้ไขหลัก ช่วยให้นักพัฒนาเห็นข้อเท็จจริงย้อนหลังได้ 100%

---

## 3. Regression QA Checklist (แบบฟอร์มและขั้นตอนการทดสอบการถดถอย)

กรุณาใช้ตารางทดสอบด้านล่างเพื่อตรวจสอบความสมบูรณ์ของระบบหลังการปรับแต่งโค้ด

| ID | Target Flow | ขั้นตอนการทดสอบ (Step-by-Step) | ผลลัพธ์ที่คาดหวัง (Expected Result) | สถานะ (Passed / Partial / Failed) | บันทึกข้อสังเกต / หลักฐาน (Evidence / Observation) |
|---|---|---|---|---|---|
| **01** | **Prompt Selection** | 1. เปิดหน้าเว็บและเลือกรายการใน Sidebar ซ้าย<br>2. สลับไปมาระหว่าง `Green Fineness Article Outline Assistant` กับเทมเพลตอื่น | ข้อมูลเนื้อหาในแผงแก้ไขหลักด้านซ้าย และฟิลด์อินพุตในแผงขวาจะต้องสลับอัปเดตตรงตามเทมเพลตที่เลือก | | |
| **02** | **Structured Editor** | 1. แก้ไขข้อความในช่อง System Prompt หรือ Constraints<br>2. กดปุ่มบันทึกเทมเพลตด้านบนขวา และลองรีเฟรชหน้าเว็บ | ข้อความที่ถูกเซฟจะต้องคงอยู่ และข้อมูลไม่สูญหายเมื่อโหลดกลับมาใหม่ | | |
| **03** | **Input Field Builder** | 1. เพิ่มฟิลด์อินพุตใหม่ด้วยปุ่ม `+ เพิ่มฟิลด์อินพุต` ในแท็บฟิลด์อินพุต<br>2. เลือกประเภทเป็น `ฟิลด์พิมพ์ยาว (textarea)` หรือ `ฟิลด์เลือกตัวเลือก (select)`<br>3. กำหนดตัวเลือก (เช่น `A,B,C`) และป้อนตัวแปรอ้างอิงให้ตรงกับวงเล็บปีกกา เช่น `{tone}`<br>4. บันทึกและทดสอบกรอกในฟอร์มขวา | ฟิลด์ที่กำหนดจะต้องแสดงผลตามประเภทที่เลือกในแผงขวา มีตัวเลือก dropdown และสามารถกรอกค่าเพื่อนำไป compile ได้จริง | | |
| **04** | **Guardrail Selector** | 1. สลับติ๊กเลือก/ไม่เลือก Checkbox ของ Green Fineness Guardrails ในแผงควบคุมด้านล่างเทมเพลต<br>2. สังเกตการเปลี่ยนแปลงในหน้าต่าง Compile ขวา | ผลลัพธ์ Compiled Prompt ด้านขวาจะต้องเพิ่มหรือเอาส่วน `[GUARDRAILS]` ท้ายเอกสารเข้าออกตามการติ๊กเลือกแบบเรียลไทม์ | | |
| **05** | **Compiled Prompt** | 1. ทำการพิมพ์ข้อมูลอินพุตในแบบฟอร์มด้านขวา<br>2. ตรวจสอบข้อความรวมในกล่องพรีวิวด้านขวาล่าง | ตัวแปรทั้งหมดจะถูกแทนที่ด้วยค่าที่กรอกจริง และโครงสร้างรวมถึง System Prompt/Constraints/Guardrails จะต้องจัดเรียงลำดับหัวข้ออย่างชัดเจน | | |
| **06** | **Copy Prompt** | 1. กดปุ่ม `คัดลอก Prompt` ด้านบนขวาของช่องพรีวิว<br>2. นำข้อมูลไปวางในโปรแกรมเขียนโค้ดหรือกล่องพิมพ์อื่น | ข้อมูลที่คัดลอกมาจะต้องเหมือนกับข้อความพรีวิวทั้งหมด รวมถึงข้อความแนวทาง `[GUARDRAILS]` (ถ้าเปิดใช้) | | |
| **07** | **Run Log Save** | 1. ติ๊กเปิดใช้ Guardrail และกรอกอินพุตในแผงขวา<br>2. เลื่อนลงมาที่แท็บ Record Test Run ในแผงล่าง<br>3. ใส่ Summary, Output Notes, Rating ดาว และ Next Revision Notes แล้วกดปุ่ม `บันทึกประวัติการรัน (Record Test Run)` | ข้อมูลจะถูกบันทึกสำเร็จ การ์ดประวัติรันใบใหม่ปรากฏขึ้นที่แผงประวัติด้านล่างทันที | | |
| **08** | **Snapshot History** | 1. ค้นหาประวัติที่เพิ่งบันทึกในการ์ดประวัติรันด้านล่าง<br>2. กดปุ่ม `ขยายดูรายละเอียด` หรือดูข้อมูล Snapshot<br>3. แก้ไขข้อความเทมเพลตหลักด้านบนหรือแก้ค่าอินพุตในแผงขวา แล้วกดบันทึกเทมเพลต | ข้อมูล `input_snapshot` และ `compiled_prompt_snapshot` ในการ์ดประวัติรันย้อนหลังจะต้องแสดงคำเดิมเหมือนตอนที่บันทึกไว้ในตอนแรก และไม่เปลี่ยนแปลงตามเทมเพลตปัจจุบัน | | |
| **09** | **Run Log Filters** | 1. สลับตัวกรองสถานะเป็น Useful, Needs Revision, หรือ Archived<br>2. สลับตัวกรองคะแนน เช่น rating 5 ดาว หรือ rating 3 ดาวลงมา | รายการประวัติรันด้านล่างจะคัดกรองข้อมูลและแสดงการ์ดประวัติที่ตรงเงื่อนไขถูกต้องทันที | | |
| **10** | **Soft Archive** | 1. กดปุ่ม `จัดเก็บประวัติ (Archive)` บนการ์ดประวัติรันที่ต้องการจัดเก็บ และกดยืนยันป๊อปอัป | การ์ดใบนั้นจะหายไปทันทีจากรายการหากสถานะตัวกรองเริ่มต้นถูกตั้งเป็น "Active (ซ่อนจัดเก็บ)" และจะปรากฏคืนกลับมาเมื่อตั้งเป็นตัวกรอง "Archived (จัดเก็บแล้ว)" | | |
| **11** | **Copy Next Revision Notes** | 1. ป้อนข้อมูล Revision Notes ในประวัติรัน<br>2. บันทึกและกดปุ่ม `คัดลอก Notes` บนการ์ดที่แสดงผล | ข้อความแนะนำการแก้ไขจะถูกคัดลอกลงคลิปบอร์ดอย่างสมบูรณ์โดยไม่มีข้อความขยะอื่นติดมา | | |
| **12** | **Refresh Persistence** | 1. เลือกเทมเพลต ทำการเลือก Guardrails ติ๊กเปิดประวัติรัน<br>2. กด F5 หรือกดปุ่มรีเฟรชหน้าต่างเบราว์เซอร์ | สถานะเทมเพลตที่เลือกและแผง Editor ด้านซ้ายขวาจะต้องคงอยู่ตามการเซฟล่าสุด ไม่เด้งกลับไปจุดเริ่มต้น | | |

---

## 4. Backlog After v1 (แผนการพัฒนาในระยะถัดไป)

* **PROMPT-STUDIO-008 — Prompt Version / Revision Workflow**
  * **รายละเอียด**: เพิ่มฟังก์ชันการทำ Versioning อย่างเป็นทางการ (เช่น v1.0, v1.1, v2.0) สำหรับแต่ละเทมเพลต เพื่ออำนวยความสะดวกในการเปรียบเทียบความแตกต่าง (Git-like Diff) ระหว่างเวอร์ชันต่าง ๆ
* **PROMPT-STUDIO-009 — Workflow Prompt Sets**
  * **รายละเอียด**: เพิ่มระบบจัดกลุ่ม Prompt (Prompt Sets) ที่ทำงานร่วมกันเป็นขั้นตอนแบบลูกโซ่ (Chained prompts) เช่น เอาผลลัพธ์ของ Prompt 1 ส่งไปเป็น Input ของ Prompt 2 โดยอัตโนมัติ
* **PROMPT-STUDIO-010 — Prompt Evaluation Checklist**
  * **รายละเอียด**: เพิ่มระบบ Checklist การทำประเมินเทียบคุณภาพ (A/B testing evaluation) และคำนวณหาคะแนนเฉลี่ยความพึงพอใจของ Prompt แต่ละรุ่นเพื่อการตัดสินใจทางสถิติ
* **PROMPT-STUDIO-011 — Optional AI Runner / API Integration**
  * **รายละเอียด**: พัฒนาระบบรันเรียก API ของโมเดลภาษา (OpenAI, Gemini หรือ Claude) โดยตรงภายในหน้า Prompt Studio เพื่อความรวดเร็วในการทดลองผลลัพธ์จริงโดยไม่ต้องคัดลอกย้ายหน้าต่างบ่อย ๆ
