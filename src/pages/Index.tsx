// src/pages/Index.tsx
import React from "react";
import { useTelegram } from "../hooks/useTelegram";
import ChatApp from "../components/chat/ChatApp";
import ErrorScreen from "../components/ErrorScreen";

const Index: React.FC = () => {
  const {
    isReady,
    isTelegramAvailable,
    userId,
    hapticFeedback,
    hapticSuccess,
  } = useTelegram();

  const isDev = import.meta.env.DEV;

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
      <ChatApp
        telegramId={userId}
        onHapticFeedback={hapticFeedback}
        onHapticSuccess={hapticSuccess}
      />
    </div>
  );
};

export default Index;
