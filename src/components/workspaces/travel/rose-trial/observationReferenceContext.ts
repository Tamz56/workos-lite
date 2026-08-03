import type {
  PilotStartRecord,
  Treatment,
  TrialSample,
} from "./types";
import type { RoseTrialObservationValidationContext } from "./observationTypes";

export interface ObservationTreatmentReference {
  id: string;
  code: string;
  label: string;
}

export interface ObservationSampleReference {
  id: string;
  label: string;
  treatmentCode: string;
  treatmentId?: string;
}

export interface ObservationReferenceWarning {
  code: "ambiguous_treatment_code";
  treatmentCode: string;
  message: string;
}

export type ObservationReferenceContextResult =
  | {
      ok: false;
      reason: "pilot_not_started" | "missing_started_at" | "invalid_started_at";
      message: string;
    }
  | {
      ok: true;
      batchId: string;
      validationContext: RoseTrialObservationValidationContext;
      treatments: ObservationTreatmentReference[];
      samples: ObservationSampleReference[];
      warnings: ObservationReferenceWarning[];
    };

export function normalizeObservationTreatmentCode(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function createObservationReferenceContext(
  pilotStart: PilotStartRecord,
  treatments: readonly Treatment[],
  samples: readonly TrialSample[]
): ObservationReferenceContextResult {
  if (pilotStart.started !== true) {
    return {
      ok: false,
      reason: "pilot_not_started",
      message: "เริ่ม Pilot ก่อนเปิดพื้นที่บันทึกการสังเกต",
    };
  }

  const startedAt = pilotStart.startedAt;
  if (typeof startedAt !== "string" || !startedAt.trim()) {
    return {
      ok: false,
      reason: "missing_started_at",
      message: "ไม่พบเวลาเริ่ม Pilot จึงยังระบุชุดการทดลองสำหรับ Observation ไม่ได้",
    };
  }
  if (!Number.isFinite(Date.parse(startedAt))) {
    return {
      ok: false,
      reason: "invalid_started_at",
      message: "เวลาเริ่ม Pilot ไม่อยู่ในรูปแบบที่อ่านได้ ระบบจึงยังไม่เดา Batch ID",
    };
  }

  const batchId = `rose-trial:${startedAt}`;
  const treatmentsByCode = new Map<string, Treatment[]>();
  for (const treatment of treatments) {
    const normalizedCode = normalizeObservationTreatmentCode(treatment.code);
    if (!normalizedCode) continue;
    const matches = treatmentsByCode.get(normalizedCode) ?? [];
    matches.push(treatment);
    treatmentsByCode.set(normalizedCode, matches);
  }

  const warnings: ObservationReferenceWarning[] = [];
  for (const matches of treatmentsByCode.values()) {
    if (matches.length < 2) continue;
    warnings.push({
      code: "ambiguous_treatment_code",
      treatmentCode: matches[0].code,
      message: `พบ Treatment code “${matches[0].code}” ซ้ำ จึงไม่เดาความสัมพันธ์ของกิ่งชำ`,
    });
  }

  const treatmentReferences = treatments.map((treatment) => ({
    id: treatment.id,
    code: treatment.code,
    label: [treatment.code.trim(), treatment.name.trim()].filter(Boolean).join(" — ") || treatment.id,
  }));
  const sampleReferences = samples.map((sample) => {
    const normalizedCode = normalizeObservationTreatmentCode(sample.treatmentCode);
    const matches = normalizedCode ? treatmentsByCode.get(normalizedCode) ?? [] : [];
    const treatmentId = matches.length === 1 ? matches[0].id : undefined;
    const sampleLabel = sample.baseline.sampleLabel?.trim() || sample.id;
    return {
      id: sample.id,
      label: sampleLabel === sample.id ? sample.id : `${sampleLabel} (${sample.id})`,
      treatmentCode: sample.treatmentCode,
      ...(treatmentId ? { treatmentId } : {}),
    };
  });

  return {
    ok: true,
    batchId,
    validationContext: {
      batchId,
      treatments: treatmentReferences.map((treatment) => ({ id: treatment.id, batchId })),
      samples: sampleReferences.map((sample) => ({
        id: sample.id,
        batchId,
        ...(sample.treatmentId ? { treatmentId: sample.treatmentId } : {}),
      })),
    },
    treatments: treatmentReferences,
    samples: sampleReferences,
    warnings,
  };
}
