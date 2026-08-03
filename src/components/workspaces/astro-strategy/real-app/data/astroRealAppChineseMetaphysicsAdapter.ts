import {
  AstroBirthProfile,
  ChineseElement,
  ChineseMetaphysicsStrategyOutput
} from "./astroRealAppTypes";

/**
 * ความหมายเชิงสัญญะของแต่ละธาตุ
 */
export interface ElementImplication {
  readonly name: string;
  readonly meaning: string;
  readonly implication: string;
  readonly suggestedAction: string;
  readonly cautionNote: string;
}

export const CHINESE_ELEMENT_IMPLICATIONS: Record<ChineseElement, ElementImplication> = {
  wood: {
    name: "ธาตุไม้ (Wood)",
    meaning: "สัญญะแห่งการเติบโต การแผ่ขยาย และการสร้างสรรค์สิ่งใหม่",
    implication: "สนับสนุนการริเริ่มวางแผนโครงการใหม่ คิดออกแบบระบบ หรือเริ่มทำบทความร่างแรก",
    suggestedAction: "เขียนแผนงานหลัก 3 ข้อ หรือจัดทำไดอะแกรมโครงสร้างโปรเจกต์ใหม่",
    cautionNote: "ระวังการแผ่ขยายงานออกไปมากเกินไปจนหาจุดสิ้นสุดไม่เจอ"
  },
  fire: {
    name: "ธาตุไฟ (Fire)",
    meaning: "สัญญะแห่งพลังงาน ความร้อนแรง และการปิด Checkpoint งาน",
    implication: "จังหวะเวลาแห่งการเร่งรีบทำคอมมิต เขียนฟีเจอร์หลัก หรือส่งมอบผลงานเป้าหมาย",
    suggestedAction: "ปิดแท็บเบราว์เซอร์ที่ไม่เกี่ยวข้อง ตั้งสมาธิปิดงานที่มีความสำคัญสูงในมือ",
    cautionNote: "ระวังการใช้อารมณ์ร้อนรนและการตอบโต้ที่รวดเร็วเกินไปจนขาดสติ"
  },
  earth: {
    name: "ธาตุดิน (Earth)",
    meaning: "สัญญะแห่งความมั่นคง ความอดทน และการรวมเสถียรภาพ",
    implication: "เน้นการบันทึกสรุปข้อมูล จัดระเบียบฐานข้อมูล หรือสะสางเอกสารคู่มือการทำงาน",
    suggestedAction: "เคลียร์ประวัติ Todo list, จัดระเบียบโฟลเดอร์โครงการ หรืออัปเดตไฟล์ Documentation",
    cautionNote: "ระวังการยึดติดกับวิธีการเดิมๆ จนเกิดความล่าช้าในการแก้ไขปัญหาเฉพาะหน้า"
  },
  metal: {
    name: "ธาตุทอง (Metal)",
    meaning: "สัญญะแห่งการตีกรอบวินัย การ Refactor และการคัดทอน",
    implication: "จังหวะที่เหมาะสมในการปรับแต่งโครงสร้างโค้ด (Refactor) ตัดทอนงานส่วนเกิน หรือจัดระเบียบ",
    suggestedAction: "ลบโค้ดหรือไฟล์ที่ไม่ได้ใช้งานออก และจัดฟอร์แมตโค้ดให้สอดคล้องตามมาตรฐาน",
    cautionNote: "ระวังความตึงเครียดและการตั้งมาตรฐานการทำงานไว้สูงเกินไปจนกดดันตนเอง"
  },
  water: {
    name: "ธาตุน้ำ (Water)",
    meaning: "สัญญะแห่งความลื่นไหล การเจรจา และการฟื้นฟู",
    implication: "สนับสนุนการศึกษาข้อมูล วางแผนระยะยาว ประสานงาน และสลับบรรยากาศการทำงานเพื่อลดความล้า",
    suggestedAction: "ย้ายไปทำงานในมุมสงบ ดื่มน้ำ และเขียนบันทึกสะท้อนคิดเกี่ยวกับทิศทางการพัฒนาชีวิต",
    cautionNote: "ระวังความลื่นไหลเฉื่อยชาหรือหลบเลี่ยงงานหลักไปจมกับงานรอง"
  }
};

/**
 * โครงสร้างฤดูกาลจีนรายเดือนย่อ
 */
export interface SeasonalImplication {
  readonly name: string;
  readonly mainElement: ChineseElement;
  readonly description: string;
}

