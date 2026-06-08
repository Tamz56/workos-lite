/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AstroDataExportEnvelope,
  AstroDataExportPayload,
  AstroDataImportDryRunReport,
  AstroDataImportKeyStatus,
  AstroDataImportValidationIssue,
  AstroDataRestoreMode,
  AstroDataRestoreResult,
  AstroDataRestoreKeyResult
} from "./astroRealAppTypes";
import { validateAstroBirthProfile } from "./astroRealAppBirthProfileStorageAdapter";

const ALLOWED_KEYS = [
  "astro-real-app:birth-profile:v1",
  "astro-real-app:reflection-history:v1",
  "astro-real-app:planning-notes:v1",
  "astro-real-app:reflection-draft:v1",
  "astro-real-app:onboarding:v1"
];

/**
 * Validates whether the list of keys is clean of forbidden namespaces.
 */
export function validateAllowedRestoreKeys(keys: string[]): boolean {
  return keys.every(key => ALLOWED_KEYS.includes(key));
}

/**
 * Validates the metadata and schema validation structure of the import file.
 */
export function validateAstroDataImportEnvelope(envelope: any): AstroDataImportValidationIssue[] {
  const issues: AstroDataImportValidationIssue[] = [];

  if (!envelope) {
    issues.push({ severity: "error", message: "ไม่พบข้อมูลในไฟล์สำรองหรือไฟล์ว่างเปล่า" });
    return issues;
  }

  if (typeof envelope !== "object") {
    issues.push({ severity: "error", message: "โครงสร้างไฟล์ข้อมูลไม่ใช่ Object" });
    return issues;
  }

  // Schema format validation
  if (envelope.$schema !== "https://arbor-desk.com/schemas/astro-strategy-backup-v1.json") {
    issues.push({
      severity: "error",
      message: "ไม่สามารถใช้ไฟล์นี้ได้ เนื่องจากฟิลด์ $schema ไม่ใช่สกีมาสำรองที่ได้รับการยืนยัน"
    });
  }

  // Metadata check
  if (!envelope.metadata) {
    issues.push({ severity: "error", message: "ไม่พบข้อมูล Meta (metadata) ในไฟล์สำรอง" });
  } else {
    const meta = envelope.metadata;
    if (meta.appName !== "Astro Strategy Lab") {
      issues.push({
        severity: "error",
        message: `แอปพลิเคชันต้นทางไม่ใช่ Astro Strategy Lab (พบ: ${meta.appName || "ไม่ทราบชื่อ"})`
      });
    }
    if (meta.exportVersion !== 1) {
      issues.push({
        severity: "error",
        message: `เวอร์ชันการส่งออกไม่ใช่รุ่นที่รองรับ (พบ: ${meta.exportVersion || "ไม่พบฟิลด์"})`
      });
    }
  }

  // Data check
  if (!envelope.data) {
    issues.push({ severity: "error", message: "ไม่พบส่วนของข้อมูล (data) ในไฟล์สำรอง" });
    return issues;
  }

  const payload = envelope.data;
  // Check if any keys are forbidden
  const backupKeys = Object.keys(payload);
  for (const key of backupKeys) {
    if (!ALLOWED_KEYS.includes(key)) {
      issues.push({
        severity: "error",
        key,
        message: `คีย์ "${key}" ไม่ได้รับอนุญาตให้นำเข้าเข้าระบบหลัก และถูกบล็อกจากการกู้คืน`
      });
    }
  }

  // Individual key schema checks
  for (const key of ALLOWED_KEYS) {
    const item = payload[key];
    if (item === undefined) {
      continue;
    }
    if (item === null) {
      continue;
    }

    if (typeof item !== "object") {
      issues.push({
        severity: "error",
        key,
        message: `โครงสร้างข้อมูลภายใต้คีย์ "${key}" ในไฟล์ไม่ใช่ Object`
      });
      continue;
    }

    // Check version wrapper (except reflection-draft:v1 which could be null or object directly)
    if (key !== "astro-real-app:reflection-draft:v1") {
      if (!("version" in item) || !("data" in item)) {
        issues.push({
          severity: "error",
          key,
          message: `คีย์ "${key}" ไม่มีโครงสร้าง Wrapper { version, data } ตามมาตรฐาน`
        });
        continue;
      }
    }

    // Individual schema content checks
    if (key === "astro-real-app:birth-profile:v1") {
      const bpData = item.data;
      if (!bpData || typeof bpData !== "object") {
        issues.push({ severity: "error", key, message: "โปรไฟล์ดวงเกิดดวงในไฟล์มีค่าว่างเปล่า" });
      } else {
        const bpValidation = validateAstroBirthProfile(bpData);
        if (!bpValidation.isValid) {
          bpValidation.issues.forEach(bpIssue => {
            issues.push({
              severity: "error",
              key,
              message: `โปรไฟล์วันเกิดมีข้อผิดพลาด: ${bpIssue.message}`
            });
          });
        }
      }
    } else if (key === "astro-real-app:reflection-history:v1") {
      const historyData = item.data;
      if (!Array.isArray(historyData)) {
        issues.push({ severity: "error", key, message: "ข้อมูลประวัติสะท้อนคิดในไฟล์ไม่ใช่ Array" });
      } else {
        historyData.forEach((historyItem: any, idx: number) => {
          if (!historyItem || typeof historyItem !== "object") {
            issues.push({ severity: "error", key, message: `รายการที่ ${idx + 1} ในประวัติสะสมไม่ใช่ Object` });
          } else {
            if (!historyItem.id) {
              issues.push({ severity: "error", key, message: `รายการที่ ${idx + 1} ในประวัติสะสมไม่มีฟิลด์ id` });
            }
            if (!historyItem.reflectionDate) {
              issues.push({ severity: "error", key, message: `รายการที่ ${idx + 1} ในประวัติสะสมไม่มีฟิลด์ reflectionDate` });
            }
          }
        });
      }
    } else if (key === "astro-real-app:planning-notes:v1") {
      const notesData = item.data;
      if (!notesData || typeof notesData !== "object") {
        issues.push({ severity: "error", key, message: "ข้อมูลแผนยุทธศาสตร์ในไฟล์ไม่ใช่ Object" });
      } else {
        const required = ["focusNext", "slowDown", "nextSmallAction", "reviewLater"];
        required.forEach(f => {
          if (!(f in notesData)) {
            issues.push({ severity: "warning", key, message: `แผนเชิงกลยุทธ์ในไฟล์ไม่มีฟิลด์ "${f}"` });
          }
        });
      }
    } else if (key === "astro-real-app:onboarding:v1") {
      const isDismissed = item.isDismissed ?? item.data?.isDismissed;
      if (isDismissed === undefined && !("isDismissed" in item)) {
        issues.push({ severity: "warning", key, message: "คีย์ onboarding ในไฟล์ไม่มีฟิลด์ isDismissed" });
      }
    }
  }

  return issues;
}

