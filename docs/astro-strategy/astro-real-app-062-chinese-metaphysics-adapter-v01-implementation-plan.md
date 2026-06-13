# ASTRO-REAL-APP-DEV-062 — Chinese Metaphysics Adapter v0.1 Implementation Plan

## Goal
จัดทำแผนการอิมพลีเมนต์ (Implementation Plan) สำหรับ **Chinese Metaphysics Strategy Layer v0.1 Adapter** เพื่อแปลงแนวคิดการออกแบบใน DEV-061 ไปสู่การวางโครงสร้างโค้ดเชิงเทคนิคที่เป็นระบบ ทนทาน และปลอดภัย (Local-first, Client-side, Copy-safe) โดยรอบงานนี้จะเป็นงานเฉพาะเอกสารเท่านั้นและไม่แก้ไขรหัสโปรแกรมรันไทม์จริง

---

## Scope
- เหตุผลที่ต้องวางแผนก่อนอิมพลีเมนต์จริง
- ข้อมูลพื้นฐานจากเกณฑ์การออกแบบใน DEV-061
- ความสัมพันธ์และการจัดระดับความร่วมมือกับระบบ Thai Astrology Adapter v0.1
- โครงสร้างไฟล์และพาธไฟล์ที่เสนอจัดเตรียม (Proposed File Structure)
- รหัสข้อมูลเชิงประเภท (TypeScript Interfaces & Types)
- การวางโครงร่างพจนานุกรมค่าคงที่ (Proposed Static Dictionaries & ID Maps)
- โครงสร้างฟังก์ชันการคำนวณแบบจำลองอย่างง่าย (Proposed Adapter Functions)
- ลอจิกการแมปและเงื่อนไขการแปลงฤดูกาล 5 ธาตุและรอบปีธรรมชาติ
- วิธีการประเมินสัญญะเกื้อกูล/ควบคุม (Five Elements, Seasonal Rhythm, Generation & Control Cycles)
- ขอบเขตความปลอดภัยและสิ่งที่เป็น Out-of-scope ทางเทคนิค (ห้าม BaZi จริง, ห้ามปฏิทินสุริยคติละเอียด)
- กลยุทธ์การรันแบบออฟไลน์ (Local-first, No-external-API, Non-deterministic)
- วิธีการผสานและอินทิเกรต (Standalone adapter, Today optional context, Multi-layer Insight Composer)
- ผลกระทบต่อ Storage, Export/Import และแผนความปลอดภัย Hydration (Hydration Safety)
- แผนการตรวจจับคุณภาพและทดสอบการทำงานด้วยตนเอง (Manual QA Plan)
- ความเสี่ยงและแนวทางการย้อนกลับ (Rollback considerations)

## Non-scope
- การแก้ไขหรือปรับแต่งโค้ดรันไทม์ในไดเรกทอรี `src/` ทุกกรณีในรอบงานนี้
- การแก้ไขฐานข้อมูลจริงหรือปรับแต่งหน้าจอ UI จริง

---

## Why Implementation Planning Is Needed Before Runtime Code
1. **ป้องกันข้อผิดพลาดในการคำนวณเวลาฝั่ง Client (Hydration Safety)**:
    Next.js มีลักษณะการเรนเดอร์แบบ SSR (Server-Side Rendering) และสลับมาทำงานบน Client การคำนวณที่อิงวันเวลาปัจจุบัน เช่น ฤดูกาล หรือธาตุวัน หากทำแบบ dynamic บนเซิร์ฟเวอร์ด้วยเวลาต่างโซนจะเกิดปัญหาหน้าจอขัดแย้งกัน (Hydration Mismatch) การวางแผนเพื่อจัดการเวลาร่วมกับ Client state ก่อนลงมือเขียนโค้ดจึงจำเป็นอย่างยิ่ง
