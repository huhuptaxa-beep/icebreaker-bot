import React from "react";

interface SuggestionsPanelProps {
  suggestions: string[];
  onSelect: (text: string) => void;
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
        <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
          <div className="w-4 h-4 border-2 border-[#3B5BDB] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Генерирую варианты...
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl animate-pulse"
            style={{ background: "linear-gradient(90deg,#E9ECF8 25%,#F3F5FF 50%,#E9ECF8 75%)", backgroundSize: "200% 100%", animation: `shimmer 1.4s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 flex flex-col gap-2.5 animate-fadeIn">
      <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
        Выбери вариант
      </span>

      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-left px-4 py-3 text-sm rounded-2xl transition-all duration-150 active:scale-[0.98] flex items-start gap-3"
          style={{
            background: "linear-gradient(135deg,#FFFFFF 0%,#F8FAFF 100%)",
            border: "1px solid #DCE3FF",
            boxShadow: "0 2px 8px rgba(59,91,219,0.08)",
            color: "#1A1A1A",
          }}
        >
          <span
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
            style={{ background: "linear-gradient(135deg,#3B5BDB,#5C7CFA)" }}
          >
            {i + 1}
          </span>
          <span className="flex-1 leading-relaxed">{s}</span>
        </button>
      ))}
    </div>
  );
};

export default SuggestionsPanel;
