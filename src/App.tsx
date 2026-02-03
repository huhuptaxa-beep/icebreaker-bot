import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// ✅ anon key можно безопасно использовать на клиенте
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmZ4amN3YnphZWhqeXVoYXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzI4OTIsImV4cCI6MjA4NDU0ODg5Mn0.xcDdueNZGc6px4Eb7kexTmosNZjS0jgGfrAsfVrGeXI;

const App = () => {
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        console.warn("Telegram WebApp not found");
        return;
      }

      tg.ready();

      const telegramId = tg.initDataUnsafe?.user?.id;
      console.log("Telegram ID:", telegramId);

      if (!telegramId) {
        console.warn("Telegram ID is undefined");
        return;
      }

      fetch(
        "https://ocbfxjcwbzaehjyuhatz.supabase.co/functions/v1/auth-telegram",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ telegram_id: telegramId }),
        }
      )
        .then((res) => {
          console.log("auth-telegram status:", res.status);
        })
        .catch((err) => {
          console.error("auth-telegram fetch error:", err);
        });
    } catch (e) {
      console.error("Telegram init crash:", e);
    }
  }, []);

  return (
    <>
      {/* 🟢 UI рендерится ВСЕГДА */}
      <div
        style={{
          position: "fixed",
          top: 4,
          left: 4,
          fontSize: 12,
          opacity: 0.6,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        Casanova Mini App
