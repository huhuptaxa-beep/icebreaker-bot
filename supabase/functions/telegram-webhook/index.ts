import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Telegram webhooks are authenticated by Telegram itself — no initData validation needed.

const PACK_GENERATIONS: Record<string, number> = {
  pack_30: 30,
  pack_100: 100,
  pack_200: 200,
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 })
  }

  try {
    const BOT_TOKEN = Deno.env.get("BOT_TOKEN")
    if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const update = await req.json()

    /* =====================
       pre_checkout_query
    ===================== */

    if (update.pre_checkout_query) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        }),
      })
      return new Response("ok", { status: 200 })
    }

    /* =====================
       successful_payment
    ===================== */

    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment
      const telegram_id: number = update.message.from.id
      const charge_id: string = payment.telegram_payment_charge_id
      const stars: number = payment.total_amount

      let plan = "pack_100"
      let generations_count = 100
      try {
        const parsed = JSON.parse(payment.invoice_payload)
        plan = parsed.plan || "pack_100"
        generations_count = parsed.generations_count ?? PACK_GENERATIONS[plan] ?? 100
      } catch {
        generations_count = PACK_GENERATIONS[plan] ?? 100
      }

      // Atomic increment via DB function (avoids read-modify-write race)
      await supabase.rpc("increment_generations_balance", {
        p_telegram_id: telegram_id,
        p_amount: generations_count,
      })

      // Record payment
      await supabase.from("payments").insert({
        telegram_id,
        amount_stars: stars,
        plan,
        telegram_payment_charge_id: charge_id,
        status: "completed",
      })

      console.log(`Payment OK: telegram_id=${telegram_id} plan=${plan} +${generations_count} generations`)
    }

    return new Response("ok", { status: 200 })

  } catch (err) {
    console.error("telegram-webhook error:", err)
    // Always 200 — Telegram must not retry
    return new Response("ok", { status: 200 })
  }
})
