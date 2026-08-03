// GF-APP-075 — Rose Trial Day 0 Default State
// Stage 2D — Day 0 Setup MVP

import type { RoseDay0State, Day0TrialSnapshot } from "./types";

export const createDefaultRoseDay0State = (trialSnapshot?: Day0TrialSnapshot): RoseDay0State => {
  const snapshot: Day0TrialSnapshot = trialSnapshot || {
    trialName: "",
    cropName: "กุหลาบ",
    goal: "",
    batchName: "",
    plannedStartDate: "",
    totalCuttings: 0,
    treatments: [],
    readinessStatus: "not_ready",
    sourceUpdatedAt: null,
  };

  return {
    version: 1,
    trialSnapshot: snapshot,
    startInfo: {
      actualStartDate: new Date().toISOString().split("T")[0],
      actualStartTime: new Date().toLocaleTimeString("th-TH", { hour12: false }).substring(0, 5),
      operatorName: "",
      location: "",
      weatherInfo: "",
      notes: "",
    },
    sourcePlant: {
      sourcePlantId: "",
      cultivarName: "",
      isUnknownCultivar: false,
      sourceOrigin: "",
      estimatedAge: "",
      overallHealth: "สมบูรณ์ดี",
      observedPestsOrDiseases: "ไม่พบศัตรูพืชหรือโรคที่เห็นได้ชัดเจน",
      lastFertilizedDate: "",
      lastSprayedDate: "",
      notes: "",
    },
    cuttingSetup: {
      actualCuttingCount: snapshot.totalCuttings || 0,
      cuttingTypeDescription: "กิ่งกึ่งแก่กึ่งอ่อน (semi-hardwood)",
      targetLengthCm: "10-15",
      targetNodeCount: "3-4",
      remainingLeafCount: "2-3 ใบย่อย",
      isBudsOrFlowersRemoved: true,
      basePreparationMethod: "ตัดเฉียง 45 องศาใต้ข้อเบาๆ",
      notes: "",
    },
    propagationSetup: {
      mediumName: "เพอร์ไลต์ผสมขุยมะพร้าว",
      mediumIngredients: "เพอร์ไลต์, ขุยมะพร้าว",
      mediumRatio: "1:1",
      mediumPreparation: "ผสมน้ำสะอาดและปั่นหมาดเพื่อรักษาความชื้น",
      initialMediumMoisture: "ชื้นพอดี (เมื่อกำไม่แตกตัวและไม่มีน้ำหยด)",
      notes: "",
      containerType: "กระถางพลาสติก 3 นิ้ว",
      containerQuantity: snapshot.totalCuttings || null,
      containerSize: "3 นิ้ว",
      hasDrainageHoles: true,
      isOneCuttingPerContainer: true,
      waterSource: "น้ำประปาพักล้างคลอรีน",
      waterPh: "ไม่ได้วัด",
      waterEc: "ไม่ได้วัด",
      waterTemp: "ไม่ได้วัด",
      waterNotes: "",
      humiditySystemType: "dome", // dome, box, bag, mist, other
      humidityVentType: "มีช่องระบายอากาศปรับหมุนได้",
      humidityVentMethod: "เปิดฝาระบายวันละ 10 นาทีตอนเช้า",
    },
    environment: {
      isIndoor: false, // false = กลางแจ้ง/ใต้สแลน, true = ในร่ม
      lightIntensityEstimate: "แสงใต้แสลน 50%",
      hasDirectSunlight: false,
      temperatureCelsius: "ไม่ได้วัด",
      relativeHumidityPercent: "ไม่ได้วัด",
      windConditions: "ลมโชยอ่อนๆ",
      rainConditions: "ไม่มีฝน",
      rainProtection: "มีหลังคาพลาสติกใสกันฝน",
      notes: "",
    },
    trialUnits: [],
    treatments: snapshot.treatments.map((t) => ({
      id: `tr-${t.code}`,
      code: t.code,
      name: t.name,
      description: t.description,
      cuttingCount: t.cuttingCount,
      inputName: t.inputName,
      notes: t.notes,
      source: "snapshot",
    })),
    batch: {
      batchName: snapshot.batchName,
    },
    deviations: [],
    observation: {
      directObservation: "",
      interpretation: "วิเคราะห์เบื้องต้น: สภาพแวดล้อมตั้งต้นและความชื้นพอเหมาะสำหรับการแบ่งเซลล์สร้างแคลลัส",
      uncertainty: "ความไม่แน่นอน: ค่าความชื้นภายในโดมครอบอาจเปลี่ยนแปลงได้ขึ้นกับอุณหภูมิแสงแดดสาดภายนอกโรงเรือน",
    },
    notes: "",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
};

export const HUMIDITY_SYSTEM_LABELS: Record<string, string> = {
  dome: "ครอบฝาพลาสติกใส (Humidity Dome)",
  box: "กล่องพลาสติกใสปิดสนิท",
  bag: "ถุงพลาสติกใสคลุมกระถาง",
  mist: "พ่นหมอกอัตโนมัติ",
  other: "อื่นๆ (ระบุเพิ่มเติม)",
};
