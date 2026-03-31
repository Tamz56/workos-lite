// src/lib/smart/view/resolveSuggestedView.ts
import { getViewHintMemory } from '@/lib/workspaceMemory/smartMemory'
import type { SuggestedViewResult } from '../types'

interface ResolveSuggestedViewArgs {
  workspaceId?: string | null
  workspaceType?: string | null
  currentMode?: 'package' | 'list' | 'table' | null
  hasExplicitSavedMode?: boolean
  hasAnyTasks?: boolean
  packageLinkedTaskCount?: number
}

export function resolveSuggestedView(args: ResolveSuggestedViewArgs): SuggestedViewResult | null {
  if (!args.workspaceId) return null
  if (args.hasExplicitSavedMode) return null

  const memory = getViewHintMemory(args.workspaceId)
  if (memory.dismissed || memory.accepted) return null

  if (args.workspaceType === 'content' && (args.packageLinkedTaskCount ?? 0) > 0) {
    if (args.currentMode !== 'package') {
      return {
        mode: 'package',
        reason: 'Package View works best for package-linked content workflows.',
      }
    }
  }

  if ((args.workspaceType === 'admin' || args.workspaceType === 'system') && args.hasAnyTasks) {
    if (args.currentMode !== 'list') {
      return {
        mode: 'list',
        reason: 'Table Mode is usually faster for operational task execution.',
      }
    }
  }

  return null
}
