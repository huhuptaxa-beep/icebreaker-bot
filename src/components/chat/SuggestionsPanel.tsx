import React from "react";

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
  if (loading) {
    return (
      <div className="px-4 py-3 flex flex-col gap-3 animate-fadeIn">
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
          Анализирую динамику переписки<span className="loading-dots"></span>
        </p>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 18,
              padding: 16,
              marginBottom: 0,
              height: 60,
              animation: `shimmer 1.5s infinite linear`,
              animationDelay: `${i * 200}ms`,
              backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 flex flex-col gap-2.5 animate-fadeIn">
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 10, fontWeight: 400 }}>
        AI предлагает 3 стратегии ответа
      </span>

      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="w-full text-left transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "fadeSlideUp 250ms ease-out forwards",
            animationDelay: `${i * 80}ms`,
            opacity: 0,
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span
            style={{
              background: "rgba(255,46,77,0.15)",
              color: "#fff",
              borderRadius: 999,
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {i + 1}
          </span>
          <div style={{ flex: 1, lineHeight: 1.5 }}>
            {suggestion.map((part, partIndex) => (
              <React.Fragment key={partIndex}>
                {partIndex > 0 && (
                  <div
                    style={{
                      height: "1px",
                      background: "rgba(255,255,255,0.1)",
                      margin: "8px 0",
                    }}
                  />
                )}
                <div style={{ color: "#FFFFFF", fontSize: 14 }}>{part}</div>
              </React.Fragment>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
};

export default SuggestionsPanel;
