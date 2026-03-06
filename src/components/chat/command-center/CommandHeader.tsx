import React from "react";
interface CommandHeaderProps {
  girlName: string;
  interest: number;
  onPrev?: () => void;
  onNext?: () => void;
  onPrevConversation?: () => void;
  onNextConversation?: () => void;
}

const CommandHeader: React.FC<CommandHeaderProps> = ({
  girlName,
  interest,
  onPrev,
  onNext,
  onPrevConversation,
  onNextConversation,
}) => {
  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left") {
      (onNextConversation ?? onNext)?.();
    } else {
      (onPrevConversation ?? onPrev)?.();
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window === "undefined") return;
    const startX = event.touches[0]?.clientX ?? 0;
    const threshold = 60;

    const handleMove = (moveEvent: TouchEvent) => {
      const currentX = moveEvent.touches[0]?.clientX ?? 0;
      const delta = currentX - startX;
      if (delta > threshold) {
        cleanup();
        handleSwipe("right");
      } else if (delta < -threshold) {
        cleanup();
        handleSwipe("left");
      }
    };

    const cleanup = () => {
      window.removeEventListener("touchmove", handleMove);
    };

    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener(
      "touchend",
      () => {
        cleanup();
      },
      { once: true }
    );
  };

  const normalizedInterest = Math.max(0, Math.min(100, Math.round(interest ?? 0)));
  const barGradient =
    normalizedInterest >= 100
      ? "linear-gradient(135deg, #F7C35F, #FFD977)"
      : "linear-gradient(135deg, #FF2E4D, #FF5A5F)";

  return (
    <header className="command-header">
      <div className="command-header-row">
        <button
          onClick={onPrevConversation ?? onPrev}
          className="command-header-arrow"
          disabled={!(onPrevConversation ?? onPrev)}
          aria-label="Предыдущий диалог"
        >
          ←
        </button>
        <div className="command-header-main">
          <div className="command-header-name">{girlName}</div>
          <div className="command-header-progress">
            <div className="command-header-progress-track">
              <div
                className="command-header-progress-fill"
                style={{ width: `${normalizedInterest}%`, background: barGradient }}
              />
            </div>
            <span className="command-header-progress-value">
              {normalizedInterest}%
            </span>
          </div>
        </div>
        <button
          onClick={onNextConversation ?? onNext}
          className="command-header-arrow"
          disabled={!(onNextConversation ?? onNext)}
          aria-label="Следующий диалог"
        >
          →
        </button>
      </div>
      <div className="command-header-swipe-area" onTouchStart={handleTouchStart} />
    </header>
  );
};

export default CommandHeader;
