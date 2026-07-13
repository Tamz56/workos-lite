// GF-APP-077B — Rose Trial Domain Types

export type TrialDataMode = "planned" | "actual" | "simulated";

export interface RecordSourceReference {
  sourceMode: TrialDataMode | "none";
  sourceRecordId: string | null;
  sourceVersion: number | null;
  snapshotCreatedAt: string | null;
}

export interface DomainRecordMetadata {
  id: string;
  trialId: string;
  mode: TrialDataMode;
  version: number;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  source: RecordSourceReference;
}

export interface TrialIdentity {
  trialId: string;
  plantId: string | null;
  cropId: "rose";
  trialType: "cutting";
  title: string;
}

// ─── Planned Domain Models ────────────────────────────────────────────────────

export interface PlannedTreatment {
  id: string;
  code: string;
  name: string;
  description: string;
  plannedUnitCount: number;
  plannedInputName: string;
  notes: string;
}

export interface PlannedTrialRecord {
  metadata: DomainRecordMetadata & {
    mode: "planned";
  };
  identity: TrialIdentity;
  plannedStartDate: string | null;
  plannedBatch: {
    batchName: string;
    plannedUnitCount: number;
  };
  plannedTreatments: PlannedTreatment[];
  objectives: string[];
  notes: string;
  dataIssues: string[];
}

// ─── Actual Domain Models ─────────────────────────────────────────────────────

export interface ActualTreatment {
  id: string;
  sourcePlannedTreatmentId: string | null;
  code: string;
  name: string;
  description: string;
  actualUnitCount: number;
  actualInputName: string;
  notes: string;
}

export interface ActualTrialUnit {
  id: string;
  treatmentId: string;
  unitCode: string;
  unitType: "cutting";
  containerCode: string;
  initialCondition: string;
  notes: string;
  status: "active" | "failed" | "removed" | "completed";
}

export interface ActualObservationEvidence {
  directObservation: string;
  interpretation: string;
  uncertainty: string;
}

export interface ActualTrialRecord {
  metadata: DomainRecordMetadata & {
    mode: "actual";
  };
  identity: TrialIdentity;
  actualStartDate: string | null;
  actualBatch: {
    batchName: string;
    actualUnitCount: number;
  };
  actualTreatments: ActualTreatment[];
  trialUnits: ActualTrialUnit[];
  day0Observation: ActualObservationEvidence;
  deviationCount: number;
  dataIssues: string[];
}

// ─── Simulated Domain Models ──────────────────────────────────────────────────

export interface SimulationAvailability {
  mode: "simulated";
  available: false;
  status: "not_created";
  message: string;
}

export interface TrialModeSummary {
  mode: TrialDataMode;
  label: string;
  recordId: string | null;
  status: string;
  headline: string;
  details: Array<{
    label: string;
    value: string;
  }>;
  warnings: string[];
  href: string | null;
}
