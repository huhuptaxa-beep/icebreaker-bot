export const buildOpenerUserPrompt = (facts: string, styleText?: string) => {
  const styleBlock = styleText ? `Стиль общения:\n${styleText}\n\n` : ""

  return `${styleBlock}Описание девушки:
${facts}

Создай 3 максимально цепляющих первых сообщения.
Каждое сообщение должно начинаться с §
`
}
