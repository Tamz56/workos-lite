// src/lib/smart/context/buildCreationContext.ts
import type { CreationContext, LaunchSource, SmartMode, TaskStatus } from '../types'

interface BuildCreationContextArgs {
  workspaceId?: string | null
  workspaceType?: string | null
  mode?: SmartMode | null
  listId?: string | null
  status?: TaskStatus | null
  groupKey?: string | null
  topicId?: string | null
  packageId?: string | null
  packageStepKey?: string | null
  scheduleFilter?: 'scheduled' | 'unscheduled' | null
  launchSource?: LaunchSource | null
}

export function buildCreationContext(args: BuildCreationContextArgs): CreationContext {
  return {
    workspaceId: args.workspaceId ?? null,
    workspaceType: (args.workspaceType as CreationContext['workspaceType']) ?? null,
    mode: args.mode ?? null,
    listId: args.listId ?? null,
    status: args.status ?? null,
    groupKey: args.groupKey ?? null,
    topicId: args.topicId ?? null,
    packageId: args.packageId ?? null,
    packageStepKey: args.packageStepKey ?? null,
    scheduleFilter: args.scheduleFilter ?? null,
    launchSource: args.launchSource ?? null,
  }
}
