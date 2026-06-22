# HOME-RENOVATION-PLANNER-000 — App Placement Decision

## 1. Decision Summary
**ข้อสรุปการตัดสินใจ:** 
เพื่อให้สอดคล้องกับหลักการ *Anti-Bloat Discipline* และรักษาความเสถียรของระบบหลัก (Core Workflows) ของ **WorkOS-Lite** เราตัดสินใจร่วมกันว่า **จะใช้ WorkOS-Lite เป็นเพียงพื้นที่สำหรับจัดเก็บเอกสารการวางแผนและการออกแบบ (Planning/Spec Document Workspace) สำหรับ Home Renovation Planner เท่านั้น** โดยจะ**ไม่มีการเขียนโค้ด สร้าง Route เพิ่มหน้า Component หรือแก้ไข Data Model/Database Schema ใดๆ ในระบบของ WorkOS-Lite ณ ขณะนี้**

หากในอนาคตมีความพร้อมในการลงมือพัฒนาตัวแอปจริง ระบบนี้จะถูกแยกออกไปสร้างเป็น **Standalone Repository / Application** ต่างหาก เพื่อรักษาความเบาและแยกความรับผิดชอบ (Separation of Concerns) ของโค้ดเบสหลักอย่างเด็ดขาด

---

## 2. Current Status
* **App Code / Components:** ยังไม่ได้สร้าง Component, Page หรือ API Route ใดๆ ที่เกี่ยวกับ Home Renovation Planner ในโค้ดเบสหลัก (`src/` ของ WorkOS-Lite)
* **Database & Schema:** ไม่มีตาราง (Tables) หรือความสัมพันธ์เชิงข้อมูลใดๆ ที่เกี่ยวกับ Home Renovation Planner ถูกเพิ่มเข้าไปในฐานข้อมูล `local.db` หรือ `workos.db`
* **WorkOS-Lite Status:** โค้ดเบสหลักยังคงรักษาความสะอาดและโฟกัสกับ Content Production, Article Workflows, Writing Review, และ UTM Workflows ตามเดิม 100%
* **Workspace Status:** ใช้โฟลเดอร์ `docs/home-renovation-planner/` ใน WorkOS-Lite เป็นที่รวบรวมแนวคิด ออกแบบ และวางแผนทางเอกสาร (Spec Document) เท่านั้น

---

## 3. Options Considered

### Option A: พัฒนาเป็น Module/Route ใน WorkOS-Lite ทันที
* **รายละเอียด:** สร้าง Route ใหม่ (เช่น `/home-renovation`), สร้าง UI Component และเพิ่มตารางใหม่ลงในฐานข้อมูล SQLite ปัจจุบัน เพื่อให้ใช้งาน MVP ทั้ง 4 ส่วน (Dashboard, Projects, Items, Tasks) ร่วมกับ WorkOS-Lite
* **ข้อดี:**
  - ไม่ต้องตั้งค่าระบบ Deployment หรือ Repo ใหม่
  - ใช้ Component UI ชุดเดิมได้ทันที
* **ข้อเสีย:**
  - เพิ่มภาระในโค้ดเบส (Code Bloat) และทำให้โครงสร้างฐานข้อมูลปนเปื้อนด้วยข้อมูลที่ไม่มีความเกี่ยวข้องกับงานหลัก (Content Production)
  - เกิดความเสี่ยงต่อระบบหลัก หากเกิดบั๊กหรือการอัปเกรดในโมดูลแต่งบ้าน อาจส่งผลกระทบให้ระบบงานเขียนขัดข้องไปด้วย

### Option B: แยกทำเป็น Standalone App / Repository ต่างหาก
* **รายละเอียด:** สร้าง Project ใหม่แยกต่างหาก (เช่น ใช้ Next.js / Vite + Tailwind/Vanilla CSS แบบเป็นเอกเทศ) มีฐานข้อมูลและท่อจัดส่ง (Deployment Pipeline) ของตัวเอง
* **ข้อดี:**
  - ปลอดภัยและมีสิทธิ์ดูแลรักษาง่าย (Isolated environment)
  - สามารถแชร์ระบบให้ผู้อื่น (เช่น ครอบครัว หรือผู้รับเหมา) เข้าถึงได้ง่าย โดยไม่ต้องกังวลเรื่องการเข้าถึงข้อมูลความลับทางธุรกิจหรือคอนเทนต์ใน WorkOS-Lite
  - Stack เบา ปรับแต่งได้ตามใจชอบ โดยไม่ขึ้นกับเงื่อนไขทางวิศวกรรมของ WorkOS-Lite
