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

  // стартовые режимы
  const [leftDraft, setLeftDraft] = useState("");
  const [rightDraft, setRightDraft] = useState("");
  const [dialogStarted, setDialogStarted] = useState(false);
  const [awaitingGirlReply, setAwaitingGirlReply] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ===========================
     LOAD CONVERSATION
  ============================ */

  useEffect(() => {
    getConversation(conversationId)
      .then((data) => {
        if (data.messages?.length > 0) {
          setDialogStarted(true);
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

  /* ===========================
     START STEP (ОБЩАЯ КНОПКА)
  ============================ */

  const handleStep = async () => {
    if (generating) return;

    // === СЦЕНАРИЙ: девушка отвечает после моего сообщения
    if (awaitingGirlReply && leftDraft.trim()) {
      const girlMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "girl",
        text: leftDraft.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, girlMsg]);
      setLeftDraft("");
      setAwaitingGirlReply(false);
      setGenerating(true);
      setSuggestions([]);

      try {
        const res = await chatGenerate(
          conversationId,
          girlMsg.text,
          "normal"
        );
        setSuggestions(res.suggestions || []);
      } catch {
        setSuggestions(["Ошибка генерации. Попробуй ещё раз."]);
      } finally {
        setGenerating(false);
      }

      return;
    }

    // === СЦЕНАРИЙ: девушка написала первой (первый шаг)
    if (!dialogStarted && leftDraft.trim()) {
      const girlMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "girl",
        text: leftDraft.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages([girlMsg]);
      setLeftDraft("");
      setDialogStarted(true);
      setGenerating(true);

      try {
        await chatSave(conversationId, girlMsg.text);
        const res = await chatGenerate(
          conversationId,
          girlMsg.text,
          "normal"
        );
        setSuggestions(res.suggestions || []);
      } catch {
        setSuggestions(["Ошибка генерации. Попробуй ещё раз."]);
      } finally {
        setGenerating(false);
      }

      return;
    }

    // === СЦЕНАРИЙ: я пишу первым (факты)
    if (!dialogStarted && rightDraft.trim()) {
      setGenerating(true);
      setSuggestions([]);

      try {
        const res = await chatGenerate(
          conversationId,
          rightDraft.trim(),
          "normal"
        );
        setSuggestions(res.suggestions || []);
        setRightDraft("");
        setDialogStarted(true);
      } catch {
        setSuggestions(["Ошибка генерации. Попробуй ещё раз."]);
      } finally {
        setGenerating(false);
      }

      return;
    }
  };

  /* ===========================
     ВЫБОР ВАРИАНТА
  ============================ */

  const handleSelectSuggestion = async (text: string) => {
    const myMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "assistant",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, myMsg]);
    setSuggestions([]);
    setAwaitingGirlReply(true);

    try {
      await chatSave(conversationId, text);
    } catch {}
  };

  /* ===========================
     RENDER
  ============================ */

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
        {/* === СТАРТОВЫЕ БАБЛЫ === */}
        {!dialogStarted && (
          <>
            {/* ЛЕВОЕ */}
            <div className="mb-4 flex">
              <div
                className="px-4 py-3 rounded-2xl w-3/4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg,#F6B5C5,#F8C7D3)",
                }}
              >
                <textarea
                  value={leftDraft}
                  onChange={(e) => setLeftDraft(e.target.value)}
                  placeholder="Вставь её текст, если написала первой"
                  className="w-full bg-transparent outline-none resize-none text-sm text-white placeholder-white/80"
                />
              </div>
            </div>

            {/* ПРАВОЕ */}
            <div className="mb-6 flex justify-end">
              <div
                className="px-4 py-3 rounded-2xl w-3/4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg,#5C7CFA,#4F7CFF)",
                }}
              >
                <textarea
                  value={rightDraft}
                  onChange={(e) => setRightDraft(e.target.value)}
                  placeholder="Напиши факты о ней — я напишу первое сообщение"
                  className="w-full bg-transparent outline-none resize-none text-sm text-white placeholder-white/80"
                />
              </div>
            </div>
          </>
        )}

        {/* === ДИАЛОГ === */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} text={msg.text} role={msg.role} />
        ))}

        {/* === ОЖИДАНИЕ ЕЁ ОТВЕТА === */}
        {awaitingGirlReply && (
          <div className="mt-4 flex">
            <div
              className="px-4 py-3 rounded-2xl w-3/4 text-white"
              style={{
                background:
                  "linear-gradient(135deg,#F6B5C5,#F8C7D3)",
              }}
            >
              <textarea
                value={leftDraft}
                onChange={(e) => setLeftDraft(e.target.value)}
                placeholder="Вставь её ответ..."
                className="w-full bg-transparent outline-none resize-none text-sm text-white placeholder-white/80"
              />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      {/* Кнопка */}
      {( !dialogStarted || awaitingGirlReply ) && (
        <div className="px-4 pb-4">
          <button
            onClick={handleStep}
            disabled={generating}
            className="w-2/3 mx-auto block py-3 rounded-2xl text-white text-sm font-medium active:scale-95"
            style={{
              background: "linear-gradient(135deg,#5C7CFA,#4F7CFF)",
            }}
          >
            Сделать шаг
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
