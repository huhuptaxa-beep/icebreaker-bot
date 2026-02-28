import React from "react";

interface PhaseProgressBarProps {
  phase: number;
  messageCount: number;
  size?: "small" | "large";
}

const PHASE_CONFIG = {
  1: { base: 0,  width: 20, maxMsg: 4,  label: "Знакомство" },
  2: { base: 20, width: 20, maxMsg: 8,  label: "Контакт" },
  3: { base: 40, width: 20, maxMsg: 8, label: "Telegram" },
  4: { base: 60, width: 30, maxMsg: 10, label: "Сближение" },
  5: { base: 100, width: 0, maxMsg: 1,  label: "Свидание" },
};

const PhaseProgressBar: React.FC<PhaseProgressBarProps> = ({
  phase,
  messageCount,
  size = "large",
}) => {
  const config = PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG] || PHASE_CONFIG[1];
  const innerProgress = Math.min(messageCount / config.maxMsg, 1);
  const totalProgress = Math.min(config.base + config.width * innerProgress, 100);

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
              width: `${totalProgress}%`,
              background: totalProgress >= 100
                ? "linear-gradient(90deg, #4ADE80, #22C55E)"
                : "linear-gradient(90deg, #EF4444, #F43F5E)",
            }}
          />
        </div>
        <span
          className="text-[10px]"
          style={{
            color: totalProgress >= 100 ? "#4ADE80" : "rgba(255,255,255,0.35)",
          }}
        >
          {Math.round(totalProgress)}%
        </span>
      </div>
    );
  }

  // Полная версия для хедера чата
  return (
    <div className="flex items-center gap-2 flex-1 justify-end">
      <span className="text-[10px] text-gray-500 whitespace-nowrap">
        {config.label}
      </span>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ width: 60, background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${totalProgress}%`,
            background: totalProgress >= 100
              ? "linear-gradient(90deg, #4ADE80, #22C55E)"
              : "linear-gradient(90deg, #EF4444, #F43F5E)",
          }}
        />
      </div>
      <span
        className="text-[10px] font-medium"
        style={{
          color: totalProgress >= 100 ? "#4ADE80" : "rgba(255,255,255,0.4)",
        }}
      >
        {Math.round(totalProgress)}%
      </span>
    </div>
  );
};

export default PhaseProgressBar;
