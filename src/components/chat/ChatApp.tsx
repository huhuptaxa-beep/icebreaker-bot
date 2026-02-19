import React, { useState, useEffect, useCallback } from "react";
import {
  Conversation,
  createConversation,
  getConversations,
  deleteConversation,
  getSubscription,
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

  const [balance, setBalance] = useState<number | undefined>(undefined);

  const [showNameModal, setShowNameModal] = useState(false);
  const [newGirlName, setNewGirlName] = useState("");

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

  const fetchBalance = useCallback(async () => {
    try {
      const sub = await getSubscription();
      setBalance(sub.free_remaining + sub.paid_remaining);
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchBalance();
  }, [fetchConversations, fetchBalance]);

  /* ===========================
     CREATE
  =========================== */

  const handleCreate = () => {
    setNewGirlName("");
    setShowNameModal(true);
  };

  const handleConfirmCreate = async () => {
    const name = newGirlName.trim();
    if (!name || !telegramId) return;

    setShowNameModal(false);
    setLoading(true);
    try {
      const conv = await createConversation(name);
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
        <ChatPage
          conversationId={activeConversationId}
          onBack={handleBack}
          onSubscribe={() => setView("subscription")}
        />
      </div>
    );
  }

  return (
    <>
      <div key="list" className="animate-fadeIn">
        <ConversationsPage
          conversations={conversations}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onSubscribe={() => setView("subscription")}
          loading={loading}
          balance={balance}
        />
      </div>

      {showNameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowNameModal(false)}
        >
          <div
            className="mx-6 w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#1A1A1A" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-semibold text-lg mb-4">Имя девушки</h2>
            <input
              type="text"
              value={newGirlName}
              onChange={(e) => setNewGirlName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmCreate()}
              placeholder="Введи имя..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white placeholder:text-gray-600"
              style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400"
                style={{ background: "#111111" }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmCreate}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #EF4444, #F43F5E)" }}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatApp;