2. **คุมขอบเขตประสิทธิภาพและทรัพยากร (Anti-Bloat & Storage Constraints)**:
   เนื่องจากระบบจีนมีเนื้อหาบทวิเคราะห์ค่อนข้างกว้าง การวางระบบจัดเก็บด้วยรหัสย่อ (IDs) ในประวัติสะสม และแยกการดึงข้อความคำแปลผ่านพจนานุกรมคงที่ (Static Dictionaries) จะช่วยลดการเติบโตของพื้นที่ LocalStorage และจำกัดผลกระทบต่อความเร็วการประมวลผลเบราว์เซอร์
3. **การคุมความมั่นคงทางจริยธรรมของภาษา (Copy Safety Guarantee)**:
   การวางสเปกคำคงที่และการสแกนหาคำต้องห้ามก่อนการโค้ดจริงช่วยป้องกันการหลุดรอดของข้อความเชิงลบที่จะสร้างความเครียดหรือความกังวลให้ผู้ใช้

---

## DEV-061 Design Baseline
การออกแบบใน DEV-061 ได้กำหนดขอบเขตความรู้เชิงปรัชญาธรรมชาติ 5 ธาตุ (ไม้, ไฟ, ดิน, ทอง, น้ำ) และช่วงฤดูกาลจีนทั้ง 5 (รวมดินรอยต่อฤดูกาล) มาประยุกต์ใช้เพื่อเป็นเครื่องมือประเมินระดับสมาธิสะท้อนตนเอง (Symbolic Equilibrium Guide) โดยมีเป้าหมายไม่ทำนายอนาคตและไม่สร้างความเชื่อเชิงลี้ลับอย่างเด็ดขาด

---

## Relationship to Thai Astrology Adapter v0.1
* **ความคล้ายคลึง**: ทั้งสองศาสตร์จะใช้โมเดลข้อมูล Pure TypeScript ที่ทำงานในเครื่อง (Local-first) ไม่พึ่งพา API ภายนอก และส่งออกข้อมูลการวิเคราะห์เป็น Optional Object เหมือนกัน
* **ความต่าง**: 
  * เลเยอร์ไทย (ยามอุบากอง) จะคำนวณจังหวะเวลารายชั่วโมง (Micro-temporal) 
  * เลเยอร์จีน (รอบปีและห้าธาตุ) จะเน้นประเมินสมดุลสะท้อนคิดระยะปานกลาง-ยาว (Macro-temporal) รายวัน/สัปดาห์/เดือน
* **การผสานข้อมูล**: ข้อมูลผลลัพธ์ของจีนจะถูก Composer ดึงขึ้นมาเปรียบเทียบร่วมกับยามไทย โดยยึดเกณฑ์พลังงานร่างกาย (Today Timing Engine) และจังหวะพักผ่อนเป็นที่ตั้งหลักเสมอ

---

## Chinese Metaphysics Adapter v0.1 Implementation Objective
มุ่งจัดทำ Adapter รันไทม์ที่มีความทนทานสูง ปลอดภัยต่อการพังของระบบ และแสดงผลได้รวดเร็ว โดยไม่จำเป็นต้องใช้ไลบรารีวิเคราะห์ปฏิทินจีนภายนอกขนาดใหญ่ แต่เน้นใช้ตาราง Rule-based แมปจากข้อมูล วันเกิด-เวลาเกิด และวันที่ปัจจุบัน (เป้าหมาย) ออกมาเป็นรหัสสัญญะและคำแปลทันที

---

## Proposed File Structure

ในการพัฒนาเฟสถัดไป เสนอเพิ่มและปรับปรุงไฟล์ต่างๆ ดังนี้:

```text
src/components/workspaces/astro-strategy/real-app/data/
├── astroRealAppTypes.ts                        # [MODIFY] เพิ่มประเภทข้อมูล ChineseMetaphysicsOutput
└── astroRealAppChineseMetaphysicsAdapter.ts     # [NEW] ตัวประมวลผลธาตุและฤดูกาลจีน
```

