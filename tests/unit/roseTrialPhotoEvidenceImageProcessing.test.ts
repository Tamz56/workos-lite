import { describe, expect, it, vi } from "vitest";

import {
  PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES,
  PHOTO_EVIDENCE_TARGET_LOSSY_BYTES,
  type PhotoEvidenceBlobLike,
} from "@/components/workspaces/travel/rose-trial/photoEvidence";
import {
  calculatePhotoEvidenceDimensions,
  detectPhotoEvidenceMimeType,
  isAnimatedPhotoEvidenceImage,
  processPhotoEvidenceImage,
  validatePhotoEvidenceImageInput,
  type PhotoEvidenceImageProcessingDependencies,
} from "@/components/workspaces/travel/rose-trial/photoEvidenceImageProcessing";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

function input(bytes: Uint8Array, type: string): Blob {
  return new Blob([Uint8Array.from(bytes).buffer], { type });
}

function dependencies(overrides: Partial<PhotoEvidenceImageProcessingDependencies> = {}): PhotoEvidenceImageProcessingDependencies {
  return {
    decode: vi.fn(async () => ({ source: {} as CanvasImageSource, width: 2400, height: 1200 })),
    encode: vi.fn(async ({ mimeType }) => new Blob([new Uint8Array(512)], { type: mimeType })),
    ...overrides,
  };
}

