import React, { useRef } from "react";

interface GirlReplyInputProps {
  value: string;
  onChange: (value: string) => void;
  onPaste: () => void;
  pasteLabel?: string | null;
  disabled?: boolean;
}

const GirlReplyInput: React.FC<GirlReplyInputProps> = ({
  value,
  onChange,
  onPaste,
  pasteLabel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div
      className="girl-reply-input"
      onClick={(event) => {
        if ((event.target as HTMLElement)?.closest("button")) return;
        textareaRef.current?.focus();
      }}
    >
      <p className="girl-reply-label">Ответ девушки</p>
      <textarea
        className="girl-reply-textarea"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Вставь сообщение из чата"
        aria-label="Ответ девушки"
      />
      <button type="button" className="paste-button" onClick={onPaste}>
        {pasteLabel ?? "Вставить из чата"}
      </button>
    </div>
  );
};

export default GirlReplyInput;
