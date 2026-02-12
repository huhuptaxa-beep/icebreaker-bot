import React from "react";

interface Props {
  text: string;
  role: "assistant" | "girl" | "user";
}

const MessageBubble: React.FC<Props> = ({ text, role }) => {
  const isGirl = role === "girl";
  const isUser = role === "assistant" || role === "user";

  return (
    <div
      className={`flex mb-3 ${
        isGirl ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className="px-4 py-3 rounded-2xl max-w-[75%] text-sm font-medium"
        style={
          isGirl
            ? {
                background: "linear-gradient(135deg, #FFE6EC, #FFD4E0)",
                color: "#5A1A2B",
              }
            : {
                background: "linear-gradient(135deg, #4F7CFF, #6F95FF)",
                color: "#FFFFFF",
              }
        }
      >
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;
