import React, { useState, useEffect, useCallback, useRef } from "react";

export interface TutorialStep {
  targetId?: string;
  text: string;
  position: "top" | "bottom";
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  storageKey: string;
  onComplete: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const RADIUS = 16;

const STYLE_IDS = ["style-bold", "style-romantic", "style-badguy"];
const STYLE_TEXTS = [
  "Дерзкий — режим провокатора",
  "Романтик — нежный и чувственный",
  "Bad guy — для совсем наглых 😈",
];

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  storageKey,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const [arrowVisible, setArrowVisible] = useState(false);
  const prevTargetIdRef = useRef<string | undefined>(undefined);

  const [styleIndex, setStyleIndex] = useState(0);
  const [styleRect, setStyleRect] = useState<TargetRect | null>(null);
  const styleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isStyleAnimated = step?.targetId === "style-animated";

  const isFactsStep = step?.targetId === "field-facts";
  const isGirlStep = step?.targetId === "field-girl-message";
  const isFinalCenterStep = !step?.targetId;

  /* ================= TARGET MEASURE ================= */

  const measureTarget = useCallback(() => {
    if (isStyleAnimated) {
      const tabsEl = document.getElementById("style-tabs");
      if (tabsEl) {
        const r = tabsEl.getBoundingClientRect();
        setTargetRect({
          top: r.top - PAD,
          left: r.left - PAD,
          width: r.width + PAD * 2,
          height: r.height + PAD * 2,
        });
      }
      return;
    }

    if (!step?.targetId) {
      setTargetRect(null);
      return;
    }

    const el = document.getElementById(step.targetId);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    } else {
      setTargetRect(null);
    }
  }, [step, isStyleAnimated]);

  const measureStyleButton = useCallback((idx: number) => {
    const el = document.getElementById(STYLE_IDS[idx]);
    if (el) {
      const r = el.getBoundingClientRect();
      setStyleRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    }
  }, []);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    return () => window.removeEventListener("resize", measureTarget);
  }, [measureTarget]);

  /* ================= STYLE ANIMATION (ВОССТАНОВЛЕНА) ================= */

  useEffect(() => {
    if (!isStyleAnimated) {
      STYLE_IDS.forEach((id) => {
        document.getElementById(id)?.classList.remove("tutorial-highlight");
      });
      if (styleTimerRef.current) clearInterval(styleTimerRef.current);
      return;
    }

    setStyleIndex(0);
    measureStyleButton(0);

    STYLE_IDS.forEach((id, i) => {
      const el = document.getElementById(id);
      if (i === 0) el?.classList.add("tutorial-highlight");
      else el?.classList.remove("tutorial-highlight");
    });

    styleTimerRef.current = setInterval(() => {
      setStyleIndex((prev) => {
        const next = (prev + 1) % STYLE_IDS.length;

        STYLE_IDS.forEach((id, i) => {
          const el = document.getElementById(id);
          if (i === next) el?.classList.add("tutorial-highlight");
          else el?.classList.remove("tutorial-highlight");
        });

        measureStyleButton(next);
        return next;
      });
    }, 1500);

    return () => {
      if (styleTimerRef.current) clearInterval(styleTimerRef.current);
    };
  }, [isStyleAnimated, measureStyleButton]);

  /* ================= ARROW FADE ================= */

  useEffect(() => {
    setArrowVisible(false);
    const t = setTimeout(() => setArrowVisible(true), 200);
    return () => clearTimeout(t);
  }, [currentStep]);

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(storageKey, "true");
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
      setFadeKey((k) => k + 1);
    }
  };

  const hasTarget = !!(targetRect && step?.targetId);

  /* ================= TEXT POSITION ================= */

  let textStyle: React.CSSProperties;

  if (isFinalCenterStep) {
    textStyle = {
      zIndex: 52,
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else if (isFactsStep) {
    textStyle = {
      zIndex: 52,
      top: "58%", // ниже центра
      transform: "translate(-50%, -50%)",
    };
  } else if (isGirlStep) {
    textStyle = {
      zIndex: 52,
      top: "48%",
      transform: "translate(-50%, -50%)",
    };
  } else if (hasTarget) {
    textStyle = {
      zIndex: 52,
      ...(step.position === "bottom"
        ? { top: targetRect!.top + targetRect!.height + 20 }
        : { bottom: window.innerHeight - targetRect!.top + 20 }),
    };
  } else {
    textStyle = {
      zIndex: 52,
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  /* ================= ARROW ================= */

  const renderArrow = () => {
    if (isFactsStep) return null;
    if (!hasTarget || !arrowVisible) return null;

    const arrowTarget = isStyleAnimated && styleRect ? styleRect : targetRect!;
    const cutCenterX = arrowTarget.left + arrowTarget.width / 2;

    let startY: number;
    let endY: number;

    if (isGirlStep) {
      // стрелка от ВЕРХА текста к полю
      startY = window.innerHeight * 0.48 - 40;
      endY = arrowTarget.top;
    } else if (step.position === "bottom") {
      startY = arrowTarget.top + arrowTarget.height + 20;
      endY = arrowTarget.top + arrowTarget.height;
    } else {
      startY = arrowTarget.top - 20;
      endY = arrowTarget.top;
    }

    const startX = window.innerWidth / 2;
    const endX = cutCenterX;

    const midY = (startY + endY) / 2;
    const cpX = (startX + endX) / 2;

    const d = `M ${startX} ${startY} Q ${cpX} ${midY} ${endX} ${endY}`;

    return (
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 52,
          width: "100vw",
          height: "100vh",
          opacity: arrowVisible ? 0.8 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <path
          d={d}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const displayText = isStyleAnimated
    ? `${step.text.split("\n")[0]}\n${STYLE_TEXTS[styleIndex]}`
    : step.text;

  return (
    <div className="fixed inset-0 z-50" onClick={handleNext}>
      {!hasTarget && (
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.75)" }}
        />
      )}

      {hasTarget && (
        <div
          style={{
            position: "fixed",
            top: targetRect!.top,
            left: targetRect!.left,
            width: targetRect!.width,
            height: targetRect!.height,
            borderRadius: RADIUS,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
            zIndex: 51,
            pointerEvents: "none",
          }}
        />
      )}

      {renderArrow()}

      <div
        key={fadeKey}
        className="fixed left-1/2 flex flex-col items-center animate-fadeIn"
        style={{
          left: "50%",
          maxWidth: 300,
          ...textStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-base text-center leading-relaxed whitespace-pre-line mb-5">
          {displayText}
        </p>

        <button
          onClick={handleNext}
          className="px-6 py-2 rounded-xl text-white text-sm font-semibold shadow-lg active:scale-[0.97] transition-transform"
          style={{
            background: isLast
              ? "linear-gradient(135deg, #22C55E, #16A34A)"
              : "linear-gradient(135deg, #EF4444, #F43F5E)",
          }}
        >
          {isLast ? "Понятно ✓" : "Далее →"}
        </button>

        <div className="flex gap-1.5 mt-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === currentStep ? 16 : 6,
                height: 6,
                background: i === currentStep ? "#FFFFFF" : "#666666",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;