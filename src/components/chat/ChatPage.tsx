import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Message,
  chatGenerate,
  chatSave,
  getConversation,
  confirmAction,
} from "@/api/chatApi";
import { useAppToast } from "@/components/ui/AppToast";
import SuggestionsPanel from "./SuggestionsPanel";
import TutorialOverlay, { TutorialStep } from "@/components/ui/TutorialOverlay";
import CommandHeader from "./command-center/CommandHeader";
import MiniContext from "./command-center/MiniContext";
import GirlReplyInput from "./command-center/GirlReplyInput";
import WorkingZone from "./command-center/WorkingZone";

const haptic = (type: "light" | "medium" | "heavy" = "medium") => {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (style: string) => void } } } }).Telegram?.WebApp?.HapticFeedback;
    if (tg?.impactOccurred) {
      tg.impactOccurred(type);
    }
  } catch (_e) {
    // Ignore haptic feedback errors
  }
};

interface ChatPageProps {
  conversationId: string;
  onBack: () => void;
  onSubscribe?: () => void;
  onPrevConversation?: () => void;
  onNextConversation?: () => void;
  onOpenHistory: (payload: { conversationId: string; girlName: string; messages: Message[] }) => void;
  onActionStateChange?: (state: { generating: boolean; canGenerate: boolean }) => void;
  onActionNudgeChange?: (nudge: boolean) => void;
}

export interface ChatPageHandle {
  triggerGenerate: () => void;
}

type ProgressChipPhase = "initial" | "enter" | "fly";
interface ProgressChipState {
  value: number;
  label?: string;
  phase: ProgressChipPhase;
}

