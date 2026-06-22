# Thai Planet Placement Debug Panel Preview Wiring Implementation Plan (v0.1)

**Document ID**: `docs/astro-strategy/astro-real-app-113-thai-planet-placement-debug-panel-preview-wiring-implementation-plan.md`
**Ticket**: ASTRO-REAL-APP-DEV-113
**Date**: 2026-06-23

---

## 1. Purpose (วัตถุประสงค์)

เอกสารฉบับนี้กำหนดแผนงานปฏิบัติการระดับรหัสโปรแกรม (Implementation Plan) เพื่อระบุแนวทางและโครงสร้างโค้ดสำหรับการผสานนำคอมโพเนนต์วินิจฉัยย่อยแบบปิด `ThaiPlanetPlacementDebugPanel` ไปติดตั้งในหน้ารายงานผลจำลองระดับนักพัฒนา (Preview/Debug surface) โดยทำหน้าที่เป็นเอกสารวางแผนเท่านั้น (Documentation-only) โดยไม่มีการแก้ไขไฟล์จริงในรอบนี้ เพื่อจัดระเบียบตำแหน่งทางรหัสอย่างถูกต้อง ป้องกันการเขียนข้อมูลทับ หรือการรั่วไหลของข้อมูล stub ไปยังผู้ใช้จริง

---

## 2. Scope and Non-goals (ขอบเขตและข้อกำหนดภายนอก)

### Goals (ขอบเขตการทำงาน)
* ระบุไฟล์เป้าหมายที่ **อาจจะมีการสร้างหรือแก้ไขจริงในอนาคต** เพื่อกักกันสถาปัตยกรรม UI
* วางระบบการไหลของข้อมูล (Data Flow) ชนิด In-memory ไร้ความคงอยู่ข้อมูล (No persistence)
* ระบุเงื่อนไขการควบคุมการแสดงผล (Visibility Gate Check) ด้วยสวิตช์ Toggle
* กำหนดกฎเกณฑ์ความปลอดภัยคำบรรยาย (Copy Safety) และสกัดกั้นการคำนวณจริง

### Non-goals (ข้อกำหนดภายนอก)
* **ห้ามแก้ไขไฟล์ภายใต้ `src/`**: ใบงานนี้เป็นกระบวนการจัดทำแผนเชิงโครงสร้างเท่านั้น
* **ห้ามแก้ไขคอมโพเนนต์ ThaiPlanetPlacementDebugPanel.tsx**
* **ห้ามเชื่อมต่อหรือดัดแปลง AstroTodayPanel.tsx และ AstroRealAppPreview.tsx ในรอบนี้**
* **ห้ามแก้ไขคุณลักษณะของ LocalStorage หรือเพิ่ม Dependencies**
* **ห้ามป้อนตำแหน่งองศา ราศี หรือตำแหน่งดาวของระบบปฏิทินไทยจริง**
* **ห้ามสร้างหรือขูดข้อมูลผลการวิเคราะห์ชะตาชีวิตจากเครื่องมือภายนอก**

---

## 3. Proposed Future Wiring Target (การวิเคราะห์ตัวเลือกไฟล์ติดตั้งในอนาคต)

ในการผสานรวมคอมโพเนนต์วินิจฉัยในขั้นตอนถัดไป ได้ประเมินตัวเลือกจุดติดตั้งทางโค้ดดังนี้:
1. **AstroRealAppPreview.tsx โดยตรง**: หากนำโค้ดติดตั้งมาเขียนเพิ่มที่ไฟล์นี้โดยตรง อาจทำให้ไฟล์ Preview หลักบวมและมีขนาดโค้ดสะสมเกินไป (ขัดต่อเกณฑ์ Anti-Bloat)
2. **สร้าง Diagnostics Wrapper Component ย่อย**: สร้างคอมโพเนนต์ย่อยแยกออกมาเพื่อดูแลระบบ Diagnostics ปฏิทินไทยโดยเฉพาะ จากนั้นจึงนำ Wrapper นี้ไปอ้างอิงจุดเดียวในหน้า Preview วิธีนี้ช่วยจำกัดความวุ่นวายของซอร์สโค้ดหลัก และทำให้ง่ายต่อการ QA

