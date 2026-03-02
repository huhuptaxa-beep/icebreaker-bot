import { STRATEGY_CONFIG } from "./config.ts"

export function updateInterest(oldBase: number, analysis: any) {
  const { interest } = STRATEGY_CONFIG

  let delta = 0

  // +1 за любое сообщение — она ответила, это уже хорошо
  delta += interest.weights.baseMessage

  if (analysis.isDry) {
    // Сухое сообщение — мягкий штраф (-1)
    // Жёсткий штраф (-4) применяется в engine.ts при streak >= 2
    delta += interest.weights.dryMessage
  } else {
    if (analysis.hasQuestion) delta += interest.weights.question

    // Эмодзи/смех/скобочки — разные веса, не суммируются между собой
    if (analysis.hasEmoji && !analysis.hasLaugh) {
      delta += interest.weights.emoji        // +3
    } else if (analysis.hasLaugh) {
      delta += interest.weights.laugh        // +2
    } else if (analysis.hasSingleBracket) {
      delta += interest.weights.warmBracket  // +1
    }

    if (analysis.isLong) delta += interest.weights.longMessage
    if (analysis.hasPersonal) delta += interest.weights.personalInfo
  }

  // Короткое без эмоций — дополнительный мягкий минус
  if (analysis.isShort && !analysis.hasQuestion && !analysis.hasEmoji && !analysis.hasSingleBracket && !analysis.isDry) {
    delta += interest.weights.shortMessage
  }

  let newBase = oldBase + delta

  if (newBase > interest.max) newBase = interest.max
  if (newBase < interest.min) newBase = interest.min

  return newBase
}