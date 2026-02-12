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
      <div className="px-4 py-3 flex items-center gap-2 text-sm text-[#8B8FA3] animate-fadeIn">
        <div className="w-4 h-4 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin" />
        Генерирую варианты...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3 flex flex-col gap-2 bg-[#EEF0F6] animate-fadeIn transition-all duration-300">
      <span className="text-xs font-medium text-[#8B8FA3]">
        Выбери вариант:
      </span>

      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-left px-4 py-3 text-sm
                     rounded-xl bg-white
                     shadow-sm border border-[#E6E8F0]
                     transition-all duration-200
                     hover:shadow-md active:scale-[0.98]"
        >
          {s}
        </button>
      ))}
    </div>
  );
};

export default SuggestionsPanel;
