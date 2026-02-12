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
      <div className="px-4 py-3 flex items-center gap-2 text-sm text-[#5C7CFA] animate-fadeIn">
        <div className="w-4 h-4 border-2 border-[#3B5BDB] border-t-transparent rounded-full animate-spin" />
        Генерирую варианты...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 flex flex-col gap-3 bg-[#EEF0F6] animate-fadeIn">
      <span className="text-xs font-medium text-[#6B7280]">
        Выбери вариант:
      </span>

      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-left px-4 py-3 text-sm
                     rounded-xl
                     transition-all duration-200
                     active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg,#FFFFFF 0%,#F8FAFF 100%)",
            border: "1px solid #DCE3FF",
            boxShadow:
              "0 4px 12px rgba(59,91,219,0.08)",
            color: "#1A1A1A",
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
};

export default SuggestionsPanel;
