import { STRATEGY_CONFIG } from "./config.ts"

export function updateInterest(oldBase: number, analysis: any) {
  const { interest } = STRATEGY_CONFIG

  let delta = 0

  if (analysis.hasQuestion) delta += interest.weights.question
  if (analysis.hasEmoji) delta += interest.weights.emoji
  if (analysis.isLong) delta += interest.weights.longMessage
  if (analysis.hasPersonal) delta += interest.weights.personalInfo
  if (analysis.isShort) delta += interest.weights.shortMessagePenalty

  let newBase = oldBase + delta

  if (newBase > interest.maxScore) newBase = interest.maxScore
  if (newBase < interest.minScore) newBase = interest.minScore

  return newBase
}