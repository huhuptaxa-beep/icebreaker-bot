import React, { useState, useRef, useEffect } from "react";
import {
  Message,
  chatGenerate,
  chatSave,
  getConversation,
} from "@/api/chatApi";
import MessageBubble from "./MessageBubble";
import SuggestionsPanel from "./SuggestionsPanel";
import ChatInput from "./ChatInput";

interface ChatPageProps {
  conversationId: string;
  onBack: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ conversationId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastGirlMessage, setLastGirlMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversation(conversationId)
      .then((data) => setMessages(data.messages || []))
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  const handleGenerate = async (
    inputText: string | null,
    action: "normal" | "reengage" | "contact" | "date"
  ) => {
    // If user pasted a girl's message, add it to chat immediately
    if (inputText && action === "normal") {
      const girlMsg: Message = {
        id: crypto.randomUUID(),
        role: "girl",
        text: inputText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, girlMsg]);
      setLastGirlMessage(inputText);
    }

    setSuggestions([]);
    setGenerating(true);

    try {
      const res = await chatGenerate(conversationId, inputText, action);
      setSuggestions(res.suggestions || []);
    } catch {
      setSuggestions(["Ошибка генерации. Попробуй ещё раз."]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectSuggestion = async (text: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSuggestions([]);

    try {
      await chatSave(conversationId, text, "user", lastGirlMessage || undefined);
    } catch {
      // silent
    }
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "#F6F7FB" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E6E8F0" }}
      >
        <button
          onClick={onBack}
          className="text-sm font-medium active:scale-95"
          style={{ color: "#4F7CFF" }}
        >
          ← Назад
        </button>
        <span className="text-base font-semibold" style={{ color: "#1A1A1A" }}>
          Чат
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: "#8B8FA3" }}>
            Вставь первое сообщение девушки
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} text={msg.text} role={msg.role} />
        ))}
      </div>

      {/* Suggestions */}
      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      {/* Input */}
      <ChatInput
        onSend={(text) => handleGenerate(text, "normal")}
        onAction={(action) => handleGenerate(null, action)}
        disabled={generating}
      />
    </div>
  );
};

export default ChatPage;
