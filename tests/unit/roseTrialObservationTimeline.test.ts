import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ObservationTimeline } from "@/components/workspaces/travel/rose-trial/ObservationTimeline";
import { selectRoseTrialObservations } from "@/components/workspaces/travel/rose-trial/observationSelectors";
import type {
  RoseTrialObservation,
  RoseTrialObservationValidationContext,
} from "@/components/workspaces/travel/rose-trial/observationTypes";

const context: RoseTrialObservationValidationContext = {
  batchId: "batch-1",
  treatments: [{ id: "treatment-1", batchId: "batch-1" }],
  samples: [{ id: "sample-1", batchId: "batch-1", treatmentId: "treatment-1" }],
};

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-1",
    batchId: "batch-1",
    trialDay: 3,
    observedAt: "2026-07-19T09:00:00.000Z",
    scope: "sample",
    treatmentId: "treatment-1",
    sampleId: "sample-1",
    type: "general_condition",
    observedFacts: "กิ่งยังเขียว",
    status: "alive",
    followUpRequired: true,
    photoIds: [],
    createdAt: "2026-07-19T09:01:00.000Z",
    updatedAt: "2026-07-19T09:01:00.000Z",
    ...overrides,
  };
}

describe("Rose Trial Observation Timeline", () => {
  it("renders all approved local filters, result count, and reset control", () => {
    const records = [observation(), observation({ id: "obs-2", scope: "batch", treatmentId: undefined, sampleId: undefined })];
    const html = renderToStaticMarkup(React.createElement(ObservationTimeline, {
      observations: records,
      warnings: [],
      validationContext: context,
      treatments: [{ id: "treatment-1", code: "T1", label: "T1 — Clonex" }],
      samples: [{ id: "sample-1", label: "กิ่ง 1", treatmentCode: "T1", treatmentId: "treatment-1" }],
    }));

    for (const label of ["ขอบเขต", "กลุ่มทดลอง", "กิ่งชำ", "ประเภท Observation", "สถานะ", "การติดตาม"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("แสดง 2 จาก 2 รายการ");
    expect(html).toContain("ล้างตัวกรอง");
  });

  it("uses unique native disclosure controls with hidden detail regions", () => {
    const html = renderToStaticMarkup(React.createElement(ObservationTimeline, {
      observations: [observation(), observation({ id: "obs-2", trialDay: 2 })],
      warnings: [],
      validationContext: context,
      treatments: [],
      samples: [],
    }));
    const controlIds = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((match) => match[1]);
    expect(controlIds).toHaveLength(2);
    expect(new Set(controlIds).size).toBe(2);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    for (const id of controlIds) expect(html).toContain(`id="${id}" hidden=""`);
  });

  it("relies on explicit selector fields and never infers follow-up from text", () => {
    const records = [
      observation({ id: "explicit", followUpRequired: true }),
      observation({ id: "text-only", observedFacts: "ยังต้องติดตาม", followUpRequired: false }),
    ];
    expect(selectRoseTrialObservations(records, { scope: "sample" })).toHaveLength(2);
    expect(selectRoseTrialObservations(records, { treatmentId: "treatment-1" }, context)).toHaveLength(2);
    expect(selectRoseTrialObservations(records, { sampleId: "sample-1" })).toHaveLength(2);
    expect(selectRoseTrialObservations(records, { type: "general_condition" })).toHaveLength(2);
    expect(selectRoseTrialObservations(records, { status: "alive" })).toHaveLength(2);
    expect(selectRoseTrialObservations(records, { followUpRequired: true }).map((item) => item.id)).toEqual(["explicit"]);
  });

  it("has no mutation or persistence control boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/ObservationTimeline.tsx"),
      "utf8"
    );
    expect(source).not.toContain("saveObservationStore");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("Math.random");
    expect(source).not.toMatch(/on(Add|Edit|Delete|Save|Upload)/);
  });
});
