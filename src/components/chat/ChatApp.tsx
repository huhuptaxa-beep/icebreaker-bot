import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Conversation,
  Message,
  createConversation,
  getConversations,
  deleteConversation,
  getSubscription,
} from "@/api/chatApi";
import { useAppToast } from "@/components/ui/AppToast";
import DialogsPage from "./DialogsPage";
import ChatPage, { ChatPageHandle } from "./ChatPage";
import HistoryPage from "./HistoryPage";
import ProfilePage from "./ProfilePage";
import SubscriptionPage from "@/components/SubscriptionPage";
import BottomNavigation from "./command-center/BottomNavigation";

type Screen = "dialogs" | "chat" | "history" | "profile";

interface ChatAppProps {
  telegramId: number | null;
  onHapticFeedback?: (type: string) => void;
  onHapticSuccess?: () => void;
}

interface HistoryView {
  conversationId: string;
  girlName: string;
  messages: Message[];
}

const ChatApp: React.FC<ChatAppProps> = ({ telegramId }) => {
  const { showToast } = useAppToast();
  const [activeScreen, setActiveScreen] = useState<Screen>("dialogs");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState<HistoryView | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | undefined>(undefined);
  const [showSubscription, setShowSubscription] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [newGirlName, setNewGirlName] = useState("");

  const [actionState, setActionState] = useState({ generating: false, canGenerate: false });

  const chatPageRef = useRef<ChatPageHandle>(null);

  useEffect(() => {
    if (activeConversationId) {
      setLastConversationId(activeConversationId);
    }
  }, [activeConversationId]);

  const navActive: "dialogs" | "chat" | "profile" =
    activeScreen === "profile"
      ? "profile"
      : activeScreen === "chat" || activeScreen === "history"
      ? "chat"
      : "dialogs";

  const [actionNudge, setActionNudge] = useState(false);

  const actionPulse =
    activeScreen === "chat" && actionState.canGenerate && !actionState.generating;

  const fetchConversations = useCallback(async () => {
    if (!telegramId) return;
    setLoading(true);
    try {
      const data = await getConversations();
      const normalized = Array.isArray(data) ? data.filter((c) => c && c.id) : [];
      setConversations(normalized);
      setLastConversationId((prev) => prev ?? normalized[0]?.id ?? null);
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
    } catch {
      setBalance(undefined);
    }
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
      setLastConversationId(conv.id);
      setActiveScreen("chat");
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
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setActiveScreen("dialogs");
      }
      if (lastConversationId === id) {
        setLastConversationId(null);
      }
      showToast("Диалог удалён", "success");
    } catch {
      showToast("Не удалось удалить диалог", "error");
    }
  };

  /* ===========================
     NAVIGATION HELPERS
  =========================== */

  const openConversation = (id: string | null) => {
    if (!id) return;
    setActiveConversationId(id);
    setLastConversationId(id);
    setActiveScreen("chat");
  };

  const handleSelect = (id: string) => {
    openConversation(id);
  };

  const handleBackToDialogs = () => {
    if (activeConversationId) {
      setLastConversationId(activeConversationId);
    }
    setActiveScreen("dialogs");
    fetchConversations();
  };

  const handleOpenHistory = (payload: HistoryView) => {
    setHistoryView(payload);
    setActiveScreen("history");
  };

  const handleHistoryBack = () => {
    setHistoryView(null);
    setActiveScreen("chat");
  };

  const handleProfileOpen = () => {
    setActiveScreen("profile");
  };

  const handleDialogsOpen = () => {
    setActiveScreen("dialogs");
  };

  const handleAction = () => {
    if (activeScreen === "chat") {
      if (!actionState.generating && actionState.canGenerate) {
        chatPageRef.current?.triggerGenerate();
      }
      return;
    }
    const fallback = lastConversationId ?? conversations[0]?.id ?? null;
    if (fallback) {
      openConversation(fallback);
    } else {
      showToast("Нет активных диалогов", "warning");
    }
  };

  const actionDisabled = activeScreen === "chat"
    ? (!actionState.canGenerate || actionState.generating)
    : conversations.length === 0;
  const actionLoading = activeScreen === "chat" ? actionState.generating : false;

  /* ===========================
     SCREEN CONTENT
  =========================== */

  const activeIndex = activeConversationId
    ? conversations.findIndex((c) => c.id === activeConversationId)
    : -1;
  const prevConversationId =
    activeIndex > 0 ? conversations[activeIndex - 1]?.id ?? null : null;
  const nextConversationId =
    activeIndex >= 0 && activeIndex < conversations.length - 1
      ? conversations[activeIndex + 1]?.id ?? null
      : null;

  const handlePrevConversation =
    prevConversationId !== null ? () => openConversation(prevConversationId) : undefined;
  const handleNextConversation =
    nextConversationId !== null ? () => openConversation(nextConversationId) : undefined;

  let screenContent: React.ReactNode = null;

  if (activeScreen === "chat" && activeConversationId) {
    screenContent = (
      <ChatPage
        ref={chatPageRef}
        conversationId={activeConversationId}
        onBack={handleBackToDialogs}
        onSubscribe={() => setShowSubscription(true)}
        onPrevConversation={handlePrevConversation}
        onNextConversation={handleNextConversation}
        onOpenHistory={handleOpenHistory}
        onActionStateChange={setActionState}
        onActionNudgeChange={setActionNudge}
      />
    );
  } else if (activeScreen === "history" && historyView) {
    screenContent = (
      <HistoryPage
        girlName={historyView.girlName}
        messages={historyView.messages}
        onBack={handleHistoryBack}
      />
    );
  } else if (activeScreen === "profile") {
    screenContent = (
      <ProfilePage telegramId={telegramId} conversations={conversations} balance={balance} />
    );
  } else {
    screenContent = (
      <DialogsPage
        conversations={conversations}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onSubscribe={() => setShowSubscription(true)}
        loading={loading}
        balance={balance}
      />
    );
  }

  return (
    <>
      <div className="min-h-[100dvh] relative">{screenContent}</div>

      <BottomNavigation
        onDialogs={handleDialogsOpen}
        onAction={handleAction}
        onProfile={handleProfileOpen}
        actionDisabled={actionDisabled}
        actionLoading={actionLoading}
        activeTab={navActive}
        actionPulse={actionPulse}
        actionNudge={actionNudge}
      />

      {/* Subscription overlay */}
      {showSubscription && (
        <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.8)" }}>
          <SubscriptionPage onBack={() => setShowSubscription(false)} />
        </div>
      )}

      {/* Name input modal */}
      {showNameModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowNameModal(false)}
        >
          <div
            className="mx-6 w-full max-w-sm rounded-2xl p-6"
            style={{
              background: "rgba(15, 15, 18, 0.95)",
              border: "0.5px solid rgba(200, 200, 220, 0.08)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="font-bold text-lg mb-4"
              style={{ color: "rgba(255, 255, 255, 0.9)" }}
            >
              Имя девушки
            </h2>
            <input
              type="text"
              value={newGirlName}
              onChange={(e) => setNewGirlName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmCreate()}
              placeholder="Введи имя..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white placeholder:text-gray-600"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "0.5px solid rgba(200, 200, 220, 0.1)",
              }}
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "rgba(200, 200, 220, 0.4)",
                  border: "0.5px solid rgba(200, 200, 220, 0.06)",
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmCreate}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #AD8B3A, #F9E076)",
                  color: "#050505",
                  boxShadow: "0 4px 15px rgba(212, 175, 55, 0.25)",
                }}
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