* **ข้อเสีย:**
  - มีภาระในการบำรุงรักษา (Maintenance overhead) ของระบบใหม่เพิ่มขึ้นอีก 1 ชุด

### Option C: จัดทำเฉพาะ Docs/Spec ใน WorkOS-Lite ก่อน (ไม่ลงมือโค้ด)
* **รายละเอียด:** รวบรวมความต้องการ ออกแบบ Data Model, Task Flow และจำลองสเปกผ่านเอกสาร Markdown ลงใน `docs/home-renovation-planner/` ของ WorkOS-Lite ก่อน เพื่อตรวจสอบความเป็นไปได้และความต้องการที่แท้จริงก่อนจะเริ่มเขียนโค้ดจริง
* **ข้อดี:**
  - ไม่มีภาระผูกพันด้านเทคนิค (Zero Technical Debt) ต่อโค้ดเบสหลัก
  - ประหยัดเวลา และช่วยให้เห็นภาพรวมของ MVP ก่อนลงมือทำจริง
  - ปฏิบัติตามกฎ *Anti-Bloat* ได้อย่างมีประสิทธิภาพสูงสุด
* **ข้อเสีย:**
  - ยังไม่สามารถใช้งานตัวแอปแบบโต้ตอบ (Interactive App) ได้ในทันที

---

## 4. Recommended Direction
แนวทางที่แนะนำคือ **Option C: ทำเป็น Docs/Spec ก่อน** โดยใช้ WorkOS-Lite เป็น Workspace ทางเอกสาร เมื่อเนื้อหาสเปกและทิศทางของ MVP (Dashboard, Projects, Items, Tasks) เริ่มนิ่งแล้ว จึงจะพิจารณาเปลี่ยนผ่านไปสู่ **Option B (Standalone App/Repo)** ในลำดับถัดไป

---

## 5. Why Not Add to WorkOS-Lite Immediately?
1. **Business Domain Mismatch:** WorkOS-Lite ได้รับการออกแบบให้เป็นระบบปฏิบัติการด้านคอนเทนต์ (Content & Knowledge OS) มีระบบเฉพาะเช่น UTM Workflow, Article Review และ GF Content Hub การนำระบบการจัดการปรับปรุงบ้าน (เช่น ท่อ, ปูน, สี, ช่างไฟ) เข้ามาปะปนจะสร้าง Domain Contamination และลดทอนจุดโฟกัสเชิงธุรกิจของระบบ
2. **Security & Access Control Constraints:** WorkOS-Lite เป็นแอปพลิเคชันส่วนตัวที่เข้าถึงข้อมูลงานเขียนเชิงลึกและ Asset สำคัญ แต่ Home Renovation Planner อาจมีความจำเป็นต้องเปิดให้บุคคลภายนอก เช่น ผู้รับเหมา หรือสมาชิกในครอบครัว ดูความคืบหน้าของโปรเจกต์ ซึ่งยากต่อการจัดการสิทธิ์หากอยู่ร่วมใน Repo เดียวกัน
3. **Database Maintenance & Schema Pollution:** ฐานข้อมูลของ WorkOS-Lite ใช้ SQLite หากยัดตารางเกี่ยวกับวัสดุก่อสร้าง ใบเสร็จรับเงิน หรือการจัดซื้อจัดจ้างเข้ามา จะส่งผลให้ขนาดฐานข้อมูลโตขึ้นอย่างไร้ความจำเป็น และทำให้การสำรองข้อมูล (Backup) หรือการ Migration มีความยุ่งยากขึ้น

---

## 6. Role of WorkOS-Lite as Planning/Spec Workspace
ในช่วงเริ่มต้นนี้ WorkOS-Lite จะทำหน้าที่เป็น **"แหล่งความรู้และพื้นที่วางแผนกลาง" (Knowledge & Planning Hub)** เนื่องจาก:
* สามารถใช้พลังงานร่วมจาก AI Agent ที่เข้าใจแนวคิดและวินัยทางวิศวกรรมของโปรเจกต์นี้
* เอกสาร Spec สามารถอ้างอิงหรือผูกโยงกับ Task/Note เดิมใน WorkOS-Lite ได้อย่างง่ายดายผ่านทางเอกสาร (Markdown Links)
* ช่วยคัดกรองฟีเจอร์ที่ไม่จำเป็นออกไปก่อนจะเริ่มเขียนโค้ดจริง (Feature Filtering Phase)