/**
 * Checks backup data with current storage to detect missing/conflicts.
 */
export function compareImportPayloadWithCurrentStorage(payload: AstroDataExportPayload): AstroDataImportKeyStatus[] {
  if (typeof window === "undefined") {
    return ALLOWED_KEYS.map(key => ({
      key,
      existsInBackup: false,
      existsInCurrentStorage: false,
      backupBytes: 0,
      currentBytes: 0,
      status: "missing_in_backup",
      notes: "Cannot check storage on SSR"
    }));
  }

  return ALLOWED_KEYS.map(key => {
    const backupVal = payload[key];
    const rawCurrent = localStorage.getItem(key);
    
    const existsInBackup = backupVal !== undefined && backupVal !== null;
    const existsInCurrentStorage = rawCurrent !== null;
    
    const backupBytes = existsInBackup ? JSON.stringify(backupVal).length : 0;
    const currentBytes = existsInCurrentStorage ? rawCurrent.length : 0;
    
    let status: AstroDataImportKeyStatus["status"] = "new";
    let notes = "";

    if (!existsInBackup) {
      status = "missing_in_backup";
      notes = "ไม่มีข้อมูลในไฟล์สำรองข้อมูล";
    } else if (!existsInCurrentStorage) {
      status = "new";
      notes = "พร้อมนำเข้าเป็นข้อมูลใหม่ (ยังไม่มีคีย์นี้ในเครื่อง)";
    } else {
      const backupStr = JSON.stringify(backupVal);
      let parsedCurrent: any = null;
      try {
        parsedCurrent = JSON.parse(rawCurrent);
      } catch {
        status = "malformed";
        notes = "คีย์เดิมในเครื่องปัจจุบันชำรุด (JSON parsing failed)";
      }

      if (status !== "malformed") {
        const currentStr = JSON.stringify(parsedCurrent);
        if (backupStr === currentStr) {
          status = "match";
          notes = "ข้อมูลเหมือนกับข้อมูลในเครื่องปัจจุบัน";
        } else {
          status = "diff";
          notes = "ข้อมูลแตกต่างไปจากข้อมูลในเครื่องปัจจุบัน (ความขัดแย้งของข้อมูล)";
        }
      }
    }

    return {
      key,
      existsInBackup,
      existsInCurrentStorage,
      backupBytes,
      currentBytes,
      status,
      notes
    };
  });
}

