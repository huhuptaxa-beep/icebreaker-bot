import React from "react";

interface GirlReplyInputProps {
  value: string;
  onChange: (value: string) => void;
  onPaste: () => void;
  pasteLabel?: string | null;
  disabled?: boolean;
}

const GirlReplyInput: React.FC<GirlReplyInputProps> = ({ value, onChange, onPaste, pasteLabel, disabled }) => {
  return (
    <div className="girl-reply-input">
      <p className="girl-reply-label">Ответ девушки</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Вставь сообщение из чата"
        aria-label="Ответ девушки"
        disabled={disabled}
      />
      <button type="button" onClick={onPaste} disabled={disabled}>
        {pasteLabel ?? "Вставить из чата"}
      </button>
    </div>
  );
};

export default GirlReplyInput;
