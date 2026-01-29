import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  telegram_id: number;
  platform: string;
  stage: string;
  girl_info: string;
}

const PLATFORM_DESCRIPTIONS: Record<string, string> = {
  tinder: "Tinder — приложение для знакомств с фокусом на фото и коротких био",
  pure: "Pure — приложение для откровенных знакомств, прямой подход",
  twinby: "Twinby — приложение для знакомств с акцентом на общие интересы",
  instagram: "Instagram — социальная сеть, знакомство через контент и сторис",
  real: "Реальная жизнь — знакомство произошло офлайн, обмен контактами",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  first: "Первое сообщение — нужно привлечь внимание и начать диалог",
  transition: "Придумать ответ — уже есть контакт, нужно продолжить общение",
  chatting: "Уже общаемся — нужно вывести на встречу или углубить общение",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: GenerateRequest = await req.json();

    // Валидация
    if (!body.telegram_id || !body.platform || !body.stage || !body.girl_info) {
      return new Response(
        JSON.stringify({ error: "telegram_id, platform, stage and girl_info are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", body.telegram_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found. Please authenticate first." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Формируем промпт для AI
    const platformDesc = PLATFORM_DESCRIPTIONS[body.platform] || body.platform;
    const stageDesc = STAGE_DESCRIPTIONS[body.stage] || body.stage;

    const systemPrompt = `Ты — эксперт по знакомствам и флирту. Твоя задача — генерировать привлекательные, естественные сообщения для общения с девушками.

Правила:
- Пиши на русском языке
- Будь уверенным, но не высокомерным
- Используй лёгкий юмор и остроумие
- Персонализируй сообщения на основе информации о девушке
- Избегай банальностей типа "Привет, как дела?"
- Не будь навязчивым или пошлым
- Сообщения должны быть короткими (1-3 предложения)
- Создавай интригу и желание ответить`;

    const userPrompt = `Контекст:
- Платформа: ${platformDesc}
- Стадия общения: ${stageDesc}
- Что известно о девушке: ${body.girl_info}

Сгенерируй 3 варианта сообщений. Каждый вариант должен быть уникальным по стилю и подходу.

Верни только JSON массив из 3 строк, без дополнительного текста:
["сообщение 1", "сообщение 2", "сообщение 3"]`;

    // Запрос к Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI error:", await aiResponse.text());
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Парсим JSON из ответа
    let messages: string[] = [];
    try {
      // Ищем JSON массив в ответе
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        messages = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Fallback: разбиваем по строкам
      messages = content
        .split("\n")
        .filter((line: string) => line.trim())
        .slice(0, 3);
    }

    // Убеждаемся что есть хотя бы 3 сообщения
    while (messages.length < 3) {
      messages.push("Привет! Заметил тебя и решил написать. Расскажи о себе?");
    }

    // Сохраняем запрос в базу
    const { error: requestError } = await supabase
      .from("requests")
      .insert({
        user_id: user.id,
        platform: body.platform,
        stage: body.stage,
        girl_info: body.girl_info,
        response_count: messages.length,
      });

    if (requestError) {
      console.error("Error saving request:", requestError);
      // Не прерываем — сообщения уже сгенерированы
    }

    return new Response(
      JSON.stringify({
        success: true,
        messages: messages.slice(0, 3),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