### ผลการคัดเลือกตำแหน่ง:
แนะนำให้จัดสร้าง **Diagnostics Wrapper Component** ขึ้นใหม่แยกเฉพาะ เพื่อรับผิดชอบดูแล Diagnostics Block และป้องกันความซับซ้อนสะสมในไฟล์แสดงผลหลัก

---

## 4. Proposed Future Files to Modify or Create (รายการไฟล์ที่อาจถูกสร้างหรือแก้ไขในอนาคต)

สำหรับการลงมือแก้ไขโค้ดจริงในอนาคต (ซึ่ง **ห้ามกระทำจริงในรอบนี้**) มีรายการไฟล์เป้าหมายดังนี้:

### ไฟล์ที่อาจถูกสร้างใหม่ (Future New File Candidates):
* `src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDiagnosticsSection.tsx`
  - *หน้าที่*: ทำหน้าที่เป็น Wrapper Component โอบอุ้มคอมโพเนนต์วินิจฉัยย่อย คอยดึงฟังก์ชันประสานรันไทม์จำลอง v0.1 และส่งผ่าน Props ข้อมูลจำลองไปยังแผงวงจรตรวจสอบ

### ไฟล์เดิมที่อาจถูกแก้ไข (Future Modified File Candidates):
* `src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx`
  - *หน้าที่*: เพิ่มจุดนำเข้า (Import) ของ Wrapper Component ใหม่นี้ไปติดตั้งในพื้นที่ Data Tools / Developer diagnostics section ด้านล่างสุดของตัวอย่างหน้าจอทดสอบ

### ไฟล์ที่ห้ามแตะต้องโดยเด็ดขาด (Files Must Remain Untouched):
* `src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx` (แผงรายงานความเห็นกลยุทธ์ผู้ใช้จริง)
* คลาสและอแดปเตอร์ LocalStorage ดั้งเดิมทั้งหมด
* `src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts`
* `src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts` (ยกเว้นกรณีอัปเกรดรุ่นคำนวณในใบงานฝั่ง Core ในอนาคต)

---

## 5. Proposed Data Flow for Future Code (แผนภาพการไหลของข้อมูลระดับโค้ด)

การจัดส่งข้อมูลดวงชะตาจำลองในรอบเขียนโค้ดอนาคตจะถูกบังคับทางข้อมูล (Data Flow Guardrails) ดังนี้:

```
[Profile เกิดในอินเตอร์เฟซ Preview หรือ Placeholder Input]
                      │
                      ▼
[เรียก buildThaiPlanetPlacementRuntimeAdapterV01(input, referenceCase?)]
                      │ (ประมวลผล In-memory object เท่านั้น)
                      ▼
[ส่งข้อมูลต่อไปยัง ThaiPlanetPlacementDiagnosticsSection.tsx]
                      │ (รับ Props runtimeResult)
                      ▼
[ส่งข้อมูลต่อไปยัง ThaiPlanetPlacementDebugPanel.tsx]
                      │ (เรนเดอร์แบบ Read-only ใน Diagnostics Panel)
                      ▼
[แสดงผลโครงตารางเฉพาะค่าทางเทคนิค]
```

### ข้อห้ามทางข้อมูลระดับรันไทม์:
* ข้อมูลตำแหน่งดาวเคราะห์จำลองปฏิทินไทย v0.1 จะต้องทำงานเฉพาะ **In-memory** และไม่มีการเขียน บันทึก หรือทำมิวเตชันลงใน LocalStorage หรือ Profile จริง
* ห้ามส่งผ่าน `runtimeResult` เข้าสู่วิวหลัก หรือนำไปเป็นส่วนประกอบในกลไก Strategy Composer โดยเด็ดขาด

---

## 6. Proposed Visibility Gate (เกราะคัดกรองการเปิดแสดงผลของโค้ด)

เพื่อไม่ให้คอมโพเนนต์ทดสอบหลุดรอดไปบนหน้าจอจริง ต้องใช้การป้องกันเงื่อนไข 3 ระดับ:
1. **Gate ในระดับ Route/Context**: ทำงานบนหน้า Preview เท่านั้น
2. **Gate ในระดับสิทธิ์การพัฒนา (Developer Flag)**: ทำงานเมื่อตรวจพบเงื่อนไข:
   ```typescript
   variant === 'preview' && showDiagnostics === true
   ```
