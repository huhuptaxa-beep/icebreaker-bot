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
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Генерирую варианты...
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl animate-pulse"
            style={{
              background: "#1A1A1A",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 flex flex-col gap-2.5 animate-fadeIn">
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Выбери вариант
      </span>

      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="w-full text-left px-4 py-3 text-sm rounded-2xl transition-all duration-150 active:scale-[0.98] flex items-start gap-3"
          style={{
            background: "#1A1A1A",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#FFFFFF",
          }}
        >
          <span
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
            style={{ background: "linear-gradient(135deg, #EF4444, #F43F5E)" }}
          >
            {i + 1}
          </span>
          <div className="flex-1 leading-relaxed">
            {suggestion.map((part, partIndex) => (
              <React.Fragment key={partIndex}>
                {partIndex > 0 && (
                  <div
                    className="my-2"
                    style={{
                      height: "1px",
                      background: "rgba(255,255,255,0.1)",
                    }}
                  />
                )}
                <div className="text-white text-sm">{part}</div>
              </React.Fragment>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
};

export default SuggestionsPanel;