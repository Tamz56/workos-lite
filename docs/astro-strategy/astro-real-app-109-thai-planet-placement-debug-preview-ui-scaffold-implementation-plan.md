# Thai Planet Placement Debug Preview UI Scaffold Implementation Plan (DEV-109)

เอกสารแผนการทำงานเชิงลึกสำหรับการพัฒนาคอมโพเนนต์วินิจฉัยตำแหน่งดวงดาวจำลอง (UI Scaffold Implementation Plan) เพื่อระบุแบบสัญญารหัส (Props Contract), แหล่งจ่ายข้อมูล, เลย์เอาต์ทางทัศนศาสตร์ และแนวทางการรันการรับประกันคุณภาพในเครื่องถิ่น

---

## 1. Purpose (วัตถุประสงค์)

แผนปฏิบัติงานฉบับ DEV-109 นี้กำหนดแนวทางการพัฒนาโค้ด โครงร่าง Types และ Props Contract ของคอมโพเนนต์วินิจฉัยย่อยแบบปิด `ThaiPlanetPlacementDebugPanel` โดยมีจุดประสงค์หลักเพื่อให้นักพัฒนาฝั่งผู้ใช้งานระบบสามารถเขียนชุดโค้ดแสดงผลข้อมูลจำลองดวงดาวเคราะห์ปฏิทินไทย v0.1 ได้อย่างปลอดภัยในเฟสถัดไป

---

## 2. Scope and Non-goals (ขอบเขตและข้อกำหนด)

* **ขอบเขตการวางแผนปฏิบัติงาน (Scope)**:
  * การนิยามโครงสร้าง Props Contract สำหรับ React component ฝั่ง Typescript
  * การวางผังพอร์ตข้อมูลจากตัวประสานงาน `buildThaiPlanetPlacementRuntimeAdapterV01`
  * การจัดลำดับเรนเดอร์ในเลย์เอาต์ (Header, Safety Notice, Metadata, Safety Summary, Planet Table, Footer Guardrail)
  * การตั้งเงื่อนไขสวิตช์ Flags เพื่อจำกัดสิทธิ์การมองเห็น (Feature Flag & Visibility Plan)
* **ขอบเขตที่ยกเว้น (Non-goals)**:
  * **ไม่มีการสร้างหรือดัดแปลงซอร์สโค้ดในรอบนี้**: ห้ามแตะต้องไฟล์ `.tsx` ใดๆ ในโปรเจกต์
  * **ไม่มีการพัวพันกับ LocalStorage**: ไม่มีระบบบันทึกความคงอยู่เชิงข้อมูล
  * **ไม่มีการเพิ่มระบบคำนวณหรือพิกัดจริง**: ดาวทุกดวงต้องแสดงผลเฉพาะค่า placeholder อ้างอิงเท่านั้น
  * **ไม่มีคำทำนายโชคชะตา**: ปลอดการเขียนถ้อยคำชี้แนะการวางแผนชีวิตผู้ใช้

---

## 3. Proposed Future Component: ThaiPlanetPlacementDebugPanel (โครงร่างคอมโพเนนต์ในอนาคต)

* **คอมโพเนนต์ย่อย**: `ThaiPlanetPlacementDebugPanel`
* **พฤติกรรมเชิงโครงสร้าง**:
  * รับค่าข้อมูลอินพุตโปรไฟล์เกิด และกรณีศึกษาจำลอง (ถ้ามี) ผ่าน Props
  * เรนเดอร์ส่วนติดต่อผู้ใช้แบบตารางวินิจฉัยเทคนิคล้วน ปราศจากการสุ่มหรือเพิ่มค่าใน Memory นอกขอบข่าย
  * ซ่อนหรือแสดงผลผ่านเงื่อนไข flags ที่ผู้ควบคุมกำหนด

---

## 4. Proposed Future File Path (เส้นทางตำแหน่งจัดเก็บไฟล์ที่นำเสนอ)

* **เส้นทางไฟล์ที่แนะนำ**: 
  `src/components/workspaces/astro-strategy/real-app/components/diagnostics/ThaiPlanetPlacementDebugPanel.tsx`
