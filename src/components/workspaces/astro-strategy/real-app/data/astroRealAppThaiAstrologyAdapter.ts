import {
  AstroBirthProfile,
  ThaiAstroStrategyOutput,
  ThaiAstroCautionLevel,
  ThaiAstroSymbolicAlignment
} from "./astroRealAppTypes";

/**
 * สัญญาลักษณ์และข้อแนะนำของรอบยามอุบากองย่อ (Static Dictionary)
 * ออกแบบภาษาให้ปลอดภัยตาม Copy-Safety & Ethics Guardrails ปราศจากคำพยากรณ์เชิงโชคชะตาเด็ดขาด
 */
export interface YamImplication {
  readonly name: string;
  readonly symbolicMeaning: string;
  readonly strategyImplication: string;
  readonly suggestedAction: string;
  readonly cautionNote: string;
  readonly cautionLevel: ThaiAstroCautionLevel;
  readonly alignmentScore: ThaiAstroSymbolicAlignment;
}

export const THAI_YAM_IMPLICATIONS: Record<string, YamImplication> = {
  "yam-four-chakras": {
    name: "ยามปลอดโปร่ง (สี่จักรา)",
    symbolicMeaning: "สัญญะแห่งความสอดคล้องและการจัดสรรเวลาที่ลงตัว",
    strategyImplication: "จังหวะเวลาท้องถิ่นเอื้อต่อความโปร่งสบายของสมาธิ เหมาะแก่งการประชุม เจรจา หรือลงมือทำ Deep Work เขียนโค้ดชิ้นเอก",
    suggestedAction: "เปิดโหมดห้ามรบกวน 45 นาที มุ่งจัดการภารกิจที่มีระดับความสำคัญสูงสุดประจำวัน",
    cautionNote: "ระวังการเปิดหน้างานใหม่หลายเรื่องพร้อมกันจนโฟกัสเสียสมดุล",
    cautionLevel: "low",
    alignmentScore: 1.0
  },
  "yam-three-crests": {
    name: "ยามสนับสนุน (สามยอด)",
    symbolicMeaning: "สัญญะแห่งการปิดจบและส่งมอบงานได้อย่างเรียบร้อย",
    strategyImplication: "จังหวะเวลาเอื้อต่อการตรวจทานโค้ด แก้ไขบั๊ก สรุปผลการทดสอบระบบ หรือการส่งมอบ checkpoint",
    suggestedAction: "ตรวจสอบความเรียบร้อยของโค้ดรอบสุดท้าย และกดยืนยันบันทึกสรุปงานประจำคาบ",
    cautionNote: "หลีกเลี่ยงการตัดขั้นตอนทดสอบเพียงเพราะต้องการส่งมอบงานเร็วเกินไป",
    cautionLevel: "low",
    alignmentScore: 0.8
  },
  "yam-single-zero": {
    name: "ยามเป็นกลาง (ศูนย์ตัวเดียว)",
    symbolicMeaning: "สัญญะแห่งความสงบและการรักษาเสถียรภาพการทำงาน",
    strategyImplication: "จังหวะเวลาปกติ เหมาะสำหรับการสะสางงานทั่วไปที่คุ้นเคย การตอบจดหมาย หรือปรับระเบียบไฟล์เอกสาร",
    suggestedAction: "จัดหมวดหมู่ไฟล์ในโฟลเดอร์ทำงาน และสะสางรายการ todo ค้างสะสม",
    cautionNote: "ระวังการปล่อยเวลาให้ล่วงเลยไปโดยไม่มีเป้าหมายจดจ่อที่ชัดเจน",
    cautionLevel: "low",
    alignmentScore: 0.5
  },
  "yam-double-zero": {
    name: "ยามระมัดระวัง (ศูนย์สองตัว)",
    symbolicMeaning: "สัญญะแห่งการถอยห่างเพื่อประเมินความปลอดภัยของระบบ",
    strategyImplication: "จังหวะเวลาส่งสัญญาณให้ชะลอการตัดสินใจเรื่องใหญ่ หรือให้ตรวจสอบความเสถียรของโค้ดอย่างระมัดระวัง",
    suggestedAction: "รันชุดคำสั่งทดสอบระบบ (lint/build) และจัดเก็บสำรองข้อมูลเพื่อความปลอดภัย",
    cautionNote: "ช่วงเวลานี้ควรเฝ้าระวังข้อผิดพลาดทางเทคนิคจากการสลับ context การทำงานบ่อยครั้ง",
    cautionLevel: "medium",
    alignmentScore: 0.3
  },
  "yam-soon-one": {
    name: "ยามเฝ้าระวังความล้า (มหาอุบาทว์/ศูนย์หนึ่ง)",
    symbolicMeaning: "สัญญะเพื่อการผ่อนคลายและลดระดับการรับภาระงานตึงตัว",
    strategyImplication: "ฤกษ์ยามท้องถิ่นส่งข้อความเตือนให้หยุดประเมินระดับความเหนื่อยล้า และปฏิเสธการสวมทับงานใหม่ที่ซับซ้อนเกินไป",
    suggestedAction: "หยุดพักสายตา 3-5 นาที หลีกหนีหน้าจอ และดื่มน้ำเพื่อฟื้นฟูโฟกัสสมอง",
    cautionNote: "หลีกเลี่ยงการลงนามตกลงข้อเสนอที่มีความเร่งรีบในชั่วโมงนี้",
    cautionLevel: "high",
    alignmentScore: 0.1
  }
};

