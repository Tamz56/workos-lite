import { getLastUsedList, getLearnedDefaults } from "../../workspaceMemory/smartMemory";
import type { CreateDefaults, CreationContext } from '../types'

export function resolveSmartCreateDefaults(ctx: CreationContext): CreateDefaults {
  const result: CreateDefaults = {
    workspaceId: ctx.workspaceId ?? null,
    listId: ctx.listId ?? null,
    status: ctx.status ?? 'planned',
    topicId: ctx.topicId ?? null,
    packageId: ctx.packageId ?? null,
    packageStepKey: ctx.packageStepKey ?? null,
    parentTaskId: ctx.parentTaskId ?? null,
    suggestedReason: null,
  }

  if (result.status === 'done') {
    result.status = 'planned'
    result.suggestedReason = 'New tasks should not start in Done.'
  }

  if (ctx.mode === 'package' && ctx.packageId) {
    result.packageId = ctx.packageId
    result.topicId = ctx.topicId ?? null
    result.suggestedReason = 'Prefilled from current package context.'
  }

  if (!result.listId && ctx.mode === 'list' && ctx.workspaceId) {
    const lastUsedList = getLastUsedList(ctx.workspaceId)
    if (lastUsedList) {
      result.listId = lastUsedList
      result.suggestedReason = 'Using last active list for this workspace.'
    }
  }

  // RC40B: Learned Defaults (if context is still ambiguous)
  if (!result.listId && ctx.workspaceId && ctx.launchSource) {
    const learned = getLearnedDefaults(ctx.workspaceId, ctx.launchSource)
    if (learned.listId) {
      result.listId = learned.listId
      result.suggestedReason = result.suggestedReason || 'Learned preference for this context.'
    }
    if (!ctx.status && learned.status) {
      result.status = learned.status as any
    }
  }

  // RC39 Fallbacks
  if (!result.status) {
    if (ctx.workspaceType === 'inbox') {
      result.status = 'inbox'
    } else {
      result.status = 'planned'
    }
  }

  return result
}
