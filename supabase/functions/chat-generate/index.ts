import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { conversation_id, incoming_message, action_type } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // если пришло новое сообщение девушки — сохраняем
    if (incoming_message) {
      await supabase.from("messages").insert({
        conversation_id,
        role: "girl",
        text: incoming_message,
      })
    }

    let suggestions: string[] = []

    switch (action_type) {
      case "reengage":
        suggestions = [
          "Куда ты пропала? Уже начал скучать 😉",
          "Ты жива? А то я уже переживать начал 😄",
          "Слушай, ты меня заинтриговала и исчезла — это хитрый план?"
        ]
        break

      case "contact":
        suggestions = [
          "Давай перейдём в Telegram? Так удобнее общаться 😊",
          "Может обменяемся контактами? Здесь не очень удобно.",
          "Хочу продолжить разговор вне этого приложения 😉"
        ]
        break

      case "date":
        suggestions = [
          "Давай продолжим этот разговор за чашкой кофе?",
          "Предлагаю встретиться и проверить нашу химию 😉",
          "Как насчёт увидеться вживую на этой неделе?"
        ]
        break

      default:
        suggestions = [
          "Интересно 😏 Расскажи подробнее",
          "Ого, вот это поворот. И что дальше?",
          "Ты всегда так загадочно отвечаешь? 😉"
        ]
    }

    return new Response(
      JSON.stringify({ suggestions, limit_reached: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ suggestions: [], limit_reached: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    )
  }
})
