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
      <div className="px-4 py-3 flex items-center gap-2 text-sm" style={{ color: "#8B8FA3" }}>
        <div className="w-4 h-4 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin" />
        Генерирую варианты...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 flex flex-col gap-2" style={{ background: "#EEF0F6" }}>
      <span className="text-xs font-medium" style={{ color: "#8B8FA3" }}>
        Выбери вариант:
      </span>
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-left px-4 py-2.5 text-sm transition-colors active:scale-[0.98]"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E6E8F0",
            borderRadius: "12px",
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
