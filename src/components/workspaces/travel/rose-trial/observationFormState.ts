import type { CreateRoseTrialObservationInput } from "./observationCrud";
import type {
  ObservationReferenceContextResult,
  ObservationSampleReference,
} from "./observationReferenceContext";
import type {
  RoseTrialObservationScope,
  RoseTrialObservationStatus,
  RoseTrialObservationType,
  RoseTrialObservationValidationIssue,
} from "./observationTypes";

export const OBSERVED_FACTS_MAX_LENGTH = 4000;
export const OBSERVATION_INTERPRETATION_MAX_LENGTH = 2000;

export interface ObservationFormDraft {
  scope: RoseTrialObservationScope;
  treatmentId: string;
  sampleId: string;
  observedAtLocal: string;
  trialDay: number | null;
  type: RoseTrialObservationType;
  observedFacts: string;
  interpretation: string;
  status: RoseTrialObservationStatus | "";
  followUpRequired: boolean;
}

export type ObservationFormField = keyof ObservationFormDraft | "batchId" | "photoIds";
export type ObservationFormErrors = Partial<Record<ObservationFormField, string>>;

export type ObservationFormValidationResult =
  | {
      valid: true;
      input: CreateRoseTrialObservationInput;
      normalizedDraft: ObservationFormDraft;
    }
  | {
      valid: false;
      errors: ObservationFormErrors;
    };

const SCOPE_VALUES = new Set<RoseTrialObservationScope>(["batch", "treatment", "sample"]);
const TYPE_VALUES = new Set<RoseTrialObservationType>([
  "general_condition",
  "growth_response",
  "survival_status",
  "management_event",
  "environment",
  "other",
]);
const STATUS_VALUES = new Set<RoseTrialObservationStatus>([
  "monitoring",
  "alive",
  "weak",
  "not_survived",
  "removed",
  "not_assessed",
]);

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTimeLocal(date: Date): string {
  if (!Number.isFinite(date.getTime())) return "";
  return [
    date.getFullYear(),
    "-",
    padDatePart(date.getMonth() + 1),
    "-",
    padDatePart(date.getDate()),
    "T",
    padDatePart(date.getHours()),
    ":",
    padDatePart(date.getMinutes()),
  ].join("");
}

export function dateTimeLocalToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(year, month - 1, day, hour, minute, second, 0);

  if (
    !Number.isFinite(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
    || date.getSeconds() !== second
  ) {
    return null;
  }

  return date.toISOString();
}

function localCalendarOrdinal(value: string): number | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function calculateObservationTrialDay(
  pilotStartedAt: string,
  observedAtIso: string
): number | null {
  const startedDay = localCalendarOrdinal(pilotStartedAt);
  const observedDay = localCalendarOrdinal(observedAtIso);
  if (startedDay === null || observedDay === null) return null;
  const difference = observedDay - startedDay;
  return Number.isInteger(difference) && difference >= 0 ? difference : null;
}

export function createObservationFormDraft(
  openedAt: Date,
  pilotStartedAt: string
): ObservationFormDraft {
  const observedAtLocal = formatDateTimeLocal(openedAt);
  const observedAtIso = dateTimeLocalToIso(observedAtLocal);
  return {
    scope: "batch",
    treatmentId: "",
    sampleId: "",
    observedAtLocal,
    trialDay: observedAtIso
      ? calculateObservationTrialDay(pilotStartedAt, observedAtIso)
      : null,
    type: "general_condition",
    observedFacts: "",
    interpretation: "",
    status: "",
    followUpRequired: false,
  };
}

export function changeObservationScope(
  draft: ObservationFormDraft,
  scope: RoseTrialObservationScope
): ObservationFormDraft {
  return {
    ...draft,
    scope,
    treatmentId: "",
    sampleId: "",
  };
}

export function changeObservationDateTime(
  draft: ObservationFormDraft,
  observedAtLocal: string,
  pilotStartedAt: string
): ObservationFormDraft {
  const observedAtIso = dateTimeLocalToIso(observedAtLocal);
  return {
    ...draft,
    observedAtLocal,
    trialDay: observedAtIso
      ? calculateObservationTrialDay(pilotStartedAt, observedAtIso)
      : null,
  };
}

export function isObservationFormDirty(
  draft: ObservationFormDraft,
  initialDraft: ObservationFormDraft
): boolean {
  return (Object.keys(initialDraft) as Array<keyof ObservationFormDraft>)
    .some((field) => draft[field] !== initialDraft[field]);
}

function resolveSample(
  sampleId: string,
  samples: readonly ObservationSampleReference[]
): ObservationSampleReference | undefined {
  return samples.find((sample) => sample.id === sampleId);
}

