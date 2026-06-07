import { MigrationDryRunReport, MigrationKeyMapping } from "./astroRealAppTypes";

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
