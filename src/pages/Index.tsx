// src/pages/Index.tsx
import React, { useState, useEffect } from "react";
import { useTelegram } from "../hooks/useTelegram";
import Onboarding from "../components/Onboarding";
import Form from "../components/Form";
import ErrorScreen from "../components/ErrorScreen";

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

  useEffect(() => {
    const completed = localStorage.getItem("onboardingCompleted");
    if (completed === "true") {
      setOnboardingCompleted(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    hapticFeedback("medium");
    setOnboardingCompleted(true);
    localStorage.setItem("onboardingCompleted", "true");
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isTelegramAvailable && !isDev) {
    return <ErrorScreen />;
  }

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
