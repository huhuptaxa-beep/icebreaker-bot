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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Ответ девушки\nВставь сообщение из чата"}
        disabled={disabled}
      />
      <button type="button" onClick={onPaste} disabled={disabled}>
        {pasteLabel ?? "📋 Вставить из чата"}
      </button>
    </div>
  );
};

export default GirlReplyInput;
