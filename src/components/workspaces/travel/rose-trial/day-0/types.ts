// GF-APP-075 — Rose Trial Day 0 Types

export type Day0Status = "draft" | "completed";

export interface Day0TreatmentSnapshot {
  code: string;
  name: string;
  description: string;
  cuttingCount: number;
  inputName: string;
  notes: string;
}

export interface Treatment {
  id: string;
  code: string;
  name: string;
  description: string;
  cuttingCount: number;
  inputName: string;
  notes: string;
  source: string;
}

export interface Day0Batch {
  batchName: string;
}

export interface Day0TrialSnapshot {
  trialName: string;
  cropName: string;
  goal: string;
  batchName: string;
  plannedStartDate: string;
  totalCuttings: number;
  treatments: Day0TreatmentSnapshot[];
  readinessStatus: string;
  sourceUpdatedAt: string | null;
}

export interface Day0StartInfo {
  actualStartDate: string; // YYYY-MM-DD
  actualStartTime: string; // HH:MM
  operatorName: string;
  location: string;
  weatherInfo: string;
  notes: string;
}

export interface SourcePlantRecord {
  sourcePlantId: string;
  cultivarName: string;
  isUnknownCultivar: boolean;
  sourceOrigin: string;
  estimatedAge: string;
  overallHealth: string;
  observedPestsOrDiseases: string;
  lastFertilizedDate: string;
  lastSprayedDate: string;
  notes: string;
}

export interface CuttingSetup {
  actualCuttingCount: number;
  cuttingTypeDescription: string;
  targetLengthCm: string;
  targetNodeCount: string;
  remainingLeafCount: string;
  isBudsOrFlowersRemoved: boolean;
  basePreparationMethod: string;
  notes: string;
}

export interface PropagationSetup {
  mediumName: string;
  mediumIngredients: string;
  mediumRatio: string;
  mediumPreparation: string;
  initialMediumMoisture: string;
  notes: string;
  containerType: string;
  containerQuantity: number | null;
  containerSize: string;
  hasDrainageHoles: boolean;
  isOneCuttingPerContainer: boolean;
  waterSource: string;
  waterPh: string;
  waterEc: string;
  waterTemp: string;
  waterNotes: string;
  humiditySystemType: string; // dome, box, bag, mist, other
  humidityVentType: string;
  humidityVentMethod: string;
}

export interface Day0Environment {
  isIndoor: boolean; // Indoor / Outdoor / Semi-shade
  lightIntensityEstimate: string;
  hasDirectSunlight: boolean;
  temperatureCelsius: string;
  relativeHumidityPercent: string;
  windConditions: string;
  rainConditions: string;
  rainProtection: string;
  notes: string;
}

export interface TrialUnit {
  id: string; // ROSE-B1-T0-01
  treatmentId: string;
  treatmentCode: string;
  sequenceNumber: number;
  label: string;
  containerCode: string;
  initialCondition: string;
  notes: string;
}

export interface Day0Deviation {
  id: string;
  area: string;
  plannedValue: string;
  actualValue: string;
  reason: string;
  possibleImpact: string;
  notes: string;
}

export interface Day0Observation {
  directObservation: string;
  interpretation: string;
  uncertainty: string;
}

export interface RoseDay0State {
  version: number;
  trialSnapshot: Day0TrialSnapshot;
  startInfo: Day0StartInfo;
  sourcePlant: SourcePlantRecord;
  cuttingSetup: CuttingSetup;
  propagationSetup: PropagationSetup;
  environment: Day0Environment;
  trialUnits: TrialUnit[];
  treatments: Treatment[];
  batch: Day0Batch;
  deviations: Day0Deviation[];
  observation: Day0Observation;
  notes: string;
  status: Day0Status;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}
