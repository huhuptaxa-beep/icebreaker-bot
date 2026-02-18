import React, { useState } from "react";

interface Props {
  text: string;
  role: "user" | "girl";
  onPaste?: (text: string) => void;
}

const MessageBubble: React.FC<Props> = ({ text, role, onPaste }) => {
  const isMine = role === "user";
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
          className="px-4 py-3 rounded-2xl text-sm shadow-md"
          style={{
            background: isMine
              ? "linear-gradient(135deg, #EF4444 0%, #F43F5E 100%)"
              : "#1E1E1E",
            color: "#FFFFFF",
          }}
        >
          {text}
        </div>
        <button
          onClick={isMine ? handleCopy : handlePaste}
          className={`text-xs px-3 py-1 rounded-b-lg transition-colors ${
            isMine ? "ml-auto" : ""
          }`}
          style={{
            display: "block",
            background: isMine ? "rgba(185,28,28,0.5)" : "rgba(30,30,30,0.7)",
            color: isMine ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.45)",
            marginLeft: isMine ? "auto" : undefined,
            marginTop: "-2px",
          }}
        >
          {actionLabel ?? (isMine ? "Скопировать" : "Вставить")}
        </button>
      </div>
    </div>
  );
};

export default MessageBubble;