/**
 * Builds the dry run report for visual preview before import.
 */
export function buildAstroDataImportDryRunReport(jsonText: string): AstroDataImportDryRunReport {
  if (!jsonText || jsonText.trim() === "") {
    return {
      isValid: false,
      validationIssues: [{ severity: "error", message: "ไฟล์สำรองเป็นค่าว่างเปล่า" }],
      keyStatuses: []
    };
  }

  try {
    const envelope = JSON.parse(jsonText);
    const validationIssues = validateAstroDataImportEnvelope(envelope);
    const isValid = !validationIssues.some(issue => issue.severity === "error");
    
    const data = envelope.data || {};
    const keyStatuses = compareImportPayloadWithCurrentStorage(data);

    return {
      isValid,
      exportedAt: envelope.metadata?.exportedAt,
      routeContext: envelope.metadata?.routeContext,
      validationIssues,
      keyStatuses,
      metadata: envelope.metadata,
      data
    };
  } catch (error) {
    const err = error as Error;
    return {
      isValid: false,
      validationIssues: [
        { severity: "error", message: `ไวยากรณ์ไฟล์ JSON ผิดพลาด: ${err.message || String(error)}` }
      ],
      keyStatuses: []
    };
  }
}

/**
 * Creates rollback backup snapshot of current keys.
 */
export function createRestoreRollbackSnapshot(): Record<string, string | null> {
  const snapshot: Record<string, string | null> = {};
  if (typeof window === "undefined") return snapshot;

  for (const key of ALLOWED_KEYS) {
    snapshot[key] = localStorage.getItem(key);
  }
  return snapshot;
}

/**
 * Core function executing the restore transaction with atomic rollback.
 */
