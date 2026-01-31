import { useEffect, useState, useCallback } from 'react';

/**
 * Хук для работы с Telegram WebApp API
 * Отвечает ТОЛЬКО за Telegram-инициализацию и userId
 */
export const useTelegram = () => {
  const [isReady, setIsReady] = useState(false);
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const initTelegram = () => {
      const tg = window.Telegram?.WebApp;

      if (tg) {
        setIsTelegramAvailable(true);

        // инициализация Telegram Mini App
        tg.ready();
        tg.expand();

        // ⚠️ эти предупреждения можно игнорировать (Telegram v6)
        try {
          tg.setHeaderColor('#1e2530');
          tg.setBackgroundColor('#1a1f26');
        } catch {}

        // получаем Telegram user
        const tgUser = tg.initDataUnsafe?.user;

        if (tgUser?.id) {
          setUserId(tgUser.id);
        } else {
          console.log('Telegram user not available — guest mode');
          setUserId(null);
        }

        setIsReady(true);
      } else {
        // DEV режим вне Telegram
        setIsTelegramAvailable(false);

        if (import.meta.env.DEV) {
          setUserId(123456789); // dev id
        }

        setIsReady(true);
      }
    };

    initTelegram();
  }, []);

  // вибрация при нажатии
  const hapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
    },
    []
  );

  // вибрация при успехе
  const hapticSuccess = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  }, []);

  return {
    isReady,
    isTelegramAvailable,
    userId,
    tg: window.Telegram?.WebApp,
    hapticFeedback,
    hapticSuccess,
  };
};
