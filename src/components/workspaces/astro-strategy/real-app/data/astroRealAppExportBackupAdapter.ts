import {
  AstroDataExportEnvelope,
  AstroDataExportKeyStatus,
  AstroDataExportMetadata,
  AstroDataExportPayload,
  AstroDataExportResult
} from "./astroRealAppTypes";

const TARGET_KEYS = [
  "astro-real-app:birth-profile:v1",
  "astro-real-app:reflection-history:v1",
  "astro-real-app:planning-notes:v1",
  "astro-real-app:reflection-draft:v1",
  "astro-real-app:onboarding:v1"
];

/**
 * Checks the status of all targeted LocalStorage keys for export.
 * Never writes or modifies localStorage.
 */
export function getAstroDataExportKeyStatuses(): AstroDataExportKeyStatus[] {
  if (typeof window === "undefined") {
    return TARGET_KEYS.map(k => ({
      key: k,
      exists: false,
      bytes: 0,
      status: "missing",
      notes: "Cannot access localStorage on SSR"
    }));
  }

  return TARGET_KEYS.map(key => {
    const rawVal = localStorage.getItem(key);
    if (rawVal === null) {
      return {
        key,
        exists: false,
        bytes: 0,
        status: "missing",
        notes: "ไม่มีข้อมูลจัดเก็บ"
      };
    }

    try {
      JSON.parse(rawVal);
      return {
        key,
        exists: true,
        bytes: rawVal.length,
        status: "available",
        notes: "พร้อมส่งออก"
      };
    } catch {
      return {
        key,
        exists: true,
        bytes: rawVal.length,
        status: "malformed",
        notes: "โครงสร้าง JSON ผิดพลาด"
      };
    }
  });
}

/**
 * Collects the payloads of all targeted LocalStorage keys into a single object.
 * Safe fallback for malformed values.
 */
export function collectAstroRealAppExportPayload(): AstroDataExportPayload {
  const payload: AstroDataExportPayload = {};
  if (typeof window === "undefined") return payload;

  for (const key of TARGET_KEYS) {
    const rawVal = localStorage.getItem(key);
    if (rawVal !== null) {
      try {
        payload[key] = JSON.parse(rawVal);
      } catch (error) {
        console.error(`collectAstroRealAppExportPayload: failed to parse key "${key}"`, error);
        payload[key] = rawVal; // Keep raw string if parsing fails
      }
    } else {
      payload[key] = null; // Represent missing keys as null
    }
  }

  return payload;
}

/**
 * Builds the complete export JSON envelope including metadata and the collected data.
 */
export function buildAstroDataExportEnvelope(routeContext: string): AstroDataExportEnvelope {
  const data = collectAstroRealAppExportPayload();
  
  const metadata: AstroDataExportMetadata = {
    appName: "Astro Strategy Lab",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    routeContext,
    source: "ArborDesk Client Export v1.0",
    schemaVersions: {
      "birth-profile": 1,
      "reflection-history": 1,
      "planning-notes": 1,
      "reflection-draft": 1,
      "onboarding": 1
    },
    includedKeys: TARGET_KEYS
  };

  return {
    $schema: "https://arbor-desk.com/schemas/astro-strategy-backup-v1.json",
    metadata,
    data
  };
}

/**
 * Validates the schema and metadata of an export envelope.
 */
export function validateAstroDataExportEnvelope(envelope: AstroDataExportEnvelope): boolean {
  if (!envelope) return false;
  if (envelope.$schema !== "https://arbor-desk.com/schemas/astro-strategy-backup-v1.json") return false;
  if (!envelope.metadata || !envelope.data) return false;
  if (envelope.metadata.appName !== "Astro Strategy Lab") return false;
  if (typeof envelope.data !== "object") return false;
  return true;
}

/**
 * Formats a clean export filename incorporating display name and timestamp.
 */
export function buildAstroDataExportFileName(displayName?: string): string {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const nameSuffix = displayName ? `-${displayName.trim().replace(/[^\w\u0E00-\u0E7F]/g, "_")}` : "";
  return `astro-strategy-backup-${dateStr}${nameSuffix}.json`;
}

/**
 * Triggers a client-side file download of the export JSON envelope.
 * Does not write to localStorage.
 */
export function downloadAstroDataExportJson(
  envelope: AstroDataExportEnvelope,
  fileName: string
): AstroDataExportResult {
  if (typeof window === "undefined") {
    return { success: false, error: "Cannot trigger download on server side" };
  }

  try {
    const isValid = validateAstroDataExportEnvelope(envelope);
    if (!isValid) {
      return { success: false, error: "โครงสร้างข้อมูลสกีมาการสำรองไม่ถูกต้อง" };
    }

    const jsonStr = JSON.stringify(envelope, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      bytes: jsonStr.length
    };
  } catch (error) {
    console.error("downloadAstroDataExportJson: Failed to build and download file.", error);
    const err = error as Error;
    return {
      success: false,
      error: err?.message || String(error)
    };
  }
}
