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
    } catch { }
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fadeIn`}>
      <div className="max-w-[75%]">
        <div
          className="relative z-10 px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed"
          style={{
            background: isMine
              ? "linear-gradient(135deg, rgba(55, 55, 65, 0.95) 0%, rgba(70, 70, 80, 0.9) 50%, rgba(50, 50, 60, 0.95) 100%)"
              : "linear-gradient(135deg, rgba(35, 35, 42, 0.9), rgba(30, 30, 38, 0.95))",
            color: "#FFFFFF",
            border: isMine
              ? "0.5px solid rgba(212, 175, 55, 0.2)"
              : "0.5px solid rgba(200, 200, 220, 0.08)",
            boxShadow: isMine
              ? "0 4px 15px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(200, 200, 220, 0.04)"
              : "0 2px 10px rgba(0, 0, 0, 0.2)",
          }}
        >
          {text}
        </div>
        {isMine && (
          <button
            onClick={handleCopy}
            className="relative z-0 text-xs rounded-br-lg transition-colors font-medium"
            style={{
              display: "block",
              width: "50%",
              height: 34,
              marginTop: -16,
              paddingTop: 18,
              paddingBottom: 4,
              marginLeft: "auto",
              background: "rgba(45, 45, 55, 0.7)",
              color: "rgba(212, 175, 55, 0.5)",
              textAlign: "right",
              paddingRight: 10,
              clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 20% 100%)",
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