---

## Proposed TypeScript Types

เสนออัปเดตประเภทข้อมูลใน [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts) ดังนี้:

```typescript
export type ChineseElement = "wood" | "fire" | "earth" | "metal" | "water";

export interface ChineseAstroTimingContext {
  readonly dayMasterElement: ChineseElement;
  readonly currentSeason: "spring" | "summer" | "autumn" | "winter" | "earth-transition";
  readonly relationType: "supporting" | "neutral" | "caution";
}

export interface ChineseMetaphysicsStrategyOutput {
  readonly layerName: "Chinese Metaphysics Strategy";
  readonly source: string; // "ArborDesk Chinese Metaphysics Engine v0.1"
  readonly timingContext: ChineseAstroTimingContext;
  readonly chineseMetaphysicsSignal: string;
  readonly elementFocus: ChineseElement;
  readonly symbolicMeaning: string;
  readonly strategyImplication: string;
  readonly suggestedAction: string;
  readonly reflectionPrompt: string;
  readonly cautionNote: string;
  readonly symbolicAlignment: number; // 0.0 to 1.0
  readonly confidenceNotes: string;
  readonly safetyDisclaimer: string;
  readonly generatedAt: string;
}
```

---

## Proposed Static Dictionaries / ID Maps

เก็บข้อมูลคลังภาษาไทยและสัญลักษณ์ทั้งหมดไว้ในไฟล์ Adapter ฝั่ง Client เพื่อประหยัดเนื้อที่การบันทึก:

1. **CHINESE_ELEMENT_IMPLICATIONS**: เก็บความหมายและคำเตือนรายธาตุ
   ```typescript
   export const CHINESE_ELEMENT_IMPLICATIONS: Record<ChineseElement, {
     readonly meaning: string;
     readonly implication: string;
     readonly suggestedAction: string;
     readonly cautionNote: string;
   }>;
   ```
2. **CHINESE_SEASONAL_IMPLICATIONS**: เก็บรอบธรรมชาติของฤดูกาล
   ```typescript
   export const CHINESE_SEASONAL_IMPLICATIONS: Record<string, {
     readonly name: string;
     readonly mainElement: ChineseElement;
     readonly description: string;
   }>;
   ```
3. **CHINESE_ELEMENT_RELATIONS**: บันทึกความสัมพันธ์เชิงสัญญะ (เกื้อกูล เกื้อหนุน ขัดแย้ง)
   ```typescript
   export const CHINESE_ELEMENT_RELATIONS: Record<string, {
     readonly relationType: "supporting" | "neutral" | "caution";
     readonly alignmentScore: number;
     readonly strategyNote: string;
   }>;
   ```

---

## Proposed Adapter Functions

ฟังก์ชันหลักในอะแดปเตอร์จีนจะประกอบด้วย:

1. **calculateSeasonalTendency(targetDate: string)**:
   ระบุฤดูกาลปัจจุบันอ้างอิงตามกรอบวันเดือนสากล (สุริยคติทั่วไป) เพื่อหาธาตุและฤดูทำงานปัจจุบันอย่างง่าย
2. **getDayMasterElement(birthDate: string)**:
   ใช้สมการปฏิทินจีนแบบจำลอง (Rule-based Math Model) แมปปีและวันเกิดของผู้ใช้เพื่อหาธาตุตัวตนหลักอย่างย่อ
3. **getChineseElementRelation(dayMaster: ChineseElement, currentDayElement: ChineseElement)**:
   วิเคราะห์ความสัมพันธ์ของธาตุตัวตนและธาตุประจำวันตามตารางเกื้อกูล/ควบคุม
4. **buildChineseMetaphysicsStrategyOutput(birthProfile, targetDate, userIntention)**:
   ตัวประสานข้อมูลอินพุต เพื่อดึงข้อความจาก Dictionary และสร้างเอาท์พุต `ChineseMetaphysicsStrategyOutput` ที่ปลอดภัย

