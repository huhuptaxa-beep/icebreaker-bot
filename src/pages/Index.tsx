import React, { useState, useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";
import Onboarding from "../components/Onboarding";
import Form from "../components/Form";
import ErrorScreen from "../components/ErrorScreen";

/**
 * Главная страница приложения
 * Управляет переключением между экранами
 */
const Index: React.FC = () => {
  const {
    isReady,
    isTelegramAvailable,
    userId,
    hapticFeedback,
    hapticSuccess,
  } = useTelegram();

  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const isDev = import.meta.env.DEV;

  // Проверяем, проходил ли пользователь онбординг
  useEffect(() => {
    const completed = localStorage.getItem("onboardingCompleted");
    if (completed === "true") {
      setOnboardingCompleted(true);
    }
  }, []);

  // Обработчик завершения онбординга
  const handleOnboardingComplete = () => {
    hapticFeedback("medium");
    setOnboardingCompleted(true);
    localStorage.setItem("onboardingCompleted", "true");
  };

  // Ждём инициализации Telegram
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Если не Telegram и не DEV — ошибка
  if (!isTelegramAvailable && !isDev) {
    return <ErrorScreen />;
  }

  return (
    <div className="min-h-screen px-4 pb-8 safe-area-inset">
      {/* 🔴 DEBUG: ВИЗУАЛЬНАЯ ПРОВЕРКА TELEGRAM ID */}
      <div
        style={{
          position: "fixed",
          bottom: 8,
          left: 8,
          fontSize: 12,
          opacity: 0.6,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        telegramId: {userId ?? "null"}
      </div>

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
