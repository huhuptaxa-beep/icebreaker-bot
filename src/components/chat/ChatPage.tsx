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

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F6F7FB]">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 backdrop-blur-md bg-white/70 border-b border-white/40 shadow-sm">
        <button
          onClick={onBack}
          className="text-sm font-medium text-[#4F7CFF] active:scale-95 transition"
        >
          ← Назад
        </button>
        <span className="font-semibold text-[#1A1A1A]">Чат</span>
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
                           shadow-sm"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ACTION BUTTONS */}
      <div className="px-4 pb-2 flex gap-2">
        {["reengage", "contact", "date"].map((type, i) => (
          <button
            key={i}
            onClick={() => handleGenerate(null, type as any)}
            className="flex-1 py-2 rounded-xl bg-gray-200 text-sm
                       transition-all duration-200 active:scale-95
                       hover:bg-gray-300 shadow-sm"
          >
            {type === "reengage"
              ? "Продолжить"
              : type === "contact"
              ? "Контакт"
              : "Встреча"}
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
            if (draftGirlReply.trim()) {
              handleSaveGirlReply();
              handleGenerate(draftGirlReply, "normal");
            }
          }}
          disabled={generating}
          className="w-2/3 mx-auto block py-3 rounded-2xl text-white font-medium
                     transition-all duration-200 active:scale-95 shadow-md"
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
