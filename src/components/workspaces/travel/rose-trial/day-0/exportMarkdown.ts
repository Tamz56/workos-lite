// GF-APP-075 — Rose Trial Day 0 Markdown Export
// Stage 2D — Day 0 Setup MVP

import type { RoseDay0State } from "./types";
import { HUMIDITY_SYSTEM_LABELS } from "./defaults";

/**
 * แปลงข้อมูล Day 0 State ทั้งหมดให้เป็นเอกสารรายงานสรุป Markdown ภาษาไทยตามมาตรฐานความปลอดภัย
 */
export function exportRoseDay0ToMarkdown(state: RoseDay0State): string {
  const {
    trialSnapshot,
    startInfo,
    sourcePlant,
    cuttingSetup,
    propagationSetup,
    environment,
    trialUnits,
    deviations,
    status,
    completedAt,
  } = state;

  const escapeTable = (val: string | null | undefined) => {
    if (!val) return "—";
    return val.replace(/\|/g, "\\|").trim();
  };

  const md: string[] = [];

  md.push(`# บันทึกการตั้งต้นทดลองปักชำกุหลาบ (Rose Trial Day 0 Record)`);
  md.push(`\n**สถานะเอกสาร**: ${status === "completed" ? "เสร็จสมบูรณ์ (Completed)" : "ร่าง (Draft)"}`);
  if (completedAt) {
    md.push(`**ยืนยันเมื่อวันที่**: ${new Date(completedAt).toLocaleDateString("th-TH")}`);
  }
  md.push(`\n---`);

  // Section 1: Trial Snapshot
  md.push(`\n## 1. ข้อมูลแผนการทดลองเบื้องต้น (Trial Snapshot)`);
  md.push(`| รายการแผน | ข้อมูลรายละเอียด |`);
  md.push(`|---|---|`);
  md.push(`| **ชื่อการทดลอง** | ${escapeTable(trialSnapshot.trialName)} |`);
  md.push(`| **พืชเป้าหมาย** | ${escapeTable(trialSnapshot.cropName)} |`);
  md.push(`| **เป้าหมายเชิงกลยุทธ์** | ${escapeTable(trialSnapshot.goal)} |`);
  md.push(`| **ชื่อ Batch ของแผน** | ${escapeTable(trialSnapshot.batchName)} |`);
  md.push(`| **จำนวนกิ่งปักชำตามแผน** | ${trialSnapshot.totalCuttings} กิ่ง |`);

  // Section 2: Start Information
  md.push(`\n## 2. ข้อมูลการเริ่มต้นจริง (Start Information)`);
  md.push(`| หัวข้อเริ่มจริง | ข้อมูลที่กรอกจริง |`);
  md.push(`|---|---|`);
  md.push(`| **วันที่เริ่มดำเนินการจริง** | ${escapeTable(startInfo.actualStartDate)} |`);
  md.push(`| **เวลาเริ่มต้น** | ${escapeTable(startInfo.actualStartTime)} |`);
  md.push(`| **ผู้ดำเนินการทดลอง** | ${escapeTable(startInfo.operatorName)} |`);
  md.push(`| **สถานที่จัดตั้งจริง** | ${escapeTable(startInfo.location)} |`);
  md.push(`| **สภาพภูมิอากาศเบื้องต้น** | ${escapeTable(startInfo.weatherInfo)} |`);
  if (startInfo.notes) {
    md.push(`| **หมายเหตุการเริ่มต้น** | ${escapeTable(startInfo.notes)} |`);
  }

  // Section 3: Source Plant Record
  md.push(`\n## 3. ข้อมูลต้นแม่พันธุ์กุหลาบ (Source Plant Record)`);
  md.push(`| ข้อมูลต้นแม่ | สิ่งที่สังเกตได้ |`);
  md.push(`|---|---|`);
  md.push(`| **รหัสต้นแม่** | ${escapeTable(sourcePlant.sourcePlantId)} |`);
  md.push(`| **สายพันธุ์/ชื่อทางการค้า** | ${sourcePlant.isUnknownCultivar ? "ไม่ทราบสายพันธุ์ที่แน่ชัด" : escapeTable(sourcePlant.cultivarName)} |`);
  md.push(`| **แหล่งที่มากิ่งพันธุ์** | ${escapeTable(sourcePlant.sourceOrigin)} |`);
  md.push(`| **อายุโดยประมาณ** | ${escapeTable(sourcePlant.estimatedAge)} |`);
  md.push(`| **ระดับสุขภาพโดยรวม** | ${escapeTable(sourcePlant.overallHealth)} |`);
  md.push(`| **โรคและแมลงที่สังเกตพบ** | ${escapeTable(sourcePlant.observedPestsOrDiseases)} |`);
  md.push(`| **ประวัติใส่ปุ๋ยล่าสุด** | ${escapeTable(sourcePlant.lastFertilizedDate)} |`);
  md.push(`| **ประวัติการพ่นสารล่าสุด** | ${escapeTable(sourcePlant.lastSprayedDate)} |`);
  if (sourcePlant.notes) {
    md.push(`| **หมายเหตุต้นแม่** | ${escapeTable(sourcePlant.notes)} |`);
  }

  // Section 4: Cutting Setup
  md.push(`\n## 4. ข้อมูลการตัดและรวบรวมกิ่งปักชำจริง (Cutting Setup)`);
  md.push(`| รายละเอียดกิ่งจริง | รายละเอียด |`);
  md.push(`|---|---|`);
  md.push(`| **จำนวนกิ่งที่ทำจริง** | ${cuttingSetup.actualCuttingCount} กิ่ง (แผน: ${trialSnapshot.totalCuttings} กิ่ง) |`);
  md.push(`| **ลักษณะเนื้อกิ่งพันธุ์** | ${escapeTable(cuttingSetup.cuttingTypeDescription)} |`);
  md.push(`| **ความยาวเป้าหมาย (ซม.)** | ${escapeTable(cuttingSetup.targetLengthCm)} ซม. |`);
  md.push(`| **จำนวนข้อเป้าหมาย** | ${escapeTable(cuttingSetup.targetNodeCount)} ข้อ |`);
  md.push(`| **จำนวนใบที่เหลือ** | ${escapeTable(cuttingSetup.remainingLeafCount)} |`);
  md.push(`| **การเด็ดตาดอก/ดอกตูม** | ${cuttingSetup.isBudsOrFlowersRemoved ? "เด็ดออกทั้งหมดแล้ว" : "ไม่ได้เด็ดออก/ไม่มี"} |`);
  md.push(`| **วิธีล้างเตรียมนอกโคนกิ่ง** | ${escapeTable(cuttingSetup.basePreparationMethod)} |`);
  if (cuttingSetup.notes) {
    md.push(`| **หมายเหตุการเตรียมกิ่ง** | ${escapeTable(cuttingSetup.notes)} |`);
  }

  // Section 5: Propagation Setup
  md.push(`\n## 5. การตั้งค่าระบบปักชำจริง (Propagation Setup)`);
  md.push(`### วัสดุปักชำ (Medium)`);
  md.push(`- **ชื่อวัสดุปักชำ**: ${propagationSetup.mediumName || "—"}`);
  md.push(`- **ส่วนผสม**: ${propagationSetup.mediumIngredients || "—"}`);
  md.push(`- **อัตราส่วนผสม**: ${propagationSetup.mediumRatio || "—"}`);
  md.push(`- **ขั้นตอนการเตรียมวัสดุ**: ${propagationSetup.mediumPreparation || "—"}`);
  md.push(`- **ความชื้นเริ่มต้น**: ${propagationSetup.initialMediumMoisture || "—"}`);
  if (propagationSetup.notes) md.push(`- **หมายเหตุวัสดุ**: ${propagationSetup.notes}`);

  md.push(`\n### ภาชนะปลูก (Container)`);
  md.push(`- **ประเภทภาชนะ**: ${propagationSetup.containerType || "—"}`);
  md.push(`- **จำนวนภาชนะ**: ${propagationSetup.containerQuantity || "—"}`);
  md.push(`- **ขนาดความกว้าง**: ${propagationSetup.containerSize || "—"}`);
  md.push(`- **การระบายน้ำ**: ${propagationSetup.hasDrainageHoles ? "มีรูระบายน้ำ" : "ไม่มีรูระบายน้ำ"}`);
  md.push(`- **การจัดสรรกิ่ง**: ${propagationSetup.isOneCuttingPerContainer ? "1 กิ่งต่อ 1 กระถาง" : "ปักชำรวมกันหลายกิ่ง"}`);

  md.push(`\n### ข้อมูลน้ำที่ใช้ปลูก (Water)`);
  md.push(`- **แหล่งที่มาของน้ำ**: ${propagationSetup.waterSource || "—"}`);
  md.push(`- **ค่า pH (ความเป็นกรด-ด่าง)**: ${propagationSetup.waterPh}`);
  md.push(`- **ค่า EC (ความนำไฟฟ้าสารละลาย)**: ${propagationSetup.waterEc}`);
  md.push(`- **อุณหภูมิน้ำ**: ${propagationSetup.waterTemp}`);
  if (propagationSetup.waterNotes) md.push(`- **หมายเหตุเรื่องน้ำ**: ${propagationSetup.waterNotes}`);

  md.push(`\n### ระบบควมคุมความชื้นสัมพัทธ์ (Humidity Control)`);
  md.push(`- **ประเภทระบบความชื้น**: ${HUMIDITY_SYSTEM_LABELS[propagationSetup.humiditySystemType] || propagationSetup.humiditySystemType}`);
  md.push(`- **ช่องระบายอากาศ**: ${propagationSetup.humidityVentType || "—"}`);
  md.push(`- **วิธีการจัดการระบาย**: ${propagationSetup.humidityVentMethod || "—"}`);

  // Section 6: Environment
  md.push(`\n## 6. สภาพแวดล้อมโดยรวมในจุดทดลอง (Environment)`);
  md.push(`| หัวข้อสภาพแวดล้อม | รายละเอียด |`);
  md.push(`|---|---|`);
  md.push(`| **พื้นที่ทดลองหลัก** | ${environment.isIndoor ? "พื้นที่ในร่ม / ในห้องแล็บ" : "พื้นที่กลางแจ้ง / ใต้โรงเรือนสแลน"} |`);
  md.push(`| **ระดับแสงเงาโดยประมาณ** | ${escapeTable(environment.lightIntensityEstimate)} |`);
  md.push(`| **โอกาสโดนแดดตรง** | ${environment.hasDirectSunlight ? "มีแดดส่องโดนโดยตรง" : "ไม่มีแสงแดดส่องโดยตรง"} |`);
  md.push(`| **อุณหภูมิอากาศเริ่มต้น** | ${escapeTable(environment.temperatureCelsius)} |`);
  md.push(`| **ระดับความชื้นเริ่มต้น** | ${escapeTable(environment.relativeHumidityPercent)} |`);
  md.push(`| **อัตราการพัดผ่านลม** | ${escapeTable(environment.windConditions)} |`);
  md.push(`| **ความเสี่ยงการโดนฝน** | ${escapeTable(environment.rainConditions)} |`);
  md.push(`| **การป้องกันน้ำฝน** | ${escapeTable(environment.rainProtection)} |`);
  if (environment.notes) {
    md.push(`| **หมายเหตุพื้นที่** | ${escapeTable(environment.notes)} |`);
  }

  // Section 7: Treatments
  md.push(`\n## 7. ตารางสรุปกลุ่มการทดสอบจริง (Treatments Confirmation)`);
  md.push(`| รหัส | ชื่อกลุ่ม | สารเร่ง/วัสดุจริง | วิธีใช้และอัตราจริง | จำนวนกิ่งจริง | หมายเหตุ |`);
  md.push(`|---|---|---|---|---|---|`);
  for (const t of trialSnapshot.treatments) {
    // หาข้อมูลจริง
    const actual = state.treatments.find((tr) => tr.code === t.code);
    md.push(
      `| ${t.code} | ${escapeTable(t.name)} | ${escapeTable(actual?.inputName || "ยังไม่ได้ระบุ")} | ${escapeTable(actual?.notes || "ยังไม่ได้ระบุ")} | ${actual?.cuttingCount || 0} กิ่ง (แผน: ${t.cuttingCount}) | ${escapeTable(actual?.description || "—")} |`
    );
  }

  // Section 8: Trial Units
  md.push(`\n## 8. บัญชีรหัสกิ่งปักชำรายตัว (Trial Units)`);
  md.push(`| รหัสประจำกิ่ง | กลุ่ม Treatment | รหัสภาชนะปลูก | สภาพเบื้องต้นวันเริ่ม | หมายเหตุ |`);
  md.push(`|---|---|---|---|---|`);
  for (const unit of trialUnits) {
    md.push(
      `| ${unit.id} | ${unit.treatmentCode} | ${escapeTable(unit.containerCode)} | ${escapeTable(unit.initialCondition)} | ${escapeTable(unit.notes)} |`
    );
  }

  // Section 9: Observations
  md.push(`\n## 9. การสังเกตและตีความเชิงวิชาการ (Day 0 Observation)`);
  md.push(`### ข้อมูลสังเกตการณ์เชิงทัศนสัมผัส (Direct Observation)`);
  md.push(`> ${escapeTable(state.observation.directObservation || "ไม่พบการระบุข้อมูลในวันเริ่มต้น")}`);

  // Section 10: Interpretation and Uncertainty
  md.push(`\n## 10. การวิเคราะห์และความไม่แน่นอน (Interpretation and Uncertainty)`);
  md.push(`- **การวิเคราะห์เบื้องต้น (Interpretation)**: ${escapeTable(state.observation.interpretation || "—")}`);
  md.push(`- **ความไม่แน่นอนของระบบ (Uncertainty)**: ${escapeTable(state.observation.uncertainty || "—")}`);

  // Section 11: Deviations
  md.push(`\n## 11. บันทึกประเด็นเบี่ยงเบนจากแผนการทดลอง (Deviation Log)`);
  if (deviations.length === 0) {
    md.push(`*ไม่พบประเด็นเบี่ยงเบนจากแผนการเตรียมตัวในการเริ่ม Day 0*`);
  } else {
    md.push(`| หัวข้อส่วนเบี่ยงเบน | แผนที่วางไว้ | ค่าที่ทำจริง | สาเหตุความจำเป็น | คาดการณ์ผลกระทบ |`);
    md.push(`|---|---|---|---|---|`);
    for (const dev of deviations) {
      md.push(
        `| ${escapeTable(dev.area)} | ${escapeTable(dev.plannedValue)} | ${escapeTable(dev.actualValue)} | ${escapeTable(dev.reason)} | ${escapeTable(dev.possibleImpact)} |`
      );
    }
  }

  // Section 12: Data Limitations
  md.push(`\n## 12. ข้อจำกัดและกรอบข้อมูลการวิจัย (Data Limitations)`);
  md.push(`- ข้อมูลนี้เป็นการบันทึกสภาวะตั้งต้นในวันตัดกิ่งและปักลงวัสดุชำเท่านั้น (Day 0)`);
  md.push(`- ยังไม่สามารถระบุตัวบ่งชี้การเติบโตหรืออัตราความล้มเหลว/รอดชีวิตที่แท้จริงได้จนกว่าจะสิ้นสุดกรอบระยะเวลาสังเกตการณ์ขั้นต่ำ`);

  md.push(`\n---`);
  md.push(`\n> **คำเตือนด้านความปลอดภัยทางการวิจัย (Disclaimer):**`);
  md.push(`> *เอกสารนี้บันทึกข้อมูลและสิ่งที่สังเกตได้ในวันเริ่มทดลอง*`);
  md.push(`> *ไม่ได้ยืนยันผลการออกรากหรือความสำเร็จของการปักชำกุหลาบแต่อย่างใด*`);

  return md.join("\n");
}
