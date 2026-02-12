import React from "react";
import { Conversation } from "@/api/chatApi";

interface ConversationsPageProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading?: boolean;
}

const ConversationsPage: React.FC<ConversationsPageProps> = ({
  conversations,
  onSelect,
  onCreate,
  loading,
}) => {
  const safeConversations = Array.isArray(conversations)
    ? conversations.filter((conv) => conv && conv.id)
    : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F6F7FB" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E6E8F0" }}
      >
        <h1 className="text-lg font-semibold" style={{ color: "#1A1A1A" }}>
          Диалоги
        </h1>

        <button
          onClick={onCreate}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium transition-colors active:scale-95 disabled:opacity-50"
          style={{
            background: "#4F7CFF",
            color: "#FFFFFF",
            borderRadius: "16px",
          }}
        >
          + Новый диалог
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {safeConversations.length === 0 && !loading && (
          <div
            className="flex items-center justify-center h-40 text-sm"
            style={{ color: "#8B8FA3" }}
          >
            Нет диалогов. Создай первый!
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#4F7CFF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {safeConversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className="w-full text-left px-4 py-3.5 transition-colors active:bg-[#EEF0F6]"
            style={{ borderBottom: "1px solid #E6E8F0", background: "#FFFFFF" }}
          >
            <div
              className="text-sm font-medium"
              style={{ color: "#1A1A1A" }}
            >
              {conv.girl_name || "Новый диалог"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConversationsPage;
