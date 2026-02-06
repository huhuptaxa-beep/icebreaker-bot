import { useEffect, useState, useCallback } from "react";
import { authTelegram, TelegramUser } from "../api/api";

export const useTelegram = () => {
  const [isReady, setIsReady] = useState(false);
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const initTelegram = async () => {
      const tg = window.Telegram?.WebApp;

      if (!tg) {
        // DEV / browser
        if (import.meta.env.DEV) {
          const devUserId = 123456789;
          setUserId(devUserId);
          try {
            const res = await authTelegram({
              telegram_id: devUserId,
              username: "dev_user",
              first_name: "Developer",
              language: "ru",
            });
            if (res.success) setUser(res.user);
          } catch {}
        }
        setIsReady(true);
        return;
      }

      setIsTelegramAvailable(true);
      tg.ready();
      tg.expand();

      tg.setHeaderColor("#1e2530");
      tg.setBackgroundColor("#1a1f26");

      let telegramId: number | null = null;
      let telegramUser = tg.initDataUnsafe?.user;

      // ✅ PRIMARY
      if (telegramUser?.id) {
        telegramId = telegramUser.id;
      }

      // ✅ FALLBACK (важно)
      if (!telegramId && tg.initData) {
        const params = new URLSearchParams(tg.initData);
        const userParam = params.get("user");
        if (userParam) {
          try {
            const parsed = JSON.parse(decodeURIComponent(userParam));
            if (parsed?.id) {
              telegramId = parsed.id;
              telegramUser = parsed;
            }
          } catch {}
        }
      }

      if (!telegramId) {
        console.warn("[useTelegram] Telegram ID not available");
        setIsReady(true);
        return;
      }

      setUserId(telegramId);

      try {
        const res = await authTelegram({
          telegram_id: telegramId,
          username: telegramUser?.username,
          first_name: telegramUser?.first_name || "User",
          last_name: telegramUser?.last_name,
          language: telegramUser?.language_code,
        });
        if (res.success) setUser(res.user);
      } catch (e) {
        console.error("Auth error:", e);
      }

      setIsReady(true);
    };

    initTelegram();
  }, []);

  const hapticFeedback = useCallback(
    (type: "light" | "medium" | "heavy" = "light") => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
    },
    []
  );

  const hapticSuccess = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
  }, []);

  return {
    isReady,
    isTelegramAvailable,
    userId,
    user,
    tg: window.Telegram?.WebApp,
    hapticFeedback,
    hapticSuccess,
  };
};
