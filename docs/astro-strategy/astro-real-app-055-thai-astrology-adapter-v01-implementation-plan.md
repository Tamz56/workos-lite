# ASTRO-REAL-APP-DEV-055 — Thai Astrology Adapter v0.1 Implementation Plan

## Goal
จัดทำแผนการดำเนินงานและสถาปัตยกรรมระดับซอฟต์แวร์ (Implementation Plan) สำหรับตัวแปลงและวิเคราะห์ฤกษ์ยามไทย **Thai Astrology Adapter v0.1** เพื่อเปลี่ยนแนวคิดเชิงจริยธรรมและการออกแบบข้อมูลใน DEV-053 และ DEV-054 ให้เป็นกลยุทธ์การเขียนโปรแกรมรันไทม์ที่สอดคล้องกับคุณสมบัติ Local-first, ปลอดภัย และไม่สร้างความบวมให้กับโค้ดเดิม

---

## Scope
- การออกแบบโครงสร้างไฟล์รันไทม์ที่จะสร้างและขยาย (Proposed File Structure)
- รายละเอียดรูปแบบ Typescript ที่ใช้งานร่วมกัน
- แผนที่ตารางข้อมูลแบบคงที่ (Static Dictionaries / ID Maps)
- ข้อกำหนดลอจิกการคำนวณและจัดแบ่งยามอุบากองย่อ (Yam Ubakong Calculations)
- วิธีการหลีกเลี่ยงการพึ่งพาไลบรารีดาราศาสตร์จริงภายนอก (No-ephemeris & No-full-natal-chart strategy)
- โครงการและทิศทางการผสานระบบเข้ากับหน้าจอและประวัติเดิม (Integration Options)
- การป้องกันข้อผิดพลาด Hydration และความปลอดภัยด้านฐานข้อมูล
- แผนการตรวจสอบคุณภาพ (Manual QA Plan) และระบบกู้คืนโค้ด (Rollback considerations)

## Non-scope
- การเขียน แก้ไข หรือสลับโค้ดรันไทม์จริงใน `src/` (Documentation-only)
- การต่อเติมหน้าจอ UI ในรันการพัฒนารอบนี้

---

## Why Implementation Planning is Needed Before Runtime Code

1. **หลีกเลี่ยงความยุ่งเหยิงของข้อมูล (Contextual Isolation)**:
   หากเริ่มเขียนโค้ดโดยไม่มีแผนการเชื่อมโยงระบบ Adapter อาจส่งผลให้ลอจิกการคำนวณยามอุบากองไทยแทรกซึมไปสู่ระบบ Today Engine หลัก จนทำให้ไม่สามารถถอดถอนหรือแยกเลเยอร์ศาสตร์อื่นในอนาคตได้ การวางโครงสร้าง Adapter แยกชิ้นแบบ Read-only และ UI-light ช่วยควบคุมของเขตของผลกระทบให้แคบที่สุด
2. **ป้องกันความจุข้อมูลระเบิดในเบราว์เซอร์ (Storage Bloat Protection)**:
   การบันทึกประวัติสะท้อนคิดลง LocalStorage ค่อนข้างจำกัด แผนนี้จะช่วยตกลงกันล่วงหน้าว่า ตัว Adapter จะส่งเฉพาะรหัสย่อ (IDs) เพื่อบันทึกลงฐานข้อมูล และเก็บตัวคำอธิบายภาษาเต็มรูปแบบไว้ในหน่วยความจำ Static ของตัวแอป เพื่อปกป้อง Data Portability (v3)

---

## Baseline baselines
- **DEV-053 (Design)**: วางเป้าหมายการประยุกต์ใช้วันเกิดประจำสัปดาห์ (Birth Weekday), ยามอุบากองย่อประจำวัน และความเหมาะสมของธาตุเกิด
- **DEV-054 (Output Contract & Copy Safety)**: ล็อกอินเตอร์เฟซ TypeScript `ThaiAstroOutputContract` ตารางคุมภาษาต้องห้าม และกฎความสำคัญของกันชนความล้า (Low-burnout priority)

---

## Proposed File Structure

