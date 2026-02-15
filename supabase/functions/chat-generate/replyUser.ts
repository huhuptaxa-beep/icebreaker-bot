export const buildReplyUserPrompt = (incomingMessage: string) => {
  return `
Сообщение девушки:
${incomingMessage}

Задача:
Сгенерируй 20 ответов на сообщения девушки. Выбери три лучших из них.
Каждое сообщение начинай с символа §
Никаких пояснений.
`
}
