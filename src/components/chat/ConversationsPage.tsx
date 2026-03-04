import React, { useState, useRef } from "react";
import { Conversation } from "@/api/chatApi";
import TutorialOverlay, { TutorialStep } from "@/components/ui/TutorialOverlay";
import PhaseProgressBar from "@/components/ui/PhaseProgressBar";

/* ==============================
   HELPERS
============================== */

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

/* ==============================
   SWIPEABLE ROW
============================== */

interface SwipeableRowProps {
  conv: Conversation;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const DELETE_W = 80;

const SwipeableRow: React.FC<SwipeableRowProps> = ({
  conv,
  onSelect,
  onDelete,
  isOpen,
  onOpen,
  onClose,
}) => {
  const [dragging, setDragging] = useState(false);
  const [liveOffset, setLiveOffset] = useState(0);
  const touchStartX = useRef(0);
  const baseX = useRef(0);

  const committedX = isOpen ? -DELETE_W : 0;
  const rawX = baseX.current + liveOffset;
  const clampedX = Math.min(0, Math.max(-DELETE_W, rawX));
  const translateX = dragging ? clampedX : committedX;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    baseX.current = committedX;
    setDragging(true);
    setLiveOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    setLiveOffset(dx);
  };

  const onTouchEnd = () => {
    const finalX = Math.min(0, Math.max(-DELETE_W, baseX.current + liveOffset));
    setDragging(false);
    setLiveOffset(0);
    if (finalX < -DELETE_W / 2) onOpen();
    else onClose();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete button — Platinum Silver */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
        style={{
          width: DELETE_W,
          background: "linear-gradient(135deg, #2A2A30, #3A3A42)",
        }}
      >
        <button
          onClick={() => onDelete(conv.id)}
          className="w-full h-full flex flex-col items-center justify-center gap-1 transition-colors"
          style={{ color: "rgba(200, 200, 220, 0.7)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <span className="text-xs font-medium">Удалить</span>
        </button>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          border: "0.5px solid rgba(200, 200, 220, 0.08)",
          borderRadius: 16,
          touchAction: "pan-y",
          willChange: "transform",
        }}
      >
        <button
          onClick={() => {
            if (isOpen) { onClose(); return; }
            onSelect(conv.id);
          }}
          className="w-full text-left px-4 py-4 flex items-center gap-3 active:bg-white/[0.03] transition-colors"
        >
          {/* Avatar — Premium Silver, smaller thinner serif letter */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #707078, #B0B0B8, #D4D4DC, #B0B0B8)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            }}
          >
            <span
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontWeight: 400,
                fontSize: 15,
                color: "#1A1A1E",
                textShadow: "0 1px 2px rgba(255, 255, 255, 0.2)",
                letterSpacing: "0.02em",
              }}
            >
              {(conv.girl_name || "?").charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-white/90 text-[15px] truncate tracking-wide">
                {conv.girl_name || "Новый диалог"}
              </div>
              <div
                className="text-xs mt-0.5 font-medium"
                style={{ color: "rgba(200, 200, 220, 0.4)" }}
              >
                {formatDate(conv.created_at)}
              </div>
            </div>
            <PhaseProgressBar
              interest={conv.effective_interest || 0}
              size="small"
            />
          </div>

          {/* Chevron — silver */}
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "rgba(200, 200, 220, 0.25)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ==============================
   MAIN PAGE
============================== */

interface ConversationsPageProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSubscribe: () => void;
  loading?: boolean;
  balance?: number;
}

const ConversationsPage: React.FC<ConversationsPageProps> = ({
  conversations,
  onSelect,
  onCreate,
  onDelete,
  onSubscribe,
  loading,
  balance,
}) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(
    () => localStorage.getItem("tutorial_list_done") !== "true"
  );

