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
              background: "linear-gradient(90deg, #AD8B3A, #D4AF37, #F9E076)",
              boxShadow: "0 0 6px rgba(212, 175, 55, 0.2)",
            }}
          />
        </div>
        <span
          className="text-[9px] font-bold"
          style={{
            background: "linear-gradient(135deg, rgba(200, 200, 220, 0.45), rgba(200, 200, 220, 0.3))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    );
  }

  // Large — static, compact, right-aligned via parent
  return (
    <div className="flex items-center gap-2 ml-auto flex-shrink-0" style={{ maxWidth: 160 }}>
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: 55,
          height: 5,
          background: "linear-gradient(90deg, rgba(168, 168, 176, 0.08), rgba(200, 200, 220, 0.1))",
          flexShrink: 0,
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
              : "0 0 5px rgba(212, 175, 55, 0.2)",
          }}
        />
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span
          className="text-[10px] font-bold"
          style={{
            color: "rgba(200, 200, 220, 0.4)",
          }}
        >
          {Math.round(progress)}%
        </span>
        {showDelta !== null && (
          <span
            className="text-[10px] font-bold animate-delta-pop"
            style={{
              color: showDelta > 0 ? "#4ADE80" : "rgba(200, 200, 220, 0.5)",
            }}
          >
            {showDelta > 0 ? `+${showDelta}` : showDelta}
          </span>
        )}
      </div>
    </div>
  );
};

export default PhaseProgressBar;
