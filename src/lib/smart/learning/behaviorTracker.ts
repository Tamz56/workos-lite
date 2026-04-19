// src/lib/smart/learning/behaviorTracker.ts
import { BehaviorEvent, BehaviorEventType } from "./types";

const TRACKING_KEY_PREFIX = "ws_learning_events_";
const EVENT_LIMIT = 1000;

export function recordEvent(
    workspaceId: string, 
    type: BehaviorEventType, 
    taskId?: string, 
    metadata?: Record<string, any>
) {
    if (typeof window === 'undefined') return;

    const key = `${TRACKING_KEY_PREFIX}${workspaceId}`;
    const raw = localStorage.getItem(key);
    let events: BehaviorEvent[] = [];

    try {
        if (raw) events = JSON.parse(raw);
    } catch (e) {
        console.error("Failed to parse learning events", e);
    }

    const newEvent: BehaviorEvent = {
        type,
        taskId,
        workspaceId,
        timestamp: new Date().toISOString(),
        metadata
    };

    events.push(newEvent);

    // Enforce 1000-event rolling window cap
    if (events.length > EVENT_LIMIT) {
        events = events.slice(events.length - EVENT_LIMIT);
    }

    localStorage.setItem(key, JSON.stringify(events));
}

export function getEvents(workspaceId: string): BehaviorEvent[] {
    if (typeof window === 'undefined') return [];
    const key = `${TRACKING_KEY_PREFIX}${workspaceId}`;
    const raw = localStorage.getItem(key);
    try {
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function clearEvents(workspaceId: string) {
    if (typeof window === 'undefined') return;
    const key = `${TRACKING_KEY_PREFIX}${workspaceId}`;
    localStorage.removeItem(key);
}
