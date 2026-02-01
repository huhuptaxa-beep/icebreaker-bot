import { Router, Request, Response } from "express";
import { generateMessages } from "../services/openai";
import { supabase } from "../supabase";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { telegram_id, platform, stage, girl_info } = req.body;

    console.log("generate called with telegram_id:", telegram_id);

    // 1️⃣ ВАЛИДАЦИЯ
    if (!telegram_id) {
      return res.status(400).json({
        error: "TELEGRAM_ID_REQUIRED",
      });
    }

    if (!platform || !stage) {
      return res.status(400).json({
        error: "PLATFORM_AND_STAGE_REQUIRED",
      });
    }

    // 2️⃣ ИЩЕМ ПОЛЬЗОВАТЕЛЯ ПО TELEGRAM_ID
    let currentUser = null;

    const { data, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if (findError) {
      console.error("User select error:", findError);
      return res.status(500).json({ error: "FAILED_TO_FETCH_USER" });
    }

    currentUser = data;

    // 3️⃣ ЕСЛИ ПОЛЬЗОВАТЕЛЯ НЕТ — СОЗДАЁМ
    if (!currentUser) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          telegram_id,
          weekly_limit: 7,
          weekly_used: 0,
          week_started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("User insert error:", insertError);
        return res.status(500).json({ error: "FAILED_TO_CREATE_USER" });
      }

      currentUser = newUser;
    }

    // 4️⃣ ПРОВЕРКА ЛИМИТА
    if (currentUser.weekly_used >= currentUser.weekly_limit) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        weekly_limit: currentUser.weekly_limit,
        weekly_used: currentUser.weekly_used,
      });
    }

    // 5️⃣ ГЕНЕРАЦИЯ (MOCK / AI)
    const messages = await generateMessages({
      platform,
      stage,
      girlInfo: girl_info ?? "",
    });

    // 6️⃣ ОБНОВЛЯЕМ СЧЁТЧИК
    const newUsed = currentUser.weekly_used + 1;

    const { error: updateError } = await supabase
      .from("users")
      .update({
        weekly_used: newUsed,
        last_active_at: new Date().toISOString(),
      })
      .eq("telegram_id", telegram_id);

    if (updateError) {
      console.error("User update error:", updateError);
      return res.status(500).json({ error: "FAILED_TO_UPDATE_USER" });
    }

    // 7️⃣ ОТВЕТ
    return res.json({
      messages,
      weekly_limit: currentUser.weekly_limit,
      weekly_used: newUsed,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
    });
  }
});

export default router;
