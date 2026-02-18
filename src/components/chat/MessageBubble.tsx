import React, { useState } from "react";

interface Props {
  text: string;
  role: "user" | "girl";
}

const MessageBubble: React.FC<Props> = ({ text, role }) => {
  const isMine = role === "user";
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setActionLabel("Скопировано ✓");
      setTimeout(() => setActionLabel(null), 1500);
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
        {isMine && (
          <button
            onClick={handleCopy}
            className="relative z-0 text-xs rounded-br-lg transition-colors"
            style={{
              display: "block",
              width: "40%",
              height: 34,
              marginTop: -16,
              paddingTop: 18,
              paddingBottom: 4,
              marginLeft: "auto",
              background: "#B91C1C",
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              clipPath: "polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%)",
            }}
          >
            {actionLabel ?? "Скопировать"}
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
