import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validateInitData } from "../_shared/validateTelegram.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface PlanInfo {
  title: string
  description: string
  stars: number
  generations_count: number
}

const PLANS: Record<string, PlanInfo> = {
  pack_30: {
    title: "30 генераций",
    description: "Пакет из 30 генераций сообщений",
    stars: 199,
    generations_count: 30,
  },
  pack_100: {
    title: "100 генераций",
    description: "Пакет из 100 генераций сообщений",
    stars: 499,
    generations_count: 100,
  },
  pack_200: {
    title: "200 генераций",
    description: "Пакет из 200 генераций сообщений — выгодно!",
    stars: 799,
    generations_count: 200,
  },
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { plan, init_data } = await req.json()

    const planInfo = PLANS[plan]
    if (!planInfo) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const BOT_TOKEN = Deno.env.get("BOT_TOKEN")
    if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing")

    const { valid, telegram_id } = await validateInitData(init_data || "", BOT_TOKEN)
    if (!valid || !telegram_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const payload = JSON.stringify({
      telegram_id,
      plan,
      generations_count: planInfo.generations_count,
    })

    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: planInfo.title,
          description: planInfo.description,
          payload,
          currency: "XTR",
          prices: [{ label: planInfo.title, amount: planInfo.stars }],
        }),
      }
    )

    const tgData = await tgRes.json()

    if (!tgData.ok) {
      console.error("Telegram createInvoiceLink error:", tgData)
      return new Response(
        JSON.stringify({ error: "Failed to create invoice" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      )
    }

    return new Response(
      JSON.stringify({ invoice_link: tgData.result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (err) {
    console.error("create-invoice error:", err)
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
