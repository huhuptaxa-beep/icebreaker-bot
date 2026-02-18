export function buildReplyUserPrompt(
  historyText: string,
  lastGirlMessage: string,
  summary?: string,
  styleText?: string
) {
  const styleBlock = styleText ? `Стиль общения:\n${styleText}\n\n` : ""

  if (summary) {
    return `${styleBlock}Краткое резюме предыдущей переписки:
${summary}

Последние сообщения:
${historyText}

Последнее сообщение девушки:
${lastGirlMessage}

Твоя задача — ответить именно на её последнее сообщение.
Используй резюме и историю как контекст.
Не анализируй вслух.
Выведи только 3 варианта ответа.
Каждый вариант начинай с символа §.
`
  }

  return `${styleBlock}История переписки (от старых к новым):
${historyText}

Последнее сообщение девушки:
${lastGirlMessage}

Твоя задача — ответить именно на её последнее сообщение.
Используй историю как контекст.
Не анализируй вслух.
Выведи только 3 варианта ответа.
Каждый вариант начинай с символа §.
`
}



