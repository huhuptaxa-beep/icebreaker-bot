import React from "react";

interface MessageBubbleProps {
  text: string;
  role: "user" | "girl";
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ text, role }) => {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className="px-4 py-2.5 text-sm leading-relaxed"
        style={{
          maxWidth: "70%",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser ? "#4F7CFF" : "#FFFFFF",
          color: isUser ? "#FFFFFF" : "#1A1A1A",
          border: isUser ? "none" : "1px solid #E6E8F0",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;
