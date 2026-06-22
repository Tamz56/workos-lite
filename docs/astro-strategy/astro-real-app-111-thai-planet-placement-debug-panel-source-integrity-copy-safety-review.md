# Source Integrity & Copy Safety Review — Thai Planet Placement Debug Panel (v0.1)

**Document ID**: `docs/astro-strategy/astro-real-app-111-thai-planet-placement-debug-panel-source-integrity-copy-safety-review.md`
**Ticket**: ASTRO-REAL-APP-DEV-111
**Date**: 2026-06-22

---

## 1. Purpose (วัตถุประสงค์)

เอกสารฉบับนี้จัดทำขึ้นเพื่อสอบทานความถูกต้อง ความสมบูรณ์ของซอร์สโค้ด (Source Integrity) และความปลอดภัยของภาษาที่แสดงผล (Copy Safety Review) ของคอมโพเนนต์วินิจฉัยย่อยแบบปิด `ThaiPlanetPlacementDebugPanel` ที่ได้สร้างขึ้นในใบงาน ASTRO-REAL-APP-DEV-110 ก่อนที่จะมีการวางแผนเชื่อมต่อ (Wiring) เข้าสู่หน้าจอวินิจฉัย Preview/Debug ใดๆ ในขั้นตอนต่อไป เพื่อให้มั่นใจว่าคอมโพเนนต์ดังกล่าวได้รับการแยกส่วนอย่างสมบูรณ์ ปราศจากพฤติกรรมความเชื่อทางโหราศาสตร์ หรือความพัวพันกับระบบประมวลผลดวงชะตาจริง (Production Engine)

---

## 2. Scope and Non-goals (ขอบเขตและข้อกำหนดภายนอก)

### Goals (ขอบเขตการรีวิว)
* ตรวจสอบความถูกต้องทางสัญญารันไทม์ (Props Contract) และโครงสร้างการเขียน Component
* ตรวจสอบคำบรรยาย ป้ายแสดงสถานะ (Badge) และฉลากแจ้งเตือนความปลอดภัย (Safety Alert) ทั้งหมดในไฟล์ Component
* ประเมินพฤติกรรมการกักกันระบบข้อมูลไม่ให้ยุ่งเกี่ยวกับ LocalStorage, Natal/Transit Composer หรือ AstroTodayPanel
* ประเมินความปลอดภัยเชิงทัศนศิลป์ (Visual Safety) ป้องกันการชี้นำด้วยสีสันหรือลวดลายที่ดูเป็นมงคล/อัปมงคล

### Non-goals (ข้อกำหนดภายนอก/สิ่งที่ไม่พึงกระทำ)
* **ไม่มีการแก้ไขซอร์สโค้ดใน `src/`**: ใบงานนี้เป็นกระบวนการตรวจสอบเอกสารและ QA เท่านั้น
* **ไม่มีการเชื่อมต่อหน้าจอ UI (No wiring)**: ไม่นำเข้าหรือเรนเดอร์คอมโพเนนต์นี้ในส่วนติดต่อผู้ใช้งานหลัก
* **ไม่มีการเข้าถึงระบบความคงอยู่ข้อมูล (No LocalStorage Changes)**: ไม่มีการเขียนหรือแก้ไขค่าหน่วยความจำใดๆ
* **ไม่มีลอจิกการคำนวณตำแหน่งองศาดาวเคราะห์ (No Calculation Logic)**: ไม่สร้างสูตรดาราศาสตร์หรือนำเข้าค่าปฏิทินจริง
* **ไม่มีการเคลมดวงชะตาจริง (No Real Value Claims)**: ไม่ใส่ชื่อราศี หรือองศาที่ได้จากข้อมูลดวงจริง
* **ไม่มีการขูดหรือคัดลอกแหล่งข้อมูลอื่น (No Scraping/Copying)**: ไม่มีการลอกเลียนลอจิกจากโปรแกรมภายนอก

---

## 3. Source File Review (การตรวจสอบความครบถ้วนของซอร์สโค้ด)

