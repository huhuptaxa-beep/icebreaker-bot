import { STRATEGY_CONFIG } from "./config.ts"

export function decideNextObjective(
  stage: number,
  effectiveInterest: number,
  dialogue: any
) {
  const { interest, decision } = STRATEGY_CONFIG

  const lastTime = dialogue.last_message_timestamp
  let diffHours = 0

  if (lastTime) {
    diffHours =
      (Date.now() - new Date(lastTime).getTime()) /
      (1000 * 60 * 60)
  }

  if (diffHours > decision.rewarmAfterHours) {
    return "REWARM"
  }

  if (stage === 3) {
    return "TELEGRAM_INVITE"
  }

  if (
    stage >= 4 &&
    effectiveInterest >= interest.thresholds.date &&
    dialogue.message_count_tg >= decision.minMessagesInTelegramForDate
  ) {
    return "DATE_INVITE"
  }

  if (effectiveInterest <= interest.thresholds.lowInterest) {
    return "SALVAGE"
  }

  return "CONTINUE"
}