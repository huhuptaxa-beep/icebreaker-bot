import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { validateInitData } from "../_shared/validateTelegram.ts"
import { generateSummary } from "../_shared/generateSummary.ts"
import { runStrategyEngine } from "../_shared/strategy/engine.ts"
import { STRATEGY_CONFIG } from "../_shared/strategy/config.ts"

import { OPENER_GENERATOR_PROMPT } from "./openerGeneratorPrompt.ts"
import { OPENER_JUDGE_PROMPT } from "./openerJudgePrompt.ts"
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

    const { data: user } = await supabase
      .from("users")
      .select("weekly_used, weekly_limit, week_started_at, generations_balance")
      .eq("telegram_id", telegram_id)
      .maybeSingle()

    const now = new Date()
    const weekStarted = user?.week_started_at ? new Date(user.week_started_at) : now
    const weekExpired = now.getTime() - weekStarted.getTime() >= 7 * 86400 * 1000
    const weeklyLimit = user?.weekly_limit ?? FREE_WEEKLY_LIMIT
    const weeklyUsed = weekExpired ? 0 : (user?.weekly_used ?? 0)
    const paidBalance = user?.generations_balance ?? 0
    const hasFree = weeklyUsed < weeklyLimit
    const hasPaid = paidBalance > 0

    if (!hasFree && !hasPaid) {
      return new Response(
        JSON.stringify({ suggestions: [], limit_reached: true, free_remaining: 0, paid_remaining: paidBalance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY missing")

    const messageType = action_type === "opener" ? "first_message" : "reply"

    let suggestions: string[][] = []
    let available_actions: string[] = []
    let strategyResult: any = null
    let totalUsage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

    /* ==========================================================
       OPENER MODE — двухэтапная генерация (генератор + судья)
    ========================================================== */

    if (messageType === "first_message") {

      const profileInfo = facts || ""
      const girlMessage = incoming_message || ""

      /* ----- ЭТАП 1: Генератор (10 вариантов) ----- */

      const generatorUserPrompt = girlMessage
        ? `Профиль девушки: ${profileInfo}\n\nЕё первое сообщение: ${girlMessage}`
        : `Профиль девушки: ${profileInfo}`

      const generatorRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          temperature: 0.85,
          system: [{ type: "text", text: OPENER_GENERATOR_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: generatorUserPrompt }]
        })
      })

      const generatorData = await generatorRes.json()

      if (!generatorRes.ok) {
        console.error("OPENER GENERATOR ERROR:", generatorData)
        return new Response(JSON.stringify({ error: "Generator failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 })
      }

      const genUsage = generatorData.usage || {}
      totalUsage.input_tokens += genUsage.input_tokens || 0
      totalUsage.output_tokens += genUsage.output_tokens || 0
      totalUsage.cache_creation_input_tokens += genUsage.cache_creation_input_tokens || 0
      totalUsage.cache_read_input_tokens += genUsage.cache_read_input_tokens || 0

      const generatorRawText = generatorData.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || ""

      const tenVariants = generatorRawText.split("§").map((s: string) => s.trim()).filter((s: string) => s.length > 0).slice(0, 10)

      if (tenVariants.length === 0) {
        return new Response(JSON.stringify({ error: "Generator produced no variants" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 })
      }

      /* ----- ЭТАП 2: Судья (выбирает 3 лучших) ----- */

      const variantsBlock = tenVariants.map((v: string, i: number) => `${i + 1}. ${v}`).join("\n")

      const judgeUserPrompt = girlMessage
        ? `Профиль девушки: ${profileInfo}\n\nЕё первое сообщение: ${girlMessage}\n\nВарианты:\n${variantsBlock}`
        : `Профиль девушки: ${profileInfo}\n\nВарианты:\n${variantsBlock}`

      const judgeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 450,
          temperature: 0.45,
          system: [{ type: "text", text: OPENER_JUDGE_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: judgeUserPrompt }]
        })
      })

      const judgeData = await judgeRes.json()

      if (!judgeRes.ok) {
        console.error("OPENER JUDGE ERROR:", judgeData)
        return new Response(JSON.stringify({ error: "Judge failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 })
      }

      const judgeUsage = judgeData.usage || {}
      totalUsage.input_tokens += judgeUsage.input_tokens || 0
      totalUsage.output_tokens += judgeUsage.output_tokens || 0
      totalUsage.cache_creation_input_tokens += judgeUsage.cache_creation_input_tokens || 0
      totalUsage.cache_read_input_tokens += judgeUsage.cache_read_input_tokens || 0

      const judgeRawText = judgeData.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || ""

      suggestions = judgeRawText
        .split("§")
        .map((s: string) => s.trim().split("|").map((p: string) => p.trim()).filter((p: string) => p.length > 0))
        .filter((parts: string[]) => parts.length > 0)
        .slice(0, 3)
    }

    /* ==========================================================
       REPLY MODE — одноэтапная генерация
    ========================================================== */

    if (messageType === "reply") {

      if (!conversation_id) {
        return new Response(JSON.stringify({ error: "conversation_id missing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
      }

      const { data: conv } = await supabase.from("conversations").select("*").eq("id", conversation_id).single()

      if (!conv || String(conv.user_id) !== String(telegram_id)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 })
      }

      let fullSystemPrompt = REPLY_SYSTEM_PROMPT

      if (action_type === "date") fullSystemPrompt += "\n\n" + DATE_INSTRUCTIONS
      if (action_type === "contact") fullSystemPrompt += "\n\n" + TELEGRAM_INSTRUCTIONS
      if (action_type === "reengage") fullSystemPrompt += "\n\n" + REENGAGE_INSTRUCTIONS
      if (action_type === "telegram_first") fullSystemPrompt += "\n\n" + TELEGRAM_FIRST_MESSAGE

      if (incoming_message) {
        strategyResult = runStrategyEngine(conv, incoming_message, "girl")

        await supabase.from("conversations").update({
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
          phase_message_count: (conv.phase_message_count || 0) + 1
        }).eq("id", conversation_id)
      }

      const currentInterest = strategyResult ? strategyResult.effectiveInterest : (conv.effective_interest || 5)
      const currentPhase = strategyResult ? strategyResult.phase : (conv.phase || 1)
      const currentFreshness = strategyResult ? strategyResult.freshness : (conv.freshness_multiplier || 1)
      const totalMessages = (conv.phase_message_count || 0) + (strategyResult ? 1 : 0)
      const channel = conv.channel || "app"

      if (currentFreshness < 0.6) available_actions.push("reengage")
      if (currentInterest >= STRATEGY_CONFIG.interest.thresholds.telegram && currentPhase === 2 && totalMessages >= STRATEGY_CONFIG.phase.minMessagesForTelegram && channel === "app") available_actions.push("contact")
      if (currentInterest >= STRATEGY_CONFIG.interest.thresholds.date && currentPhase >= 4 && totalMessages >= STRATEGY_CONFIG.phase.minMessagesForDate && channel === "telegram") available_actions.push("date")

      const { data: historyDesc } = await supabase.from("messages").select("role, text, created_at").eq("conversation_id", conversation_id).order("created_at", { ascending: false }).limit(20)

      const history = (historyDesc || []).reverse()

      if (incoming_message) {
        history.push({ role: "girl", text: incoming_message, created_at: now.toISOString() })
      }

      if (history.length === 0 && action_type !== "telegram_first") {
        return new Response(JSON.stringify({ error: "No messages" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
      }

      let conversationSummary: string | undefined

      if (history.length > 12) {
        conversationSummary = conv.summary || undefined
        if (!conversationSummary) {
          const olderMessages = history.slice(0, history.length - 8)
          const generated = await generateSummary(olderMessages, ANTHROPIC_KEY)
          if (generated) {
            conversationSummary = generated
            supabase.from("conversations").update({ summary: generated, summary_updated_at: now.toISOString() }).eq("id", conversation_id)
          }
        }
      }

      const contextMessages = conversationSummary ? history.slice(-8) : history
      let conversationContext = ""
      let lastMessage = ""

      if (contextMessages.length > 0) {
        const lastMsg = contextMessages[contextMessages.length - 1]
        const previousMessages = contextMessages.slice(0, -1)
        conversationContext = previousMessages.map((msg) => `${msg.role === "user" ? "Ты" : "Она"}: ${msg.text}`).join("\n")
        lastMessage = lastMsg.role === "girl" ? lastMsg.text : incoming_message || ""
      }

      const userPrompt = buildUserPrompt("reply", "", conversationContext, lastMessage, conversationSummary)

      let strategyBlock = ""
      if (strategyResult) {
        strategyBlock = `[СТРАТЕГИЯ]\nФаза: ${strategyResult.phase}\nИнтерес: ${strategyResult.effectiveInterest}\nДиректива: ${strategyResult.nextObjective}`
        if (channel === "telegram") {
          if (strategyResult.effectiveInterest >= STRATEGY_CONFIG.interest.thresholds.dateStrongHint) {
            strategyBlock += "\nОдин из трёх вариантов ДОЛЖЕН содержать намёк на встречу вживую."
          } else if (strategyResult.effectiveInterest >= STRATEGY_CONFIG.interest.thresholds.dateHint) {
            strategyBlock += "\nОдин из трёх вариантов МОЖЕТ содержать лёгкий намёк на встречу, без давления."
          }
        }
      } else {
        const fallbackObjective = action_type === "date" ? "DATE_INVITE" : action_type === "contact" ? "TELEGRAM_INVITE" : action_type === "telegram_first" ? "RESTART_PLAY" : "REWARM"
        strategyBlock = `[СТРАТЕГИЯ]\nФаза: ${conv.phase || 1}\nИнтерес: ${conv.effective_interest || 3}\nДиректива: ${fallbackObjective}`
      }

      const finalUserPrompt = strategyBlock + "\n\n" + userPrompt

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 450,
          temperature: 0.85,
          system: [{ type: "text", text: fullSystemPrompt, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: finalUserPrompt }]
        })
      })

      const anthropicData = await anthropicRes.json()

      if (!anthropicRes.ok) {
        console.error("ANTHROPIC ERROR:", anthropicData)
        return new Response(JSON.stringify({ error: "Claude API failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 })
      }

      const replyUsage = anthropicData.usage || {}
      totalUsage.input_tokens += replyUsage.input_tokens || 0
      totalUsage.output_tokens += replyUsage.output_tokens || 0
      totalUsage.cache_creation_input_tokens += replyUsage.cache_creation_input_tokens || 0
      totalUsage.cache_read_input_tokens += replyUsage.cache_read_input_tokens || 0

      const rawText = anthropicData.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || ""

      suggestions = rawText
        .split("§")
        .map((s: string) => s.trim().split("|").map((p: string) => p.trim()).filter((p: string) => p.length > 0))
        .filter((parts: string[]) => parts.length > 0)
        .slice(0, 3)

      if (incoming_message && conversation_id) {
        await supabase.from("messages").insert({ conversation_id, role: "girl", text: incoming_message })
      }
    }

    /* =====================
       USAGE LOGGING
    ===================== */

    supabase.from("usage_logs").insert({
      telegram_id,
      conversation_id: conversation_id || null,
      model: "claude-sonnet-4-6",
      input_tokens: totalUsage.input_tokens,
      output_tokens: totalUsage.output_tokens,
      cache_creation_input_tokens: totalUsage.cache_creation_input_tokens,
      cache_read_input_tokens: totalUsage.cache_read_input_tokens,
      action_type: action_type || "normal",
      created_at: now.toISOString()
    }).then(() => {}).catch((err: any) => console.error("usage log error:", err))

    /* =====================
       LIMIT DEDUCTION
    ===================== */

    if (hasFree) {
      const updateData: any = { weekly_used: weeklyUsed + 1 }
      if (weekExpired) { updateData.week_started_at = now.toISOString(); updateData.weekly_used = 1 }
      await supabase.from("users").update(updateData).eq("telegram_id", telegram_id)
    } else if (hasPaid) {
      await supabase.from("users").update({ generations_balance: paidBalance - 1 }).eq("telegram_id", telegram_id)
    }

    const newWeeklyUsed = hasFree ? (weekExpired ? 1 : weeklyUsed + 1) : weeklyUsed
    const freeRemaining = Math.max(0, weeklyLimit - newWeeklyUsed)
    const paidRemaining = hasPaid && !hasFree ? paidBalance - 1 : paidBalance

    return new Response(
      JSON.stringify({
        suggestions,
        available_actions,
        phase: messageType === "reply" && strategyResult ? strategyResult.phase : undefined,
        interest: strategyResult ? strategyResult.effectiveInterest : undefined,
        showDisinterestWarning: strategyResult?.showDisinterestWarning || false,
        limit_reached: false,
        free_remaining: freeRemaining,
        paid_remaining: paidRemaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("chat-generate ERROR:", error)
    return new Response(JSON.stringify({ error: "Generation failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 })
  }
})