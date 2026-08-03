import { AstroTodayData, ReflectionHistoryItem, AstroPlanningNotes, AstroGuideData } from "./astroRealAppTypes";

export const MOCK_TODAY_DATA: AstroTodayData = {
  strategyMode: "Stabilize & Structure",
  strategyDirection: "วันนี้เหมาะกับการจัดระบบ ตรวจงานที่ค้าง และวางแผนก่อนขยายงานใหม่",
  workRecommendations: ["structure before expansion", "one checkpoint at a time"],
  riskPreventions: ["looping thoughts", "too much project switching"],
  recoveryAnchors: ["3-minute eye rest", "5-minute breathing pause"],
  reflectionPrompt: "วันนี้มีงานหรือโปรเจกต์ใดที่ควรปิดเป็น checkpoint เล็ก ๆ ก่อนเปิดเรื่องใหม่?"
};

export const MOCK_HISTORY_LOGS: ReflectionHistoryItem[] = [
  {
    id: "h1",
    version: 1,
    createdAt: "2026-06-01 10:00:00",
    reflectionDate: "2026-06-01",
    reflectionMode: "Focus",
    reflectionSummary: "ทดลองทำตามคำแนะนำการจัดระบบงานในจังหวะประคองและจัดระบบ",
    noticedNotes: "รู้สึกทำงานอย่างเป็นระบบขึ้นเมื่อจัดเวลาทำทีละงานย่อยตามลำดับ",
    nextRightAction: "เขียนเอกสารแผนการพัฒนาต่อวันพรุ่งนี้",
    strategyMode: "Stabilize & Structure",
    dailyCheckinSnapshot: {
      energyLevel: "steady",
      clarityLevel: "clear",
      workloadPressure: "normal",
      focusCondition: "deep_focus",
      bodySignal: "normal",
      todayIntention: "จัดโครงสร้างโฟลเดอร์สำหรับโมดูลแอปจริง",
      cautionNote: ""
    },
    markdownSnapshot: ""
  },
  {
    id: "h2",
    version: 1,
    createdAt: "2026-05-28 15:30:00",
    reflectionDate: "2026-05-28",
    reflectionMode: "Restore",
    reflectionSummary: "ใช้เวลาช่วงบ่ายพักตามแผน ปฏิเสธงานด่วนที่สามารถเลื่อนได้ไปก่อน",
    noticedNotes: "ช่วยลดความล้าของสมองและไม่เกิดอาการหมดไฟเมื่อต้องลุยงานดึก",
    nextRightAction: "ทบทวนแผนระยะยาวร่วมกับทีม",
    strategyMode: "Pause & Calibrate",
    dailyCheckinSnapshot: {
      energyLevel: "low",
      clarityLevel: "moderate",
      workloadPressure: "heavy",
      focusCondition: "recovery",
      bodySignal: "tense",
      todayIntention: "ประคองงานค้างและปิดหน้าจอให้เร็วขึ้น",
      cautionNote: "ตึงหลังช่วงบ่าย"
    },
    markdownSnapshot: ""
  }
];

export const MOCK_PLANNING_NOTES: AstroPlanningNotes = {
  focusNext: "สรุปโครงสร้างระบบ API สำหรับหน้าประวัติสะท้อนคิด และส่งมอบงานเขียนบทความชิ้นที่ 2",
  slowDown: "ชะลอการตอบอีเมลที่ไม่ด่วนหลัง 18:00 น., เลื่อนประชุมที่ไม่มีวาระชัดเจนออกไปก่อน",
  nextSmallAction: "เคลียร์อินบ็อกซ์ด่วน 5 ข้อความแรก และโทรสอบถามสถานะเอกสารกับพาร์ทเนอร์",
  reviewLater: "ตัวเลขวิเคราะห์สภาพคล่องของเดือนมิถุนายน เพื่อนำมาประกอบแผนขยายงานปลายปี",
  notesUpdatedAt: "2026-06-03 14:20:00"
};

