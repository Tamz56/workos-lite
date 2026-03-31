// src/lib/smart/next/resolveNextSuggestedAction.ts
import type { SuggestedNextAction } from '../types'

interface PackageTask {
  id: string
  title: string
  status: 'inbox' | 'planned' | 'done'
  stepKey?: string | null
  scheduledDate?: string | null
}

interface PackageLike {
  tasks: PackageTask[]
}

const STEP_ORDER = ['brief', 'script', 'assets', 'publish', 'archive']

function toDayStamp(input?: string | null): number | null {
  if (!input) return null
  const value = new Date(input)
  if (Number.isNaN(value.getTime())) return null
  value.setHours(0, 0, 0, 0)
  return value.getTime()
}

export function resolveNextSuggestedAction(pkg: PackageLike): SuggestedNextAction | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStamp = today.getTime()

  const overdue = pkg.tasks.find((task) => {
    if (task.status === 'done') return false
    const due = toDayStamp(task.scheduledDate)
    return due !== null && due < todayStamp
  })

  if (overdue) {
    return {
      type: 'overdue',
      taskId: overdue.id,
      label: `Needs attention: ${overdue.title}`,
      priority: 100,
    }
  }

  const publishToday = pkg.tasks.find((task) => {
    if (task.status === 'done') return false
    if (task.stepKey !== 'publish') return false
    const due = toDayStamp(task.scheduledDate)
    return due !== null && due === todayStamp
  })

  if (publishToday) {
    return {
      type: 'publish-today',
      taskId: publishToday.id,
      label: `Publish today: ${publishToday.title}`,
      priority: 90,
    }
  }

  for (const stepKey of STEP_ORDER) {
    const task = pkg.tasks.find((item) => item.stepKey === stepKey && item.status !== 'done')
    if (task) {
      return {
        type: 'next-step',
        taskId: task.id,
        label: `Next: ${task.title}`,
        priority: 50,
      }
    }
  }

  return null
}
