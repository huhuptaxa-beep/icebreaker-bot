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
    const { conversation_id, selected_text, role, init_data, opener_variant_id } = await req.json()
    console.log("CHAT SAVE BACKEND INPUT", {
      conversation_id,
      role,
      text: selected_text,
      opener_variant_id: opener_variant_id ?? null,
    })

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
    const normalizedOpenerVariantId =
      typeof opener_variant_id === "string" && opener_variant_id.trim().length > 0
        ? opener_variant_id.trim()
        : null

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

    const nowIso = new Date().toISOString()
    const currentChannel = conv.channel === "telegram" ? "telegram" : "app"
    const messageCountTinder = (conv.message_count_tinder || 0) + (currentChannel === "app" ? 1 : 0)
    const messageCountTg = (conv.message_count_tg || 0) + (currentChannel === "telegram" ? 1 : 0)
    const strategyResult = runStrategyEngine(conv, selected_text, safeRole)

    const conversationUpdate: Record<string, unknown> = {
      base_interest_score: strategyResult.baseInterest,
      effective_interest: strategyResult.effectiveInterest,
      freshness_multiplier: strategyResult.freshness,
      high_interest_streak: strategyResult.highInterestStreak,
      low_interest_streak: strategyResult.lowInterestStreak,
      phase: strategyResult.phase,
      has_future_projection: strategyResult.hasFutureProjection,
      telegram_invite_attempts: strategyResult.telegramInviteAttempts,
      date_invite_attempts: strategyResult.dateInviteAttempts,
      last_message_timestamp: nowIso,
      message_count_tinder: messageCountTinder,
      message_count_tg: messageCountTg,
      phase_message_count: (conv.phase_message_count || 0) + 1,
    }

    if (safeRole === "user") {
      conversationUpdate.last_user_message_at = nowIso
    } else {
      conversationUpdate.last_girl_message_at = nowIso
    }

    const { error: conversationUpdateError } = await supabase
      .from("conversations")
      .update(conversationUpdate)
      .eq("id", conversation_id)

    if (conversationUpdateError) {
      throw conversationUpdateError
    }

    if (normalizedOpenerVariantId) {
      const { data: wasSentUpdateData, error: wasSentUpdateError } = await supabase
        .from("opener_variants")
        .update({ was_sent: true })
        .eq("id", normalizedOpenerVariantId)
        .select("id, was_sent")

      console.log("WAS_SENT UPDATE RESULT", {
        opener_variant_id: normalizedOpenerVariantId,
        error: wasSentUpdateError ?? null,
        data: wasSentUpdateData ?? null,
      })

      if (wasSentUpdateError) {
        console.error("chat-save opener_variants update error:", wasSentUpdateError)
      }
    }

    if (safeRole === "girl" && conversation_id) {
      try {
        const { data: generationRows, error: generationsError } = await supabase
          .from("opener_generations")
          .select("id")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: false })

        if (generationsError) {
          console.error("chat-save opener_generations lookup error:", generationsError)
        } else if (generationRows?.length) {
          const orderedGenerationIds = generationRows
            .map((row) => row?.id)
            .filter((id: string | null | undefined): id is string => Boolean(id))

          for (const generationId of orderedGenerationIds) {
            const { data: candidateVariants, error: candidateError } = await supabase
              .from("opener_variants")
              .select("id")
              .eq("generation_id", generationId)
              .eq("was_sent", true)
              .is("got_reply", null)
              .limit(1)

            if (candidateError) {
              console.error("chat-save opener_variants candidate lookup error:", candidateError)
              continue
            }

            const targetVariantId = candidateVariants?.[0]?.id
            if (!targetVariantId) {
              continue
            }

            const { error: replyFlagError } = await supabase
              .from("opener_variants")
              .update({ got_reply: true })
              .eq("id", targetVariantId)

            if (replyFlagError) {
              console.error("chat-save opener_variants got_reply update error:", replyFlagError)
            }

            break
          }
        }
      } catch (openerReplyError) {
        console.error("chat-save opener got_reply pipeline error:", openerReplyError)
      }
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
