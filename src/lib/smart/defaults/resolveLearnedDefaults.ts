// src/lib/smart/defaults/resolveLearnedDefaults.ts
import { getLearnedDefaults } from '../../../lib/workspaceMemory/smartMemory'

export function resolveLearnedDefaults(workspaceId: string, launchSource: string) {
  return getLearnedDefaults(workspaceId, launchSource)
}
