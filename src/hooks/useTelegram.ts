import { useEffect, useState, useCallback } from "react";

export const useTelegram = () => {
  const [isReady, setIsReady] = useState(false);
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    // Browser / DEV режим
    if (!tg) {
      if (import.meta.env.DEV) {
        setUserId(123456789);
      }
      setIsReady(true);
      return;
    }

    setIsTelegramAvailable(true);

    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor("#1e2530");
      tg.setBackgroundColor("#1a1f26");
    } catch {
      // НИЧЕГО не делаем — главное не упасть
    }

    let telegramId: number | null = null;

    // PRIMARY
    if (tg.initDataUnsafe?.user?.id) {
      telegramId = tg.initDataUnsafe.user.id;
    }

    // FALLBACK
    if (!telegramId && tg.initData) {
      try {
        const params = new URLSearchParams(tg.initData);
        const userParam = params.get("user");
        if (userParam) {
          const parsed = JSON.parse(decodeURIComponent(userParam));
          if (parsed?.id) telegramId = parsed.id;
        }
      } catch {}
    }

    if (telegramId) {
      setUserId(telegramId);
    }

    setIsReady(true);
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
    hapticFeedback,
    hapticSuccess,
  };
};