3. **Gate ในระดับ Layout UI**: ตัวแผง Diagnostics Section จะต้องซ่อนตัวอยู่ภายใต้กล่อง Accordion หรือปุ่มปิด-เปิดจำลอง (Data Tools Developer Switcher) ที่ปิดยุบไว้เริ่มต้นเสมอ (Hidden/Collapsed by default)

---

## 7. Proposed Fixture / Input Strategy (นโยบายชุดข้อมูลจำลองขาเข้า)

* **ไม่ใช้ข้อมูล Birth Profile จริงของผู้ใช้มาอ้างอิงเป็นดวงจริง**: ข้อมูลวันเกิดเวลาเกิดที่ผ่านเข้ามาจะถูกตราหน้าว่าเป็นเพียงข้อมูลบริบทนำเข้าทดสอบ (`input context only`) เท่านั้น และห้ามโฆษณาว่าเป็นคำนวณแผนภาพแท้จริงของดาราศาสตร์ไทย
* **ค่าเริ่มต้นของพิกัดดาวเคราะห์**: ต้องชี้ประเด็นชัดเจนว่าคือค่าสัญญารอตรวจสอบ ได้แก่:
  - `pending-reference-validation`
  - `unavailable`

---

## 8. Component Contract Usage (ข้อจำกัดการเรียกใช้งาน Component)

คอมโพเนนต์ Wrapper ผู้ปกครองในอนาคตจะทำหน้าที่ส่งผ่าน Props 3 รายการไปยังคอมโพเนนต์วินิจฉัยย่อย ได้แก่:
* `runtimeResult` (ประเภท `ThaiPlanetPlacementRuntimeAdapterV01`)
* `isVisible` (ประเภท boolean)
* `className` (ประเภท string)

คอมโพเนนต์วินิจฉัยจะรันพฤติกรรมสอดคล้องตามสัญญา Read-only และ **ห้ามดำเนินการเหล่านี้**:
1. ห้ามเขียนฟังก์ชัน fetch ดึงข้อมูลดวงผ่านเครือข่ายอินเทอร์เน็ต
2. ห้ามดักจับ event เพื่อเขียนค่าลงหน่วยความจำ
3. ห้ามทำมิวเตชัน (mutations) ของพารามิเตอร์ props ขาเข้า
4. ห้ามเรียกใช้ Strategy Composer หรือส่งกลับ callback แปลความหมาย

---

## 9. Copy Safety & LocalStorage Persistence Rules (กฎเกณฑ์คำภาษาบรรยายและหน่วยความจำ)

### นโยบายด้านคำศัพท์ความปลอดภัย (Copy Safety):
* หน้าจอเชื่อมต่อต้องแสดงประโยคปฏิเสธความรับผิดชอบอย่างเด่นชัด: `"Diagnostic only"`, `"Stub-only"`, `"Not validated"`, `"Pending reference validation"`, `"Not used for interpretation"`, `"No real Thai planet placement is displayed"`, `"Not persisted"`
* ห้ามนำชื่อภาษาไทยหรือคำแปลเชิงโหราศาสตร์มาจัดแสดง (* accurate placement, ดาวอยู่ราศี…, ผลดวงจริง, ใช้ทำนาย, validated placement *)

### นโยบายด้านหน่วยความจำเบราว์เซอร์:
* ห้ามเขียนผลลง LocalStorage
* ห้ามสร้างคีย์จัดเก็บตำแหน่งดาวเกิดปฏิทินไทย
* ค่าของ **generatedAt** จะต้องถูกจำกัดขอบเขตให้เป็นเพียง metadata บันทึกวันเวลาที่เรนเดอร์ React component เท่านั้น และห้ามนำไปตีความเทียบเคียงกับเวลาทางปฏิทินดาราศาสตร์ในการคำนวณตำแหน่งองศาดาวเคราะห์

---

## 10. Strategy Engine & Guidance Guardrails (กลไกห้ามปะปนกับกลยุทธ์ผู้ใช้จริง)

* ผลลัพธ์ข้อมูลจำลองปฏิทินไทย v0.1 **ห้ามป้อนเข้าสู่** คลาสประเมินแผนงานประจำวันนี้/สัปดาห์นี้/รายเดือน หรือระบบประสานงานกลยุทธ์รวม (Natal + Transit Strategy Composer)
* ห้ามสกัดคำแนะนำหรือประโยคเตือนใจจากค่าดวง stub
* ความเห็นกลยุทธ์ แผนงาน และประโยคแนะนำของผู้ใช้จริงจะต้องสะอาดและไม่ได้รับผลข้างเคียงใดๆ จากการเชื่อมหน้าจอนี้