export async function restoreAstroDataFromImport(
  envelope: AstroDataExportEnvelope,
  mode: AstroDataRestoreMode
): Promise<AstroDataRestoreResult> {
  if (typeof window === "undefined") {
    return {
      success: false,
      mode,
      restoredCount: 0,
      skippedCount: 0,
      failedCount: 0,
      keyResults: [],
      error: "Cannot run restore on server environment"
    };
  }

  // 1. Double check validation
  const validationIssues = validateAstroDataImportEnvelope(envelope);
  const hasErrors = validationIssues.some(issue => issue.severity === "error");
  if (hasErrors) {
    return {
      success: false,
      mode,
      restoredCount: 0,
      skippedCount: 0,
      failedCount: ALLOWED_KEYS.length,
      keyResults: ALLOWED_KEYS.map(k => ({
        key: k,
        status: "failed",
        bytesWritten: 0,
        error: "ข้อมูลไม่ตรงตามข้อกำหนดสกีมา"
      })),
      error: "การนำเข้ายกเลิก เนื่องจากข้อมูลไม่ผ่านการตรวจสอบความถูกต้อง"
    };
  }

  const payload = envelope.data;
  const rollbackSnapshot = createRestoreRollbackSnapshot();
  const keyResults: AstroDataRestoreKeyResult[] = [];
  
  let restoredCount = 0;
  let skippedCount = 0;
  const failedCount = 0;

  try {
    // 2. Perform write transaction
    for (const key of ALLOWED_KEYS) {
      const backupVal = payload[key];
      const hasCurrent = rollbackSnapshot[key] !== null;

      if (backupVal === undefined || backupVal === null) {
        if (mode === "replace") {
          localStorage.removeItem(key);
          keyResults.push({ key, status: "restored", bytesWritten: 0 });
          restoredCount++;
        } else {
          keyResults.push({ key, status: "skipped-empty", bytesWritten: 0 });
          skippedCount++;
        }
        continue;
      }

      if (mode === "merge-safe") {
        if (key === "astro-real-app:reflection-history:v1") {
          const currentRaw = rollbackSnapshot[key];
          let currentList: any[] = [];
          if (currentRaw) {
            try {
              const parsed = JSON.parse(currentRaw);
              currentList = Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
            } catch {
              currentList = [];
            }
          }

          const backupList = Array.isArray((backupVal as any).data) 
            ? (backupVal as any).data 
            : (Array.isArray(backupVal) ? backupVal : []);

          const mergedList = [...currentList];
          backupList.forEach((bItem: any) => {
            const exists = mergedList.some(
              cItem => cItem.id === bItem.id || cItem.reflectionDate === bItem.reflectionDate
            );
            if (!exists) {
              mergedList.push(bItem);
            }
          });

          const mergedEnvelope = {
            version: 1,
            updatedAt: new Date().toISOString(),
            data: mergedList
          };
          
          localStorage.setItem(key, JSON.stringify(mergedEnvelope));
          keyResults.push({
            key,
            status: "merged",
            bytesWritten: JSON.stringify(mergedEnvelope).length
          });
          restoredCount++;
        } else {
          if (hasCurrent) {
            keyResults.push({ key, status: "skipped-exists", bytesWritten: 0 });
            skippedCount++;
          } else {
            localStorage.setItem(key, JSON.stringify(backupVal));
            keyResults.push({ key, status: "restored", bytesWritten: JSON.stringify(backupVal).length });
            restoredCount++;
          }
        }
      } else {
        const rawString = JSON.stringify(backupVal);
        localStorage.setItem(key, rawString);
        keyResults.push({ key, status: "restored", bytesWritten: rawString.length });
        restoredCount++;
      }
    }

    return {
      success: true,
      mode,
      restoredCount,
      skippedCount,
      failedCount,
      keyResults
    };

  } catch (error) {
    const err = error as Error;
    console.error("restoreAstroDataFromImport: Write failure. Executing rollback...", error);
    
    // 3. Rollback immediately
    let rollbackFailed = false;
    for (const key of ALLOWED_KEYS) {
      try {
        const origVal = rollbackSnapshot[key];
        if (origVal === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, origVal);
        }
      } catch (rbErr) {
        console.error(`Rollback failed for key "${key}"`, rbErr);
        rollbackFailed = true;
      }
    }

    return {
      success: false,
      mode,
      restoredCount: 0,
      skippedCount: 0,
      failedCount: ALLOWED_KEYS.length,
      keyResults: ALLOWED_KEYS.map(k => ({
        key: k,
        status: "failed",
        bytesWritten: 0,
        error: `เขียนข้อมูลล้มเหลว: ${err.message || String(error)}`
      })),
      error: `การเขียนข้อมูลล้มเหลว (Rollback ย้อนกลับคืนสภาพเดิมสำเร็จ: ${!rollbackFailed ? "ใช่" : "ไม่"})`
    };
  }
}
