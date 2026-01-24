import { Router, Request, Response } from "express";
import { supabase } from "../supabase";

const router = Router();

router.post("/init-user", async (req: Request, res: Response) => {
  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({
        error: "telegram_id is required",
      });
    }

    // check if user exists
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegram_id)
      .single();

    if (findError && findError.code !== "PGRST116") {
      throw findError;
    }

    // if exists → update last_active_at
    if (existingUser) {
      await supabase
        .from("users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("telegram_id", telegram_id);

      return res.json({ status: "ok", existing: true });
    }

    // else → create new
    const { error: insertError } = await supabase.from("users").insert({
      telegram_id,
    });

    if (insertError) {
      throw insertError;
    }

    return res.json({ status: "ok", existing: false });
  } catch (error) {
    console.error("init-user error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
