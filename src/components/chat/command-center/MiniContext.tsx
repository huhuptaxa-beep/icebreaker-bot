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

  return (
    <div className="mini-context">
      {lastTwo.map((msg) => (
        <div key={msg.id} className="mini-context-row">
          <span className="mini-context-author">{msg.role === "girl" ? "Она" : "Ты"}</span>
          <span className="mini-context-text">{msg.text}</span>
        </div>
      ))}
    </div>
  );
};

export default MiniContext;
