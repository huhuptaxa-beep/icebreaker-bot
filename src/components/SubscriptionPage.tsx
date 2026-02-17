import React, { useState, useEffect } from "react";
import { useAppToast } from "@/components/ui/AppToast";
import { createInvoice, getSubscription, SubscriptionInfo } from "@/api/chatApi";

interface Props {
  onBack: () => void;
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

const PACKS = [
  {
    id: "pack_30" as const,
    label: "30 генераций",
    stars: 199,
    per: "~6.6 ⭐/шт",
    badge: null,
  },
  {
    id: "pack_100" as const,
    label: "100 генераций",
    stars: 499,
    per: "~5.0 ⭐/шт",
    badge: null,
  },
  {
    id: "pack_200" as const,
    label: "200 генераций",
    stars: 799,
    per: "~4.0 ⭐/шт",
    badge: "Выгодно",
  },
];

const SubscriptionPage: React.FC<Props> = ({ onBack }) => {
  const { showToast } = useAppToast();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    getSubscription().then(setSub).catch(() => {});
  }, []);

  const handleBuy = async (plan: "pack_30" | "pack_100" | "pack_200") => {
    if (buying) return;
    setBuying(plan);
    try {
      const { invoice_link } = await createInvoice(plan);

      const tgApp = (window as any)?.Telegram?.WebApp;
      if (!tgApp?.openInvoice) {
        showToast("Откройте приложение в Telegram", "error");
        return;
      }

      tgApp.openInvoice(invoice_link, (status: string) => {
        if (status === "paid") {
          showToast("Пакет куплен!", "success");
          getSubscription().then(setSub).catch(() => {});
        } else if (status === "failed") {
          showToast("Оплата не прошла", "error");
        }
      });
    } catch {
      showToast("Не удалось создать инвойс", "error");
    } finally {
      setBuying(null);
    }
  };

  const freeRemaining = sub?.free_remaining ?? 7;
  const paidRemaining = sub?.paid_remaining ?? 0;
  const resetDays = sub?.free_reset_at ? daysUntil(sub.free_reset_at) : 7;

  return (
    <div
      className="flex flex-col h-[100dvh] bg-[#0A0A0A] animate-fadeIn"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
    >
      {/* Header */}
      <div className="bg-[#111111] border-b border-white/8">
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <button onClick={onBack} className="text-gray-400 text-sm font-medium">
            ← Назад
          </button>
          <span className="font-semibold text-white">Генерации</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* Balance card */}
        <div
          className="rounded-3xl p-5 text-white"
          style={{ background: "linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)" }}
        >
          <div className="text-xs font-medium text-red-200 mb-3 uppercase tracking-wide">
            Текущий баланс
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-3xl font-bold">{freeRemaining}</div>
              <div className="text-xs text-red-200 mt-1">
                бесплатных
                {resetDays > 0 ? `, обновление через ${resetDays} дн.` : ", обновляются сегодня"}
              </div>
            </div>
            {paidRemaining > 0 && (
              <>
                <div className="w-px bg-red-400/40 self-stretch" />
                <div>
                  <div className="text-3xl font-bold">{paidRemaining}</div>
                  <div className="text-xs text-red-200 mt-1">купленных</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* How it works */}
        <div
          className="rounded-2xl px-4 py-3 text-xs text-gray-500 leading-relaxed"
          style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          7 бесплатных генераций каждую неделю. Купленные пакеты не сгорают и тратятся после исчерпания бесплатных.
        </div>

        {/* Pack cards */}
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide pt-1">
          Купить генерации
        </div>

        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className="rounded-2xl p-5"
            style={{
              background: "#1A1A1A",
              border: pack.badge
                ? "1px solid rgba(239,68,68,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: pack.badge ? "0 0 20px rgba(239,68,68,0.07)" : "none",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{pack.label}</span>
                  {pack.badge && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}
                    >
                      {pack.badge}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">{pack.per}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-red-400 text-lg">⭐ {pack.stars}</div>
              </div>
            </div>

            <button
              onClick={() => handleBuy(pack.id)}
              disabled={!!buying}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #EF4444, #F43F5E)" }}
            >
              {buying === pack.id ? "Открываю..." : `Купить за ${pack.stars} ⭐`}
            </button>
          </div>
        ))}

        <p className="text-center text-xs text-gray-600 px-4 pb-2">
          Оплата через Telegram Stars. Пакеты не сгорают.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;
