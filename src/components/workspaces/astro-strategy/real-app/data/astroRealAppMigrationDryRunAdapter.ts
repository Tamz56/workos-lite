import { MigrationDryRunReport, MigrationKeyMapping, MigrationExecutionResult, MigrationExecutionItem } from "./astroRealAppTypes";

/**
 * Safely parses legacy JSON strings.
 */
export function safeParseLegacyJson(jsonStr: string | null): unknown {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.warn("safeParseLegacyJson: failed to parse legacy JSON", error);
    return null;
  }
}

/**
 * Inspects a specific legacy-to-target key mapping.
 * Never writes or modifies localStorage.
 */
export function inspectMigrationKeyMapping(
  legacyKey: string,
  targetKey: string
): MigrationKeyMapping {
  if (typeof window === "undefined") {
    return {
      legacyKey,
      targetKey,
      legacyExists: false,
      targetExists: false,
      status: "missing-legacy",
      bytesDetected: 0,
      notes: "ไม่สามารถเข้าถึง localStorage ในฝั่ง Server"
    };
  }

  const legacyVal = localStorage.getItem(legacyKey);
  const targetVal = localStorage.getItem(targetKey);

  const legacyExists = legacyVal !== null;
  const targetExists = targetVal !== null;
  const bytesDetected = legacyVal ? legacyVal.length : 0;

  let status: MigrationKeyMapping["status"] = "ready";
  let notes = "พร้อมโอนย้าย";
  let itemCount: number | undefined = undefined;

  if (!legacyExists) {
    status = "missing-legacy";
    notes = "คีย์ข้อมูลเดิมไม่มีอยู่ในระบบ (ไม่มีข้อมูลประวัติ)";
  } else if (targetExists) {
    status = "skip-target-exists";
    notes = "มีข้อมูลในเนมสเปซแอปใหม่แล้ว ข้ามการย้ายเพื่อป้องกันการเขียนทับ";
  } else {
    // Check if the legacy data can be parsed
    try {
      const parsed = JSON.parse(legacyVal!);
      if (Array.isArray(parsed)) {
        itemCount = parsed.length;
      } else if (parsed && typeof parsed === "object") {
        itemCount = 1;
      } else {
        itemCount = 1; // Primitive value (string/number)
      }
    } catch {
      status = "parse-error";
      notes = "รูปแบบข้อมูลเดิมผิดพลาด หรือไม่สามารถแปลงเป็น JSON ได้";
    }
  }

  return {
    legacyKey,
    targetKey,
    legacyExists,
    targetExists,
    itemCount,
    status,
    notes,
    bytesDetected
  };
}

/**
 * Builds the read-only migration dry-run report.
 * Scans all documented legacy keys and targets.
 * NEVER writes or modifies localStorage.
 */
export function buildLegacyMigrationDryRunReport(): MigrationDryRunReport {
  const mappingsToScan = [
    {
      legacy: "astro-strategy:reflection-history:v1",
      target: "astro-real-app:reflection-history:v1"
    },
    {
      legacy: "astro-strategy:planning-notes:v1",
      target: "astro-real-app:planning-notes:v1"
    },
    {
      legacy: "astro-strategy:reflection-log:v1",
      target: "astro-real-app:reflection-draft:v1"
    },
    {
      legacy: "astro.strategy.reflections",
      target: "astro-real-app:reflection-history:v1"
    },
    {
      legacy: "astro.strategy.birthDate",
      target: "astro-real-app:birth-profile:v1"
    },
    {
      legacy: "astro.strategy.birthTime",
      target: "astro-real-app:birth-profile:v1"
    },
    {
      legacy: "astro.strategy.birthPlace",
      target: "astro-real-app:birth-profile:v1"
    },
    {
      legacy: "astro.strategy.cycleGoal",
      target: "astro-real-app:cycle-config:v1"
    },
    {
      legacy: "astro.strategy.cyclePeriod",
      target: "astro-real-app:cycle-config:v1"
    }
  ];

  const mappings = mappingsToScan.map(m =>
    inspectMigrationKeyMapping(m.legacy, m.target)
  );

  const legacyKeysFound = mappings
    .filter(m => m.legacyExists)
    .map(m => m.legacyKey);

  const migrationNeeded = mappings.some(m => m.status === "ready");

  return {
    timestamp: new Date().toISOString(),
    dryRun: true,
    status: "success",
    migrationNeeded,
    legacyKeysFound,
    mappings
  };
}

