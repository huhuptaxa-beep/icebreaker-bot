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
import HeartAnalysis from "./HeartAnalysis";
import TutorialOverlay, { TutorialStep } from "@/components/ui/TutorialOverlay";
import CommandHeader from "./command-center/CommandHeader";
import MiniContext from "./command-center/MiniContext";
import GirlReplyInput from "./command-center/GirlReplyInput";
import WorkingZone from "./command-center/WorkingZone";
import BottomNavigation from "./command-center/BottomNavigation";

const HEART_MIN_DURATION = 1200;
const HEART_ANIMATION_DURATION = 500;
const HEART_HOLD_DURATION = 300;

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
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [analysisStatusText, setAnalysisStatusText] = useState("Анализирую её ответ");
  const [analysisDiffLabel, setAnalysisDiffLabel] = useState<string | null>(null);
  const [analysisFillPercent, setAnalysisFillPercent] = useState(0);
  const [analysisEmitParticles, setAnalysisEmitParticles] = useState(false);
  const analysisStartTimeRef = useRef(0);
  const analysisTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const analysisActiveRef = useRef(false);

  const isNewDialog = messages.length === 0;

  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem("tutorial_chat_done") !== "true";
  });

  const clearCopyToastTimers = () => {
    copyToastTimers.current.forEach(clearTimeout);
    copyToastTimers.current = [];
  };

  const clearAnalysisTimers = () => {
    analysisTimers.current.forEach(clearTimeout);
    analysisTimers.current = [];
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
  };

  const resetAnalysisOverlay = useCallback(() => {
    analysisActiveRef.current = false;
    setAnalysisVisible(false);
    setAnalysisDiffLabel(null);
    setAnalysisEmitParticles(false);
    setAnalysisStatusText("Анализирую её ответ");
  }, []);

  const scheduleAnalysisFinish = useCallback(() => {
    const elapsed = Date.now() - analysisStartTimeRef.current;
    const wait = Math.max(0, HEART_MIN_DURATION - elapsed);
    const timer = window.setTimeout(() => {
      resetAnalysisOverlay();
    }, wait);
    analysisTimers.current.push(timer);
  }, [resetAnalysisOverlay]);

  const startAnalysisOverlay = useCallback(
    (startValue: number) => {
      clearAnalysisTimers();
      analysisStartTimeRef.current = Date.now();
      analysisActiveRef.current = true;
      setAnalysisVisible(true);
      setAnalysisStatusText("Анализирую её ответ");
      setAnalysisDiffLabel(null);
      setAnalysisEmitParticles(false);
      setAnalysisFillPercent(startValue);
    },
    [clearAnalysisTimers]
  );

  const triggerAnalysisResult = useCallback(
    (startValue: number, endValue: number) => {
      if (!analysisActiveRef.current) return;
      const diff = Math.round(endValue - startValue);
      setAnalysisDiffLabel(
        diff === 0 ? null : `${diff > 0 ? "+" : ""}${diff} интерес`
      );
      setAnalysisEmitParticles(!prefersReducedMotion && diff > 0);
      const duration = prefersReducedMotion ? 0 : HEART_ANIMATION_DURATION;
      setAnalysisFillPercent(endValue);
      const statusTimer = window.setTimeout(() => {
        setAnalysisStatusText("Подбираю лучший ответ");
        setAnalysisDiffLabel(null);
        setAnalysisEmitParticles(false);
        const holdTimer = window.setTimeout(() => {
          scheduleAnalysisFinish();
        }, prefersReducedMotion ? 0 : HEART_HOLD_DURATION);
        analysisTimers.current.push(holdTimer);
      }, duration);
      analysisTimers.current.push(statusTimer);
    },
    [prefersReducedMotion, scheduleAnalysisFinish]
  );

  const abortAnalysisOverlay = useCallback(
    (message?: string) => {
      if (!analysisActiveRef.current) return;
      if (message) {
        setAnalysisStatusText(message);
      }
      const holdTimer = window.setTimeout(() => {
        scheduleAnalysisFinish();
      }, prefersReducedMotion ? 0 : 200);
      analysisTimers.current.push(holdTimer);
    },
    [prefersReducedMotion, scheduleAnalysisFinish]
  );

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
      clearAnalysisTimers();
      resetAnalysisOverlay();
    };
  }, [resetAnalysisOverlay]);

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

    const shouldShowAnalysis = !actionOverride;
    const startingInterest = currentInterest;
    if (shouldShowAnalysis) {
      startAnalysisOverlay(startingInterest);
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
        if (shouldShowAnalysis) {
          abortAnalysisOverlay("Недостаточно данных");
        }
      } else if (res.error) {
        setSuggestions([]);
        showToast("Не удалось сгенерировать ответ", "error");
        if (shouldShowAnalysis) {
          abortAnalysisOverlay("Не удалось проанализировать");
        }
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
          if (shouldShowAnalysis) {
            triggerAnalysisResult(oldInterest, newInterest);
          }
        } else if (shouldShowAnalysis) {
          triggerAnalysisResult(startingInterest, startingInterest);
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
      if (shouldShowAnalysis) {
        abortAnalysisOverlay("Не удалось проанализировать");
      }
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

  const lastMessage = messages[messages.length - 1];
  const formatRelativeTime = (timestamp?: string) => {
    if (!timestamp) return "только что";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return "только что";
    const diffMs = Date.now() - parsed.getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
  };

  const workingState: "analysis" | "suggestions" | "idle" = analysisVisible
    ? "analysis"
    : suggestions.length > 0
    ? "suggestions"
    : "idle";

  const headerCredits =
    freeRemaining !== null ? freeRemaining + (paidRemaining || 0) : paidRemaining ?? null;

  return (
    <div
      className="command-center-shell"
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #1A1A22 0%, #0E0E12 60%, #0A0A0D 100%)" }}
    >
      <CommandHeader
        girlName={girlName}
        interest={currentInterest}
        onPrev={onBack}
        lastSource={currentChannel === "telegram" ? "Telegram" : "Приложение"}
        lastTimeAgo={formatRelativeTime(lastMessage?.created_at)}
        momentumLabel={null}
        credits={headerCredits}
        balancePulse={balancePulse}
        balanceDeltaLabel={balanceDeltaLabel}
      />

      <div className="command-center-body" ref={scrollRef}>
        <MiniContext messages={messages} onOpenHistory={() => {}} />

        <GirlReplyInput
          value={draftGirlReply}
          onChange={setDraftGirlReply}
          onPaste={handleTextareaPaste}
          pasteLabel={pasteLabel}
          disabled={generating}
        />

        <div className="command-working" ref={suggestionsRef}>
          <WorkingZone
            state={workingState}
            analysis={
              <HeartAnalysis
                percent={analysisFillPercent}
                statusText={analysisStatusText}
                diffLabel={analysisDiffLabel}
                emitParticles={analysisEmitParticles}
                prefersReducedMotion={prefersReducedMotion}
              />
            }
            suggestions={
              <SuggestionsPanel
                suggestions={suggestions}
                onSelect={handleSelectSuggestion}
                loading={generating}
                prefersReducedMotion={prefersReducedMotion}
              />
            }
            idle={
              <div className="working-zone-idle">
                <p className="working-zone-idle-title">Готов к анализу</p>
                <p className="working-zone-idle-text">
                  Вставь её ответ или опиши ситуацию, чтобы подобрать следующий шаг.
                </p>
              </div>
            }
          />
        </div>
      </div>

      <BottomNavigation
        onDialogs={onBack}
        onAction={() => handleGenerate()}
        onProfile={() => {}}
        actionDisabled={!canGenerate || generating}
        actionLoading={generating}
      />

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
