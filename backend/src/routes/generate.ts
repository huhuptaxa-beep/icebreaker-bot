import { Router, Request, Response } from "express";
import { generateMessages } from "../services/openai";
import { supabase } from "../supabase";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { telegram_id, platform, stage, girl_info } = req.body;

    console.log("generate called with telegram_id:", telegram_id);

    // 1️⃣ ВАЛИДАЦИЯ
    if (!telegram_id || !platform || !stage || !girl_info) {
      return res.status(400).json({
        error: "telegram_id, platform, stage, girl_info are required",
      });
    }

    // 2️⃣ ИЩЕМ ПОЛЬЗОВАТЕЛЯ (БЕЗ single)
    const { data: users, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .limit(1);

    if (findError) {
      console.error("User select error:", findError);
      return res.status(500).json({ error: "Failed to fetch user" });
    }

    let user = users?.[0];

    // 3️⃣ ЕСЛИ НЕТ — СОЗДАЁМ
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          telegram_id,
          weekly_limit: 7,
          weekly_used: 0,
          week_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("User insert error:", insertError);
        return res.status(500).json({ error: "Failed to create user" });
      }

      user = newUser;
    }

    // 4️⃣ ПРОВЕРКА ЛИМИТА
    if (user.weekly_used >= user.weekly_limit) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        weekly_limit: user.weekly_limit,
        weekly_used: user.weekly_used,
      });
    }

    // 5️⃣ ГЕНЕРАЦИЯ
    const messages = await generateMessages({
      platform,
      stage,
      girlInfo: girl_info,
    });

    // 6️⃣ ОБНОВЛЯЕМ СЧЁТЧИК
    const newUsed = user.weekly_used + 1;

    await supabase
      .from("users")
      .update({
        weekly_used: newUsed,
        last_active_at: new Date().toISOString(),
      })
      .eq("telegram_id", telegram_id);

    // 7️⃣ ОТВЕТ
    return res.json({
      messages,
      weekly_limit: user.weekly_limit,
      weekly_used: newUsed,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
