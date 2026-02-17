import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { validateInitData } from "../_shared/validateTelegram.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { girl_name, init_data } = await req.json()

    if (!girl_name) {
      return new Response(
        JSON.stringify({ error: "girl_name is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

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

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: telegram_id,
        girl_name
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ conversation: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("create-conversation error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to create conversation" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