* **เหตุผล**:
  * โฟลเดอร์ `components/diagnostics/` บ่งชี้เจตจำนงของคอมโพเนนต์ว่ารันเฉพาะในระบบตรวจสอบควบคุมสัญญาข้อมูล (Safety contract validation) ช่วยสกัดกั้นโอกาสที่นักพัฒนาจะอิมพอร์ตข้อมูลผิดหน้าจอ

---

## 5. Proposed Props Contract (แบบสัญญาประเภทพร็อพส์)

แบบสัญญาข้อมูลของอินเตอร์เฟส React Props ในไฟล์คอมโพเนนต์อนาคตจะกำหนดดังนี้:

```typescript
import { ThaiPlanetPlacementInput, ThaiPlanetPlacementReferenceCaseLike } from '../../data/astroRealAppTypes';

export interface ThaiPlanetPlacementDebugPanelProps {
  /** ข้อมูลอินพุตบริบทการเกิดของผู้ใช้ (ใช้สำหรับดึง calendar/calculation system) */
  birthProfileInput: ThaiPlanetPlacementInput;
  /** กรณีศึกษาควบคุมอ้างอิงสำหรับการสอบเทียบสัญญาความปลอดภัย (ถ้ามี) */
  referenceCase?: ThaiPlanetPlacementReferenceCaseLike;
  /** คลาส CSS เพิ่มเติมสำหรับตกแต่งภายนอก */
  className?: string;
}
```

---

## 6. Proposed Data Source (แหล่งจ่ายข้อมูลสำหรับรันไทม์)

ในฝั่ง UI คอมโพเนนต์จะดึงข้อมูลผ่านการใช้ฟังก์ชันประสานงาน In-memory ในจังหวะ Render:

```typescript
import { buildThaiPlanetPlacementRuntimeAdapterV01 } from '../../data/astroRealAppThaiPlanetPlacementAdapter';

// ดึงผลลัพธ์ประมาณการตำแหน่งดวงดาวจำลองและสรุปความมั่นคงทางข้อมูลแบบ On-the-fly
const adapterResult = buildThaiPlanetPlacementRuntimeAdapterV01(
  birthProfileInput,
  referenceCase
);
const { results, safetySummary, adapterStatus, generatedAt } = adapterResult;
```

---

## 7. Proposed Layout (เค้าโครงเลย์เอาต์การเรนเดอร์)

คอมโพเนนต์จะเรนเดอร์เนื้อหาเป็นชั้นเรียงตามความสำคัญดังนี้:
1. **Header (ส่วนหัวคอมโพเนนต์)**: ชื่อระบบ `"Thai Planet Placement Diagnostics"` พร้อม Badges แสดงค่า `adapterStatus` ในสถานะ `stub-only`
2. **Safety Notice (กล่องแจ้งเตือนความปลอดภัย)**: คำเตือนแถบสีส้มบ่งบอกอย่างชัดเจนว่าระบบเป็นโหมดวินิจฉัยห้ามใช้ทำนายดวงจริง
3. **Adapter Metadata**: ประทับเวลา `generatedAt` ในฐานะข้อมูล Metadata (ห้ามใช้คำว่าเป็นเวลาคำนวณจริง)
4. **Safety Summary (รายงานระบบกักภัย)**: ตารางสรุปสถิติ `comparableCount: 0` และ `notComparableCount: 10`
5. **Planet Table (ตารางดวงดาว)**: รายงานพิกัด 10 แถวดวงดาวในสถานะ `pending-reference-validation`
6. **Footer Guardrail**: ข้อความเตือนความคงอยู่ `"ข้อมูลในหน้านี้ไม่มีการบันทึกลงเบราว์เซอร์หรือเครื่องถิ่น"`

---

## 8. Placeholder Display Rules (กฎเกณฑ์การกรองข้อมูลจำลอง)

* ข้อมูลในตารางคอลัมน์ ราศี และองศา ห้ามแปลงเป็นภาษาโหราศาสตร์อธิบายเด็ดขาด ต้องพิมพ์ค่าดิบ `pending-reference-validation` หรือ `unavailable` แบบตรงตัว
* สถานะความเชื่อมั่นต้องถูกล็อกไว้ที่ `pending` หรือ `not-validated`

---

