import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { OPENER_SYSTEM_PROMPT } from "./openerSystem.ts"
import { REPLY_SYSTEM_PROMPT } from "./replySystem.ts"
import { buildOpenerUserPrompt } from "./openerUser.ts"
import { buildReplyUserPrompt } from "./replyUser.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    const {
      conversation_id,
      incoming_message,
      action_type,
      telegram_id,
      facts,
    } = body

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY missing")

    let systemPrompt = ""
    let userPrompt = ""

    /* ================= OPENER ================= */

    if (action_type === "opener") {
      systemPrompt = OPENER_SYSTEM_PROMPT
      userPrompt = buildOpenerUserPrompt(facts || "")
    }

    /* ================= REPLY (WITH CONTEXT) ================= */

    else {
      systemPrompt = REPLY_SYSTEM_PROMPT

      if (!conversation_id) {
        throw new Error("conversation_id missing")
      }

      /* 1️⃣ Сохраняем сообщение девушки */
      if (incoming_message) {
        await supabase.from("messages").insert({
          conversation_id,
          role: "girl",
          text: incoming_message,
        })
      }

      /* 2️⃣ Получаем 20 последних сообщений */
      const { data: history } = await supabase
        .from("messages")
        .select("role, text, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(20)

      const orderedHistory = (history || []).reverse()

      /* 3️⃣ Формируем текст диалога */
      const historyText = orderedHistory
        .map((msg) => {
          const prefix = msg.role === "user" ? "Ты" : "Она"
          return `${prefix}: ${msg.text}`
        })
        .join("\n")

      /* 4️⃣ Передаём историю в prompt */
      userPrompt = buildReplyUserPrompt(historyText)
    }

    /* ================= CLAUDE ================= */

    const anthropicRes = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 450,
          temperature: 0.85,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      }
    )

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.log("ANTHROPIC ERROR:", anthropicData)
      throw new Error("Anthropic request failed")
    }

    const rawText =
      anthropicData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n") || ""

    let suggestions = rawText
      .split("§")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)

    if (suggestions.length === 0) {
      suggestions = rawText
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 8)
    }

    suggestions = suggestions.slice(0, 3)

    return new Response(
      JSON.stringify({
        suggestions,
        limit_reached: false,
        weekly_used: 0,
        weekly_limit: 0,
        remaining: 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.log("ERROR:", error)

    return new Response(
      JSON.stringify({
        suggestions: ["Ошибка генерации"],
        limit_reached: false,
        weekly_used: 0,
        weekly_limit: 0,
        remaining: 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  }
})
