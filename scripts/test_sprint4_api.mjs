import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loginHuman, logoutHuman, h2Headers } = require('./h2-smoke-client.cjs');

const BASE_URL = 'http://localhost:3000/api';

async function requestJson(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();

    let json;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`Non-JSON response (${res.status}) from ${url}\n${text.slice(0, 500)}`);
    }

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}\n${JSON.stringify(json, null, 2)}`);
    }

    return json;
}

async function runTest() {
    console.log('🚀 Starting Sprint 4 API Test...');
    let ctx = null;

    try {
        ctx = await loginHuman({ baseUrl: BASE_URL.replace(/\/api$/, '') });
        const h2 = h2Headers(ctx);

        // 0. Setup: Create a test task
        console.log('\n--- 0. Creating Test Task ---');
        const taskData = await requestJson(`${BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...h2 },
            body: JSON.stringify({ title: 'API Test Task', workspace: 'avacrm' })
        });
        const taskId = taskData.task.id;
        console.log('✅ Task Created:', taskId);

        // 1. Create Doc
        console.log('\n--- 1. Creating Doc ---');
        const docJson = await requestJson(`${BASE_URL}/docs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...h2 },
            body: JSON.stringify({ title: 'Sprint 4 Test Doc', content_md: '# Hello World' })
        });

        if (!docJson?.doc?.id) {
            throw new Error(`Unexpected /api/docs response shape:\n${JSON.stringify(docJson, null, 2)}`);
        }
        const docId = docJson.doc.id;
        console.log('✅ Doc Created:', docId);

        // 2. Link Doc to Task (PATCH)
        console.log('\n--- 2. Linking Doc to Task ---');
        const patchData = await requestJson(`${BASE_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...h2 },
            body: JSON.stringify({ doc_id: docId })
        });

        if (patchData.task.doc_id === docId) {
            console.log('✅ Task Linked to Doc');
        } else {
            throw new Error(`Failed to link doc. Expected ${docId}, got ${patchData.task.doc_id}`);
        }

        // 3. Upload Attachment
        console.log('\n--- 3. Uploading Attachment ---');
        const dummyPath = path.join(process.cwd(), 'test_upload.txt');
        fs.writeFileSync(dummyPath, 'Hello Sprint 4');

        const form = new FormData();
        form.append('file', fs.createReadStream(dummyPath));

        const uploadRes = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
            method: 'POST',
            headers: h2,
            body: form
        });
        const uploadText = await uploadRes.text();

        let uploadData;
        try {
            uploadData = JSON.parse(uploadText);
        } catch {
            throw new Error(`Non-JSON response for upload (${uploadRes.status}): ${uploadText}`);
        }

        if (!uploadRes.ok) {
            throw new Error(`Upload Failed (${uploadRes.status}): ${JSON.stringify(uploadData, null, 2)}`);
        }

        const attachmentId = uploadData.attachment.id;
        console.log('✅ Attachment Uploaded:', attachmentId);

        // 4. List Attachments
        console.log('\n--- 4. Listing Attachments ---');
        const listData = await requestJson(`${BASE_URL}/tasks/${taskId}/attachments`, { headers: h2 });
        if (listData.attachments.length > 0) {
            console.log(`✅ Found ${listData.attachments.length} attachments`);
        } else {
            throw new Error('Attachment list empty');
        }

        // 5. Download Attachment
        console.log('\n--- 5. Downloading Attachment ---');
        const dlRes = await fetch(`${BASE_URL}/attachments/${attachmentId}`, { headers: h2 });
        if (!dlRes.ok) {
            throw new Error(`Download failed (${dlRes.status})`);
        }
        const dlText = await dlRes.text();
        if (dlText === 'Hello Sprint 4') {
            console.log('✅ Download content verified');
        } else {
            throw new Error(`Download content mismatch. Expected 'Hello Sprint 4', got '${dlText}'`);
        }

        // 6. Delete Attachment
        console.log('\n--- 6. Deleting Attachment ---');
        await requestJson(`${BASE_URL}/attachments/${attachmentId}`, { method: 'DELETE', headers: h2 });
        console.log('✅ Attachment deleted');

        // Cleanup
        console.log('\n--- Cleanup ---');
        await requestJson(`${BASE_URL}/tasks/${taskId}`, { method: 'DELETE', headers: h2 });
        fs.unlinkSync(dummyPath);

        console.log('\n✨ ALL TESTS PASSED!');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        process.exit(1);
    } finally {
        if (ctx) await logoutHuman(ctx);
    }
}

runTest();
