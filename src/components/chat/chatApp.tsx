import React from "react";

interface ChatAppProps {
  telegramId: number;
  onHapticFeedback: (type?: "light" | "medium" | "heavy") => void;
  onHapticSuccess: () => void;
}

const ChatApp: React.FC<ChatAppProps> = () => {
  return (
    <div className="py-4">
      <div className="text-center text-muted-foreground">
        Chat loading...
      </div>
    </div>
  );
};

export default ChatApp;
