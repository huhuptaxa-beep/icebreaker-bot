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
 * Главный стратегический движок 2.1
 *
 * Логика:
 * 1. Анализируем сигнал
 * 2. Обновляем интерес
 * 3. Обновляем streak
 * 4. Обновляем stage
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

  let stage =
    dialogue.stage ?? 1

  let hasFutureProjection =
    dialogue.has_future_projection ?? false

  let telegramInviteAttempts =
    dialogue.telegram_invite_attempts ?? 0

  let dateInviteAttempts =
    dialogue.date_invite_attempts ?? 0

  // НОВОЕ — streak поведение
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
    else if (
      analysis.hasQuestion &&
      analysis.wordCount >= STRATEGY_CONFIG.message.longMessageWordLimit
    ) {
      signalType = "HIGH_INTEREST"
    }
    else if (
      analysis.wordCount <= STRATEGY_CONFIG.message.shortMessageWordLimit
    ) {
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
       ОБНОВЛЕНИЕ STAGE (продвинутая логика)
       ========================================= */

    // Stage 1 → 2 (2 HIGH подряд)
    if (stage === 1 && highInterestStreak >= 2) {
      stage = 2
    }

    // Stage 2 → 3 (2 HIGH подряд ИЛИ future projection)
    else if (
      stage === 2 &&
      (highInterestStreak >= 2 || hasFutureProjection)
    ) {
      stage = 3
    }

    // Stage 3 → 4 (глубина + высокий интерес)
    else if (
      stage === 3 &&
      signalType === "HIGH_INTEREST" &&
      analysis.hasPersonal &&
      effectiveInterest >= 8
    ) {
      stage = 4
    }

    // Откат если 2 LOW подряд
    if (lowInterestStreak >= 2 && stage > 1) {
      stage -= 1
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
  else if (stage === 2) {
    nextObjective = "DEEPEN_CONNECTION"
  }
  else if (stage === 3) {
    nextObjective = "BUILD_TENSION"
  }
  else if (stage === 4) {
    nextObjective = "OPTIONAL_NEXT_STEP"
  }



  /* ======================================================
     ===== ВОЗВРАЩАЕМ ОБНОВЛЁННОЕ СОСТОЯНИЕ ==============
     ====================================================== */

  return {
    stage,
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