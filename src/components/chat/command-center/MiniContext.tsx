import React from "react";
import { Message } from "@/api/chatApi";

interface MiniContextProps {
  messages: Message[];
}

const MiniContext: React.FC<MiniContextProps> = ({ messages }) => {
  if (!messages.length) {
    return (
      <div className="mini-context">
        <div className="mini-context-empty">Диалог только начинается</div>
      </div>
    );
  }

  const latest = messages[messages.length - 1];
  const prefix = latest.role === "girl" ? "Она" : "Ты";
  const text = `${prefix}: ${latest.text ?? ""}`;

  return (
    <div className="mini-context">
      <div className="mini-msg latest">{text}</div>
    </div>
  );
};

export default MiniContext;