export const CHINESE_SEASONAL_IMPLICATIONS: Record<string, SeasonalImplication> = {
  spring: {
    name: "ฤดูใบไม้ผลิ",
    mainElement: "wood",
    description: "ฤดูกาลแห่งการริเริ่มโครงการใหม่และก่อร่างวางเป้าหมาย"
  },
  summer: {
    name: "ฤดูร้อน",
    mainElement: "fire",
    description: "ฤดูกาลแห่งการลงมือปฏิบัติงานเชิงรุกและการส่งมอบงานสมาธิสูง"
  },
  autumn: {
    name: "ฤดูใบไม้ร่วง",
    mainElement: "metal",
    description: "ฤดูกาลแห่งการปรับปรุงโครงสร้างโค้ด ตรวจสอบความถูกต้อง และจัดกรอบระเบียบ"
  },
  winter: {
    name: "ฤดูหนาว",
    mainElement: "water",
    description: "ฤดูกาลแห่งความเงียบสงบ การทบทวนสะสมความรู้ และวางแผนงานระยะยาว"
  },
  "earth-transition": {
    name: "รอยต่อฤดูกาล (ธาตุดิน)",
    mainElement: "earth",
    description: "ช่วงเวลาพักสะสาง ปรับแต่งจิตใจ และจัดระเบียบฐานข้อมูลเดิม"
  }
};

/**
 * แผนการแมปความสัมพันธ์
 */
export interface RelationDetail {
  readonly relationType: "supporting" | "neutral" | "caution";
  readonly alignmentScore: number;
  readonly strategyNote: string;
}

