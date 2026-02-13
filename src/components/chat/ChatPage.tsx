import React, { useState, useRef, useEffect } from "react";
import {
  Message,
  chatGenerate,
  chatSave,
  getConversation,
} from "@/api/chatApi";
import MessageBubble from "./MessageBubble";
import SuggestionsPanel from "./SuggestionsPanel";

interface ChatPageProps {
  conversationId: string;
  onBack: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({
  conversationId,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [draftGirlReply, setDraftGirlReply] = useState("");
  const [girlName, setGirlName] = useState<string>("Чат");
  const [toast, setToast] = useState<string | null>(null);

  // 🔵 выбранный режим
  const [selectedAction, setSelectedAction] = useState<
    "normal" | "reengage" | "contact" | "date"
  >("normal");

  const scrollRef = useRef<HTMLDivElement>(null);

  const getTelegramId = (): number | null => {
    const tg = (window as any)?.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id ?? null;
  };

  /* ================= LOAD HISTORY ================= */

  useEffect(() => {
    getConversation(conversationId)
      .then((data) => {
        setGirlName(data.girl_name || "Чат");
        setMessages(data.messages || []);
      })
      .catch(() => {});
  }, [conversationId]);

  /* ================= AUTO SCROLL ================= */

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  /* ================= GENERATE ================= */

  const handleGenerate = async (
    input: string | null,
    action: "normal" | "reengage" | "contact" | "date"
  ) => {
    const telegramId = getTelegramId();
    if (!telegramId) return;

    setGenerating(true);
    setSuggestions([]);

    try {
      const res = await chatGenerate(
        conversationId,
        input,
        action,
        telegramId
      );

      if (res.limit_reached) {
        setToast("Лимит бесплатных генераций исчерпан");
        setTimeout(() => setToast(null), 6000);
        setGenerating(false);
        return;
      }

      if (res.remaining === 3) {
        setToast("Осталось 3 бесплатные генерации");
        setTimeout(() => setToast(null), 4500);
      }

      setSuggestions(res.suggestions || []);
    } catch {
      setSuggestions(["Ошибка генерации"]);
    } finally {
      setGenerating(false);
    }
  };

  /* ================= SELECT SUGGESTION ================= */

  const handleSelectSuggestion = async (text: string) => {
    const myMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "user",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, myMessage]);
    setSuggestions([]);
    setDraftGirlReply("");

    try {
      await chatSave(conversationId, text, "user");
    } catch {}
  };

  /* ================= SAVE GIRL MESSAGE ================= */

  const handleSaveGirlReply = async (text: string) => {
    const girlMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "girl",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, girlMsg]);
    setDraftGirlReply("");

    try {
      await chatSave(conversationId, text, "girl");
    } catch {}
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F6F7FB] relative">

      {/* 🔵 TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
          <div
            className="px-6 py-4 rounded-2xl shadow-2xl text-white text-base font-bold tracking-wide"
            style={{
              background:
                "linear-gradient(135deg,#3B5BDB 0%,#5C7CFA 100%)",
            }}
          >
            {toast}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-white/40 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#3B5BDB] text-sm font-medium"
          >
            ← Назад
          </button>

          <span className="font-semibold text-[#1A1A1A]">
            {girlName}
          </span>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            role={msg.role}
          />
        ))}

        {/* Поле ответа девушки */}
        {(messages.length === 0 ||
          messages[messages.length - 1].role !== "girl") && (
          <div className="flex">
            <div className="max-w-[70%]">
              <textarea
                value={draftGirlReply}
                onChange={(e) =>
                  setDraftGirlReply(e.target.value)
                }
                placeholder="Вставь её ответ..."
                className="w-full px-4 py-3 rounded-2xl
                           bg-gradient-to-br from-pink-200 to-pink-300
                           text-[#5A2D35] resize-none outline-none text-sm shadow-md"
              />
            </div>
          </div>
        )}
      </div>

      {/* ACTION SELECT (без генерации) */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { label: "Продолжить", action: "reengage" },
          { label: "Контакт", action: "contact" },
          { label: "Встреча", action: "date" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() =>
              setSelectedAction(btn.action as any)
            }
            className={`flex-1 py-2 rounded-xl text-sm font-medium active:scale-95 ${
              selectedAction === btn.action
                ? "bg-[#3B5BDB] text-white"
                : ""
            }`}
            style={
              selectedAction === btn.action
                ? {}
                : {
                    background:
                      "linear-gradient(135deg,#E0E7FF 0%,#D0DAFF 100%)",
                    color: "#3B5BDB",
                  }
            }
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* SUGGESTIONS */}
      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      {/* MAIN BUTTON */}
      <div className="px-4 pb-4">
        <button
          onClick={() => {
            const text = draftGirlReply.trim();
            if (!text) return;

            handleSaveGirlReply(text);
            handleGenerate(text, selectedAction);
          }}
          disabled={generating}
          className="w-2/3 mx-auto block py-3 rounded-2xl text-white font-semibold shadow-lg"
          style={{
            background:
              "linear-gradient(135deg,#3B5BDB 0%,#5C7CFA 100%)",
          }}
        >
          Сделать шаг
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
