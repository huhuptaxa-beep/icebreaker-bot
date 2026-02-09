import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MOCK_MESSAGES: Record<string, string[]> = {
  first: [
    "Ты выглядишь как человек, с которым легко залипнуть в разговоре 🙂",
    "Редко пишу первым, но тут стало любопытно — ты чем живёшь?",
    "В твоём профиле есть что-то цепляющее. Решил не проходить мимо.",
  ],
  transition: [
    "Интересно ты рассуждаешь. А часто так смотришь на вещи?",
    "Мне нравится ход твоих мыслей. Продолжай 🙂",
    "Вот сейчас стало реально интересно с тобой общаться.",
  ],
  chatting: [
    "Кажется, пора проверить, так ли ты интересна вживую 🙂",
    "Давай не тянуть — кофе или прогулка на этой неделе?",
    "Онлайн — это хорошо, но давай лучше увидимся.",
  ],
};

function pickRandom(arr: string[]) {
  return arr.sort(() => 0.5 - Math.random()).slice(0, 3);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json();
    const { stage } = body;

    const baseMessages =
      MOCK_MESSAGES[stage] ?? MOCK_MESSAGES.first;

    const messages = pickRandom(baseMessages);

    return new Response(
      JSON.stringify({
        messages,
        weekly_limit: 7,
        weekly_used: 1,
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
      { status: 500, headers: corsHeaders }
    );
  }
});
