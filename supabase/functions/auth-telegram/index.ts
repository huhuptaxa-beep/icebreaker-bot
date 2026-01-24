import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramAuthRequest {
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TelegramAuthRequest = await req.json();

    // Валидация входных данных
    if (!body.telegram_id || !body.first_name) {
      return new Response(
        JSON.stringify({ error: "telegram_id and first_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем существует ли пользователь
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", body.telegram_id)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error checking user:", selectError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let user;

    if (existingUser) {
      // Обновляем существующего пользователя
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          username: body.username,
          first_name: body.first_name,
          last_name: body.last_name,
          language: body.language || "ru",
          last_active_at: new Date().toISOString(),
        })
        .eq("telegram_id", body.telegram_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      user = updatedUser;
    } else {
      // Создаём нового пользователя
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          telegram_id: body.telegram_id,
          username: body.username,
          first_name: body.first_name,
          last_name: body.last_name,
          language: body.language || "ru",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      user = newUser;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          language: user.language,
          created_at: user.created_at,
          last_active_at: user.last_active_at,
        },
        is_new: !existingUser,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
