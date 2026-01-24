import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface GenerateParams {
  platform: string;
  stage: string;
  girlInfo: string;
}

export async function generateMessages({
  platform,
  stage,
  girlInfo,
}: GenerateParams): Promise<string[]> {
  const prompt = `
Ты — харизматичный мужчина, который легко и естественно знакомится с девушками.

Контекст:
- Платформа: ${platform}
- Этап общения: ${stage}
- Информация о девушке: ${girlInfo}

Задача:
Придумай 3 варианта первого сообщения.
Сообщения должны быть:
- живые
- короткие
- не банальные
- без клише
- на русском языке
- без эмодзи
- без пошлости
- без давления

Верни ТОЛЬКО список сообщений, между каждыми новая строка.
  `.trim();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Ты эксперт по знакомствам и общению." },
      { role: "user", content: prompt },
    ],
    temperature: 0.9,
  });

  const text = response.choices[0].message.content || "";

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

