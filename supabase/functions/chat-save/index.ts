import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { validateInitData } from "../_shared/validateTelegram.ts"
import { runStrategyEngine } from "../_shared/strategy/engine.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { conversation_id, selected_text, role, init_data } = await req.json()

    if (!conversation_id || !selected_text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Validate Telegram initData
    const BOT_TOKEN = Deno.env.get("BOT_TOKEN")
    if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing")

    const { valid, telegram_id } = await validateInitData(init_data || "", BOT_TOKEN)
    if (!valid || !telegram_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Проверяем владельца диалога и загружаем полный conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .single()

    if (!conv || String(conv.user_id) !== String(telegram_id)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      )
    }

    const safeRole = role === "girl" ? "girl" : "user"

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        role: safeRole,
        text: selected_text
      })
      .select()
      .single()

    if (error) throw error

    // Если сохраняем сообщение пользователя — запускаем strategy engine для user-специфичных полей
    if (safeRole === "user" && conv) {
      const strategyResult = runStrategyEngine(conv, selected_text, "user")

      await supabase
        .from("conversations")
        .update({
          has_future_projection: strategyResult.hasFutureProjection,
          telegram_invite_attempts: strategyResult.telegramInviteAttempts,
          date_invite_attempts: strategyResult.dateInviteAttempts,
          last_message_timestamp: new Date().toISOString()
        })
        .eq("id", conversation_id)
    }

    return new Response(
      JSON.stringify({ message: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("chat-save error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to save message" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
