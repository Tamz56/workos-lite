// src/lib/docsStore.ts
import { promises as fs } from "fs";
import path from "path";

export type DocRow = {
    id: string;
    title: string;
    content_md: string;
    created_at: string;
    updated_at: string;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "docs.json");

async function ensureFile() {
    await fs.mkdir(dataDir, { recursive: true });
    try {
        await fs.access(dataFile);
    } catch {
        await fs.writeFile(dataFile, JSON.stringify({ docs: [] }, null, 2), "utf-8");
    }
}

export async function readAllDocs(): Promise<DocRow[]> {
    await ensureFile();
    const raw = await fs.readFile(dataFile, "utf-8");

    // กันกรณีไฟล์ว่าง/พังชั่วคราว
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = { docs: [] };
    }

    const data = parsed as { docs?: DocRow[] };
    return Array.isArray(data.docs) ? data.docs : [];
}

export async function writeAllDocs(docs: DocRow[]) {
    await ensureFile();

    // atomic write: เขียน temp แล้ว rename ทับ
    const tmp = `${dataFile}.tmp`;
    const payload = JSON.stringify({ docs }, null, 2);

    await fs.writeFile(tmp, payload, "utf-8");
    await fs.rename(tmp, dataFile);
}

// --- simple in-process mutex (dev/local file store) ---
let _docsLock: Promise<void> = Promise.resolve();

export async function withDocsLock<T>(fn: () => Promise<T>): Promise<T> {
    // queue-based mutex
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    const prev = _docsLock;

    // chain next lock
    _docsLock = _docsLock.then(() => next);

    // wait for previous holder
    await prev;

    try {
        return await fn();
    } finally {
        release(); // always release lock
    }
}
