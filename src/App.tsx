import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppToastProvider } from "@/components/ui/AppToast";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // корректная инициализация Mini App
    tg.ready();

    // берём Telegram ID, но НИЧЕГО с ним пока не делаем
    const telegramId = tg.initDataUnsafe?.user?.id;
    if (!telegramId) return;

    // ⛔️ ВАЖНО:
    // здесь намеренно НЕТ fetch, alert, console.log
    // чтобы Mini App гарантированно не ломался
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppToastProvider>
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
      </AppToastProvider>
    </QueryClientProvider>
  );
};

export default App;
