import React, { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import Onboarding from '../components/Onboarding';
import Form from '../components/Form';
import ErrorScreen from '../components/ErrorScreen';

/**
 * Главная страница приложения
 * Управляет переключением между экранами
 */
const Index: React.FC = () => {
  const { isReady, isTelegramAvailable, userId, authError, hapticFeedback, hapticSuccess } = useTelegram();
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Проверяем, проходил ли пользователь онбординг
  useEffect(() => {
    const completed = localStorage.getItem('onboardingCompleted');
    if (completed === 'true') {
      setOnboardingCompleted(true);
    }
  }, []);

  // Обработчик завершения онбординга
  const handleOnboardingComplete = () => {
    hapticFeedback('medium');
    setOnboardingCompleted(true);
    localStorage.setItem('onboardingCompleted', 'true');
  };

  // Ждём инициализации
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Показываем ошибку авторизации
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-2">Ошибка авторизации</p>
          <p className="text-muted-foreground text-sm">{authError}</p>
        </div>
      </div>
    );
  }

  // Показываем ошибку, если приложение открыто вне Telegram
  // В режиме разработки пропускаем эту проверку
  const isDev = import.meta.env.DEV;
  if (!isTelegramAvailable && !isDev) {
    return <ErrorScreen />;
  }

  // Если нет userId — ещё загружаемся
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Показываем онбординг или основную форму
  return (
    <div className="min-h-screen px-4 pb-8 safe-area-inset">
      {!onboardingCompleted ? (
        <Onboarding onStart={handleOnboardingComplete} />
      ) : (
        <Form
          telegramId={userId}
          onHapticFeedback={hapticFeedback}
          onHapticSuccess={hapticSuccess}
        />
      )}
    </div>
  );
};

export default Index;
