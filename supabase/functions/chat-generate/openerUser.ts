export const buildOpenerUserPrompt = (facts: string) => {
  return `
Описание девушки:
${facts}

Создай 3 максимально цепляющих первых сообщения.
Каждое сообщение должно начинаться с §
`
}
