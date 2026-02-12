import React, { useState, useEffect, useCallback } from "react";
import {
  Conversation,
  createConversation,
  getConversations,
} from "@/api/chatApi";
import ConversationsPage from "./ConversationsPage";
import ChatPage from "./ChatPage";

interface ChatAppProps {
  telegramId: number | null;
}

const ChatApp: React.FC<ChatAppProps> = ({ telegramId }) => {
  const [view, setView] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!telegramId) {
      console.log("No telegramId for fetching conversations");
      return;
    }

    console.log("Fetching conversations for:", telegramId);

    setLoading(true);
    try {
      const data = await getConversations(telegramId);
      console.log("Fetched conversations:", data);
      setConversations(data);
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
      alert("Ошибка загрузки диалогов");
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCreate = async () => {
    if (!telegramId) {
      console.log("No telegramId for creating conversation");
      alert("Нет Telegram ID");
      return;
    }

    console.log("Creating conversation...");

    setLoading(true);
    try {
      const conv = await createConversation(
        telegramId,
        "Новый диалог"
      );

      console.log("Conversation created:", conv);

      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      setView("chat");
    } catch (e) {
      console.error("Failed to create conversation:", e);
      alert("Ошибка создания диалога");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    console.log("Selecting conversation:", id);
    setActiveConversationId(id);
    setView("chat");
  };

  const handleBack = () => {
    console.log("Back to list");
    setView("list");
    setActiveConversationId(null);
    fetchConversations();
  };

  if (view === "chat" && activeConversationId) {
    return (
      <ChatPage
        conversationId={activeConversationId}
        onBack={handleBack}
      />
    );
  }

  return (
    <ConversationsPage
      conversations={conversations}
      onSelect={handleSelect}
      onCreate={handleCreate}
      loading={loading}
    />
  );
};

export default ChatApp;
