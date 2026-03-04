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
import PhaseProgressBar from "@/components/ui/PhaseProgressBar";

const haptic = (type: "light" | "medium" | "heavy" = "medium") => {
  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg?.impactOccurred) {
      tg.impactOccurred(type);
    }
  } catch { }
};

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
  const [currentInterest, setCurrentInterest] = useState<number>(5);
  const [currentChannel, setCurrentChannel] = useState<string>("app");
  const [confirmResult, setConfirmResult] = useState<{
    type: "telegram_success" | "telegram_fail" | "date_success" | "date_fail";
  } | null>(null);
  const [interestDelta, setInterestDelta] = useState<number | null>(null);
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [paidRemaining, setPaidRemaining] = useState<number | null>(null);

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
    } catch { }
  };

  const refreshConversation = async () => {
    const data = await getConversation(conversationId);
    setGirlName(data.girl_name || "Чат");
    setMessages(data.messages || []);
    setCurrentChannel(data.channel || "app");
    if (data.phase) setCurrentPhase(data.phase);
    if (data.channel === "telegram" && data.phase === 3) {
      const lastMsg = (data.messages || [])[data.messages.length - 1];
      if (!lastMsg || lastMsg.role !== "user") {
        setShowTelegramStart(true);
      }
    }
    setCurrentInterest(data.effective_interest || 5);
  };

  useEffect(() => {
    refreshConversation().catch(() => { });
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  /* ================= GENERATE ================= */

  const handleGenerate = async (actionOverride?: "date" | "contact" | "reengage" | "telegram_first") => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    haptic("medium");

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
        if (res.interest !== undefined) {
          const oldInterest = currentInterest;
          const newInterest = res.interest;
          const diff = Math.round(newInterest - oldInterest);
          setCurrentInterest(newInterest);
          if (diff !== 0) {
            setInterestDelta(diff);
            setTimeout(() => setInterestDelta(null), 1600);
          }
        }

        if (res.free_remaining !== undefined) setFreeRemaining(res.free_remaining);
        if (res.paid_remaining !== undefined) setPaidRemaining(res.paid_remaining);

        if (res.showDisinterestWarning) {
          showToast("Она не в настроении - смени тему", "warning");
        }

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

    haptic("light");

    try {
      for (const text of suggestion) {
        await chatSave(conversationId, text, "user");
      }

      setSuggestions([]);
      setAvailableActions([]);
      await refreshConversation();
    } catch (err) {
      console.error(err);
      showToast("Не удалось сохранить сообщение", "error");
    } finally {
      isSavingRef.current = false;
    }
  };

  const canGenerate = (() => {
    if (generating) return false;
    if (isNewDialog) return !!(openerFacts.trim() || draftGirlReply.trim());
    if (showTelegramStart) return false;
    const lastMsg = messages[messages.length - 1];
    const hasUnansweredGirl = lastMsg?.role === "girl";
    return !!(draftGirlReply.trim() || hasUnansweredGirl);
  })();

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: "#050505" }}>

      {/* ========== HEADER ========== */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "rgba(5, 5, 5, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "0.5px solid rgba(200, 200, 220, 0.06)",
        }}
      >
        <div className="flex items-center gap-3 px-5 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <button
            onClick={onBack}
            className="text-sm flex-shrink-0 font-medium transition-colors"
            style={{ color: "rgba(200, 200, 220, 0.4)" }}
          >
            ← Назад
          </button>
          <span
            className="font-semibold flex-shrink-0 truncate"
            style={{
              maxWidth: "40%",
              color: "rgba(255, 255, 255, 0.9)",
              letterSpacing: "0.01em",
            }}
          >
            {girlName}
          </span>
          {freeRemaining !== null && (
            <span
              className="text-[10px] font-bold flex-shrink-0 px-2 py-1 rounded-lg"
              style={{
                background: "rgba(212, 175, 55, 0.08)",
                border: "0.5px solid rgba(212, 175, 55, 0.15)",
                color: (freeRemaining + (paidRemaining || 0)) > 3
                  ? "rgba(212, 175, 55, 0.6)"
                  : "#FF4466",
              }}
            >
              ★ {freeRemaining + (paidRemaining || 0)}
            </span>
          )}
          <PhaseProgressBar
            interest={currentInterest}
            size="large"
            delta={interestDelta}
          />
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
      >
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id}>
            {/* Telegram separator */}
            {currentChannel === "telegram" && index === 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)" }} />
                <span className="text-[11px] font-medium" style={{ color: "rgba(59,130,246,0.5)" }}>
                  📱 Telegram
                </span>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)" }} />
              </div>
            )}
            <MessageBubble text={msg.text} role={msg.role} />
          </React.Fragment>
        ))}

        {isNewDialog && (
          <>
            <div className="flex flex-col items-center py-8">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(212, 175, 55, 0.06)",
                  border: "0.5px solid rgba(212, 175, 55, 0.15)",
                }}
              >
                <span className="text-3xl">💬</span>
              </div>
              <p className="text-white/90 font-semibold text-base mb-1">Начни переписку</p>
              <p
                className="text-xs text-center leading-relaxed px-4"
                style={{ color: "rgba(200, 200, 220, 0.35)" }}
              >
                Опиши девушку и получи идеальное первое сообщение
              </p>
            </div>

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
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      color: "#FFFFFF",
                      border: "0.5px solid rgba(200, 200, 220, 0.08)",
                      backdropFilter: "blur(10px)",
                    }}
                  />
                </div>
                <button
                  onClick={handleTextareaPaste}
                  className="relative z-0 text-xs rounded-bl-lg transition-colors font-medium"
                  style={{
                    display: "block",
                    width: "40%",
                    height: 34,
                    marginTop: -16,
                    paddingTop: 18,
                    paddingBottom: 4,
                    background: "rgba(20, 20, 25, 0.8)",
                    color: "rgba(200, 200, 220, 0.3)",
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
                className="w-full min-h-[120px] px-6 py-5 rounded-3xl text-sm font-semibold leading-relaxed resize-none outline-none"
                style={{
                  background: "rgba(212, 175, 55, 0.04)",
                  color: "#FFFFFF",
                  border: "0.5px solid rgba(212, 175, 55, 0.15)",
                  backdropFilter: "blur(10px)",
                }}
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
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "#FFFFFF",
                    border: "0.5px solid rgba(200, 200, 220, 0.08)",
                    backdropFilter: "blur(10px)",
                  }}
                />
              </div>
              <button
                onClick={handleTextareaPaste}
                className="relative z-0 text-xs rounded-bl-lg transition-colors font-medium"
                style={{
                  display: "block",
                  width: "40%",
                  height: 34,
                  marginTop: -16,
                  paddingTop: 18,
                  paddingBottom: 4,
                  background: "rgba(20, 20, 25, 0.8)",
                  color: "rgba(200, 200, 220, 0.3)",
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
        <div className="px-5 py-6 flex flex-col items-center gap-3">
          <p className="text-sm text-center" style={{ color: "rgba(200, 200, 220, 0.4)" }}>
            Отлично. Теперь закрепи позицию первым сообщением.
          </p>
          <button
            onClick={() => {
              handleGenerate("telegram_first");
              setShowTelegramStart(false);
            }}
            className="w-full text-white text-base font-semibold active:scale-[0.97] transition-transform"
            style={{
              background: "linear-gradient(90deg, #3A6FF8, #5A8CFF)",
              borderRadius: 22,
              boxShadow: "0 10px 30px rgba(90,140,255,0.25)",
              padding: "14px 0",
              border: "none",
            }}
          >
            💬 Написать в Telegram
          </button>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {availableActions.length > 0 && !generating && !pendingAction && (
        <div className="px-5 py-2 flex gap-2">
          {availableActions.includes("contact") && (
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[12px] text-center" style={{ color: "rgba(200, 200, 220, 0.3)" }}>
                AI определил момент для сближения
              </p>
              <button
                onClick={() => handleGenerate("contact")}
                className="w-full py-2.5 rounded-2xl text-sm font-medium"
                style={{
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "0.5px solid rgba(80,140,255,0.25)",
                  color: "#8FB4FF",
                }}
              >
                📱 Взять Telegram
              </button>
            </div>
          )}
          {availableActions.includes("date") && (
            <div className="flex-1 flex flex-col gap-1.5">
              <button
                onClick={() => handleGenerate("date")}
                className="w-full py-2.5 rounded-2xl text-sm font-medium"
                style={{
                  background: "rgba(34,197,94,0.06)",
                  color: "#4ADE80",
                  border: "0.5px solid rgba(34,197,94,0.2)",
                }}
              >
                ☕ Позвать на свидание
              </button>
            </div>
          )}
          {availableActions.includes("reengage") && (
            <div className="flex-1 flex flex-col gap-1.5">
              <button
                onClick={() => handleGenerate("reengage")}
                className="w-full py-2.5 rounded-2xl text-sm font-medium"
                style={{
                  background: "rgba(212, 175, 55, 0.06)",
                  color: "#D4AF37",
                  border: "0.5px solid rgba(212, 175, 55, 0.2)",
                }}
              >
                🔥 Написать ей
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION RESULT CARD */}
      {confirmResult && (
        <div className="px-5 py-3 animate-fadeIn">
          {confirmResult.type === "telegram_success" && (
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(212, 175, 55, 0.06)",
                border: "0.5px solid rgba(212, 175, 55, 0.2)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "#D4AF37" }}>
                ✅ Telegram получен
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(212, 175, 55, 0.5)" }}>
                AI рекомендует закрепить контакт
              </p>
            </div>
          )}
          {confirmResult.type === "telegram_fail" && (
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(255, 68, 102, 0.06)",
                border: "0.5px solid rgba(255, 68, 102, 0.2)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "#FF4466" }}>
                ❌ Контакт не получен
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255, 68, 102, 0.5)" }}>
                AI пересчитает стратегию
              </p>
            </div>
          )}
          {confirmResult.type === "date_success" && (
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(212, 175, 55, 0.06)",
                border: "0.5px solid rgba(212, 175, 55, 0.2)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "#D4AF37" }}>
                🎉 Свидание назначено
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(212, 175, 55, 0.5)" }}>
                Удачи!
              </p>
            </div>
          )}
          {confirmResult.type === "date_fail" && (
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(255, 68, 102, 0.06)",
                border: "0.5px solid rgba(255, 68, 102, 0.2)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "#FF4466" }}>
                ❌ Отказала
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255, 68, 102, 0.5)" }}>
                AI пересчитает стратегию
              </p>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION BUTTONS - TELEGRAM */}
      {pendingAction === "contact" && !generating && !confirmResult && (
        <div className="px-5 py-2 flex gap-2">
          <button
            onClick={async () => {
              haptic("heavy");
              try {
                await confirmAction(conversationId, "telegram_success");
                setSuggestions([]);
                setPendingAction(null);
                setCurrentPhase(3);
                setCurrentInterest(prev => Math.max(prev, 40));
                setShowTelegramStart(true);
                setConfirmResult({ type: "telegram_success" });
                setTimeout(() => setConfirmResult(null), 3000);
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{
              background: "rgba(212, 175, 55, 0.1)",
              color: "#D4AF37",
              border: "0.5px solid rgba(212, 175, 55, 0.3)",
              borderRadius: 18,
            }}
          >
            ✅ Telegram получен
          </button>
          <button
            onClick={async () => {
              haptic("light");
              try {
                await confirmAction(conversationId, "telegram_fail");
                setSuggestions([]);
                setPendingAction(null);
                setConfirmResult({ type: "telegram_fail" });
                setTimeout(() => setConfirmResult(null), 3000);
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              color: "rgba(200, 200, 220, 0.4)",
              border: "0.5px solid rgba(200, 200, 220, 0.08)",
              borderRadius: 18,
            }}
          >
            ❌ Не дала
          </button>
        </div>
      )}

      {/* CONFIRMATION BUTTONS - DATE */}
      {pendingAction === "date" && !generating && !confirmResult && (
        <div className="px-5 py-2 flex gap-2">
          <button
            onClick={async () => {
              haptic("heavy");
              try {
                await confirmAction(conversationId, "date_success");
                setSuggestions([]);
                setPendingAction(null);
                setCurrentPhase(5);
                setCurrentInterest(100);
                setConfirmResult({ type: "date_success" });
                setTimeout(() => setConfirmResult(null), 3000);
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{
              background: "rgba(34,197,94,0.1)",
              color: "#4ADE80",
              border: "0.5px solid rgba(34,197,94,0.25)",
              borderRadius: 18,
            }}
          >
            ✅ Она согласилась
          </button>
          <button
            onClick={async () => {
              haptic("light");
              try {
                await confirmAction(conversationId, "date_fail");
                setSuggestions([]);
                setPendingAction(null);
                setConfirmResult({ type: "date_fail" });
                setTimeout(() => setConfirmResult(null), 3000);
              } catch (err) {
                console.error(err);
                showToast("Ошибка подтверждения", "error");
              }
            }}
            className="flex-1 py-2.5 text-sm font-semibold"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              color: "rgba(200, 200, 220, 0.4)",
              border: "0.5px solid rgba(200, 200, 220, 0.08)",
              borderRadius: 18,
            }}
          >
            ❌ Отказала
          </button>
        </div>
      )}

      {/* ========== MAIN CTA — Premium Gold ========== */}
      {!showTelegramStart && (
        <div className="px-5 pb-5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
          <button
            id="btn-generate"
            onClick={() => handleGenerate()}
            disabled={generating || !canGenerate}
            className="w-full py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-all"
            style={{
              background: generating
                ? "rgba(255, 255, 255, 0.04)"
                : canGenerate
                  ? "linear-gradient(135deg, #AD8B3A, #D4AF37, #F9E076)"
                  : "rgba(255, 255, 255, 0.03)",
              color: generating
                ? "rgba(200, 200, 220, 0.3)"
                : canGenerate
                  ? "#050505"
                  : "rgba(200, 200, 220, 0.2)",
              boxShadow: canGenerate && !generating
                ? "0 0 20px rgba(212, 175, 55, 0.4), 0 8px 30px rgba(212, 175, 55, 0.25)"
                : "none",
              border: generating
                ? "0.5px solid rgba(200, 200, 220, 0.06)"
                : canGenerate
                  ? "none"
                  : "0.5px solid rgba(200, 200, 220, 0.06)",
              letterSpacing: "0.02em",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {generating ? "Анализирую..." : canGenerate ? "Сделать шаг" : "Вставь её ответ"}
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