import React from "react";

interface Props {
  text: string;
  role: "assistant" | "girl";
}

const MessageBubble: React.FC<Props> = ({ text, role }) => {
  const isMine = role === "assistant";

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fadeIn`}
    >
      <div
        className="max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-300"
        style={{
          background: isMine
            ? "linear-gradient(135deg,#3B5BDB 0%,#5C7CFA 100%)"
            : "linear-gradient(135deg,#F8D7DA 0%,#F5C2C7 100%)",
          color: isMine ? "#FFFFFF" : "#5A2D35",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;