const ChatPage = forwardRef<ChatPageHandle, ChatPageProps>((
  {
    conversationId,
    onBack,
    onSubscribe,
    onPrevConversation,
    onNextConversation,
    onOpenHistory,
    onActionStateChange,
    onActionNudgeChange,
  },
  ref
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[][]>([]);
  const [openerVariantIds, setOpenerVariantIds] = useState<Array<string | null>>([]);
  const [generating, setGenerating] = useState(false);
  const [girlName, setGirlName] = useState<string>("Чат");

  const [draftGirlReply, setDraftGirlReply] = useState("");

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
  const pendingPasteRewardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [goldToastMessage, setGoldToastMessage] = useState<string | null>(null);
  const goldToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [progressChip, setProgressChip] = useState<ProgressChipState | null>(
    null
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showActionNudge, setShowActionNudge] = useState(false);
  const actionNudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [balancePulse, setBalancePulse] = useState(false);
  const [balanceDeltaLabel, setBalanceDeltaLabel] = useState<string | null>(
    null
  );
  const balancePulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef(conversationId);
  const currentInterestRef = useRef(currentInterest);

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
  const [generationPhase, setGenerationPhase] = useState<"idle" | "thinking" | "scoring" | "suggestions">("idle");
  const [scoringInfo, setScoringInfo] = useState<{ start: number; end: number; diff: number }>({
    start: 0,
    end: 0,
    diff: 0,
  });
  const [scoringProgress, setScoringProgress] = useState(0);
  const generationTimers = useRef<Array<NodeJS.Timeout>>([]);
  const scoringAnimationRef = useRef<number | null>(null);

  const isNewConversation = messages.length === 0;
  const hasStaleConversation = (() => {
    const lastMessageTimestamp = messages.length > 0 ? messages[messages.length - 1]?.created_at : null;
    if (!lastMessageTimestamp) return false;
    const timestamp = Date.parse(lastMessageTimestamp);
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp >= 10 * 60 * 60 * 1000;
  })();

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
  };

  useEffect(() => {
    const hasText = draftGirlReply.trim().length > 0;
    if (hasText) {
      if (!actionNudgeTimer.current && !showActionNudge) {
        actionNudgeTimer.current = window.setTimeout(() => {
          setShowActionNudge(true);
          actionNudgeTimer.current = null;
        }, 1200);
      }
    } else {
      setShowActionNudge(false);
      if (actionNudgeTimer.current) {
        clearTimeout(actionNudgeTimer.current);
        actionNudgeTimer.current = null;
      }
    }
  }, [draftGirlReply, showActionNudge]);

  useEffect(() => {
    onActionNudgeChange?.(showActionNudge);
  }, [showActionNudge, onActionNudgeChange]);

  const clearGenerationTimeline = useCallback(() => {
    generationTimers.current.forEach(clearTimeout);
    generationTimers.current = [];
  }, []);

  const stopScoringAnimation = useCallback(() => {
    if (scoringAnimationRef.current) {
      cancelAnimationFrame(scoringAnimationRef.current);
      scoringAnimationRef.current = null;
    }
  }, []);

  const resetGenerationFlow = useCallback(() => {
    clearGenerationTimeline();
    stopScoringAnimation();
    setGenerationPhase("idle");
    setScoringProgress(0);
    setScoringInfo({
      start: currentInterestRef.current,
      end: currentInterestRef.current,
      diff: 0,
    });
  }, [clearGenerationTimeline, stopScoringAnimation]);

  const animateInterestIncrease = useCallback(
    (startValue: number, endValue: number, duration = 2000) => {
      stopScoringAnimation();
      const startTime = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const currentValue = startValue + (endValue - startValue) * progress;
        setCurrentInterest(Math.round(currentValue));
        setScoringProgress(progress * 100);
        if (progress < 1) {
          scoringAnimationRef.current = requestAnimationFrame(step);
        } else {
          scoringAnimationRef.current = null;
          currentInterestRef.current = Math.round(endValue);
        }
      };
      scoringAnimationRef.current = requestAnimationFrame(step);
    },
    [stopScoringAnimation]
  );

  const beginScoringPhase = useCallback(() => {
    const startValue = currentInterestRef.current;
    const increase = Math.floor(Math.random() * 4) + 3;
    const endValue = Math.min(100, startValue + increase);
    setScoringInfo({ start: startValue, end: endValue, diff: endValue - startValue });
    setGenerationPhase("scoring");
    setScoringProgress(0);
    animateInterestIncrease(startValue, endValue);
    const scoringTimer = window.setTimeout(() => {
      setGenerationPhase("suggestions");
    }, 2000);
    generationTimers.current.push(scoringTimer);
  }, [animateInterestIncrease]);

  const triggerGenerationTimeline = useCallback((isNewConversation: boolean) => {
    clearGenerationTimeline();
    setScoringInfo({
      start: currentInterestRef.current,
      end: currentInterestRef.current,
      diff: 0,
    });
    setScoringProgress(0);
    setGenerationPhase("thinking");
    const thinkingTimer = window.setTimeout(() => {
      if (isNewConversation) {
        setGenerationPhase("suggestions");
      } else {
        beginScoringPhase();
      }
    }, 1000);
    generationTimers.current.push(thinkingTimer);
  }, [beginScoringPhase, clearGenerationTimeline]);

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
    const applyPastedText = (text: string) => {
      if (!text) return;
      setDraftGirlReply(text);
      setPasteLabel("Вставлено ✓");
      setTimeout(() => setPasteLabel(null), 1500);
      triggerPasteReward();
    };

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          applyPastedText(clipText);
          return;
        }
      }
    } catch (error) {
      console.warn("Clipboard API blocked, using fallback", error);
    }

    if (typeof document === "undefined") return;

    const hiddenInput = document.createElement("textarea");
    hiddenInput.style.position = "fixed";
    hiddenInput.style.opacity = "0";
    hiddenInput.style.pointerEvents = "none";
    hiddenInput.style.top = "0";
    hiddenInput.style.left = "0";

    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text") ?? "";
      if (text) {
        applyPastedText(text);
      }
      cleanup();
    };

    function cleanup() {
      hiddenInput.removeEventListener("paste", handlePaste);
      hiddenInput.removeEventListener("blur", cleanup);
      if (hiddenInput.parentNode) {
        hiddenInput.parentNode.removeChild(hiddenInput);
      }
    }

    hiddenInput.addEventListener("paste", handlePaste);
    hiddenInput.addEventListener("blur", cleanup);

    document.body.appendChild(hiddenInput);
    hiddenInput.focus();
    hiddenInput.select();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    resetGenerationFlow();
  }, [conversationId, resetGenerationFlow]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    currentInterestRef.current = currentInterest;
  }, [currentInterest]);

  useEffect(() => {
    return () => {
      clearGenerationTimeline();
      stopScoringAnimation();
    };
  }, [clearGenerationTimeline, stopScoringAnimation]);

  useEffect(() => {
    if (generationPhase === "idle") {
      stopScoringAnimation();
      setScoringProgress(0);
    }
  }, [generationPhase, stopScoringAnimation]);

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
      clearCopyToastTimers();
      if (actionNudgeTimer.current) {
        clearTimeout(actionNudgeTimer.current);
        actionNudgeTimer.current = null;
      }
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
      clearGenerationTimeline();
      stopScoringAnimation();
    };
  }, [clearGenerationTimeline, stopScoringAnimation]);

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
    setShowActionNudge(false);
    if (actionNudgeTimer.current) {
      clearTimeout(actionNudgeTimer.current);
      actionNudgeTimer.current = null;
    }

    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    haptic("medium");

    const girlText = draftGirlReply.trim();

    const lastMsg = messages[messages.length - 1];
    const hasUnansweredGirl = lastMsg?.role === "girl";
    const requiresInput = isNewConversation ? girlText.length > 0 : girlText.length > 0 || hasUnansweredGirl;

    if (!requiresInput && !actionOverride) {
      isGeneratingRef.current = false;
      return;
    }

    const shouldRunPhases = !actionOverride;
    if (shouldRunPhases) {
      triggerGenerationTimeline(isNewConversation);
    } else {
      resetGenerationFlow();
    }

    setGenerating(true);
    setSuggestions([]);
    setOpenerVariantIds([]);
    setAvailableActions([]);

    try {
      let res: {
        limit_reached?: boolean;
        error?: string;
        suggestions?: string[][];
        opener_variant_ids?: Array<string | null>;
        available_actions?: string[];
        interest?: number;
        free_remaining?: number;
        paid_remaining?: number;
        showDisinterestWarning?: boolean;
        phase?: number;
        telegram_channel_id?: string;
      };

      const shouldPersistGirlMessage = !isNewConversation && !actionOverride && girlText.length > 0;
      if (shouldPersistGirlMessage) {
        console.log("CHAT FLOW DEBUG: saving girl message before generate", {
          conversation_id: conversationIdRef.current,
          role: "girl",
          selected_text: girlText,
        });
        const savedGirlMessage = await chatSave(conversationIdRef.current, girlText, "girl");
        console.log("CHAT FLOW DEBUG: girl message saved", savedGirlMessage);
        await refreshConversation();
      }

      if (isNewConversation && !actionOverride) {
        res = await chatGenerate(conversationIdRef.current, null, "opener", girlText);
        setDraftGirlReply("");
      } else {
        const action = actionOverride ?? "normal";
        res = await chatGenerate(conversationIdRef.current, null, action, undefined);
        if (!actionOverride) setDraftGirlReply("");
      }

      if (res.limit_reached) {
        setSuggestions([]);
        setOpenerVariantIds([]);
        setGenerating(false);
        showToast("Генерации закончились. Купи пакет!", "error");
        onSubscribe?.();
        resetGenerationFlow();
      } else if (res.error) {
        setSuggestions([]);
        setOpenerVariantIds([]);
        setGenerating(false);
        showToast("Не удалось сгенерировать ответ", "error");
        resetGenerationFlow();
      } else {
        const nextSuggestions = res.suggestions || [];
        const nextOpenerVariantIds = nextSuggestions.map((_: string[], idx: number) => {
          const rawId = res.opener_variant_ids?.[idx];
          return typeof rawId === "string" ? rawId : null;
        });
        console.log("RAW AVAILABLE ACTIONS RESPONSE", res.available_actions || []);

        setTimeout(() => {
          setSuggestions(nextSuggestions);
          setOpenerVariantIds(nextOpenerVariantIds);
          setGenerating(false);
        }, 200);
        setAvailableActions(res.available_actions || []);
        if (res.phase) setCurrentPhase(res.phase);

        if (res.interest !== undefined) {
          setCurrentInterest(res.interest);
        }

        if (res.free_remaining !== undefined) setFreeRemaining(res.free_remaining);
        if (res.paid_remaining !== undefined) setPaidRemaining(res.paid_remaining);

        if (res.showDisinterestWarning) {
          showToast("Она не в настроении - смени тему", "error"); // ToastType only has success/error/default? Let's assume error or change tone. Warning is not valid ToastType
        }

        if (actionOverride === "contact") setPendingAction("contact");
        if (actionOverride === "date") setPendingAction("date");
      }

      await refreshConversation();
    } catch (err) {
      console.error(err);
      setSuggestions([]);
      setOpenerVariantIds([]);
      setGenerating(false);
      showToast("Не удалось сгенерировать ответ", "error");
      resetGenerationFlow();
    } finally {
      isGeneratingRef.current = false;
    }
  };

  /* ================= SELECT SUGGESTION ================= */

  const handleSelectSuggestion = async (suggestion: string[], suggestionIndex: number) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    haptic("light");
    const selectedOpenerVariantId = openerVariantIds[suggestionIndex] ?? null;
    console.log("OPENER SELECT DEBUG", {
      selectedIndex: suggestionIndex,
      selectedSuggestion: suggestion,
      selectedOpenerVariantId,
      openerVariantIds,
    });

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
    setOpenerVariantIds([]);
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
      for (let i = 0; i < suggestion.length; i++) {
        const text = suggestion[i];
        await chatSave(conversationId, text, "user", i === 0 ? selectedOpenerVariantId : null);
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
    if (showTelegramStart) return false;
    const trimmedText = draftGirlReply.trim();
    if (isNewConversation) return trimmedText.length > 0;
    const lastMsg = messages[messages.length - 1];
    const hasUnansweredGirl = lastMsg?.role === "girl";
    return !!(trimmedText || hasUnansweredGirl);
  })();

  useEffect(() => {
    onActionStateChange?.({ generating, canGenerate });
  }, [generating, canGenerate, onActionStateChange]);

  const workingState: "analysis" | "suggestions" | "idle" | "action" = pendingAction
    ? "action"
    : generating
      ? "analysis"
      : suggestions.length > 0
        ? "suggestions"
        : "idle";

  const renderedSuggestionActionButtons: Array<"contact" | "date"> =
    suggestions.length > 0
      ? [
          ...(availableActions.includes("contact") ? (["contact"] as const) : []),
          ...(availableActions.includes("date") ? (["date"] as const) : []),
        ]
      : [];

  useEffect(() => {
    console.log("ACTION BUTTONS RENDER DEBUG", {
      availableActions,
      renderedActionButtons: renderedSuggestionActionButtons,
      pendingAction,
      generating,
      suggestionsCount: suggestions.length,
      workingState,
    });
  }, [availableActions, renderedSuggestionActionButtons, pendingAction, generating, suggestions.length, workingState]);

  const handleHistoryOpen = useCallback(() => {
    onOpenHistory({
      conversationId,
      girlName,
      messages,
    });
  }, [conversationId, girlName, messages, onOpenHistory]);

  const handleHistoryCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleHistoryOpen();
    }
  };

  const renderAnalysisContent = () => {
    if (generationPhase === "thinking") {
      return (
        <div className="ai-analysis-card">
          <p className="ai-thinking-text">AI анализирует сообщение</p>
          <div className="ai-thinking-shimmer" />
        </div>
      );
    }
    if (generationPhase === "scoring") {
      const progressWidth = Math.min(100, Math.max(12, scoringProgress));
      const diffLabel =
        scoringInfo.diff > 0 ? `+${scoringInfo.diff}% интерес` : "Интерес на пике";
      return (
        <div className="ai-progress-wrapper">
          <p className="ai-progress-title">AI оценивает интерес девушки</p>
          <div className="ai-progress">
            <div className="ai-progress-fill" style={{ width: `${progressWidth}%` }} />
          </div>
          <p className="ai-progress-diff">{diffLabel}</p>
        </div>
      );
    }
    return null;
  };

  useImperativeHandle(ref, () => ({
    triggerGenerate: () => {
      handleGenerate();
    },
  }));

  const idleTitle = isNewConversation
    ? "Опиши девушку или ситуацию"
    : showActionNudge
      ? "Готов подобрать ответ"
      : "Вставь сообщение девушки";

  const idleSubtitle = isNewConversation
    ? "Нажми ⚡ чтобы получить первое сообщение"
    : showActionNudge
      ? "AI готов подобрать ответ ⚡"
      : "AI готов подобрать ответ ⚡";

  const inputLabel = isNewConversation ? "Описание девушки" : "Ответ девушки";
  const inputPlaceholder = isNewConversation ? "Введи 1-3 факта о ней..." : "Вставь сообщение...";
  const showPasteButton = !isNewConversation;

  const isIdleState = workingState === "idle";
  const isAiScanActive = generating && isIdleState;
  const showRewarmEntry = hasStaleConversation && suggestions.length === 0 && !generating;

  return (
    <div
      className="command-center-shell"
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #1A1A22 0%, #0E0E12 60%, #0A0A0D 100%)" }}
    >
      <CommandHeader
        disabled={generating}
        girlName={girlName}
        interest={currentInterest}
        onPrev={onBack}
        onPrevConversation={onPrevConversation}
        onNextConversation={onNextConversation}
      />

      <div className="command-center-body" ref={scrollRef}>
        <GirlReplyInput
          value={draftGirlReply}
          onChange={setDraftGirlReply}
          onPaste={showPasteButton ? handleTextareaPaste : undefined}
          pasteLabel={pasteLabel}
          disabled={generating}
          label={inputLabel}
          placeholder={inputPlaceholder}
          showPasteButton={showPasteButton}
        />

        <div
          className="chat-preview"
          role="button"
          tabIndex={0}
          onClick={handleHistoryOpen}
          onKeyDown={handleHistoryCardKeyDown}
        >
          <div className="chat-label">
            <span>Ч</span>
            <span>А</span>
            <span>Т</span>
          </div>
          <MiniContext messages={messages} />
        </div>

        <div className={`command-working${isAiScanActive ? " ai-scan" : ""}`} ref={suggestionsRef}>
          <WorkingZone
            state={workingState}
            analysis={renderAnalysisContent()}
            suggestions={
              <SuggestionsPanel
                suggestions={suggestions}
                onSelect={handleSelectSuggestion}
                loading={generating}
                prefersReducedMotion={prefersReducedMotion}
                actionButtons={renderedSuggestionActionButtons.map((action) => ({
                  key: action,
                  label: action === "contact" ? "Взять Telegram" : "Пригласить на свидание",
                  onClick: () => {
                    console.log("ACTION BUTTON CLICK", {
                      action,
                      availableActions,
                    });
                    setPendingAction(action);
                  },
                }))}
              />
            }
            idle={
              <div className={`working-zone-idle${generating ? " working-zone-idle-loading" : ""}`}>
                <p className="working-zone-idle-title">{idleTitle}</p>
                {idleSubtitle && <p className="working-zone-idle-text">{idleSubtitle}</p>}
                {showRewarmEntry && (
                  <div className="rewarm-entry">
                    <button
                      type="button"
                      className="rewarm-entry-button"
                      onClick={() => {
                        console.log("REWARM BUTTON CLICK", {
                          conversation_id: conversationIdRef.current,
                          action_type: "reengage",
                        });
                        handleGenerate("reengage");
                      }}
                      disabled={generating}
                    >
                      Возобновить диалог
                    </button>
                  </div>
                )}
              </div>
            }
            action={
              pendingAction === "contact" ? (
                <div className="command-contact-selector" ref={contactSelectorRef}>
                  <p>Удалось взять Telegram?</p>
                  <div className="command-contact-buttons">
                    <button
                      onClick={async () => {
                        haptic("heavy");
                        try {
                          await confirmAction(conversationId, "telegram_success");
                          setSuggestions([]);
                          setOpenerVariantIds([]);
                          setPendingAction(null);
                          setCurrentPhase(3);
                          triggerBalancePulse(5);
                          setShowTelegramStart(true);
                          setConfirmResult({ type: "telegram_success" });
                          triggerContactToast();
                          setTimeout(() => setConfirmResult(null), 3000);
                        } catch (err) {
                          console.error(err);
                          showToast("Ошибка подтверждения", "error");
                        }
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
                          setOpenerVariantIds([]);
                          setPendingAction(null);
                          setConfirmResult({ type: "telegram_fail" });
                          setTimeout(() => setConfirmResult(null), 3000);
                        } catch (err) {
                          console.error(err);
                          showToast("Ошибка подтверждения", "error");
                        }
                      }}
                    >
                      Пока нет
                    </button>
                  </div>
                </div>
              ) : pendingAction === "date" ? (
                <div className="command-date-selector">
                  <button
                    onClick={async () => {
                      haptic("heavy");
                      try {
                        await confirmAction(conversationId, "date_success");
                        setSuggestions([]);
                        setOpenerVariantIds([]);
                        setPendingAction(null);
                        setCurrentPhase(5);
                        setConfirmResult({ type: "date_success" });
                        setTimeout(() => setConfirmResult(null), 3000);
                      } catch (err) {
                        console.error(err);
                        showToast("Ошибка подтверждения", "error");
                      }
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
                        setOpenerVariantIds([]);
                        setPendingAction(null);
                        setConfirmResult({ type: "date_fail" });
                        setTimeout(() => setConfirmResult(null), 3000);
                      } catch (err) {
                        console.error(err);
                        showToast("Ошибка подтверждения", "error");
                      }
                    }}
                  >
                    Отказала
                  </button>
                </div>
              ) : null
            }
          />
        </div>
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

      {showTutorial && isNewConversation && (
        <TutorialOverlay
          steps={CHAT_TUTORIAL_STEPS}
          storageKey="tutorial_chat_done"
          onComplete={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
});

export default ChatPage;
