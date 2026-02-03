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
  // 🟢 TELEGRAM: получаем Telegram WebApp и ID
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;

    console.log("Telegram ID:", telegramId);

    if (!telegramId) {
      throw new Error(
        "Telegram ID not available — app not opened in Telegram"
      );
    }

    // 🟢 TELEGRAM: отправляем telegram_id в auth-telegram
    fetch(
      "https://ocbfxjcwbzaehjyuhatz.supabase.co/functions/v1/auth-telegram",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: telegramId,
        }),
      }
    ).catch((err) => {
      console.error("auth-telegram error:", err);
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
