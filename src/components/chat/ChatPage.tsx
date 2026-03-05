import React, { useState, useRef, useEffect, useCallback } from "react";
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

const PASTE_PROGRESS_GAIN = 2;

const haptic = (type: "light" | "medium" | "heavy" = "medium") => {
  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg?.impactOccurred) {
      tg.impactOccurred(type);
    }
  } catch {}
};

interface ChatPageProps {
  conversationId: string;
  onBack: () => void;
  onSubscribe?: () => void;
}

type ProgressChipPhase = "initial" | "enter" | "fly";
interface ProgressChipState {
  value: number;
  label?: string;
  phase: ProgressChipPhase;
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
  const [pendingAction, setPendingAction] = useState<"contact" | "date" | null>(
    null
  );
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
  const [copyToast, setCopyToast] = useState<{
    message: string;
    tone: "success" | "error";
    phase: "intro" | "visible" | "outro";
  } | null>(null);
  const [copyFlashMap, setCopyFlashMap] = useState<Record<string, boolean>>({});
  const [newMessageAnimationMap, setNewMessageAnimationMap] = useState<
    Record<string, boolean>
  >({});

  const copyToastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const copyFlashTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const newMessageTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const progressChipTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const interestTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingPasteRewardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [goldToastMessage, setGoldToastMessage] = useState<string | null>(null);
  const goldToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [progressChip, setProgressChip] = useState<ProgressChipState | null>(
    null
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [balancePulse, setBalancePulse] = useState(false);
  const [balanceDeltaLabel, setBalanceDeltaLabel] = useState<string | null>(
    null
  );
  const balancePulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ single declarations (duplicates removed)
  const [contactToastVisible, setContactToastVisible] = useState(false);
  const contactToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const telegramCardRef = useRef<HTMLDivElement | null>(null);
  const contactSelectorRef = useRef<HTMLDivElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showActionHint, setShowActionHint] = useState(false);
  const pendingScrollTarget = useRef<HTMLElement | null>(null);
  const actionBlockVisibilityRef = useRef({
    suggestions: false,
    telegramCard: false,
    contactSelector: false,
  });

