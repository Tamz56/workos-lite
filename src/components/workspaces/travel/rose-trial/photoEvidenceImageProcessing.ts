import {
  PHOTO_EVIDENCE_MAX_LONG_EDGE,
  PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES,
  PHOTO_EVIDENCE_TARGET_LOSSY_BYTES,
  PHOTO_EVIDENCE_TARGET_PNG_BYTES,
  isSupportedPhotoEvidenceMimeType,
  type PhotoEvidenceBlobLike,
  type PhotoEvidenceMimeType,
} from "./photoEvidence";

export type PhotoEvidenceProcessingErrorCode =
  | "unsupported_type"
  | "mime_signature_mismatch"
  | "animated_not_supported"
  | "file_too_large"
  | "empty_file"
  | "signature_read_failed"
  | "decode_unavailable"
  | "decode_failed"
  | "invalid_dimensions"
  | "encode_unavailable"
  | "encode_failed"
  | "output_too_large";

export type PhotoEvidenceProcessingResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: PhotoEvidenceProcessingErrorCode } };

export interface PhotoEvidenceDecodedImage {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  close?(): void;
}

export interface PhotoEvidenceEncodeInput {
  source: CanvasImageSource;
  width: number;
  height: number;
  mimeType: PhotoEvidenceMimeType;
  quality?: number;
}

export interface PhotoEvidenceImageProcessingDependencies {
  decode(input: PhotoEvidenceBlobLike): Promise<PhotoEvidenceDecodedImage>;
  encode(input: PhotoEvidenceEncodeInput): Promise<Blob | null>;
}

export interface ProcessedPhotoEvidenceImage {
  blob: Blob;
  mimeType: PhotoEvidenceMimeType;
  originalSizeBytes: number;
  storedSizeBytes: number;
  width: number;
  height: number;
}

interface SliceableBlobLike extends PhotoEvidenceBlobLike {
  slice?(start?: number, end?: number): PhotoEvidenceBlobLike;
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const LOSSY_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52] as const;