/**
 * Copies legacy data key into empty target key if valid and target is empty.
 * Never deletes the legacy key.
 */
export function copyLegacyKeyToTargetIfEmpty(
  legacyKey: string,
  targetKey: string
): MigrationExecutionItem {
  if (typeof window === "undefined") {
    return {
      legacyKey,
      targetKey,
      status: "failed",
      error: "ไม่สามารถเข้าถึง localStorage ในฝั่ง Server"
    };
  }

  try {
    // 1. Inspect status
    const mapping = inspectMigrationKeyMapping(legacyKey, targetKey);
    if (mapping.status === "missing-legacy") {
      return { legacyKey, targetKey, status: "skipped-missing-legacy" };
    }
    if (mapping.status === "skip-target-exists") {
      return { legacyKey, targetKey, status: "skipped-target-exists" };
    }
    if (mapping.status === "parse-error") {
      return { legacyKey, targetKey, status: "skipped-parse-error" };
    }
    if (mapping.status !== "ready") {
      return { legacyKey, targetKey, status: "skipped-not-ready" };
    }

    // 2. Read legacy value
    const legacyVal = localStorage.getItem(legacyKey);
    if (legacyVal === null) {
      return { legacyKey, targetKey, status: "skipped-missing-legacy" };
    }

    // 3. Double check target presence immediately before write
    const targetVal = localStorage.getItem(targetKey);
    if (targetVal !== null) {
      return { legacyKey, targetKey, status: "skipped-target-exists" };
    }

    // 4. Copy data safely
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(legacyVal);
      // Check if it fits the payload wrapper structure
      if (
        parsedData &&
        typeof parsedData === "object" &&
        "version" in parsedData &&
        "data" in parsedData
      ) {
        // Already versioned, write directly
        localStorage.setItem(targetKey, legacyVal);
        return {
          legacyKey,
          targetKey,
          status: "copied",
          bytesTransferred: legacyVal.length
        };
      }
    } catch {
      // Primitive fallback
      parsedData = legacyVal;
    }

    // Wrap in standard payload envelope
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      data: parsedData
    };
    const stringified = JSON.stringify(payload);
    localStorage.setItem(targetKey, stringified);

    return {
      legacyKey,
      targetKey,
      status: "copied",
      bytesTransferred: stringified.length
    };
  } catch (error) {
    const err = error as Error;
    return {
      legacyKey,
      targetKey,
      status: "failed",
      error: err?.message || String(error)
    };
  }
}

/**
 * Runs controlled migration for all ready keys.
 * Never deletes any legacy keys.
 */
export function migrateReadyLegacyKeysWithConfirmation(): MigrationExecutionResult {
  const mappingsToMigrate = [
    {
      legacy: "astro-strategy:reflection-history:v1",
      target: "astro-real-app:reflection-history:v1"
    },
    {
      legacy: "astro-strategy:planning-notes:v1",
      target: "astro-real-app:planning-notes:v1"
    },
    {
      legacy: "astro-strategy:reflection-log:v1",
      target: "astro-real-app:reflection-draft:v1"
    },
    {
      legacy: "astro.strategy.reflections",
      target: "astro-real-app:reflection-history:v1"
    },
    {
      legacy: "astro.strategy.birthDate",
      target: "astro-real-app:birth-profile:v1"
    },
    {
      legacy: "astro.strategy.birthTime",
      target: "astro-real-app:birth-profile:v1"
    },
    {
      legacy: "astro.strategy.birthPlace",
      target: "astro-real-app:birth-profile:v1"
    },
    {
      legacy: "astro.strategy.cycleGoal",
      target: "astro-real-app:cycle-config:v1"
    },
    {
      legacy: "astro.strategy.cyclePeriod",
      target: "astro-real-app:cycle-config:v1"
    }
  ];

  const items: MigrationExecutionItem[] = [];
  let copiedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const m of mappingsToMigrate) {
    const res = copyLegacyKeyToTargetIfEmpty(m.legacy, m.target);
    if (res.status === "copied") {
      copiedCount++;
    } else if (res.status === "failed") {
      failedCount++;
    } else {
      skippedCount++;
    }
    items.push(res);
  }

  return {
    timestamp: new Date().toISOString(),
    copiedCount,
    skippedCount,
    failedCount,
    items
  };
}
