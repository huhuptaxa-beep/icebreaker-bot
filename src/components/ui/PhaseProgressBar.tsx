import React, { useState, useEffect } from "react";

interface PhaseProgressBarProps {
  interest: number;
  size?: "small" | "large";
  delta?: number | null;
}

const PhaseProgressBar: React.FC<PhaseProgressBarProps> = ({
  interest,
  size = "large",
  delta,
}) => {
  const progress = Math.min(Math.max(interest, 0), 100);
  const isComplete = progress >= 100;

  const [showDelta, setShowDelta] = useState<number | null>(null);

  useEffect(() => {
    if (delta && delta !== 0) {
      setShowDelta(delta);
      const timer = setTimeout(() => setShowDelta(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [delta]);

  if (size === "small") {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width: 50,
            height: 6,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: isComplete
                ? "linear-gradient(90deg, #F7C35F, #FFD977)"
                : "linear-gradient(90deg, #FF2E4D, #FF5A5F)",
              boxShadow: isComplete
                ? "0 0 8px rgba(247,195,95,0.3)"
                : "0 0 8px rgba(255,46,77,0.3)",
            }}
          />
        </div>
        <span
          className="text-[9px] font-bold"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center flex-1">
      <span
        className="text-[10px] font-semibold uppercase mb-1"
        style={{
          letterSpacing: "1.5px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Соблазнение
      </span>
      <div className="flex items-center gap-2 w-full">
        <div
          className="relative rounded-full overflow-hidden flex-1"
          style={{
            height: 8,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              ...(isComplete
                ? {
                    background: "linear-gradient(90deg, #F7C35F, #FFD977, #FFF5CC, #FFD977, #F7C35F)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer-progress 3s infinite linear",
                    boxShadow: "0 0 12px rgba(247,195,95,0.4)",
                  }
                : {
                    background: "linear-gradient(90deg, #FF2E4D, #FF5A5F)",
                    boxShadow: "0 0 12px rgba(255,46,77,0.4)",
                  }),
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span
            className="text-[11px] font-bold"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {Math.round(progress)}%
          </span>
          {showDelta !== null && (
            <span
              className="text-[11px] font-bold animate-delta-pop"
              style={{
                color: showDelta > 0 ? "#4ADE80" : "#FF2E4D",
              }}
            >
              {showDelta > 0 ? `+${showDelta}` : showDelta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhaseProgressBar;