/**
 * ตารางวันเกิดประจำสัปดาห์คู่กับฤกษ์ยามอุบากองย่อประจำวัน (Sunday-Saturday)
 * แผนการแมปยามกลางวัน 5 ช่วงหลัก (06:00 - 18:00) ในลักษณะ Rule-based
 */
export const THAI_YAM_DAILY_GRID: Record<string, string[]> = {
  Sunday: ["yam-four-chakras", "yam-single-zero", "yam-double-zero", "yam-three-crests", "yam-soon-one"],
  Monday: ["yam-soon-one", "yam-four-chakras", "yam-single-zero", "yam-double-zero", "yam-three-crests"],
  Tuesday: ["yam-three-crests", "yam-soon-one", "yam-four-chakras", "yam-single-zero", "yam-double-zero"],
  Wednesday: ["yam-double-zero", "yam-three-crests", "yam-soon-one", "yam-four-chakras", "yam-single-zero"],
  Thursday: ["yam-single-zero", "yam-double-zero", "yam-three-crests", "yam-soon-one", "yam-four-chakras"],
  Friday: ["yam-four-chakras", "yam-single-zero", "yam-double-zero", "yam-three-crests", "yam-soon-one"],
  Saturday: ["yam-soon-one", "yam-four-chakras", "yam-single-zero", "yam-double-zero", "yam-three-crests"]
};

/**
 * แผนที่ธาตุเกิดไทย (Thai Birth Elements Mapping)
 */
export const THAI_WEEKDAY_ELEMENT_MAP: Record<string, "fire" | "earth" | "wind" | "water"> = {
  Sunday: "fire",
  Monday: "earth",
  Tuesday: "wind",
  Wednesday: "water",
  Thursday: "earth",
  Friday: "water",
  Saturday: "fire"
};

/**
 * ความสัมพันธ์ธาตุเกิดและธาตุรายวันเพื่อประกอบกลยุทธ์การทำงาน
 */
export interface ElementRelationDetail {
  readonly relationType: "supporting" | "neutral" | "caution";
  readonly strategyImplication: string;
}

export const THAI_ELEMENT_RELATIONS: Record<string, ElementRelationDetail> = {
  "supporting": {
    relationType: "supporting",
    strategyImplication: "ธาตุประจำวันเกิดทำงานประสานส่งเสริมกันได้ดี เหมาะแก่การทำงานสร้างสรรค์และการนำเสนอที่ต้องการพลังขับเคลื่อนสูง"
  },
  "neutral": {
    relationType: "neutral",
    strategyImplication: "พลังงานธาตุทรงตัวในสภาวะปกติ เหมาะสำหรับการทำภารกิจส่วนบุคคลตามลำดับเวลาปกติ"
  },
  "caution": {
    relationType: "caution",
    strategyImplication: "รอบธาตุแสดงสัญญาณความขัดแย้ง แนะนำให้เปลี่ยนท่าทีการประสานงานให้เน้นความอดทนและประนีประนอม"
  }
};