export function validateObservationFormDraft(
  draft: ObservationFormDraft,
  referenceContext: Extract<ObservationReferenceContextResult, { ok: true }>,
  pilotStartedAt: string,
  submittedAt: Date
): ObservationFormValidationResult {
  const errors: ObservationFormErrors = {};
  const facts = draft.observedFacts.trim();
  const interpretation = draft.interpretation.trim();
  const observedAtIso = dateTimeLocalToIso(draft.observedAtLocal);

  if (!SCOPE_VALUES.has(draft.scope)) {
    errors.scope = "ขอบเขตการบันทึกไม่ถูกต้อง";
  }
  if (!TYPE_VALUES.has(draft.type)) {
    errors.type = "ประเภทการสังเกตไม่ถูกต้อง";
  }
  if (draft.status !== "" && !STATUS_VALUES.has(draft.status)) {
    errors.status = "สถานะการสังเกตไม่ถูกต้อง";
  }
  if (typeof draft.followUpRequired !== "boolean") {
    errors.followUpRequired = "กรุณาระบุว่าต้องติดตามรายการนี้ต่อหรือไม่";
  }
  if (!facts) {
    errors.observedFacts = "กรุณาระบุสิ่งที่สังเกตเห็น";
  } else if (facts.length > OBSERVED_FACTS_MAX_LENGTH) {
    errors.observedFacts = `สิ่งที่สังเกตเห็นต้องไม่เกิน ${OBSERVED_FACTS_MAX_LENGTH.toLocaleString("th-TH")} ตัวอักษร`;
  }
  if (interpretation.length > OBSERVATION_INTERPRETATION_MAX_LENGTH) {
    errors.interpretation = `ข้อสังเกตหรือการตีความต้องไม่เกิน ${OBSERVATION_INTERPRETATION_MAX_LENGTH.toLocaleString("th-TH")} ตัวอักษร`;
  }

  const startedAtTime = Date.parse(pilotStartedAt);
  if (!observedAtIso) {
    errors.observedAtLocal = "วันและเวลาที่สังเกตไม่ถูกต้อง";
  } else if (!Number.isFinite(startedAtTime)) {
    errors.observedAtLocal = "ไม่พบเวลาเริ่ม Pilot ที่ถูกต้อง";
  } else if (Date.parse(observedAtIso) < startedAtTime) {
    errors.observedAtLocal = "วันและเวลาที่สังเกตต้องไม่ก่อนเวลาเริ่ม Pilot";
  } else if (Date.parse(observedAtIso) > submittedAt.getTime()) {
    errors.observedAtLocal = "วันและเวลาที่สังเกตต้องไม่อยู่ในอนาคต";
  }

  const trialDay = observedAtIso
    ? calculateObservationTrialDay(pilotStartedAt, observedAtIso)
    : null;
  if (trialDay === null) {
    errors.trialDay = "ไม่สามารถคำนวณ Trial Day จากวันเวลานี้ได้";
  }

  let treatmentId: string | undefined;
  let sampleId: string | undefined;
  if (draft.scope === "treatment") {
    const treatment = referenceContext.treatments.find((item) => item.id === draft.treatmentId);
    if (!draft.treatmentId) {
      errors.treatmentId = "กรุณาเลือกกลุ่มทดลอง";
    } else if (!treatment) {
      errors.treatmentId = "ไม่พบกลุ่มทดลองที่เลือกใน Batch ปัจจุบัน";
    } else {
      treatmentId = treatment.id;
    }
  }

  if (draft.scope === "sample") {
    const sample = resolveSample(draft.sampleId, referenceContext.samples);
    if (!draft.sampleId) {
      errors.sampleId = "กรุณาเลือกกิ่งชำ";
    } else if (!sample) {
      errors.sampleId = "ไม่พบกิ่งชำที่เลือกใน Batch ปัจจุบัน";
    } else if (!sample.treatmentId) {
      errors.sampleId = "ไม่สามารถระบุกลุ่มทดลองของกิ่งชำนี้ได้ กรุณาตรวจสอบ Treatment code";
    } else {
      sampleId = sample.id;
      treatmentId = sample.treatmentId;
    }
  }

  if (Object.keys(errors).length > 0 || !observedAtIso || trialDay === null) {
    return { valid: false, errors };
  }

  const normalizedDraft: ObservationFormDraft = {
    ...draft,
    treatmentId: draft.scope === "batch" ? "" : treatmentId ?? "",
    sampleId: draft.scope === "sample" ? sampleId ?? "" : "",
    trialDay,
    observedFacts: facts,
    interpretation,
  };
  const input: CreateRoseTrialObservationInput = {
    batchId: referenceContext.batchId,
    trialDay,
    observedAt: observedAtIso,
    scope: draft.scope,
    ...(treatmentId ? { treatmentId } : {}),
    ...(sampleId ? { sampleId } : {}),
    type: draft.type,
    observedFacts: facts,
    ...(interpretation ? { interpretation } : {}),
    ...(draft.status ? { status: draft.status } : {}),
    followUpRequired: draft.followUpRequired,
    photoIds: [],
  };

  return { valid: true, input, normalizedDraft };
}

const DOMAIN_FIELD_COPY: Partial<Record<string, string>> = {
  batchId: "ชุดการทดลองไม่ตรงกับข้อมูลปัจจุบัน",
  treatmentId: "กลุ่มทดลองที่เลือกไม่พร้อมใช้งาน กรุณาตรวจสอบอีกครั้ง",
  sampleId: "กิ่งชำที่เลือกไม่พร้อมใช้งาน กรุณาตรวจสอบอีกครั้ง",
  observedAt: "วันและเวลาที่สังเกตไม่ถูกต้อง",
  trialDay: "Trial Day ไม่ถูกต้อง",
  type: "ประเภทการสังเกตไม่ถูกต้อง",
  observedFacts: "กรุณาตรวจสอบสิ่งที่สังเกตเห็น",
  interpretation: "กรุณาตรวจสอบข้อสังเกตหรือการตีความ",
  status: "สถานะการสังเกตไม่ถูกต้อง",
  followUpRequired: "กรุณาระบุว่าต้องติดตามรายการนี้ต่อหรือไม่",
  photoIds: "ข้อมูลภาพประกอบไม่ถูกต้อง",
};

export function mapObservationIssuesToFormErrors(
  issues: readonly RoseTrialObservationValidationIssue[]
): ObservationFormErrors {
  const errors: ObservationFormErrors = {};
  for (const issue of issues) {
    const field = issue.field === "observedAt" ? "observedAtLocal" : issue.field;
    if (field in errors) continue;
    const copy = DOMAIN_FIELD_COPY[issue.field] ?? "ข้อมูลไม่ผ่านการตรวจสอบ กรุณาตรวจสอบอีกครั้ง";
    errors[field as ObservationFormField] = copy;
  }
  return errors;
}
