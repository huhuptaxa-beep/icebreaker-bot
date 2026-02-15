export const buildOpenerUserPrompt = (facts: string) => {
  return `
Факты о девушке:
${facts}

Задача:
Сгенерируй 20 первых сообщения. Выбери три лучших из них.
`
}
