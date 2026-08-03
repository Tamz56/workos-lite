import { selectObservationsNewestFirst } from "./observationSelectors";
import type {
  RoseTrialObservation,
  RoseTrialObservationScope,
  RoseTrialObservationStatus,
  RoseTrialObservationType,
  RoseTrialObservationValidationIssue,
} from "./observationTypes";
import type {
  ObservationSampleReference,
  ObservationTreatmentReference,
} from "./observationReferenceContext";

export const OBSERVATION_SCOPE_LABELS: Record<RoseTrialObservationScope, string> = {
  batch: "ทั้งการทดลอง",
  treatment: "กลุ่มทดลอง",
  sample: "กิ่งชำรายกิ่ง",
};

export const OBSERVATION_TYPE_LABELS: Record<RoseTrialObservationType, string> = {
  general_condition: "สภาพทั่วไป",
  growth_response: "การเปลี่ยนแปลงด้านการเจริญเติบโต",
  survival_status: "สถานะการรอด",
  management_event: "เหตุการณ์การจัดการ",
  environment: "สภาพแวดล้อม",
  other: "อื่น ๆ",
};

export const OBSERVATION_STATUS_LABELS: Record<RoseTrialObservationStatus, string> = {
  monitoring: "กำลังเฝ้าติดตาม",
  alive: "ยังมีชีวิต",
  weak: "อ่อนแอ",
  not_survived: "ไม่รอด",
  removed: "นำออกจากการทดลอง",
  not_assessed: "ยังไม่ประเมิน",
};

export interface ObservationDashboardSummary {
  total: number;
  batch: number;
  treatment: number;
  sample: number;
  followUp: number;
  observedSamples: number;
  latestObservedAt: string | null;
}

export interface ObservationTimelineGroup {
  trialDay: number;
  observations: RoseTrialObservation[];
}

export interface ObservationFilterOption {
  id: string;
  label: string;
}

const OBSERVATION_WARNING_PRESENTATION_RULES = {
  unknown_treatment: {
    fields: ["treatmentId"],
    message: "ไม่พบกลุ่มทดลองที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน",
  },
  unknown_sample: {
    fields: ["sampleId"],
    message: "ไม่พบกิ่งชำที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน",
  },
  sample_treatment_mismatch: {
    fields: ["treatmentId"],
    message: "ข้อมูลกิ่งชำและกลุ่มทดลองไม่ตรงกับการตั้งค่าปัจจุบัน",
  },
  cross_batch_reference: {
    fields: ["batchId", "treatmentId", "sampleId"],
    message: "ข้อมูลอ้างอิงอยู่คนละชุดการทดลองกับ Batch ปัจจุบัน",
  },
  broken_photo_reference: {
    fields: ["photoIds"],
    message: "ข้อมูลภาพบางรายการเชื่อมโยงได้ไม่สมบูรณ์",
  },
} as const satisfies Record<string, { fields: readonly string[]; message: string }>;

type ObservationWarningPresentationCode = keyof typeof OBSERVATION_WARNING_PRESENTATION_RULES;

function isObservationWarningPresentationCode(
  code: string
): code is ObservationWarningPresentationCode {
  return Object.prototype.hasOwnProperty.call(OBSERVATION_WARNING_PRESENTATION_RULES, code);
}

export function summarizeObservations(
  observations: readonly RoseTrialObservation[]
): ObservationDashboardSummary {
  const newest = selectObservationsNewestFirst(observations);
  return {
    total: observations.length,
    batch: observations.filter((item) => item.scope === "batch").length,
    treatment: observations.filter((item) => item.scope === "treatment").length,
    sample: observations.filter((item) => item.scope === "sample").length,
    followUp: observations.filter((item) => item.followUpRequired).length,
    observedSamples: new Set(observations.flatMap((item) => item.sampleId ? [item.sampleId] : [])).size,
    latestObservedAt: newest[0]?.observedAt ?? null,
  };
}

export function groupObservationsForTimeline(
  observations: readonly RoseTrialObservation[]
): ObservationTimelineGroup[] {
  const grouped = new Map<number, RoseTrialObservation[]>();
  for (const observation of observations) {
    const group = grouped.get(observation.trialDay) ?? [];
    group.push(observation);
    grouped.set(observation.trialDay, group);
  }
  return [...grouped.entries()]
    .sort(([leftDay], [rightDay]) => rightDay - leftDay)
    .map(([trialDay, items]) => ({
      trialDay,
      observations: selectObservationsNewestFirst(items),
    }));
}

export function formatObservationDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Date(value).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveObservationTargetLabel(
  observation: RoseTrialObservation,
  treatments: readonly ObservationTreatmentReference[],
  samples: readonly ObservationSampleReference[]
): string {
  if (observation.scope === "batch") return OBSERVATION_SCOPE_LABELS.batch;
  if (observation.scope === "treatment") {
    const match = treatments.find((item) => item.id === observation.treatmentId);
    return match?.label ?? `ไม่พบกลุ่มทดลอง (ID: ${observation.treatmentId ?? "ไม่ระบุ"})`;
  }
  const match = samples.find((item) => item.id === observation.sampleId);
  return match?.label ?? `ไม่พบกิ่งชำ (ID: ${observation.sampleId ?? "ไม่ระบุ"})`;
}

export function getObservationWarningMessages(
  warnings: readonly RoseTrialObservationValidationIssue[],
  recordId: string
): string[] {
  const messages = warnings
    .flatMap((warning) => {
      if (warning.recordId !== recordId || warning.severity !== "warning") return [];
      if (!isObservationWarningPresentationCode(warning.code)) return [];

      const rule = OBSERVATION_WARNING_PRESENTATION_RULES[warning.code];
      if (!(rule.fields as readonly string[]).includes(warning.field)) return [];
      return [rule.message];
    });
  return [...new Set(messages)];
}

export function buildObservationFilterOptions(
  observations: readonly RoseTrialObservation[],
  treatments: readonly ObservationTreatmentReference[],
  samples: readonly ObservationSampleReference[]
): { treatments: ObservationFilterOption[]; samples: ObservationFilterOption[] } {
  const treatmentLabels = new Map(treatments.map((item) => [item.id, item.label]));
  const sampleLabels = new Map(samples.map((item) => [item.id, item.label]));
  for (const observation of observations) {
    if (observation.treatmentId && !treatmentLabels.has(observation.treatmentId)) {
      treatmentLabels.set(
        observation.treatmentId,
        `ไม่พบกลุ่มทดลอง (ID: ${observation.treatmentId})`
      );
    }
    if (observation.sampleId && !sampleLabels.has(observation.sampleId)) {
      sampleLabels.set(observation.sampleId, `ไม่พบกิ่งชำ (ID: ${observation.sampleId})`);
    }
  }
  const sortOptions = (items: Map<string, string>) => [...items.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label, "th"));
  return { treatments: sortOptions(treatmentLabels), samples: sortOptions(sampleLabels) };
}
