import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// ⚠️ ВСТАВЬ СВОЙ ANON KEY
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmZ4amN3YnphZWhqeXVoYXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzI4OTIsImV4cCI6MjA4NDU0ODg5Mn0.xcDdueNZGc6px4Eb7kexTmosNZjS0jgGfrAsfVrGeXI;

const App = () => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();

    const telegramId = tg.initDataUnsafe?.user?.id;
    console.log("Telegram ID:", telegramId);

    if (!telegramId) return;

    fetch(
      "https://ocbfxjcwbzaehjyuhatz.supabase.co/functions/v1/auth-telegram",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ telegram_id: telegramId }),
      }
    ).catch(console.error);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "white" }}>
      {/* 🟢 UI МАРКЕР */}
      <div
        style={{
          position: "fixed",
          top: 6,
          left: 6,
          fontSize: 12,
          opacity: 0.7,
          zIndex: 9999,
        }}
      >
        Casanova Mini App
      </div>

      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