---

## 7. Conditions for Standalone App/Repo
เราจะเริ่มต้นสร้าง Standalone Repository / App สำหรับ Home Renovation Planner ก็ต่อเมื่อ:
1. เอกสารการออกแบบฐานข้อมูล (Database Schema Spec) และ Flow การทำงานหลักของ MVP 4 ส่วนนิ่งและได้รับการอนุมัติแล้ว
2. มีการประเมินแล้วว่าความยุ่งยากและฟังก์ชันการใช้งานแบบ Interactive ไม่สามารถจัดการได้สะดวกบนไฟล์ชีตธรรมดา (มีความคุ้มค่าที่จะพัฒนาเป็นเว็บแอป)
3. มีความต้องการในการแชร์ข้อมูลกับบุคคลภายนอก (Sharing/Collaborator Access) อย่างชัดเจน
4. ต้องการใช้ Stack เฉพาะตัว หรือแยกสิทธิ์การพัฒนาและ Deployment ออกมาอย่างอิสระ

---

## 8. Conditions Where WorkOS-Lite Module May Still Make Sense
โมดูลนี้อาจถูกพิจารณานำกลับมาใส่ใน WorkOS-Lite ก็ต่อเมื่อเกิดเงื่อนไขดังต่อไปนี้ (ซึ่งในปัจจุบันยังไม่ใช่):
1. ผู้ใช้ยืนยันว่าต้องการใช้งานเป็นแบบ Single User 100% ตลอดไป และไม่มีความจำเป็นต้องแบ่งปันหน้าจอนี้ให้ผู้อื่นดู
2. ต้องการเชื่อมโยงข้อมูล Tasks ของงานปรับปรุงบ้านเข้ากับระบบปฏิทินหรือ Tasks หลักของ WorkOS-Lite อย่างแนบแน่นจนไม่สามารถแยกจากกันได้
3. ต้องการความรวดเร็วในการเรียกใช้งานผ่าน URL/Domain เดียวกัน โดยใช้สิทธิ์ผู้ใช้และการเชื่อมต่อ DB เดิมที่มีอยู่แล้วเพื่อลดค่าใช้จ่ายด้าน Infra

---

## 9. Risks if Everything is Added into WorkOS-Lite
* **Regression Risks:** การอัปเดตหรือปรับปรุงโมดูลแต่งบ้านอาจทำให้ระบบ Content Studio หรือ Module อื่นที่กำลังทำงานอยู่พังโดยไม่ได้ตั้งใจ (เนื่องจากใช้ Next.js โค้ดเบสเดียวกัน)
* **Code Bloat & Build Slowdown:** การเพิ่ม Component และหน้าเพจใหม่ๆ จะทำให้ขนาดโปรเจกต์ใหญ่ขึ้น ส่งผลให้เวลาในการรัน Dev Server, Linting และ Build Production นานขึ้น
* **Performance Impact:** การเก็บตารางและ Query ข้อมูลขนาดใหญ่ใน SQLite ไฟล์เดียวกันอาจส่งผลกระทบต่อ I/O performance ในระยะยาว

---

## 10. Next Step Recommendation
1. **รีวิวและอนุมัติเอกสารนี้:** ให้ผู้ใช้ตรวจสอบและอนุมัติทิศทาง "App Placement Decision" ฉบับนี้
2. **จัดทำ Spec เพิ่มเติม:** พัฒนาสเปกของ MVP ในโฟลเดอร์ `docs/home-renovation-planner/` ในหัวข้อ:
   - `mvp-spec.md` (สำหรับลงรายละเอียดโครงสร้าง Dashboard, Projects, Items, Tasks และรายละเอียดความเรียบง่ายที่ไม่ซับซ้อนกว่าไฟล์ชีต)
3. **จัดเก็บและเตรียมความพร้อม:** เก็บรักษาเอกสารใน WorkOS-Lite เพื่อให้พร้อมใช้งานทันทีเมื่อเริ่มสร้าง Standalone App/Repo แยก
