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

  // стартовые поля
  const [leftDraft, setLeftDraft] = useState("");
  const [rightDraft, setRightDraft] = useState("");
  const [startHidden, setStartHidden] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversation(conversationId)
      .then((data) => {
        if (data.messages?.length > 0) {
          setStartHidden(true);
        }
        setMessages(data.messages || []);
      })
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  const handleStartGenerate = async () => {
    if (!leftDraft.trim() && !rightDraft.trim()) return;

    setGenerating(true);
    setSuggestions([]);

    try {
      // если девушка написала первой
      if (leftDraft.trim()) {
        const girlMsg: Message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: "girl",
          text: leftDraft,
          created_at: new Date().toISOString(),
        };

        setMessages([girlMsg]);
        await chatSave(conversationId, leftDraft);

        const res = await chatGenerate(
          conversationId,
          leftDraft,
          "normal"
        );

        setSuggestions(res.suggestions || []);
      }

      // если это факты
      else if (rightDraft.trim()) {
        const res = await chatGenerate(
          conversationId,
          rightDraft,
          "normal"
        );

        setSuggestions(res.suggestions || []);
      }

      setStartHidden(true);
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
    } catch {}
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!startHidden && (
          <>
            {/* Левый стартовый баббл */}
            <div className="mb-4 flex">
              <div
                className="px-4 py-3 rounded-2xl bg-white w-3/4"
                style={{ border: "1px solid #E6E8F0" }}
              >
                <textarea
                  value={leftDraft}
                  onChange={(e) => setLeftDraft(e.target.value)}
                  placeholder="Вставь её текст, если написала первой"
                  className="w-full bg-transparent outline-none resize-none text-sm"
                />
              </div>
            </div>

            {/* Правый стартовый баббл */}
            <div className="mb-6 flex justify-end">
              <div
                className="px-4 py-3 rounded-2xl w-3/4"
                style={{ background: "#E9EEFF" }}
              >
                <textarea
                  value={rightDraft}
                  onChange={(e) => setRightDraft(e.target.value)}
                  placeholder="Напиши о ней факты — я напишу первое сообщение"
                  className="w-full bg-transparent outline-none resize-none text-sm"
                />
              </div>
            </div>
          </>
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

      {/* Общая кнопка */}
      {!startHidden && (
        <div className="px-4 pb-4">
          <button
            onClick={handleStartGenerate}
            disabled={generating}
            className="w-2/3 mx-auto block py-3 rounded-2xl text-white text-sm font-medium active:scale-95"
            style={{ background: "#4F7CFF" }}
          >
            Сделать шаг
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
