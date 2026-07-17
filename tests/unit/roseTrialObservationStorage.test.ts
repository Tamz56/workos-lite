import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  RoseTrialObservation,
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationContext,
} from "@/components/workspaces/travel/rose-trial/observationTypes";
import {
  createEmptyObservationStore,
  loadObservationStore,
  parseObservationStore,
  ROSE_TRIAL_OBSERVATION_STORAGE_KEY,
  saveObservationStore,
  serializeObservationStore,
} from "@/components/workspaces/travel/rose-trial/observationStorage";

const context: RoseTrialObservationValidationContext = {
  batchId: "batch-1",
  treatments: [{ id: "t0", batchId: "batch-1" }],
  samples: [{ id: "sample-1", batchId: "batch-1", treatmentId: "t0" }],
};

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-1",
    batchId: "batch-1",
    trialDay: 0,
    observedAt: "2026-07-11T09:00:00.000Z",
    scope: "sample",
    sampleId: "sample-1",
    type: "general_condition",
    observedFacts: "กิ่งยังเขียว",
    followUpRequired: false,
    photoIds: [],
    createdAt: "2026-07-11T09:05:00.000Z",
    updatedAt: "2026-07-11T09:05:00.000Z",
    ...overrides,
  };
}

function store(overrides: Partial<RoseTrialObservationStoreV1> = {}): RoseTrialObservationStoreV1 {
  return {
    version: 1,
    observations: [observation()],
    photos: [],
    updatedAt: "2026-07-11T09:05:00.000Z",
    ...overrides,
  };
}

function installStorage(initial?: string, throwOn?: "get" | "set") {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(ROSE_TRIAL_OBSERVATION_STORAGE_KEY, initial);
  const getItem = vi.fn((key: string) => {
    if (throwOn === "get") throw new Error("blocked");
    return values.get(key) ?? null;
  });
  const setItem = vi.fn((key: string, value: string) => {
    if (throwOn === "set") throw new Error("quota");
    values.set(key, value);
  });
  vi.stubGlobal("window", { localStorage: { getItem, setItem } });
  return { values, getItem, setItem };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Rose Trial observation storage", () => {
  it("creates fresh empty stores without timestamps or shared arrays", () => {
    const first = createEmptyObservationStore();
    const second = createEmptyObservationStore();
    first.observations.push(observation());
    expect(second).toEqual({ version: 1, observations: [], photos: [], updatedAt: null });
  });

  it("parses valid V1 and tolerates unknown fields", () => {
    const raw = JSON.stringify({ ...store(), futureField: "ignored" });
    const result = parseObservationStore(raw, context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("valid");
      expect(result.value.observations).toHaveLength(1);
      expect("futureField" in result.value).toBe(false);
    }
  });

  it("distinguishes no data, malformed JSON, unsupported version, and invalid envelope", () => {
    expect(parseObservationStore(null, context)).toMatchObject({ ok: true, status: "empty" });
    expect(parseObservationStore("{", context)).toMatchObject({ ok: false, status: "malformed_json" });
    expect(parseObservationStore(JSON.stringify({ ...store(), version: 2 }), context)).toMatchObject({
      ok: false,
      status: "unsupported_version",
    });
    expect(parseObservationStore(JSON.stringify({ version: 1, observations: {} }), context)).toMatchObject({
      ok: false,
      status: "invalid_envelope",
    });
  });

  it("keeps valid observations and warns about invalid records without rewriting raw storage", () => {
    const raw = JSON.stringify(store({ observations: [observation(), observation({ id: "bad", trialDay: -1 })] }));
    const { values, setItem } = installStorage(raw);
    const before = values.get(ROSE_TRIAL_OBSERVATION_STORAGE_KEY);
    const result = loadObservationStore(context);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("partial");
      expect(result.value.observations.map((record) => record.id)).toEqual(["obs-1"]);
      expect(result.warnings.some((entry) => entry.code === "invalid_trial_day")).toBe(true);
    }
    expect(setItem).not.toHaveBeenCalled();
    expect(values.get(ROSE_TRIAL_OBSERVATION_STORAGE_KEY)).toBe(before);
  });

  it("keeps the first duplicate observation and warns about later records", () => {
    const result = parseObservationStore(JSON.stringify(store({
      observations: [observation({ observedFacts: "first" }), observation({ observedFacts: "second" })],
    })), context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("partial");
      expect(result.value.observations).toHaveLength(1);
      expect(result.value.observations[0].observedFacts).toBe("first");
      expect(result.warnings.map((entry) => entry.code)).toContain("duplicate_observation_id");
    }
  });

  it("drops invalid photo metadata and reconciles broken photo IDs in memory only", () => {
    const raw = JSON.stringify(store({
      observations: [observation({ photoIds: ["photo-good", "photo-missing"] })],
      photos: [
        {
          id: "photo-good",
          observationId: "obs-1",
          filename: "good.jpg",
          sortOrder: 0,
          createdAt: "2026-07-11T09:05:00.000Z",
        },
        {
          id: "photo-bad",
          observationId: "missing",
          filename: "bad.jpg",
          sortOrder: 1,
          createdAt: "2026-07-11T09:05:00.000Z",
        },
      ],
    }));
    const result = parseObservationStore(raw, context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("partial");
      expect(result.value.photos.map((record) => record.id)).toEqual(["photo-good"]);
      expect(result.value.observations[0].photoIds).toEqual(["photo-good"]);
      expect(result.warnings.map((entry) => entry.code)).toContain("broken_photo_reference");
    }
  });

  it("loads without writing and is SSR-safe without window", () => {
    const installed = installStorage(JSON.stringify(store()));
    expect(loadObservationStore(context)).toMatchObject({ ok: true, status: "valid" });
    expect(installed.getItem).toHaveBeenCalledTimes(1);
    expect(installed.setItem).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
    expect(loadObservationStore(context)).toMatchObject({ ok: true, status: "empty" });
  });

  it("returns structured storage-unavailable errors", () => {
    installStorage(undefined, "get");
    expect(loadObservationStore(context)).toMatchObject({ ok: false, status: "storage_unavailable" });
  });

  it("saves only a valid store and preserves caller-provided timestamps", () => {
    const installed = installStorage();
    const value = store();
    expect(saveObservationStore(value, context)).toEqual({ ok: true });
    expect(installed.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(installed.values.get(ROSE_TRIAL_OBSERVATION_STORAGE_KEY) ?? "{}").updatedAt).toBe(value.updatedAt);
  });

  it("rejects invalid stores before writing", () => {
    const installed = installStorage();
    const result = saveObservationStore(store({ observations: [observation({ trialDay: -1 })] }), context);
    expect(result).toMatchObject({ ok: false, error: { code: "invalid_store" } });
    expect(installed.setItem).not.toHaveBeenCalled();
  });

  it("returns a structured failure when localStorage setItem fails", () => {
    installStorage(undefined, "set");
    expect(saveObservationStore(store(), context)).toMatchObject({
      ok: false,
      error: { code: "storage_unavailable" },
    });
  });

  it("returns a structured failure when serialization fails", () => {
    const installed = installStorage();
    const value = store() as RoseTrialObservationStoreV1 & { cycle?: unknown };
    value.cycle = value;
    expect(saveObservationStore(value, context)).toMatchObject({
      ok: false,
      error: { code: "serialization_failed" },
    });
    expect(installed.setItem).not.toHaveBeenCalled();
  });

  it("serializes deterministically without adding fields or current timestamps", () => {
    expect(serializeObservationStore(createEmptyObservationStore())).toBe(
      '{"version":1,"observations":[],"photos":[],"updatedAt":null}'
    );
  });
});
