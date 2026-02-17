import React, { useState, useRef } from "react";
import { Conversation } from "@/api/chatApi";

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
    <div className="relative overflow-hidden">
      {/* Delete button */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500"
        style={{ width: DELETE_W }}
      >
        <button
          onClick={() => onDelete(conv.id)}
          className="w-full h-full flex flex-col items-center justify-center gap-1 text-white active:bg-red-600 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
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
          background: "#FFFFFF",
          touchAction: "pan-y",
          willChange: "transform",
        }}
      >
        <button
          onClick={() => {
            if (isOpen) { onClose(); return; }
            onSelect(conv.id);
          }}
          className="w-full text-left px-4 py-4 flex items-center gap-3 active:bg-gray-50 transition-colors"
        >
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm"
            style={{ background: "linear-gradient(135deg, #F9A8D4, #EC4899)" }}
          >
            {(conv.girl_name || "?").charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-[15px] truncate">
              {conv.girl_name || "Новый диалог"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {formatDate(conv.created_at)}
            </div>
          </div>

          {/* Chevron */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-300 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <div className="ml-[68px] mr-4 h-px bg-gray-100" />
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
}

const ConversationsPage: React.FC<ConversationsPageProps> = ({
  conversations,
  onSelect,
  onCreate,
  onDelete,
  onSubscribe,
  loading,
}) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const safeConvs = Array.isArray(conversations)
    ? conversations.filter((c) => c && c.id)
    : [];

  return (
    <div
      className="flex flex-col h-[100dvh] bg-[#F6F7FB] animate-fadeIn"
      onClick={() => openId && setOpenId(null)}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <h1 className="text-xl font-bold text-gray-900">Диалоги</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSubscribe(); }}
              className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 active:scale-95 transition-transform"
              title="Подписка"
            >
              ⭐
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onCreate(); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform disabled:opacity-50 shadow-md"
              style={{ background: "linear-gradient(135deg, #3B5BDB, #4F46E5)" }}
            >
              <span className="text-lg leading-none">+</span>
              Новый
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && safeConvs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 px-8 text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold text-base mb-2">Нет диалогов</p>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Создай первый диалог и начни писать уверенно
            </p>
            <button
              onClick={onCreate}
              className="px-6 py-3 rounded-2xl text-white font-semibold text-sm shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #3B5BDB, #4F46E5)" }}
            >
              + Создать диалог
            </button>
          </div>
        )}

        {!loading && safeConvs.length > 0 && (
          <div className="pt-3 pb-4">
            <div className="bg-white mx-4 rounded-2xl shadow-sm overflow-hidden">
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
            </div>
            <p className="text-center text-xs text-gray-400 mt-4 px-4">
              Свайп влево — удалить диалог
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsPage;
