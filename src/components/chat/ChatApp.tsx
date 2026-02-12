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
    if (!telegramId) return;

    setLoading(true);
    try {
      const data = await getConversations(telegramId);

      const safeData = Array.isArray(data)
        ? data.filter((c) => c && c.id)
        : [];

      setConversations(safeData);
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCreate = async () => {
    if (!telegramId) return;

    setLoading(true);
    try {
      const conv = await createConversation(
        telegramId,
        "Новый диалог"
      );

      if (!conv || !conv.id) {
        console.error("Invalid conversation response:", conv);
        return;
      }

      setConversations((prev) => [conv, ...prev.filter((c) => c && c.id)]);
      setActiveConversationId(conv.id);
      setView("chat");
    } catch (e) {
      console.error("Failed to create conversation:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    if (!id) return;
    setActiveConversationId(id);
    setView("chat");
  };

  const handleBack = () => {
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
