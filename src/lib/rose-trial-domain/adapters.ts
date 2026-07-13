// GF-APP-077B — Rose Trial Domain Adapters

import type { RoseTrialState } from "../../components/workspaces/travel/rose-trial/types";
import type { RoseDay0State } from "../../components/workspaces/travel/rose-trial/day-0/types";
import type {
  PlannedTrialRecord,
  PlannedTreatment,
  ActualTrialRecord,
  ActualTreatment,
  ActualTrialUnit,
  TrialIdentity,
  DomainRecordMetadata,
} from "./types";

const DEFAULT_TRIAL_NAME = "Rose Rooting Trial #1 — ทดลองปักชำกุหลาบ";
const VALID_UNIT_STATUSES = new Set(["active", "failed", "removed", "completed"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeIdentityPart(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeCode(value: unknown, fallback: string): string {
  const normalized = safeString(value).normalize("NFC").trim().replace(/\s+/g, " ");
  return normalized || fallback;
}

export function normalizeNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function normalizeVersion(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 1
    ? value
    : 1;
}

function getValidTimestampOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(trimmed);
  if (!match || Number.isNaN(Date.parse(trimmed))) return null;
  const [, year, month, day] = match;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    calendarDate.getUTCFullYear() !== Number(year) ||
    calendarDate.getUTCMonth() !== Number(month) - 1 ||
    calendarDate.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return trimmed;
}

function hasDuplicateCodes(codes: string[]): boolean {
  const seen = new Set<string>();
  for (const code of codes) {
    const key = normalizeIdentityPart(code);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

// ─── Stable Identity Helper ──────────────────────────────────────────────────

/**
 * คำนวณรหัส ID สำหรับการทดลองแบบ Deterministic จาก Title และ Batch Name
 * เพื่อป้องกันไม่ให้เกิดความคลาดเคลื่อนหรือเปลี่ยนค่าทุกครั้งที่ทำการเรนเดอร์ UI
 */
export function createRoseTrialRecordId(
  title: string,
  batchName: string,
  mode: "planned" | "actual"
): string {
  const cleanTitle = normalizeIdentityPart(title);
  const cleanBatch = normalizeIdentityPart(batchName);
  const content = `${cleanTitle}|${cleanBatch}`;

  // FNV-1a 32-bit stable hash implementation
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const hexHash = hash.toString(16).padStart(8, "0");
  return `rose-cutting:${mode}:${hexHash}`;
}

// ─── Date Validation Helper ──────────────────────────────────────────────────

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getValidDateOrNull(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!DATE_REGEX.test(trimmed)) return null;

  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  ) {
    return trimmed;
  }
  return null;
}

// ─── Preparation to Planned Record Adapter ────────────────────────────────────

export function mapRosePreparationToPlannedRecord(
  state: RoseTrialState | null | undefined
): PlannedTrialRecord | null {
  if (!state || !isRecord(state.pilot)) {
    return null;
  }

  const title = safeString(state.pilot.trialName).trim();
  const rawBatch: Record<string, unknown> = isRecord(state.batch) ? state.batch : {};
  const batchName = safeString(rawBatch.batchName).trim();
  const plannedUnitCount = normalizeNonNegativeInteger(rawBatch.totalCuttings);
  const rawTreatments: unknown[] = Array.isArray(state.treatments) ? state.treatments : [];
  const hasMeaningfulTreatment = rawTreatments.some((t) =>
    isRecord(t) &&
    (normalizeNonNegativeInteger(t.cuttingCount) > 0 || safeString(t.source) === "user")
  );
  const hasMeaningfulData = Boolean(
    (title && title !== DEFAULT_TRIAL_NAME) ||
    batchName ||
    plannedUnitCount > 0 ||
    hasMeaningfulTreatment ||
    getValidTimestampOrNull(state.updatedAt)
  );

  if (!title || !hasMeaningfulData) return null;
  
  // Create stable ID
  const recordId = createRoseTrialRecordId(title, batchName, "planned");
  
  const plannedStartDate = getValidDateOrNull(safeString(rawBatch.plannedStartDate));
  const dataIssues: string[] = [];
  const plannedTreatments: PlannedTreatment[] = [];

  rawTreatments.forEach((value, index) => {
    if (!isRecord(value)) {
      dataIssues.push("malformed_treatment");
      return;
    }
    const fallbackCode = `T-${String(index + 1).padStart(2, "0")}`;
    const code = normalizeCode(value.code, fallbackCode);
    if (!safeString(value.code).trim()) dataIssues.push("missing_treatment_code");
    plannedTreatments.push({
      id: safeString(value.id).trim() || `tr-${code}`,
      code,
      name: safeString(value.name).trim() || "กลุ่มทดสอบนิรนาม",
      description: safeString(value.description),
      plannedUnitCount: normalizeNonNegativeInteger(value.cuttingCount),
      plannedInputName: safeString(value.inputName).trim() || "ไม่ได้ระบุ",
      notes: safeString(value.notes),
    });
  });

  if (hasDuplicateCodes(plannedTreatments.map((t) => t.code))) {
    dataIssues.push("duplicate_treatment_code");
  }

  const checklist = Array.isArray(state.checklistItems) ? state.checklistItems : [];
  const criticalMissing = checklist.some((item) =>
    isRecord(item) && item.isCritical === true && item.status !== "ready" && item.status !== "not_needed"
  );
  const optionalPending = checklist.some((item) =>
    isRecord(item) && item.isCritical === false && item.status !== "ready" && item.status !== "not_needed"
  );
  const assignedCount = plannedTreatments.reduce((sum, treatment) => sum + treatment.plannedUnitCount, 0);
  const readinessValid = Boolean(
    safeString(state.pilot.goal).trim() &&
    batchName &&
    plannedUnitCount > 0 &&
    assignedCount === plannedUnitCount &&
    plannedTreatments.length > 0 &&
    !criticalMissing &&
    dataIssues.length === 0
  );
  const status = readinessValid ? (optionalPending ? "partial" : "ready") : "draft";

  const identity: TrialIdentity = {
    trialId: recordId,
    plantId: null,
    cropId: "rose",
    trialType: "cutting",
    title,
  };

  const metadata: DomainRecordMetadata & { mode: "planned" } = {
    id: recordId,
    trialId: recordId,
    mode: "planned",
    version: normalizeVersion(state.version),
    status,
    createdAt: null,
    updatedAt: getValidTimestampOrNull(state.updatedAt),
    completedAt: null,
    source: {
      sourceMode: "none",
      sourceRecordId: null,
      sourceVersion: null,
      snapshotCreatedAt: null,
    },
  };

  return {
    metadata,
    identity,
    plannedStartDate,
    plannedBatch: {
      batchName: batchName || "B1",
      plannedUnitCount,
    },
    plannedTreatments,
    objectives: safeString(state.pilot.goal).trim() ? [safeString(state.pilot.goal)] : [],
    notes: [safeString(state.pilot.notes), safeString(rawBatch.notes)].filter(Boolean).join("\n"),
    dataIssues,
  };
}

// ─── Day 0 to Actual Record Adapter ───────────────────────────────────────────

export function mapRoseDay0ToActualRecord(
  day0State: RoseDay0State | null | undefined
): ActualTrialRecord | null {
  if (!day0State || !isRecord(day0State.trialSnapshot)) {
    return null;
  }

  const snapshot = day0State.trialSnapshot;
  const title = safeString(snapshot.trialName).trim();
  if (!title) return null;
  const snapshotBatchName = safeString(snapshot.batchName).trim();
  const batchName = snapshotBatchName || "B1";

  // Create stable ID
  const recordId = createRoseTrialRecordId(title, batchName, "actual");
  
  // Resolve planned reference
  const hasSnapshotSourceIdentity = Boolean(snapshotBatchName);
  const resolvedPlannedId = hasSnapshotSourceIdentity
    ? createRoseTrialRecordId(title, snapshotBatchName, "planned")
    : null;

  const startInfo: Record<string, unknown> = isRecord(day0State.startInfo) ? day0State.startInfo : {};
  const cuttingSetup: Record<string, unknown> = isRecord(day0State.cuttingSetup) ? day0State.cuttingSetup : {};
  const actualStartDate = getValidDateOrNull(safeString(startInfo.actualStartDate));
  const actualUnitCount = normalizeNonNegativeInteger(cuttingSetup.actualCuttingCount);
  const dataIssues: string[] = [];

  // Map treatments from state
  const snapshotTreatments: unknown[] = Array.isArray(snapshot.treatments) ? snapshot.treatments : [];
  const rawActualTreatments: unknown[] = Array.isArray(day0State.treatments) ? day0State.treatments : [];
  if (!Array.isArray(day0State.treatments)) dataIssues.push("malformed_treatments");
  const actualTreatments: ActualTreatment[] = [];

  rawActualTreatments.forEach((value, index) => {
    if (!isRecord(value)) {
      dataIssues.push("malformed_treatment");
      return;
    }
    const fallbackCode = `T-${String(index + 1).padStart(2, "0")}`;
    const code = normalizeCode(value.code, fallbackCode);
    const matchedPlanned = snapshotTreatments.find(
      (item) => isRecord(item) && normalizeIdentityPart(safeString(item.code)) === normalizeIdentityPart(code)
    );
    if (!safeString(value.code).trim()) dataIssues.push("missing_treatment_code");
    actualTreatments.push({
      id: safeString(value.id).trim() || `tr-${code}`,
      sourcePlannedTreatmentId: isRecord(matchedPlanned)
        ? `tr-${normalizeCode(matchedPlanned.code, code)}`
        : null,
      code,
      name: safeString(value.name).trim() || "กลุ่มทดลองจริงนิรนาม",
      description: safeString(value.description),
      actualUnitCount: normalizeNonNegativeInteger(value.cuttingCount),
      actualInputName: safeString(value.inputName).trim() || "ไม่ได้ระบุ",
      notes: safeString(value.notes),
    });
  });

  if (hasDuplicateCodes(actualTreatments.map((t) => t.code))) {
    dataIssues.push("duplicate_treatment_code");
  }

  // Map trial units
  const rawTrialUnits: unknown[] = Array.isArray(day0State.trialUnits) ? day0State.trialUnits : [];
  if (!Array.isArray(day0State.trialUnits)) dataIssues.push("malformed_trial_units");
  const usedUnitIds = new Set<string>();
  const trialUnits: ActualTrialUnit[] = [];

  rawTrialUnits.forEach((value, index) => {
    if (!isRecord(value)) {
      dataIssues.push("malformed_trial_unit");
      return;
    }
    const sourceId = safeString(value.id).trim();
    let id = sourceId || `unit-${String(index + 1).padStart(2, "0")}`;
    if (usedUnitIds.has(id)) {
      dataIssues.push("duplicate_trial_unit_id");
      id = `unit-${String(index + 1).padStart(2, "0")}`;
    }
    usedUnitIds.add(id);
    const sourceStatus = safeString(value.status);
    if (sourceStatus && !VALID_UNIT_STATUSES.has(sourceStatus)) {
      dataIssues.push("invalid_trial_unit_status");
    }
    const status = VALID_UNIT_STATUSES.has(sourceStatus)
      ? sourceStatus as ActualTrialUnit["status"]
      : "active";
    trialUnits.push({
      id,
      treatmentId: safeString(value.treatmentId),
      unitCode: safeString(value.unitCode).trim() || id,
      unitType: "cutting",
      containerCode: safeString(value.containerCode).trim() || "ไม่ได้ระบุ",
      initialCondition: safeString(value.initialCondition).trim() || "ปกติ",
      notes: safeString(value.notes),
      status,
    });
  });

  const identity: TrialIdentity = {
    trialId: recordId,
    plantId: null,
    cropId: "rose",
    trialType: "cutting",
    title,
  };

  const metadata: DomainRecordMetadata & { mode: "actual" } = {
    id: recordId,
    trialId: recordId,
    mode: "actual",
    version: normalizeVersion(day0State.version),
    status: day0State.status === "completed" ? "completed" : "draft",
    createdAt: getValidTimestampOrNull(day0State.createdAt),
    updatedAt: getValidTimestampOrNull(day0State.updatedAt),
    completedAt: getValidTimestampOrNull(day0State.completedAt),
    source: {
      sourceMode: hasSnapshotSourceIdentity ? "planned" : "none",
      sourceRecordId: resolvedPlannedId,
      sourceVersion: hasSnapshotSourceIdentity ? 1 : null,
      snapshotCreatedAt: getValidTimestampOrNull(snapshot.sourceUpdatedAt),
    },
  };

  const day0Observation = {
    directObservation: isRecord(day0State.observation) ? safeString(day0State.observation.directObservation) : "",
    interpretation: isRecord(day0State.observation) ? safeString(day0State.observation.interpretation) : "",
    uncertainty: isRecord(day0State.observation) ? safeString(day0State.observation.uncertainty) : "",
  };

  return {
    metadata,
    identity,
    actualStartDate,
    actualBatch: {
      batchName,
      actualUnitCount,
    },
    actualTreatments,
    trialUnits,
    day0Observation,
    deviationCount: Array.isArray(day0State.deviations)
      ? day0State.deviations.filter(isRecord).length
      : 0,
    dataIssues,
  };
}
