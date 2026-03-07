import React from "react";
import { Message } from "@/api/chatApi";

interface MiniContextProps {
  messages: Message[];
}

const MiniContext: React.FC<MiniContextProps> = ({ messages }) => {
  const lastTwo = messages.slice(-2);
  if (!lastTwo.length) {
    return (
      <div className="mini-context">
        <div className="mini-context-empty">Диалог только начинается</div>
      </div>
    );
  }

  const girlMessage = [...lastTwo].reverse().find((msg) => msg.role === "girl");
  const userMessage = [...lastTwo].reverse().find((msg) => msg.role !== "girl");

  return (
    <div className="mini-chat">
      {girlMessage && <div className="mini-msg girl">{girlMessage.text}</div>}
      {userMessage && <div className="mini-msg user">{userMessage.text}</div>}
    </div>
  );
};

export default MiniContext;
