import React, { useState, useRef, useEffect } from "react";
import {
  Message,
  chatGenerate,
  chatSave,
  getConversation,
} from "@/api/chatApi";
import { useAppToast } from "@/components/ui/AppToast";
import MessageBubble from "./MessageBubble";
import SuggestionsPanel from "./SuggestionsPanel";

interface ChatPageProps {
  conversationId: string;
  onBack: () => void;
  onSubscribe?: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({
  conversationId,
  onBack,
  onSubscribe,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [girlName, setGirlName] = useState<string>("Чат");

  const [draftGirlReply, setDraftGirlReply] = useState("");
  const [openerFacts, setOpenerFacts] = useState("");

  const [selectedAction, setSelectedAction] = useState<
    "reengage" | "contact" | "date" | null
  >(null);

  const { showToast } = useAppToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ref для мгновенной блокировки двойного клика
  const isGeneratingRef = useRef(false);
  const isSavingRef = useRef(false);

  const isNewDialog = messages.length === 0;

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
          facts
        );
      }

      // 🔴 REPLY
      else {
        const action = selectedAction ?? "normal";

        res = await chatGenerate(
          conversationId,
          girlText || null,
          action
        );

        setDraftGirlReply("");
      }

      if (res.limit_reached) {
        setSuggestions([]);
        showToast("Генерации закончились. Купи пакет!", "error");
        onSubscribe?.();
      } else if (res.error) {
        setSuggestions([]);
        showToast("Не удалось сгенерировать ответ", "error");
      } else {
        setSuggestions(res.suggestions || []);
      }

      setOpenerFacts("");

      // Подтягиваем актуальную историю из БД
      await refreshConversation();

    } catch (err) {
      console.error(err);
      setSuggestions([]);
      showToast("Не удалось сгенерировать ответ", "error");
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
      await chatSave(conversationId, text, "user");
      setSuggestions([]);
      await refreshConversation();
    } catch (err) {
      console.error(err);
      showToast("Не удалось сохранить сообщение", "error");
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
    <div className="flex flex-col h-[100dvh] bg-[#0A0A0A]">

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-[#111111] border-b border-white/8">
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <button onClick={onBack} className="text-gray-400 text-sm">
            ← Назад
          </button>
          <span className="font-semibold text-white">{girlName}</span>
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
                  className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none placeholder:text-gray-600"
                  style={{ background: "#1E1E1E", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)" }}
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
                className="w-full min-h-[120px] px-6 py-5 rounded-3xl text-sm font-semibold leading-relaxed resize-none outline-none placeholder:text-red-400/40"
                style={{ background: "linear-gradient(135deg, #7F1D1D, #991B1B)", color: "#FFFFFF", border: "1px solid rgba(239,68,68,0.3)" }}
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
                className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none placeholder:text-gray-600"
                style={{ background: "#1E1E1E", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)" }}
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
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
              selectedAction === btn.action ? "text-white" : "text-gray-400"
            }`}
            style={{
              background: selectedAction === btn.action
                ? "linear-gradient(135deg, #EF4444, #F43F5E)"
                : "#1A1A1A",
            }}
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

      <div className="px-4 pb-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 rounded-2xl text-white font-semibold
                     shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #EF4444, #F43F5E)" }}
        >
          {generating ? "Генерирую..." : "Сделать шаг"}
        </button>
      </div>
    </div>
  );
};

export default ChatPage;