ระบบคำนวณและแสดงผลจะถูกจัดวางแยกจากโมดูลหลักอย่างเด็ดขาด:

1. `src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiAstroAdapter.ts` **[NEW]**
   - ไฟล์แกนหลักสำหรับ Static Dictionaries และฟังก์ชันคำนวณยามอุบากอง/ธาตุเกิด
2. `src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts` **[MODIFY]**
   - เพิ่มอินเตอร์เฟซและฟิลด์เสริมของเอาท์พุตยามไทยในลักษณะ Optional ฟิลด์ เพื่อไม่กระทบต่อประวัติเดิม

---

## Proposed TypeScript Types

โครงสร้างที่จะประกาศเพิ่มใน `astroRealAppTypes.ts`:

```typescript
export interface ThaiAstroYamDetail {
  readonly yamIndex: number; // 0 ถึง 4 (กลางวัน) หรือ 0 ถึง 4 (กลางคืน)
  readonly yamName: string; // e.g. "ยามปลอดโปร่ง (สี่จักรา)"
  readonly alignmentScore: number; // 0.0 ถึง 1.0
  readonly interpretation: string;
  readonly strategyImplication: string;
  readonly suggestedAction: string;
  readonly cautionNote: string;
}

export interface ThaiAstroElementRelation {
  readonly currentElement: string;
  readonly relationshipType: "supporting" | "neutral" | "caution";
  readonly briefExplanation: string;
}
```

---

## Proposed Static Dictionaries / ID Maps

คำแปลยาวๆ และแนวคิดเชิงกลยุทธ์จะถูกเก็บในรูปของ Dictionary แบบคงที่ภายใน Adapter เพื่อไม่สร้างความบวมให้แก่ประวัติสะสม:

```typescript
export const THAI_YAM_IMPLICATIONS: Record<string, Omit<ThaiAstroYamDetail, "yamIndex" | "yamName">> = {
  "yam-chakrai": {
    alignmentScore: 1.0,
    interpretation: "ยามสี่จักรานำความปลอดโปร่งและโอกาสประสานงานราบรื่น",
    strategyImplication: "จังหวะเวลาท้องถิ่นเอื้ออำนวยต่อการเจรจา ประชุม หรือทำงานเชิงสร้างสรรค์ที่ต้องการการคิดร่วมกัน",
    suggestedAction: "มุ่งความสนใจไปที่งานเจรจาหลักหรือปิด Checkpoint ชิ้นสำคัญใน Sprint",
    cautionNote: "ไม่ควรเร่งรัดปิดดีลโดยไม่ได้ตรวจทานเงื่อนไขรอบสอง"
  },
  "yam-soon-one": {
    alignmentScore: 0.3,
    interpretation: "ยามเตือนสติและระมัดระวัง (ศูนย์หนึ่งตัว)",
    strategyImplication: "จังหวะเวลาส่งสัญญาณเตือนให้ประเมินความปลอดภัยและชะลอการลงมือทำกิจกรรมที่มีความเสี่ยงสูง",
    suggestedAction: "ยืดเส้นยืดสาย พักสายตา 3 นาที และเน้นตรวจสอบแก้ไขเอกสารแทนการส่งมอบด่วน",
    cautionNote: "หลีกเลี่ยงการใช้อารมณ์ตัดสินใจเรื่องใหญ่ในชั่วโมงนี้"
  }
  // รายการยามอุบากองอื่นๆ ครบถ้วน 5 รูปแบบหลัก
};
```

---

## Proposed Adapter Functions

```typescript
/** คำนวณช่วงยามอุบากองจากเวลาจริง */
export function getThaiYamIndexFromTime(timeStr: string): number {
  const [hour, min] = timeStr.split(":").map(Number);
  const totalMinutes = hour * 60 + min;
  
  // ยามกลางวัน 06:00 - 18:00 (แบ่งเป็น 5 ยาม ยามละ 144 นาที หรือ 2 ชม. 24 นาที)
  if (totalMinutes >= 360 && totalMinutes < 1080) {
    const elapsed = totalMinutes - 360;
    return Math.floor(elapsed / 144);
  }
  // ยามกลางคืน 18:00 - 06:00
  return -1; // กำหนดขอบเขต v0.1 เน้นเฉพาะยามเวลางานกลางวันเป็นหลัก
}

/** ฟังก์ชันหลักสำหรับวิเคราะห์ผลลัพธ์ยามไทย */
export function calculateThaiAstrologyStrategy(
  birthWeekday: string,
  targetDate: string,
  targetTime?: string
): ThaiAstroOutputContract;
```

