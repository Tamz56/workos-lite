import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  commitObservationDraft,
  commitObservationDraftWithPhotos,
  createObservationId,
  createPhotoEvidenceId,
  ObservationWorkspaceView,
  type ObservationWorkspaceLoadState,
} from "@/components/workspaces/travel/rose-trial/ObservationWorkspace";
import type { PhotoEvidenceDraft } from "@/components/workspaces/travel/rose-trial/photoEvidenceDraft";
import type { ObservationReferenceContextResult } from "@/components/workspaces/travel/rose-trial/observationReferenceContext";
import { createRoseTrialObservation } from "@/components/workspaces/travel/rose-trial/observationCrud";
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

function validDraft() {
  return {
    ...createObservationFormDraft(new Date(2026, 6, 20, 10, 0), "2026-07-19T03:04:05.000Z"),
    observedFacts: "กิ่งยังเขียว",
  };
}

function photoDraft(index = 1): PhotoEvidenceDraft {
  const blob = new Blob([new Uint8Array([index, 2, 3])], { type: "image/jpeg" });
  return {
    localId: `draft-${index}`,
    fingerprint: `photo-${index}.jpg\u00003\u0000${index}`,
    sourceLabel: `photo-${index}.jpg`,
    blob,
    mimeType: "image/jpeg",
    originalSizeBytes: 3,
    storedSizeBytes: blob.size,
    width: 800,
    height: 600,
    caption: index === 1 ? "  รากใหม่  " : "",
  };
}