// แผนที่จับคู่ความสัมพันธ์ของ ธาตุเกิด (แถว) และ ธาตุรายวัน (หลัก)
export const CHINESE_ELEMENT_RELATIONS: Record<ChineseElement, Record<ChineseElement, RelationDetail>> = {
  wood: {
    wood: { relationType: "supporting", alignmentScore: 1.0, strategyNote: "ธาตุรายวันตรงกับธาตุเกิด ถือเป็นวันเพื่อนคู่มิตร คอยหนุนนำให้การสื่อสารราบรื่น" },
    fire: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ไม้สร้างไฟ พลังงานตัวตนถูกถ่ายทอดอย่างสร้างสรรค์ เหมาะสำหรับงานออกแบบฟรอนต์เอนด์หรือบทความ" },
    earth: { relationType: "neutral", alignmentScore: 0.6, strategyNote: "ไม้เจาะควบคุมดิน ต้องใช้พลังในการบริหารจัดการสูงขึ้น แนะนำให้วางกรอบงานย่อยๆ เป็นขั้นตอน" },
    metal: { relationType: "caution", alignmentScore: 0.3, strategyNote: "ทองตัดไม้ พลังงานภายนอกกดดันและตีกรอบตัวตน แนะนำให้ Refactor จัดระเบียบงานเก่าแทนการดึงดันลุยงานใหม่" },
    water: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "น้ำหล่อเลี้ยงไม้ พลังงานรอบวันโอบอุ้มส่งเสริมสมาธิและการเรียนรู้สิ่งแปลกใหม่" }
  },
  fire: {
    wood: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ไม้หนุนสร้างไฟ ได้รับการช่วยเหลือทางความคิดสร้างสรรค์ มีไอเดียริเริ่มสิ่งใหม่เด่นชัด" },
    fire: { relationType: "supporting", alignmentScore: 1.0, strategyNote: "ธาตุรายวันตรงกับธาตุเกิด พลังไฟคูณสองกระตุ้นความตือรือร้นในการปิดจบCheckpointงาน" },
    earth: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ไฟสร้างดิน พลังงานการส่งมอบช่วยนำความเสถียรและมั่นคงมาสู่ฐานข้อมูลและเอกสาร" },
    metal: { relationType: "neutral", alignmentScore: 0.6, strategyNote: "ไฟหลอมทอง ต้องใช้ความประณีตและการเพ่งสมาธิในการเจียระไน ตรวจแก้บั๊กจุดซับซ้อน" },
    water: { relationType: "caution", alignmentScore: 0.3, strategyNote: "น้ำดับไฟ สภาวะรอบวันอาจส่งสัญญาณขัดแย้งเชิงลึก แนะนำให้ชะลอการตัดสินใจเรื่องใหญ่และพักประคองความล้า" }
  },
  earth: {
    wood: { relationType: "caution", alignmentScore: 0.3, strategyNote: "ไม้ควบคุมเจาะดิน เกิดภาระความเครียดหรือกรอบงานทับถม แนะนำให้จำกัด Todo List ให้สั้นที่สุด" },
    fire: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ไฟหนุนสร้างดิน พลังงานความตื่นตัวช่วยกระตุ้นการเก็บรวบรวมข้อมูลและทบทวนความเรียบร้อย" },
    earth: { relationType: "supporting", alignmentScore: 1.0, strategyNote: "ธาตุรายวันตรงกับธาตุเกิด วันแห่งการรวมศูนย์ความนิ่งมั่นคง เหมาะกับการสะสางเอกสารคงค้าง" },
    metal: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ดินสร้างทอง จังหวะดีในการคัดกรองจัดระเบียบระบบและกำจัดส่วนเกินที่ไม่จำเป็น" },
    water: { relationType: "neutral", alignmentScore: 0.6, strategyNote: "ดินกั้นทางน้ำ ต้องใช้วินัยควบคุมความลื่นไหลของข้อมูลให้มีทิศทางชัดเจน" }
  },
  metal: {
    wood: { relationType: "neutral", alignmentScore: 0.6, strategyNote: "ทองตัดแต่งไม้ เหมาะแก่การคัดกรองไอเดีย วางโครงสร้างไฟล์โปรเจกต์ และจำกัดขอบเขตงาน" },
    fire: { relationType: "caution", alignmentScore: 0.3, strategyNote: "ไฟหลอมทอง สภาพแวดล้อมมีความเร่งรัดและกดดันภายนอก แนะนำให้ถอยออกมาระงับความร้อนรน" },
    earth: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ดินโอบอุ้มสร้างทอง พลังแห่งความเสถียรและทบทวนช่วยให้การ Refactor รหัสเป็นไปอย่างมั่นคง" },
    metal: { relationType: "supporting", alignmentScore: 1.0, strategyNote: "ธาตุรายวันตรงกับธาตุเกิด วินัยและความเป็นระเบียบชัดเจนดีมาก เหมาะแก่การตรวจทานความปลอดภัย" },
    water: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ทองสร้างน้ำ ปรับกรอบเกณฑ์ที่ตึงเครียดให้ยืดหยุ่นลื่นไหล หลุดพ้นจากสภาวะความคิดตีตัน" }
  },
  water: {
    wood: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "น้ำสร้างไม้ จิตใจลื่นไหลเอื้อต่อการเรียนรู้แนวคิดใหม่ๆ วางแผนโครงการได้สอดคล้องธรรมชาติ" },
    fire: { relationType: "neutral", alignmentScore: 0.6, strategyNote: "น้ำคุมดับความร้อนไฟ เหมาะสมกับการประเมินและบริหารจัดการจังหวะที่ร้อนแรงเกินไปให้อยู่ในร่องในรอย" },
    earth: { relationType: "caution", alignmentScore: 0.3, strategyNote: "ดินสกัดกั้นน้ำ รู้สึกอึดอัดหรืองานระบบติดขัดประเด็นข้อตกลง แนะนำให้ดื่มน้ำ พักสายตา และใช้ความอดทน" },
    metal: { relationType: "supporting", alignmentScore: 0.9, strategyNote: "ทองสร้างเสริมน้ำ ได้รับการเกื้อหนุนทางวินัยช่วยตีกรอบทิศทางการประสานงานให้ชัดเจน" },
    water: { relationType: "supporting", alignmentScore: 1.0, strategyNote: "ธาตุรายวันตรงกับธาตุเกิด ความลื่นไหลและสงบดีมาก เหมาะสำหรับงานเจรจาหรือวางแผนระยะยาว" }
  }
};

/**
 * คำนวณช่วงฤดูกาลจีนอย่างง่ายแบบ Rule-based
 */
export function calculateSeasonalTendency(targetDate: string): "spring" | "summer" | "autumn" | "winter" | "earth-transition" {
  const testDate = new Date(targetDate);
  if (isNaN(testDate.getTime())) {
    // กรณีวันที่ผิดพลาด ให้ยึดฤดูกาลปัจจุบันของวันรันเครื่อง
    const fallback = new Date();
    return getSeasonFromMonthAndDay(fallback.getMonth(), fallback.getDate());
  }
  return getSeasonFromMonthAndDay(testDate.getMonth(), testDate.getDate());
}

