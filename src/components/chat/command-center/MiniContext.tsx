import React, { useEffect, useRef, useState } from "react";
import { Message } from "@/api/chatApi";

interface MiniContextProps {
  messages: Message[];
}

const MiniContext: React.FC<MiniContextProps> = ({ messages }) => {
  const [animatedId, setAnimatedId] = useState<string | null>(null);
  const lastGirlIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const latestGirl = [...messages].reverse().find((msg) => msg.role === "girl");
    const latestGirlId = latestGirl?.id ?? null;
    if (latestGirlId && latestGirlId !== lastGirlIdRef.current) {
      lastGirlIdRef.current = latestGirlId;
      setAnimatedId(latestGirlId);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setAnimatedId(null);
        timerRef.current = null;
      }, 320);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [messages]);

  const recentMessages = messages.slice(-2);

  if (!recentMessages.length) {
    return (
      <div className="chat-content">
        <div className="mini-context-empty">Диалог только начинается</div>
      </div>
    );
  }

  return (
    <div className="chat-content">
      {recentMessages.map((msg) => (
        <div
          key={msg.id}
          className={`mini-msg ${msg.role === "girl" ? "girl" : "user"}${animatedId === msg.id ? " msg-enter" : ""}`}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
};

export default MiniContext;
