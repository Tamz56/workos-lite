// scripts/smoke_events.js
const { request, logPass, logFail } = require('./smoke_base');
const { loginHuman, logoutHuman, h2Headers } = require('./h2-smoke-client');

async function main() {
    let ctx = null;
    try {
        console.log('Running Smoke Test: Events API');
        ctx = await loginHuman();
        const headers = h2Headers(ctx);

        // 1. Create Event
        const now = new Date();
        const end = new Date(now.getTime() + 3600000); // +1 hour

        const newEvent = {
            title: `Smoke Event ${Date.now()}`,
            workspace: 'admin',
            start_time: now.toISOString(),
            end_time: end.toISOString(),
            all_day: false
        };

        const createRes = await request('/api/events', {
            method: 'POST',
            body: newEvent,
            headers
        });

        if (!createRes.ok) throw new Error(`Create event failed: ${JSON.stringify(createRes.body)}`);

        // Look for event in response structure - could be { event: ... } or just the object
        const event = createRes.body.event || createRes.body;
        if (!event.id) throw new Error('No event ID returned');

        const eventId = event.id;
        logPass('Create Event');

        // 2. List Events
        const listRes = await request(`/api/events?start=${now.toISOString()}&end=${end.toISOString()}`, { headers });
        if (!listRes.ok) throw new Error(`List events failed: ${JSON.stringify(listRes.body)}`);
        logPass('List Events');

        // 3. Delete Event (Cleanup)
        const deleteRes = await request(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers
        });

        if (!deleteRes.ok) throw new Error(`Delete event failed: ${JSON.stringify(deleteRes.body)}`);
        logPass('Delete Event');

    } catch (e) {
        logFail('Events Smoke Test', e);
    } finally {
        if (ctx) await logoutHuman(ctx);
    }
}

main();
