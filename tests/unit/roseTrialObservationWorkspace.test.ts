import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ObservationWorkspaceView,
  type ObservationWorkspaceLoadState,
} from "@/components/workspaces/travel/rose-trial/ObservationWorkspace";
import type { ObservationReferenceContextResult } from "@/components/workspaces/travel/rose-trial/observationReferenceContext";
import type { RoseTrialObservation } from "@/components/workspaces/travel/rose-trial/observationTypes";

const validReference: ObservationReferenceContextResult = {
  ok: true,
  batchId: "rose-trial:2026-07-19T03:04:05.000Z",
  validationContext: {
    batchId: "rose-trial:2026-07-19T03:04:05.000Z",
    treatments: [{ id: "treatment-1", batchId: "rose-trial:2026-07-19T03:04:05.000Z" }],
    samples: [{ id: "sample-1", batchId: "rose-trial:2026-07-19T03:04:05.000Z", treatmentId: "treatment-1" }],
  },
  treatments: [{ id: "treatment-1", code: "T1", label: "T1 — Clonex" }],
  samples: [{ id: "sample-1", label: "กิ่ง 1 (sample-1)", treatmentCode: "T1", treatmentId: "treatment-1" }],
  warnings: [],
};

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-1",
    batchId: "rose-trial:2026-07-19T03:04:05.000Z",
    trialDay: 3,
    observedAt: "2026-07-19T09:00:00.000Z",
    scope: "sample",
    treatmentId: "treatment-1",
    sampleId: "sample-1",
    type: "general_condition",
    observedFacts: "กิ่งยังเขียว",
    interpretation: "ติดตามต่อโดยยังไม่สรุปสาเหตุ",
    status: "alive",
    followUpRequired: true,
    photoIds: [],
    createdAt: "2026-07-19T09:01:00.000Z",
    updatedAt: "2026-07-19T09:01:00.000Z",
    ...overrides,
  };
}

function render(referenceContext: ObservationReferenceContextResult, loadState: ObservationWorkspaceLoadState) {
  return renderToStaticMarkup(React.createElement(ObservationWorkspaceView, { referenceContext, loadState }));
}

describe("Rose Trial Observation Workspace", () => {
  it("renders a blocked state without a fabricated Batch context", () => {
    const html = render({ ok: false, reason: "pilot_not_started", message: "เริ่ม Pilot ก่อนเปิดพื้นที่บันทึกการสังเกต" }, { kind: "loading" });
    expect(html).toContain("ยังไม่เปิดพื้นที่บันทึกการสังเกต");
    expect(html).toContain("ยังไม่อ่าน Observation storage");
    expect(html).not.toContain("กำลังอ่านบันทึกการสังเกต");
  });

  it("renders loading and isolated failed states without raw payload", () => {
    expect(render(validReference, { kind: "loading" })).toContain("กำลังอ่านบันทึกการสังเกต");
    const failed = render(validReference, { kind: "failed", status: "malformed_json" });
    expect(failed).toContain("เปิดข้อมูล Observation ไม่สำเร็จ");
    expect(failed).toContain("ข้อมูลเดิมยังไม่ถูกลบ ซ่อม หรือเขียนทับ");
    expect(failed).not.toContain("{bad-json");
  });

  it("renders the empty dashboard without create controls or sample records", () => {
    const html = render(validReference, {
      kind: "empty",
      store: { version: 1, observations: [], photos: [], updatedAt: null },
      warnings: [],
    });
    expect(html).toContain("Observation ทั้งหมด");
    expect(html).toContain("ยังไม่มีบันทึกการสังเกต");
    expect(html).toContain("การเพิ่มบันทึกจะเปิดในขั้นถัดไป");
    expect(html).not.toContain("เพิ่ม Observation");
  });

  it("renders valid records and dashboard metrics", () => {
    const html = render(validReference, {
      kind: "valid",
      store: { version: 1, observations: [observation()], photos: [], updatedAt: "2026-07-19T09:01:00.000Z" },
      warnings: [],
    });
    expect(html).toContain("Timeline การสังเกต");
    expect(html).toContain("Trial Day 3");
    expect(html).toContain("ยังต้องติดตาม");
    expect(html).toContain("กิ่ง 1 (sample-1)");
  });

  it("keeps partial orphaned records visible with structured warnings", () => {
    const orphan = observation({ id: "obs-orphan", sampleId: "deleted-sample" });
    const html = render(validReference, {
      kind: "partial",
      store: { version: 1, observations: [orphan], photos: [], updatedAt: null },
      warnings: [{ field: "sampleId", code: "unknown_sample", message: "raw parser message", severity: "warning", recordId: orphan.id }],
    });
    expect(html).toContain("พบข้อมูลบางรายการที่อ่านได้ไม่สมบูรณ์ ระบบยังไม่เขียนทับข้อมูลเดิม");
    expect(html).toContain("ไม่พบกิ่งชำ (ID: deleted-sample)");
    expect(html).toContain("ไม่พบกิ่งชำที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน");
    expect(html).not.toContain("raw parser message");
  });

  it("keeps the load boundary read-only and the Setup panel mounted behind internal tabs", () => {
    const root = process.cwd();
    const workspaceSource = fs.readFileSync(path.join(root, "src/components/workspaces/travel/rose-trial/ObservationWorkspace.tsx"), "utf8");
    const clientSource = fs.readFileSync(path.join(root, "src/components/workspaces/travel/rose-trial/RoseTrialLabClient.tsx"), "utf8");

    expect(workspaceSource).toContain("loadObservationStore(referenceContext.validationContext)");
    expect(workspaceSource).not.toContain("saveObservationStore");
    expect(workspaceSource).not.toContain("localStorage");
    expect(workspaceSource).not.toContain("setItem(");
    expect(clientSource).toContain('useState<"setup" | "observations">("setup")');
    expect(clientSource).toContain('role="tablist"');
    expect(clientSource).toContain('hidden={activeWorkspaceTab !== "setup"}');
    expect(clientSource).toContain('{activeWorkspaceTab === "observations" && (');
    expect(clientSource).not.toContain("observationTab=");
  });
});
