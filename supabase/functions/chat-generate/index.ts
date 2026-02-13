import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { openerPrompt } from "./opener.ts"
import { replyPrompt } from "./reply.ts"

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

    console.log("CHAT-GENERATE INVOKED")
    console.log("USER:", telegram_id)
    console.log("ACTION:", action_type)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")

    if (!ANTHROPIC_KEY) {
      throw new Error("ANTHROPIC_API_KEY missing")
    }

    /* ================= PROMPT ROUTER ================= */

    let userPrompt = ""

    if (action_type === "opener") {
      userPrompt = openerPrompt(facts || "")
    } else {
      userPrompt = replyPrompt(incoming_message || "")
    }

    /* ================= CLAUDE REQUEST ================= */

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
          max_tokens: 600,
          temperature: 0.9,
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

    const rawText = anthropicData.content?.[0]?.text || ""

    /* ================= § PARSE ================= */

    let suggestions = rawText
      .split("§")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)

    /* ================= FALLBACK CLEAN ================= */

    if (suggestions.length === 0) {
      suggestions = rawText
        .split("\n")
        .map((line: string) =>
          line
            .replace(/^#+\s*/g, "")
            .replace(/^\d+\.\s*/g, "")
            .replace(/\*\*/g, "")
            .replace(/^-\s*/g, "")
            .trim()
        )
        .filter((line: string) => {
          const lower = line.toLowerCase()

          return (
            line.length > 8 &&
            !lower.includes("вариант") &&
            !lower.includes("сообщен") &&
            !lower.includes("генерац") &&
            !lower.includes("анализ") &&
            !lower.includes("лучших") &&
            !lower.includes("ответ:")
          )
        })
    }

    suggestions = suggestions.slice(0, 3)

    console.log("FINAL SUGGESTIONS:", suggestions)

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