---

## Input Requirements
ระบบต้องการข้อมูลอินพุตดังนี้:
* `birthProfile`: เพื่อใช้วันเกิดหา Day Master และใช้เวลาเกิด/โซนเวลาเทียบความคลาดเคลื่อนสุริยคติ
* `targetDate`: วันที่ประเมินเป้าหมาย
* `userIntention` (Optional): คำถามหรือเจตนาที่ส่งเสริมการสะท้อนคิด
* `reflectionHistoryContext` (Optional): ตรวจเช็คประวัติสะสมเพื่อดูแนวโน้มธาตุขาดสมดุล

---

## Five Elements Symbolic Strategy Plan
* **ไม้ (Wood)**: ส่งเสริมการดีไซน์โครงสร้างงาน การเขียนโครงงานใหม่ หรือการวิเคราะห์ระบบ
* **ไฟ (Fire)**: ส่งเสริมการลงมือลุยงานเร่งด่วน การส่งมอบ checkpoint การปิดโปรเจกต์
* **ดิน (Earth)**: ส่งเสริมการบันทึกสรุปผล จัดเอกสาร เคลียร์ฐานข้อมูล ทำความสะอาดพื้นที่เก็บข้อมูล
* **ทอง (Metal)**: ส่งเสริมการตรวจทานความปลอดภัย Refactor ปลดล็อกส่วนเกินของระบบและรายการ todo
* **น้ำ (Water)**: ส่งเสริมการประนีประนอม เจรจา การสลับสับเปลี่ยนเพื่อลดความเหนื่อยล้าสะสม

---

## Seasonal Rhythm Plan
* **ฤดูใบไม้ผลิ (ธาตุไม้)**: กุมภาพันธ์ - เมษายน -> สนับสนุนการลงมือวางรากฐานและริเริ่มสิ่งใหม่
* **ฤดูร้อน (ธาตุไฟ)**: พฤษภาคม - กรกฎาคม -> สนับสนุนการปลดปล่อยพลังงานสร้างสรรค์และส่งมอบผลงานชิ้นหลัก
* **ดินรอยต่อฤดูกาล (ธาตุดิน)**: สัปดาห์ท้ายสุดของแต่ละฤดูสากล -> สนับสนุนการสะสาง จัดสมดุล และฟื้นฟูร่างกาย
* **ฤดูใบไม้ร่วง (ธาตุทอง)**: สิงหาคม - ตุลาคม -> สนับสนุนการปรับแต่งระบบ รันการตรวจสอบคุณภาพอย่างละเอียด
* **ฤดูหนาว (ธาตุน้ำ)**: พฤศจิกายน - มกราคม -> สนับสนุนการหาความรู้เพิ่มเติม ทบทวนตนเอง และทำงานเบื้องหลังอย่างเงียบสงบ

---

## Element Balance / Imbalance Framing Plan
* หากประวัติสะสมของผู้ใช้ชี้ระดับความเครียดสะสมสูงติดต่อกัน (Imbalance) ตัว Adapter จะเปลี่ยนการเตือนของธาตุประจำวันเป็น **"คำชี้แนะการปรับสมดุล (Balancing Guidance)"** แนะนำให้ดึงธาตุที่ช่วยลดความร้อนรนหรือเกื้อหนุนร่างกายเข้ามาจัดสรรเวลาแทน

---

## Generation & Control Cycle Treatment
* ใช้การเตือนความสัมพันธ์ เช่น:
  * *"ธาตุตัวตนได้รับการโอบอุ้มจากธาตุประจำวันตามวงจรเกื้อกูล (Generation)* -> *เป็นโอกาสที่ดีในการสะสางงานที่ต้องใช้พลังสมองสูง"*
  * *"ธาตุตัวตนและธาตุรายวันอยู่ในวงจรควบคุม (Control)* -> *แนะนำให้ประคองสติด้วยการจัดสรร Todo List เพียง 1-2 รายการหลักและลดพฤติกรรมสอดแทรกงานแปลกปลอม"*

