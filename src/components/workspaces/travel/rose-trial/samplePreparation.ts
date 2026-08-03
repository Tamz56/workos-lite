import { generateTrialSamples } from "./sampleGeneration";
import type {
  PilotGroupConfig,
  ReadinessSectionStatus,
  SampleInitialCondition,
  TrialSample,
  TrialSampleStatus,
} from "./types";

export const SAMPLE_STATUS_LABELS: Record<Exclude<TrialSampleStatus, "replaced">, string> = {
  pending: "ยังไม่เตรียม",
  ready: "พร้อม",
  excluded: "ตัดออกจากการทดลอง",
};

export const SAMPLE_CONDITION_LABELS: Record<SampleInitialCondition, string> = {
  normal: "ปกติ",
  observe: "ควรสังเกต",
  unsuitable: "ไม่เหมาะใช้",
};

export interface SamplePreparationPatch {
  status?: Exclude<TrialSampleStatus, "replaced">;
  sampleLabel?: string;
  cuttingLength?: string;
  nodeCount?: string;
  initialCondition?: SampleInitialCondition;
  notes?: string;
}

export interface SamplePreparationSummary {
  totalCount: number;
  readyCount: number;
  notReadyCount: number;
  excludedCount: number;
  blockers: string[];
  warnings: string[];
  status: ReadinessSectionStatus;
}

export interface SampleFieldValidation {
  cuttingLengthError: string | null;
  nodeCountError: string | null;
}

export function isValidCuttingLengthInput(value: string): boolean {
  return value === "" || /^\d+(?:\.\d*)?$/.test(value);
}

export function isValidNodeCountInput(value: string): boolean {
  return value === "" || /^\d+$/.test(value);
}

