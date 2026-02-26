import { analyzeGirlMessage, analyzeUserMessage } from "./analysis.ts"
import { updateInterest } from "./interest.ts"
import { calculateFreshness } from "./freshness.ts"
import { STRATEGY_CONFIG } from "./config.ts"

/**
 * Тип сигнала от девушки.
 * Это не уровень интереса, а характер её поведения.
 */
type SignalType =
  | "HIGH_INTEREST"   // длинные сообщения, вопросы, вовлечённость
  | "LOW_INTEREST"    // короткие сухие ответы
  | "SHIT_TEST"       // проверочные вопросы
  | "NEUTRAL"


/**
 * Главный стратегический движок 2.1 (PHASE SYSTEM)
 *
 * Логика:
 * 1. Анализируем сигнал
 * 2. Обновляем интерес
 * 3. Обновляем streak
 * 4. Обновляем phase
 * 5. Выбираем objective
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
    dialogue.phase ?? 1

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
      dialogue.last_message_timestamp,
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
      // нейтральное сообщение НЕ ломает streak — ничего не делаем
    }

    /* =========================================
       ОБНОВЛЕНИЕ PHASE (линейная модель)
       ========================================= */

    // Phase 1 → 2 (highStreakForConnection HIGH подряд)
    if (phase === 1 && highInterestStreak >= STRATEGY_CONFIG.phase.highStreakForConnection) {
      phase = 2
    }

    // Phase 2 → 3: НЕ автоматически, только по кнопке "Telegram получен"
    // (обрабатывается в confirm-action endpoint)

    // Phase 3 → 4 (минимум сообщений в Telegram)
    else if (
      phase === 3 &&
      dialogue.phase_message_count >= STRATEGY_CONFIG.phase.minMessagesForTension
    ) {
      phase = 4
    }

    // Phase 4 → 5: НЕ автоматически, только по кнопке "Она согласилась"
    // (обрабатывается в confirm-action endpoint)

    // Откат если 2 LOW подряд (но НЕ из phase 3 — уже в Telegram)
    if (lowInterestStreak >= 2 && phase > 1 && phase !== 3) {
      phase -= 1
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



  /* ======================================================
     ===== DECISION ENGINE 2.1 ============================
     ====================================================== */

  let nextObjective = "CONTINUE_PLAY"

  if (freshness < 0.6) {
    nextObjective = "REWARM"
  }
  else if (signalType === "SHIT_TEST") {
    nextObjective = "PASS_TEST"
  }
  else if (signalType === "LOW_INTEREST") {
    nextObjective = "SALVAGE"
  }
  else if (phase === 1) {
    nextObjective = "CONTINUE_PLAY"
  }
  else if (phase === 2) {
    nextObjective = "DEEPEN_CONNECTION"
  }
  else if (phase === 3) {
    nextObjective = "RESTART_PLAY"
  }
  else if (phase === 4) {
    nextObjective = "BUILD_TENSION"
  }
  else if (phase === 5) {
    nextObjective = "POST_DATE"
  }



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
    nextObjective
  }
}