function photoSaveDependencies(overrides: Record<string, unknown> = {}) {
  const createRecord = vi.fn(createRoseTrialObservation);
  return {
    loadStore: vi.fn(() => ({
      ok: true as const,
      status: "empty" as const,
      value: { version: 1 as const, observations: [], photos: [], updatedAt: null },
      warnings: [],
    })),
    createRecord,
    addRecord: vi.fn(),
    saveStore: vi.fn((store?: unknown) => {
      void store;
      return { ok: true as const };
    }),
    createId: vi.fn(() => "obs-new"),
    createPhotoId: vi.fn()
      .mockReturnValueOnce("photo-1")
      .mockReturnValueOnce("photo-2")
      .mockReturnValueOnce("photo-3")
      .mockReturnValueOnce("photo-4"),
    photoStorage: {
      putPending: vi.fn(async (records) => ({
        ok: true as const,
        value: { storedIds: records.map((record: { id: string }) => record.id) },
      })),
      promote: vi.fn(async (ids) => ({ ok: true as const, value: { promotedIds: [...ids], missingIds: [] } })),
      deleteIds: vi.fn(async (ids) => ({ ok: true as const, value: { deletedIds: [...ids], missingIds: [] } })),
    },
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
    expect(createPhotoEvidenceId({ randomUUID: () => "uuid-photo" })).toBe("photo-uuid-photo");
  });

  it("keeps the zero-photo path synchronous and never opens Photo Evidence storage", async () => {
    const dependencies = photoSaveDependencies();
    const result = await commitObservationDraftWithPhotos(
      validDraft(),
      [],
      new Date(2026, 6, 20, 12, 0),
      "2026-07-19T03:04:05.000Z",
      validReference,
      {
        ...dependencies,
        addRecord: vi.fn((_store, record) => ({
          ok: true as const,
          value: {
            version: 1 as const,
            observations: [record],
            photos: [],
            updatedAt: "2026-07-20T05:00:00.000Z",
          },
        })),
      }
    );
    expect(result).toMatchObject({ ok: true, withPhotos: false });
    expect(dependencies.photoStorage.putPending).not.toHaveBeenCalled();
    expect(dependencies.photoStorage.promote).not.toHaveBeenCalled();
    expect(dependencies.photoStorage.deleteIds).not.toHaveBeenCalled();
  });

  it.each([1, 4])("saves %s photo drafts with ordered IDs and metadata", async (count) => {
    const events: string[] = [];
    const dependencies = photoSaveDependencies();
    dependencies.photoStorage.putPending.mockImplementation(async (records: readonly { id: string }[]) => {
      events.push("pending");
      return { ok: true as const, value: { storedIds: records.map((record) => record.id) } };
    });
    dependencies.saveStore.mockImplementation((store?: unknown) => {
      events.push("local-storage");
      expect(JSON.stringify(store)).not.toMatch(/data:image|blob:/i);
      return { ok: true as const };
    });
    dependencies.photoStorage.promote.mockImplementation(async (ids) => {
      events.push("promote");
      return { ok: true as const, value: { promotedIds: [...ids], missingIds: [] } };
    });
    const result = await commitObservationDraftWithPhotos(
      validDraft(),
      Array.from({ length: count }, (_, index) => photoDraft(index + 1)),
      new Date(2026, 6, 20, 12, 0),
      "2026-07-19T03:04:05.000Z",
      validReference,
      dependencies
    );
    expect(result).toMatchObject({ ok: true, withPhotos: true });
    if (!result.ok) return;
    const expectedIds = Array.from({ length: count }, (_, index) => `photo-${index + 1}`);
    expect(result.store.observations[0].photoIds).toEqual(expectedIds);
    expect(result.store.photos.map((item) => item.id)).toEqual(expectedIds);
    expect(result.store.photos.map((item) => item.sortOrder)).toEqual(expectedIds.map((_, index) => index));
    expect(result.store.photos[0].caption).toBe("รากใหม่");
    expect(events).toEqual(["pending", "local-storage", "promote"]);
  });

  it("blocks a partial latest store before writing pending Blobs", async () => {
    const dependencies = photoSaveDependencies({
      loadStore: vi.fn(() => ({
        ok: true as const,
        status: "partial" as const,
        value: { version: 1 as const, observations: [], photos: [], updatedAt: null },
        warnings: [],
      })),
    });
    const result = await commitObservationDraftWithPhotos(
      validDraft(), [photoDraft()], new Date(2026, 6, 20, 12, 0),
      "2026-07-19T03:04:05.000Z", validReference, dependencies
    );
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("ปิดการเพิ่มบันทึก") });
    expect(dependencies.photoStorage.putPending).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", "ไม่สามารถบันทึกรูปในเบราว์เซอร์นี้ได้"],
    ["quota_exceeded", "พื้นที่จัดเก็บรูปบนอุปกรณ์นี้ไม่เพียงพอ"],
    ["transaction_failed", "ยังบันทึกรูปไม่ได้"],
  ])("maps %s pending failures to safe Thai copy and retains the caller draft", async (code, copy) => {
    const inputPhotos = [photoDraft()];
    const before = inputPhotos.map((item) => ({ ...item }));
    const dependencies = photoSaveDependencies();
    dependencies.photoStorage.putPending.mockResolvedValue({ ok: false as const, error: { code } } as never);
    const result = await commitObservationDraftWithPhotos(
      validDraft(), inputPhotos, new Date(2026, 6, 20, 12, 0),
      "2026-07-19T03:04:05.000Z", validReference, dependencies
    );
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining(copy) });
    expect(JSON.stringify(result)).not.toContain("private");
    expect(dependencies.saveStore).not.toHaveBeenCalled();
    expect(inputPhotos).toEqual(before);
  });

  it("rolls back pending IDs after Local Storage failure without replacing the main error", async () => {
    const dependencies = photoSaveDependencies();
    dependencies.saveStore.mockReturnValue({
      ok: false as const,
      error: { code: "storage_unavailable" as const, message: "private quota detail" },
    } as never);
    dependencies.photoStorage.deleteIds.mockRejectedValue(new Error("private rollback detail"));
    const result = await commitObservationDraftWithPhotos(
      validDraft(), [photoDraft()], new Date(2026, 6, 20, 12, 0),
      "2026-07-19T03:04:05.000Z", validReference, dependencies
    );
    expect(result).toEqual({ ok: false, message: "ไม่สามารถบันทึกลงพื้นที่จัดเก็บบนอุปกรณ์นี้ได้" });
    expect(dependencies.photoStorage.deleteIds).toHaveBeenCalledWith(["photo-1"]);
    expect(JSON.stringify(result)).not.toMatch(/private|rollback/i);
  });

  it("completes Observation save when promotion fails and leaves referenced pending data for reconciliation", async () => {
    const dependencies = photoSaveDependencies();
    dependencies.photoStorage.promote.mockResolvedValue({
      ok: false as const,
      error: { code: "transaction_failed" },
    } as never);
    const result = await commitObservationDraftWithPhotos(
      validDraft(), [photoDraft()], new Date(2026, 6, 20, 12, 0),
      "2026-07-19T03:04:05.000Z", validReference, dependencies
    );
    expect(result).toMatchObject({ ok: true, withPhotos: true });
    expect(dependencies.saveStore).toHaveBeenCalledTimes(1);
    expect(dependencies.photoStorage.deleteIds).not.toHaveBeenCalled();
  });
});
