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

type StartMode = "me_first" | "she_first";

const ChatPage: React.FC<ChatPageProps> = ({ conversationId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [startMode, setStartMode] = useState<StartMode>("me_first");
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

  const isEmptyChat = messages.length === 0;

  const handleGenerate = async (
    inputText: string | null,
    action: "normal" | "reengage" | "contact" | "date"
  ) => {
    setSuggestions([]);
    setGenerating(true);

    try {
      // Если она написала первой — сохраняем её сообщение
      if (isEmptyChat && startMode === "she_first" && inputText) {
        const girlMsg: Message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: "girl",
          text: inputText,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, girlMsg]);
        await chatSave(conversationId, inputText);
      }

      const res = await chatGenerate(
        conversationId,
        inputText,
        action
      );

      setSuggestions(res.suggestions || []);
    } catch {
      setSuggestions(["Ошибка генерации. Попробуй ещё раз."]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectSuggestion = async (text: string) => {
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "assistant",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setSuggestions([]);

    try {
      await chatSave(conversationId, text);
    } catch {
      // silent
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "#F6F7FB" }}>
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
        {isEmptyChat && (
          <div className="mb-6">
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setStartMode("me_first")}
                className="px-4 py-2 rounded-full text-sm"
                style={{
                  background:
                    startMode === "me_first" ? "#4F7CFF" : "#E6E8F0",
                  color: startMode === "me_first" ? "#FFFFFF" : "#1A1A1A",
                }}
              >
                Я пишу первым
              </button>

              <button
                onClick={() => setStartMode("she_first")}
                className="px-4 py-2 rounded-full text-sm"
                style={{
                  background:
                    startMode === "she_first" ? "#4F7CFF" : "#E6E8F0",
                  color: startMode === "she_first" ? "#FFFFFF" : "#1A1A1A",
                }}
              >
                Она написала первой
              </button>
            </div>

            <div
              className="text-sm text-center"
              style={{ color: "#8B8FA3" }}
            >
              {startMode === "me_first"
                ? "Вставь факты о девушке для первого сообщения"
                : "Вставь её первое сообщение"}
            </div>
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
        buttonLabel="Сделать шаг"
      />
    </div>
  );
};

export default ChatPage;
