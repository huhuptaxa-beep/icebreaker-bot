import React from "react";
import InterestMomentumLabel from "./InterestMomentumLabel";
import GirlSwitchDots from "./GirlSwitchDots";
import InterestGradientBar from "./InterestGradientBar";

interface CommandHeaderProps {
  girlName: string;
  interest: number;
  onPrev?: () => void;
  onNext?: () => void;
  conversationIndex?: number;
  conversationCount?: number;
  lastSource?: string;
  lastTimeAgo?: string;
  momentumLabel?: {
    text: string;
    tone: "positive" | "neutral" | "negative";
  } | null;
  credits?: number | null;
  balancePulse?: boolean;
  balanceDeltaLabel?: string | null;
}

const CommandHeader: React.FC<CommandHeaderProps> = ({
  girlName,
  interest,
  onPrev,
  onNext,
  conversationIndex,
  conversationCount,
  lastSource,
  lastTimeAgo,
  momentumLabel,
  credits,
  balancePulse,
  balanceDeltaLabel,
}) => {
  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left") {
      onNext?.();
    } else {
      onPrev?.();
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

  return (
    <header className="command-header">
      <div className="command-header-row">
        <button
          onClick={onPrev}
          className="command-header-arrow"
          disabled={!onPrev}
        >
          ←
        </button>
        <div className="command-header-main">
          <div className="command-header-name-row">
            <div>
              <div className="command-header-name">{girlName}</div>
              {(lastSource || lastTimeAgo) && (
                <div className="command-header-meta">
                  {lastSource}
                  {lastSource && lastTimeAgo ? " • " : ""}
                  {lastTimeAgo}
                </div>
              )}
            </div>
            {momentumLabel && (
              <InterestMomentumLabel tone={momentumLabel.tone}>
                {momentumLabel.text}
              </InterestMomentumLabel>
            )}
          </div>
          <div className="command-header-bar">
            <InterestGradientBar value={interest} />
            <span className="interest-value">{Math.round(interest)}%</span>
          </div>
        </div>
        <div className="command-header-nav">
          <GirlSwitchDots currentIndex={conversationIndex} total={conversationCount} />
          <button
            onClick={onNext}
            className="command-header-arrow"
            disabled={!onNext}
          >
            →
          </button>
        </div>
        {typeof credits === "number" && (
          <div
            className={`command-header-credits ${balancePulse ? "pulse" : ""}`}
          >
            ★ {credits}
            {balanceDeltaLabel && (
              <span className="command-header-credits-delta">
                {balanceDeltaLabel} баллов
              </span>
            )}
          </div>
        )}
      </div>
      <div className="command-header-swipe-area" onTouchStart={handleTouchStart} />
    </header>
  );
};

export default CommandHeader;
