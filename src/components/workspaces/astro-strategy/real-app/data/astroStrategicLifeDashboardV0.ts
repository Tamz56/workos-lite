export type AstroDomainAvailability =
  | "governed"
  | "governed_limited"
  | "human_reported"
  | "not_yet_governed";

export const astroStrategicLifeDashboardV0 = {
  schemaVersion: "astro.dashboard.v0.2-candidate",

  identity: {
    title: "แดชบอร์ดชีวิตเชิงกลยุทธ์",
    subtitle: "Thai-Primary Strategic Life Dashboard V0",
    role: "validation-only",
    productionPromotion: false,
  },

  methodContext: {
    primaryTradition: "THAI_ASTROLOGY",
    zodiacReference: "NIRAYANA / SIDEREAL",
    ayanamsha: "LAHIRI",
    houseModel: "LAGNA_ANCHORED_RASI_AS_HOUSE",
    implementationLabel: "WHOLE_SIGN",
    planetBaseline: "CLASSICAL_7_PLANETS",
    westernTropical: "SECONDARY_OVERLAY_ONLY",
  },

  omissions: [
    "RAHU_POLICY",
    "KETU_POLICY",
    "MRITAYU_MAPPING",
    "EXACT_ASPECT_MECHANICS",
  ],

  currentInsights: {
    headline: "อ่านสิ่งที่มี authority เท่านั้น และเปิดเผยสิ่งที่ยังไม่รู้",
    body:
      "หน้าทดลองนี้แยกการตีความพื้นดวง คำแนะนำเชิงกลยุทธ์ และการตัดสินใจของมนุษย์ออกจากกันอย่างชัดเจน",
  },

  domains: {
    work: {
      key: "WORK / KAMMA",
      availability: "governed" as AstroDomainAvailability,
      displayState: "SUPPORTIVE / BOUNDED",
      authority: "ASTRO-METHOD-012",
      synthesisClass: "GOVERNED",
      interpretation:
        "มี authority สำหรับการอ่านเชิงโครงสร้างในมิติการงาน แต่ต้องใช้แบบ bounded และไม่ขยายเกินหลักฐานที่อนุมัติไว้",
      strategicGuidance:
        "ใช้เป็นบริบทประกอบการจัดลำดับงาน ไม่ใช้แทนข้อเท็จจริงของโครงการ ทรัพยากร หรือการตัดสินใจของผู้ใช้",
      explainability: {
        houseChain: "ตรวจสอบผ่าน house / house-lord chain ตาม authority ที่กำกับ",
        modifiers: "ใช้เฉพาะ relevant modifiers ที่มี policy รองรับ",
        synthesisClass: "GOVERNED",
      },
    },

    money: {
      key: "MONEY / KUTUMBA",
      availability: "governed_limited" as AstroDomainAvailability,
      displayState: "STRUCTURAL CONNECTION / DIRECTION NOT ESTABLISHED",
      authority: "ASTRO-METHOD-013",
      synthesisClass: "INSUFFICIENT_EVIDENCE",
      interpretation:
        "พิสูจน์ได้เพียงความเชื่อมโยงเชิงโครงสร้าง ยังไม่มี authority เพียงพอสำหรับ direction หรือ timing",
      strategicGuidance:
        "HYPOTHESIS_ONLY — ห้ามใช้เพื่อทำนายรายได้ รับประกันผลตอบแทน หรือชี้นำการลงทุน",
      explainability: {
        houseChain: "โครงสร้างที่เกี่ยวข้องมี authority แบบจำกัด",
        modifiers: "ยังไม่เพียงพอสำหรับ directional synthesis",
        synthesisClass: "INSUFFICIENT_EVIDENCE",
      },
    },

    wellbeing: {
      key: "WELLBEING & CAPACITY",
      availability: "human_reported" as AstroDomainAvailability,
      authority: "PRACTICE / REALITY LAYER",
      astroDerivation: false,
      nonDiagnostic: true,
      capacityPrecedence: true,
      source: "HUMAN_REPORTED ONLY",
      dimensions: [
        "energy",
        "focus",
        "mental load",
        "recovery",
        "nature contact",
        "spiritual practice",
        "movement",
        "relaxation practices",
        "traditional self-care / study",
        "personal symbolic practices",
      ],
      rule:
        "REALITY / CAPACITY > ASTRO MOMENTUM",
    },

    relationships: {
      key: "RELATIONSHIPS / PATNI",
      availability: "not_yet_governed" as AstroDomainAvailability,
      displayState: "NOT_YET_GOVERNED",
    },

    homeFamily: {
      key: "HOME & FAMILY / BANDHU",
      availability: "not_yet_governed" as AstroDomainAvailability,
      displayState: "NOT_YET_GOVERNED",
    },
  },

  strategicTranslation: {
    natalInterpretation:
      "การตีความพื้นดวงต้องผูกกับ authority และ explainability ที่ตรวจสอบได้",
    strategicGuidance:
      "คำแนะนำเชิงกลยุทธ์เป็นการแปลผลแบบ bounded และต้องยอมให้ reality layer มีสิทธิ์เหนือกว่า",
    humanDecision:
      "การตัดสินใจสุดท้ายเป็นของมนุษย์ ไม่ได้ถูกกำหนดโดย dashboard",
    separationRule:
      "NATAL_INTERPRETATION != STRATEGIC_GUIDANCE != HUMAN_DECISION",
  },

  projectMotion: {
    available: false,
    state: "FAIL_CLOSED / UNAVAILABLE",
    disclosure:
      "Live governed Project Motion is not yet proven for this Dashboard.",
    forbiddenFallbacks: [
      "Project Registry",
      "Planner",
      "Project Work Log",
      "Coordination recovery",
      "hard-coded Project status",
    ],
  },

  timing: {
    state: "WATCH",
    disclosure:
      "Current Timing แสดงเป็นชั้นสำหรับการตรวจสอบและสะท้อนจังหวะเท่านั้น ไม่ใช่คำสั่งให้ดำเนินการ",
  },

  currentClose: {
    title: "Current Close",
    body:
      "ใช้ข้อมูลที่มี authority, เคารพข้อจำกัดของสภาวะจริง และเปิดเผยข้อมูลที่ยังไม่ถูกกำกับแทนการเติมความหมายขึ้นเอง",
  },

  sources: [
    "ASTRO-DASH-001 Guidance Data Contract v0.1",
    "ASTRO-METHOD-012",
    "ASTRO-METHOD-013",
    "PRACTICE / REALITY LAYER",
  ],
} as const;

export type AstroStrategicLifeDashboardV0 =
  typeof astroStrategicLifeDashboardV0;