จากการวิเคราะห์ไฟล์ซอร์สโค้ดของคอมโพเนนต์ [ThaiPlanetPlacementDebugPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx) ยืนยันผลการประเมินโครงสร้างทางวิศวกรรมดังต่อไปนี้:

* **Component Export Name**: ส่งออกในรูปแบบ Named Export คือ `export function ThaiPlanetPlacementDebugPanel` สอดคล้องกับมาตรฐานการตั้งชื่อไฟล์และคอมโพเนนต์ของโครงการ
* **Props-only Data Flow**: คอมโพเนนต์รับข้อมูลผ่านอินเทอร์เฟซ `ThaiPlanetPlacementDebugPanelProps` ดังนี้:
  ```typescript
  interface ThaiPlanetPlacementDebugPanelProps {
    runtimeResult: ThaiPlanetPlacementRuntimeAdapterV01;
    isVisible?: boolean;
    className?: string;
  }
  ```
  ข้อมูลทิศทางเดียว (Unidirectional Data Flow) ไร้การผูกมัดหรือสร้าง side-effects ภายนอก
* **Read-only Rendering**: มีพฤติกรรมแสดงผลข้อมูลแบบอ่านอย่างเดียว (Read-only) โดยไม่มีกลไก User Interaction (เช่น ฟอร์มกรอกข้อมูล, ปุ่มกดยืนยัน หรือการเปลี่ยนแปลง Props ในตัวคอมโพเนนต์เอง) และไม่มี callback function ส่งสถานะกลับไปยัง parent component
* **Absence of LocalStorage Access**: ไม่มีการเรียกใช้ `window.localStorage` หรือ API บันทึกความคงอยู่ข้อมูลอื่นใดภายในคอมโพเนนต์
* **Absence of Browser API Access**: คอมโพเนนต์เป็น React Functional Component บริสุทธิ์ ไม่มีคำสั่งเข้าถึง DOM API หรือฟังก์ชันเสริมที่เกี่ยวกับ HTTP Request / Web API นอกเหนือจากคุณสมบัติมาตรฐานของ Next.js Client Component
* **Absence of Strategy Composer Usage**: ไม่มีการอิมพอร์ตหรือเรียกใช้ไฟล์จาก `src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts` หรือการเรียกใช้ composer เพื่อรวมผลลัพธ์เข้าสู่แผนกลยุทธ์
* **Absence of Calculation Logic**: ไม่มีลอจิกวิเคราะห์ราศีหรือวิถีดาวเคราะห์ มีเพียงการทำ Array mapping วนลูปการเรนเดอร์ตารางข้อมูลจาก `runtimeResult.results`
* **Absence of External References**: ปราศจากการเรียกใช้คลาสหรือตัวแปรภายนอกที่เป็น API โหราศาสตร์หรือดาราศาสตร์

---

## 4. Copy Safety Review (การวิเคราะห์คำบรรยายแสดงผล)

ความปลอดภัยทางภาษาบรรยาย (Copy Safety) ได้รับการตรวจสอบอย่างละเอียดเพื่อป้องกันปัญหาทางลิขสิทธิ์และจรรยาบรรณ:

### ข้อความด้านความปลอดภัยทางเทคนิคที่ตรวจพบ (Safe Wording Detected)
คอมโพเนนต์ประกอบด้วยคำชี้แจงความปลอดภัยอย่างเข้มงวด:
1. **Header Badge**: `"Not validated"` คู่ขนานกับระดับตัวแปร `{adapterStatus}`
2. **Safety Notice Box**:
   - `Diagnostic only`
   - `Pending reference validation`
   - `Not used for interpretation`
   - `No real Thai planet placement is displayed`
3. **Footer Guardrail**: `"Development diagnostics only. This output is not persisted and is not used for interpretation."`

### ข้อความ/คำศัพท์ที่ถูกห้ามและหลีกเลี่ยงได้สำเร็จ (Forbidden Copy Avoided)
ยืนยันว่า **ไม่ปรากฏ** คำศัพท์ดังต่อไปนี้ในโค้ดหรือข้อความแสดงผล:
* คำว่าดวงชะตาจริงหรือแผนภาพดวงจริง (*accurate placement*, *real chart*)
* คำระบุตำแหน่งราศีหรือคำทบทวนคำทำนายภาษาไทย (*ดาวอยู่ราศี…*, *ผลดวงจริง*, *ใช้ทำนาย*)
* คำยืนยันความถูกต้อง (*validated placement*)
* คำแปลสัญลักษณ์หรือคำทำนายที่ชี้แนะชะตาชีวิต (*fate-based* หรือ *fear-based copy*)

