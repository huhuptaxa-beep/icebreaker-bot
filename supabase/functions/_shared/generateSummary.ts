export async function generateSummary(
  messages: { role: string; text: string }[],
  apiKey: string
): Promise<string> {
  const historyText = messages
    .map((m) => `${m.role === "user" ? "Ты" : "Она"}: ${m.text}`)
    .join("\n")

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Сделай краткое резюме этой переписки в 3-5 предложениях. Сохрани ключевые факты о девушке, её интересы, настроение диалога и о чём говорили:\n\n${historyText}`,
          },
        ],
      }),
    })

    if (!res.ok) return ""
    const data = await res.json()
    return data.content?.[0]?.text ?? ""
  } catch {
    return ""
  }
}
