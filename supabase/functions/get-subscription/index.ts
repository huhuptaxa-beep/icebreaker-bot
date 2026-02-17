import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { validateInitData } from "../_shared/validateTelegram.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const FREE_WEEKLY_LIMIT = 7

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { init_data } = await req.json()

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

    const { data: user } = await supabase
      .from("users")
      .select("weekly_used, weekly_limit, week_started_at, generations_balance")
      .eq("telegram_id", telegram_id)
      .maybeSingle()

    if (!user) {
      const resetAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString()
      return new Response(
        JSON.stringify({
          free_remaining: FREE_WEEKLY_LIMIT,
          paid_remaining: 0,
          free_reset_at: resetAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    const now = new Date()
    const weekStarted = user.week_started_at ? new Date(user.week_started_at) : now
    const weekExpired = now.getTime() - weekStarted.getTime() >= 7 * 86400 * 1000

    const weeklyLimit = user.weekly_limit ?? FREE_WEEKLY_LIMIT
    const weeklyUsed = weekExpired ? 0 : (user.weekly_used ?? 0)
    const freeRemaining = Math.max(0, weeklyLimit - weeklyUsed)
    const paidRemaining = user.generations_balance ?? 0

    // Reset week counter in DB if expired (fire-and-forget)
    if (weekExpired) {
      supabase
        .from("users")
        .update({ weekly_used: 0, week_started_at: now.toISOString() })
        .eq("telegram_id", telegram_id)
        .then(() => {})
    }

    const freeResetAt = new Date(weekStarted.getTime() + 7 * 86400 * 1000).toISOString()

    return new Response(
      JSON.stringify({
        free_remaining: freeRemaining,
        paid_remaining: paidRemaining,
        free_reset_at: weekExpired
          ? new Date(now.getTime() + 7 * 86400 * 1000).toISOString()
          : freeResetAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (err) {
    console.error("get-subscription error:", err)
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
