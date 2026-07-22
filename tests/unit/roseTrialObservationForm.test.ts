import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ObservationForm } from "@/components/workspaces/travel/rose-trial/ObservationForm";
import type { ObservationReferenceContextResult } from "@/components/workspaces/travel/rose-trial/observationReferenceContext";
import {
  createObservationFormDraft,
  type ObservationFormDraft,
} from "@/components/workspaces/travel/rose-trial/observationFormState";

const startedAt = new Date(2026, 6, 19, 9, 0).toISOString();
const referenceContext: Extract<ObservationReferenceContextResult, { ok: true }> = {
  ok: true,
  batchId: `rose-trial:${startedAt}`,
  validationContext: {
    batchId: `rose-trial:${startedAt}`,
    treatments: [{ id: "treatment-1", batchId: `rose-trial:${startedAt}` }],
    samples: [{ id: "sample-1", batchId: `rose-trial:${startedAt}`, treatmentId: "treatment-1" }],
  },
  treatments: [{ id: "treatment-1", code: "T1", label: "T1 — Control" }],
  samples: [{ id: "sample-1", label: "กิ่ง 1", treatmentCode: "T1", treatmentId: "treatment-1" }],
  warnings: [],
};

function renderForm(overrides: Partial<ObservationFormDraft> = {}) {
  const initialDraft = {
    ...createObservationFormDraft(new Date(2026, 6, 20, 10, 30), startedAt),
    ...overrides,
  };
  return renderToStaticMarkup(React.createElement(ObservationForm, {
    initialDraft,
    pilotStartedAt: startedAt,
    referenceContext,
    saving: false,
    onCancel: vi.fn(),
    onDirtyChange: vi.fn(),
    onSubmit: vi.fn(async () => ({ ok: true })),
  }));
}

describe("Rose Trial Observation Form", () => {
  it("renders the approved Thai copy and native accessible controls", () => {
    const html = renderForm();
    expect(html).toContain("สร้างบันทึกการสังเกต");
    expect(html).toContain("บันทึกเฉพาะสิ่งที่เห็นหรือวัดได้ก่อน");
    expect(html).toContain("ขอบเขตการบันทึก");
    expect(html).toContain("วันและเวลาที่สังเกต");
    expect(html).toContain("Trial Day ที่คำนวณได้");
    expect(html).toContain("ประเภทการสังเกต");
    expect(html).toContain("สิ่งที่สังเกตเห็น");
    expect(html).toContain("ข้อสังเกตหรือการตีความ");
    expect(html).toContain("สถานะ ณ วันที่บันทึก");
    expect(html).toContain("ยังต้องติดตามรายการนี้ต่อ");
    expect(html).toContain('type="datetime-local"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("aria-describedby");
    expect(html).toContain("aria-readonly=\"true\"");
    expect(html).toContain("required=\"\"");
  });

  it("shows Treatment selector only for Treatment scope", () => {
    const html = renderForm({ scope: "treatment" });
    expect(html).toContain("เลือกกลุ่มทดลอง");
    expect(html).toContain("T1 — Control");
    expect(html).not.toContain("เลือกกิ่งชำ");
  });

  it("shows Sample selector only for Sample scope without a second Treatment selector", () => {
    const html = renderForm({ scope: "sample" });
    expect(html).toContain("เลือกกิ่งชำ");
    expect(html).toContain("กิ่ง 1");
    expect(html).toContain("โดยไม่เดาความสัมพันธ์ที่กำกวม");
    expect(html).not.toContain("เลือกกลุ่มทดลอง");
  });

  it("keeps status optional, adds draft-only photo controls, and exposes no persisted edit or delete controls", () => {
    const html = renderForm();
    expect(html).toContain("ยังไม่ระบุสถานะ");
    expect(html).toContain('type="file"');
    expect(html).toContain("รูปประกอบ Observation");
    expect(html).toContain("เลือกรูปจากอุปกรณ์");
    expect(html).not.toContain("แก้ไข Observation");
    expect(html).not.toContain("ลบ Observation");
  });

  it("combines text, photo, touched, and processing dirty state without changing the text-only validator", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/ObservationForm.tsx"),
      "utf8"
    );
    expect(source).toContain("isObservationFormDirty(draft, initialDraft)");
    expect(source).toContain("photoDrafts.length > 0");
    expect(source).toContain("photoTouched");
    expect(source).toContain("photoProcessing");
    expect(source).toContain("onTouched={() => setPhotoTouched(true)}");
    expect(source).toContain("saving || photoProcessing");
    expect(source).toContain("validatePhotoEvidenceDrafts(photoDrafts)");
    expect(source).toContain("photoIssues.length > 0");
    expect(source).toContain('window.addEventListener("beforeunload"');
  });

  it("keeps photo drafts in Form state until successful parent unmount and reports save progress", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/ObservationForm.tsx"),
      "utf8"
    );
    expect(source).toContain("const [photoDrafts, setPhotoDrafts]");
    expect(source).toContain("const result = await onSubmit(draft, photoDrafts, submittedAt)");
    expect(source).toContain('saveStage === "saving_photos"');
    expect(source).toContain("กำลังบันทึกรูป");
    expect(source).toContain("กำลังบันทึก Observation");
    expect(source).not.toContain("persisted photo");
  });

  it("contains no persistence or autosave path", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/ObservationForm.tsx"),
      "utf8"
    );
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("saveObservationStore");
    expect(source).not.toContain("autosave");
  });
});
