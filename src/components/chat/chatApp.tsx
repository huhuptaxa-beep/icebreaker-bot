import React, { useState } from "react";
import ConversationsPage from "./ConversationsPage";
import ChatPage from "./ChatPage";

interface ChatAppProps {
  telegramId: number;
  onHapticFeedback: (type?: "light" | "medium" | "heavy") => void;
  onHapticSuccess: () => void;
}

const ChatApp: React.FC<ChatAppProps> = ({
  telegramId,
  onHapticFeedback,
  onHapticSuccess,
}) => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  if (!currentConversationId) {
    return (
      <ConversationsPage
        telegramId={telegramId}
        onSelectConversation={setCurrentConversationId}
      />
    );
  }

  return (
    <ChatPage
      conversationId={currentConversationId}
      telegramId={telegramId}
      onBack={() => setCurrentConversationId(null)}
      onHapticFeedback={onHapticFeedback}
      onHapticSuccess={onHapticSuccess}
    />
  );
};

export default ChatApp;