function getSeasonFromMonthAndDay(month: number, day: number): "spring" | "summer" | "autumn" | "winter" | "earth-transition" {
  // month: 0-indexed (0=Jan, 1=Feb, 2=Mar, 3=Apr, 4=May, 5=Jun, 6=Jul, 7=Aug, 8=Sep, 9=Oct, 10=Nov, 11=Dec)
  
  // สแกนดินรอยต่อฤดูกาล (ช่วงสัปดาห์สุดท้ายของฤดูสากล)
  if (month === 0 && day >= 25) return "earth-transition"; // ปลายฤดูหนาว (Jan 25-31)
  if (month === 3 && day >= 24) return "earth-transition"; // ปลายฤดูใบไม้ผลิ (Apr 24-30)
  if (month === 6 && day >= 25) return "earth-transition"; // ปลายฤดูร้อน (Jul 25-31)
  if (month === 9 && day >= 25) return "earth-transition"; // ปลายฤดูใบไม้ร่วง (Oct 25-31)

  // ฤดูกาลปกติ
  if (month === 1 || month === 2 || month === 3) return "spring"; // Feb, Mar, Apr
  if (month === 4 || month === 5 || month === 6) return "summer"; // May, Jun, Jul
  if (month === 7 || month === 8 || month === 9) return "autumn"; // Aug, Sep, Oct
  return "winter"; // Nov, Dec, Jan
}

/**
 * คำนวณธาตุหลักตัวตนประจำวันเกิดอย่างง่าย (Rule-based Modulo 10 Heavenly Stem Day Master)
 */
export function getDayMasterElement(birthDate: string): ChineseElement {
  try {
    const parts = birthDate.split("-");
    if (parts.length !== 3) return "earth"; // Fallback ปลอดภัย

    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);

    if (isNaN(y) || isNaN(m) || isNaN(d)) return "earth";

    // กำหนด local noon เพื่อกันชนความคลาดเคลื่อนทางโซนเวลาของเบราว์เซอร์
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    if (isNaN(dateObj.getTime())) return "earth";

    // อ้างอิงจุดประเมิน epoch: Jan 1, 2000 เที่ยงตรง (วัน Geng-Chen โทนธาตุทอง)
    const epoch = new Date(2000, 0, 1, 12, 0, 0);
    const diffTime = dateObj.getTime() - epoch.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // รอบวัฏจักร 10 กิ่งฟ้า (Heavenly Stems)
    // Jan 1, 2000 มีดัชนีกิ่งฟ้า = 6 (Geng - Metal)
    const stemIndex = (6 + (diffDays % 10) + 10) % 10;

    // การแมปกิ่งฟ้าไปสู่ 5 ธาตุหลัก
    // 0, 1 -> Wood (Jia/Yi)
    // 2, 3 -> Fire (Bing/Ding)
    // 4, 5 -> Earth (Wu/Ji)
    // 6, 7 -> Metal (Geng/Xin)
    // 8, 9 -> Water (Ren/Gui)
    if (stemIndex === 0 || stemIndex === 1) return "wood";
    if (stemIndex === 2 || stemIndex === 3) return "fire";
    if (stemIndex === 4 || stemIndex === 5) return "earth";
    if (stemIndex === 6 || stemIndex === 7) return "metal";
    return "water";
  } catch {
    return "earth"; // Fallback ปลอดภัย
  }
}

/**
 * สกัดความสัมพันธ์ระดับธาตุเชิงวิเคราะห์
 */
export function getChineseElementRelation(
  dayMaster: ChineseElement,
  currentDayElement: ChineseElement
): RelationDetail {
  const masterRelations = CHINESE_ELEMENT_RELATIONS[dayMaster];
  if (!masterRelations) {
    return {
      relationType: "neutral",
      alignmentScore: 0.6,
      strategyNote: "พลังงานรอบธาตุปกติ เอื้อต่อการจัดสรรสมาธิทำงานทั่วไป"
    };
  }
  return masterRelations[currentDayElement] || {
    relationType: "neutral",
    alignmentScore: 0.6,
    strategyNote: "พลังงานรอบธาตุปกติ เอื้อต่อการจัดสรรสมาธิทำงานทั่วไป"
  };
}

/**
 * ล้างรูปแบบข้อมูลเป้าหมายเพื่อป้องกันความเสียหาย
 */
