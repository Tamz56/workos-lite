import type {
  RoseTrialObservation,
  RoseTrialObservationScope,
  RoseTrialObservationStatus,
  RoseTrialObservationType,
  RoseTrialObservationValidationContext,
} from "./observationTypes";

export interface RoseTrialObservationFilters {
  batchId?: string;
  scope?: RoseTrialObservationScope;
  treatmentId?: string;
  sampleId?: string;
  type?: RoseTrialObservationType;
  status?: RoseTrialObservationStatus;
  withPhotos?: boolean;
  followUpRequired?: boolean;
}

function compareNewestFirst(left: RoseTrialObservation, right: RoseTrialObservation): number {
  const observedDifference = Date.parse(right.observedAt) - Date.parse(left.observedAt);
  if (observedDifference !== 0) return observedDifference;

  const createdDifference = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (createdDifference !== 0) return createdDifference;

  return left.id.localeCompare(right.id);
}

export function selectObservationsNewestFirst(
  observations: readonly RoseTrialObservation[]
): RoseTrialObservation[] {
  return [...observations].sort(compareNewestFirst);
}

export function selectRoseTrialObservations(
  observations: readonly RoseTrialObservation[],
  filters: RoseTrialObservationFilters = {},
  context?: RoseTrialObservationValidationContext
): RoseTrialObservation[] {
  return selectObservationsNewestFirst(observations.filter((observation) => {
    if (filters.batchId !== undefined && observation.batchId !== filters.batchId) return false;
    if (filters.scope !== undefined && observation.scope !== filters.scope) return false;
    const treatmentId = observation.treatmentId ?? (observation.sampleId
      ? context?.samples.find((sample) => sample.id === observation.sampleId)?.treatmentId
      : undefined);
    if (filters.treatmentId !== undefined && treatmentId !== filters.treatmentId) return false;
    if (filters.sampleId !== undefined && observation.sampleId !== filters.sampleId) return false;
    if (filters.type !== undefined && observation.type !== filters.type) return false;
    if (filters.status !== undefined && observation.status !== filters.status) return false;
    if (filters.withPhotos === true && observation.photoIds.length === 0) return false;
    if (filters.withPhotos === false && observation.photoIds.length > 0) return false;
    if (filters.followUpRequired !== undefined && observation.followUpRequired !== filters.followUpRequired) return false;
    return true;
  }));
}

export function groupObservationsByTrialDay(
  observations: readonly RoseTrialObservation[]
): Map<number, RoseTrialObservation[]> {
  const grouped = new Map<number, RoseTrialObservation[]>();
  for (const observation of selectObservationsNewestFirst(observations)) {
    const group = grouped.get(observation.trialDay) ?? [];
    group.push(observation);
    grouped.set(observation.trialDay, group);
  }
  return grouped;
}

export function groupObservationsBySample(
  observations: readonly RoseTrialObservation[]
): Map<string, RoseTrialObservation[]> {
  const grouped = new Map<string, RoseTrialObservation[]>();
  for (const observation of selectObservationsNewestFirst(observations)) {
    if (!observation.sampleId) continue;
    const group = grouped.get(observation.sampleId) ?? [];
    group.push(observation);
    grouped.set(observation.sampleId, group);
  }
  return grouped;
}

export function groupObservationsByTreatment(
  observations: readonly RoseTrialObservation[],
  context: RoseTrialObservationValidationContext
): Map<string, RoseTrialObservation[]> {
  const grouped = new Map<string, RoseTrialObservation[]>();
  for (const observation of selectObservationsNewestFirst(observations)) {
    const treatmentId = observation.treatmentId ?? (observation.sampleId
      ? context.samples.find((sample) => sample.id === observation.sampleId)?.treatmentId
      : undefined);
    if (!treatmentId) continue;
    const group = grouped.get(treatmentId) ?? [];
    group.push(observation);
    grouped.set(treatmentId, group);
  }
  return grouped;
}

export function selectLatestObservationForBatch(
  observations: readonly RoseTrialObservation[],
  batchId: string
): RoseTrialObservation | null {
  return selectRoseTrialObservations(observations, { batchId })[0] ?? null;
}

export function selectLatestObservationBySample(
  observations: readonly RoseTrialObservation[],
  sampleId: string
): RoseTrialObservation | null {
  return selectRoseTrialObservations(observations, { sampleId })[0] ?? null;
}

export function selectLatestObservationByTreatment(
  observations: readonly RoseTrialObservation[],
  treatmentId: string,
  context: RoseTrialObservationValidationContext
): RoseTrialObservation | null {
  return selectRoseTrialObservations(observations, { treatmentId }, context)[0] ?? null;
}