---

## 11. QA Requirements for Future Code Round (ข้อกำหนดในการตรวจสอบคุณภาพ)

ในเฟสเขียนโค้ดผสานระบบถัดไป การตรวจสอบประกันคุณภาพ (QA Criteria) จะต้องทดสอบตามเกณฑ์เหล่านี้:
1. **ESLint Audit**: ผ่านการสแกนโค้ดโดยไม่มีข้อผิดพลาด (ยกเว้นไฟล์ CLI ignore ที่ได้รับการยอมรับ)
2. **Next.js Compilation**: ผ่านการรัน `next build` สำเร็จ 100%
3. **Runtime Contract Validation**: รัน `check-thai-planet-placement-contract.cjs` ผ่านเรียบร้อย
4. **Data Isolation Audit**: ใช้ DevTools ตรวจจับหน่วยความจำว่าไม่มีคีย์แปลกปลอมบันทึกใน LocalStorage
5. **Guidance Security Audit**: ยืนยันว่าหน้าจอหลัก Today Guidance ไม่ได้รับผลกลยุทธ์จาก stub ของปฏิทินไทย
6. **Visibility Logic Audit**: ตรวจสอบว่าแผงวินิจฉัยยุบตัวลงเมื่อสวิตช์ปิด และไม่สร้างความบิดเบี้ยวทางทัศนศิลป์ของหน้าจอ

---

## 12. Risk Review (การวิเคราะห์ความเสี่ยง)

| ลำดับความเสี่ยง | คำอธิบายความเสี่ยง | มาตรการป้องกันทางเทคนิค |
|---|---|---|
| 1 | คอมโพเนนต์วินิจฉัยแสดงผลให้แก่ผู้ใช้งานจริงในระบบปกติ | คัดแยก Wrapper ออกไปไว้ในแท็บ Data Tools และดักจับด้วยเงื่อนไข `variant === 'preview'` |
| 2 | ผู้ใช้งานเกิดความกังวลหรือเข้าใจผิดจากตัวเลขหรือค่า Technical Placeholders | กำหนดกล่อง Safety Notice ชี้แจงชัดเจนและใช้ภาษาที่เป็นกลางทางเทคนิค |
| 3 | ข้อมูลจำลองไหลซึมเข้าไปใน Strategy Composer | ปิดกั้นระดับ TypeScript interface ห้าม Props ของ Composer รับค่า Adapter สัญญาดวงจำลองไทย v0.1 |
| 4 | ค่า `generatedAt` ถูกนำไปใช้สอดแทรกคำนวณเวลาการเดินดาว | กำกับสเปคเอกสารระบุชัดเจนว่าเป็น metadata ของเบราว์เซอร์เท่านั้น |

---

## 13. DEV-114 Handoff Recommendation (ข้อแนะนำใบงานถัดไป)

### ชื่อใบงานถัดไป
`ASTRO-REAL-APP-DEV-114 — Thai Planet Placement Debug Panel Preview Wiring Implementation`

* ใบงาน DEV-114 จะได้รับการผ่อนผันให้อิมพลีเมนต์รหัสโปรแกรม (UI Wiring Code) ได้เฉพาะเมื่อได้รับอนุมัติโดยตรงจากผู้ใช้ใน chat
* หน้าที่การเขียนโค้ดจะจำกัดเฉพาะการจัดสร้าง Wrapper Diagnostics Component และปรับปรุงแก้ไขไฟล์แสดงผลจำลอง `AstroRealAppPreview.tsx` เพื่อนำคอมโพเนนต์วินิจฉัยไปวางในพื้นที่ Data Tools
* การเขียนรหัสจะทำงานภายใต้กฎห้ามแก้ไข `AstroTodayPanel.tsx`, ห้ามเขียนลง LocalStorage, ห้ามส่งข้อมูล stub เข้า Composer และรักษาป้ายความปลอดภัยคำอธิบายให้ครบถ้วน
* ทุกขั้นตอนต้องผ่านการตรวจสอบความถูกต้องของ ESLint, Next.js build และ QA review ก่อนการอนุญาตให้ทำ commit
