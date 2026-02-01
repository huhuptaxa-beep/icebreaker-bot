import { useEffect, useState, useCallback } from 'react';
import { authTelegram, TelegramUser } from '../api/api';

/**
 * Хук для работы с Telegram WebApp API
 * Проверяет доступность Telegram, авторизует пользователя и предоставляет доступ к API
 */
export const useTelegram = () => {
  const [isReady, setIsReady] = useState(false);
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const initTelegram = async () => {
      // 🔍 DIAGNOSTIC LOGS (КЛЮЧЕВЫЕ)
      console.log('[useTelegram] window.Telegram:', window.Telegram);
      console.log('[useTelegram] WebApp:', window.Telegram?.WebApp);

      // Проверяем доступность Telegram WebApp
      const tg = window.Telegram?.WebApp;

      if (tg) {
        console.log('[useTelegram] ✅ Telegram WebApp detected');
        setIsTelegramAvailable(true);

        // Инициализируем приложение
        tg.ready();
        tg.expand();

        // Устанавливаем цвета
        tg.setHeaderColor('#1e2530');
        tg.setBackgroundColor('#1a1f26');

        // 🔍 ЛОГИ INIT DATA
        console.log('[useTelegram] initDataUnsafe:', tg.initDataUnsafe);

        // Получаем данные пользователя
        const tgUser = tg.initDataUnsafe?.user;
        console.log('[useTelegram] Telegram user:', tgUser);

        if (tgUser?.id) {
          console.log('[useTelegram] ✅ Telegram ID detected:', tgUser.id);
          setUserId(tgUser.id);

          try {
            const response = await authTelegram({
              telegram_id: tgUser.id,
              username: tgUser.username,
              first_name: tgUser.first_name || 'User',
              last_name: tgUser.last_name,
              language: tgUser.language_code,
            });

            if (response.success) {
              console.log('[useTelegram] ✅ User authorized via backend');
              setUser(response.user);
            } else {
              console.warn('[useTelegram] ❌ Backend auth failed:', response.error);
            }
          } catch (error) {
            console.error('[useTelegram] Auth error (ignored for MVP):', error);
            // ❗ намеренно игнорируем, MVP
          }
        } else {
          // 👇 ВАЖНО: это НОРМАЛЬНЫЙ СЦЕНАРИЙ
          console.warn(
            '[useTelegram] ⚠️ Telegram user not provided — running in guest mode'
          );
          setUserId(null);
        }

        setIsReady(true);
      } else {
        console.warn('[useTelegram] ❌ Telegram WebApp NOT available');
        setIsTelegramAvailable(false);

        // Для разработки вне Telegram — создаём тестового пользователя
        if (import.meta.env.DEV) {
          const devUserId = 123456789;
          console.log('[useTelegram] 🧪 DEV MODE — using mock telegram_id:', devUserId);
          setUserId(devUserId);

          try {
            const response = await authTelegram({
              telegram_id: devUserId,
              username: 'dev_user',
              first_name: 'Developer',
              language: 'ru',
            });

            if (response.success) {
              console.log('[useTelegram] ✅ Dev user authorized');
              setUser(response.user);
            }
          } catch (error) {
            console.error('[useTelegram] Dev auth error:', error);
            // В dev-режиме продолжаем без авторизации
          }
        }

        setIsReady(true);
      }
    };

    initTelegram();
  }, []);

  // Вибрация при нажатии
  const hapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
    },
    []
  );

  // Вибрация при успешном действии
  const hapticSuccess = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
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