function bytesMatch(bytes: Uint8Array, signature: ArrayLike<number>, offset = 0): boolean {
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

export function detectPhotoEvidenceMimeType(bytes: Uint8Array): PhotoEvidenceMimeType | null {
  if (bytes.length >= 3 && bytesMatch(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (bytes.length >= 8 && bytesMatch(bytes, PNG_SIGNATURE)) return "image/png";
  if (
    bytes.length >= 12
    && bytesMatch(bytes, [0x52, 0x49, 0x46, 0x46])
    && bytesMatch(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

function containsAsciiChunk(bytes: Uint8Array, chunk: string): boolean {
  const signature = new TextEncoder().encode(chunk);
  for (let offset = 0; offset <= bytes.length - signature.length; offset += 1) {
    if (bytesMatch(bytes, signature, offset)) return true;
  }
  return false;
}

export function isAnimatedPhotoEvidenceImage(
  bytes: Uint8Array,
  mimeType: PhotoEvidenceMimeType
): boolean {
  if (mimeType === "image/png") return containsAsciiChunk(bytes, "acTL");
  if (mimeType !== "image/webp") return false;
  const hasExtendedHeader = bytes.length >= 21 && containsAsciiChunk(bytes.slice(12, 16), "VP8X");
  const hasAnimationFlag = hasExtendedHeader && (bytes[20] & 0x02) === 0x02;
  return hasAnimationFlag || containsAsciiChunk(bytes, "ANIM");
}

export function calculatePhotoEvidenceDimensions(
  width: number,
  height: number,
  maxLongEdge = PHOTO_EVIDENCE_MAX_LONG_EDGE
): PhotoEvidenceProcessingResult<{ width: number; height: number }> {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    return { ok: false, error: { code: "invalid_dimensions" } };
  }
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { ok: true, value: { width, height } };
  const ratio = maxLongEdge / longEdge;
  return {
    ok: true,
    value: {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    },
  };
}

export async function validatePhotoEvidenceImageInput(
  input: SliceableBlobLike
): Promise<PhotoEvidenceProcessingResult<{ mimeType: PhotoEvidenceMimeType }>> {
  if (!isSupportedPhotoEvidenceMimeType(input.type)) {
    return { ok: false, error: { code: "unsupported_type" } };
  }
  if (!Number.isInteger(input.size) || input.size <= 0) {
    return { ok: false, error: { code: "empty_file" } };
  }
  if (input.size > PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES) {
    return { ok: false, error: { code: "file_too_large" } };
  }

  let bytes: Uint8Array;
  try {
    const signatureSource = input.slice ? input.slice(0, 64 * 1024) : input;
    bytes = new Uint8Array(await signatureSource.arrayBuffer());
  } catch {
    return { ok: false, error: { code: "signature_read_failed" } };
  }
  const detected = detectPhotoEvidenceMimeType(bytes);
  if (!detected || detected !== input.type) {
    return { ok: false, error: { code: "mime_signature_mismatch" } };
  }
  if (isAnimatedPhotoEvidenceImage(bytes, detected)) {
    return { ok: false, error: { code: "animated_not_supported" } };
  }
  return { ok: true, value: { mimeType: detected } };
}

async function browserDecode(input: PhotoEvidenceBlobLike): Promise<PhotoEvidenceDecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(input as Blob, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Continue to the HTMLImageElement fallback.
    }
  }
  if (typeof Image === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new DOMException("decode unavailable", "NotSupportedError");
  }

  const objectUrl = URL.createObjectURL(input as Blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function browserEncode(input: PhotoEvidenceEncodeInput): Promise<Blob | null> {
  if (typeof document === "undefined") {
    throw new DOMException("encode unavailable", "NotSupportedError");
  }
  const canvas = document.createElement("canvas");
  canvas.width = input.width;
  canvas.height = input.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(input.source, 0, 0, input.width, input.height);
  try {
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, input.mimeType, input.quality);
    });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export function createBrowserPhotoEvidenceProcessingDependencies(): PhotoEvidenceImageProcessingDependencies {
  return { decode: browserDecode, encode: browserEncode };
}

async function encodeLossy(
  decoded: PhotoEvidenceDecodedImage,
  dimensions: { width: number; height: number },
  preferredMimeType: "image/jpeg" | "image/webp",
  dependencies: PhotoEvidenceImageProcessingDependencies
): Promise<PhotoEvidenceProcessingResult<{ blob: Blob; mimeType: "image/jpeg" | "image/webp" }>> {
  const mimeTypes: Array<"image/jpeg" | "image/webp"> = preferredMimeType === "image/webp"
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg"];
  for (const mimeType of mimeTypes) {
    for (const quality of LOSSY_QUALITY_STEPS) {
      let output: Blob | null;
      try {
        output = await dependencies.encode({ ...dimensions, source: decoded.source, mimeType, quality });
      } catch {
        return { ok: false, error: { code: "encode_failed" } };
      }
      if (!output || output.size <= 0 || output.type !== mimeType) {
        if (mimeType === "image/webp") break;
        return { ok: false, error: { code: "encode_failed" } };
      }
      if (output.size <= PHOTO_EVIDENCE_TARGET_LOSSY_BYTES) {
        return { ok: true, value: { blob: output, mimeType } };
      }
    }
  }
  return { ok: false, error: { code: "output_too_large" } };
}

export async function processPhotoEvidenceImage(
  input: SliceableBlobLike,
  dependencies: PhotoEvidenceImageProcessingDependencies = createBrowserPhotoEvidenceProcessingDependencies()
): Promise<PhotoEvidenceProcessingResult<ProcessedPhotoEvidenceImage>> {
  const validation = await validatePhotoEvidenceImageInput(input);
  if (!validation.ok) return validation;

  let decoded: PhotoEvidenceDecodedImage;
  try {
    decoded = await dependencies.decode(input);
  } catch (error) {
    const name = typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";
    return {
      ok: false,
      error: { code: name === "NotSupportedError" ? "decode_unavailable" : "decode_failed" },
    };
  }

  try {
    const dimensions = calculatePhotoEvidenceDimensions(decoded.width, decoded.height);
    if (!dimensions.ok) return dimensions;

    let output: PhotoEvidenceProcessingResult<{ blob: Blob; mimeType: PhotoEvidenceMimeType }>;
    if (validation.value.mimeType === "image/png") {
      let encoded: Blob | null;
      try {
        encoded = await dependencies.encode({
          ...dimensions.value,
          source: decoded.source,
          mimeType: "image/png",
        });
      } catch {
        return { ok: false, error: { code: "encode_failed" } };
      }
      if (!encoded || encoded.type !== "image/png" || encoded.size <= 0) {
        return { ok: false, error: { code: "encode_failed" } };
      }
      output = encoded.size <= PHOTO_EVIDENCE_TARGET_PNG_BYTES
        ? { ok: true, value: { blob: encoded, mimeType: "image/png" } }
        : { ok: false, error: { code: "output_too_large" } };
    } else {
      output = await encodeLossy(decoded, dimensions.value, validation.value.mimeType, dependencies);
    }
    if (!output.ok) return output;

    return {
      ok: true,
      value: {
        blob: output.value.blob,
        mimeType: output.value.mimeType,
        originalSizeBytes: input.size,
        storedSizeBytes: output.value.blob.size,
        width: dimensions.value.width,
        height: dimensions.value.height,
      },
    };
  } finally {
    decoded.close?.();
  }
}
