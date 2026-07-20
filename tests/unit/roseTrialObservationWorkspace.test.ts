import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  commitObservationDraft,
  createObservationId,
  ObservationWorkspaceView,
  type ObservationWorkspaceLoadState,
} from "@/components/workspaces/travel/rose-trial/ObservationWorkspace";
import type { ObservationReferenceContextResult } from "@/components/workspaces/travel/rose-trial/observationReferenceContext";
import { createObservationFormDraft } from "@/components/workspaces/travel/rose-trial/observationFormState";
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

  it("renders the empty dashboard with a create control and no sample records", () => {
    const html = render(validReference, {
      kind: "empty",
      store: { version: 1, observations: [], photos: [], updatedAt: null },
      warnings: [],
    });
    expect(html).toContain("Observation ทั้งหมด");
    expect(html).toContain("ยังไม่มีบันทึกการสังเกต");
    expect(html).toContain("เพิ่มบันทึกการสังเกต");
    expect(html).not.toContain("การเพิ่มบันทึกจะเปิดในขั้นถัดไป");
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
    expect(html).toContain("พบข้อมูลบางรายการที่อ่านได้ไม่สมบูรณ์");
    expect(html).toContain("ไม่พบกิ่งชำ (ID: deleted-sample)");
    expect(html).toContain("ไม่พบกิ่งชำที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน");
    expect(html).toContain("จึงปิดการเพิ่มบันทึกชั่วคราวเพื่อป้องกันข้อมูลเดิม");
    expect(html).not.toContain("เพิ่มบันทึกการสังเกต");
    expect(html).not.toContain("raw parser message");
  });

  it("keeps load read-only, saves only through the strict boundary, and preserves tab ownership", () => {
    const root = process.cwd();
    const workspaceSource = fs.readFileSync(path.join(root, "src/components/workspaces/travel/rose-trial/ObservationWorkspace.tsx"), "utf8");
    const formSource = fs.readFileSync(path.join(root, "src/components/workspaces/travel/rose-trial/ObservationForm.tsx"), "utf8");
    const clientSource = fs.readFileSync(path.join(root, "src/components/workspaces/travel/rose-trial/RoseTrialLabClient.tsx"), "utf8");

    expect(workspaceSource).toContain("loadObservationStore(referenceContext.validationContext)");
    expect(workspaceSource).toContain("saveObservationStore");
    expect(workspaceSource).not.toContain("localStorage");
    expect(workspaceSource).not.toContain("setItem(");
    expect(formSource).not.toContain("localStorage");
    expect(formSource).toContain('window.addEventListener("beforeunload"');
    expect(clientSource).toContain('useState<"setup" | "observations">("setup")');
    expect(clientSource).toContain('role="tablist"');
    expect(clientSource).toContain('hidden={activeWorkspaceTab !== "setup"}');
    expect(clientSource).toContain('{activeWorkspaceTab === "observations" && (');
    expect(clientSource).toContain("observationFormDirty");
    expect(clientSource).toContain("ข้อมูลที่กรอกยังไม่ได้บันทึก ต้องการออกจากแบบฟอร์มหรือไม่");
    expect(clientSource).not.toContain("observationTab=");
  });

  it("does not expose create controls in blocked, loading, or failed states", () => {
    const blocked = render(
      { ok: false, reason: "pilot_not_started", message: "ยังไม่เริ่ม" },
      { kind: "loading" }
    );
    const loading = render(validReference, { kind: "loading" });
    const failed = render(validReference, { kind: "failed", status: "storage_unavailable" });
    expect(blocked).not.toContain("เพิ่มบันทึกการสังเกต");
    expect(loading).not.toContain("เพิ่มบันทึกการสังเกต");
    expect(failed).not.toContain("เพิ่มบันทึกการสังเกต");
  });

  it("reloads the latest store before create/add/save and returns the saved state", () => {
    const submittedAt = new Date(2026, 6, 20, 12, 0);
    const draft = {
      ...createObservationFormDraft(new Date(2026, 6, 20, 10, 0), "2026-07-19T03:04:05.000Z"),
      observedFacts: "กิ่งยังเขียว",
    };
    const created = observation({
      id: "obs-new",
      trialDay: 1,
      observedAt: new Date(2026, 6, 20, 10, 0).toISOString(),
      scope: "batch",
      treatmentId: undefined,
      sampleId: undefined,
      interpretation: undefined,
      status: undefined,
      photoIds: [],
      createdAt: submittedAt.toISOString(),
      updatedAt: submittedAt.toISOString(),
    });
    const baseStore = { version: 1 as const, observations: [], photos: [], updatedAt: null };
    const savedStore = {
      version: 1 as const,
      observations: [created],
      photos: [],
      updatedAt: submittedAt.toISOString(),
    };
    const loadStore = vi.fn(() => ({ ok: true as const, status: "valid" as const, value: baseStore, warnings: [] }));
    const createRecord = vi.fn(() => ({ ok: true as const, value: created }));
    const addRecord = vi.fn(() => ({ ok: true as const, value: savedStore }));
    const saveStore = vi.fn(() => ({ ok: true as const }));

    const result = commitObservationDraft(
      draft,
      submittedAt,
      "2026-07-19T03:04:05.000Z",
      validReference,
      { loadStore, createRecord, addRecord, saveStore, createId: () => "obs-new" }
    );

    expect(result).toEqual({ ok: true, store: savedStore });
    expect(loadStore).toHaveBeenCalledTimes(1);
    expect(createRecord).toHaveBeenCalledTimes(1);
    expect(addRecord).toHaveBeenCalledTimes(1);
    expect(saveStore).toHaveBeenCalledTimes(1);
    expect(loadStore.mock.invocationCallOrder[0]).toBeLessThan(createRecord.mock.invocationCallOrder[0]);
    expect(createRecord.mock.invocationCallOrder[0]).toBeLessThan(addRecord.mock.invocationCallOrder[0]);
    expect(addRecord.mock.invocationCallOrder[0]).toBeLessThan(saveStore.mock.invocationCallOrder[0]);
  });

  it.each([
    ["partial", { ok: true as const, status: "partial" as const, value: { version: 1 as const, observations: [], photos: [], updatedAt: null }, warnings: [] }],
    ["malformed", { ok: false as const, status: "malformed_json" as const, error: { code: "malformed_json" as const, message: "raw" } }],
  ])("blocks %s latest stores before creating or saving", (_label, latest) => {
    const draft = {
      ...createObservationFormDraft(new Date(2026, 6, 20, 10, 0), "2026-07-19T03:04:05.000Z"),
      observedFacts: "กิ่งยังเขียว",
    };
    const createRecord = vi.fn();
    const addRecord = vi.fn();
    const saveStore = vi.fn();
    const result = commitObservationDraft(
      draft,
      new Date(2026, 6, 20, 12, 0),
      "2026-07-19T03:04:05.000Z",
      validReference,
      {
        loadStore: vi.fn(() => latest),
        createRecord,
        addRecord,
        saveStore,
        createId: vi.fn(),
      }
    );
    expect(result.ok).toBe(false);
    expect(createRecord).not.toHaveBeenCalled();
    expect(addRecord).not.toHaveBeenCalled();
    expect(saveStore).not.toHaveBeenCalled();
  });

  it("returns a save failure without mutating the draft", () => {
    const submittedAt = new Date(2026, 6, 20, 12, 0);
    const draft = {
      ...createObservationFormDraft(new Date(2026, 6, 20, 10, 0), "2026-07-19T03:04:05.000Z"),
      observedFacts: "กิ่งยังเขียว",
    };
    const before = structuredClone(draft);
    const created = observation({
      id: "obs-new",
      scope: "batch",
      treatmentId: undefined,
      sampleId: undefined,
      createdAt: submittedAt.toISOString(),
      updatedAt: submittedAt.toISOString(),
    });
    const nextStore = { version: 1 as const, observations: [created], photos: [], updatedAt: submittedAt.toISOString() };
    const result = commitObservationDraft(
      draft,
      submittedAt,
      "2026-07-19T03:04:05.000Z",
      validReference,
      {
        loadStore: () => ({ ok: true, status: "empty", value: { version: 1, observations: [], photos: [], updatedAt: null }, warnings: [] }),
        createRecord: () => ({ ok: true, value: created }),
        addRecord: () => ({ ok: true, value: nextStore }),
        saveStore: () => ({ ok: false, error: { code: "storage_unavailable", message: "raw quota" } }),
        createId: () => "obs-new",
      }
    );
    expect(result).toMatchObject({ ok: false, message: "ไม่สามารถบันทึกลงพื้นที่จัดเก็บบนอุปกรณ์นี้ได้" });
    expect(JSON.stringify(result)).not.toContain("raw quota");
    expect(draft).toEqual(before);
  });

  it("uses randomUUID, falls back to secure random bytes, and rejects missing Web Crypto", () => {
    expect(createObservationId({ randomUUID: () => "uuid-1" })).toBe("obs-uuid-1");
    expect(createObservationId({
      getRandomValues: (array) => {
        if (array instanceof Uint8Array) array.fill(15);
        return array;
      },
    })).toBe(`obs-${"0f".repeat(16)}`);
    expect(() => createObservationId(undefined)).not.toThrow();
    expect(() => createObservationId({})).toThrow("secure-random-unavailable");
  });
});
