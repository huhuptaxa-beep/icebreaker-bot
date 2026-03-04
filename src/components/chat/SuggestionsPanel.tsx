import React, { useState } from "react";

interface SuggestionsPanelProps {
  suggestions: string[][];
  onSelect: (suggestion: string[]) => void;
  loading?: boolean;
}

const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  suggestions,
  onSelect,
  loading,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  const handleSelect = (suggestion: string[], index: number) => {
    setSelectedIndex(index);
    // Small delay for visual feedback before action
    setTimeout(() => {
      onSelect(suggestion);
      setSelectedIndex(null);
    }, 200);
  };

  return (
    <div className="px-5 py-3 flex flex-col gap-3 animate-fadeIn">
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          marginBottom: 6,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          background: "linear-gradient(135deg, rgba(200, 200, 220, 0.4), rgba(200, 200, 220, 0.25))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        AI предлагает 3 стратегии ответа
      </span>

      {suggestions.map((suggestion, i) => {
        const isSelected = selectedIndex === i;

        return (
          <button
            key={i}
            onClick={() => handleSelect(suggestion, i)}
            className="w-full text-left transition-all duration-300"
            style={{
              background: isSelected
                ? "rgba(212, 175, 55, 0.08)"
                : "rgba(255, 255, 255, 0.03)",
              border: isSelected
                ? "0.5px solid rgba(212, 175, 55, 0.6)"
                : "0.5px solid rgba(200, 200, 220, 0.08)",
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              animation: "fadeSlideUp 300ms ease-out forwards",
              animationDelay: `${i * 100}ms`,
              opacity: 0,
              backdropFilter: "blur(25px)",
              WebkitBackdropFilter: "blur(25px)",
              boxShadow: isSelected
                ? "0 0 15px rgba(212, 175, 55, 0.5), 0 0 30px rgba(212, 175, 55, 0.15)"
                : "0 2px 8px rgba(0, 0, 0, 0.15)",
              transform: isSelected ? "scale(0.98)" : "scale(1)",
            }}
          >
            {/* Number badge — gold circle */}
            <span
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, #AD8B3A, #F9E076)"
                  : "rgba(212, 175, 55, 0.12)",
                color: isSelected ? "#050505" : "#D4AF37",
                borderRadius: 999,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
                border: isSelected
                  ? "none"
                  : "0.5px solid rgba(212, 175, 55, 0.2)",
                boxShadow: isSelected
                  ? "0 0 10px rgba(212, 175, 55, 0.3)"
                  : "none",
                transition: "all 0.3s ease",
              }}
            >
              {i + 1}
            </span>

            {/* Text content */}
            <div style={{ flex: 1, lineHeight: 1.6 }}>
              {suggestion.map((part, partIndex) => (
                <React.Fragment key={partIndex}>
                  {partIndex > 0 && (
                    <div
                      style={{
                        height: "0.5px",
                        background: "linear-gradient(90deg, transparent, rgba(200, 200, 220, 0.1), transparent)",
                        margin: "10px 0",
                      }}
                    />
                  )}
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.85)",
                      fontSize: 14,
                      fontWeight: 400,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {part}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SuggestionsPanel;
