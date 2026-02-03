import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  telegram_id: number;
  platform: string;
  stage: string;
  girl_info: string;
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  first: "Первое сообщение — нужно привлечь внимание",
  transition: "Ответ — продолжаем диалог",
  chatting: "Назначение свидания",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI_NOT_CONFIGURED" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const body: GenerateRequest = await req.json();

    // 1️⃣ ВАЛИДАЦИЯ
    if (
      !body.telegram_id ||
      !body.stage ||
      !body.girl_info
    ) {
      return new Response(
        JSON.stringify({
          error: "telegram_id, stage and girl_info are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2️⃣ ИЩЕМ ПОЛЬЗОВАТЕЛЯ
    let user: any = null;

    const { data: existingUser, error: findError } =
      await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", body.telegram_id)
        .maybeSingle();

    if (findError) {
      return new Response(
        JSON.stringify({ error: "FAILED_TO_FETCH_USER" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    user = existingUser;

    // 3️⃣ ЕСЛИ НЕТ — СОЗДАЁМ
    if (!user) {
      const now = new Date().toISOString();

      const { data: newUser, error: insertError } =
        await supabase
          .from("users")
          .insert({
            telegram_id: body.telegram_id,
            weekly_limit: 7,
            weekly_used: 0,
            week_started_at: now,
            created_at: now,
            last_active_at: now,
          })
          .select()
          .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "FAILED_TO_CREATE_USER" }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      user = newUser;
    }

    // 4️⃣ АВТОСБРОС ЛИМИТА
    const now = new Date();
    const weekStartedAt = new Date(user.week_started_at);

    const diffDays =
      (now.getTime() - weekStartedAt.getTime()) /
      (1000 * 60 * 60 * 24);

    if (diffDays >= 7) {
      await supabase
        .from("users")
        .update({
          weekly_used: 0,
          week_started_at: now.toISOString(),
        })
        .eq("telegram_id", body.telegram_id);

      user.weekly_used = 0;
      user.week_started_at = now.toISOString();
    }

    // 5️⃣ ПРОВЕРКА ЛИМИТА
    if (user.weekly_used >= user.weekly_limit) {
      const resetAt = new Date(
        new Date(user.week_started_at).getTime() +
          7 * 24 * 60 * 60 * 1000
      );

      return new Response(
        JSON.stringify({
          error: "LIMIT_REACHED",
          weekly_limit: user.weekly_limit,
          weekly_used: user.weekly_used,
          reset_at: resetAt.toISOString(),
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 6️⃣ PROMPT
    const stageDesc =
      STAGE_DESCRIPTIONS[body.stage] || body.stage;

    const systemPrompt = `
Ты — эксперт по знакомствам и флирту.
Пиши на русском языке.
Сообщения короткие (1–3 предложения).
Без банальностей, без пошлости.
Создавай интригу и желание ответить.
`;

    const userPrompt = `
Стадия общения: ${stageDesc}
Что известно о девушке: ${body.girl_info}

Верни JSON массив из 3 сообщений:
["сообщение 1", "сообщение 2", "сообщение 3"]
`;

    // 7️⃣ AI
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
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
      }
    );

    if (!aiResponse.ok) {
      return new Response(
        JSON.stringify({ error: "AI_ERROR" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const aiData = await aiResponse.json();
    const content =
      aiData.choices?.[0]?.message?.content ?? "";

    let messages: string[] = [];
    try {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) messages = JSON.parse(match[0]);
    } catch {}

    while (messages.length < 3) {
      messages.push(
        "Привет! Решил написать — ты выглядишь интересно 🙂"
      );
    }

    // 8️⃣ ИНКРЕМЕНТ
    const newUsed = user.weekly_used + 1;

    await supabase
      .from("users")
      .update({
        weekly_used: newUsed,
        last_active_at: now.toISOString(),
      })
      .eq("telegram_id", body.telegram_id);

    // 9️⃣ ОТВЕТ
    return new Response(
      JSON.stringify({
        messages: messages.slice(0, 3),
        weekly_limit: user.weekly_limit,
        weekly_used: newUsed,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
