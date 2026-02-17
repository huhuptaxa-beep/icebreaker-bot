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

    if (!telegram_id) {
      return new Response(
        JSON.stringify({ error: "telegram_id missing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

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

    /* ================= REPLY (MEMORY-AWARE) ================= */

    else {
      systemPrompt = REPLY_SYSTEM_PROMPT

      if (!conversation_id) {
        return new Response(
          JSON.stringify({ error: "conversation_id missing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // Проверяем владельца диалога
      const { data: conv } = await supabase
        .from("conversations")
        .select("user_id")
        .eq("id", conversation_id)
        .single()

      if (!conv || String(conv.user_id) !== String(telegram_id)) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        )
      }

      // ❌ УБРАЛИ INSERT девушки здесь — перенесён ПОСЛЕ Claude

      // Получаем ПОСЛЕДНИЕ 20 сообщений
      const { data: historyDesc } = await supabase
        .from("messages")
        .select("role, text, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(20)

      // Разворачиваем в хронологический порядок (старые → новые)
      const history = (historyDesc || []).reverse()

      // Добавляем incoming_message в контекст (но ещё НЕ в БД)
      if (incoming_message) {
        history.push({
          role: "girl",
          text: incoming_message,
          created_at: new Date().toISOString(),
        })
      }

      if (history.length === 0) {
        return new Response(
          JSON.stringify({ error: "No messages" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // Последнее сообщение девушки
      const lastMessage = history[history.length - 1]

      // История БЕЗ последнего сообщения
      const previousMessages = history.slice(0, -1)

      const historyText = previousMessages
        .map((msg) => {
          const prefix = msg.role === "user" ? "Ты" : "Она"
          return `${prefix}: ${msg.text}`
        })
        .join("\n")

      const lastGirlText =
        lastMessage.role === "girl"
          ? lastMessage.text
          : incoming_message || ""

      userPrompt = buildReplyUserPrompt(historyText, lastGirlText)
    }

    /* ================= CLAUDE ================= */

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 сек таймаут

    let anthropicRes
    try {
      anthropicRes = await fetch(
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
            messages: [{ role: "user", content: userPrompt }],
          }),
          signal: controller.signal,
        }
      )
    } finally {
      clearTimeout(timeout)
    }

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error("ANTHROPIC ERROR:", anthropicData)
      return new Response(
        JSON.stringify({ error: "Claude API failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      )
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

    // ✅ Claude ответил успешно — ТЕПЕРЬ сохраняем сообщение девушки
    if (action_type !== "opener" && incoming_message && conversation_id) {
      await supabase.from("messages").insert({
        conversation_id,
        role: "girl",
        text: incoming_message,
      })
    }

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
    console.error("chat-generate ERROR:", error)

    return new Response(
      JSON.stringify({ error: "Generation failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})