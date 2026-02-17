import React, { useState, useEffect, useCallback } from "react";
import {
  Conversation,
  createConversation,
  getConversations,
  deleteConversation,
} from "@/api/chatApi";
import { useAppToast } from "@/components/ui/AppToast";
import ConversationsPage from "./ConversationsPage";
import ChatPage from "./ChatPage";
import SubscriptionPage from "@/components/SubscriptionPage";

type View = "list" | "chat" | "subscription";

interface ChatAppProps {
  telegramId: number | null;
  onHapticFeedback?: (type: string) => void;
  onHapticSuccess?: () => void;
}

const ChatApp: React.FC<ChatAppProps> = ({ telegramId }) => {
  const { showToast } = useAppToast();
  const [view, setView] = useState<View>("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!telegramId) return;
    setLoading(true);
    try {
      const data = await getConversations();
      setConversations(
        Array.isArray(data) ? data.filter((c) => c && c.id) : []
      );
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* ===========================
     CREATE
  =========================== */

  const handleCreate = async () => {
    if (!telegramId) return;

    const girlName = window.prompt("Введите имя девушки");
    if (!girlName || girlName.trim().length === 0) return;

    setLoading(true);
    try {
      const conv = await createConversation(girlName.trim());
      if (!conv || !conv.id) {
        showToast("Не удалось создать диалог", "error");
        return;
      }
      setConversations((prev) => [conv, ...prev.filter((c) => c && c.id)]);
      setActiveConversationId(conv.id);
      setView("chat");
    } catch {
      showToast("Не удалось создать диалог", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ===========================
     DELETE
  =========================== */

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      showToast("Диалог удалён", "success");
    } catch {
      showToast("Не удалось удалить диалог", "error");
    }
  };

  /* ===========================
     NAVIGATION
  =========================== */

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

  /* ===========================
     RENDER
  =========================== */

  if (view === "subscription") {
    return <SubscriptionPage onBack={() => setView("list")} />;
  }

  if (view === "chat" && activeConversationId) {
    return (
      <div key="chat" className="animate-fadeIn">
        <ChatPage conversationId={activeConversationId} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div key="list" className="animate-fadeIn">
      <ConversationsPage
        conversations={conversations}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onSubscribe={() => setView("subscription")}
        loading={loading}
      />
    </div>
  );
};

export default ChatApp;
