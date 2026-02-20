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
  const [ready, setReady] = useState(false);

  const [styleIndex, setStyleIndex] = useState(0);
  const [styleRect, setStyleRect] = useState<TargetRect | null>(null);
  const styleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isStyleAnimated = step?.targetId === "style-animated";
  const isFinalCenterStep = !step?.targetId;
  const isFactsStep = step?.targetId === "field-facts"; // 👈 добавлено

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
    setReady(false);
    setArrowVisible(false);
    measureTarget();
    const t1 = setTimeout(() => {
      measureTarget();
      setReady(true);
    }, 80);
    const t2 = setTimeout(() => setArrowVisible(true), 350);
    window.addEventListener("resize", measureTarget);
    return () => {
      window.removeEventListener("resize", measureTarget);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [measureTarget, currentStep]);

  /* ================= STYLE ANIMATION ================= */

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

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(storageKey, "true");
      STYLE_IDS.forEach((id) => {
        document.getElementById(id)?.classList.remove("tutorial-highlight");
      });
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
      setFadeKey((k) => k + 1);
    }
  };

  const hasTarget = !!(targetRect && step?.targetId);

  /* ================= ARROW ================= */

  const renderArrow = () => {
    if (isFactsStep) return null; // 👈 убрали стрелку только тут
    if (isFinalCenterStep || !hasTarget || !arrowVisible || !ready) return null;

    const arrowTarget = isStyleAnimated && styleRect ? styleRect : targetRect!;
    const cutCenterX = arrowTarget.left + arrowTarget.width / 2;
    const cutTop = arrowTarget.top;
    const cutBottom = arrowTarget.top + arrowTarget.height;

    const screenCenterX = window.innerWidth / 2;

    const textEl = textRef.current;
    if (!textEl) return null;
    const tr = textEl.getBoundingClientRect();

    let startX: number;
    let startY: number;
    let endX: number;
    let endY: number;

    if (step.position === "bottom" || cutTop < tr.top) {
      startX = screenCenterX;
      startY = tr.top - 4;
      endX = cutCenterX;
      endY = cutBottom + 6;
    } else {
      startX = screenCenterX;
      startY = tr.bottom + 4;
      endX = cutCenterX;
      endY = cutTop - 6;
    }

    const dx = endX - startX;
    const dy = endY - startY;
    const cpX = startX + dx * 0.5;
    const cpY = startY + dy * 0.5;

    const pathD = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;

    return (
      <svg className="fixed inset-0 pointer-events-none" style={{ zIndex: 53 }}>
        <path d={pathD} fill="none" stroke="white" strokeWidth={2} />
      </svg>
    );
  };

  const displayText = isStyleAnimated
    ? `Если хочешь разнообразить стиль общения:\n${STYLE_TEXTS[styleIndex]}`
    : step.text;

  if (!ready) {
    return <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.75)" }} />;
  }

  return (
    <div className="fixed inset-0 z-50" onClick={handleNext}>
      {!hasTarget && (
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.75)" }} />
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
        ref={textRef}
        className="fixed flex flex-col items-center"
        style={{
          zIndex: 54,
          left: "50%",
          top: isFactsStep ? "58%" : "50%", // 👈 опустили только этот шаг
          transform: "translate(-50%, -50%)",
          maxWidth: 300,
          width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-base text-center leading-relaxed whitespace-pre-line mb-5 px-4">
          {displayText}
        </p>

        <button
          onClick={handleNext}
          className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg"
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
              className="rounded-full"
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