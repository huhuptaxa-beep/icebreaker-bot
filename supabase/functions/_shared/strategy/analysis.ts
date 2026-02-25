import { STRATEGY_CONFIG } from "./config.ts"

/**
 * Анализ сообщения девушки
 */
export function analyzeGirlMessage(text: string) {
  const { message } = STRATEGY_CONFIG

  const clean = text.trim()
  const lower = clean.toLowerCase()

  const wordCount = clean.length > 0
    ? clean.split(/\s+/).length
    : 0

  const hasQuestion = clean.includes("?")
  const hasEmoji = message.emojiRegex.test(clean)

  const isShort =
    wordCount <= message.shortMessageWordLimit

  const isLong =
    wordCount > message.longMessageWordLimit

  const hasPersonal =
    message.personalKeywords.some(k =>
      lower.includes(k)
    )

  /**
   * ========= SHIT TEST DETECTION =========
   * Проверочные вопросы
   */
  const shitTestKeywords = [
    "что ты ищешь",
    "что ищешь",
    "зачем ты здесь",
    "давно на сайте",
    "сколько у тебя было",
    "женат",
    "есть дети",
    "серьёзно настроен",
    "серьезно настроен"
  ]

  const isShitTest =
    shitTestKeywords.some(k =>
      lower.includes(k)
    )

  /**
   * ========= DRY SIGNAL =========
   * Сухой ответ без эмоций и без вложения
   */
  const isDry =
    isShort &&
    !hasQuestion &&
    !hasEmoji &&
    !hasPersonal

  /**
   * ========= HIGH INTEREST SIGNAL =========
   * Девушка вкладывается
   */
  const isHighInterestSignal =
    (
      hasQuestion &&
      wordCount >= message.longMessageWordLimit
    ) ||
    (
      hasEmoji &&
      wordCount >= 5
    ) ||
    (
      hasPersonal &&
      wordCount >= 6
    )

  return {
    wordCount,
    hasQuestion,
    hasEmoji,
    isShort,
    isLong,
    hasPersonal,
    isShitTest,
    isDry,
    isHighInterestSignal
  }
}


/**
 * Анализ сообщения мужчины (пользователя)
 */
export function analyzeUserMessage(text: string) {

  const lower = text.toLowerCase()

  const hasQuestion = text.includes("?")

  /**
   * ========= FUTURE PROJECTION =========
   */
  const futureProjectionKeywords = [
    "когда увидимся",
    "на свидании",
    "вживую",
    "когда встретимся",
    "увидимся",
    "пойдём",
    "пойдем",
    "будем",
    "вместе"
  ]

  const hasFutureProjection =
    futureProjectionKeywords.some(k =>
      lower.includes(k)
    )

  /**
   * ========= TELEGRAM INVITE =========
   */
  const telegramKeywords = [
    "телеграм",
    "telegram",
    "тг",
    "tg"
  ]

  const hasTelegramInvite =
    telegramKeywords.some(k =>
      lower.includes(k)
    )

  /**
   * ========= DATE INVITE =========
   */
  const dateKeywords = [
    "встретимся",
    "свидание",
    "увидимся завтра",
    "пойдём в",
    "пойдем в",
    "давай встретимся"
  ]

  const hasDateInvite =
    dateKeywords.some(k =>
      lower.includes(k)
    )

  return {
    hasQuestion,
    hasFutureProjection,
    hasTelegramInvite,
    hasDateInvite
  }
}