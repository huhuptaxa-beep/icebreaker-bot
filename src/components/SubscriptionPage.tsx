import React from "react";
import { useAppToast } from "@/components/ui/AppToast";

interface Props {
  onBack: () => void;
}

const SubscriptionPage: React.FC<Props> = ({ onBack }) => {
  const { showToast } = useAppToast();

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
          <span className="font-semibold text-white">Подписка</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Hero */}
        <div
          className="rounded-3xl p-6 text-center text-white shadow-xl"
          style={{ background: "linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)" }}
        >
          <div className="text-5xl mb-3">⭐</div>
          <h1 className="text-xl font-bold mb-2">Icebreaker Pro</h1>
          <p className="text-red-200 text-sm leading-relaxed">
            Без лимитов. Больше диалогов. Больше свиданий.
          </p>
        </div>

        {/* Free plan */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="font-semibold text-white">Бесплатный</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">Текущий план</div>
            </div>
            <div className="text-sm font-bold text-gray-500">0 ₽</div>
          </div>
          <ul className="space-y-2.5">
            {["5 опенеров в неделю", "10 ответов в неделю", "До 3 диалогов"].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-400">
                <span className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro plan */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "#1A1A1A",
            border: "1px solid rgba(239,68,68,0.4)",
            boxShadow: "0 0 20px rgba(239,68,68,0.08)",
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">Про</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}
                >
                  Популярный
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">Оплата Telegram Stars</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-red-400">⭐ 250</div>
              <div className="text-xs text-gray-600">в месяц</div>
            </div>
          </div>
          <ul className="space-y-2.5 mb-5">
            {[
              "Безлимитные опенеры",
              "Безлимитные ответы",
              "Неограниченно диалогов",
              "Приоритетная генерация",
              "Поддержка 24/7",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #EF4444, #F43F5E)" }}
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => showToast("Скоро будет доступно", "info")}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-[0.98] transition-transform shadow-md"
            style={{ background: "linear-gradient(135deg, #EF4444, #F43F5E)" }}
          >
            Оформить за 250 ⭐
          </button>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-gray-600 px-4 pb-2">
          Оплата производится через Telegram Stars. Управление подпиской — в настройках Telegram.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;
