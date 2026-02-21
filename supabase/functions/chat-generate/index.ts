import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { validateInitData } from "../_shared/validateTelegram.ts"
import { generateSummary } from "../_shared/generateSummary.ts"
import { runStrategyEngine } from "../_shared/strategy/engine.ts"

import { OPENER_SYSTEM_PROMPT } from "./openerSystemPrompt.ts"
import { REPLY_SYSTEM_PROMPT } from "./replySystemPrompt.ts"
import { STYLE_BOLD } from "./styleBold.ts"
import { STYLE_ROMANTIC } from "./styleRomantic.ts"
import { STYLE_BADGUY } from "./stylebadguy.ts"
import { STYLE_DEFAULT } from "./styleDefault.ts"
import { buildUserPrompt } from "./userPrompt.ts"
import { DATE_INSTRUCTIONS } from "./dateInstructions.ts"
import { CONTACT_INSTRUCTIONS } from "./contactInstructions.ts"
import { REENGAGE_INSTRUCTIONS } from "./reengageInstructions.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const FREE_WEEKLY_LIMIT = 7

const STYLE_MAP: Record<string, string> = {
  bold: STYLE_BOLD,
  romantic: STYLE_ROMANTIC,
  badguy: STYLE_BADGUY,
  default: STYLE_DEFAULT,
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
      init_data,
      facts,
      style
    } = body

    /* =====================
       AUTH
    ===================== */

    const BOT_TOKEN = Deno.env.get("BOT_TOKEN")
    if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing")

    const { valid, telegram_id } =
      await validateInitData(init_data || "", BOT_TOKEN)

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

    const weekStarted = user?.week_started_at
      ? new Date(user.week_started_at)
      : now

    const weekExpired =
      now.getTime() - weekStarted.getTime() >= 7 * 86400 * 1000

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
       PROMPT BASE
    ===================== */

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY missing")

    let baseSystemPrompt =
      action_type === "opener"
        ? OPENER_SYSTEM_PROMPT
        : REPLY_SYSTEM_PROMPT

    let fullSystemPrompt = baseSystemPrompt

    if (action_type === "date")
      fullSystemPrompt += "\n\n" + DATE_INSTRUCTIONS

    if (action_type === "contact")
      fullSystemPrompt += "\n\n" + CONTACT_INSTRUCTIONS

    if (action_type === "reengage")
      fullSystemPrompt += "\n\n" + REENGAGE_INSTRUCTIONS

    const styleText = STYLE_MAP[style] || STYLE_DEFAULT
    const messageType =
      action_type === "opener" ? "first_message" : "reply"

    let profileInfo = ""
    let conversationContext = ""
    let lastMessage = ""
    let conversationSummary: string | undefined

    /* =====================
       OPENER MODE
    ===================== */

    if (messageType === "first_message") {
      profileInfo = facts || ""
      lastMessage = incoming_message || ""
    }

    /* =====================
       REPLY MODE
    ===================== */

    if (messageType === "reply") {

      if (!conversation_id) {
        return new Response(
          JSON.stringify({ error: "conversation_id missing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

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

      /* =====================
         STRATEGY ENGINE
      ===================== */

      let strategyResult = null

      if (incoming_message) {
        strategyResult = runStrategyEngine(
          conv,
          incoming_message,
          "girl"
        )

        await supabase
          .from("conversations")
          .update({
            stage: strategyResult.stage,
            base_interest_score: strategyResult.baseInterest,
            effective_interest: strategyResult.effectiveInterest,
            freshness_multiplier: strategyResult.freshness,
            has_future_projection: strategyResult.hasFutureProjection,
            telegram_invite_attempts: strategyResult.telegramInviteAttempts,
            date_invite_attempts: strategyResult.dateInviteAttempts,
            last_message_timestamp: now.toISOString()
          })
          .eq("id", conversation_id)

        // Передаём стратегию в system prompt
        fullSystemPrompt += `

CURRENT_STAGE: ${strategyResult.stage}
EFFECTIVE_INTEREST: ${strategyResult.effectiveInterest}
NEXT_OBJECTIVE: ${strategyResult.nextObjective}

ВАЖНО:
Если NEXT_OBJECTIVE = TELEGRAM_INVITE — один вариант обязан предложить переход.
Если NEXT_OBJECTIVE = DATE_INVITE — один вариант обязан предложить конкретное время.
Если NEXT_OBJECTIVE = REWARM — лёгкий эмоциональный пинг.
Если NEXT_OBJECTIVE = SALVAGE — смена динамики.
`
      }

      /* =====================
         LOAD HISTORY
      ===================== */

      const { data: historyDesc } = await supabase
        .from("messages")
        .select("role, text, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: false })
        .limit(20)

      const history = (historyDesc || []).reverse()

      if (incoming_message) {
        history.push({
          role: "girl",
          text: incoming_message,
          created_at: now.toISOString()
        })
      }

      if (history.length === 0) {
        return new Response(
          JSON.stringify({ error: "No messages" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      if (history.length > 12) {
        conversationSummary = conv.summary || undefined

        if (!conversationSummary) {
          const olderMessages = history.slice(0, history.length - 8)
          const generated =
            await generateSummary(olderMessages, ANTHROPIC_KEY)

          if (generated) {
            conversationSummary = generated
            supabase
              .from("conversations")
              .update({
                summary: generated,
                summary_updated_at: now.toISOString()
              })
              .eq("id", conversation_id)
          }
        }
      }

      const contextMessages =
        conversationSummary ? history.slice(-8) : history

      const lastMsg =
        contextMessages[contextMessages.length - 1]

      const previousMessages =
        contextMessages.slice(0, -1)

      conversationContext = previousMessages
        .map((msg) =>
          `${msg.role === "user" ? "Ты" : "Она"}: ${msg.text}`
        )
        .join("\n")

      lastMessage =
        lastMsg.role === "girl"
          ? lastMsg.text
          : incoming_message || ""
    }

    const userPrompt = buildUserPrompt(
      messageType,
      profileInfo,
      conversationContext,
      lastMessage,
      conversationSummary
    )

    /* =====================
       CLAUDE API
    ===================== */

    const anthropicRes = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 450,
          temperature: 0.85,
          system: [
            { type: "text", text: styleText }
          ],
          messages: [
            { role: "user", content: userPrompt }
          ]
        })
      }
    )

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error("ANTHROPIC ERROR:", anthropicData)
      return new Response(
        JSON.stringify({ error: "Claude API failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      )
    }

    let rawText =
      anthropicData.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n") || ""

    let suggestions = rawText
      .split("§")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .slice(0, 3)

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