describe("Rose Trial photo evidence image processing", () => {
  it("detects JPEG, PNG, and WebP magic bytes", () => {
    expect(detectPhotoEvidenceMimeType(JPEG)).toBe("image/jpeg");
    expect(detectPhotoEvidenceMimeType(PNG)).toBe("image/png");
    expect(detectPhotoEvidenceMimeType(WEBP)).toBe("image/webp");
    expect(detectPhotoEvidenceMimeType(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("rejects animated WebP and APNG markers", async () => {
    const animatedWebp = new Uint8Array([
      ...WEBP,
      0x56, 0x50, 0x38, 0x58,
      0, 0, 0, 0,
      0x02,
    ]);
    const animatedPng = new Uint8Array([...PNG, 0x61, 0x63, 0x54, 0x4c]);
    expect(isAnimatedPhotoEvidenceImage(animatedWebp, "image/webp")).toBe(true);
    expect(isAnimatedPhotoEvidenceImage(animatedPng, "image/png")).toBe(true);
    await expect(validatePhotoEvidenceImageInput(input(animatedWebp, "image/webp")))
      .resolves.toEqual({ ok: false, error: { code: "animated_not_supported" } });
    await expect(validatePhotoEvidenceImageInput(input(animatedPng, "image/png")))
      .resolves.toEqual({ ok: false, error: { code: "animated_not_supported" } });
  });

  it("rejects MIME/signature mismatch, SVG, empty input, and oversized input", async () => {
    await expect(validatePhotoEvidenceImageInput(input(PNG, "image/jpeg")))
      .resolves.toEqual({ ok: false, error: { code: "mime_signature_mismatch" } });
    await expect(validatePhotoEvidenceImageInput(input(new TextEncoder().encode("<svg/>"), "image/svg+xml")))
      .resolves.toEqual({ ok: false, error: { code: "unsupported_type" } });
    await expect(validatePhotoEvidenceImageInput(new Blob([], { type: "image/jpeg" })))
      .resolves.toEqual({ ok: false, error: { code: "empty_file" } });

    const oversized: PhotoEvidenceBlobLike = {
      size: PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES + 1,
      type: "image/jpeg",
      arrayBuffer: async () => JPEG.buffer,
    };
    await expect(validatePhotoEvidenceImageInput(oversized))
      .resolves.toEqual({ ok: false, error: { code: "file_too_large" } });
  });

  it("calculates aspect-ratio dimensions without upscaling", () => {
    expect(calculatePhotoEvidenceDimensions(1200, 800)).toEqual({ ok: true, value: { width: 1200, height: 800 } });
    expect(calculatePhotoEvidenceDimensions(3840, 2160)).toEqual({ ok: true, value: { width: 1920, height: 1080 } });
    expect(calculatePhotoEvidenceDimensions(1080, 2160)).toEqual({ ok: true, value: { width: 960, height: 1920 } });
    expect(calculatePhotoEvidenceDimensions(0, 100)).toEqual({ ok: false, error: { code: "invalid_dimensions" } });
  });

  it("decodes, resizes, re-encodes JPEG, and closes the decoded source", async () => {
    const close = vi.fn();
    const deps = dependencies({
      decode: vi.fn(async () => ({ source: {} as CanvasImageSource, width: 2400, height: 1200, close })),
    });
    const source = input(JPEG, "image/jpeg");
    const before = { size: source.size, type: source.type };
    const result = await processPhotoEvidenceImage(source, deps);

    expect(result).toMatchObject({
      ok: true,
      value: {
        mimeType: "image/jpeg",
        originalSizeBytes: source.size,
        storedSizeBytes: 512,
        width: 1920,
        height: 960,
      },
    });
    expect(deps.encode).toHaveBeenCalledWith(expect.objectContaining({
      width: 1920,
      height: 960,
      mimeType: "image/jpeg",
      quality: 0.82,
    }));
    expect(close).toHaveBeenCalledTimes(1);
    expect({ size: source.size, type: source.type }).toEqual(before);
  });

  it("preserves PNG output and does not flatten transparency", async () => {
    const deps = dependencies();
    const result = await processPhotoEvidenceImage(input(PNG, "image/png"), deps);
    expect(result).toMatchObject({ ok: true, value: { mimeType: "image/png" } });
    expect(deps.encode).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/png" }));
  });

  it("uses WebP when available and falls back to JPEG when WebP encoding is unavailable", async () => {
    const webp = dependencies();
    expect(await processPhotoEvidenceImage(input(WEBP, "image/webp"), webp))
      .toMatchObject({ ok: true, value: { mimeType: "image/webp" } });

    const fallback = dependencies({
      encode: vi.fn(async ({ mimeType }) => mimeType === "image/webp"
        ? null
        : new Blob([new Uint8Array(256)], { type: "image/jpeg" })),
    });
    expect(await processPhotoEvidenceImage(input(WEBP, "image/webp"), fallback))
      .toMatchObject({ ok: true, value: { mimeType: "image/jpeg" } });
  });

  it("reduces lossy quality in steps and reports oversized output without persisting original", async () => {
    const encode = vi.fn(async ({ mimeType }) => new Blob(
      [new Uint8Array(PHOTO_EVIDENCE_TARGET_LOSSY_BYTES + 1).buffer],
      { type: mimeType }
    ));
    const result = await processPhotoEvidenceImage(input(JPEG, "image/jpeg"), dependencies({ encode }));
    expect(result).toEqual({ ok: false, error: { code: "output_too_large" } });
    expect(encode).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(result)).not.toContain("blob");
  });

  it("returns structured decode and encode failures", async () => {
    const decodeFailure = await processPhotoEvidenceImage(input(JPEG, "image/jpeg"), dependencies({
      decode: vi.fn(async () => { throw new Error("private decode details"); }),
    }));
    expect(decodeFailure).toEqual({ ok: false, error: { code: "decode_failed" } });
    expect(JSON.stringify(decodeFailure)).not.toContain("private decode details");

    const encodeFailure = await processPhotoEvidenceImage(input(JPEG, "image/jpeg"), dependencies({
      encode: vi.fn(async () => { throw new Error("private encode details"); }),
    }));
    expect(encodeFailure).toEqual({ ok: false, error: { code: "encode_failed" } });
    expect(JSON.stringify(encodeFailure)).not.toContain("private encode details");
  });

  it("returns structured signature-read failure and does not mutate the input contract", async () => {
    const source: PhotoEvidenceBlobLike = {
      size: 10,
      type: "image/jpeg",
      arrayBuffer: async () => { throw new Error("private bytes"); },
    };
    const before = { size: source.size, type: source.type };
    expect(await validatePhotoEvidenceImageInput(source))
      .toEqual({ ok: false, error: { code: "signature_read_failed" } });
    expect({ size: source.size, type: source.type }).toEqual(before);
  });

  it("returns only processed output metadata and never copies private filename or EXIF fields", async () => {
    const result = await processPhotoEvidenceImage(input(JPEG, "image/jpeg"), dependencies());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value).sort()).toEqual([
        "blob",
        "height",
        "mimeType",
        "originalSizeBytes",
        "storedSizeBytes",
        "width",
      ]);
      expect(result.value).not.toHaveProperty("filename");
      expect(result.value).not.toHaveProperty("exif");
      expect(result.value).not.toHaveProperty("gps");
    }
  });
});
