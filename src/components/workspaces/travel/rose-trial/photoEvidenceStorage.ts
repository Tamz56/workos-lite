import {
  decidePhotoEvidenceReconciliation,
  validatePhotoEvidenceBinaryEnvelope,
  type PhotoEvidenceBinaryEnvelope,
  type PhotoEvidenceBinaryState,
  type PhotoEvidenceBlobLike,
  type PhotoEvidenceObservationLoadState,
  type PhotoEvidenceReconciliationDecision,
} from "./photoEvidence";

export const PHOTO_EVIDENCE_DATABASE_NAME = "gf-rose-trial-photo-evidence";
export const PHOTO_EVIDENCE_DATABASE_VERSION = 1;
export const PHOTO_EVIDENCE_OBJECT_STORE = "photoBlobs";
export const PHOTO_EVIDENCE_STATE_INDEX = "byState";
export const PHOTO_EVIDENCE_CREATED_AT_INDEX = "byCreatedAt";

export type PhotoEvidenceStorageErrorCode =
  | "unavailable"
  | "open_failed"
  | "transaction_failed"
  | "quota_exceeded"
  | "duplicate_id"
  | "invalid_record"
  | "not_found"
  | "abort"
  | "unknown";

export interface PhotoEvidenceStorageError {
  code: PhotoEvidenceStorageErrorCode;
}

export type PhotoEvidenceStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PhotoEvidenceStorageError };

export interface PhotoEvidenceReadManyResult {
  records: PhotoEvidenceBinaryEnvelope[];
  missingIds: string[];
}

export interface PhotoEvidencePromoteResult {
  promotedIds: string[];
  missingIds: string[];
}

export interface PhotoEvidenceDeleteResult {
  deletedIds: string[];
  missingIds: string[];
}

export interface PhotoEvidenceClearResult {
  deletedCount: number;
}

export interface PhotoEvidenceReconcileResult extends PhotoEvidenceReconciliationDecision {
  promotedIds: string[];
  deletedIds: string[];
  missingIds: string[];
}

export interface PhotoEvidenceStorageOptions {
  factory?: IDBFactory | null;
  isBlob?: (candidate: unknown) => candidate is PhotoEvidenceBlobLike;
}

function defaultBlobCheck(candidate: unknown): candidate is PhotoEvidenceBlobLike {
  return typeof Blob !== "undefined" && candidate instanceof Blob;
}

function defaultFactory(): IDBFactory | null {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  return window.indexedDB;
}

function mapStorageError(
  error: unknown,
  fallback: PhotoEvidenceStorageErrorCode
): PhotoEvidenceStorageError {
  const name = typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name)
    : "";
  if (name === "QuotaExceededError") return { code: "quota_exceeded" };
  if (name === "ConstraintError") return { code: "duplicate_id" };
  if (name === "AbortError") return { code: "abort" };
  return { code: fallback };
}

