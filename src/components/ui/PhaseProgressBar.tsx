import React from "react";

interface PhaseProgressBarProps {
  interest: number;
  size?: "small" | "large";
}

const PhaseProgressBar: React.FC<PhaseProgressBarProps> = ({
  interest,
  size = "large",
}) => {
  const progress = Math.min(Math.max(interest, 0), 100);
  const isComplete = progress >= 100;

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
        <span
          className="text-[11px] font-bold"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default PhaseProgressBar;
