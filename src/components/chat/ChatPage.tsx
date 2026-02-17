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

  const [draftGirlReply, setDraftGirlReply] = useState("");
  const [openerFacts, setOpenerFacts] = useState("");

  const [selectedAction, setSelectedAction] = useState
    "reengage" | "contact" | "date" | null
  >(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Ref для мгновенной блокировки двойного клика
  const isGeneratingRef = useRef(false);
  const isSavingRef = useRef(false);

  const isNewDialog = messages.length === 0;

  const getTelegramId = (): number | null => {
    const tg = (window as any)?.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id ?? null;
  };

  const refreshConversation = async () => {
    const data = await getConversation(conversationId);
    setGirlName(data.girl_name || "Чат");
    setMessages(data.messages || []);
  };

  useEffect(() => {
    refreshConversation().catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  /* ================= GENERATE ================= */

  const handleGenerate = async () => {
    // Мгновенная блокировка через ref (useState асинхронный — не спасает от двойного клика)
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    const telegramId = getTelegramId();
    if (!telegramId) {
      isGeneratingRef.current = false;
      return;
    }

    const facts = openerFacts.trim();
    const girlText = draftGirlReply.trim();

    // Разрешаем генерацию без текста, если последнее сообщение в истории от девушки
    const lastMsg = messages[messages.length - 1];
    const hasUnansweredGirl = lastMsg?.role === "girl";

    if (!facts && !girlText && !hasUnansweredGirl) {
      isGeneratingRef.current = false;
      return;
    }

    setGenerating(true);
    setSuggestions([]);

    try {
      let res;

      // 🔵 OPENER
      if (facts) {
        res = await chatGenerate(
          conversationId,
          null,
          "opener",
          telegramId,
          facts
        );
      }

      // 🔴 REPLY
      else {
        const action = selectedAction ?? "normal";

        res = await chatGenerate(
          conversationId,
          girlText || null,
          action,
          telegramId
        );

        setDraftGirlReply("");
      }

      // Проверяем что ответ не ошибка
      if (res.error) {
        setSuggestions([]);
        console.error("Generate error:", res.error);
      } else {
        setSuggestions(res.suggestions || []);
      }

      setOpenerFacts("");

      // Подтягиваем актуальную историю из БД
      await refreshConversation();

    } catch (err) {
      console.error(err);
      setSuggestions([]);
    } finally {
      setGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  /* ================= SELECT SUGGESTION ================= */

  const handleSelectSuggestion = async (text: string) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      const telegramId = getTelegramId();
      if (!telegramId) return;

      await chatSave(conversationId, text, "user", telegramId);
      setSuggestions([]);
      await refreshConversation();
    } catch (err) {
      console.error(err);
    } finally {
      isSavingRef.current = false;
    }
  };

  const toggleAction = (action: "reengage" | "contact" | "date") => {
    if (selectedAction === action) {
      setSelectedAction(null);
    } else {
      setSelectedAction(action);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F6F7FB]">

      {/* HEADER */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="text-blue-600 text-sm">
            ← Назад
          </button>
          <span className="font-semibold">{girlName}</span>
        </div>
      </div>

      {/* CONTENT */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} text={msg.text} role={msg.role} />
        ))}

        {isNewDialog && (
          <>
            <div className="flex">
              <div className="max-w-[70%]">
                <textarea
                  value={draftGirlReply}
                  onChange={(e) =>
                    setDraftGirlReply(e.target.value)
                  }
                  placeholder="Вставь её сообщение, если написала первая"
                  className="w-full px-4 py-3 rounded-2xl
                             bg-gradient-to-br from-pink-200 to-pink-300
                             text-[#5A2D35] text-sm shadow-md resize-none outline-none"
                />
              </div>
            </div>

            <div className="w-full">
              <textarea
                value={openerFacts}
                onChange={(e) =>
                  setOpenerFacts(e.target.value)
                }
                placeholder="Напиши факты о девушке..."
                className="w-full min-h-[120px] px-6 py-5 rounded-3xl
                           bg-gradient-to-r from-blue-600 to-indigo-600
                           text-white text-sm font-semibold
                           leading-relaxed shadow-xl
                           resize-none outline-none"
              />
            </div>
          </>
        )}

        {!isNewDialog && (
          <div className="flex">
            <div className="max-w-[70%]">
              <textarea
                value={draftGirlReply}
                onChange={(e) =>
                  setDraftGirlReply(e.target.value)
                }
                placeholder="Вставь её ответ..."
                className="w-full px-4 py-3 rounded-2xl
                           bg-gradient-to-br from-pink-200 to-pink-300
                           text-[#5A2D35] text-sm shadow-md resize-none outline-none"
              />
            </div>
          </div>
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

      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      <div className="px-4 pb-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 rounded-2xl text-white font-semibold
                     bg-gradient-to-r from-blue-600 to-indigo-500 shadow-lg"
        >
          Сделать шаг
        </button>
      </div>
    </div>
  );
};

export default ChatPage;