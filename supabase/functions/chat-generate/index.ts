import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { validateInitData } from "../_shared/validateTelegram.ts"
import { generateSummary } from "../_shared/generateSummary.ts"

import { OPENER_SYSTEM_PROMPT } from "./openerSystem.ts"
import { REPLY_SYSTEM_PROMPT } from "./replySystem.ts"
import { buildOpenerUserPrompt } from "./openerUser.ts"
import { buildReplyUserPrompt } from "./replyUser.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const FREE_WEEKLY_LIMIT = 7

// Extra instructions appended to REPLY_SYSTEM_PROMPT based on action_type
const ACTION_INSTRUCTIONS: Record<string, string> = {
  reengage:
    "\n\nДОПОЛНИТЕЛЬНАЯ ЗАДАЧА: Девушка давно не отвечала. Напиши сообщение, которое ненавязчиво возобновит диалог — интригующее, без нужды и давления.",
  contact:
    "\n\nДОПОЛНИТЕЛЬНАЯ ЗАДАЧА: Пора попросить контакт (телефон/Инстаграм). Сделай это непринуждённо, как бы между делом, не оказывая давления.",
  date:
    "\n\nДОПОЛНИТЕЛЬНАЯ ЗАДАЧА: Пора звать на свидание. Предложи конкретную активность и день недели. Уверенно, без нытья.",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { conversation_id, incoming_message, action_type, init_data, facts } = body

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

    /* =====================
       LIMIT CHECK
    ===================== */

    const { data: user } = await supabase
      .from("users")
      .select("weekly_used, weekly_limit, week_started_at, generations_balance")
      .eq("telegram_id", telegram_id)
      .maybeSingle()

    const now = new Date()

    // Reset weekly counter if 7+ days have passed
    const weekStarted = user?.week_started_at ? new Date(user.week_started_at) : now
    const weekExpired = now.getTime() - weekStarted.getTime() >= 7 * 86400 * 1000

    const weeklyLimit = user?.weekly_limit ?? FREE_WEEKLY_LIMIT
    const weeklyUsed = weekExpired ? 0 : (user?.weekly_used ?? 0)
    const paidBalance = user?.generations_balance ?? 0

    const hasFree = weeklyUsed < weeklyLimit
    const hasPaid = paidBalance > 0

    if (!hasFree && !hasPaid) {
      return new Response(
        JSON.stringify({
          suggestions: [],
          limit_reached: true,
          free_remaining: 0,
          paid_remaining: paidBalance,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    /* =====================
       BUILD PROMPTS
    ===================== */

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY missing")

    let systemPrompt = ""
    let userPrompt = ""

    if (action_type === "opener") {
      systemPrompt = OPENER_SYSTEM_PROMPT
      userPrompt = buildOpenerUserPrompt(facts || "")
    } else {
      const actionInstruction = ACTION_INSTRUCTIONS[action_type] ?? ""
      systemPrompt = REPLY_SYSTEM_PROMPT + actionInstruction

      if (!conversation_id) {
        return new Response(
          JSON.stringify({ error: "conversation_id missing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // Ownership check + fetch summary
      const { data: conv } = await supabase
        .from("conversations")
        .select("user_id, summary")
        .eq("id", conversation_id)
        .single()

      if (!conv || String(conv.user_id) !== String(telegram_id)) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        )
      }

      // Last 20 messages (newest first → reverse for chronological order)
      const { data: historyDesc } = await supabase
        .from("messages")
        .select("role, text, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(20)

      const history = (historyDesc || []).reverse()

      if (incoming_message) {
        history.push({ role: "girl", text: incoming_message, created_at: now.toISOString() })
      }

      if (history.length === 0) {
        return new Response(
          JSON.stringify({ error: "No messages" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      /* ---- Memory V2: use summary + last 8 when history > 12 ---- */
      let conversationSummary: string | undefined

      if (history.length > 12) {
        conversationSummary = conv.summary || undefined

        if (!conversationSummary) {
          // Generate summary from the older portion of the history
          const olderMessages = history.slice(0, history.length - 8)
          const generated = await generateSummary(olderMessages, ANTHROPIC_KEY)
          if (generated) {
            conversationSummary = generated
            // Persist summary (fire-and-forget)
            supabase
              .from("conversations")
              .update({ summary: generated, summary_updated_at: now.toISOString() })
              .eq("id", conversation_id)
              .then(() => {})
          }
        }
      }

      // Slice to recent context window
      const contextMessages = conversationSummary ? history.slice(-8) : history
      const lastMessage = contextMessages[contextMessages.length - 1]
      const previousMessages = contextMessages.slice(0, -1)

      const historyText = previousMessages
        .map((msg) => `${msg.role === "user" ? "Ты" : "Она"}: ${msg.text}`)
        .join("\n")
      const lastGirlText =
        lastMessage.role === "girl" ? lastMessage.text : incoming_message || ""

      userPrompt = buildReplyUserPrompt(historyText, lastGirlText, conversationSummary)
    }

    /* =====================
       CLAUDE API (with prompt caching)
    ===================== */

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    let anthropicRes
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 450,
          temperature: 0.85,
          system: [
            { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
          ],
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      })
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

    /* =====================
       POST-SUCCESS WRITES
    ===================== */

    // Save girl's incoming message to DB
    if (action_type !== "opener" && incoming_message && conversation_id) {
      await supabase.from("messages").insert({
        conversation_id,
        role: "girl",
        text: incoming_message,
      })
    }

    // Log usage (fire-and-forget)
    supabase
      .from("usage_logs")
      .insert({
        telegram_id,
        conversation_id: action_type !== "opener" ? conversation_id : null,
        action_type: action_type ?? null,
        input_tokens: anthropicData.usage?.input_tokens ?? 0,
        output_tokens: anthropicData.usage?.output_tokens ?? 0,
        cache_read_input_tokens: anthropicData.usage?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: anthropicData.usage?.cache_creation_input_tokens ?? 0,
      })
      .then(() => {})

    // Deduct generation from the right bucket: free first, then paid
    let newWeeklyUsed = weeklyUsed
    let newPaidBalance = paidBalance

    if (hasFree) {
      newWeeklyUsed = weeklyUsed + 1
      await supabase
        .from("users")
        .update({
          weekly_used: newWeeklyUsed,
          ...(weekExpired ? { week_started_at: now.toISOString() } : {}),
        })
        .eq("telegram_id", telegram_id)
    } else {
      // Deduct from paid balance atomically
      newPaidBalance = paidBalance - 1
      await supabase.rpc("increment_generations_balance", {
        p_telegram_id: telegram_id,
        p_amount: -1,
      })
    }

    return new Response(
      JSON.stringify({
        suggestions,
        limit_reached: false,
        free_remaining: Math.max(0, weeklyLimit - newWeeklyUsed),
        paid_remaining: newPaidBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("chat-generate ERROR:", error)
    return new Response(
      JSON.stringify({ error: "Generation failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
