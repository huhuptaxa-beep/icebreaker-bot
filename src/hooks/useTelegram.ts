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
      // Проверяем доступность Telegram WebApp
      const tg = window.Telegram?.WebApp;
      
      if (tg) {
        setIsTelegramAvailable(true);
        
        // Инициализируем приложение
        tg.ready();
        tg.expand();
        
        // Устанавливаем цвета
        tg.setHeaderColor('#1e2530');
        tg.setBackgroundColor('#1a1f26');
        
        // Получаем данные пользователя
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser?.id) {
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
              setUser(response.user);
            }
          } catch (error) {
            console.error('Auth error (ignored for MVP):', error);
            // ❗ НИЧЕГО НЕ СТАВИМ В authError
          }
        } else {
            // 👇 ВАЖНО: это НОРМАЛЬНЫЙ СЦЕНАРИЙ
           console.log('Telegram user not provided yet — running in guest mode');
            setUserId(null);
        }
        
        setIsReady(true);
      } else {
        // Для разработки вне Telegram — создаём тестового пользователя
        setIsTelegramAvailable(false);
        
        // В режиме разработки используем мок-данные
        if (import.meta.env.DEV) {
          const devUserId = 123456789;
          setUserId(devUserId);
          
          try {
            const response = await authTelegram({
              telegram_id: devUserId,
              username: 'dev_user',
              first_name: 'Developer',
              language: 'ru',
            });
            
            if (response.success) {
              setUser(response.user);
            }
          } catch (error) {
            console.error('Dev auth error:', error);
            // В dev-режиме продолжаем без авторизации
          }
        }
        
        setIsReady(true);
      }
    };

    initTelegram();
  }, []);

  // Вибрация при нажатии
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
  }, []);

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
