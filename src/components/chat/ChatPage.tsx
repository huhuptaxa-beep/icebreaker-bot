import React, { useState, useRef, useEffect } from "react";
import {
  Message,
  chatGenerate,
  chatSave,
  getConversation,
  confirmAction,
} from "@/api/chatApi";
import { useAppToast } from "@/components/ui/AppToast";
import MessageBubble from "./MessageBubble";
import SuggestionsPanel from "./SuggestionsPanel";
import TutorialOverlay, { TutorialStep } from "@/components/ui/TutorialOverlay";

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
  const [suggestions, setSuggestions] = useState<string[][]>([]);
  const [generating, setGenerating] = useState(false);
  const [girlName, setGirlName] = useState<string>("Чат");

  const [draftGirlReply, setDraftGirlReply] = useState("");
  const [openerFacts, setOpenerFacts] = useState("");

  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<"contact" | "date" | null>(null);
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [showTelegramStart, setShowTelegramStart] = useState(false);

  const { showToast } = useAppToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isGeneratingRef = useRef(false);
  const isSavingRef = useRef(false);

  const [pasteLabel, setPasteLabel] = useState<string | null>(null);

  const isNewDialog = messages.length === 0;

  const [showTutorial, setShowTutorial] = useState(
    () => localStorage.getItem("tutorial_chat_done") !== "true"
  );

  const CHAT_TUTORIAL_STEPS: TutorialStep[] = [
    { targetId: "field-facts", text: "Опиши девушку: хобби, интересы, факты\nиз описания, детали фото.\nЧем больше напишешь — тем лучше", position: "top" },
    { targetId: "field-girl-message", text: "Если она написала первая —\nвставь её сообщение сюда", position: "top" },
    { targetId: "btn-generate", text: "Нажми и получи 3 варианта сообщений", position: "top" },
    { text: "Я подскажу когда взять контакт\nили позвать на свидание.\nУдачи! 🔥", position: "top" },
  ];

  const handleTextareaPaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setDraftGirlReply(clipText);
        setPasteLabel("Вставлено ✓");
        setTimeout(() => setPasteLabel(null), 1500);
      }
    } catch {}
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

  const handleGenerate = async (actionOverride?: "date" | "contact" | "reengage") => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    const facts = openerFacts.trim();
    const girlText = draftGirlReply.trim();

    const lastMsg = messages[messages.length - 1];
    const hasUnansweredGirl = lastMsg?.role === "girl";

    if (!facts && !girlText && !hasUnansweredGirl && !actionOverride) {
      isGeneratingRef.current = false;
      return;
    }

    setGenerating(true);
    setSuggestions([]);
    setAvailableActions([]);

    try {
      let res;

      if (facts && !actionOverride) {
        res = await chatGenerate(
          conversationId,
          null,
          "opener",
          facts
        );
      } else {
        const action = actionOverride ?? "normal";

        res = await chatGenerate(
          conversationId,
          girlText || null,
          action,
          undefined
        );

        if (!actionOverride) setDraftGirlReply("");
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
        setAvailableActions(res.available_actions || []);
        if (res.phase) setCurrentPhase(res.phase);

        // Если пользователь нажал contact/date - устанавливаем pendingAction
        if (actionOverride === "contact") setPendingAction("contact");
        if (actionOverride === "date") setPendingAction("date");
      }

      setOpenerFacts("");
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

  const handleSelectSuggestion = async (suggestion: string[]) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      // Save all messages in the suggestion sequentially
      for (const text of suggestion) {
        await chatSave(conversationId, text, "user");
      }

      setSuggestions([]);
      setAvailableActions([]);
      // НЕ сбрасываем pendingAction - оно должно остаться для кнопок подтверждения
      await refreshConversation();
    } catch (err) {
      console.error(err);
      showToast("Не удалось сохранить сообщение", "error");
    } finally {
      isSavingRef.current = false;
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
                <div className="relative z-10">
                  <textarea
                    value={draftGirlReply}
                    onChange={(e) =>
                      setDraftGirlReply(e.target.value)
                    }
                    id="field-girl-message"
                    placeholder="Вставь её сообщение, если написала первая"
                    className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none placeholder:text-gray-600"
                    style={{ background: "#1E1E1E", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <button
                  onClick={handleTextareaPaste}
                  className="relative z-0 text-xs rounded-bl-lg transition-colors"
                  style={{
                    display: "block",
                    width: "40%",
                    height: 34,
                    marginTop: -16,
                    paddingTop: 18,
                    paddingBottom: 4,
                    background: "#161616",
                    color: "rgba(255,255,255,0.45)",
                    textAlign: "left",
                    paddingLeft: 10,
                    clipPath: "polygon(0% 0%, 100% 0%, 80% 100%, 0% 100%)",
                  }}
                >
                  {pasteLabel ?? "Вставить"}
                </button>
              </div>
            </div>

            <div className="w-full">
              <textarea
                value={openerFacts}
                onChange={(e) =>
                  setOpenerFacts(e.target.value)
                }
                id="field-facts"
                placeholder="Напиши факты о девушке..."
                className="w-full min-h-[120px] px-6 py-5 rounded-3xl text-sm font-semibold leading-relaxed resize-none outline-none placeholder:text-red-400/40"
                style={{ background: "linear-gradient(135deg, #7F1D1D, #991B1B)", color: "#FFFFFF", border: "1px solid rgba(239,68,68,0.3)" }}
              />
            </div>
          </>
        )}

        {!isNewDialog && !showTelegramStart && (
          <div className="flex">
            <div className="max-w-[70%]">
              <div className="relative z-10">
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
              <button
                onClick={handleTextareaPaste}
                className="relative z-0 text-xs rounded-bl-lg transition-colors"
                style={{
                  display: "block",
                  width: "40%",
                  height: 34,
                  marginTop: -16,
                  paddingTop: 18,
                  paddingBottom: 4,
                  background: "#161616",
                  color: "rgba(255,255,255,0.45)",
                  textAlign: "left",
                  paddingLeft: 10,
                  clipPath: "polygon(0% 0%, 100% 0%, 80% 100%, 0% 100%)",
                }}
              >
                {pasteLabel ?? "Вставить"}
              </button>
            </div>
          </div>
        )}
      </div>

      <SuggestionsPanel
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
        loading={generating}
      />

      {/* TELEGRAM START BUTTON */}
      {showTelegramStart && suggestions.length === 0 && !generating && (
        <div className="px-4 py-6 flex flex-col items-center gap-3">
          <p className="text-gray-400 text-sm text-center">
            Отлично! Теперь напиши ей первое сообщение в Telegram
          </p>
          <button
            onClick={() => {
              handleGenerate("reengage");
              setShowTelegramStart(false);
            }}
            className="w-full py-3.5 rounded-2xl text-white text-base font-semibold"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
          >
            💬 Написать в Telegram
          </button>
        </div>
      )}

      {/* ACTION BUTTONS (скрываем если есть pendingAction) */}
      {availableActions.length > 0 && !generating && !pendingAction && (
        <div className="px-4 py-2 flex gap-2">
          {availableActions.includes("contact") && (
            <button
              onClick={() => handleGenerate("contact")}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              📱 Взять Telegram
            </button>
          )}
          {availableActions.includes("date") && (
            <button
              onClick={() => handleGenerate("date")}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "rgba(34,197,94,0.15)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              ☕ Позвать на свидание
            </button>
          )}
          {availableActions.includes("reengage") && (
            <button
              onClick={() => handleGenerate("reengage")}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.3)" }}
            >
              🔥 Написать ей
            </button>
          )}
        </div>
      )}

      {/* CONFIRMATION BUTTONS - TELEGRAM */}
      {pendingAction === "contact" && !generating && (
        <div className="px-4 py-2 flex gap-2">
          <button
            onClick={async () => {
              try {
                await confirmAction(conversationId, "telegram_success");
                setPendingAction(null);
                setCurrentPhase(3);
                setShowTelegramStart(true);
                showToast("Отлично! Переходим в Telegram", "success");
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(251,191,36,0.2)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }}
          >
            ✅ Telegram получен
          </button>
          <button
            onClick={async () => {
              try {
                await confirmAction(conversationId, "telegram_fail");
                setPendingAction(null);
                showToast("Ничего, продолжаем", "info");
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "#1A1A1A", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            ❌ Не дала
          </button>
        </div>
      )}

      {/* CONFIRMATION BUTTONS - DATE */}
      {pendingAction === "date" && !generating && (
        <div className="px-4 py-2 flex gap-2">
          <button
            onClick={async () => {
              try {
                await confirmAction(conversationId, "date_success");
                setPendingAction(null);
                setCurrentPhase(5);
                showToast("Поздравляю! Свидание назначено 🎉", "success");
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(34,197,94,0.2)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.4)" }}
          >
            ✅ Она согласилась
          </button>
          <button
            onClick={async () => {
              try {
                await confirmAction(conversationId, "date_fail");
                setPendingAction(null);
                showToast("Не страшно, продолжаем", "info");
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "#1A1A1A", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            ❌ Отказала
          </button>
        </div>
      )}

      {!showTelegramStart && (
        <div className="px-4 pb-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button
            id="btn-generate"
            onClick={() => handleGenerate()}
            disabled={generating}
            className="w-full py-3 rounded-2xl text-white font-semibold
                       shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #EF4444, #F43F5E)" }}
          >
            {generating ? "Генерирую..." : "Сделать шаг"}
          </button>
        </div>
      )}

      {showTutorial && isNewDialog && (
        <TutorialOverlay
          steps={CHAT_TUTORIAL_STEPS}
          storageKey="tutorial_chat_done"
          onComplete={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;