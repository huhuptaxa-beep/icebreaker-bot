import React from 'react';

interface ChipOption {
  value: string;
  label: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

/**
 * Компонент выбора через чипы
 * Позволяет выбрать один из вариантов
 */
const ChipSelect: React.FC<ChipSelectProps> = ({
  options,
  value,
  onChange,
  label,
}) => {
  return (
    <div className="section-gap">
      <span className="label-text">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`chip ${value === option.value ? 'chip-selected' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChipSelect;