---

## Simple Element Tendency Mapping
* ตัว Adapter จะแปลงวันเกิดออกมาเป็นหนึ่งในห้าธาตุหลัก และคำนวณวันปัจจุบันออกมาเป็นธาตุประจำวันตามรอบ 5 ธาตุคงที่แบบเวียนรอบง่าย (Rule-based Modulo 5 Cycle อ้างอิงปีฐานปฏิทินคงที่) หลีกเลี่ยงตรรกะคำนวณโหรที่หนักเกินไป

---

## Out-of-Scope Calculation Boundaries
* **ไม่มีการคำนวณเสาหลัก BaZi แบบเต็มรูปแบบ**: ไม่คำนวณ 4 เสาชะตาหรือดาวแฝงเพื่อสร้างคำทำนายชีวิต
* **ไม่มีการใช้ตารางฮวงจุ้ยดาวเหิน (Flying Stars)**: ไม่สนับสนุนการชี้แนะทิศทางเฟอร์นิเจอร์หรือตำแหน่งโต๊ะทำงานเชิงลี้ลับ
* **ไม่มีคำทำนายโชคชะตาเบ็ดเสร็จ (Deterministic Predictions)**: หลีกเลี่ยงประโยคทำนอง "ดวงดีที่สุด" หรือ "จะเกิดวิกฤตสูญเสีย"

---

## Local-First & Safety Strategy
* **Local-First & No-External-API**: โค้ดทั้งหมดรันแบบ Rule-based ท้องถิ่นบนคอมพิวเตอร์ผู้ใช้ ไม่ส่งข้อมูลวันเกิดและประวัติการสะท้อนคิดไปยัง API เซิร์ฟเวอร์ภายนอกเด็ดขาด รักษาความเป็นส่วนตัวสูงสุด
* **No-Deterministic-Prediction**: คุมข้อความด้วยระบบ Disclaimers และถ้อยคำภาษาไทยเชิงปรัชญาประคองสติ

---

## Integration Options & Target

1. **Option A: Standalone Adapter Only (รอบแรก)**:
   พัฒนาโมดูลอะแดปเตอร์เพื่อทำการคำนวณผลลัพธ์ผ่านอินพุตทดสอบ โดยยังไม่เปิดเรนเดอร์ในแอป
2. **Option B: Future Today Optional Context (รอบถัดไป)**:
   เชื่อมต่อเอาท์พุตเข้าสู่ Today Panel แสดงผลในรูปแบบการ์ดบริบททางเลือก (Optional Context Card)
3. **Option C: Multi-layer Insight Composer**:
   ผสานระบบวิเคราะห์ยามไทยและจีนเข้าด้วยกันผ่านตัวสังเคราะห์กลาง (Composer)

**เป้าหมายการเชื่อมต่อแรกสุดที่แนะนำ**:
* ดำเนินการอิมพลีเมนต์ **Option A** เพื่อทดสอบฟังก์ชัน Pure TypeScript ของอะแดปเตอร์ให้ผ่านการทดสอบคุณภาพ 100% จากนั้นค่อยเชื่อมต่อเรนเดอร์ร่วมกับการ์ดยามไทยใน Today Panel

---

## Storage & Export/Import Implications
* ข้อมูลผลลัพธ์จากเลเยอร์จีนจะบันทึกในรูปแบบ รหัสสัญญะสั้นๆ (IDs) ลงในฟิลด์ Optional `timingContext.chineseElementId` ภายในประวัติสะสม
* ลอจิกการส่งออกและนำเข้าข้อมูลเดิมใน MVP-v3 จะสามารถเพิกเฉยฟิลด์เหล่านี้ได้หากเป็นระบบแบบเก่า ทำให้การนำเข้าและส่งกลับไม่เกิดอาการระบบล้มเหลว (Safe Backward Compatibility)

