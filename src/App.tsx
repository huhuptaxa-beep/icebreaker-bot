import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// 🔴 ВСТАВЬ СВОЙ ANON KEY
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYmZ4amN3YnphZWhqeXVoYXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzI4OTIsImV4cCI6MjA4NDU0ODg5Mn0.xcDdueNZGc6px4Eb7kexTmosNZjS0jgGfrAsfVrGeXI
  "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

const App = () => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      alert("❌ Telegram WebApp object not found");
      return;
    }

    tg.ready();

    const telegramId = tg.initDataUnsafe?.user?.id;

    alert("Telegram ID: " + telegramId);
    console.log("Telegram ID:", telegramId);

    if (!telegramId) {
      alert("❌ Telegram ID is undefined");
      return;
    }

    fetch(
      "https://ocbfxjcwbzaehjyuhatz.supabase.co/functions/v1/auth-telegram",
      {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
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
        console.error(err);
      });
  }, []);

  return (
    <>
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
