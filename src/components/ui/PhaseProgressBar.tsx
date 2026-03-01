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

  if (size === "small") {
    // Компактная версия для списка диалогов
    return (
      <div className="flex items-center gap-2">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ width: 48, background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #4ADE80, #22C55E)",
            }}
          />
        </div>
        <span
          className="text-[10px]"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    );
  }

  // Полная версия для хедера чата
  return (
    <div className="flex items-center gap-2 flex-1 justify-end">
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ width: 60, background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #4ADE80, #22C55E)",
          }}
        />
      </div>
      <span
        className="text-[10px] font-medium"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {Math.round(progress)}%
      </span>
    </div>
  );
};

export default PhaseProgressBar;
