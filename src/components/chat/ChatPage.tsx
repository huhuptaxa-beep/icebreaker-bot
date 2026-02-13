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

  // режим может быть null
  const [selectedAction, setSelectedAction] = useState<
    "reengage" | "contact" | "date" | null
  >(null);

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

  const handleGenerate = async () => {
    const telegramId = getTelegramId();
    if (!telegramId) return;

    const text = draftGirlReply.trim();
    if (!text) return;

    const action = selectedAction ?? "normal";

    setGenerating(true);
    setSuggestions([]);

    try {
      const res = await chatGenerate(
        conversationId,
        text,
        action as any,
        telegramId
      );

      if (res.limit_reached) {
        setToast("Лимит бесплатных генераций исчерпан");
        setTimeout(() => setToast(null), 6000);
        return;
      }

      if (res.remaining === 3) {
        setToast("Осталось 3 бесплатные генерации");
        setTimeout(() => setToast(null), 4500);
      }

      // сохраняем сообщение девушки
      await chatSave(conversationId, text, "girl");

      const girlMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "girl",
        text,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, girlMsg]);
      setDraftGirlReply("");

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

    try {
      await chatSave(conversationId, text, "user");
    } catch {}
  };

  /* ================= MODE SELECT ================= */

  const toggleAction = (action: "reengage" | "contact" | "date") => {
    if (selectedAction === action) {
      setSelectedAction(null); // снять выбор
    } else {
      setSelectedAction(action);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F6F7FB] relative">

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
          <div
            className="px-6 py-4 rounded-2xl shadow-2xl text-white text-base font-bold"
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
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { label: "Продолжить", action: "reengage" },
          { label: "Контакт", action: "contact" },
          { label: "Встреча", action: "date" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() =>
              toggleAction(btn.action as any)
            }
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
              selectedAction === btn.action
                ? "bg-[#3B5BDB] text-white"
                : "bg-[#E0E7FF] text-[#3B5BDB]"
            }`}
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
          onClick={handleGenerate}
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
