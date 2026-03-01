import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { validateInitData } from "../_shared/validateTelegram.ts"
import { STRATEGY_CONFIG } from "../_shared/strategy/config.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { conversation_id, action, init_data } = await req.json()

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

    const updateData: any = {}

    if (action === "telegram_success") {
      updateData.phase = 3
      updateData.channel = "telegram"
      updateData.phase_message_count = 0
      // Если interest ниже 40, установить на 40
      const currentInterest = conv.base_interest_score || 5
      if (currentInterest < 40) {
        updateData.base_interest_score = 40
        updateData.effective_interest = 40
      }
    }

    if (action === "telegram_fail") {
      const newInterest = Math.max(
        STRATEGY_CONFIG.interest.min,
        (conv.base_interest_score || 5) + STRATEGY_CONFIG.interest.weights.rejectionPenalty
      )
      updateData.base_interest_score = newInterest
      updateData.effective_interest = newInterest * (conv.freshness_multiplier || 1)
      updateData.telegram_invite_attempts = (conv.telegram_invite_attempts || 0) + 1
    }

    if (action === "date_success") {
      updateData.phase = 5
      updateData.base_interest_score = 100
      updateData.effective_interest = 100
    }

    if (action === "date_fail") {
      const newInterest = Math.max(
        STRATEGY_CONFIG.interest.min,
        (conv.base_interest_score || 5) + STRATEGY_CONFIG.interest.weights.rejectionPenalty
      )
      updateData.base_interest_score = newInterest
      updateData.effective_interest = newInterest * (conv.freshness_multiplier || 1)
      updateData.date_invite_attempts = (conv.date_invite_attempts || 0) + 1
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", conversation_id)
    }

    return new Response(
      JSON.stringify({ success: true, action, phase: updateData.phase || conv.phase }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("confirm-action ERROR:", error)
    return new Response(
      JSON.stringify({ error: "Action failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
