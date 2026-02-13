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
  const [remaining, setRemaining] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const getTelegramId = (): number | null => {
    const tg = (window as any)?.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id ?? null;
  };

  useEffect(() => {
    getConversation(conversationId)
      .then((data) => {
        setGirlName(data.girl_name || "Чат");
        setMessages(data.messages || []);
      })
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  const handleGenerate = async (
    input: string | null,
    action: "normal" | "reengage" | "contact" | "date"
  ) => {
    const telegramId = getTelegramId();
    if (!telegramId) return;

    if (!input && action === "normal") return;

    setGenerating(true);
    setSuggestions([]);

    try {
      const res = await chatGenerate(
        conversationId,
        input,
        action,
        telegramId
      );

      setRemaining(res.remaining);

      if (res.limit_reached) {
        alert("Лимит генераций достигнут");
        return;
      }

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
    <div className="flex flex-col h-[100dvh] bg-[#F6F7FB]">

      <div className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-white/40 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#3B5BDB]
                       text-sm font-medium shadow-sm"
          >
            ← Назад
          </button>

          <span className="font-semibold text-[#1A1A1A]">
            {girlName}
          </span>
        </div>
      </div>

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
      </div>

      {/* Remaining Counter */}
      {remaining !== null && (
        <div className="text-center text-xs text-gray-500 mb-2">
          Осталось {remaining} бесплатных генераций
        </div>
      )}

      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      <div className="px-4 pb-4">
        <button
          onClick={() => {
            const text = draftGirlReply.trim();
            if (!text) return;

            handleSaveGirlReply(text);
            handleGenerate(text, "normal");
          }}
          disabled={generating}
          className="w-2/3 mx-auto block py-3 rounded-2xl text-white font-medium shadow-lg"
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
