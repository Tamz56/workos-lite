import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  PHOTO_EVIDENCE_ACCEPT,
  PhotoEvidencePicker,
  processPhotoEvidenceSelection,
} from "@/components/workspaces/travel/rose-trial/PhotoEvidencePicker";
import type { PhotoEvidenceDraft } from "@/components/workspaces/travel/rose-trial/photoEvidenceDraft";

function file(name: string, type = "image/jpeg", lastModified = 1): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type, lastModified });
}

function processed(input: File) {
  const blob = new Blob([new Uint8Array([1, 2])], { type: input.type });
  return {
    ok: true as const,
    value: {
      blob,
      mimeType: input.type as "image/jpeg" | "image/png" | "image/webp",
      originalSizeBytes: input.size,
      storedSizeBytes: blob.size,
      width: 800,
      height: 600,
    },
  };
}

function draft(overrides: Partial<PhotoEvidenceDraft> = {}): PhotoEvidenceDraft {
  const blob = new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" });
  return {
    localId: "draft-existing",
    fingerprint: "existing.jpg\u00003\u00001",
    sourceLabel: "existing.jpg",
    blob,
    mimeType: "image/jpeg",
    originalSizeBytes: 3,
    storedSizeBytes: 2,
    width: 800,
    height: 600,
    caption: "",
    ...overrides,
  };
}

describe("Rose Trial Photo Evidence Picker", () => {
  it("renders approved Thai copy, native file semantics, privacy copy, captions, and accessible removal", () => {
    const html = renderToStaticMarkup(React.createElement(PhotoEvidencePicker, {
      drafts: [draft()],
      disabled: false,
      onDraftsChange: vi.fn(),
      onTouched: vi.fn(),
      onProcessingChange: vi.fn(),
      onIssuesChange: vi.fn(),
    }));
    expect(html).toContain("รูปประกอบ Observation");
    expect(html).toContain("เลือกรูปจากอุปกรณ์");
    expect(html).toContain("เลือกแล้ว 1/4 รูป");
    expect(html).toContain('type="file"');
    expect(html).toContain('multiple=""');
    expect(html).toContain(`accept="${PHOTO_EVIDENCE_ACCEPT}"`);
    expect(html).not.toContain("capture=");
    expect(html).toContain("คำอธิบายรูปที่ 1 (ไม่จำเป็น)");
    expect(html).toContain("0 / 200 ตัวอักษร");
    expect(html).toContain('aria-label="นำรูปที่ 1 ออก"');
    expect(html).toContain("รูปภาพในรุ่นนี้จัดเก็บไว้ในเบราว์เซอร์ของอุปกรณ์นี้");
  });

  it("processes files sequentially and preserves accepted order", async () => {
    let active = 0;
    let maximumActive = 0;
    const processImage = vi.fn(async (input: File) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return processed(input);
    });
    let nextId = 0;
    const progress = vi.fn();
    const result = await processPhotoEvidenceSelection(
      [file("one.jpg"), file("two.png", "image/png"), file("three.webp", "image/webp")],
      [],
      { processImage, createLocalId: () => `draft-${++nextId}`, onProgress: progress }
    );
    expect(maximumActive).toBe(1);
    expect(result.drafts.map((item) => item.sourceLabel)).toEqual(["one.jpg", "two.png", "three.webp"]);
    expect(progress.mock.calls).toEqual([[1, 3], [2, 3], [3, 3]]);
  });

  it("keeps valid files from a mixed selection and reports invalid files separately", async () => {
    const processImage = vi.fn(async (input: File) => input.name === "broken.jpg"
      ? { ok: false as const, error: { code: "decode_failed" } }
      : processed(input));
    let nextId = 0;
    const result = await processPhotoEvidenceSelection(
      [file("good.jpg"), file("bad.gif", "image/gif"), file("broken.jpg"), file("good.png", "image/png")],
      [],
      { processImage, createLocalId: () => `draft-${++nextId}` }
    );
    expect(result.drafts.map((item) => item.sourceLabel)).toEqual(["good.jpg", "good.png"]);
    expect(result.issues).toMatchObject([
      { code: "unsupported", filename: "bad.gif", blocking: false },
      { code: "processing_failed", filename: "broken.jpg", blocking: false },
    ]);
  });

  it("rejects duplicates before processing and enforces remaining capacity", async () => {
    const processImage = vi.fn(async (input: File) => processed(input));
    const existing = [
      draft(),
      draft({ localId: "d2", fingerprint: "second" }),
      draft({ localId: "d3", fingerprint: "third" }),
    ];
    let nextId = 3;
    const result = await processPhotoEvidenceSelection(
      [file("existing.jpg"), file("fourth.jpg", "image/jpeg", 2), file("fifth.jpg", "image/jpeg", 3)],
      existing,
      { processImage, createLocalId: () => `draft-${++nextId}` }
    );
    expect(result.drafts).toHaveLength(4);
    expect(result.drafts[3].sourceLabel).toBe("fourth.jpg");
    expect(result.issues.map((issue) => issue.code)).toEqual(["duplicate", "maximum_exceeded"]);
    expect(processImage).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized files before image processing", async () => {
    const processImage = vi.fn(async (input: File) => processed(input));
    const oversized = new File(
      [new Uint8Array(12 * 1024 * 1024 + 1)],
      "large.jpg",
      { type: "image/jpeg", lastModified: 1 }
    );
    const result = await processPhotoEvidenceSelection(
      [oversized],
      [],
      { processImage, createLocalId: () => "draft-1" }
    );
    expect(result).toMatchObject({ drafts: [], issues: [{ code: "too_large" }] });
    expect(processImage).not.toHaveBeenCalled();
  });

  it("keeps object URLs picker-owned and guards stale async completion without upload or camera APIs", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/PhotoEvidencePicker.tsx"),
      "utf8"
    );
    expect(source).toContain("URL.createObjectURL");
    expect(source).toContain("URL.revokeObjectURL");
    expect(source).toContain("previewRecordsRef");
    expect(source).toContain("operationRef.current !== operation");
    expect(source).toContain('event.target.value = ""');
    expect(source).not.toContain("getUserMedia");
    expect(source).not.toContain("capture=");
    expect(source).not.toContain("onDrop");
    expect(source).not.toContain("fetch(");
  });
});
