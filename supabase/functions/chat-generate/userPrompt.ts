export function buildUserPrompt(
  messageType: "first_message" | "reply",
  profileInfo: string,
  conversationContext: string,
  lastMessage: string,
  summary?: string
): string {
  let prompt = `Тип сообщения: ${messageType}\n`

  if (profileInfo) {
    prompt += `\nИнформация о девушке:\n${profileInfo}\n`
  }

  if (summary) {
    prompt += `\nКраткое резюме предыдущей переписки:\n${summary}\n`
  }

  if (conversationContext) {
    prompt += `\nКонтекст переписки:\n${conversationContext}\n`
  }

  if (lastMessage) {
    prompt += `\nПоследнее сообщение девушки:\n${lastMessage}\n`
  }

  return prompt
}
