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
            height: 5,
            background: "linear-gradient(90deg, rgba(168, 168, 176, 0.1), rgba(200, 200, 220, 0.12))",
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: isComplete
                ? "linear-gradient(90deg, #AD8B3A, #F9E076, #FFE8A0, #F9E076, #AD8B3A)"
                : "linear-gradient(90deg, #AD8B3A, #D4AF37, #F9E076)",
              backgroundSize: isComplete ? "200% 100%" : "100% 100%",
              animation: isComplete ? "shimmer-progress 3s infinite linear" : "none",
              boxShadow: isComplete
                ? "0 0 8px rgba(212, 175, 55, 0.4)"
                : "0 0 6px rgba(212, 175, 55, 0.2)",
            }}
          />
        </div>
        <span
          className="text-[9px] font-bold"
          style={{
            background: "linear-gradient(135deg, rgba(200, 200, 220, 0.4), rgba(200, 200, 220, 0.25))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
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
          letterSpacing: "2px",
          background: "linear-gradient(135deg, rgba(200, 200, 220, 0.5), rgba(200, 200, 220, 0.3))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Соблазнение
      </span>
      <div className="flex items-center gap-2 w-full">
        <div
          className="relative rounded-full overflow-hidden flex-1"
          style={{
            height: 7,
            background: "linear-gradient(90deg, rgba(168, 168, 176, 0.08), rgba(200, 200, 220, 0.1))",
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              ...(isComplete
                ? {
                  background: "linear-gradient(90deg, #AD8B3A, #F9E076, #FFE8A0, #F9E076, #AD8B3A)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer-progress 3s infinite linear",
                  boxShadow: "0 0 12px rgba(212, 175, 55, 0.5)",
                }
                : {
                  background: "linear-gradient(90deg, #AD8B3A, #D4AF37, #F9E076)",
                  boxShadow: "0 0 10px rgba(212, 175, 55, 0.3)",
                }),
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span
            className="text-[11px] font-bold"
            style={{
              background: "linear-gradient(135deg, rgba(200, 200, 220, 0.5), rgba(200, 200, 220, 0.35))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {Math.round(progress)}%
          </span>
          {showDelta !== null && (
            <span
              className="text-[11px] font-bold animate-delta-pop"
              style={{
                color: showDelta > 0 ? "#4ADE80" : "#FF4466",
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