## 9. Visual Safety Rules (กฎเกณฑ์ทางดีไซน์)

* ใช้รูปแบบป้ายแบบสีเทาเรียบง่าย (Muted neutral badges)
* ห้ามใช้สีสันที่เป็นการชี้วัดผลดี/ร้ายเชิงความเชื่อของดวงชะตาเด็ดขาด
* มีกรอบสีเทา/ดำที่ตัดขอบชัดเจน แยกแผง Diagnostics ออกจาก UI ข้อมูลทั่วไปของผู้ใช้

---

## 10. Feature Flag / Visibility Plan (แผนควบคุมสิทธิ์การมองเห็น)

* การอิมพอร์ตคอมโพเนนต์นี้เข้าสู่จุดแสดงผลจริงในอนาคต ต้องใช้การครอบเงื่อนไข:
  ```tsx
  {process.env.NODE_ENV === 'development' && (
    <ThaiPlanetPlacementDebugPanel 
      birthProfileInput={birthProfile}
      referenceCase={placeholderRefCase}
    />
  )}
  ```

---

## 11. Relationship with Manual Diagnostic Script (ความสัมพันธ์กับสคริปต์วินิจฉัยด้วยมือ)

* โครงสร้าง Layout และการ Assert ค่าเชิงสถิติในคอมโพเนนต์นี้ ต้องสอดคล้องกับพฤติกรรมตรวจวัดในสคริปต์ [check-thai-planet-placement-contract.cjs](file:///Users/tamz/projects/workos-lite/scripts/astro-diagnostics/check-thai-planet-placement-contract.cjs) ทุกประการ 
* สคริปต์ CLI ทำหน้าที่ตรวจสอบสัญญาข้อมูลใน Memory ระดับหลังบ้าน ส่วนคอมโพเนนต์ย่อยนี้ทำหน้าที่แสดงผลสัญญาเดียวกันออกสู่สายตานักพัฒนาบนส่วนหน้า

---

## 12. QA Requirements for Future Code Round (ข้อกำหนดการประกันคุณภาพรหัสโค้ดจริง)

ในการเขียนคำสั่งโค้ดในรอบ DEV-110 ในอนาคต จะต้องผ่านการประเมิน:
1. การผ่าน ESLint และคำเตือน file ignored Warning ตัวเดิมจากสคริปต์เครื่องถิ่น
2. การรัน Next.js production build ผ่านสำเร็จ 100%
3. การตรวจทานความปลอดภัยทางภาษา (Copy Safety) ในคอมโพเนนต์ว่าไม่มีคำต้องห้ามชี้นำโชคชะตาปะปน

---

## 13. Risk Review (การประเมินวิเคราะห์ความเสี่ยง)

* **ความเสี่ยงในการ persist ข้อมูล**: หากนักพัฒนาในอนาคตต้องการดึงค่าดาวนี้ไปเขียนลง LocalStorage (ลดความเสี่ยงโดยระบุขอบเขตProps แบบ Read-only ล้วน)
* **ความเสี่ยงการรั่วไหลคำบรรยาย**: ผู้ใช้อาจพบหน้าต่างนี้และนำไปทบทวนในเชิงโหราศาสตร์ประยุกต์วิถีชีวิต (ลดความเสี่ยงโดยห้ามคำนวณและแสดงผลรหัสเป็นรหัสภาษาอังกฤษล้วน)

---

## 14. DEV-110 Handoff Recommendation (แผนส่งต่อสำหรับ DEV-110)

* **ชื่อใบงานถัดไป**: `ASTRO-REAL-APP-DEV-110 — Thai Planet Placement Debug Preview UI Scaffold`
* **แนวทางปฏิบัติเชิงโค้ด**: ใบงานถัดไปจะได้รับการอนุมัติให้จัดสร้างไฟล์โค้ด React Component จริงบนพิกัดแนะนำ โดยจำต้องปฏิบัติตามขอบเขต:
  * ไม่เขียนข้อมูลลง LocalStorage
  * ไม่ผูกข้อมูลดาวไทยร่วมกับ Today panel strategy Composer
  * บังคับแสดงผลลัพธ์ของ `adapterStatus` และ `safetySummary` ด้านบนแผงควบคุมหน้าจอเด่นชัด