---

## 5. Placeholder Display Review (การตรวจสอบพฤติกรรมข้อมูลโครงร่างจำลอง)

* **ความสมบูรณ์ของค่า Placeholder**: ค่าจำลองตำแหน่งองศาและราศีจะแสดงผลในตารางเฉพาะค่าทางเทคนิค ดังนี้:
  - `pending-reference-validation` (สำหรับ `signRasi` และ `degree` ของดาวทุกดวง)
  - `unavailable` (สำหรับ `specialStatus` และ `segment` ของดาวทุกดวง)
* **ไม่มีการแปลเป็นคำทำนาย**: ค่าทางเทคนิคข้างต้นถูกเรนเดอร์เป็นตัวหนังสือตรงไปตรงมา ไม่มีการนำเอาคำศัพท์ปฏิทินหรือชื่อดาวของไทยมาจับคู่หรือตีความต่อ
* **ความโปร่งใสในจุดวินิจฉัย**: การตั้งค่าเป็นสตริงตรงๆ นี้ช่วยให้นักพัฒนามองเห็นได้ชัดเจนในรอบ Diagnostics ว่าระบบกำลังทำงานอยู่บน Interface Stub และมี Safety Summary สกัดกั้นไว้

---

## 6. Visual Safety Review (การตรวจสอบการออกแบบและโทนสี)

* **โทนสีวินิจฉัยที่เป็นกลาง (Neutral Diagnostic Styling)**: ใช้สีหลักเป็นโทนเทาดำของระบบดีไซน์ (`bg-neutral-900`, `text-neutral-100`, `border-neutral-700`) ซึ่งให้ความรู้สึกเป็นเครื่องมือสำหรับนักพัฒนาซอฟต์แวร์ (Developer Tool)
* **ปราศจากความหมายที่เป็นมงคล/อัปมงคล**: ไม่มีสีเขียวสดใสสื่อถึงความสำเร็จ (Validated) หรือการแบ่งสีนำโชค/สีกาลกิณี (Auspicious/Inauspicious) ที่สร้างความตื่นตระหนกหรือความหวังแก่ผู้ใช้งาน
* **สัญลักษณ์และกล่องแจ้งเตือนภัยแบบระมัดระวัง (Cautionary Accent)**: ใช้กล่องสีส้ม/น้ำตาลขุ่น (`bg-amber-950/20`, `border-amber-900/50`, `text-amber-500`) เพื่อแจ้งเตือนนักพัฒนาถึงสถานะเฝ้าระวัง และแยกตัวคอมโพเนนต์ออกจากเลย์เอาต์การนำเสนอข้อมูลปกติของวันนี้/สัปดาห์นี้อย่างสิ้นเชิง

---

## 7. Integration Isolation Review (การตรวจสอบความเป็นเอกเทศสถาปัตยกรรม)

จากการตรวจสอบไฟล์รอบข้างตามข้อกำหนดความปลอดภัย ยืนยันพฤติกรรมแยกส่วน 100%:
1. [AstroTodayPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroTodayPanel.tsx): ไม่มีการอิมพอร์ตหรือใช้คอมโพเนนต์ `ThaiPlanetPlacementDebugPanel`
2. [AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx): ไม่มีการอิมพอร์ตหรือใช้คอมโพเนนต์ `ThaiPlanetPlacementDebugPanel`
3. ระบบกลยุทธ์ (Today / Weekly / Monthly Strategy Outputs): ทำงานผ่าน Mock Engine หรือ Adapter ดั้งเดิมโดยไม่มีการนำเอา Runtime Result v0.1 ของปฏิทินไทยเข้าไปคำนวณร่วม
4. LocalStorage & Profile Mutation: ไม่มีฟังก์ชันหรือคลาสอแดปเตอร์ส่วนใดที่ไปเชื่อมต่อแก้ไข Birth Profile หรือเขียนสัญญาลดทอนค่า LocalStorage

