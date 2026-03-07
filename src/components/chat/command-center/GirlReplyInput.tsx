import React, { useRef } from "react";

interface GirlReplyInputProps {
  value: string;
  onChange: (value: string) => void;
  onPaste?: () => void;
  pasteLabel?: string | null;
  disabled?: boolean;
  label: string;
  placeholder: string;
  showPasteButton?: boolean;
}

const GirlReplyInput: React.FC<GirlReplyInputProps> = ({
  value,
  onChange,
  onPaste,
  pasteLabel,
  disabled,
  label,
  placeholder,
  showPasteButton = true,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div
      id="field-girl-message"
      className={`girl-reply-input${disabled ? " disabled" : ""}`}
      onClick={(event) => {
        if (disabled) return;
        if ((event.target as HTMLElement)?.closest("button")) return;
        textareaRef.current?.focus();
      }}
    >
      <p className="girl-reply-label">{label}</p>
      <textarea
        className="girl-reply-textarea"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
      />
      {showPasteButton && (
        <button type="button" className="paste-button" onClick={onPaste} disabled={disabled}>
          {pasteLabel ?? "Вставить из чата"}
        </button>
      )}
    </div>
  );
};

export default GirlReplyInput;
