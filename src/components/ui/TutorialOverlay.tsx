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

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const isFactsStep = step?.targetId === "field-facts";
  const isGirlStep = step?.targetId === "field-girl-message";

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
    } else {
      setTargetRect(null);
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

    return () => {
      if (step?.targetId) {
        const el = document.getElementById(step.targetId);
        el?.classList.remove("tutorial-highlight");
      }
    };
  }, [step]);

  useEffect(() => {
    setArrowVisible(false);
    const timer = setTimeout(() => setArrowVisible(true), 250);
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

  const hasTarget = !!(targetRect && step?.targetId);

  /* ================= TEXT POSITION ================= */

  let textStyle: React.CSSProperties;

  if (!step?.targetId) {
    textStyle = {
      zIndex: 52,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else if (isGirlStep) {
    textStyle = {
      zIndex: 52,
      top: "44%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else if (hasTarget) {
    textStyle = {
      zIndex: 52,
      top: targetRect!.top + targetRect!.height + 24,
    };
  } else {
    textStyle = {
      zIndex: 52,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  /* ================= ARROW ================= */

  const renderArrow = () => {
    if (isFactsStep) return null;
    if (!hasTarget || !arrowVisible) return null;

    const centerX = window.innerWidth / 2;

    const endX = targetRect!.left + targetRect!.width / 2;
    const endY = targetRect!.top + targetRect!.height / 2;

    const startX = centerX;
    const startY = isGirlStep
      ? window.innerHeight * 0.40
      : window.innerHeight * 0.45;

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
          opacity: arrowVisible ? 0.9 : 0,
          transition: "opacity 0.25s ease",
        }}
      >
        <path
          d={d}
          fill="none"
          stroke="white"
          strokeWidth={6}   {/* ← БЫЛО 2, СТАЛО 6 */}
          strokeLinecap="round"
        />
      </svg>
    );
  };

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
          maxWidth: 320,
          ...textStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-base text-center leading-relaxed whitespace-pre-line mb-5">
          {step.text}
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