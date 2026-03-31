// src/lib/smart/queue/resolveWorkspaceSmartQueue.ts
import { Task } from "@/lib/types"

export type QueueItemType = 'overdue' | 'today' | 'review' | 'next'

export interface QueueItem {
  id: string
  identity: string // taskId or topicId
  type: QueueItemType
  label: string
  taskId?: string
  topicId?: string
  priority: number
  basePriority: number
}

import { FeedbackStore } from "./queueFeedbackMemory"
import { scoreQueuePriority } from "./scoreQueuePriority"

export function resolveWorkspaceSmartQueue(tasks: Task[], feedback?: FeedbackStore): QueueItem[] {
  const today = new Date().toISOString().split('T')[0]
  const rawItems: QueueItem[] = []

  // 1. Overdue (Highest Priority: 100)
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.scheduled_date && t.scheduled_date < today)
  overdueTasks.slice(0, 3).forEach(t => {
    rawItems.push({
      id: `overdue-${t.id}`,
      identity: t.id,
      type: 'overdue',
      label: `Overdue: ${t.title}`,
      taskId: t.id,
      basePriority: 100,
      priority: 100
    })
  })

  // 2. Today (Priority: 80)
  const todayTasks = tasks.filter(t => t.status !== 'done' && t.scheduled_date === today)
  todayTasks.slice(0, 3).forEach(t => {
    rawItems.push({
      id: `today-${t.id}`,
      identity: t.id,
      type: 'today',
      label: `Today: ${t.title}`,
      taskId: t.id,
      basePriority: 80,
      priority: 80
    })
  })

  // 3. Review Ready (Priority: 60)
  // Group by topic_id to find near-complete packages
  const topicsMap = new Map<string, Task[]>()
  tasks.forEach(t => {
    if (t.topic_id) {
      if (!topicsMap.has(t.topic_id)) topicsMap.set(t.topic_id, [])
      topicsMap.get(t.topic_id)!.push(t)
    }
  })

  topicsMap.forEach((topicTasks, topicId) => {
    const isDraft = topicTasks.some(t => t.review_status === 'draft')
    const doneCount = topicTasks.filter(t => t.status === 'done').length
    const totalCount = topicTasks.length
    const plannedTasks = topicTasks.filter(t => t.status === 'planned')

    // Heuristic: Review ready if draft AND (80%+ done OR only 1 planned task left)
    const isNearComplete = totalCount > 0 && (doneCount / totalCount >= 0.8 || plannedTasks.length === 1)
    const isAllDone = doneCount === totalCount

    if (isDraft && isNearComplete && !isAllDone) {
      rawItems.push({
        id: `review-${topicId}`,
        identity: topicId,
        type: 'review',
        label: `Review Ready: ${topicId}`,
        topicId: topicId,
        taskId: plannedTasks[0]?.id, 
        basePriority: 60,
        priority: 60
      })
    }
  })

  // 4. Next Step in Active Package (Priority: 40)
  // Find the "most active" package that isn't review-ready yet
  topicsMap.forEach((topicTasks, topicId) => {
    const plannedTasks = topicTasks.filter(t => t.status === 'planned')
    const hasStarted = topicTasks.some(t => t.status === 'done' || t.status === 'in_progress')

    if (hasStarted && plannedTasks.length > 0) {
      rawItems.push({
        id: `next-${topicId}`,
        identity: topicId,
        type: 'next',
        label: `Next in ${topicId}: ${plannedTasks[0].title}`,
        topicId: topicId,
        taskId: plannedTasks[0].id,
        basePriority: 40,
        priority: 40
      })
    }
  })

  // 5. Scoring & Deduplication by Identity
  const identityMap = new Map<string, QueueItem>()
  
  rawItems.forEach(item => {
    // Apply score based on feedback
    const itemFeedback = feedback ? feedback[item.identity] : null
    item.priority = scoreQueuePriority(item.basePriority, itemFeedback || null)

    // Keep highest priority item per identity
    const existing = identityMap.get(item.identity)
    if (!existing || item.priority > existing.priority) {
      identityMap.set(item.identity, item)
    }
  })

  // Final Sort & Slice (Limit 5)
  return Array.from(identityMap.values())
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
}
