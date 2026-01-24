import { Router, Request, Response } from "express";
import { generateMessages } from "../services/openai";
import { supabase } from "../supabase";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { telegram_id, platform, stage, girl_info } = req.body;

    if (!telegram_id || !platform || !stage || !girl_info) {
      return res.status(400).json({
        error: "telegram_id, platform, stage, girl_info are required",
      });
    }

    // проверяем, что пользователь существует
    const { data: users, error } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegram_id)
      .limit(1);

    if (error || !users || users.length === 0) {
      return res.status(401).json({
        error: "User not initialized",
      });
    }

    const messages = await generateMessages({
      platform,
      stage,
      girlInfo: girl_info,
    });

    return res.json({
      messages,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