/**
 * ฟังก์ชันผู้ช่วยเหลือในการแปลงวิเคราะห์ยามอุบากอง
 */
export function getThaiYamDetail(targetTime: string, currentWeekday: string): { yamIndex: number; id: string; detail: YamImplication } {
  const [hourStr, minStr] = targetTime.split(":");
  const hour = isNaN(Number(hourStr)) ? 12 : Number(hourStr);
  const min = isNaN(Number(minStr)) ? 0 : Number(minStr);
  const totalMinutes = hour * 60 + min;

  // คาบเวลางานกลางวัน 06:00 ถึง 18:00 (รวม 720 นาที แบ่งเป็น 5 ยาม ยามละ 144 นาที หรือ 2 ชม. 24 นาที)
  let yamIndex = 0;
  if (totalMinutes < 360) {
    // นอกรอบกลางวันเช้าตรู่ -> ให้แสดงยามสุดท้ายของกลางคืนหรือปานกลาง ใน v0.1 ให้ปักหลักที่ยามแรกสุด
    yamIndex = 0;
  } else if (totalMinutes >= 1080) {
    // ช่วงค่ำ -> กำหนดให้ปักหลักที่ยามสุดท้ายของวันทำงาน
    yamIndex = 4;
  } else {
    yamIndex = Math.floor((totalMinutes - 360) / 144);
  }

  // ป้องกันความผิดพลาดของดัชนี
  if (yamIndex < 0) yamIndex = 0;
  if (yamIndex > 4) yamIndex = 4;

  const weekdayList = THAI_YAM_DAILY_GRID[currentWeekday] || THAI_YAM_DAILY_GRID["Thursday"];
  const yamId = weekdayList[yamIndex];
  const detail = THAI_YAM_IMPLICATIONS[yamId] || THAI_YAM_IMPLICATIONS["yam-single-zero"];

  return { yamIndex, id: yamId, detail };
}

/**
 * คำนวณความสอดคล้องเชิงสัญญะของเวลาเกิดและวันปัจจุบัน
 */
export function getThaiAstroSymbolicAlignment(
  birthWeekday: string,
  currentWeekday: string
): { score: ThaiAstroSymbolicAlignment; confidenceNotes: string } {
  if (birthWeekday === currentWeekday) {
    return {
      score: 0.7,
      confidenceNotes: "ครบรอบวันเกิดประจำสัปดาห์ (Solar Weekday Cycle) พลังงานรอบเกิดหนุนการปรับสมดุลสติปัญญา"
    };
  }

  const birthElement = THAI_WEEKDAY_ELEMENT_MAP[birthWeekday] || "earth";
  const currentElement = THAI_WEEKDAY_ELEMENT_MAP[currentWeekday] || "earth";

  // ลอจิกความสัมพันธ์แบบ Rule-based ปลอดภัย
  if (birthElement === currentElement) {
    return {
      score: 0.9,
      confidenceNotes: "พลังธาตุเกิดและธาตุประจำวันอยู่ในทิศทางเดียวกัน (ธาตุหนุนนำคู่มิตร)"
    };
  }

  return {
    score: 0.5,
    confidenceNotes: "พลังธาตุรายวันอยู่ในเกณฑ์ปกติ เป็นกลางต่อการจัดสรรเวลาทำงานทั่วไป"
  };
}

/**
 * ล้างรูปแบบข้อมูลและแปลงความสอดคล้องวันที่เพื่อป้องกันอาการพังทางระบบเวลา
 */
