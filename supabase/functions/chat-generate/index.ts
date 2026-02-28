import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { validateInitData } from "../_shared/validateTelegram.ts"
import { generateSummary } from "../_shared/generateSummary.ts"
import { runStrategyEngine } from "../_shared/strategy/engine.ts"
import { STRATEGY_CONFIG } from "../_shared/strategy/config.ts"

import { OPENER_SYSTEM_PROMPT } from "./openerSystemPrompt.ts"
import { REPLY_SYSTEM_PROMPT } from "./replySystemPrompt.ts"
import { buildUserPrompt } from "./userPrompt.ts"
import { DATE_INSTRUCTIONS } from "./dateInstructions.ts"
import { TELEGRAM_INSTRUCTIONS } from "./telegramInstructions.ts"
import { REENGAGE_INSTRUCTIONS } from "./reengageInstructions.ts"
import { TELEGRAM_FIRST_MESSAGE } from "./telegramFirstMessage.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const FREE_WEEKLY_LIMIT = 7

/*
 * =====================================================
 * ОГРАНИЧЕНИЯ ПО КОЛИЧЕСТВУ СООБЩЕНИЙ ДО ДЕЙСТВИЙ
 * =====================================================
 * MIN_MESSAGES_FOR_TELEGRAM = 8 — минимум 8 обменов в phase 2 прежде чем покажется кнопка "Взять Telegram"
 * MIN_MESSAGES_FOR_DATE = 10 — минимум 10 обменов в phase 4 прежде чем покажется кнопка "Позвать на свидание"
 * Эти лимиты проверяются вместе с interest threshold из STRATEGY_CONFIG
 */
