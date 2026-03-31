// src/lib/smart/confidence/scoreSuggestionConfidence.ts
export type Confidence = 'low' | 'medium' | 'high'

interface ScoreArgs {
  workspaceType?: string
  suggestedMode?: string
  historyCount?: number
}

export function scoreSuggestionConfidence(args: ScoreArgs): Confidence {
  // High confidence if workspace type matches suggested mode perfectly
  if (args.workspaceType === 'content' && args.suggestedMode === 'package') return 'high'
  if (args.workspaceType === 'admin' && args.suggestedMode === 'list') return 'high'

  // Medium confidence if we have some history (> 2 signals)
  if ((args.historyCount || 0) >= 3) return 'medium'

  // Low confidence for everything else
  return 'low'
}
