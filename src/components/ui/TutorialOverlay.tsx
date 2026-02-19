import React, { useState, useEffect, useCallback } from "react";

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

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

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

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(storageKey, "true");
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
      setFadeKey((k) => k + 1);
    }
  };

  const cutoutStyle: React.CSSProperties = targetRect
    ? {
        position: "fixed",
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius: RADIUS,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
        zIndex: 51,
        pointerEvents: "none",
      }
    : {};

  const textTop = targetRect
    ? step.position === "bottom"
      ? targetRect.top + targetRect.height + 16
      : undefined
    : undefined;

  const textBottom = targetRect
    ? step.position === "top"
      ? window.innerHeight - targetRect.top + 16
      : undefined
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleNext}
    >
      {/* Dark overlay (only visible when no cutout) */}
      {!targetRect && (
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.75)" }}
        />
      )}

      {/* Cutout highlight */}
      {targetRect && <div style={cutoutStyle} />}

      {/* Text + button */}
      <div
        key={fadeKey}
        className="fixed left-0 right-0 flex flex-col items-center px-6 animate-fadeIn"
        style={
          targetRect
            ? {
                zIndex: 52,
                ...(textTop !== undefined ? { top: textTop } : {}),
                ...(textBottom !== undefined ? { bottom: textBottom } : {}),
              }
            : {
                zIndex: 52,
                top: "50%",
                transform: "translateY(-50%)",
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-base text-center leading-relaxed max-w-[280px] whitespace-pre-line mb-5">
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

        {/* Dots */}
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
