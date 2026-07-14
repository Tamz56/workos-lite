import {
  createDefaultDay0Workflow,
  createDefaultInventory,
  createDefaultPilotGroupConfig,
  createDefaultPilotStartRecord,
  createDefaultRoseTrialState,
  createDefaultTreatmentProduct,
} from "./defaults";
import { generateTrialSamples } from "./sampleGeneration";
import type {
  ChecklistCategory,
  ChecklistStatus,
  Day0WorkflowStepId,
  InventoryCategory,
  InventoryPriority,
  InventoryStatus,
  RoseTrialStateV2,
  RoseTrialStateV1,
  RootingMedium,
  TreatmentProductPackaging,
  TreatmentProductStatus,
  TreatmentRole,
  TrialSampleStatus,
} from "./types";

const CHECKLIST_CATEGORIES: readonly ChecklistCategory[] = [
  "equipment", "propagation_medium", "container", "humidity_system",
  "treatment_input", "sanitation", "label_and_record", "trial_area",
];
const CHECKLIST_STATUSES: readonly ChecklistStatus[] = [
  "have", "to_buy", "ordered", "received", "ready", "not_needed",
];
const INVENTORY_CATEGORIES: readonly InventoryCategory[] = [
  "plant_material", "container", "growing_medium", "treatment_product",
  "equipment", "labeling", "sanitation", "trial_area",
];
const INVENTORY_STATUSES: readonly InventoryStatus[] = ["procure", "available", "ready", "not_needed"];
const INVENTORY_PRIORITIES: readonly InventoryPriority[] = ["A", "B"];
const ROOTING_MEDIA: readonly RootingMedium[] = ["water", "peat_moss"];
const TREATMENT_ROLES: readonly TreatmentRole[] = ["control", "treatment"];
const PRODUCT_PACKAGING: readonly TreatmentProductPackaging[] = ["original", "repacked", "repacked_unknown", "unknown"];
const PRODUCT_STATUSES: readonly TreatmentProductStatus[] = ["not_selected", "selected", "ordered", "received", "ready_to_use"];
const SAMPLE_STATUSES: readonly TrialSampleStatus[] = ["pending", "ready", "excluded", "replaced"];
const WORKFLOW_STEP_IDS: readonly Day0WorkflowStepId[] = [
  "workspace_preparation", "container_labeling", "water_preparation", "peat_preparation",
  "tool_cleaning", "sample_recording", "allocation_confirmation", "control_preparation",
  "clonex_preparation", "clonex_application", "sample_placement", "day0_evidence",
  "trial_placement", "final_confirmation",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isValidPilot(value: unknown): boolean {
  return isRecord(value) && isString(value.trialName) && isString(value.cropName) &&
    isString(value.goal) && isString(value.location) && isString(value.expectedStartDate) &&
    isString(value.notes);
}

function isValidBatch(value: unknown): boolean {
  return isRecord(value) && isString(value.batchName) && isFiniteNonNegativeInteger(value.totalCuttings) &&
    isString(value.plannedStartDate) && isString(value.notes);
}

function isValidChecklistItem(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && value.id.trim().length > 0 && isString(value.name) &&
    isOneOf(value.category, CHECKLIST_CATEGORIES) && typeof value.isCritical === "boolean" &&
    (value.requiredQuantity === null || isFiniteNonNegativeNumber(value.requiredQuantity)) &&
    isString(value.unit) && isOneOf(value.status, CHECKLIST_STATUSES) && isString(value.notes) &&
    (value.source === "default" || value.source === "user");
}

function isValidTreatment(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && value.id.trim().length > 0 && isString(value.code) &&
    isString(value.name) && isString(value.description) && isFiniteNonNegativeInteger(value.cuttingCount) &&
    isString(value.inputName) && isString(value.notes) &&
    (value.source === "default" || value.source === "user");
}

function hasValidLegacyCore(value: Record<string, unknown>): boolean {
  return isValidPilot(value.pilot) && isValidBatch(value.batch) &&
    Array.isArray(value.checklistItems) && value.checklistItems.every(isValidChecklistItem) &&
    Array.isArray(value.treatments) && value.treatments.every(isValidTreatment) &&
    isNullableString(value.updatedAt);
}

export function isRoseTrialStateV1(value: unknown): value is RoseTrialStateV1 {
  return isRecord(value) && value.version === 1 && hasValidLegacyCore(value);
}

function isValidGroup(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isOneOf(value.medium, ROOTING_MEDIA) &&
    isOneOf(value.treatmentRole, TREATMENT_ROLES) && (value.treatmentCode === "T0" || value.treatmentCode === "T1") &&
    isFiniteNonNegativeInteger(value.replicateCount) && value.replicateCount > 0 && value.locked === true;
}

function hasUniqueStringField(values: unknown[], field: string): boolean {
  const strings = values
    .filter(isRecord)
    .map((value) => value[field])
    .filter(isString);
  return strings.length === values.length && new Set(strings).size === strings.length;
}

function isValidCanonicalGroupConfig(value: unknown): boolean {
  if (!Array.isArray(value) || !value.every(isValidGroup) || !hasUniqueStringField(value, "id")) {
    return false;
  }
  const canonical = createDefaultPilotGroupConfig();
  return value.length === canonical.length && value.every((group, index) => {
    const expected = canonical[index];
    return isRecord(group) && group.id === expected.id && group.medium === expected.medium &&
      group.treatmentRole === expected.treatmentRole && group.treatmentCode === expected.treatmentCode &&
      group.replicateCount === expected.replicateCount && group.locked === true;
  });
}

function isValidInventoryItem(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isOneOf(value.category, INVENTORY_CATEGORIES) &&
    isString(value.name) && isFiniteNonNegativeNumber(value.requiredQuantity) &&
    isFiniteNonNegativeNumber(value.availableQuantity) && isFiniteNonNegativeNumber(value.usableQuantity) &&
    isString(value.unit) && isOneOf(value.status, INVENTORY_STATUSES) &&
    isOneOf(value.priority, INVENTORY_PRIORITIES) && isString(value.note) && isNullableString(value.lastCheckedAt);
}

function isValidTreatmentProduct(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const stringFields = [
    "productName", "brand", "productType", "form", "activeIngredient", "seller", "productUrl",
    "purchasedSize", "purchaseDate", "receivedDate", "openedDate", "expiryNote", "storageNote",
    "appearanceNote", "applicationMethod", "limitationNote",
  ];
  return stringFields.every((field) => isString(value[field])) &&
    isOneOf(value.packagingType, PRODUCT_PACKAGING) && isOneOf(value.status, PRODUCT_STATUSES) &&
    (value.purchasePrice === null || isFiniteNonNegativeNumber(value.purchasePrice));
}

function isValidBaseline(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.photoChecklist)) return false;
  const stringFields = [
    "source", "motherPlantId", "cuttingPosition", "cuttingDate", "cuttingTime", "length",
    "stemDiameter", "nodeCount", "leafCount", "stemMaturity", "initialCondition", "stemColor",
    "basalCutAppearance", "existingDamage", "note",
  ];
  return stringFields.every((field) => isString(value[field])) &&
    typeof value.photoChecklist.wholeCutting === "boolean" &&
    typeof value.photoChecklist.basalCut === "boolean" &&
    typeof value.photoChecklist.sampleLabel === "boolean";
}

