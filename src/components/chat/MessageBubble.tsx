import React from "react";

interface Props {
  text: string;
  role: "user" | "girl";
}

const MessageBubble: React.FC<Props> = ({ text, role }) => {
  const isMine = role === "user";

  return (
    <div
      className={`flex ${
        isMine ? "justify-end" : "justify-start"
      } animate-fadeIn`}
    >
      <div
        className="max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-md"
        style={{
          background: isMine
            ? "linear-gradient(135deg, #EF4444 0%, #F43F5E 100%)"
            : "#1E1E1E",
          color: "#FFFFFF",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;
