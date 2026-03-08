import React from "react";
interface CommandHeaderProps {
  girlName: string;
  interest: number;
  onPrev?: () => void;
  onNext?: () => void;
  onPrevConversation?: () => void;
  onNextConversation?: () => void;
  disabled?: boolean;
}

const ArrowIcon: React.FC<{ direction: "left" | "right" }> = ({ direction }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    {direction === "left" ? (
      <path
        d="M15 18L9 12L15 6"
        stroke="rgba(224, 224, 230, 0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M9 18L15 12L9 6"
        stroke="rgba(224, 224, 230, 0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const CommandHeader: React.FC<CommandHeaderProps> = ({
  girlName,
  interest,
  onPrev,
  onNext,
  onPrevConversation,
  onNextConversation,
  disabled = false,
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
  const progressWidth = Math.max(normalizedInterest, 2);

  return (
    <header className={`command-header${disabled ? " header-disabled" : ""}`}>
      <div className="command-header-row relative flex items-center justify-center">
        <button
          onClick={onPrevConversation ?? onPrev}
          className="command-header-arrow-outside"
          style={{ left: "-4px" }}
          disabled={!(onPrevConversation ?? onPrev)}
          aria-label="Предыдущий диалог"
        >
          <ArrowIcon direction="left" />
        </button>

        <div className="command-header-center">
          <div className="command-header-name">{girlName}</div>
          <div className="command-header-progress-wrap">
            <div className="command-header-progress-track">
              <div
                className="command-header-progress-fill"
                style={{ width: `${progressWidth}%` }}
              />
              <span className="command-header-progress-label">{normalizedInterest}%</span>
            </div>
          </div>
        </div>

        <button
          onClick={onNextConversation ?? onNext}
          className="command-header-arrow-outside"
          style={{ right: "-4px" }}
          disabled={!(onNextConversation ?? onNext)}
          aria-label="Следующий диалог"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
      <div className="command-header-swipe-area" onTouchStart={handleTouchStart} />
    </header>
  );
};

export default CommandHeader;
