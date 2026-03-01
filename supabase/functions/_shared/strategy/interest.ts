import { STRATEGY_CONFIG } from "./config.ts"

export function updateInterest(oldBase: number, analysis: any) {
  const { interest } = STRATEGY_CONFIG

  let delta = 0

  // Если сообщение сухое (dry) - штраф
  if (analysis.isDry) {
    delta += interest.weights.dryMessage
  }
  // Иначе суммируем позитивные сигналы
  else {
    if (analysis.hasQuestion) delta += interest.weights.question
    if (analysis.hasEmoji) delta += interest.weights.emoji
    if (analysis.isLong) delta += interest.weights.longMessage
    if (analysis.hasPersonal) delta += interest.weights.personalInfo
  }

  // Короткое сообщение без вопроса и эмодзи - дополнительный штраф
  if (analysis.isShort && !analysis.hasQuestion && !analysis.hasEmoji) {
    delta += interest.weights.shortMessage
  }

  let newBase = oldBase + delta

  // Clamp между min и max
  if (newBase > interest.max) newBase = interest.max
  if (newBase < interest.min) newBase = interest.min

  return newBase
}