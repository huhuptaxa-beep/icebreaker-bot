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

  // 👇 первые два шага фиксируем снизу
  const isBottomFixed =
    step?.targetId === "field-facts" ||
    step?.targetId === "field-girl-message";

  const measureTarget = useCallback(() => {
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
    }
  }, [step]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    return () => window.removeEventListener("resize", measureTarget);
  }, [measureTarget]);

  useEffect(() => {
    if (prevTargetIdRef.current) {
      const prevEl = document.getElementById(prevTargetIdRef.current);
      prevEl?.classList.remove("tutorial-highlight");
    }

    if (step?.targetId) {
      const el = document.getElementById(step.targetId);
      el?.classList.add("tutorial-highlight");
    }

    prevTargetIdRef.current = step?.targetId;
  }, [step]);

  useEffect(() => {
    setArrowVisible(false);
    const timer = setTimeout(() => setArrowVisible(true), 300);
    return () => clearTimeout(timer);
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

  const renderArrow = () => {
    if (!targetRect || !arrowVisible) return null;

    const cutCenterX = targetRect.left + targetRect.width / 2;
    const screenCenterX = window.innerWidth / 2;

    // стрелка теперь ВСЕГДА из нижнего блока вверх
    const startY = window.innerHeight - 140;
    const endY = targetRect.top;

    const startX = screenCenterX;
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
          transition: "opacity 0.3s ease",
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

  const displayText = step?.text;

  return (
    <div className="fixed inset-0 z-50">
      {/* затемнение */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)" }}
        onClick={handleNext}
      />

      {/* cutout */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: RADIUS,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
            zIndex: 51,
            pointerEvents: "none",
          }}
        />
      )}

      {renderArrow()}

      {/* 👇 НИЖНИЙ БЛОК */}
      <div
        key={fadeKey}
        className="fixed left-0 w-full px-6 flex flex-col items-center animate-fadeIn"
        style={{
          bottom: "calc(80px + env(safe-area-inset-bottom))",
          zIndex: 52,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-base text-center leading-relaxed whitespace-pre-line mb-5 max-w-[320px]">
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