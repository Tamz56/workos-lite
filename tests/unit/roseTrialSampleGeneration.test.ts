import { describe, expect, it } from "vitest";
import { createDefaultPilotGroupConfig } from "@/components/workspaces/travel/rose-trial/defaults";
import {
  createDefaultSampleBaseline,
  generateTrialSamples,
} from "@/components/workspaces/travel/rose-trial/sampleGeneration";
import type { TrialSample } from "@/components/workspaces/travel/rose-trial/types";

const EXPECTED_IDS = [
  "W-T0-01", "W-T0-02", "W-T1-01", "W-T1-02",
  "P-T0-01", "P-T0-02", "P-T1-01", "P-T1-02",
];

describe("Rose Trial sample generation", () => {
  it("generates the exact eight canonical sample IDs in stable order", () => {
    const samples = generateTrialSamples(createDefaultPilotGroupConfig());

    expect(samples.map((sample) => sample.id)).toEqual(EXPECTED_IDS);
    expect(new Set(samples.map((sample) => sample.id)).size).toBe(8);
    expect(generateTrialSamples(createDefaultPilotGroupConfig())).toEqual(samples);
  });

  it("preserves user data by ID while canonical identity overrides saved identity", () => {
    const existing: TrialSample = {
      ...generateTrialSamples(createDefaultPilotGroupConfig())[0],
      groupId: "corrupt-group",
      medium: "peat_moss",
      treatmentRole: "treatment",
      treatmentCode: "BROKEN",
      replicate: 99,
      status: "ready",
      baseline: {
        ...createDefaultSampleBaseline(),
        motherPlantId: "แม่พันธุ์-ไทย-01",
        note: "เก็บข้อมูลนี้ไว้",
        photoChecklist: { wholeCutting: true, basalCut: false, sampleLabel: true },
      },
      excludedReason: "เหตุผลเดิม",
    };

    const [sample] = generateTrialSamples(createDefaultPilotGroupConfig(), [existing]);

    expect(sample).toMatchObject({
      id: "W-T0-01",
      groupId: "W-T0",
      medium: "water",
      treatmentRole: "control",
      treatmentCode: "T0",
      replicate: 1,
      status: "ready",
      excludedReason: "เหตุผลเดิม",
    });
    expect(sample.baseline.motherPlantId).toBe("แม่พันธุ์-ไทย-01");
    expect(sample.baseline.photoChecklist.wholeCutting).toBe(true);
  });

  it("does not mutate inputs, fills missing samples, and retains unknown samples visibly", () => {
    const groups = createDefaultPilotGroupConfig();
    const canonical = generateTrialSamples(groups);
    const unknown: TrialSample = { ...canonical[0], id: "LEGACY-UNKNOWN", groupId: "legacy" };
    const existing = [canonical[2], unknown];
    const snapshot = structuredClone(existing);

    const output = generateTrialSamples(groups, existing);

    expect(existing).toEqual(snapshot);
    expect(output.slice(0, 8).map((sample) => sample.id)).toEqual(EXPECTED_IDS);
    expect(output.at(-1)?.id).toBe("LEGACY-UNKNOWN");
  });
});
