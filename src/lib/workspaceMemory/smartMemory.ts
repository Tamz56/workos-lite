// src/lib/workspaceMemory/smartMemory.ts
const LAST_USED_LIST_KEY = 'workos:last-used-list'
const VIEW_HINTS_KEY = 'workos:view-hints'
const LEARNED_SIGNALS_KEY = 'workos:learned-signals'

export function getLastUsedList(workspaceId?: string | null): string | null {
  if (!workspaceId || typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_USED_LIST_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed[workspaceId] ?? null
  } catch {
    return null
  }
}

export function setLastUsedList(workspaceId: string, listId: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(LAST_USED_LIST_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed[workspaceId] = listId
    localStorage.setItem(LAST_USED_LIST_KEY, JSON.stringify(parsed))
  } catch {}
}

export interface ViewHintMemory {
  dismissed?: boolean
  accepted?: boolean
}

export function getViewHintMemory(workspaceId?: string | null): ViewHintMemory {
  if (!workspaceId || typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(VIEW_HINTS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed[workspaceId] ?? {}
  } catch {
    return {}
  }
}

export function setViewHintMemory(workspaceId: string, value: ViewHintMemory) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(VIEW_HINTS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed[workspaceId] = {
      ...(parsed[workspaceId] ?? {}),
      ...value,
    }
    localStorage.setItem(VIEW_HINTS_KEY, JSON.stringify(parsed))
  } catch {}
}

export interface LearnedSignals {
  lists: Record<string, number>
  statuses: Record<string, number>
}

export function recordCreationSignal(workspaceId: string, source: string, data: { listId?: string | null, status?: string }) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(LEARNED_SIGNALS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    if (!all[workspaceId]) all[workspaceId] = {}
    if (!all[workspaceId][source]) all[workspaceId][source] = { lists: {}, statuses: {} }

    const signals = all[workspaceId][source]

    if (data.listId) {
      signals.lists[data.listId] = (signals.lists[data.listId] || 0) + 1
    }
    if (data.status) {
      signals.statuses[data.status] = (signals.statuses[data.status] || 0) + 1
    }

    localStorage.setItem(LEARNED_SIGNALS_KEY, JSON.stringify(all))
  } catch {}
}

export function getLearnedDefaults(workspaceId: string, source: string): { listId?: string, status?: string } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LEARNED_SIGNALS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    const signals = all[workspaceId]?.[source] as LearnedSignals | undefined
    if (!signals) return {}

    // Pick top list
    let topList: string | undefined
    let maxListCount = 0
    Object.entries(signals.lists).forEach(([id, count]) => {
      if (count > maxListCount) {
        maxListCount = count
        topList = id
      }
    })

    // Pick top status
    let topStatus: string | undefined
    let maxStatusCount = 0
    Object.entries(signals.statuses).forEach(([st, count]) => {
      if (count > maxStatusCount) {
        maxStatusCount = count
        topStatus = st
      }
    })

    return { listId: topList, status: topStatus }
  } catch {
    return {}
  }
}
