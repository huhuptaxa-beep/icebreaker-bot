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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (suggestion: string[], index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const textToCopy = suggestion.join("\n\n");
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
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
        <div key={i} className="relative">
          <button
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
          <button
            onClick={(e) => handleCopy(suggestion, i, e)}
            className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded-lg transition-all"
            style={{
              background: copiedIndex === i ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
              color: copiedIndex === i ? "#4ADE80" : "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {copiedIndex === i ? "✓" : "Копировать"}
          </button>
        </div>
      ))}
    </div>
  );
};

export default SuggestionsPanel;