  const LIST_TUTORIAL_STEPS: TutorialStep[] = [
    { targetId: "btn-new-dialog", text: "Нажми, чтобы создать диалог.\nВпиши имя девушки", position: "bottom" },
    { targetId: "btn-balance", text: "Твой баланс генераций.\nБесплатные обновляются каждую неделю", position: "bottom" },
  ];

  const safeConvs = Array.isArray(conversations)
    ? conversations.filter((c) => c && c.id)
    : [];

  return (
    <div
      className="flex flex-col h-[100dvh] animate-fadeIn"
      style={{ background: "#050505" }}
      onClick={() => openId && setOpenId(null)}
    >
      {/* ========== UNIFIED TOP BAR — Title + Badges on one line ========== */}
      <div
        style={{
          background: "rgba(5, 5, 5, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "0.5px solid rgba(200, 200, 220, 0.06)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}
        >
          {/* Title */}
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              color: "rgba(255, 255, 255, 0.92)",
              letterSpacing: "-0.02em",
            }}
          >
            Диалоги
          </h1>

          {/* Controls */}
          <div className="flex items-center gap-2.5">
            {/* Balance — gold star */}
            <button
              id="btn-balance"
              onClick={(e) => { e.stopPropagation(); onSubscribe(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
              style={{
                background: "rgba(212, 175, 55, 0.08)",
                border: "0.5px solid rgba(212, 175, 55, 0.2)",
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #AD8B3A, #F9E076)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: 16,
                }}
              >
                ★
              </span>
              <span
                className="font-bold"
                style={{
                  background: "linear-gradient(135deg, #AD8B3A, #F9E076)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {balance ?? "—"}
              </span>
            </button>

            {/* New Chat — gold button */}
            <button
              id="btn-new-dialog"
              onClick={(e) => { e.stopPropagation(); onCreate(); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #AD8B3A, #F9E076)",
                color: "#050505",
                boxShadow: "0 4px 15px rgba(212, 175, 55, 0.25)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span className="text-base leading-none">+</span>
              Новый
            </button>
          </div>
        </div>
      </div>

      {/* ========== LIST ========== */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div
              className="w-7 h-7 border-2 rounded-full animate-spin"
              style={{
                borderColor: "rgba(212, 175, 55, 0.3)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        )}

        {!loading && safeConvs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 px-8 text-center animate-fadeIn">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{
                background: "rgba(212, 175, 55, 0.06)",
                border: "0.5px solid rgba(212, 175, 55, 0.15)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="w-10 h-10" style={{ color: "rgba(212, 175, 55, 0.4)" }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-white/90 font-semibold text-base mb-2">Нет диалогов</p>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "rgba(200, 200, 220, 0.45)" }}>
              Создай первый диалог и начни писать уверенно
            </p>
            <button
              onClick={onCreate}
              className="px-6 py-3 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform"
              style={{
                background: "linear-gradient(135deg, #AD8B3A, #F9E076)",
                color: "#050505",
                boxShadow: "0 8px 25px rgba(212, 175, 55, 0.3)",
              }}
            >
              + Создать диалог
            </button>
          </div>
        )}

        {!loading && safeConvs.length > 0 && (
          <div className="px-4 pt-4 pb-4 space-y-3">
            {safeConvs.map((conv) => (
              <SwipeableRow
                key={conv.id}
                conv={conv}
                onSelect={onSelect}
                onDelete={onDelete}
                isOpen={openId === conv.id}
                onOpen={() => setOpenId(conv.id)}
                onClose={() => setOpenId(null)}
              />
            ))}

            <p
              className="text-center text-[11px] mt-4 font-medium"
              style={{ color: "rgba(200, 200, 220, 0.2)" }}
            >
              Свайп влево — удалить диалог
            </p>
          </div>
        )}
      </div>

      {showTutorial && (
        <TutorialOverlay
          steps={LIST_TUTORIAL_STEPS}
          storageKey="tutorial_list_done"
          onComplete={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
};

export default ConversationsPage;