import {
  AstroBirthProfile,
  AstroBirthProfileStorageEnvelope,
  AstroBirthProfileValidationResult,
  AstroBirthProfileValidationIssue,
  AstroBirthProfilePersistenceResult
} from "./astroRealAppTypes";

const STORAGE_KEY = "astro-real-app:birth-profile:v1";
const SCHEMA_VERSION = 1;

/**
 * Builds the hardcoded default birth profile representing คุณตั้ม.
 */
export function buildDefaultAstroBirthProfile(): AstroBirthProfile {
  return {
    displayName: "คุณตั้ม",
    fullName: "อภิรักษ์",
    birthDate: "1980-06-05",
    birthTime: "06:45",
    birthPlace: "Siriraj Hospital, Bangkok, Thailand",
    timezone: "Asia/Bangkok",
    utcOffset: "+07:00",
    birthWeekday: "Thursday",
    notes: "ข้อมูลตั้งต้นของระบบ",
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Validates a birth profile structure and data formats.
 */
export function validateAstroBirthProfile(profile: AstroBirthProfile): AstroBirthProfileValidationResult {
  const issues: AstroBirthProfileValidationIssue[] = [];

  if (!profile.displayName || profile.displayName.trim() === "") {
    issues.push({
      field: "displayName",
      message: "ชื่อเรียกแสดงผลต้องไม่ว่างเปล่า",
      severity: "error"
    });
  }

  if (!profile.fullName || profile.fullName.trim() === "") {
    issues.push({
      field: "fullName",
      message: "ชื่อจริง/นามสกุลต้องไม่ว่างเปล่า",
      severity: "error"
    });
  }

  // YYYY-MM-DD check
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!profile.birthDate || !dateRegex.test(profile.birthDate)) {
    issues.push({
      field: "birthDate",
      message: "วันเกิดต้องอยู่ในรูปแบบ YYYY-MM-DD (เช่น 1980-06-05)",
      severity: "error"
    });
  } else {
    const parsedDate = new Date(profile.birthDate);
    if (isNaN(parsedDate.getTime())) {
      issues.push({
        field: "birthDate",
        message: "วันเกิดไม่ตรงกับวันที่ตามปฏิทินจริง",
        severity: "error"
      });
    }
  }

  // HH:mm check
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!profile.birthTime || !timeRegex.test(profile.birthTime)) {
    issues.push({
      field: "birthTime",
      message: "เวลาเกิดต้องอยู่ในรูปแบบ HH:mm (เช่น 06:45)",
      severity: "error"
    });
  } else {
    const [hoursStr, minutesStr] = profile.birthTime.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      issues.push({
        field: "birthTime",
        message: "เวลาเกิดต้องอยู่ระหว่าง 00:00 ถึง 23:59",
        severity: "error"
      });
    }
  }

  if (!profile.birthPlace || profile.birthPlace.trim() === "") {
    issues.push({
      field: "birthPlace",
      message: "สถานที่เกิดต้องไม่ว่างเปล่า",
      severity: "error"
    });
  }

  if (!profile.timezone || profile.timezone.trim() === "") {
    issues.push({
      field: "timezone",
      message: "เขตเวลา (Timezone) ต้องไม่ว่างเปล่า",
      severity: "error"
    });
  }

  return {
    isValid: issues.filter(issue => issue.severity === "error").length === 0,
    issues
  };
}

/**
 * Wraps raw birth profile data into an envelope ready for storage.
 */
export function buildAstroBirthProfileStorageEnvelope(profile: AstroBirthProfile): AstroBirthProfileStorageEnvelope {
  return {
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: {
      ...profile,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Loads the stored birth profile from LocalStorage.
 * If missing, corrupted, or invalid, safely falls back to the default profile.
 */
export function loadAstroBirthProfile(): AstroBirthProfile {
  if (typeof window === "undefined") {
    return buildDefaultAstroBirthProfile();
  }

  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return buildDefaultAstroBirthProfile();
    }

    const envelope = JSON.parse(serialized) as AstroBirthProfileStorageEnvelope;
    if (
      envelope &&
      envelope.version !== undefined &&
      envelope.data !== undefined &&
      typeof envelope.data === "object"
    ) {
      return envelope.data;
    }

    // Fallback for flat storage structure (if any exists)
    const rawData = envelope as unknown as AstroBirthProfile;
    if (rawData.birthDate && rawData.birthTime && rawData.birthPlace) {
      return rawData;
    }

    return buildDefaultAstroBirthProfile();
  } catch (error) {
    console.error("AstroRealAppBirthProfileStorageAdapter: Failed to load/parse birth profile.", error);
    return buildDefaultAstroBirthProfile();
  }
}

/**
 * Saves a validated birth profile to LocalStorage under the dedicated preview namespace.
 */
export function saveAstroBirthProfile(profile: AstroBirthProfile): AstroBirthProfilePersistenceResult {
  if (typeof window === "undefined") {
    return { success: false, error: "Cannot access localStorage on SSR server environment" };
  }

  const validation = validateAstroBirthProfile(profile);
  if (!validation.isValid) {
    const errorMsg = validation.issues.map(i => i.message).join(", ");
    return { success: false, error: `ข้อมูลไม่ผ่านการตรวจสอบความถูกต้อง: ${errorMsg}` };
  }

  try {
    const envelope = buildAstroBirthProfileStorageEnvelope(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return { success: true, profile: envelope.data };
  } catch (error) {
    console.error("AstroRealAppBirthProfileStorageAdapter: Failed to save birth profile.", error);
    const errorMsg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูลลง LocalStorage";
    return { success: false, error: errorMsg };
  }
}

/**
 * Resets the stored birth profile back to the hardcoded default.
 */
export function resetAstroBirthProfileToDefault(): AstroBirthProfilePersistenceResult {
  const defaultProfile = buildDefaultAstroBirthProfile();
  return saveAstroBirthProfile(defaultProfile);
}

/**
 * Clears the birth profile key entirely (Preview use only).
 */
export function clearAstroBirthProfileForPreviewOnly(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("AstroRealAppBirthProfileStorageAdapter: Failed to clear birth profile.", error);
  }
}
