import { analyzeGirlMessage, analyzeUserMessage } from "./analysis.ts"
import { updateInterest } from "./interest.ts"
import { calculateFreshness } from "./freshness.ts"
import { STRATEGY_CONFIG } from "./config.ts"
import { deriveNextObjective, derivePhaseLabel, type StrategySignalType } from "./progression.ts"

/**
 * Тип сигнала от девушки.
 */
type SignalType = StrategySignalType


/**
 * Главный стратегический движок 2.1 (PHASE SYSTEM)
 */
export function runStrategyEngine(
  dialogue: any,
  message: string,
  sender: "girl" | "user"
) {

  /* ======================================================
     ===== БАЗОВОЕ СОСТОЯНИЕ ИЗ БД ========================
     ====================================================== */

  let baseInterest =
    dialogue.base_interest_score ??
    STRATEGY_CONFIG.interest.defaultScore

  let freshness =
    dialogue.freshness_multiplier ?? 1

  let effectiveInterest =
    dialogue.effective_interest ?? baseInterest

  let phase =
    dialogue.phase ?? derivePhaseLabel(effectiveInterest, dialogue.channel).phase

  let hasFutureProjection =
    dialogue.has_future_projection ?? false

  let telegramInviteAttempts =
    dialogue.telegram_invite_attempts ?? 0

  let dateInviteAttempts =
    dialogue.date_invite_attempts ?? 0

  let highInterestStreak =
    dialogue.high_interest_streak ?? 0

  let lowInterestStreak =
    dialogue.low_interest_streak ?? 0

  let signalType: SignalType = "NEUTRAL"



  /* ======================================================
     ===== ЕСЛИ СООБЩЕНИЕ ОТ ДЕВУШКИ ======================
     ====================================================== */

  if (sender === "girl") {

    const analysis = analyzeGirlMessage(message)

    // 1️⃣ Обновляем базовый интерес
    baseInterest = updateInterest(baseInterest, analysis)

    // 2️⃣ Пересчитываем свежесть
    freshness = calculateFreshness(
      dialogue.last_girl_message_at || dialogue.last_message_timestamp,
      new Date()
    )

    // 3️⃣ Финальный интерес
    effectiveInterest = Number(
      (baseInterest * freshness).toFixed(2)
    )

    /* =========================================
       КЛАССИФИКАЦИЯ СИГНАЛА
       ========================================= */

    if (analysis.isShitTest) {
      signalType = "SHIT_TEST"
    }
    else if (analysis.isDry) {
      signalType = "LOW_INTEREST"
    }
    else if (analysis.isHighInterestSignal) {
      signalType = "HIGH_INTEREST"
    }
    else if (analysis.isShort && !analysis.hasQuestion && !analysis.hasEmoji) {
      signalType = "LOW_INTEREST"
    }
    else {
      signalType = "NEUTRAL"
    }

    /* =========================================
       ОБНОВЛЕНИЕ STREAK
       ========================================= */

    if (signalType === "HIGH_INTEREST") {
      highInterestStreak += 1
      lowInterestStreak = 0
    }
    else if (signalType === "LOW_INTEREST") {
      lowInterestStreak += 1
      highInterestStreak = 0
    }
    else {
      // нейтральное сообщение НЕ ломает streak
    }

    /* =========================================
       ШТРАФ ЗА DRY STREAK
       ========================================= */

    // 2 сухих подряд → дополнительный штраф -4
    if (lowInterestStreak === 2) {
      baseInterest = Math.max(
        STRATEGY_CONFIG.interest.min,
        baseInterest + STRATEGY_CONFIG.interest.weights.dryStreak2
      )
      effectiveInterest = Number(
        (baseInterest * freshness).toFixed(2)
      )
    }

    // High streak is a soft modifier: small boost only, never a primary driver.
    if (highInterestStreak >= 2 && signalType === "HIGH_INTEREST") {
      const bonus = Math.min(3, highInterestStreak - 1)
      effectiveInterest = Number(Math.min(STRATEGY_CONFIG.interest.max, effectiveInterest + bonus).toFixed(2))
    }
  }



  /* ======================================================
     ===== ЕСЛИ СООБЩЕНИЕ ОТ ПОЛЬЗОВАТЕЛЯ =================
     ====================================================== */

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

  phase = derivePhaseLabel(effectiveInterest, dialogue.channel).phase



  /* ======================================================
     ===== DECISION ENGINE 2.1 ============================
     ====================================================== */

  const nextObjective = deriveNextObjective({
    phase,
    freshness_multiplier: freshness,
    low_interest_streak: lowInterestStreak,
    signalType,
  })



  /* ======================================================
     ===== ВОЗВРАЩАЕМ ОБНОВЛЁННОЕ СОСТОЯНИЕ ==============
     ====================================================== */

  return {
    phase,
    baseInterest,
    effectiveInterest,
    freshness,
    hasFutureProjection,
    telegramInviteAttempts,
    dateInviteAttempts,
    highInterestStreak,
    lowInterestStreak,
    signalType,
    phaseLabel: derivePhaseLabel(effectiveInterest, dialogue.channel).phaseLabel,
    nextObjective,
        // 3 dry подряд → сигнал фронту показать toast
    showDisinterestWarning: lowInterestStreak >= 3
  }
}
