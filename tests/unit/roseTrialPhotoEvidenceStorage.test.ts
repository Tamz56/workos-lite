import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PhotoEvidenceBinaryEnvelope } from "@/components/workspaces/travel/rose-trial/photoEvidence";
import {
  PHOTO_EVIDENCE_CREATED_AT_INDEX,
  PHOTO_EVIDENCE_DATABASE_NAME,
  PHOTO_EVIDENCE_DATABASE_VERSION,
  PHOTO_EVIDENCE_OBJECT_STORE,
  PHOTO_EVIDENCE_STATE_INDEX,
  createPhotoEvidenceStorage,
  upgradePhotoEvidenceDatabase,
} from "@/components/workspaces/travel/rose-trial/photoEvidenceStorage";

function envelope(overrides: Partial<PhotoEvidenceBinaryEnvelope> = {}): PhotoEvidenceBinaryEnvelope {
  const content = new Uint8Array([1, 2, 3]);
  return {
    id: "photo-1",
    version: 1,
    blob: new Blob([content], { type: "image/jpeg" }),
    mimeType: "image/jpeg",
    originalSizeBytes: 5,
    storedSizeBytes: content.byteLength,
    width: 1200,
    height: 800,
    state: "pending",
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function namedError(name: string): Error {
  const error = new Error(`private ${name} details`);
  error.name = name;
  return error;
}

class FakeRequest<T = unknown> {
  result!: T;
  error: Error | null = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  error: Error | null = null;
  private pending = 0;
  private aborted = false;
  readonly records: Map<string, PhotoEvidenceBinaryEnvelope>;

  constructor(
    private readonly database: FakeDatabase,
    private readonly mode: IDBTransactionMode
  ) {
    this.records = new Map(database.records);
  }

  objectStore(): IDBObjectStore {
    return new FakeObjectStore(this, this.database) as unknown as IDBObjectStore;
  }

  enqueue<T>(action: () => T): FakeRequest<T> {
    const request = new FakeRequest<T>();
    this.pending += 1;
    queueMicrotask(() => {
      if (this.aborted) return;
      try {
        request.result = action();
        request.onsuccess?.();
      } catch (error) {
        request.error = error as Error;
        this.error = request.error;
        request.onerror?.();
        this.onerror?.();
        this.abort();
      } finally {
        this.pending -= 1;
        this.scheduleComplete();
      }
    });
    return request;
  }

  abort(): void {
    if (this.aborted) return;
    this.aborted = true;
    this.error ??= namedError("AbortError");
    queueMicrotask(() => this.onabort?.());
  }

  private scheduleComplete(): void {
    if (this.aborted || this.pending !== 0) return;
    queueMicrotask(() => {
      if (this.aborted || this.pending !== 0) return;
      if (this.mode === "readwrite") this.database.records = new Map(this.records);
      this.oncomplete?.();
    });
  }
}

class FakeObjectStore {
  readonly indexNames;

  constructor(
    private readonly transaction: FakeTransaction,
    private readonly database: FakeDatabase
  ) {
    this.indexNames = { contains: (name: string) => database.indexes.has(name) };
  }

  createIndex(name: string): IDBIndex {
    this.database.indexes.add(name);
    return {} as IDBIndex;
  }

  add(record: PhotoEvidenceBinaryEnvelope): IDBRequest {
    return this.transaction.enqueue(() => {
      if (this.database.nextWriteErrorName) {
        const name = this.database.nextWriteErrorName;
        this.database.nextWriteErrorName = null;
        throw namedError(name);
      }
      if (this.transaction.records.has(record.id)) throw namedError("ConstraintError");
      this.transaction.records.set(record.id, record);
      return record.id;
    }) as unknown as IDBRequest;
  }

  put(record: PhotoEvidenceBinaryEnvelope): IDBRequest {
    return this.transaction.enqueue(() => {
      this.transaction.records.set(record.id, record);
      return record.id;
    }) as unknown as IDBRequest;
  }

  get(id: string): IDBRequest {
    return this.transaction.enqueue(() => this.transaction.records.get(id)) as unknown as IDBRequest;
  }

  getKey(id: string): IDBRequest {
    return this.transaction.enqueue(() => this.transaction.records.has(id) ? id : undefined) as unknown as IDBRequest;
  }

  delete(id: string): IDBRequest {
    return this.transaction.enqueue(() => {
      this.transaction.records.delete(id);
      return undefined;
    }) as unknown as IDBRequest;
  }

  getAll(): IDBRequest {
    return this.transaction.enqueue(() => [...this.transaction.records.values()]) as unknown as IDBRequest;
  }

  index(name: string): IDBIndex {
    if (!this.database.indexes.has(name)) throw namedError("NotFoundError");
    return {
      getAll: (query: unknown) => this.transaction.enqueue(() =>
        [...this.transaction.records.values()].filter((record) =>
          name === PHOTO_EVIDENCE_STATE_INDEX ? record.state === query : true
        )) as unknown as IDBRequest,
    } as IDBIndex;
  }
}

class FakeDatabase {
  records = new Map<string, PhotoEvidenceBinaryEnvelope>();
  indexes = new Set<string>();
  nextWriteErrorName: string | null = null;
  closed = false;
  onversionchange: (() => void) | null = null;
  readonly objectStoreNames = { contains: (name: string) => name === PHOTO_EVIDENCE_OBJECT_STORE && this.storeCreated };
  private storeCreated = false;

  createObjectStore(name: string, options: IDBObjectStoreParameters): IDBObjectStore {
    expect(name).toBe(PHOTO_EVIDENCE_OBJECT_STORE);
    expect(options).toEqual({ keyPath: "id" });
    this.storeCreated = true;
    const transaction = new FakeTransaction(this, "versionchange");
    return new FakeObjectStore(transaction, this) as unknown as IDBObjectStore;
  }

  transaction(_store: string, mode: IDBTransactionMode): IDBTransaction {
    return new FakeTransaction(this, mode) as unknown as IDBTransaction;
  }

  close(): void {
    this.closed = true;
  }
}

class FakeOpenRequest extends FakeRequest<IDBDatabase> {
  onupgradeneeded: (() => void) | null = null;
  onblocked: (() => void) | null = null;
  transaction: IDBTransaction | null = null;
}

class FakeFactory {
  readonly database = new FakeDatabase();
  readonly open = vi.fn((name: string, version: number) => {
    expect(name).toBe(PHOTO_EVIDENCE_DATABASE_NAME);
    expect(version).toBe(PHOTO_EVIDENCE_DATABASE_VERSION);
    const request = new FakeOpenRequest();
    request.result = this.database as unknown as IDBDatabase;
    queueMicrotask(() => {
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request as unknown as IDBOpenDBRequest;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Rose Trial photo evidence IndexedDB adapter", () => {
  it("is import-safe on SSR and returns unavailable without IndexedDB", async () => {
    vi.stubGlobal("window", undefined);
    const storage = createPhotoEvidenceStorage({ factory: null });
    await expect(storage.open()).resolves.toEqual({ ok: false, error: { code: "unavailable" } });
  });

  it("opens database version 1 and creates the approved store and indexes", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    expect(await storage.open()).toMatchObject({ ok: true });
    expect(factory.open).toHaveBeenCalledWith(PHOTO_EVIDENCE_DATABASE_NAME, PHOTO_EVIDENCE_DATABASE_VERSION);
    expect(factory.database.indexes).toEqual(new Set([PHOTO_EVIDENCE_STATE_INDEX, PHOTO_EVIDENCE_CREATED_AT_INDEX]));
    await storage.close();
    expect(factory.database.closed).toBe(true);
  });

  it("upgrades an empty database deterministically", () => {
    const database = new FakeDatabase();
    upgradePhotoEvidenceDatabase(database as unknown as IDBDatabase);
    expect(database.objectStoreNames.contains(PHOTO_EVIDENCE_OBJECT_STORE)).toBe(true);
    expect(database.indexes).toEqual(new Set([PHOTO_EVIDENCE_STATE_INDEX, PHOTO_EVIDENCE_CREATED_AT_INDEX]));
  });

  it("writes multiple pending records atomically and reads one or many", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    const records = [envelope(), envelope({ id: "photo-2" })];
    expect(await storage.putPending(records)).toEqual({ ok: true, value: { storedIds: ["photo-1", "photo-2"] } });
    expect(await storage.read("photo-1")).toMatchObject({ ok: true, value: { id: "photo-1" } });
    expect(await storage.readMany(["photo-2", "missing", "photo-1", "photo-2"])).toMatchObject({
      ok: true,
      value: { records: [{ id: "photo-2" }, { id: "photo-1" }], missingIds: ["missing"] },
    });
    expect(await storage.listByState("pending")).toMatchObject({ ok: true, value: [{ id: "photo-1" }, { id: "photo-2" }] });
  });

  it("rejects invalid state and duplicate input IDs before opening a transaction", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    expect(await storage.putPending([envelope({ state: "committed" })])).toEqual({
      ok: false,
      error: { code: "invalid_record" },
    });
    expect(await storage.putPending([envelope(), envelope()])).toEqual({
      ok: false,
      error: { code: "duplicate_id" },
    });
    expect(factory.open).not.toHaveBeenCalled();
  });

  it("maps duplicate, quota, and abort failures without exposing raw DOMException details", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    expect(await storage.putPending([envelope()])).toMatchObject({ ok: true });
    expect(await storage.putPending([envelope()])).toEqual({ ok: false, error: { code: "duplicate_id" } });

    factory.database.nextWriteErrorName = "QuotaExceededError";
    const quota = await storage.putPending([envelope({ id: "quota" })]);
    expect(quota).toEqual({ ok: false, error: { code: "quota_exceeded" } });
    expect(JSON.stringify(quota)).not.toContain("private");

    factory.database.nextWriteErrorName = "AbortError";
    expect(await storage.putPending([envelope({ id: "abort" })]))
      .toEqual({ ok: false, error: { code: "abort" } });
    expect(factory.database.records.has("quota")).toBe(false);
    expect(factory.database.records.has("abort")).toBe(false);
  });

  it("promotes records in one transaction and reports missing IDs", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    await storage.putPending([envelope()]);
    expect(await storage.promote(["photo-1", "missing"])).toEqual({
      ok: true,
      value: { promotedIds: ["photo-1"], missingIds: ["missing"] },
    });
    expect(await storage.read("photo-1")).toMatchObject({ ok: true, value: { state: "committed" } });
  });

  it("deletes exact IDs idempotently and reports missing IDs", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    await storage.putPending([envelope(), envelope({ id: "photo-2" })]);
    expect(await storage.deleteIds(["photo-1", "missing", "photo-1"])).toEqual({
      ok: true,
      value: { deletedIds: ["photo-1"], missingIds: ["missing"] },
    });
    expect(await storage.read("photo-1")).toEqual({ ok: false, error: { code: "not_found" } });
    expect(await storage.read("photo-2")).toMatchObject({ ok: true });
  });

  it("lists records before a timestamp", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    await storage.putPending([
      envelope({ id: "old", createdAt: "2026-07-19T00:00:00.000Z" }),
      envelope({ id: "new", createdAt: "2026-07-21T00:00:00.000Z" }),
    ]);
    expect(await storage.listBefore("2026-07-20T00:00:00.000Z"))
      .toMatchObject({ ok: true, value: [{ id: "old" }] });
  });

  it("reconciles referenced pending and stale orphans only for a valid store", async () => {
    const factory = new FakeFactory();
    const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
    await storage.putPending([
      envelope({ id: "referenced", createdAt: "2026-07-19T00:00:00.000Z" }),
      envelope({ id: "stale", createdAt: "2026-07-19T00:00:00.000Z" }),
      envelope({ id: "fresh", createdAt: "2026-07-21T00:00:00.000Z" }),
    ]);
    expect(await storage.reconcile(["referenced"], "valid", "2026-07-21T00:00:00.001Z"))
      .toMatchObject({
        ok: true,
        value: { promotedIds: ["referenced"], deletedIds: ["stale"], retainIds: ["fresh"] },
      });
    expect(await storage.read("referenced")).toMatchObject({ ok: true, value: { state: "committed" } });
    expect(await storage.read("stale")).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it.each(["partial", "failed", "unavailable", "unsupported_version"] as const)(
    "locks cleanup when Observation state is %s",
    async (state) => {
      const factory = new FakeFactory();
      const storage = createPhotoEvidenceStorage({ factory: factory as unknown as IDBFactory });
      await storage.putPending([envelope({ createdAt: "2026-07-19T00:00:00.000Z" })]);
      expect(await storage.cleanupEligibleOrphans([], state, "2026-07-21T00:00:00.001Z"))
        .toMatchObject({ ok: true, value: { locked: true, promotedIds: [], deletedIds: [] } });
      expect(await storage.read("photo-1")).toMatchObject({ ok: true });
    }
  );

  it("contains no Local Storage or Base64 serialization boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/photoEvidenceStorage.ts"),
      "utf8"
    );
    const forbidden = [
      "localStorage",
      "sessionStorage",
      "readAsDataURL",
      "toDataURL",
      ["data", "image"].join(":"),
      "\\bbtoa\\b",
      "\\batob\\b",
    ].join("|");
    expect(source).not.toMatch(new RegExp(forbidden, "i"));
  });
});
