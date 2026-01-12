// scripts/test_sprint6_hardening.mjs
import fs from "node:fs/promises";
import path from "node:path";

const base = "http://localhost:3000";

async function j(url, opts) {
    const res = await fetch(url, opts);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) throw new Error(`${opts?.method ?? "GET"} ${url} -> ${res.status}\n${text}`);
    return json ?? text;
}

async function run() {
    console.log("🚀 Sprint 6 Hardening Test");

    const created = await j(`${base}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "S6 hardening test", workspace: "ops", status: "inbox" }),
    });
    const taskId = created.task.id;
    console.log("✅ Task:", taskId);

    const fd = new FormData();
    fd.append("file", new Blob(["hello"], { type: "text/plain" }), "s6.txt");

    const up = await j(`${base}/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
    const attId = up.attachment.id;
    console.log("✅ Attachment:", attId);

    const listed = await j(`${base}/api/tasks/${taskId}/attachments`);
    const att = listed.attachments.find((x) => x.id === attId);
    if (!att) throw new Error("Attachment not found in list");
    console.log("✅ Listed attachments");

    // simulate ENOENT by deleting file on disk
    const abs = path.join(process.cwd(), ".workos-lite", att.storage_path);
    await fs.unlink(abs);
    console.log("🧨 Simulated missing file:", abs);

    await j(`${base}/api/tasks/${taskId}`, { method: "DELETE" });
    console.log("✅ Task deleted (ENOENT ignored)");

    console.log("✨ ALL TESTS PASSED");
}

run().catch((e) => {
    console.error("❌ FAILED\n", e);
    process.exit(1);
});