---

## 8. Risk Review (การประเมินความเสี่ยงเชิงป้องกัน)

| ลำดับความเสี่ยง | คำอธิบายความเสี่ยง | มาตรการควบคุมและป้องกันที่มีอยู่ |
|---|---|---|
| 1 | นักพัฒนารุ่นหลังนำเอาคอมโพเนนต์วินิจฉัยนี้ไปเชื่อมเข้าสู่หน้ารายงานผลวันนี้ (Today Panel) ก่อนการตรวจสอบสัญญารองรับครบถ้วน | มี Badge กำกับ "Not validated" และ Footer แจ้งเตือนอย่างเด่นชัด พร้อมโครงกักกัน UI ในตัวโค้ด |
| 2 | ผู้ใช้งาน misread หรือเข้าใจผิดว่าตัวเลขหรือรหัสจำลองที่เห็นเป็นสถิติตำแหน่งดวงจริงของตนเอง | ควบคุมคำบรรยายด้วยประโยคปฏิเสธ "No real Thai planet placement is displayed" บนกล่องเตือนความปลอดภัย |
| 3 | กลไกประมวลผลดวงชะตารวม (Strategy Composer) ดึงเอาผลลัพธ์จาก Adapter จำลองไปออกความเห็นกลยุทธ์ | ควบคุมด้วยสัญญารันไทม์ `adapterStatus: 'stub-only'` เพื่อให้ระบบตัวรวมคัดกรองข้าม (bypass) ข้อมูลที่ไม่พร้อมใช้งานได้ง่าย |
| 4 | เข้าใจผิดว่าเอกสารตรวจสอบ (QA Review) นี้ยืนยันถึงความแม่นยำทางโหราศาสตร์ | เอกสารชี้แจงอย่างชัดเจนว่านี่คือกระบวนการรับประกันคุณภาพของซอฟต์แวร์จำลองโครงหน้าจอ (UI Scaffold QA) เท่านั้น |

---

## 9. DEV-112 Handoff Recommendation (ข้อแนะนำในการดำเนินงานใบงานถัดไป)

### ชื่อใบงานถัดไป
`ASTRO-REAL-APP-DEV-112 — Thai Planet Placement Debug Panel Preview Wiring Plan`

### รายละเอียดแผนงานขั้นตอนถัดไป (ถ้าได้รับอนุมัติให้ดำเนินการ):
1. **การควบคุมการวางแผนล่วงหน้า (Planning-first)**: ใบงาน DEV-112 จะต้องดำเนินการจัดทำแผนการผสานต่อ (Wiring Implementation Plan) และตรวจสอบคุณภาพแผนการก่อนการแก้ไขโค้ดจริง
2. **ขอบเขตการทำงาน (Wiring Scope)**:
   - ผสานเข้าสู่แผงควบคุมการวินิจฉัยปิด (เช่น Data Tools หรือแท็บสำหรับนักพัฒนาในหน้าระบบควบคุม Astro Preview) เท่านั้น
   - การเชื่อมต่อต้องแสดงเฉพาะตัวเลือกเปิด-ปิด (Debug Visibility Switcher) สำหรับเปิดปิด Component แบบปิด
   - **ห้าม** เชื่อมต่อหรือป้อนผลลัพธ์ตำแหน่งดาวจำลองนี้เข้ากับ LocalStorage ของ Birth Profile หรือดึงข้อมูลมาออกความเห็นคำแนะนำประจำวัน/สัปดาห์
   - แสดงสถานะความปลอดภัย `adapterStatus` และ `safetySummary` อย่างครบถ้วนรอบด้าน
3. **การประกันความถูกต้องก่อน Commit**:
   - รันคำสั่งตรวจสอบ Linting และ Next.js Production Build
   - จัดทำเอกสาร QA บันทึกความเรียบร้อยของ Layout และทดสอบพฤติกรรม Visible/Invisible ของ Component แบบจำลอง
