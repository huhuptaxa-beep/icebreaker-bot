import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      alert("❌ Telegram WebApp object not found");
      return;
    }

    // 🔴 ОБЯЗАТЕЛЬНО
    tg.ready();

    const telegramId = tg.initDataUnsafe?.user?.id;

    // 🔍 Диагностика Telegram
    alert("Telegram ID: " + telegramId);
    console.log("Telegram ID:", telegramId);

    if (!telegramId) {
      alert(
        "❌ Telegram ID is undefined. Close Mini App and open it again from Telegram."
      );
      return;
    }

    // 🔴 ДИАГНОСТИЧЕСКИЙ FETCH
    fetch(
      "https://ocbfxjcwbzaehjyuhatz.supabase.co/functions/v1/auth-telegram",
      {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: telegramId,
        }),
      }
    )
      .then(async (res) => {
        alert("Fetch status: " + res.status);
        const text = await res.text();
        console.log("Response text:", text);
      })
      .catch((err) => {
        alert("❌ Fetch failed: " + err.message);
        console.error("Fetch error:", err);
      });
  }, []);

  return (
    <>
      {/* 🔴 DEBUG MARKER — ДОЛЖЕН БЫТЬ ВИДЕН ВСЕГДА */}
      <div
        style={{
          position: "fixed",
          top: 4,
          left: 4,
          fontSize: 12,
          opacity: 0.7,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        DEBUG: APP LOADED
      </div>

      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