  const isNewDialog = messages.length === 0;

  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem("tutorial_chat_done") !== "true";
  });

  const clearCopyToastTimers = () => {
    copyToastTimers.current.forEach(clearTimeout);
    copyToastTimers.current = [];
  };

  const TOAST_TRANSITION_IN = 200;
  const TOAST_TRANSITION_OUT = 260;
  const TOAST_VISIBLE_MS = 1200;

  const triggerCopyToast = (
    message = "✓ Скопировано",
    tone: "success" | "error" = "success"
  ) => {
    clearCopyToastTimers();
    setCopyToast({ message, tone, phase: "intro" });

    const toVisible = setTimeout(() => {
      setCopyToast((prev) => (prev ? { ...prev, phase: "visible" } : null));
    }, TOAST_TRANSITION_IN);

    const toExit = setTimeout(() => {
      setCopyToast((prev) => (prev ? { ...prev, phase: "outro" } : null));
    }, TOAST_VISIBLE_MS);

    const removeToast = setTimeout(() => {
      setCopyToast(null);
    }, TOAST_VISIBLE_MS + TOAST_TRANSITION_OUT);

    copyToastTimers.current.push(toVisible, toExit, removeToast);
  };

  const markCopyFlash = (ids: string[]) => {
    const lastId = ids[ids.length - 1];
    if (!lastId) return;
    setCopyFlashMap((prev) => ({ ...prev, [lastId]: true }));
    const timeout = setTimeout(() => {
      setCopyFlashMap((prev) => {
        const next = { ...prev };
        delete next[lastId];
        return next;
      });
    }, 1200);
    copyFlashTimeouts.current.push(timeout);
  };

  const markNewMessageAnimation = (ids: string[], fromSuggestion = false) => {
    if (!ids.length) return;
    setNewMessageAnimationMap((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
    const duration = prefersReducedMotion ? 0 : fromSuggestion ? 260 : 600;
    const timeout = setTimeout(() => {
      setNewMessageAnimationMap((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          delete next[id];
        });
        return next;
      });
    }, duration);
    newMessageTimeouts.current.push(timeout);
  };

  const triggerProgressChip = (value: number, label?: string) => {
    if (value <= 0 && !label) return;
    if (prefersReducedMotion) {
      setProgressChip({ value, label, phase: "enter" });
      const remove = window.setTimeout(() => setProgressChip(null), 900);
      progressChipTimers.current.push(remove);
      return;
    }
    setProgressChip({ value, label, phase: "initial" });
    const enterTimer = window.setTimeout(() => {
      setProgressChip((prev) => (prev ? { ...prev, phase: "enter" } : prev));
    }, 140);
    const flyTimer = window.setTimeout(() => {
      setProgressChip((prev) => (prev ? { ...prev, phase: "fly" } : prev));
    }, 380);
    const removeTimer = window.setTimeout(() => setProgressChip(null), 720);
    progressChipTimers.current.push(enterTimer, flyTimer, removeTimer);
  };

  const triggerContactToast = () => {
    if (contactToastTimer.current) {
      clearTimeout(contactToastTimer.current);
    }
    setContactToastVisible(true);
    contactToastTimer.current = setTimeout(() => {
      setContactToastVisible(false);
      contactToastTimer.current = null;
    }, 1000);
  };

  const triggerBalancePulse = (amount: number) => {
    if (balancePulseTimer.current) {
      clearTimeout(balancePulseTimer.current);
    }
    setBalancePulse(true);
    setBalanceDeltaLabel(amount > 0 ? `+${amount}` : "+1");
    balancePulseTimer.current = window.setTimeout(() => {
      setBalancePulse(false);
      setBalanceDeltaLabel(null);
      balancePulseTimer.current = null;
    }, 1000);
  };

  const triggerGoldToast = (message = "Ответ учтён") => {
    if (goldToastTimer.current) {
      clearTimeout(goldToastTimer.current);
    }
    setGoldToastMessage(message);
    goldToastTimer.current = window.setTimeout(() => {
      setGoldToastMessage(null);
      goldToastTimer.current = null;
    }, 1000);
  };

  const triggerPasteReward = () => {
    triggerGoldToast("Ответ учтён");
    triggerBalancePulse(1);

    if (pendingPasteRewardRef.current) {
      clearTimeout(pendingPasteRewardRef.current);
      pendingPasteRewardRef.current = null;
    }

    const timer = window.setTimeout(() => {
      setCurrentInterest((prev) => {
        const target = Math.min(prev + PASTE_PROGRESS_GAIN, 100);
        const appliedDiff = target - prev;
        if (appliedDiff > 0) {
          setInterestDelta(appliedDiff);
          const clearDelta = window.setTimeout(
            () => setInterestDelta(null),
            prefersReducedMotion ? 0 : 1500
          );
          interestTimers.current.push(clearDelta);
          triggerProgressChip(appliedDiff);
        } else {
          triggerProgressChip(0, "%");
        }
        return target;
      });
      pendingPasteRewardRef.current = null;
    }, prefersReducedMotion ? 0 : 120);

    pendingPasteRewardRef.current = timer;
    interestTimers.current.push(timer);
  };

  const getProgressChipStyle = (phase: ProgressChipPhase) => {
    if (prefersReducedMotion) {
      return {
        opacity: 1,
        transform: "translate(-2px, -16px)",
        transition: "none",
      };
    }
    const presets: Record<
      ProgressChipPhase,
      { opacity: number; transform: string }
    > = {
      initial: { opacity: 0, transform: "translate(-6px, -6px) scale(0.85)" },
      enter: { opacity: 1, transform: "translate(-2px, -18px) scale(1)" },
      fly: { opacity: 0, transform: "translate(26px, -26px) scale(0.6)" },
    };
    return {
      ...presets[phase],
      transition: "opacity 200ms ease, transform 340ms cubic-bezier(0.25, 0.9, 0.3, 1.1)",
    };
  };

  const CHAT_TUTORIAL_STEPS: TutorialStep[] = [
    {
      targetId: "field-facts",
      text: "Опиши девушку: хобби, интересы, факты\nиз описания, детали фото.\nЧем больше напишешь — тем лучше",
      position: "top",
    },
    {
      targetId: "field-girl-message",
      text: "Если она написала первая —\nвставь её сообщение сюда",
      position: "top",
    },
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
        triggerPasteReward();
      }
    } catch {}
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
    refreshConversation().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    return () => {
      copyFlashTimeouts.current.forEach(clearTimeout);
      newMessageTimeouts.current.forEach(clearTimeout);
      progressChipTimers.current.forEach(clearTimeout);
      interestTimers.current.forEach(clearTimeout);
      clearCopyToastTimers();
      if (contactToastTimer.current) {
        clearTimeout(contactToastTimer.current);
        contactToastTimer.current = null;
      }
      if (balancePulseTimer.current) {
        clearTimeout(balancePulseTimer.current);
        balancePulseTimer.current = null;
      }
      if (goldToastTimer.current) {
        clearTimeout(goldToastTimer.current);
        goldToastTimer.current = null;
      }
      if (pendingPasteRewardRef.current) {
        clearTimeout(pendingPasteRewardRef.current);
        pendingPasteRewardRef.current = null;
      }
    };
  }, []);

  const updateNearBottom = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
    setIsNearBottom(distance <= 200);
  }, []);

  const scrollToElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
      });
    },
    [prefersReducedMotion]
  );

  const focusActionBlock = useCallback(
    (ref: { current: HTMLElement | null }) => {
      if (typeof window === "undefined") return;
      window.requestAnimationFrame(() => {
        const node = ref.current;
        if (!node) return;
        pendingScrollTarget.current = node;
        if (isNearBottom) {
          scrollToElement(node);
          setShowActionHint(false);
        } else {
          setShowActionHint(true);
        }
      });
    },
    [isNearBottom, scrollToElement]
  );

  const handleActionHintClick = useCallback(() => {
    if (pendingScrollTarget.current) {
      scrollToElement(pendingScrollTarget.current);
    }
    setShowActionHint(false);
  }, [scrollToElement]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => updateNearBottom();
    el.addEventListener("scroll", handler, { passive: true });
    updateNearBottom();
    return () => {
      el.removeEventListener("scroll", handler);
    };
  }, [updateNearBottom]);

  useEffect(() => {
    if (isNearBottom) setShowActionHint(false);
  }, [isNearBottom]);

  useEffect(() => {
    const visibility = {
      suggestions: suggestions.length > 0,
      telegramCard: showTelegramStart && suggestions.length === 0 && !generating,
      contactSelector: pendingAction === "contact" && !generating && !confirmResult,
    };

    const refMap = {
      suggestions: suggestionsRef,
      telegramCard: telegramCardRef,
      contactSelector: contactSelectorRef,
    };

    (Object.keys(visibility) as Array<keyof typeof visibility>).forEach((key) => {
      if (visibility[key] && !actionBlockVisibilityRef.current[key]) {
        focusActionBlock(refMap[key]);
      }
    });

    const anyVisible = Object.values(visibility).some(Boolean);
    if (!anyVisible) {
      pendingScrollTarget.current = null;
      setShowActionHint(false);
    }

    actionBlockVisibilityRef.current = visibility;
  }, [
    suggestions.length,
    showTelegramStart,
    generating,
    pendingAction,
    confirmResult,
    focusActionBlock,
  ]);

  /* ================= GENERATE ================= */

  const handleGenerate = async (
    actionOverride?: "date" | "contact" | "reengage" | "telegram_first"
  ) => {
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
      let res: any;

      if (facts && !actionOverride) {
        res = await chatGenerate(conversationId, null, "opener", facts);
      } else {
        const action = actionOverride ?? "normal";
        res = await chatGenerate(conversationId, girlText || null, action, undefined);
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

    const createdAt = new Date().toISOString();
    const localBatch = suggestion.map((text, index) => ({
      id: `temp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: conversationId,
      role: "user" as const,
      text,
      created_at: createdAt,
    })) as Message[];

    if (localBatch.length) {
      setMessages((prev) => [...prev, ...localBatch]);
      markNewMessageAnimation(
        localBatch.map((item) => item.id),
        true
      );
    }

    setSuggestions([]);
    setAvailableActions([]);

    const combined = suggestion.join("\n\n").trim();
    if (combined) {
      try {
        await navigator.clipboard.writeText(combined);
        markCopyFlash(localBatch.map((item) => item.id));
        triggerCopyToast();
      } catch (err) {
        console.error(err);
        triggerCopyToast("Не удалось скопировать. Скопируй вручную", "error");
      }
    }

    try {
      for (const text of suggestion) {
        await chatSave(conversationId, text, "user");
      }
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

  const hasContactAction = availableActions.includes("contact");
  const secondaryActions = availableActions.filter((action) => action !== "contact");

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
        <div
          className="flex items-center gap-3 px-5 py-3 w-full overflow-hidden"
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
            className="font-semibold flex-1 min-w-0 text-center truncate"
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              letterSpacing: "0.01em",
            }}
          >
            {girlName}
          </span>

          <div className="flex items-center gap-2 flex-shrink-0" style={{ minHeight: 32 }}>
            {freeRemaining !== null && (
              <div className="relative flex-shrink-0">
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1"
                  style={{
                    background: balancePulse
                      ? "linear-gradient(135deg, rgba(212, 175, 55, 0.35), rgba(212, 175, 55, 0.12))"
                      : "rgba(212, 175, 55, 0.08)",
                    border: balancePulse
                      ? "0.5px solid rgba(212, 175, 55, 0.55)"
                      : "0.5px solid rgba(212, 175, 55, 0.15)",
                    color: "rgba(255, 255, 255, 0.85)",
                    boxShadow: balancePulse ? "0 8px 24px rgba(212, 175, 55, 0.35)" : "none",
                    transform: balancePulse ? "scale(1.08)" : "scale(1)",
                    transition: prefersReducedMotion
                      ? "none"
                      : "transform 260ms ease, box-shadow 260ms ease, background 260ms ease",
                  }}
                >
                  ★ {freeRemaining + (paidRemaining || 0)}
                </span>
                {balanceDeltaLabel && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      position: "absolute",
                      right: -4,
                      top: -12,
                      background: "rgba(245, 208, 126, 0.95)",
                      color: "#1A1305",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                    }}
                  >
                    {balanceDeltaLabel} баллов
                  </span>
                )}
              </div>
            )}

            <div className="relative flex-shrink-0" style={{ maxWidth: 140 }}>
              <PhaseProgressBar
                interest={currentInterest}
                size="large"
                delta={interestDelta}
                prefersReducedMotion={prefersReducedMotion}
              />
              {progressChip && (
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: -4,
                    background: "rgba(212, 175, 55, 0.95)",
                    color: "#050505",
                    letterSpacing: "0.05em",
                    pointerEvents: "none",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
                    ...getProgressChipStyle(progressChip.phase),
                  }}
                >
                  +{progressChip.label ?? `${progressChip.value}%`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id}>
            {currentChannel === "telegram" && index === 0 && (
              <div className="flex items-center gap-3 py-2">
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)",
                  }}
                />
                <span className="text-[11px] font-medium" style={{ color: "rgba(59,130,246,0.5)" }}>
                  Telegram
                </span>
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)",
                  }}
                />
              </div>
            )}
            <MessageBubble
              text={msg.text}
              role={msg.role}
              copiedRecently={!!copyFlashMap[msg.id]}
              animateEntry={!!newMessageAnimationMap[msg.id]}
              prefersReducedMotion={prefersReducedMotion}
            />
          </React.Fragment>
        ))}

        {isNewDialog && (
          <>
            <div className="flex flex-col items-center py-6 space-y-2">
              <p className="text-white/90 font-semibold text-base">Начни переписку</p>
              <p
                className="text-xs text-center leading-relaxed px-4"
                style={{ color: "rgba(200, 200, 220, 0.5)" }}
              >
                Опиши девушку и получи идеальное первое сообщение
              </p>
            </div>

            <div className="flex">
              <div className="max-w-[70%]">
                <div className="relative z-10">
                  <textarea
                    value={draftGirlReply}
                    onChange={(e) => setDraftGirlReply(e.target.value)}
                    id="field-girl-message"
                    placeholder="Вставь её сообщение, если написала первая"
                    className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none placeholder:text-[rgba(200,200,220,0.4)]"
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
                  className="relative z-0 text-xs rounded-bl-lg transition-colors font-semibold"
                  style={{
                    display: "block",
                    width: "40%",
                    height: 34,
                    marginTop: -16,
                    paddingTop: 18,
                    paddingBottom: 4,
                    background: "rgba(20, 20, 25, 0.8)",
                    color: "rgba(212, 175, 55, 0.5)",
                    textAlign: "left",
                    paddingLeft: 10,
                    clipPath: "polygon(0% 0%, 100% 0%, 80% 100%, 0% 100%)",
                    border: "none",
                    borderLeft: "0.5px solid rgba(212, 175, 55, 0.15)",
                  }}
                >
                  {pasteLabel ?? "Вставить"}
                </button>
              </div>
            </div>

            <div className="w-full">
              <textarea
                value={openerFacts}
                onChange={(e) => setOpenerFacts(e.target.value)}
                id="field-facts"
                placeholder="Напиши факты о девушке: хобби, интересы, детали фото..."
                className="w-full min-h-[120px] px-6 py-5 rounded-3xl text-sm font-semibold leading-relaxed resize-none outline-none placeholder:text-[rgba(212,175,55,0.35)]"
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
                  onChange={(e) => setDraftGirlReply(e.target.value)}
                  placeholder="Вставь её ответ..."
                  className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none placeholder:text-[rgba(200,200,220,0.4)]"
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
                className="relative z-0 text-xs rounded-bl-lg transition-colors font-semibold"
                style={{
                  display: "block",
                  width: "40%",
                  height: 34,
                  marginTop: -16,
                  paddingTop: 18,
                  paddingBottom: 4,
                  background: "rgba(20, 20, 25, 0.8)",
                  color: "rgba(212, 175, 55, 0.5)",
                  textAlign: "left",
                  paddingLeft: 10,
                  clipPath: "polygon(0% 0%, 100% 0%, 80% 100%, 0% 100%)",
                  border: "none",
                  borderLeft: "0.5px solid rgba(212, 175, 55, 0.15)",
                }}
              >
                {pasteLabel ?? "Вставить"}
              </button>
            </div>
          </div>
        )}
      </div>

      {hasContactAction && !generating && !pendingAction && (
        <div className="px-5 pt-2 pb-4">
          <div
            className="rounded-2xl px-5 py-4 flex flex-col gap-3"
            style={{
              background: "rgba(18, 18, 24, 0.95)",
              border: "0.5px solid rgba(212, 175, 55, 0.2)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            }}
          >
            <p
              className="text-base font-semibold text-center"
              style={{ color: "rgba(255, 255, 255, 0.95)", letterSpacing: "0.02em" }}
            >
              Момент для сближения
            </p>
            <button
              onClick={() => handleGenerate("contact")}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-transform"
              style={{
                background: "linear-gradient(135deg, #AD8B3A, #D4AF37, #F9E076)",
                color: "#050505",
                border: "none",
                boxShadow: "0 10px 28px rgba(212, 175, 55, 0.35)",
              }}
            >
              Взять Telegram
            </button>
          </div>
        </div>
      )}

      <div ref={suggestionsRef}>
        <SuggestionsPanel
          suggestions={suggestions}
          onSelect={handleSelectSuggestion}
          loading={generating}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>

      {copyToast && (
        <div
          className="fixed left-1/2 copy-toast px-4 py-2 rounded-full text-[13px] font-semibold pointer-events-none select-none"
          data-phase={copyToast.phase}
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 96px)",
            zIndex: 60,
            color:
              copyToast.tone === "error"
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(255, 255, 255, 0.92)",
            background:
              copyToast.tone === "error"
                ? "rgba(90, 25, 25, 0.88)"
                : "rgba(30, 30, 38, 0.9)",
            border:
              copyToast.tone === "error"
                ? "1px solid rgba(255, 99, 132, 0.35)"
                : "1px solid rgba(212, 175, 55, 0.25)",
            boxShadow:
              copyToast.tone === "error"
                ? "0 14px 32px rgba(255, 99, 132, 0.25)"
                : "0 16px 36px rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            transform: "translateX(-50%)",
          }}
        >
          {copyToast.message}
        </div>
      )}

      {contactToastVisible && (
        <div
          className="fixed left-1/2 px-4 py-2 rounded-full text-[12px] font-semibold pointer-events-none select-none"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 64px)",
            transform: "translateX(-50%)",
            background: "rgba(20, 20, 24, 0.9)",
            border: "0.5px solid rgba(212, 175, 55, 0.25)",
            color: "rgba(255, 255, 255, 0.9)",
            boxShadow: "0 14px 35px rgba(0,0,0,0.45)",
            zIndex: 70,
          }}
        >
          Контакт получен
        </div>
      )}

      {goldToastMessage && (
        <div
          className="fixed left-1/2 px-4 py-2 rounded-full text-[12px] font-semibold pointer-events-none select-none"
          style={{
            top: "calc(env(safe-area-inset-top) + 60px)",
            transform: "translateX(-50%)",
            background: "rgba(28, 22, 12, 0.92)",
            border: "0.5px solid rgba(212, 175, 55, 0.35)",
            color: "rgba(255, 247, 231, 0.92)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
            zIndex: 75,
          }}
        >
          {goldToastMessage}
        </div>
      )}

      {showActionHint && (
        <div
          className="fixed left-1/2 z-60"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 96px)",
            transform: "translateX(-50%)",
          }}
        >
          <button
            onClick={handleActionHintClick}
            className="px-4 py-2 rounded-full text-xs font-semibold shadow-lg active:scale-95 transition-transform"
            style={{
              background: "rgba(15, 15, 20, 0.92)",
              border: "0.5px solid rgba(212, 175, 55, 0.35)",
              color: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            ⬇︎ К действиям
          </button>
        </div>
      )}

      {/* TELEGRAM START BUTTON */}
      {showTelegramStart && suggestions.length === 0 && !generating && (
        <div className="px-5 py-6" ref={telegramCardRef}>
          <div
            className="rounded-3xl px-5 py-5 flex flex-col gap-3"
            style={{
              background: "rgba(15, 15, 20, 0.92)",
              border: "0.5px solid rgba(212, 175, 55, 0.15)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
            }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "rgba(212, 175, 55, 0.55)" }}
            >
              Следующий шаг
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-white font-semibold text-base">Сгенерировать первое сообщение</p>
              <p className="text-sm" style={{ color: "rgba(200, 200, 220, 0.5)" }}>
                AI подготовит вступление, чтобы плавно уйти в Telegram.
              </p>
            </div>
            <button
              onClick={() => {
                handleGenerate("telegram_first");
                setShowTelegramStart(false);
              }}
              className="w-full py-3 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-transform"
              style={{
                background: "linear-gradient(135deg, #AD8B3A, #D4AF37, #F9E076)",
                color: "#050505",
                border: "none",
                boxShadow: "0 0 18px rgba(212, 175, 55, 0.35)",
              }}
            >
              Сгенерировать первое сообщение
            </button>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {secondaryActions.length > 0 && !generating && !pendingAction && (
        <div className="px-5 py-2 flex gap-2">
          {secondaryActions.includes("date") && (
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
                Позвать на свидание
              </button>
            </div>
          )}
          {secondaryActions.includes("reengage") && (
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
                Написать ей
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
                Telegram получен
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
                background: "rgba(200, 200, 220, 0.04)",
                border: "0.5px solid rgba(200, 200, 220, 0.15)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "rgba(200, 200, 220, 0.7)" }}>
                Контакт не получен
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(200, 200, 220, 0.4)" }}>
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
                Свидание назначено
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
                background: "rgba(200, 200, 220, 0.04)",
                border: "0.5px solid rgba(200, 200, 220, 0.15)",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "rgba(200, 200, 220, 0.7)" }}>
                Отказала
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(200, 200, 220, 0.4)" }}>
                AI пересчитает стратегию
              </p>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION BUTTONS - TELEGRAM */}
      {pendingAction === "contact" && !generating && !confirmResult && (
        <div className="px-5 py-2 flex flex-col gap-3" ref={contactSelectorRef}>
          <p
            className="text-sm font-semibold text-center"
            style={{ color: "rgba(255, 255, 255, 0.85)", letterSpacing: "0.015em" }}
          >
            Удалось взять Telegram?
          </p>

          <div
            className="flex rounded-2xl overflow-hidden"
            style={{
              border: "0.5px solid rgba(245, 208, 126, 0.35)",
              background: "linear-gradient(135deg, rgba(22, 22, 28, 0.95), rgba(32, 32, 40, 0.92))",
              boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
            }}
          >
            <button
              onClick={async () => {
                haptic("heavy");
                try {
                  await confirmAction(conversationId, "telegram_success");
                  setSuggestions([]);
                  setPendingAction(null);
                  setCurrentPhase(3);

                  const nextInterest = Math.max(currentInterest, 40);
                  const diff = Math.round(nextInterest - currentInterest);
                  const gain = diff > 0 ? diff : 5;

                  if (diff !== 0) triggerProgressChip(diff);
                  triggerBalancePulse(gain);

                  const barDelay = prefersReducedMotion ? 0 : 120;
                  const interestTimer = window.setTimeout(() => {
                    setCurrentInterest((prev) => {
                      const target = Math.max(prev, 40);
                      const appliedDiff = Math.round(target - prev);
                      if (appliedDiff !== 0) {
                        setInterestDelta(appliedDiff);
                        const clearDelta = window.setTimeout(
                          () => setInterestDelta(null),
                          prefersReducedMotion ? 0 : 1500
                        );
                        interestTimers.current.push(clearDelta);
                      }
                      return target;
                    });
                  }, barDelay);

                  interestTimers.current.push(interestTimer);

                  setShowTelegramStart(true);
                  setConfirmResult({ type: "telegram_success" });
                  triggerContactToast();
                  setTimeout(() => setConfirmResult(null), 3000);
                } catch (err) {
                  console.error(err);
                  showToast("Ошибка подтверждения", "error");
                }
              }}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={{
                background: "linear-gradient(145deg, rgba(245, 208, 126, 0.5), rgba(212, 175, 55, 0.28))",
                color: "#1A1305",
                borderRight: "0.5px solid rgba(245, 208, 126, 0.4)",
              }}
            >
              Telegram получен
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
              className="flex-1 py-3 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(32, 32, 40, 0.85), rgba(18, 18, 24, 0.92))",
                color: "rgba(220, 224, 236, 0.75)",
                boxShadow: "inset -6px 0 14px rgba(255,255,255,0.04)",
                borderLeft: "0.5px solid rgba(255, 255, 255, 0.08)",
                backgroundImage:
                  "linear-gradient(135deg, rgba(32,32,40,0.88), rgba(18,18,24,0.94)), linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.08))",
                backgroundBlendMode: "normal, screen",
              }}
            >
              Пока нет
            </button>
          </div>
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
            Она согласилась
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
            Отказала
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
              boxShadow:
                canGenerate && !generating
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
