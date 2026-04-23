// src/lib/smart/types.ts
export type SmartMode = 'package' | 'list'
export type TaskStatus = 'inbox' | 'planned' | 'done'
export type LaunchSource = 'global' | 'workspace' | 'package' | 'list'

export interface CreationContext {
  workspaceId?: string | null
  workspaceType?: 'content' | 'admin' | 'system' | 'inbox' | string | null
  mode?: SmartMode | null
  listId?: string | null
  status?: TaskStatus | null
  groupKey?: string | null
  topicId?: string | null
  packageId?: string | null
  packageStepKey?: string | null
  scheduleFilter?: 'scheduled' | 'unscheduled' | null
  launchSource?: LaunchSource | null
  parentTaskId?: string | null
}

export interface CreateDefaults {
  workspaceId?: string | null
  listId?: string | null
  status: TaskStatus
  topicId?: string | null
  packageId?: string | null
  packageStepKey?: string | null
  parentTaskId?: string | null
  suggestedReason?: string | null
}

export interface SuggestedNextAction {
  type: 'next-step' | 'publish-today' | 'overdue'
  taskId: string
  label: string
  priority: number
}

export interface SuggestedViewResult {
  mode: SmartMode
  reason: string
}
