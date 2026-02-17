import React from "react";
import { useAppToast } from "@/components/ui/AppToast";

interface Props {
  onBack: () => void;
}

const SubscriptionPage: React.FC<Props> = ({ onBack }) => {
  const { showToast } = useAppToast();

  return (
    <div
      className="flex flex-col h-[100dvh] bg-[#F6F7FB] animate-fadeIn"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-gray-100 shadow-sm">
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <button onClick={onBack} className="text-blue-600 text-sm font-medium">
            ← Назад
          </button>
          <span className="font-semibold text-gray-900">Подписка</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Hero */}
        <div
          className="rounded-3xl p-6 text-center text-white shadow-xl"
          style={{ background: "linear-gradient(135deg, #3B5BDB 0%, #7C3AED 100%)" }}
        >
          <div className="text-5xl mb-3">⭐</div>
          <h1 className="text-xl font-bold mb-2">Icebreaker Pro</h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Без лимитов. Больше диалогов. Больше свиданий.
          </p>
        </div>

        {/* Free plan */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="font-semibold text-gray-900">Бесплатный</div>
              <div className="text-xs text-blue-600 font-medium mt-0.5">Текущий план</div>
            </div>
            <div className="text-sm font-bold text-gray-500">0 ₽</div>
          </div>
          <ul className="space-y-2.5">
            {["5 опенеров в неделю", "10 ответов в неделю", "До 3 диалогов"].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro plan */}
        <div
          className="bg-white rounded-2xl p-5 shadow-lg border-2"
          style={{ borderColor: "#7C3AED" }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-lg">Про</span>
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                  Популярный
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Оплата Telegram Stars</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-violet-700">⭐ 250</div>
              <div className="text-xs text-gray-400">в месяц</div>
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
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => showToast("Скоро будет доступно", "info")}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-[0.98] transition-transform shadow-md"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
          >
            Оформить за 250 ⭐
          </button>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-gray-400 px-4 pb-2">
          Оплата производится через Telegram Stars. Управление подпиской — в настройках Telegram.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;
