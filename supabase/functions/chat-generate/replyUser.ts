export const buildReplyUserPrompt = (incomingMessage: string) => {
  return `
Сообщение девушки:
${incomingMessage}

Задача:
Сгенерируй 3 варианта лучших ответа.
`
}
