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

  // Определяем градиент в зависимости от прогресса
  const getGradient = () => {
    if (progress < 50) {
      return "linear-gradient(90deg, #DC2626, #EF4444)";
    } else if (progress < 80) {
      return "linear-gradient(90deg, #F59E0B, #EAB308)";
    } else {
      return "linear-gradient(90deg, #22C55E, #4ADE80)";
    }
  };

  if (size === "small") {
    // Компактная версия для списка диалогов
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
              background: getGradient(),
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

  // Полная версия для хедера чата
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
              background: getGradient(),
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