export function normalizeThaiAstroDateInput(dateStr: string): string {
  const testDate = new Date(dateStr);
  if (isNaN(testDate.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return dateStr;
}

/**
 * ดึงภาษา disclaimer ทางจริยธรรมที่ส่งเสริมความสงบและสติปัญญาเชิงบวก
 */
export function buildThaiAstroSafetyDisclaimer(): string {
  return "คำแนะนำนี้เป็นเพียงเครื่องมือช่วยสะท้อนสติและการบริหารจังหวะเวลาส่วนบุคคล (Local-first strategic planning helper) ปราศจากการทำนายโชคชะตาเบ็ดเสร็จหรือทดแทนวิจารณญาณส่วนตน";
}

/**
 * ฟังก์ชันหลักในการสร้าง Output ของระบบโหราศาสตร์ไทย v0.1
 */
export function buildThaiAstroStrategyOutput(
  birthProfile: AstroBirthProfile,
  targetDate: string,
  targetTime?: string
): ThaiAstroStrategyOutput {
  const checkedDate = normalizeThaiAstroDateInput(targetDate);
  const checkedTime = targetTime || "12:00"; // ใช้เวลากลางวันเที่ยงตรงเป็นค่าเริ่มต้น

  const birthWeekday = birthProfile.birthWeekday || "Thursday";
  
  // หาวันในสัปดาห์ของวันที่ประเมินเป้าหมาย (targetDate)
  const dateObj = new Date(checkedDate);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentWeekday = weekdays[isNaN(dateObj.getTime()) ? 4 : dateObj.getDay()];

  // คำนวณรายละเอียดรอบยามอุบากอง
  const { yamIndex, detail: yamDetail } = getThaiYamDetail(checkedTime, currentWeekday);

  // คำนวณความสอดคล้องและคะแนนความมั่นใจ
  const { score: alignmentScore, confidenceNotes } = getThaiAstroSymbolicAlignment(birthWeekday, currentWeekday);

  const isBirthWeekdayCycle = birthWeekday === currentWeekday;

  // วางแผนกลยุทธ์รวม (Synthesis)
  let strategyImplication = yamDetail.strategyImplication;
  let cautionNote = yamDetail.cautionNote;

  if (isBirthWeekdayCycle) {
    strategyImplication = `[วันครบรอบวันเกิด] ${strategyImplication} แนะนำให้เน้นการประเมินภาพรวมและการปิดสะสาง checkpoint ประจำสัปดาห์`;
    cautionNote = `[ข้อสังเกตวันครบรอบเกิด] ${cautionNote} และควรจำกัดการเปิดรับหัวข้อโครงการซับซ้อนใหม่เพิ่มเติม`;
  }

  return {
    layerName: "Thai Astrology Strategy",
    source: "ArborDesk Thai Astro Engine v0.1",
    timingContext: {
      isBirthWeekdayCycle,
      currentYamIndex: yamIndex,
      rawTimeChecked: checkedTime
    },
    thaiAstroSignal: yamDetail.name,
    symbolicMeaning: yamDetail.symbolicMeaning,
    strategyImplication,
    suggestedAction: yamDetail.suggestedAction,
    reflectionPrompt: `ในช่วงยามและพลังธาตุวันนี้ คุณพบอุปสรรคหรือสามารถดำเนินงานด้วยโฟกัสสมาธิที่เป็นระบบได้อย่างไร?`,
    cautionNote,
    cautionLevel: yamDetail.cautionLevel,
    symbolicAlignment: alignmentScore,
    confidenceNotes,
    safetyDisclaimer: buildThaiAstroSafetyDisclaimer(),
    generatedAt: new Date().toISOString()
  };
}

/**
 * ข้อมูลจำลองสำหรับนักพัฒนาเป็นตัวอ้างอิงอิมพลีเมนต์ ( सैंपल Sample Reference)
 */
export const SAMPLE_THAI_ASTRO_STRATEGY_OUTPUT: ThaiAstroStrategyOutput = buildThaiAstroStrategyOutput(
  {
    birthDate: "1980-06-05",
    birthTime: "06:45",
    birthPlace: "Bangkok",
    birthWeekday: "Thursday"
  },
  "2026-06-13",
  "10:15"
);