function isPositiveDecimal(value: string): boolean {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isPositiveInteger(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

export function getSampleFieldValidation(sample: TrialSample): SampleFieldValidation {
  return {
    cuttingLengthError: sample.baseline.length !== "" && !isPositiveDecimal(sample.baseline.length)
      ? "ความยาวต้องเป็นตัวเลขมากกว่า 0"
      : null,
    nodeCountError: sample.baseline.nodeCount !== "" && !isPositiveInteger(sample.baseline.nodeCount)
      ? "จำนวนข้อต้องเป็นจำนวนเต็มมากกว่า 0"
      : null,
  };
}

function parseCondition(value: string): SampleInitialCondition | null {
  if (value === "normal" || value === "observe" || value === "unsuitable") return value;
  return null;
}

export function normalizeSamplePreparationFields(
  samples: readonly TrialSample[]
): TrialSample[] {
  return samples.map((sample) => {
    const defaultBaseline = {
      sampleLabel: "",
      source: "",
      motherPlantId: "",
      cuttingPosition: "",
      cuttingDate: "",
      cuttingTime: "",
      length: "",
      stemDiameter: "",
      nodeCount: "",
      leafCount: "",
      stemMaturity: "",
      initialCondition: "normal",
      stemColor: "",
      basalCutAppearance: "",
      existingDamage: "",
      note: "",
      photoChecklist: {
        wholeCutting: false,
        basalCut: false,
        sampleLabel: false,
      },
    };

    const baseline = {
      ...defaultBaseline,
      ...sample.baseline,
      sampleLabel: sample.baseline.sampleLabel ?? "",
      length: typeof sample.baseline.length === "string" ? sample.baseline.length : "",
      nodeCount: typeof sample.baseline.nodeCount === "string" ? sample.baseline.nodeCount : "",
      initialCondition: (["normal", "observe", "unsuitable"] as readonly string[]).includes(sample.baseline.initialCondition)
        ? sample.baseline.initialCondition
        : "normal",
      note: sample.baseline.note ?? "",
      photoChecklist: sample.baseline.photoChecklist
        ? { ...defaultBaseline.photoChecklist, ...sample.baseline.photoChecklist }
        : { ...defaultBaseline.photoChecklist },
    };

    return {
      ...sample,
      status: ["pending", "ready", "excluded", "replaced"].includes(sample.status)
        ? sample.status
        : "pending",
      baseline,
      replacementFor: sample.replacementFor ?? null,
      excludedReason: sample.excludedReason ?? "",
    };
  });
}

export function updateTrialSamples(
  samples: readonly TrialSample[],
  sampleId: string,
  patch: SamplePreparationPatch
): TrialSample[] {
  return samples.map((sample) => {
    if (sample.id !== sampleId) return sample;

    const nextBaseline = { ...sample.baseline };
    if (patch.sampleLabel !== undefined) nextBaseline.sampleLabel = patch.sampleLabel;
    if (patch.notes !== undefined) nextBaseline.note = patch.notes;
    if (patch.initialCondition !== undefined) nextBaseline.initialCondition = patch.initialCondition;
    if (patch.cuttingLength !== undefined && isValidCuttingLengthInput(patch.cuttingLength)) {
      nextBaseline.length = patch.cuttingLength;
    }
    if (patch.nodeCount !== undefined && isValidNodeCountInput(patch.nodeCount)) {
      nextBaseline.nodeCount = patch.nodeCount;
    }

    return {
      ...sample,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      baseline: nextBaseline,
    };
  });
}

export function createCanonicalSampleIds(groupConfig: readonly PilotGroupConfig[]): string[] {
  return generateTrialSamples(groupConfig).map((sample) => sample.id);
}

export function summarizeSamplePreparation(
  samples: readonly TrialSample[],
  groupConfig: readonly PilotGroupConfig[]
): SamplePreparationSummary {
  const canonicalSamples = generateTrialSamples(groupConfig);
  const expectedById = new Map(canonicalSamples.map((sample) => [sample.id, sample]));
  const countsById = new Map<string, number>();
  for (const sample of samples) countsById.set(sample.id, (countsById.get(sample.id) ?? 0) + 1);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const canonicalRecords = canonicalSamples
    .map((expected) => samples.find((sample) => sample.id === expected.id))
    .filter((sample): sample is TrialSample => Boolean(sample));

  const duplicateIds = [...countsById.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  const missingIds = canonicalSamples.filter((sample) => !countsById.has(sample.id)).map((sample) => sample.id);
  const unknownIds = samples.filter((sample) => !expectedById.has(sample.id)).map((sample) => sample.id);
  const mappingErrors = canonicalRecords.filter((sample) => {
    const expected = expectedById.get(sample.id);
    return !expected || sample.groupId !== expected.groupId || sample.medium !== expected.medium ||
      sample.treatmentRole !== expected.treatmentRole || sample.treatmentCode !== expected.treatmentCode ||
      sample.replicate !== expected.replicate;
  }).map((sample) => sample.id);

  if (samples.length !== canonicalSamples.length) {
    blockers.push(`Sample Preparation: จำนวน Sample records ต้องครบ ${canonicalSamples.length} รายการ`);
  }
  if (missingIds.length > 0) blockers.push(`Sample Preparation: ไม่พบ Sample ID ${missingIds.join(", ")}`);
  if (duplicateIds.length > 0) blockers.push(`Sample Preparation: Sample ID ซ้ำ ${duplicateIds.join(", ")}`);
  if (unknownIds.length > 0) blockers.push(`Sample Preparation: พบ Sample ID นอก canonical set ${unknownIds.join(", ")}`);
  if (mappingErrors.length > 0) blockers.push(`Sample Preparation: group mapping ไม่ถูกต้องสำหรับ ${mappingErrors.join(", ")}`);

  const readyCount = canonicalRecords.filter((sample) => sample.status === "ready").length;
  const excludedCount = canonicalRecords.filter((sample) => sample.status === "excluded").length;
  const pendingCount = canonicalRecords.filter((sample) => sample.status === "pending" || sample.status === "replaced").length;
  if (pendingCount > 0) blockers.push(`Sample Preparation: ยังมี ${pendingCount} ตัวอย่างที่ยังไม่พร้อม`);
  if (excludedCount > 0) {
    blockers.push(`Sample Preparation: มี ${excludedCount} ตัวอย่างถูกตัดออก ทำให้จำนวนพร้อมใช้งานไม่ครบตามแผน`);
  }

  const unsuitable = canonicalRecords.filter((sample) =>
    parseCondition(sample.baseline.initialCondition) === "unsuitable" && sample.status !== "excluded"
  );
  if (unsuitable.length > 0) {
    blockers.push(`Sample Preparation: ตัวอย่างไม่เหมาะใช้และยังไม่ได้ตัดออก ${unsuitable.map((sample) => sample.id).join(", ")}`);
  }

  const invalidConditions = canonicalRecords.filter((sample) => !parseCondition(sample.baseline.initialCondition));
  if (invalidConditions.length > 0) {
    blockers.push(`Sample Preparation: สภาพเริ่มต้นไม่ถูกต้อง ${invalidConditions.map((sample) => sample.id).join(", ")}`);
  }

  const invalidLengths = canonicalRecords.filter((sample) => getSampleFieldValidation(sample).cuttingLengthError);
  const invalidNodes = canonicalRecords.filter((sample) => getSampleFieldValidation(sample).nodeCountError);
  if (invalidLengths.length > 0) {
    blockers.push(`Sample Preparation: ความยาวกิ่งไม่ถูกต้อง ${invalidLengths.map((sample) => sample.id).join(", ")}`);
  }
  if (invalidNodes.length > 0) {
    blockers.push(`Sample Preparation: จำนวนข้อต้องเป็นจำนวนเต็มมากกว่า 0 สำหรับ ${invalidNodes.map((sample) => sample.id).join(", ")}`);
  }

  const missingLabels = canonicalRecords.filter((sample) => !(sample.baseline.sampleLabel ?? "").trim()).length;
  const missingLengths = canonicalRecords.filter((sample) => sample.baseline.length === "").length;
  const missingNodes = canonicalRecords.filter((sample) => sample.baseline.nodeCount === "").length;
  const missingNotes = canonicalRecords.filter((sample) => !sample.baseline.note.trim()).length;
  const observations = canonicalRecords.filter((sample) =>
    sample.status === "ready" && parseCondition(sample.baseline.initialCondition) === "observe"
  );
  if (missingLabels > 0) warnings.push(`Sample Preparation: ยังไม่ระบุ Sample Label ${missingLabels} รายการ`);
  if (missingLengths > 0) warnings.push(`Sample Preparation: ยังไม่ระบุความยาวกิ่ง ${missingLengths} รายการ`);
  if (missingNodes > 0) warnings.push(`Sample Preparation: ยังไม่ระบุจำนวนข้อ ${missingNodes} รายการ`);
  if (missingNotes > 0) warnings.push(`Sample Preparation: ยังไม่มีหมายเหตุ ${missingNotes} รายการ`);
  if (observations.length > 0) {
    warnings.push(`Sample Preparation: มีตัวอย่างพร้อมที่ควรสังเกต ${observations.map((sample) => sample.id).join(", ")}`);
  }

  if (readyCount < canonicalSamples.length && pendingCount === 0 && excludedCount === 0 &&
    unsuitable.length === 0 && missingIds.length === 0) {
    blockers.push(`Sample Preparation: ตัวอย่างพร้อม ${readyCount} / ${canonicalSamples.length} รายการ`);
  }

  return {
    totalCount: canonicalSamples.length,
    readyCount,
    notReadyCount: canonicalSamples.length - readyCount,
    excludedCount,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
  };
}
