import { STRATEGY_CONFIG } from "./config.ts"

/**
 * Анализ сообщения девушки
 */
export function analyzeGirlMessage(text: string) {
  const { message } = STRATEGY_CONFIG

  const wordCount = text.trim().split(/\s+/).length
  const hasQuestion = text.includes("?")
  const hasEmoji = message.emojiRegex.test(text)
  const isShort = wordCount <= message.shortMessageWordLimit
  const isLong = wordCount > message.longMessageWordLimit

  const hasPersonal = message.personalKeywords.some(k =>
    text.toLowerCase().includes(k)
  )

  return {
    wordCount,
    hasQuestion,
    hasEmoji,
    isShort,
    isLong,
    hasPersonal
  }
}

/**
 * Анализ сообщения мужчины (пользователя)
 */
export function analyzeUserMessage(text: string) {

  const lower = text.toLowerCase()

  const hasQuestion = text.includes("?")

  // Простейшее определение future projection
  const futureProjectionKeywords = [
    "когда увидимся",
    "на свидании",
    "вживую",
    "когда встретимся",
    "увидимся",
    "пойдём",
    "пойдем"
  ]

  const hasFutureProjection = futureProjectionKeywords.some(k =>
    lower.includes(k)
  )

  // Определяем попытку перевода в Telegram
  const telegramKeywords = [
    "телеграм",
    "telegram",
    "тг",
    "tg"
  ]

  const hasTelegramInvite = telegramKeywords.some(k =>
    lower.includes(k)
  )

  // Определяем попытку приглашения на свидание
  const dateKeywords = [
    "встретимся",
    "свидание",
    "увидимся завтра",
    "пойдём в"
  ]

  const hasDateInvite = dateKeywords.some(k =>
    lower.includes(k)
  )

  return {
    hasQuestion,
    hasFutureProjection,
    hasTelegramInvite,
    hasDateInvite
  }
}