import React, { useState } from "react";

interface Props {
  text: string;
  role: "user" | "girl";
  onPaste?: (text: string) => void;
  showPaste?: boolean;
}

const TRAPEZOID_CLIP = "polygon(5% 0%, 95% 0%, 80% 100%, 20% 100%)";

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
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fadeIn`}>
      <div className="max-w-[70%]">
        <div
          className="relative z-10 px-4 py-3 rounded-2xl text-sm shadow-md"
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
            className="relative z-0 w-full text-xs transition-colors"
            style={{
              height: 30,
              marginTop: -12,
              paddingTop: 16,
              paddingBottom: 2,
              clipPath: TRAPEZOID_CLIP,
              background: isMine ? "#B91C1C" : "#161616",
              color: isMine ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)",
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
