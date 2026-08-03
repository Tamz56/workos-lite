import { clearRoseDay0State, DAY0_STORAGE_KEY } from "./day-0/storage";
import {
  clearObservationStore,
  ROSE_TRIAL_OBSERVATION_STORAGE_KEY,
} from "./observationStorage";
import {
  createPhotoEvidenceStorage,
  PHOTO_EVIDENCE_DATABASE_NAME,
  PHOTO_EVIDENCE_OBJECT_STORE,
  type PhotoEvidenceStorageResult,
} from "./photoEvidenceStorage";
import { clearRoseTrialState, ROSE_TRIAL_STORAGE_KEY } from "./storage";

export const ROSE_TRIAL_RESET_MARKER_KEY = "gf:rose-trial:reset:v1";

export const ROSE_TRIAL_RESET_STORAGE_KEYS = [
  ROSE_TRIAL_OBSERVATION_STORAGE_KEY,
  DAY0_STORAGE_KEY,
  ROSE_TRIAL_STORAGE_KEY,
  ROSE_TRIAL_RESET_MARKER_KEY,
] as const;

export const ROSE_TRIAL_RESET_INDEXEDDB_TARGET = {
  databaseName: PHOTO_EVIDENCE_DATABASE_NAME,
  objectStoreName: PHOTO_EVIDENCE_OBJECT_STORE,
} as const;

export type RoseTrialResetPhase =
  | "marker"
  | "observations"
  | "photo_blobs"
  | "day0"
  | "preparation"
  | "verification"
  | "marker_cleanup";

export type RoseTrialCompleteResetResult =
  | {
      ok: true;
      completedPhases: RoseTrialResetPhase[];
      deletedPhotoBlobCount: number;
    }
  | {
      ok: false;
      failedPhase: RoseTrialResetPhase;
      completedPhases: RoseTrialResetPhase[];
      deletedPhotoBlobCount: number;
      retryable: true;
    };

type PhotoClearResult = PhotoEvidenceStorageResult<{ deletedCount: number }>;
type PhotoEmptyResult = PhotoEvidenceStorageResult<boolean>;

export interface RoseTrialCompleteResetDependencies {
  writeMarker: (phase: RoseTrialResetPhase) => boolean;
  clearMarker: () => boolean;
  clearObservations: () => boolean;
  observationsAreEmpty: () => boolean;
  clearPhotoBlobs: () => Promise<PhotoClearResult>;
  photoBlobsAreEmpty: () => Promise<PhotoEmptyResult>;
  clearDay0: () => boolean;
  day0IsEmpty: () => boolean;
  clearPreparation: () => boolean;
  preparationIsEmpty: () => boolean;
}

function storageKeyIsEmpty(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === null;
  } catch {
    return false;
  }
}

function writeResetMarker(phase: RoseTrialResetPhase): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      ROSE_TRIAL_RESET_MARKER_KEY,
      JSON.stringify({ version: 1, phase })
    );
    return window.localStorage.getItem(ROSE_TRIAL_RESET_MARKER_KEY) !== null;
  } catch {
    return false;
  }
}

function clearResetMarker(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(ROSE_TRIAL_RESET_MARKER_KEY);
    return storageKeyIsEmpty(ROSE_TRIAL_RESET_MARKER_KEY);
  } catch {
    return false;
  }
}

async function withPhotoStorage<T>(
  operation: (
    storage: ReturnType<typeof createPhotoEvidenceStorage>
  ) => Promise<PhotoEvidenceStorageResult<T>>
): Promise<PhotoEvidenceStorageResult<T>> {
  const storage = createPhotoEvidenceStorage();
  try {
    return await operation(storage);
  } finally {
    await storage.close();
  }
}

const DEFAULT_DEPENDENCIES: RoseTrialCompleteResetDependencies = {
  writeMarker: writeResetMarker,
  clearMarker: clearResetMarker,
  clearObservations: clearObservationStore,
  observationsAreEmpty: () => storageKeyIsEmpty(ROSE_TRIAL_OBSERVATION_STORAGE_KEY),
  clearPhotoBlobs: () => withPhotoStorage((storage) => storage.clearAll()),
  photoBlobsAreEmpty: () => withPhotoStorage((storage) => storage.isEmpty()),
  clearDay0: clearRoseDay0State,
  day0IsEmpty: () => storageKeyIsEmpty(DAY0_STORAGE_KEY),
  clearPreparation: clearRoseTrialState,
  preparationIsEmpty: () => storageKeyIsEmpty(ROSE_TRIAL_STORAGE_KEY),
};

export function canConfirmRoseTrialCompleteReset(
  acknowledged: boolean,
  isRunning: boolean
): boolean {
  return acknowledged && !isRunning;
}

export async function resetRoseTrialCompletely(
  overrides: Partial<RoseTrialCompleteResetDependencies> = {}
): Promise<RoseTrialCompleteResetResult> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const completedPhases: RoseTrialResetPhase[] = [];
  let deletedPhotoBlobCount = 0;
  let activePhase: RoseTrialResetPhase = "marker";

  const failure = (failedPhase: RoseTrialResetPhase): RoseTrialCompleteResetResult => ({
    ok: false,
    failedPhase,
    completedPhases: [...completedPhases],
    deletedPhotoBlobCount,
    retryable: true,
  });

  try {
    if (!dependencies.writeMarker("observations")) return failure("marker");
    completedPhases.push("marker");

    activePhase = "observations";
    if (!dependencies.clearObservations() || !dependencies.observationsAreEmpty()) {
      return failure("observations");
    }
    completedPhases.push("observations");

    activePhase = "marker";
    if (!dependencies.writeMarker("photo_blobs")) return failure("marker");
    activePhase = "photo_blobs";
    const photoClear = await dependencies.clearPhotoBlobs();
    if (!photoClear.ok) return failure("photo_blobs");
    deletedPhotoBlobCount = photoClear.value.deletedCount;
    const photoVerification = await dependencies.photoBlobsAreEmpty();
    if (!photoVerification.ok || !photoVerification.value) return failure("photo_blobs");
    completedPhases.push("photo_blobs");

    activePhase = "marker";
    if (!dependencies.writeMarker("day0")) return failure("marker");
    activePhase = "day0";
    if (!dependencies.clearDay0() || !dependencies.day0IsEmpty()) {
      return failure("day0");
    }
    completedPhases.push("day0");

    activePhase = "marker";
    if (!dependencies.writeMarker("preparation")) return failure("marker");
    activePhase = "preparation";
    if (!dependencies.clearPreparation() || !dependencies.preparationIsEmpty()) {
      return failure("preparation");
    }
    completedPhases.push("preparation");

    activePhase = "marker";
    if (!dependencies.writeMarker("verification")) return failure("marker");
    activePhase = "verification";
    const finalPhotoVerification = await dependencies.photoBlobsAreEmpty();
    if (
      !dependencies.observationsAreEmpty()
      || !finalPhotoVerification.ok
      || !finalPhotoVerification.value
      || !dependencies.day0IsEmpty()
      || !dependencies.preparationIsEmpty()
    ) {
      return failure("verification");
    }
    completedPhases.push("verification");

    activePhase = "marker";
    if (!dependencies.writeMarker("marker_cleanup")) return failure("marker");
    activePhase = "marker_cleanup";
    if (!dependencies.clearMarker()) return failure("marker_cleanup");
    completedPhases.push("marker_cleanup");

    return {
      ok: true,
      completedPhases,
      deletedPhotoBlobCount,
    };
  } catch {
    return failure(activePhase);
  }
}