export function upgradePhotoEvidenceDatabase(
  database: IDBDatabase,
  transaction?: IDBTransaction | null
): void {
  const store = database.objectStoreNames.contains(PHOTO_EVIDENCE_OBJECT_STORE)
    ? transaction?.objectStore(PHOTO_EVIDENCE_OBJECT_STORE)
    : database.createObjectStore(PHOTO_EVIDENCE_OBJECT_STORE, { keyPath: "id" });
  if (!store) return;
  if (!store.indexNames.contains(PHOTO_EVIDENCE_STATE_INDEX)) {
    store.createIndex(PHOTO_EVIDENCE_STATE_INDEX, "state", { unique: false });
  }
  if (!store.indexNames.contains(PHOTO_EVIDENCE_CREATED_AT_INDEX)) {
    store.createIndex(PHOTO_EVIDENCE_CREATED_AT_INDEX, "createdAt", { unique: false });
  }
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

export function createPhotoEvidenceStorage(options: PhotoEvidenceStorageOptions = {}) {
  const factory = Object.prototype.hasOwnProperty.call(options, "factory")
    ? options.factory ?? null
    : defaultFactory();
  const isBlob = options.isBlob ?? defaultBlobCheck;
  let databasePromise: Promise<PhotoEvidenceStorageResult<IDBDatabase>> | null = null;

  const open = (): Promise<PhotoEvidenceStorageResult<IDBDatabase>> => {
    if (!factory) return Promise.resolve({ ok: false, error: { code: "unavailable" } });
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(PHOTO_EVIDENCE_DATABASE_NAME, PHOTO_EVIDENCE_DATABASE_VERSION);
      } catch (error) {
        resolve({ ok: false, error: mapStorageError(error, "open_failed") });
        return;
      }
      request.onupgradeneeded = () => {
        try {
          upgradePhotoEvidenceDatabase(request.result, request.transaction);
        } catch {
          request.transaction?.abort();
        }
      };
      request.onerror = () => {
        resolve({ ok: false, error: mapStorageError(request.error, "open_failed") });
      };
      request.onblocked = () => resolve({ ok: false, error: { code: "open_failed" } });
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve({ ok: true, value: request.result });
      };
    });
    return databasePromise;
  };

  const close = async (): Promise<void> => {
    const current = databasePromise;
    databasePromise = null;
    if (!current) return;
    const result = await current;
    if (result.ok) result.value.close();
  };

  const validateRecords = (
    records: readonly PhotoEvidenceBinaryEnvelope[],
    requiredState?: PhotoEvidenceBinaryState
  ): PhotoEvidenceStorageResult<PhotoEvidenceBinaryEnvelope[]> => {
    const ids = new Set<string>();
    for (const record of records) {
      const validation = validatePhotoEvidenceBinaryEnvelope(record, isBlob);
      if (!validation.ok || (requiredState && record.state !== requiredState)) {
        return { ok: false, error: { code: "invalid_record" } };
      }
      if (ids.has(record.id)) return { ok: false, error: { code: "duplicate_id" } };
      ids.add(record.id);
    }
    return { ok: true, value: records.map((record) => ({ ...record })) };
  };

  const transactionResult = async <T>(
    mode: IDBTransactionMode,
    execute: (store: IDBObjectStore, transaction: IDBTransaction, state: { value?: T; error?: unknown }) => void,
    fallback: PhotoEvidenceStorageErrorCode = "transaction_failed"
  ): Promise<PhotoEvidenceStorageResult<T>> => {
    const opened = await open();
    if (!opened.ok) return opened;
    return new Promise((resolve) => {
      let transaction: IDBTransaction;
      const state: { value?: T; error?: unknown } = {};
      try {
        transaction = opened.value.transaction(PHOTO_EVIDENCE_OBJECT_STORE, mode);
        execute(transaction.objectStore(PHOTO_EVIDENCE_OBJECT_STORE), transaction, state);
      } catch (error) {
        resolve({ ok: false, error: mapStorageError(error, fallback) });
        return;
      }
      transaction.oncomplete = () => resolve({ ok: true, value: state.value as T });
      transaction.onerror = () => {
        state.error ??= transaction.error;
      };
      transaction.onabort = () => resolve({
        ok: false,
        error: mapStorageError(state.error ?? transaction.error, "abort"),
      });
    });
  };

  const putPending = async (
    records: readonly PhotoEvidenceBinaryEnvelope[]
  ): Promise<PhotoEvidenceStorageResult<{ storedIds: string[] }>> => {
    const validated = validateRecords(records, "pending");
    if (!validated.ok) return validated;
    if (validated.value.length === 0) return { ok: true, value: { storedIds: [] } };
    return transactionResult("readwrite", (store, _transaction, state) => {
      state.value = { storedIds: validated.value.map((record) => record.id) };
      for (const record of validated.value) {
        const request = store.add(record);
        request.onerror = () => {
          state.error ??= request.error;
        };
      }
    });
  };

  const read = async (
    id: string
  ): Promise<PhotoEvidenceStorageResult<PhotoEvidenceBinaryEnvelope>> => {
    if (id.trim().length === 0) return { ok: false, error: { code: "not_found" } };
    const result = await transactionResult<PhotoEvidenceBinaryEnvelope | undefined>(
      "readonly",
      (store, _transaction, state) => {
        const request = store.get(id);
        request.onsuccess = () => {
          state.value = request.result as PhotoEvidenceBinaryEnvelope | undefined;
        };
        request.onerror = () => {
          state.error = request.error;
        };
      }
    );
    if (!result.ok) return result;
    if (!result.value) return { ok: false, error: { code: "not_found" } };
    const validation = validatePhotoEvidenceBinaryEnvelope(result.value, isBlob);
    return validation.ok
      ? { ok: true, value: validation.value }
      : { ok: false, error: { code: "invalid_record" } };
  };

  const readMany = async (
    ids: readonly string[]
  ): Promise<PhotoEvidenceStorageResult<PhotoEvidenceReadManyResult>> => {
    const requested = uniqueIds(ids);
    if (requested.length === 0) return { ok: true, value: { records: [], missingIds: [] } };
    const result = await transactionResult<PhotoEvidenceReadManyResult>(
      "readonly",
      (store, _transaction, state) => {
        const found = new Map<string, PhotoEvidenceBinaryEnvelope>();
        let completed = 0;
        state.value = { records: [], missingIds: [] };
        for (const id of requested) {
          const request = store.get(id);
          request.onsuccess = () => {
            const candidate = request.result as PhotoEvidenceBinaryEnvelope | undefined;
            if (candidate) found.set(id, candidate);
            completed += 1;
            if (completed === requested.length) {
              state.value = {
                records: requested.flatMap((requestedId) => found.get(requestedId) ?? []),
                missingIds: requested.filter((requestedId) => !found.has(requestedId)),
              };
            }
          };
          request.onerror = () => {
            state.error ??= request.error;
          };
        }
      }
    );
    if (!result.ok) return result;
    const invalid = result.value.records.some((record) => !validatePhotoEvidenceBinaryEnvelope(record, isBlob).ok);
    return invalid ? { ok: false, error: { code: "invalid_record" } } : result;
  };

  const listAll = (): Promise<PhotoEvidenceStorageResult<PhotoEvidenceBinaryEnvelope[]>> =>
    transactionResult("readonly", (store, _transaction, state) => {
      const request = store.getAll();
      request.onsuccess = () => {
        state.value = request.result as PhotoEvidenceBinaryEnvelope[];
      };
      request.onerror = () => {
        state.error = request.error;
      };
    });

  const listByState = async (
    binaryState: PhotoEvidenceBinaryState
  ): Promise<PhotoEvidenceStorageResult<PhotoEvidenceBinaryEnvelope[]>> => {
    const result = await transactionResult<PhotoEvidenceBinaryEnvelope[]>(
      "readonly",
      (store, _transaction, state) => {
        const request = store.index(PHOTO_EVIDENCE_STATE_INDEX).getAll(binaryState);
        request.onsuccess = () => {
          state.value = request.result as PhotoEvidenceBinaryEnvelope[];
        };
        request.onerror = () => {
          state.error = request.error;
        };
      }
    );
    if (!result.ok) return result;
    return result.value.some((record) => !validatePhotoEvidenceBinaryEnvelope(record, isBlob).ok)
      ? { ok: false, error: { code: "invalid_record" } }
      : result;
  };

  const listBefore = async (
    timestamp: string
  ): Promise<PhotoEvidenceStorageResult<PhotoEvidenceBinaryEnvelope[]>> => {
    if (!Number.isFinite(Date.parse(timestamp))) {
      return { ok: false, error: { code: "invalid_record" } };
    }
    const result = await listAll();
    if (!result.ok) return result;
    const records = result.value.filter((record) => Date.parse(record.createdAt) < Date.parse(timestamp));
    return records.some((record) => !validatePhotoEvidenceBinaryEnvelope(record, isBlob).ok)
      ? { ok: false, error: { code: "invalid_record" } }
      : { ok: true, value: records };
  };

  const promote = async (
    ids: readonly string[]
  ): Promise<PhotoEvidenceStorageResult<PhotoEvidencePromoteResult>> => {
    const requested = uniqueIds(ids);
    if (requested.length === 0) return { ok: true, value: { promotedIds: [], missingIds: [] } };
    return transactionResult("readwrite", (store, _transaction, state) => {
      const promotedIds: string[] = [];
      const missingIds: string[] = [];
      state.value = { promotedIds, missingIds };
      for (const id of requested) {
        const request = store.get(id);
        request.onsuccess = () => {
          const current = request.result as PhotoEvidenceBinaryEnvelope | undefined;
          if (!current) {
            missingIds.push(id);
            return;
          }
          const put = store.put({ ...current, state: "committed" });
          put.onsuccess = () => promotedIds.push(id);
          put.onerror = () => {
            state.error ??= put.error;
          };
        };
        request.onerror = () => {
          state.error ??= request.error;
        };
      }
    });
  };

  const deleteIds = async (
    ids: readonly string[]
  ): Promise<PhotoEvidenceStorageResult<PhotoEvidenceDeleteResult>> => {
    const requested = uniqueIds(ids);
    if (requested.length === 0) return { ok: true, value: { deletedIds: [], missingIds: [] } };
    return transactionResult("readwrite", (store, _transaction, state) => {
      const deletedIds: string[] = [];
      const missingIds: string[] = [];
      state.value = { deletedIds, missingIds };
      for (const id of requested) {
        const request = store.getKey(id);
        request.onsuccess = () => {
          if (request.result === undefined) {
            missingIds.push(id);
            return;
          }
          const deletion = store.delete(id);
          deletion.onsuccess = () => deletedIds.push(id);
          deletion.onerror = () => {
            state.error ??= deletion.error;
          };
        };
        request.onerror = () => {
          state.error ??= request.error;
        };
      }
    });
  };

  const clearAll = async (): Promise<PhotoEvidenceStorageResult<PhotoEvidenceClearResult>> => {
    const listed = await listAll();
    if (!listed.ok) return listed;

    const deleted = await deleteIds(listed.value.map((record) => record.id));
    if (!deleted.ok) return deleted;

    const remaining = await listAll();
    if (!remaining.ok) return remaining;
    if (remaining.value.length > 0) {
      return { ok: false, error: { code: "transaction_failed" } };
    }

    return { ok: true, value: { deletedCount: deleted.value.deletedIds.length } };
  };

  const isEmpty = async (): Promise<PhotoEvidenceStorageResult<boolean>> => {
    const listed = await listAll();
    return listed.ok ? { ok: true, value: listed.value.length === 0 } : listed;
  };

  const reconcile = async (
    referencedPhotoIds: readonly string[],
    observationLoadState: PhotoEvidenceObservationLoadState,
    now: string
  ): Promise<PhotoEvidenceStorageResult<PhotoEvidenceReconcileResult>> => {
    const listed = await listAll();
    if (!listed.ok) return listed;
    if (listed.value.some((record) => !validatePhotoEvidenceBinaryEnvelope(record, isBlob).ok)) {
      return { ok: false, error: { code: "invalid_record" } };
    }
    const decision = decidePhotoEvidenceReconciliation(
      listed.value,
      referencedPhotoIds,
      observationLoadState,
      now
    );
    if (decision.locked) {
      return {
        ok: true,
        value: { ...decision, promotedIds: [], deletedIds: [], missingIds: [] },
      };
    }

    const promoted = await promote(decision.promoteIds);
    if (!promoted.ok) return promoted;
    const deleted = await deleteIds(decision.deleteIds);
    if (!deleted.ok) return deleted;
    return {
      ok: true,
      value: {
        ...decision,
        promotedIds: promoted.value.promotedIds,
        deletedIds: deleted.value.deletedIds,
        missingIds: [...promoted.value.missingIds, ...deleted.value.missingIds],
      },
    };
  };

  return {
    open,
    close,
    putPending,
    read,
    readMany,
    listByState,
    listBefore,
    promote,
    deleteIds,
    clearAll,
    isEmpty,
    reconcile,
    cleanupEligibleOrphans: reconcile,
  };
}
