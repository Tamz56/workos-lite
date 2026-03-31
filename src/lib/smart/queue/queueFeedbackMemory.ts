// src/lib/smart/queue/queueFeedbackMemory.ts
const QUEUE_FEEDBACK_KEY = 'workos:queue-feedback'

export interface QueueFeedback {
  shownCount: number
  clickedCount: number
  lastSeenAt: string | null
  lastOpenedAt: string | null
}

export interface FeedbackStore {
  [identity: string]: QueueFeedback
}

function getStore(): FeedbackStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(QUEUE_FEEDBACK_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStore(store: FeedbackStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QUEUE_FEEDBACK_KEY, JSON.stringify(store))
  } catch {}
}

export function recordQueueShow(identity: string) {
  const store = getStore()
  if (!store[identity]) {
    store[identity] = { shownCount: 0, clickedCount: 0, lastSeenAt: null, lastOpenedAt: null }
  }
  store[identity].shownCount += 1
  store[identity].lastSeenAt = new Date().toISOString()
  saveStore(store)
}

export function recordQueueClick(identity: string) {
  const store = getStore()
  if (!store[identity]) {
    store[identity] = { shownCount: 0, clickedCount: 0, lastSeenAt: null, lastOpenedAt: null }
  }
  store[identity].clickedCount += 1
  store[identity].lastOpenedAt = new Date().toISOString()
  saveStore(store)
}

export function getQueueFeedback(identity: string): QueueFeedback | null {
  const store = getStore()
  return store[identity] || null
}

export function getAllQueueFeedback(): FeedbackStore {
  return getStore()
}