function isValidSample(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.groupId) &&
    isOneOf(value.medium, ROOTING_MEDIA) && isOneOf(value.treatmentRole, TREATMENT_ROLES) &&
    isString(value.treatmentCode) && isFiniteNonNegativeInteger(value.replicate) && value.replicate > 0 &&
    isOneOf(value.status, SAMPLE_STATUSES) && isValidBaseline(value.baseline) &&
    isNullableString(value.replacementFor) && isString(value.excludedReason);
}

function isValidWorkflow(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.steps) ||
    value.steps.length !== WORKFLOW_STEP_IDS.length || !hasUniqueStringField(value.steps, "id")) {
    return false;
  }
  return value.steps.every((step, index) =>
    isRecord(step) && step.id === WORKFLOW_STEP_IDS[index] && typeof step.completed === "boolean" &&
    isNullableString(step.completedAt)
  );
}

function isValidPilotStart(value: unknown): boolean {
  return isRecord(value) && typeof value.started === "boolean" && isNullableString(value.startedAt) &&
    typeof value.startConfirmation === "boolean" && Array.isArray(value.lockedGroupSnapshot) &&
    value.lockedGroupSnapshot.every(isValidGroup) && Array.isArray(value.lockedSampleIds) &&
    value.lockedSampleIds.every(isString);
}

export function isRoseTrialStateV2(value: unknown): value is RoseTrialStateV2 {
  return isRecord(value) && value.version === 2 && hasValidLegacyCore(value) &&
    isValidCanonicalGroupConfig(value.groupConfig) && Array.isArray(value.inventory) &&
    value.inventory.every(isValidInventoryItem) && hasUniqueStringField(value.inventory, "id") &&
    isValidTreatmentProduct(value.treatmentProduct) && Array.isArray(value.samples) &&
    value.samples.every(isValidSample) && hasUniqueStringField(value.samples, "id") &&
    isValidWorkflow(value.day0Workflow) &&
    isValidPilotStart(value.pilotStart);
}

export interface RoseTrialMigrationResult {
  state: RoseTrialStateV2;
  issues: string[];
}

export function migrateRoseTrialStateV1(source: RoseTrialStateV1): RoseTrialMigrationResult {
  const defaults = createDefaultRoseTrialState();
  const groupConfig = createDefaultPilotGroupConfig();
  const issues = source.batch.totalCuttings !== groupConfig.reduce((sum, group) => sum + group.replicateCount, 0)
    ? ["จำนวนกิ่งเดิมไม่ตรงกับ Sample เริ่มต้น 8 รายการ; ระบบรักษาจำนวนกิ่งเดิมไว้"]
    : [];

  return {
    state: {
      ...defaults,
      version: 2,
      pilot: { ...source.pilot },
      batch: { ...source.batch },
      checklistItems: source.checklistItems.map((item) => ({ ...item })),
      treatments: source.treatments.map((treatment) => ({ ...treatment })),
      groupConfig,
      inventory: createDefaultInventory(),
      treatmentProduct: createDefaultTreatmentProduct(),
      samples: generateTrialSamples(groupConfig),
      day0Workflow: createDefaultDay0Workflow(),
      pilotStart: createDefaultPilotStartRecord(),
      updatedAt: source.updatedAt,
    },
    issues,
  };
}
