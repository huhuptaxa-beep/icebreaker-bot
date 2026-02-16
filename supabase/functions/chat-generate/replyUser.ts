export function buildReplyUserPrompt(historyText: string) {
  return `
Диалог:
${historyText}

Сгенерируй 3 варианта следующего сообщения от меня.
Используй стиль живого, уверенного общения.
Разделяй варианты символом §.
`
}

