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

  const barGradient = "linear-gradient(90deg, #DC2626, #EF4444)";

  if (size === "small") {
    return (
      <div className="relative" style={{ width: 70, height: 16 }}>
        <div
          className="w-full h-full rounded-lg"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            className="h-full rounded-lg transition-all duration-500"
            style={{
              width: `${progress}%`,
              minWidth: progress > 0 ? 24 : 0,
              background: barGradient,
            }}
          />
        </div>
        <span
          className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center flex-1">
      <span
        className="text-[10px] font-semibold uppercase mb-0.5"
        style={{
          letterSpacing: "1.5px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Соблазнение
      </span>
      <div className="relative w-full" style={{ height: 22 }}>
        <div
          className="w-full h-full rounded-full"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1.5px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              minWidth: progress > 0 ? 28 : 0,
              background: barGradient,
            }}
          />
        </div>
        <span
          className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default PhaseProgressBar;