import React from "react";
import { Conversation } from "@/api/chatApi";

interface ProfilePageProps {
  telegramId: number | null;
  conversations: Conversation[];
  balance?: number;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ telegramId, conversations, balance }) => {
  const totalDialogs = conversations.length;
  const telegramReceived = conversations.filter((conv) => conv.channel === "telegram").length;
  const datesArranged = conversations.filter((conv) => (conv.phase ?? 0) >= 5).length;

  const username = telegramId ? `User #${telegramId}` : "Icebreaker Agent";

  return (
    <div
      className="flex flex-col min-h-[100dvh] animate-fadeIn"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #1A1A22 0%, #0E0E12 60%, #0A0A0D 100%)",
        paddingBottom: "calc(120px + env(safe-area-inset-bottom))",
      }}
    >
      <header
        className="px-5 pt-6 pb-4"
        style={{
          background: "rgba(5, 5, 5, 0.92)",
          borderBottom: "0.5px solid rgba(200, 200, 220, 0.08)",
        }}
      >
        <p className="text-xs tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
          Профиль
        </p>
        <h2 className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
          {username}
        </h2>
      </header>

      <div className="py-6 space-y-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "0.5px solid rgba(200, 200, 220, 0.08)",
              color: "#F9E076",
            }}
          >
            💬
          </div>
          <div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              Icebreaker Premium
            </p>
            <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
              {totalDialogs} активных диалогов
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "0.5px solid rgba(200, 200, 220, 0.08)",
            }}
          >
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Статистика
            </p>
            <div className="mt-4 space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              <div className="flex justify-between">
                <span>Dialogs count</span>
                <span>{totalDialogs}</span>
              </div>
              <div className="flex justify-between">
                <span>Telegram received</span>
                <span>{telegramReceived}</span>
              </div>
              <div className="flex justify-between">
                <span>Dates arranged</span>
                <span>{datesArranged}</span>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "0.5px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <p className="text-base font-semibold flex items-center gap-2" style={{ color: "#F9E076" }}>
              <span>⭐</span> Generations
            </p>
            <p className="text-3xl font-black tracking-tight" style={{ color: "rgba(255,255,255,0.95)" }}>
              {balance ?? "—"}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              Свежие генерации обновляются каждую неделю
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
