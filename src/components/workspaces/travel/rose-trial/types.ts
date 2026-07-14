// GF-APP-075 / GF-APP-081G1A — Rose Trial Lab preparation contracts

export type ChecklistStatus =
  | "have"
  | "to_buy"
  | "ordered"
  | "received"
  | "ready"
  | "not_needed";

export type ChecklistCategory =
  | "equipment"
  | "propagation_medium"
  | "container"
  | "humidity_system"
  | "treatment_input"
  | "sanitation"
  | "label_and_record"
  | "trial_area";

export type TrialStatus = "planning" | "ready" | "active" | "completed" | "archived";

export type ReadinessLevel = "not_ready" | "partially_ready" | "ready_for_day0";
export type PilotReadinessStatus = ReadinessLevel;

export interface PilotOverview {
  trialName: string;
  cropName: string;
  goal: string;
  location: string;
  expectedStartDate: string;
  notes: string;
}

export interface BatchSetup {
  batchName: string;
  totalCuttings: number;
  plannedStartDate: string;
  notes: string;
}

export interface PreparationChecklistItem {
  id: string;
  name: string;
  category: ChecklistCategory;
  isCritical: boolean;
  requiredQuantity: number | null;
  unit: string;
  status: ChecklistStatus;
  notes: string;
  source: "default" | "user";
}

export interface Treatment {
  id: string;
  code: string;
  name: string;
  description: string;
  cuttingCount: number;
  inputName: string;
  notes: string;
  source: "default" | "user";
}

export type RootingMedium = "water" | "peat_moss";
export type TreatmentRole = "control" | "treatment";

export interface PilotGroupConfig {
  id: string;
  medium: RootingMedium;
  treatmentRole: TreatmentRole;
  treatmentCode: "T0" | "T1";
  replicateCount: number;
  locked: boolean;
}

export type InventoryCategory =
  | "plant_material"
  | "container"
  | "growing_medium"
  | "treatment_product"
  | "equipment"
  | "labeling"
  | "sanitation"
  | "trial_area";
export type InventoryStatus = "procure" | "available" | "ready" | "not_needed";
export type InventoryPriority = "A" | "B";

export interface InventoryItem {
  id: string;
  category: InventoryCategory;
  name: string;
  requiredQuantity: number;
  availableQuantity: number;
  usableQuantity: number;
  unit: string;
  status: InventoryStatus;
  priority: InventoryPriority;
  note: string;
  lastCheckedAt: string | null;
}

export type TreatmentProductStatus =
  | "not_selected"
  | "selected"
  | "ordered"
  | "received"
  | "ready_to_use";
export type TreatmentProductPackaging = "original" | "repacked" | "repacked_unknown" | "unknown";

export interface TreatmentProductRecord {
  productName: string;
  brand: string;
  productType: string;
  form: string;
  activeIngredient: string;
  seller: string;
  productUrl: string;
  packagingType: TreatmentProductPackaging;
  status: TreatmentProductStatus;
  purchasedSize: string;
  purchasePrice: number | null;
  purchaseDate: string;
  receivedDate: string;
  openedDate: string;
  expiryNote: string;
  storageNote: string;
  appearanceNote: string;
  applicationMethod: string;
  limitationNote: string;
}

export interface SamplePhotoChecklist {
  wholeCutting: boolean;
  basalCut: boolean;
  sampleLabel: boolean;
}

export interface SampleBaseline {
  sampleLabel?: string;
  source: string;
  motherPlantId: string;
  cuttingPosition: string;
  cuttingDate: string;
  cuttingTime: string;
  length: string;
  stemDiameter: string;
  nodeCount: string;
  leafCount: string;
  stemMaturity: string;
  initialCondition: string;
  stemColor: string;
  basalCutAppearance: string;
  existingDamage: string;
  note: string;
  photoChecklist: SamplePhotoChecklist;
}

export type SampleInitialCondition = "normal" | "observe" | "unsuitable";

export type TrialSampleStatus = "pending" | "ready" | "excluded" | "replaced";

export interface TrialSample {
  id: string;
  groupId: string;
  medium: RootingMedium;
  treatmentRole: TreatmentRole;
  treatmentCode: string;
  replicate: number;
  status: TrialSampleStatus;
  baseline: SampleBaseline;
  replacementFor: string | null;
  excludedReason: string;
}

export type Day0WorkflowStepId =
  | "workspace_preparation"
  | "container_labeling"
  | "water_preparation"
  | "peat_preparation"
  | "tool_cleaning"
  | "sample_recording"
  | "allocation_confirmation"
  | "control_preparation"
  | "clonex_preparation"
  | "clonex_application"
  | "sample_placement"
  | "day0_evidence"
  | "trial_placement"
  | "final_confirmation";

export interface Day0WorkflowStepState {
  id: Day0WorkflowStepId;
  completed: boolean;
  completedAt: string | null;
}

export interface Day0WorkflowState {
  steps: Day0WorkflowStepState[];
}

export interface PilotStartRecord {
  started: boolean;
  startedAt: string | null;
  startConfirmation: boolean;
  lockedGroupSnapshot: PilotGroupConfig[];
  lockedSampleIds: string[];
}

export interface RoseTrialStateV1 {
  version: 1;
  pilot: PilotOverview;
  batch: BatchSetup;
  checklistItems: PreparationChecklistItem[];
  treatments: Treatment[];
  updatedAt: string | null;
}

export interface RoseTrialStateV2 {
  version: 2;
  pilot: PilotOverview;
  batch: BatchSetup;
  checklistItems: PreparationChecklistItem[];
  treatments: Treatment[];
  groupConfig: PilotGroupConfig[];
  inventory: InventoryItem[];
  treatmentProduct: TreatmentProductRecord;
  samples: TrialSample[];
  day0Workflow: Day0WorkflowState;
  pilotStart: PilotStartRecord;
  updatedAt: string | null;
}

export type RoseTrialState = RoseTrialStateV1 | RoseTrialStateV2;

export type RoseTrialLoadStatus = "empty" | "valid" | "migrated" | "corrupt" | "unsupported";

export interface RoseTrialLoadResult {
  state: RoseTrialStateV2;
  status: RoseTrialLoadStatus;
  issue?: string;
}

export type ReadinessSectionStatus = "ready" | "pending" | "blocked" | "warning";

export interface PilotReadinessSections {
  pilot: ReadinessSectionStatus;
  batchAllocation: ReadinessSectionStatus;
  preparationChecklist: ReadinessSectionStatus;
  inventory: ReadinessSectionStatus;
  treatmentProduct: ReadinessSectionStatus;
  samples: ReadinessSectionStatus;
  day0Workflow: ReadinessSectionStatus;
}

export interface ReadinessResult {
  status: PilotReadinessStatus;
  canStart: boolean;
  blockers: string[];
  warnings: string[];
  sections: PilotReadinessSections;
  totalItems: number;
  readyItems: number;
  criticalMissingItems: PreparationChecklistItem[];
  optionalPendingItems: PreparationChecklistItem[];
  totalCuttings: number;
  assignedCuttings: number;
  cuttingDifference: number;
  reasons: string[];
}
