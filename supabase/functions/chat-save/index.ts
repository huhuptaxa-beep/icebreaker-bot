import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { conversation_id, selected_text, role, telegram_id } = await req.json()

    if (!conversation_id || !selected_text || !telegram_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

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

    // Используем переданный role, по умолчанию "user"
    const safeRole = role === "girl" ? "girl" : "user"

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        role: safeRole,
        text: selected_text
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ message: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("chat-save error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to save message" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})