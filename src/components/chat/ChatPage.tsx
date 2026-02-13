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
  const [girlName, setGirlName] = useState<string>("Чат");
  const [toast, setToast] = useState<string | null>(null);

  const [draftGirlReply, setDraftGirlReply] = useState("");
  const [openerFacts, setOpenerFacts] = useState("");

  const [selectedAction, setSelectedAction] = useState<
    "reengage" | "contact" | "date" | null
  >(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isNewDialog = messages.length === 0;

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

    const facts = openerFacts.trim();
    const girlText = draftGirlReply.trim();

    if (!facts && !girlText) return;

    let action: any = "normal";
    let input: string | null = null;

    if (facts) {
      action = "opener";
      input = facts;
    } else {
      action = selectedAction ?? "normal";
      input = girlText;
    }

    setGenerating(true);
    setSuggestions([]);

    try {
      const res = await chatGenerate(
        conversationId,
        input,
        action,
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

      // если это ответ на её сообщение — сохраняем её сообщение
      if (!facts && girlText) {
        await chatSave(conversationId, girlText, "girl");

        const girlMsg: Message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: "girl",
          text: girlText,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, girlMsg]);
        setDraftGirlReply("");
      }

      setSuggestions(res.suggestions || []);
      setOpenerFacts("");
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

  const toggleAction = (action: "reengage" | "contact" | "date") => {
    if (selectedAction === action) {
      setSelectedAction(null);
    } else {
      setSelectedAction(action);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F6F7FB] relative">

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="px-6 py-4 rounded-2xl shadow-2xl text-white text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-500">
            {toast}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="text-blue-600 text-sm">
            ← Назад
          </button>
          <span className="font-semibold">{girlName}</span>
        </div>
      </div>

      {/* MESSAGES */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {messages.map((msg) => (
          <MessageBubble key={msg.id} text={msg.text} role={msg.role} />
        ))}

        {/* Новый диалог — оба облака */}
        {isNewDialog && (
          <>
            {/* Розовое */}
            <textarea
              value={draftGirlReply}
              onChange={(e) => setDraftGirlReply(e.target.value)}
              placeholder="Вставь её сообщение..."
              className="w-full px-4 py-3 rounded-2xl bg-gradient-to-br from-pink-200 to-pink-300 text-sm shadow-md"
            />

            {/* Голубое */}
            <textarea
              value={openerFacts}
              onChange={(e) => setOpenerFacts(e.target.value)}
              placeholder="Напиши факты о девушке — я придумаю опенер"
              className="w-full px-4 py-3 rounded-2xl bg-gradient-to-br from-blue-200 to-blue-300 text-sm shadow-md"
            />
          </>
        )}

        {/* После первого сообщения остаётся только розовое */}
        {!isNewDialog && (
          <textarea
            value={draftGirlReply}
            onChange={(e) => setDraftGirlReply(e.target.value)}
            placeholder="Вставь её ответ..."
            className="w-full px-4 py-3 rounded-2xl bg-gradient-to-br from-pink-200 to-pink-300 text-sm shadow-md"
          />
        )}
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
            onClick={() => toggleAction(btn.action as any)}
            className={`flex-1 py-2 rounded-xl text-sm ${
              selectedAction === btn.action
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-700"
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
          className="w-full py-3 rounded-2xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 shadow-lg"
        >
          Сделать шаг
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
