import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ROSE_TRIAL_RESET_MARKER_KEY,
  ROSE_TRIAL_RESET_INDEXEDDB_TARGET,
  canConfirmRoseTrialCompleteReset,
  resetRoseTrialCompletely,
  type RoseTrialCompleteResetDependencies,
  type RoseTrialResetPhase,
} from "@/components/workspaces/travel/rose-trial/completeReset";
import { DAY0_STORAGE_KEY } from "@/components/workspaces/travel/rose-trial/day-0/storage";
import { ROSE_TRIAL_OBSERVATION_STORAGE_KEY } from "@/components/workspaces/travel/rose-trial/observationStorage";
import { ROSE_TRIAL_STORAGE_KEY } from "@/components/workspaces/travel/rose-trial/storage";

interface PhotoRecord {
  id: string;
  state: "pending" | "committed";
}

function installLocalStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  const events: string[] = [];

  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        events.push(`set:${key}`);
        values.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        events.push(`remove:${key}`);
        values.delete(key);
      }),
    },
  });

  return { values, events };
}

function createPhotoDependencies(
  photos: PhotoRecord[],
  events: string[] = []
): Pick<
  RoseTrialCompleteResetDependencies,
  "clearPhotoBlobs" | "photoBlobsAreEmpty"
> {
  return {
    clearPhotoBlobs: vi.fn(async () => {
      events.push("clear:photo_blobs");
      const deletedCount = photos.length;
      photos.splice(0, photos.length);
      return { ok: true as const, value: { deletedCount } };
    }),
    photoBlobsAreEmpty: vi.fn(async () => ({
      ok: true as const,
      value: photos.length === 0,
    })),
  };
}

interface DependencyState {
  marker: RoseTrialResetPhase | null;
  observations: boolean;
  photos: PhotoRecord[];
  day0: boolean;
  preparation: boolean;
}

function createDependencyHarness(
  state: DependencyState,
  failures: Partial<Record<
    "marker" | "observations" | "photo_blobs" | "day0" | "preparation" | "verification" | "marker_cleanup",
    number
  >> = {}
) {
  const events: string[] = [];
  const remainingFailures = { ...failures };
  const shouldFail = (phase: keyof typeof remainingFailures): boolean => {
    const remaining = remainingFailures[phase] ?? 0;
    if (remaining <= 0) return false;
    remainingFailures[phase] = remaining - 1;
    return true;
  };

  const dependencies: RoseTrialCompleteResetDependencies = {
    writeMarker: vi.fn((phase) => {
      events.push(`marker:${phase}`);
      if (shouldFail("marker")) return false;
      state.marker = phase;
      return true;
    }),
    clearMarker: vi.fn(() => {
      events.push("clear:marker");
      if (shouldFail("marker_cleanup")) return false;
      state.marker = null;
      return true;
    }),
    clearObservations: vi.fn(() => {
      events.push("clear:observations");
      if (shouldFail("observations")) return false;
      state.observations = false;
      return true;
    }),
    observationsAreEmpty: vi.fn(() => !state.observations),
    clearPhotoBlobs: vi.fn(async () => {
      events.push("clear:photo_blobs");
      if (shouldFail("photo_blobs")) {
        return { ok: false as const, error: { code: "transaction_failed" as const } };
      }
      const deletedCount = state.photos.length;
      state.photos = [];
      return { ok: true as const, value: { deletedCount } };
    }),
    photoBlobsAreEmpty: vi.fn(async () => ({
      ok: true as const,
      value: shouldFail("verification") ? false : state.photos.length === 0,
    })),
    clearDay0: vi.fn(() => {
      events.push("clear:day0");
      if (shouldFail("day0")) return false;
      state.day0 = false;
      return true;
    }),
    day0IsEmpty: vi.fn(() => !state.day0),
    clearPreparation: vi.fn(() => {
      events.push("clear:preparation");
      if (shouldFail("preparation")) return false;
      state.preparation = false;
      return true;
    }),
    preparationIsEmpty: vi.fn(() => !state.preparation),
  };

  return { dependencies, events };
}

