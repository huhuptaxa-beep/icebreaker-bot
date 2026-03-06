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
      <div className="girl-reply-field">
        <div className="girl-reply-helper">
          <span>Ответ девушки</span>
          <span>Вставь сообщение из чата</span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=""
          aria-label="Ответ девушки"
          disabled={disabled}
        />
      </div>
      <button type="button" onClick={onPaste} disabled={disabled}>
        {pasteLabel ?? "Вставить из чата"}
      </button>
    </div>
  );
};

export default GirlReplyInput;
