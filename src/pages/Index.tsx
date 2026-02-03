import React, { useState, useEffect, useRef } from "react";
import { useTelegram } from "../hooks/useTelegram";
import Onboarding from "../components/Onboarding";
import Form from "../components/Form";
import ErrorScreen from "../components/ErrorScreen";

const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmZ4amN3YnphZWhqeXVoYXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzI4OTIsImV4cCI6MjA4NDU0ODg5Mn0.xcDdueNZGc6px4Eb7kexTmosNZjS0jgGfrAsfVrGeXI;

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

  // чтобы auth-telegram не вызывался повторно
  const authCalledRef = useRef(false);

  // onboarding
  useEffect(() => {
    const completed = localStorage.getItem("onboardingCompleted");
    if (completed === "true") {
      setOnboardingCompleted(true);
    }
  }, []);

  // 🔴 ВАЖНО: вызываем auth-telegram ОДИН РАЗ
  useEffect(() => {
    if (!isReady) return;
    if (!isTelegramAvailable && !isDev) return;
    if (!userId) return;
    if (authCalledRef.current) return;

    authCalledRef.current = true;

    fetch(
      "https://ocbfxjcwbzaehjyuhatz.supabase.co/functions/v1/auth-telegram",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ telegram_id: userId }),
      }
    ).catch(() => {
      // намеренно игнорируем, чтобы не ломать UI
    });
  }, [isReady, isTelegramAvailable, userId, isDev]);

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