export function normalizeChineseAstroDateInput(dateStr: string): string {
  const testDate = new Date(dateStr);
  if (isNaN(testDate.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return dateStr;
}

/**
 * สร้างคำเตือน disclaimer สติปัญญาเชิงบวก
 */
export function buildChineseAstroSafetyDisclaimer(): string {
  return "คำชี้แนะเชิงสัญญะนี้ใช้เพื่อเป็นมุมมองสะท้อนสติและช่วยจัดระเบียบความคิดส่วนตนเท่านั้น ปราศจากการทำนายโชคชะตาเบ็ดเสร็จหรือทดแทนวิจารณญาณส่วนบุคคล";
}

/**
 * ฟังก์ชันสร้างสัญญาณวันปัจจุบันอ้างอิงลำดับธาตุหมุนเวียนอย่างง่าย (Modulo 5)
 * Jan 1, 2000 มีสัญญาณธาตุทอง (Metal) เป็นวันปฐมบท
 */
export function getCurrentDayElement(targetDate: string): ChineseElement {
  try {
    const testDate = new Date(targetDate);
    const dateObj = isNaN(testDate.getTime()) ? new Date() : testDate;
    
    // ตั้งพิกัด local noon
    const checkObj = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12, 0, 0);
    const epoch = new Date(2000, 0, 1, 12, 0, 0);
    const diffTime = checkObj.getTime() - epoch.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // หมุนวน 5 ธาตุ (Jan 1, 2000 เริ่มที่ธาตุทองดัชนี 3)
    // 0 -> wood, 1 -> fire, 2 -> earth, 3 -> metal, 4 -> water
    const elementIndex = (3 + (diffDays % 5) + 5) % 5;
    const elements: ChineseElement[] = ["wood", "fire", "earth", "metal", "water"];
    return elements[elementIndex];
  } catch {
    return "earth";
  }
}

/**
 * ฟังก์ชันแกนกลางสำหรับการสร้าง Output ของระบบเมตาฟิสิกส์จีน v0.1
 */
export function buildChineseMetaphysicsStrategyOutput(
  birthProfile: AstroBirthProfile,
  targetDate: string,
  userIntention?: string
): ChineseMetaphysicsStrategyOutput {
  const checkedDate = normalizeChineseAstroDateInput(targetDate);
  const dayMaster = getDayMasterElement(birthProfile.birthDate);
  
  // หาสภาพแวดล้อมรอบฤดูและธาตุวันปัจจุบัน
  const currentSeason = calculateSeasonalTendency(checkedDate);
  const currentDayElement = getCurrentDayElement(checkedDate);

  // คำนวณความสัมพันธ์และคะแนนความสมดุล
  const relationDetail = getChineseElementRelation(dayMaster, currentDayElement);
  const elementImplications = CHINESE_ELEMENT_IMPLICATIONS[currentDayElement];
  const seasonalImplications = CHINESE_SEASONAL_IMPLICATIONS[currentSeason];

  // คัดสรรสัญญะข้อความ
  const signalName = `รอบ${seasonalImplications.name} ส่งเสริมพลังธาตุ${elementImplications.name}ประจำวัน`;
  
  let strategyImplication = relationDetail.strategyNote;
  const cautionNote = elementImplications.cautionNote;

  if (userIntention && userIntention.trim().length > 0) {
    strategyImplication = `[เจตจำนง: ${userIntention}] ${strategyImplication} พิจารณาจัดสรรเจตจำนงนี้ให้สอดรับความลื่นไหลของจังหวะธรรมชาติ`;
  }

  return {
    layerName: "Chinese Metaphysics Strategy",
    source: "ArborDesk Chinese Metaphysics Engine v0.1",
    timingContext: {
      dayMasterElement: dayMaster,
      currentSeason,
      relationType: relationDetail.relationType
    },
    chineseMetaphysicsSignal: signalName,
    elementFocus: currentDayElement,
    symbolicMeaning: elementImplications.meaning,
    strategyImplication,
    suggestedAction: elementImplications.suggestedAction,
    reflectionPrompt: `ในสภาพรอบฤดูและธาตุประคองสติวันนี้ คุณพบลักษณะความคิดที่สมดุลหรือข้อกีดขวางใดจากการใช้พลังสมองบ้าง?`,
    cautionNote,
    symbolicAlignment: relationDetail.alignmentScore,
    confidenceNotes: `วิเคราะห์สัญญะเกื้อกูลรอบธาตุเกิด (${dayMaster}) คู่ธาตุวันปัจจุบัน (${currentDayElement}) บนวัฏจักร Rule-based เที่ยงตรง`,
    safetyDisclaimer: buildChineseAstroSafetyDisclaimer(),
    generatedAt: new Date().toISOString()
  };
}

/**
 * ข้อมูลจำลองสำหรับทดสอบ
 */
export const SAMPLE_CHINESE_ASTRO_STRATEGY_OUTPUT: ChineseMetaphysicsStrategyOutput = buildChineseMetaphysicsStrategyOutput(
  {
    birthDate: "1992-05-18",
    birthTime: "08:30",
    birthPlace: "Bangkok",
    birthWeekday: "Monday"
  },
  "2026-06-13",
  "ต้องการ Refactor โค้ดปรับเสถียรระบบหลัก"
);
