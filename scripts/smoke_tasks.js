// scripts/smoke_tasks.js
const { request, logPass, logFail } = require('./smoke_base');
const { loginHuman, logoutHuman, h2Headers } = require('./h2-smoke-client');

async function main() {
    let ctx = null;
    try {
        console.log('Running Smoke Test: Tasks API');
        ctx = await loginHuman();
        const headers = h2Headers(ctx);

        // 1. Create Task
        const newTask = {
            title: `Smoke Task ${Date.now()}`,
            workspace: 'admin',
            status: 'inbox'
        };

        const createRes = await request('/api/tasks', {
            method: 'POST',
            body: newTask,
            headers
        });

        if (!createRes.ok) throw new Error(`Create task failed: ${JSON.stringify(createRes.body)}`);
        if (!createRes.body.task?.id) throw new Error('No task ID returned');

        const taskId = createRes.body.task.id;
        logPass('Create Task');

        // 2. Read Task (List)
        const listRes = await request('/api/tasks?limit=1', { headers });
        if (!listRes.ok) throw new Error(`List tasks failed: ${JSON.stringify(listRes.body)}`);
        logPass('List Tasks');

        // 3. Delete Task (Cleanup)
        const deleteRes = await request(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers
        });

        if (!deleteRes.ok) throw new Error(`Delete task failed: ${JSON.stringify(deleteRes.body)}`);
        logPass('Delete Task');

    } catch (e) {
        logFail('Tasks Smoke Test', e);
    } finally {
        if (ctx) await logoutHuman(ctx);
    }
}

main();
