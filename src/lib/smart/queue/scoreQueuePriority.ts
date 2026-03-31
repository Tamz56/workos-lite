// src/lib/smart/queue/scoreQueuePriority.ts
import { QueueFeedback } from "./queueFeedbackMemory";

export function scoreQueuePriority(basePriority: number, feedback: QueueFeedback | null): number {
  let score = basePriority;

  if (!feedback) return score;

  const now = new Date().getTime();
  const lastOpened = feedback.lastOpenedAt ? new Date(feedback.lastOpenedAt).getTime() : 0;
  const timeSinceOpened = now - lastOpened;

  // 1. Urgency Floor
  // Overdue (100) and Today (80) should not fall below 40 (the "base" of a next action)
  const floor = basePriority >= 80 ? 50 : 20;

  // 2. Decay Logic (punish ignored items mildly)
  // Each show reduces score by 2 points
  const decay = feedback.shownCount * 2;
  score = Math.max(floor, score - decay);

  // 3. Recently Opened Penalty (Soft Downranking)
  // If opened within the last 5 minutes, apply a -30 penalty
  if (timeSinceOpened < 5 * 60 * 1000) {
    score -= 30;
  }

  // 4. Click Bonus (Reinforce items the user likes)
  score += Math.min(20, feedback.clickedCount * 5);

  return score;
}
