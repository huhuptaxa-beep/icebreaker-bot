import React, { useEffect, useRef, useState } from "react";

interface SuggestionsPanelProps {
  suggestions: string[][];
  onSelect: (suggestion: string[]) => void;
  loading?: boolean;
  prefersReducedMotion?: boolean;
}

const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  suggestions,
  onSelect,
  loading,
  prefersReducedMotion = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [flyingIndex, setFlyingIndex] = useState<number | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionAnimationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const swipeTrackerRef = useRef<
    Record<
      number,
      {
        startX: number;
        startY: number;
        swiped: boolean;
      }
    >
  >({});
  const swipeSelectionRef = useRef<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      selectionAnimationTimersRef.current.forEach(clearTimeout);
      selectionAnimationTimersRef.current.length = 0;
      swipeTrackerRef.current = {};
      swipeSelectionRef.current = {};
    };
  }, []);

  if (loading) {
    return (
      <div className="px-5 py-3 flex flex-col gap-3 animate-fadeIn">
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.02em",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg, rgba(200, 200, 220, 0.4), rgba(200, 200, 220, 0.25))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Анализирую динамику переписки
          </span>
          <span className="loading-dots" style={{ color: "rgba(212, 175, 55, 0.4)" }}></span>
        </p>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "0.5px solid rgba(200, 200, 220, 0.06)",
              borderRadius: 16,
              padding: 18,
              height: 64,
              animation: `shimmer 1.5s infinite linear`,
              animationDelay: `${i * 200}ms`,
              backgroundImage: "linear-gradient(90deg, rgba(212, 175, 55, 0.02) 0%, rgba(212, 175, 55, 0.06) 50%, rgba(212, 175, 55, 0.02) 100%)",
              backgroundSize: "200% 100%",
              backdropFilter: "blur(25px)",
              WebkitBackdropFilter: "blur(25px)",
            }}
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const midpoint = container.scrollLeft + container.clientWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      Array.from(container.children).forEach((child, index) => {
        if (!(child instanceof HTMLElement)) return;
        const childCenter = child.offsetLeft + child.clientWidth / 2;
        const distance = Math.abs(midpoint - childCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActiveIndex(nearestIndex);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [suggestions.length]);

  const completeSelection = (suggestion: string[], index: number) => {
    onSelect(suggestion);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }

    if (prefersReducedMotion) {
      setSelectedIndex(null);
      return;
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setSelectedIndex(null);
      highlightTimerRef.current = null;
    }, 150);
  };

  const handlePointerDown = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    setPressedIndex(index);
    swipeTrackerRef.current[index] = {
      startX: event.clientX,
      startY: event.clientY,
      swiped: false,
    };
    if (prefersReducedMotion) return;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressTimerRef.current = window.setTimeout(() => {
      setPressedIndex((prev) => (prev === index ? null : prev));
      pressTimerRef.current = null;
    }, 80);
  };

  const releasePress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressedIndex(null);
  };

  const cleanupSwipeTracking = (index: number) => {
    delete swipeTrackerRef.current[index];
  };

  const startAnimatedSelection = (
    suggestion: string[],
    index: number,
    afterComplete?: () => void
  ) => {
    releasePress();
    setSelectedIndex(index);
    setFlyingIndex(index);

    const finish = () => {
      setFlyingIndex((prev) => (prev === index ? null : prev));
      completeSelection(suggestion, index);
      afterComplete?.();
    };

    if (prefersReducedMotion) {
      finish();
      return;
    }

    const timer = window.setTimeout(finish, 320);
    selectionAnimationTimersRef.current.push(timer);
  };

  const triggerSwipeSelection = (index: number, suggestion: string[]) => {
    swipeSelectionRef.current[index] = true;
    startAnimatedSelection(suggestion, index, () => {
      delete swipeSelectionRef.current[index];
    });
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    index: number,
    suggestion: string[]
  ) => {
    const tracker = swipeTrackerRef.current[index];
    if (!tracker || tracker.swiped) return;

    const deltaX = event.clientX - tracker.startX;
    const deltaY = event.clientY - tracker.startY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return;
    }
    if (tracker.startY - event.clientY > 60) {
      tracker.swiped = true;
      event.preventDefault();
      cleanupSwipeTracking(index);
      triggerSwipeSelection(index, suggestion);
    }
  };

  const handlePointerEnd = (index: number) => {
    cleanupSwipeTracking(index);
    releasePress();
  };

  const handleCardClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    suggestion: string[],
    index: number
  ) => {
    if (swipeSelectionRef.current[index]) {
      event.preventDefault();
      return;
    }
    startAnimatedSelection(suggestion, index);
  };

  return (
    <div className="suggestions-wrap">
      <span className="suggestions-label">AI предлагает 3 стратегии ответа</span>
      <div className="suggestions-carousel" ref={scrollRef}>
        {suggestions.map((suggestion, i) => {
          const isSelected = selectedIndex === i;
          const isPressed = pressedIndex === i && selectedIndex !== i;
          const scale = prefersReducedMotion ? 1 : isSelected ? 0.97 : isPressed ? 0.99 : 1;
          const highlightBackground = isSelected
            ? "linear-gradient(135deg, rgba(212, 175, 55, 0.16), rgba(212, 175, 55, 0.08))"
            : "rgba(255, 255, 255, 0.04)";
          const highlightBorder = isSelected
            ? "1px solid rgba(212, 175, 55, 0.35)"
            : "1px solid rgba(255, 255, 255, 0.08)";
          const isFlying = flyingIndex === i && !prefersReducedMotion;
          const baseTransform = `scale(${scale})`;
          const transform = isFlying ? "translateY(-260px) scale(0.92)" : baseTransform;
          const opacity = isFlying ? 0 : 1;
          const transition = isFlying
            ? "transform 320ms ease-out, opacity 320ms ease-out, box-shadow 0.3s ease"
            : "transform 160ms cubic-bezier(0.33, 1, 0.68, 1), box-shadow 0.3s ease";

          return (
            <button
              key={i}
              onClick={(event) => handleCardClick(event, suggestion, i)}
              onPointerDown={(event) => handlePointerDown(i, event)}
              onPointerMove={(event) => handlePointerMove(event, i, suggestion)}
              onPointerUp={() => handlePointerEnd(i)}
              onPointerLeave={() => handlePointerEnd(i)}
              onPointerCancel={() => handlePointerEnd(i)}
              className="suggestion-card"
              style={{
                background: highlightBackground,
                border: highlightBorder,
                transform,
                opacity,
                transition,
                boxShadow: isSelected
                  ? "0 0 24px rgba(212, 175, 55, 0.25)"
                  : "0 10px 35px rgba(0,0,0,0.25)",
              }}
            >
              <div className="suggestion-text">
                {suggestion.map((part, partIndex) => (
                  <React.Fragment key={partIndex}>
                    {partIndex > 0 && <div className="suggestion-divider" />}
                    <div className="suggestion-line">{part}</div>
                  </React.Fragment>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="suggestions-dots">
        {suggestions.map((_, idx) => (
          <span
            key={idx}
            className={`suggestion-dot ${activeIndex === idx ? "active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SuggestionsPanel;