---

## Hydration Safety Plan
* เพื่อหลีกเลี่ยงปัญหา hydration mismatch ของ Next.js ตัว Adapter จะไม่มีการใช้ฟังก์ชันดึงเวลาปัจจุบันของระบบเครื่องโดยอัตโนมัติขณะโหลดหน้า แต่จะกำหนดให้ `targetDate` และ `targetTime` ต้องถูกป้อนเข้าสู่ฟังก์ชันจาก Component ระดับบนที่ผ่านการตรวจสอบสถานะ Mount สำเร็จ (Mounted client state) แล้วเท่านั้น

---

## Copy-Safety Enforcement Plan
* ก่อนเผยแพร่โค้ด จะกำหนดการรันชุดคัดกรองข้อมูลตัวอักษรเพื่อสแกนตรวจสอบคำที่ไม่พึงประสงค์ (เช่น คำทำนายความตาย อุบัติเหตุ โชคลาภร่ำรวย เงินล้าน โชคชะตาถูกกำหนดไว้แล้ว) เพื่อให้มั่นใจได้ว่าคำชี้แนะทั้งหมดส่งเสริมสมาธิเชิงบวกและสุขภาพจิตที่ดีของผู้ใช้

---

## Manual QA Plan for Future Implementation

1. **Seasonal Calculator Verification**:
   - ป้อนวันที่จำลองในฤดูหนาว (เช่น `"2026-12-15"`) และตรวจสอบว่า Adapter คืนค่าฤดูกาลเป็น `winter` และธาตุประจำฤดูเป็น `water` หรือไม่
2. **Element Formula Verification**:
   - ป้อนวันเกิดจำลอง และตรวจสอบความแม่นยำของการคำนวณจับธาตุเกิดหลัก Day Master ให้ได้ค่าคงที่สอดคล้องตามตัวเปรียบเทียบเชิงคำนวณปฏิทินที่อ้างอิง
3. **Copy-Safety Automated Scan**:
   - เขียนชุดคำสั่งสแกนคลัง Dictionary ทั้งหมดเพื่อตรวจสอบความปลอดภัยของข้อความแจ้งเตือน

---

## Known Risks & Rollback Considerations
* **ความซับซ้อนของข้อมูลปฏิทิน**: เนื่องจากมีการจำลองรอบธาตุด้วยคณิตศาสตร์อย่างง่าย อาจไม่ตรงกับปฏิทินจีนแบบดั้งเดิม 100% ในช่วงวันเปลี่ยนเสาหลักชะตา
  * *แนวทางแก้ไข*: ระบุใน `disclaimer` และ `confidenceNotes` อย่างชัดเจนว่าเป็นรูปแบบสัญญะประยุกต์เชิงกลยุทธ์ (Strategic Metaphor) ไม่ใช่การผูกดวงจีนแบบสมบูรณ์
* **Rollback Plan**: หากระบบโหลดมีความล่าช้าหรือสร้าง hydration error จะคงสิทธิ์ปิดเลเยอร์จีนผ่าน Toggle สลับ และถอยรหัสโปรแกรมกลับไปยังจุดคอมมิตก่อนหน้าได้ทันที

---

## Recommended Next Task
* **ASTRO-REAL-APP-DEV-063 — Chinese Metaphysics Adapter v0.1 Implementation** (ลงมือพัฒนาโค้ดตัวแปลงระบบจีนและพจนานุกรมค่าคงที่ตามแผนงานนี้)

---

## Final Implementation Plan Verdict

```text
Chinese Metaphysics Adapter v0.1 Implementation Plan Locked: Establishes offline Rule-based calculation, defines safe data structures compatible with v3 backup, and structures copy safety checks.
```