export const MOCK_GUIDE_DATA: AstroGuideData = {
  quickStartItems: [
    {
      step: "1",
      title: "ระบุเป้าหมายรอบเวลา",
      description: "เลือกเดือนการพิจารณาและพิมพ์แผนยุทธศาสตร์ในแถบด้านบน เพื่อใช้เตือนใจตลอดรอบเดือน",
    },
    {
      step: "2",
      title: "ประเมินสภาวะจริง",
      description: "ตอบดรอปดาวน์ Daily Check-in ในแผงขวาตามสภาพจริง เพื่อปรับโหมดการทำงานประจำวันให้สอดรับกับสภาวะและบริบทงานของวันนี้มากขึ้น",
    },
    {
      step: "3",
      title: "ทบทวนและทริกเกอร์บันทึก",
      description: "สรุปผลงานที่เสร็จและข้อสังเกตลงในแท็บ สะท้อนคิด เพื่อคัดลอก Markdown หรือกดเก็บเข้าแฟ้มคลังประวัติศาสตร์",
    },
  ],
  disclaimerItems: [
    {
      title: "ข้อพิจารณาความเป็นส่วนตัวและการจำกัดความรับผิดชอบ (Disclaimer)",
      body: "This profile is stored locally in your browser for personal reflection only. It is not medical advice, diagnosis, or treatment. All astrological and timing references are symbolic aids for self-observation — not deterministic predictions.",
      accent: "amber",
    },
    {
      title: "แนวทางการใช้งาน (Usage Guidance)",
      body: "ใช้เพื่อการสะท้อนคิดและวางแผนส่วนบุคคลเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา",
      accent: "amber",
    },
  ],
  timingGuideDimensions: [
    {
      label: "มิติรายวัน (Daily)",
      heading: "สังเกตสภาวะปัจจุบัน",
      description: "บันทึกระดับพลังงาน สมาธิ และสัญญาณทางกายทุกวัน เพื่อจัดสรรงานที่เหมาะกับสภาพความเป็นจริงของร่างกายและสมอง ณ เวลานั้น",
      accent: "teal",
    },
    {
      label: "มิติรายสัปดาห์ (Weekly)",
      heading: "ตรวจสอบความถี่สะสม",
      description: "สังเกตแนวโน้มพลังงานที่โดดเด่นและธีมที่ปรากฏซ้ำรอบ 5 วันล่าสุด เพื่อจัดปรับสมดุลกิจกรรมหลังบ้านและหน้าบ้านให้เหมาะสมสอดคล้องกัน",
      accent: "violet",
    },
    {
      label: "มิติรายเดือน (Monthly)",
      heading: "ถอดรหัสภาพรวมกว้าง",
      description: "ทบทวนสถิติภาพใหญ่ เพื่อวิเคราะห์ว่าระดับพลังงานหลักหรือข้อควรระวังประเภทใดที่เกิดซ้ำมากที่สุด ช่วยชี้วัดเป้าหมายระยะสั้น",
      accent: "amber",
    },
    {
      label: "แผนกลยุทธ์ (Planning)",
      heading: "แปลงผลสู่การลงมือทำ",
      description: "นำสิ่งที่สังเกตพบจากทุกระดับเวลา มากำหนดสิ่งที่ต้องโฟกัส สิ่งที่ต้องชะลอตัวลง และระบุการกระทำเล็กๆ ที่พร้อมทำได้ทันที",
      accent: "indigo",
    },
  ],
  ethicalFramingText: "กฎและจังหวะของดาราศาสตร์เป็นเพียงสัญวิทยาเชิงสัญลักษณ์เพื่อสะท้อนความเชื่อมโยงของระบบธรรมชาติ ชีวิตมนุษย์ขับเคลื่อนด้วยการกระทำเป็นหลัก ปัญญาและการเจรจาที่เป็นธรรมจะเป็นเกราะคุ้มครองที่แท้จริง",
  reflectionUseText: "ข้อมูลชุดนี้ถูกรวบรวมไว้และบันทึกในระบบเพื่อให้ผู้ใช้สามารถสังเกตความเกี่ยวเนื่อง รวมถึงจับคู่ความสัมพันธ์ของพลังงานส่วนบุคคล จังหวะกระบวนการทำงาน สมาธิจดจ่อ การเหนื่อยล้าสะสม และการเตรียมความพร้อมเพื่อวางแผนฟื้นตัวอย่างเหมาะสมในแต่ละสัปดาห์ โดยเน้นไปที่การใช้เป็นข้อมูลสะท้อนตนเองในเชิงสัญลักษณ์เพื่อช่วยให้สังเกตจังหวะชีวิตได้ดีขึ้น และไม่ใช้แทนคำแนะนำจากแพทย์หรือผู้เชี่ยวชาญ",
  closingQuote: "“การมีสติรับรู้จังหวะเวลาของตนเอง ไม่ใช่การยอมรับข้อจำกัดเชิงโชคชะตา แต่คือการประเมินกำลังเพื่อการเคลื่อนไหวที่ชาญฉลาดและปลอดภัยที่สุด”"
};
