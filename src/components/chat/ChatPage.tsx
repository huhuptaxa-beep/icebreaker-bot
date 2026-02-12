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

const ChatPage: React.FC<ChatPageProps> = ({ conversationId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [draftGirlReply, setDraftGirlReply] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ===========================
     LOAD HISTORY + AUTO SCROLL
  ============================ */

  useEffect(() => {
    getConversation(conversationId)
      .then((data) => {
        const msgs = data.messages || [];
        setMessages(msgs);

        // скроллим вниз сразу
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop =
              scrollRef.current.scrollHeight;
          }
        }, 50);
      })
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  /* ===========================
     GENERATE
  ============================ */

  const handleGenerate = async (
    input: string | null,
    action: "normal" | "reengage" | "contact" | "date"
  ) => {
    if (!input && action === "normal") return;

    setGenerating(true);
    setSuggestions([]);

    try {
      const res = await chatGenerate(conversationId, input, action);
      setSuggestions(res.suggestions || []);
    } catch {
      setSuggestions(["Ошибка генерации"]);
    } finally {
      setGenerating(false);
    }
  };

  /* ===========================
     SELECT SUGGESTION
  ============================ */

  const handleSelectSuggestion = async (text: string) => {
    const myMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "assistant", // ✅ теперь правильно
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, myMessage]);
    setSuggestions([]);
    setDraftGirlReply("");

    try {
      await chatSave(conversationId, text, "assistant"); // ✅ передаём role
    } catch {}
  };

  /* ===========================
     SAVE GIRL MESSAGE
  ============================ */

  const handleSaveGirlReply = async () => {
    if (!draftGirlReply.trim()) return;

    const girlMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "girl",
      text: draftGirlReply,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, girlMsg]);
    setDraftGirlReply("");

    try {
      await chatSave(conversationId, draftGirlReply, "girl"); // ✅ передаём role
    } catch {}
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F6F7FB]">

      {/* ================= HEADER (STICKY) ================= */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-white/40 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#3B5BDB] 
                       text-sm font-medium shadow-sm
                       active:scale-95 transition-all"
          >
            ← Назад
          </button>
          <span className="font-semibold text-[#1A1A1A]">
            Чат
          </span>
        </div>
      </div>

      {/* ================= MESSAGES ================= */}
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

        {/* Поле её ответа */}
        {messages.length === 0 ||
        messages[messages.length - 1].role !== "girl" ? (
          <div className="flex animate-fadeIn">
            <div className="max-w-[70%]">
              <textarea
                value={draftGirlReply}
                onChange={(e) => setDraftGirlReply(e.target.value)}
                placeholder="Вставь её ответ..."
                className="w-full px-4 py-3 rounded-2xl 
                           bg-gradient-to-br from-pink-200 to-pink-300
                           text-[#5A2D35] resize-none outline-none text-sm
                           shadow-md transition-all duration-300"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ================= ACTION BUTTONS ================= */}
      <div className="px-4 pb-3 flex gap-2">
        {[
          { label: "Продолжить", action: "reengage" },
          { label: "Контакт", action: "contact" },
          { label: "Встреча", action: "date" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() =>
              handleGenerate(null, btn.action as any)
            }
            className="flex-1 py-2 rounded-xl text-sm font-medium
                       transition-all duration-200 active:scale-95"
            style={{
              background:
                "linear-gradient(135deg,#E0E7FF 0%,#D0DAFF 100%)",
              color: "#3B5BDB",
              boxShadow:
                "0 4px 10px rgba(59,91,219,0.15)",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* ================= SUGGESTIONS ================= */}
      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      {/* ================= MAIN BUTTON ================= */}
      <div className="px-4 pb-4">
        <button
          onClick={() => {
            if (draftGirlReply.trim()) {
              handleSaveGirlReply();
              handleGenerate(draftGirlReply, "normal");
            }
          }}
          disabled={generating}
          className="w-2/3 mx-auto block py-3 rounded-2xl text-white font-medium
                     transition-all duration-200 active:scale-95 shadow-lg"
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