---

## Integration Plan (UI-Light & Read-Only)

เพื่อให้การเชื่อมต่อปลอดภัยสูงสุด:
1. **การคำนวณ (Calculation Execution)**:
   ตัว Adapter จะถูกเรียกทำงานแบบ Standalone ภายในแผง Today panel และ Reflection Draft editor เท่านั้น
2. **การแสดงผลขั้นแรก (Read-only Context)**:
   เอาท์พุตจะถูกนำเสนอในแผงประเมินด้านขวามือ (Right panel) เป็นบล็อกย่อยเสริมข้อมูลเวลาที่ชื่อว่า **"จังหวะเวลาฤกษ์ยามท้องถิ่น (Optional Thai Timing Info)"**
3. **การควบคุมด้วยผู้ใช้ (Toggle Switch)**:
   บนแผงควบคุมซ้ายมือจะมีสวิตช์เปิด/ปิด `Enable Thai Astrology Layer` หากปิด ระบบจะไม่รันการคำนวณและซ่อนกล่องเอาท์พุตนี้จาก UI ทันที เพื่อป้องกันข้อมูลล้นจอ

---

## Storage & Portability Safety

- **ความปลอดภัยฐานข้อมูล**: บันทึกข้อมูลเสริมยามอุบากองลง `timingContext` ของ `ReflectionHistoryItem` เป็นเพียง IDs ขนาดสั้นเท่านั้น (เช่น `thaiAstroId: "yam-soon-one"`)
- **การนำเข้ากู้คืน**: อัปเดต Validator ของฟังก์ชัน Restore เพื่อข้ามฟิลด์ IDs ใหม่เหล่านี้หากเป็น Optional ทำให้ข้อมูลสำรองจากเวอร์ชัน MVP-v2 และ v3 เก่ายังคงนำเข้าได้อย่างสมบูรณ์

---

## Hydration Safety Plan

 Next.js จะเกิดข้อผิดพลาด hydration หากเวลาปัจจุบันของเบราว์เซอร์ต่างกับเวลาตอน Server Prerender:
- **แผนป้องกัน**:
  - ใช้ React state: `const [clientTime, setClientTime] = useState<string | null>(null);`
  - อัปเดตค่า `clientTime` ภายใน `useEffect` หลังจากคอมโพเนนต์ Mount สำเร็จในเบราว์เซอร์แล้วเท่านั้น
  - หาก `clientTime` เป็น `null` ให้ซ่อนหน้าต่างหรือแสดงข้อความโหลดสั้นๆ เพื่อหลีกเลี่ยง Hydration Mismatches

---

## Rollback Considerations
หากอิมพลีเมนต์แล้วเกิดปัญหาประสิทธิภาพช้าลงหรือข้อมูลพัง:
- **ทางถอย**: เนื่องจากลอจิกการคำนวณยามแยกอยู่ใน Adapter เดี่ยว และเชื่อมต่อผ่านสวิตช์ปิด/เปิด ทำให้เราสามารถแก้สถานะของสวิตช์ให้เป็น `false` เป็นค่าเริ่มต้น หรือลบโค้ดการแสดงผลบนหน้าจอออกโดยไม่มีผลกระทบต่อกลไกคำนวณ Today/Weekly หลักของระบบ

---

## Recommended Next Task
* **ASTRO-REAL-APP-DEV-056 — Chinese Metaphysics Layer Design** (ออกแบบเลเยอร์จีนในเอกสารก่อนที่จะเริ่มเขียนโค้ดรวมกัน)

---

## Final Implementation Plan Verdict

```text
Thai Astrology Adapter Plan Approved: Staged component isolation defined, static dictionary structures mapped, hydration safety secured, and backward compatibility protected.
```
