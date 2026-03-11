import React, { useEffect, useMemo, useRef, useState } from "react";
import { Message, getConversation } from "@/api/chatApi";

interface HistoryPageProps {
  conversationId: string;
  girlName: string;
  messages: Message[];
  onBack: () => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({
  conversationId,
  girlName,
  messages,
  onBack,
}) => {
  const [timelineMessages, setTimelineMessages] = useState<Message[]>(messages);
  const [telegramMessageCount, setTelegramMessageCount] = useState(0);
  const [conversationChannel, setConversationChannel] = useState<"app" | "telegram">("app");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTimelineMessages(messages);
  }, [messages, conversationId]);

  useEffect(() => {
    let isCancelled = false;

    const loadRawConversation = async () => {
      setLoadingHistory(true);
      try {
        const data = await getConversation(conversationId);
        if (isCancelled) return;
        setTimelineMessages(data.messages || []);
        setTelegramMessageCount(data.message_count_tg || 0);
        setConversationChannel(data.channel === "telegram" ? "telegram" : "app");
      } catch (error) {
        if (!isCancelled) {
          console.error("History fetch failed:", error);
        }
      } finally {
        if (!isCancelled) {
          setLoadingHistory(false);
        }
      }
    };

    loadRawConversation();

    return () => {
      isCancelled = true;
    };
  }, [conversationId]);

  const sortedMessages = useMemo(() => {
    return [...timelineMessages]
      .map((message, originalIndex) => ({ message, originalIndex }))
      .sort((a, b) => {
        const aTime = Date.parse(a.message.created_at || "");
        const bTime = Date.parse(b.message.created_at || "");
        const safeATime = Number.isNaN(aTime) ? 0 : aTime;
        const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
        if (safeATime !== safeBTime) {
          return safeATime - safeBTime;
        }
        return a.originalIndex - b.originalIndex;
      })
      .map((item) => item.message);
  }, [timelineMessages]);

  const firstTelegramIndex = useMemo(() => {
    if (conversationChannel !== "telegram") return null;
    if (telegramMessageCount <= 0) return null;
    if (telegramMessageCount > sortedMessages.length) return null;
    const index = sortedMessages.length - telegramMessageCount;
    return index >= 0 && index < sortedMessages.length ? index : null;
  }, [conversationChannel, sortedMessages.length, telegramMessageCount]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [sortedMessages.length, conversationId]);

  return (
    <div
      className="flex flex-col min-h-[100dvh] animate-fadeIn"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #1A1A22 0%, #0E0E12 60%, #0A0A0D 100%)",
        paddingBottom: "calc(120px + env(safe-area-inset-bottom))",
      }}
    >
      <header
        className="px-5 pt-6 pb-4 flex items-center gap-3"
        style={{
          background: "rgba(5, 5, 5, 0.92)",
          borderBottom: "0.5px solid rgba(200, 200, 220, 0.08)",
        }}
      >
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "0.5px solid rgba(200, 200, 220, 0.12)",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          ← Back to AI
        </button>
        <div className="flex-1">
          <p className="text-xs tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
            История переписки
          </p>
          <h2 className="text-xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
            {girlName}
          </h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4" ref={scrollRef}>
        {loadingHistory && (
          <p className="text-center text-xs tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
            Обновляю историю…
          </p>
        )}
        {sortedMessages.length === 0 && (
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Переписка пуста. Напиши ей первым!
          </p>
        )}
        {sortedMessages.map((message, index) => {
          const isGirl = message.role === "girl";
          return (
            <React.Fragment key={`${message.id}-${index}`}>
              {firstTelegramIndex === index && (
                <div className="flex items-center gap-3 py-1">
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(212, 218, 226, 0.75), transparent)",
                    }}
                  />
                  <span
                    className="text-[10px] font-semibold tracking-[0.22em] uppercase"
                    style={{
                      color: "rgba(230, 235, 242, 0.9)",
                      textShadow: "0 1px 8px rgba(200, 210, 220, 0.25)",
                    }}
                  >
                    Переход в Telegram
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(212, 218, 226, 0.75), transparent)",
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-semibold tracking-wide"
                  style={{ color: isGirl ? "#F9E076" : "rgba(255,255,255,0.6)" }}
                >
                  {isGirl ? "Она" : "Ты"}
                </span>
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: isGirl ? "rgba(249, 224, 118, 0.08)" : "rgba(255, 255, 255, 0.05)",
                    border: isGirl
                      ? "1px solid rgba(249, 224, 118, 0.3)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.92)",
                  }}
                >
                  {message.text}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryPage;
