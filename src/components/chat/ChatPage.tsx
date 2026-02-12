import React, { useState, useRef, useEffect, useMemo } from "react";
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

  const [leftDraft, setLeftDraft] = useState("");
  const [rightDraft, setRightDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ===========================
     LOAD CONVERSATION
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
     DERIVED STAGE
  ============================ */

  const stage = useMemo(() => {
    if (messages.length === 0) return "start";

    const last = messages[messages.length - 1];

    if (last.role === "assistant") return "await_girl";

    return "normal";
  }, [messages]);

  /* ===========================
     HANDLE STEP
  ============================ */

  const handleStep = async () => {
    if (generating) return;

    // === START: девушка первая
    if (stage === "start" && leftDraft.trim()) {
      const girlMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "girl",
        text: leftDraft.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages([girlMsg]);
      setLeftDraft("");

      await chatSave(conversationId, girlMsg.text);

      setGenerating(true);
      const res = await chatGenerate(
        conversationId,
        girlMsg.text,
        "normal"
      );
      setSuggestions(res.suggestions || []);
      setGenerating(false);

      return;
    }

    // === START: я первый (факты)
    if (stage === "start" && rightDraft.trim()) {
      setGenerating(true);
      const res = await chatGenerate(
        conversationId,
        rightDraft.trim(),
        "normal"
      );
      setSuggestions(res.suggestions || []);
      setRightDraft("");
      setGenerating(false);
      return;
    }

    // === AWAIT GIRL REPLY
    if (stage === "await_girl" && leftDraft.trim()) {
      const girlMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "girl",
        text: leftDraft.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, girlMsg]);
      setLeftDraft("");

      setGenerating(true);
      const res = await chatGenerate(
        conversationId,
        girlMsg.text,
        "normal"
      );
      setSuggestions(res.suggestions || []);
      setGenerating(false);
    }
  };

  /* ===========================
     SELECT SUGGESTION
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

    await chatSave(conversationId, text);
  };

  /* ===========================
     RENDER
  ============================ */

  return (
    <div className="flex flex-col h-screen" style={{ background: "#F6F7FB" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b">
        <button onClick={onBack} className="text-sm text-blue-600">
          ← Назад
        </button>
        <span className="font-semibold">Чат</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {stage === "start" && (
          <>
            {/* Left */}
            <div className="mb-4 flex">
              <div className="w-3/4 rounded-2xl p-4 bg-pink-200">
                <textarea
                  value={leftDraft}
                  onChange={(e) => setLeftDraft(e.target.value)}
                  placeholder="Вставь её текст, если написала первой"
                  className="w-full bg-transparent outline-none resize-none"
                />
              </div>
            </div>

            {/* Right */}
            <div className="mb-6 flex justify-end">
              <div className="w-3/4 rounded-2xl p-4 bg-blue-200">
                <textarea
                  value={rightDraft}
                  onChange={(e) => setRightDraft(e.target.value)}
                  placeholder="Напиши факты о ней — я напишу первое сообщение"
                  className="w-full bg-transparent outline-none resize-none"
                />
              </div>
            </div>
          </>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} text={msg.text} role={msg.role} />
        ))}

        {stage === "await_girl" && (
          <div className="mt-4 flex">
            <div className="w-3/4 rounded-2xl p-4 bg-pink-200">
              <textarea
                value={leftDraft}
                onChange={(e) => setLeftDraft(e.target.value)}
                placeholder="Вставь её ответ..."
                className="w-full bg-transparent outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      <div className="px-4 pb-4">
        <button
          onClick={handleStep}
          disabled={generating}
          className="w-2/3 mx-auto block py-3 rounded-2xl text-white bg-blue-600"
        >
          Сделать шаг
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
