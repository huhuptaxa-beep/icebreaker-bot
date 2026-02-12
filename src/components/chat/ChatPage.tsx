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
     LOAD HISTORY
  ============================ */

  useEffect(() => {
    getConversation(conversationId)
      .then((data) => {
        setMessages(data.messages || []);
      })
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  /* ===========================
     GENERATE NEXT STEP
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
      role: "assistant",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, myMessage]);
    setSuggestions([]);
    setDraftGirlReply("");

    try {
      await chatSave(conversationId, text);
    } catch {}
  };

  /* ===========================
     SAVE GIRL REPLY
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
      await chatSave(conversationId, draftGirlReply);
    } catch {}
  };

  /* ===========================
     RENDER
  ============================ */

  return (
    <div className="flex flex-col h-screen bg-[#F6F7FB]">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b">
        <button
          onClick={onBack}
          className="text-sm font-medium text-[#4F7CFF]"
        >
          ← Назад
        </button>
        <span className="font-semibold">Чат</span>
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

        {/* GIRL REPLY INPUT (ВСЕГДА ВИДЕН ЕСЛИ ПОСЛЕДНИЙ НЕ ОНА) */}
        {messages.length === 0 ||
        messages[messages.length - 1].role !== "girl" ? (
          <div className="flex">
            <div className="max-w-[70%]">
              <textarea
                value={draftGirlReply}
                onChange={(e) => setDraftGirlReply(e.target.value)}
                placeholder="Вставь её ответ..."
                className="w-full px-4 py-3 rounded-2xl bg-pink-100 text-[#5A2D35] resize-none outline-none text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-4 pb-2 flex gap-2">
        <button
          onClick={() => handleGenerate(null, "reengage")}
          className="flex-1 py-2 rounded-xl bg-gray-200 text-sm"
        >
          Продолжить
        </button>
        <button
          onClick={() => handleGenerate(null, "contact")}
          className="flex-1 py-2 rounded-xl bg-gray-200 text-sm"
        >
          Контакт
        </button>
        <button
          onClick={() => handleGenerate(null, "date")}
          className="flex-1 py-2 rounded-xl bg-gray-200 text-sm"
        >
          Встреча
        </button>
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
            if (draftGirlReply.trim()) {
              handleSaveGirlReply();
              handleGenerate(draftGirlReply, "normal");
            }
          }}
          disabled={generating}
          className="w-2/3 mx-auto block py-3 rounded-2xl text-white font-medium"
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
