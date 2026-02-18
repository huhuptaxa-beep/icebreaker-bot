import React, { useState } from "react";

interface Props {
  text: string;
  role: "user" | "girl";
  onPaste?: (text: string) => void;
  showPaste?: boolean;
}

const MessageBubble: React.FC<Props> = ({ text, role, onPaste, showPaste }) => {
  const isMine = role === "user";
  const showButton = isMine || showPaste;
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setActionLabel("Скопировано ✓");
      setTimeout(() => setActionLabel(null), 1500);
    } catch {}
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && onPaste) {
        onPaste(clipText);
        setActionLabel("Вставлено ✓");
        setTimeout(() => setActionLabel(null), 1500);
      }
    } catch {}
  };

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fadeIn`}
    >
      <div className="max-w-[70%]">
        <div
          className={`px-4 py-3 text-sm shadow-md rounded-2xl ${showButton ? "rounded-b-none" : ""}`}
          style={{
            background: isMine
              ? "linear-gradient(135deg, #EF4444 0%, #F43F5E 100%)"
              : "#1E1E1E",
            color: "#FFFFFF",
          }}
        >
          {text}
        </div>
        {showButton && (
          <button
            onClick={isMine ? handleCopy : handlePaste}
            className="text-xs px-3 py-1 rounded-b-lg transition-colors"
            style={{
              display: "block",
              background: isMine ? "#B91C1C" : "#161616",
              color: isMine ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.45)",
              marginLeft: isMine ? "auto" : undefined,
            }}
          >
            {actionLabel ?? (isMine ? "Скопировать" : "Вставить")}
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
