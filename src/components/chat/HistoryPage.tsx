import React from "react";
import { Message } from "@/api/chatApi";

interface HistoryPageProps {
  girlName: string;
  messages: Message[];
  onBack: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ girlName, messages, onBack }) => {
  return (
    <div
      className="flex flex-col min-h-[100dvh] animate-fadeIn"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #1A1A22 0%, #0E0E12 60%, #0A0A0D 100%)",
        paddingBottom: "calc(120px + env(safe-area-inset-bottom))",
      }}
    >
      <header
        className="px-5 pt-6 pb-4 flex items-center gap-3"
        style={{
          background: "rgba(5, 5, 5, 0.92)",
          borderBottom: "0.5px solid rgba(200, 200, 220, 0.08)",
        }}
      >
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "0.5px solid rgba(200, 200, 220, 0.12)",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          ← Back to AI
        </button>
        <div className="flex-1">
          <p className="text-xs tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
            История переписки
          </p>
          <h2 className="text-xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
            {girlName}
          </h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Переписка пуста. Напиши ей первым!
          </p>
        )}
        {messages.map((message) => {
          const isGirl = message.role === "girl";
          return (
            <div key={message.id} className="flex flex-col gap-1">
              <span
                className="text-xs font-semibold tracking-wide"
                style={{ color: isGirl ? "#F9E076" : "rgba(255,255,255,0.6)" }}
              >
                {isGirl ? "Она" : "Ты"}
              </span>
              <div
                className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={{
                  background: isGirl ? "rgba(249, 224, 118, 0.08)" : "rgba(255, 255, 255, 0.05)",
                  border: isGirl
                    ? "1px solid rgba(249, 224, 118, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  color: "rgba(255, 255, 255, 0.92)",
                }}
              >
                {message.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryPage;
