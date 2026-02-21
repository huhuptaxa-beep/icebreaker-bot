import { analyzeGirlMessage, analyzeUserMessage } from "./analysis.ts"
import { updateInterest } from "./interest.ts"
import { calculateFreshness } from "./freshness.ts"
import { updateStage } from "./stage.ts"
import { decideNextObjective } from "./decision.ts"
import { STRATEGY_CONFIG } from "./config.ts"

/**
 * Главный стратегический движок.
 *
 * @param dialogue - текущее состояние диалога из БД
 * @param message - текст нового сообщения
 * @param sender - "girl" | "user"
 */
export function runStrategyEngine(
  dialogue: any,
  message: string,
  sender: "girl" | "user"
) {

  let baseInterest = dialogue.base_interest_score ??
    STRATEGY_CONFIG.interest.defaultScore

  let freshness = dialogue.freshness_multiplier ?? 1
  let effectiveInterest = dialogue.effective_interest ?? baseInterest
  let stage = dialogue.stage ?? 1

  let hasFutureProjection = dialogue.has_future_projection ?? false
  let telegramInviteAttempts = dialogue.telegram_invite_attempts ?? 0
  let dateInviteAttempts = dialogue.date_invite_attempts ?? 0

  // ===== ЕСЛИ СООБЩЕНИЕ ОТ ДЕВУШКИ =====
  if (sender === "girl") {

    const analysis = analyzeGirlMessage(message)

    baseInterest = updateInterest(baseInterest, analysis)

    freshness = calculateFreshness(
      dialogue.last_message_timestamp,
      new Date()
    )

    effectiveInterest = Number(
      (baseInterest * freshness).toFixed(2)
    )
  }

  // ===== ЕСЛИ СООБЩЕНИЕ ОТ ПОЛЬЗОВАТЕЛЯ =====
  if (sender === "user") {

    const analysis = analyzeUserMessage(message)

    if (analysis.hasFutureProjection) {
      hasFutureProjection = true
    }

    if (analysis.hasTelegramInvite) {
      telegramInviteAttempts += 1
    }

    if (analysis.hasDateInvite) {
      dateInviteAttempts += 1
    }
  }

  // ===== ОБНОВЛЕНИЕ STAGE =====
  stage = updateStage(
    {
      ...dialogue,
      has_future_projection: hasFutureProjection,
      telegram_invite_attempts: telegramInviteAttempts,
      date_invite_attempts: dateInviteAttempts
    },
    effectiveInterest
  )

  // ===== DECISION ENGINE =====
  const nextObjective = decideNextObjective(
    stage,
    effectiveInterest,
    {
      ...dialogue,
      telegram_invite_attempts: telegramInviteAttempts,
      date_invite_attempts: dateInviteAttempts
    }
  )

  return {
    stage,
    baseInterest,
    effectiveInterest,
    freshness,
    hasFutureProjection,
    telegramInviteAttempts,
    dateInviteAttempts,
    nextObjective
  }
}