const MIN_MESSAGES_FOR_TELEGRAM = 8
const MIN_MESSAGES_FOR_DATE = 10

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
      facts
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
      fullSystemPrompt += "\n\n" + TELEGRAM_INSTRUCTIONS

    if (action_type === "reengage")
      fullSystemPrompt += "\n\n" + REENGAGE_INSTRUCTIONS

    // Первое сообщение в Telegram — мини-промпт надстройка
    if (action_type === "telegram_first")
      fullSystemPrompt += "\n\n" + TELEGRAM_FIRST_MESSAGE

    const messageType =
      action_type === "opener" ? "first_message" : "reply"

    let profileInfo = ""
    let conversationContext = ""
    let lastMessage = ""
    let conversationSummary: string | undefined
    let available_actions: string[] = []
    let strategyResult: any = null

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

      if (incoming_message) {
        strategyResult = runStrategyEngine(
          conv,
          incoming_message,
          "girl"
        )

        await supabase
          .from("conversations")
          .update({
            phase: strategyResult.phase,
            base_interest_score: strategyResult.baseInterest,
            effective_interest: strategyResult.effectiveInterest,
            freshness_multiplier: strategyResult.freshness,
            has_future_projection: strategyResult.hasFutureProjection,
            telegram_invite_attempts: strategyResult.telegramInviteAttempts,
            date_invite_attempts: strategyResult.dateInviteAttempts,
            high_interest_streak: strategyResult.highInterestStreak,
            low_interest_streak: strategyResult.lowInterestStreak,
            last_message_timestamp: now.toISOString(),
            phase_message_count: strategyResult.phaseChanged ? 1 : (conv.phase_message_count || 0) + 1
          })
          .eq("id", conversation_id)

        // Передаём стратегию в system prompt
        fullSystemPrompt += `

CURRENT_PHASE: ${strategyResult.phase}
EFFECTIVE_INTEREST: ${strategyResult.effectiveInterest}
NEXT_OBJECTIVE: ${strategyResult.nextObjective}

ВАЖНО:
Если NEXT_OBJECTIVE = TELEGRAM_INVITE — один вариант обязан предложить переход.
Если NEXT_OBJECTIVE = DATE_INVITE — один вариант обязан предложить конкретное время.
Если NEXT_OBJECTIVE = REWARM — лёгкий эмоциональный пинг.
Если NEXT_OBJECTIVE = SALVAGE — смена динамики.
`
        // Phase 4: добавить намёк на свидание если interest достаточен
        if (strategyResult.phase === 4 &&
            strategyResult.effectiveInterest >= STRATEGY_CONFIG.phase.hintDateInterest) {
          fullSystemPrompt += "\nОдин из трёх вариантов должен содержать лёгкий вскользь намёк на встречу вживую, без давления и без конкретного предложения."
        }
      }

      // Fallback: загружаем стратегию из БД для action без incoming_message
      if (!strategyResult && conv) {
        fullSystemPrompt += `
CURRENT_PHASE: ${conv.phase || 1}
EFFECTIVE_INTEREST: ${conv.effective_interest || 3}
NEXT_OBJECTIVE: ${action_type === "date" ? "DATE_INVITE" : action_type === "contact" ? "TELEGRAM_INVITE" : action_type === "telegram_first" ? "RESTART_PLAY" : "REWARM"}
`
      }

      /* =====================================================
         AVAILABLE ACTIONS
         =====================================================
         Кнопки действий показываются на фронте рядом с вариантами.
         Ограничения:
         - Telegram: phase === 2, interest >= 7, И минимум 8 обменов
         - Date: phase === 4, interest >= 9, И минимум 10 обменов в phase 4
      ===================================================== */

      available_actions = []

      const currentPhase = strategyResult ? strategyResult.phase : (conv.phase || 1)
      const currentInterest = strategyResult ? strategyResult.effectiveInterest : (conv.effective_interest || 3)
      const currentFreshness = strategyResult ? strategyResult.freshness : (conv.freshness_multiplier || 1)
      const totalMessages = conv.phase_message_count || 0

      // Диалог затух
      if (currentFreshness < 0.6) {
        available_actions.push("reengage")
      }

      // Phase 2 + interest >= порога + минимум сообщений → можно предложить Telegram
      if (currentPhase === 2 &&
          currentInterest >= STRATEGY_CONFIG.interest.thresholds.telegram &&
          totalMessages >= MIN_MESSAGES_FOR_TELEGRAM) {
        available_actions.push("contact")
      }

      // Phase 4 + interest >= порога + минимум сообщений в phase 4 → можно звать на свидание
      if (currentPhase === 4 &&
          currentInterest >= STRATEGY_CONFIG.interest.thresholds.date &&
          totalMessages >= MIN_MESSAGES_FOR_DATE) {
        available_actions.push("date")
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

      // Разрешаем пустую историю для telegram_first (первое сообщение в Telegram)
      if (history.length === 0 && action_type !== "telegram_first") {
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

      if (contextMessages.length > 0) {
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
            { type: "text", text: fullSystemPrompt, cache_control: { type: "ephemeral" } }
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

    const suggestions = rawText
      .split("§")
      .map((s: string) =>
        s.trim().split("|").map((part: string) => part.trim()).filter((part: string) => part.length > 0)
      )
      .filter((parts: string[]) => parts.length > 0)
      .slice(0, 3)

    if (action_type !== "opener" && incoming_message && conversation_id) {
      await supabase.from("messages").insert({
        conversation_id,
        role: "girl",
        text: incoming_message,
      })
    }

    /* =====================
       USAGE LOGGING (fire-and-forget)
    ===================== */

    const usage = anthropicData.usage || {}
    supabase.from("usage_logs").insert({
      telegram_id,
      conversation_id: conversation_id || null,
      model: "claude-sonnet-4-6",
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
      cache_read_input_tokens: usage.cache_read_input_tokens || 0,
      action_type: action_type || "normal",
      created_at: now.toISOString()
    }).then(() => {}).catch((err: any) => console.error("usage log error:", err))

    /* =====================
       LIMIT DEDUCTION
    ===================== */

    if (hasFree) {
      const updateData: any = { weekly_used: weeklyUsed + 1 }
      if (weekExpired) {
        updateData.week_started_at = now.toISOString()
        updateData.weekly_used = 1
      }
      await supabase.from("users").update(updateData).eq("telegram_id", telegram_id)
    } else if (hasPaid) {
      await supabase.from("users").update({
        generations_balance: paidBalance - 1
      }).eq("telegram_id", telegram_id)
    }

    const newWeeklyUsed = hasFree ? (weekExpired ? 1 : weeklyUsed + 1) : weeklyUsed
    const freeRemaining = Math.max(0, weeklyLimit - newWeeklyUsed)
    const paidRemaining = hasPaid && !hasFree ? paidBalance - 1 : paidBalance

    return new Response(
      JSON.stringify({
        suggestions,
        available_actions,
        phase: messageType === "reply" && strategyResult ? strategyResult.phase : undefined,
        limit_reached: false,
        free_remaining: freeRemaining,
        paid_remaining: paidRemaining,
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