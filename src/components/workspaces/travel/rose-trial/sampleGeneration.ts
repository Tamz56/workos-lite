import type {
  PilotGroupConfig,
  SampleBaseline,
  TrialSample,
} from "./types";

export function createDefaultSampleBaseline(): SampleBaseline {
  return {
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
    initialCondition: "",
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
}

function cloneBaseline(baseline: SampleBaseline): SampleBaseline {
  return {
    ...baseline,
    photoChecklist: { ...baseline.photoChecklist },
  };
}

function cloneSample(sample: TrialSample): TrialSample {
  return {
    ...sample,
    baseline: cloneBaseline(sample.baseline),
  };
}

function createSampleId(groupId: string, replicate: number): string {
  return `${groupId}-${String(replicate).padStart(2, "0")}`;
}

/**
 * Builds samples in canonical group order. Known sample identity always comes
 * from groupConfig; persisted user-entered fields are preserved by sample ID.
 * Unknown persisted samples are retained after canonical samples, sorted by ID,
 * so a configuration change never discards user data silently.
 */
export function generateTrialSamples(
  groupConfig: readonly PilotGroupConfig[],
  existingSamples: readonly TrialSample[] = []
): TrialSample[] {
  const existingById = new Map(existingSamples.map((sample) => [sample.id, sample]));
  const canonicalIds = new Set<string>();
  const generated: TrialSample[] = [];

  for (const group of groupConfig) {
    for (let replicate = 1; replicate <= group.replicateCount; replicate += 1) {
      const id = createSampleId(group.id, replicate);
      if (canonicalIds.has(id)) {
        continue;
      }
      canonicalIds.add(id);

      const existing = existingById.get(id);
      const defaultBaseline = createDefaultSampleBaseline();
      generated.push({
        id,
        groupId: group.id,
        medium: group.medium,
        treatmentRole: group.treatmentRole,
        treatmentCode: group.treatmentCode,
        replicate,
        status: existing?.status ?? "pending",
        baseline: existing
          ? {
              ...defaultBaseline,
              ...existing.baseline,
              photoChecklist: {
                ...defaultBaseline.photoChecklist,
                ...existing.baseline.photoChecklist,
              },
            }
          : defaultBaseline,
        replacementFor: existing?.replacementFor ?? null,
        excludedReason: existing?.excludedReason ?? "",
      });
    }
  }

  const unknownSamples = existingSamples
    .filter((sample) => !canonicalIds.has(sample.id))
    .map(cloneSample)
    .sort((left, right) => left.id.localeCompare(right.id));

  return [...generated, ...unknownSamples];
}
