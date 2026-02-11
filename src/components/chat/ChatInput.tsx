import React, { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  onAction: (action: "reengage" | "contact" | "date") => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onAction, disabled }) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  const actionButtons = [
    { label: "Возобновить", action: "reengage" as const },
    { label: "Контакт", action: "contact" as const },
    { label: "Встреча", action: "date" as const },
  ];

  return (
    <div style={{ background: "#FFFFFF", borderTop: "1px solid #E6E8F0" }}>
      <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
        {actionButtons.map((btn) => (
          <button
            key={btn.action}
            onClick={() => onAction(btn.action)}
            disabled={disabled}
            className="shrink-0 px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 disabled:opacity-50"
            style={{
              background: "#F0F2F8",
              color: "#4F7CFF",
              borderRadius: "16px",
              border: "1px solid #E6E8F0",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Вставь её сообщение..."
          disabled={disabled}
          className="flex-1 px-4 py-2.5 text-sm outline-none disabled:opacity-50"
          style={{
            background: "#F0F2F8",
            borderRadius: "16px",
            border: "1px solid #E6E8F0",
            color: "#1A1A1A",
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="shrink-0 px-4 py-2.5 text-sm font-medium transition-colors active:scale-95 disabled:opacity-50"
          style={{
            background: "#4F7CFF",
            color: "#FFFFFF",
            borderRadius: "16px",
          }}
        >
          Ответить
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