function fullState(): DependencyState {
  return {
    marker: null,
    observations: true,
    photos: [
      { id: "pending-photo", state: "pending" },
      { id: "committed-photo", state: "committed" },
    ],
    day0: true,
    preparation: true,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Rose Trial complete reset", () => {
  it("allowlists only the dedicated Rose Trial photo database and object store", () => {
    expect(ROSE_TRIAL_RESET_INDEXEDDB_TARGET).toEqual({
      databaseName: "gf-rose-trial-photo-evidence",
      objectStoreName: "photoBlobs",
    });
  });

  it("removes every Rose Trial persistence boundary and deletes Preparation last", async () => {
    const storage = installLocalStorage({
      [ROSE_TRIAL_STORAGE_KEY]: JSON.stringify({
        checklistItems: ["ready"],
        inventory: ["clonex"],
        treatments: ["T0", "T1"],
        samples: ["W-T0-01"],
        pilotStart: { started: true },
      }),
      [DAY0_STORAGE_KEY]: JSON.stringify({
        status: "completed",
        batch: { batchName: "Rose-Test-01" },
        cuttingSetup: { actualCuttingCount: 8 },
        trialUnits: [{ id: "cutting-1" }],
        observation: { directObservation: "Day 0" },
        trialSnapshot: { batchName: "Rose-Test-01" },
        deviations: [{ id: "dev-1" }],
      }),
      [ROSE_TRIAL_OBSERVATION_STORAGE_KEY]: JSON.stringify({
        observations: [{ id: "obs-1", photoIds: ["pending-photo", "committed-photo"] }],
        photos: [
          { id: "pending-photo", observationId: "obs-1" },
          { id: "committed-photo", observationId: "obs-1" },
        ],
      }),
      "gf:planner:v1": "planner-preserved",
      "gf:operational-import:v1": "import-preserved",
      "workos:unrelated": "unrelated-preserved",
    });
    const photos: PhotoRecord[] = [
      { id: "pending-photo", state: "pending" },
      { id: "committed-photo", state: "committed" },
    ];
    const photoDependencies = createPhotoDependencies(photos, storage.events);

    const result = await resetRoseTrialCompletely(photoDependencies);

    expect(result).toMatchObject({
      ok: true,
      deletedPhotoBlobCount: 2,
      completedPhases: [
        "marker",
        "observations",
        "photo_blobs",
        "day0",
        "preparation",
        "verification",
        "marker_cleanup",
      ],
    });
    expect(photos).toEqual([]);
    expect(storage.values.has(ROSE_TRIAL_OBSERVATION_STORAGE_KEY)).toBe(false);
    expect(storage.values.has(DAY0_STORAGE_KEY)).toBe(false);
    expect(storage.values.has(ROSE_TRIAL_STORAGE_KEY)).toBe(false);
    expect(storage.values.has(ROSE_TRIAL_RESET_MARKER_KEY)).toBe(false);
    expect(storage.values.get("gf:planner:v1")).toBe("planner-preserved");
    expect(storage.values.get("gf:operational-import:v1")).toBe("import-preserved");
    expect(storage.values.get("workos:unrelated")).toBe("unrelated-preserved");

    const observationIndex = storage.events.indexOf(`remove:${ROSE_TRIAL_OBSERVATION_STORAGE_KEY}`);
    const photoIndex = storage.events.indexOf("clear:photo_blobs");
    const day0Index = storage.events.indexOf(`remove:${DAY0_STORAGE_KEY}`);
    const preparationIndex = storage.events.indexOf(`remove:${ROSE_TRIAL_STORAGE_KEY}`);
    expect(observationIndex).toBeLessThan(photoIndex);
    expect(photoIndex).toBeLessThan(day0Index);
    expect(day0Index).toBeLessThan(preparationIndex);
  });

  it.each(["draft", "completed"] as const)(
    "removes %s Day 0 state without recreating it",
    async (status) => {
      const storage = installLocalStorage({
        [ROSE_TRIAL_STORAGE_KEY]: "{}",
        [DAY0_STORAGE_KEY]: JSON.stringify({ status }),
        [ROSE_TRIAL_OBSERVATION_STORAGE_KEY]: "{}",
      });

      const result = await resetRoseTrialCompletely(createPhotoDependencies([]));

      expect(result.ok).toBe(true);
      expect(storage.values.has(DAY0_STORAGE_KEY)).toBe(false);
    }
  );

  it("is idempotent across repeated calls", async () => {
    installLocalStorage({});
    const photoDependencies = createPhotoDependencies([]);

    await expect(resetRoseTrialCompletely(photoDependencies)).resolves.toMatchObject({ ok: true });
    await expect(resetRoseTrialCompletely(photoDependencies)).resolves.toMatchObject({
      ok: true,
      deletedPhotoBlobCount: 0,
    });
  });

  it("stops before photo, Day 0, and Preparation cleanup when Observation deletion fails", async () => {
    const state = fullState();
    const { dependencies } = createDependencyHarness(state, { observations: 1 });

    const result = await resetRoseTrialCompletely(dependencies);

    expect(result).toMatchObject({ ok: false, failedPhase: "observations", retryable: true });
    expect(state.photos).toHaveLength(2);
    expect(state.day0).toBe(true);
    expect(state.preparation).toBe(true);
  });

  it("stops before Day 0 and Preparation when IndexedDB deletion fails", async () => {
    const state = fullState();
    const { dependencies } = createDependencyHarness(state, { photo_blobs: 1 });

    const result = await resetRoseTrialCompletely(dependencies);

    expect(result).toMatchObject({ ok: false, failedPhase: "photo_blobs" });
    expect(state.observations).toBe(false);
    expect(state.day0).toBe(true);
    expect(state.preparation).toBe(true);
  });

  it("keeps Preparation available when Day 0 deletion fails", async () => {
    const state = fullState();
    const { dependencies } = createDependencyHarness(state, { day0: 1 });

    const result = await resetRoseTrialCompletely(dependencies);

    expect(result).toMatchObject({ ok: false, failedPhase: "day0" });
    expect(state.day0).toBe(true);
    expect(state.preparation).toBe(true);
  });

  it("reports Preparation deletion failure without claiming success", async () => {
    const state = fullState();
    const { dependencies } = createDependencyHarness(state, { preparation: 1 });

    const result = await resetRoseTrialCompletely(dependencies);

    expect(result).toMatchObject({ ok: false, failedPhase: "preparation" });
    expect(state.day0).toBe(false);
    expect(state.preparation).toBe(true);
    expect(state.marker).toBe("preparation");
  });

  it("retries safely from a partial state and finishes remaining idempotent phases", async () => {
    const state = fullState();
    const { dependencies } = createDependencyHarness(state, { photo_blobs: 1 });

    await expect(resetRoseTrialCompletely(dependencies)).resolves.toMatchObject({
      ok: false,
      failedPhase: "photo_blobs",
    });
    await expect(resetRoseTrialCompletely(dependencies)).resolves.toMatchObject({ ok: true });

    expect(state).toEqual({
      marker: null,
      observations: false,
      photos: [],
      day0: false,
      preparation: false,
    });
  });

  it("fails final post-delete verification and retains the marker when a store is not empty", async () => {
    const state = fullState();
    const { dependencies } = createDependencyHarness(state);
    dependencies.photoBlobsAreEmpty = vi.fn()
      .mockResolvedValueOnce({ ok: true as const, value: true })
      .mockResolvedValueOnce({ ok: true as const, value: false });

    const result = await resetRoseTrialCompletely(dependencies);

    expect(result).toMatchObject({ ok: false, failedPhase: "verification" });
    expect(state.marker).toBe("verification");
  });

  it("reports marker cleanup failure after data deletion and can retry", async () => {
    const state = fullState();
    const { dependencies } = createDependencyHarness(state, { marker_cleanup: 1 });

    await expect(resetRoseTrialCompletely(dependencies)).resolves.toMatchObject({
      ok: false,
      failedPhase: "marker_cleanup",
    });
    expect(state.preparation).toBe(false);
    expect(state.marker).toBe("marker_cleanup");

    await expect(resetRoseTrialCompletely(dependencies)).resolves.toMatchObject({ ok: true });
    expect(state.marker).toBe(null);
  });
});

describe("Rose Trial complete reset confirmation", () => {
  it("requires acknowledgement and disables confirmation while reset is running", () => {
    expect(canConfirmRoseTrialCompleteReset(false, false)).toBe(false);
    expect(canConfirmRoseTrialCompleteReset(true, false)).toBe(true);
    expect(canConfirmRoseTrialCompleteReset(true, true)).toBe(false);
    expect(canConfirmRoseTrialCompleteReset(false, true)).toBe(false);
  });

  it("wires the acknowledgement checkbox, running guard, and permanent-delete copy into the client", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/workspaces/travel/rose-trial/RoseTrialLabClient.tsx"
      ),
      "utf8"
    );

    expect(source).toContain('type="checkbox"');
    expect(source).toContain("resetAcknowledged");
    expect(source).toContain("resetInFlightRef.current");
    expect(source).toContain("Planner และข้อมูล WorkOS โมดูลอื่นจะไม่ถูกลบ");
    expect(source).toContain("การกระทำนี้ไม่สามารถย้อนกลับได้");
    expect(source).toContain("Observations และรูปภาพที่แนบทั้งหมด");
    expect(source).toContain(
      "disabled={!canConfirmRoseTrialCompleteReset(resetAcknowledged, resetRunning)}"
    );
  });
});
