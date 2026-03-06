import React from "react";

interface BottomNavigationProps {
  onDialogs: () => void;
  onAction: () => void;
  onProfile?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  activeTab: "dialogs" | "chat" | "profile";
  actionPulse?: boolean;
}

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 7C5 5.34315 6.34315 4 8 4H16C17.6569 4 19 5.34315 19 7V13C19 14.6569 17.6569 16 16 16H13L9 20V16H8C6.34315 16 5 14.6569 5 13V7Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 13C8.68629 13 6 15.6863 6 19H18C18 15.6863 15.3137 13 12 13Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const ActionIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M13 3L4 14H11L11 21L20 10H13L13 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  onDialogs,
  onAction,
  onProfile,
  actionDisabled,
  actionLoading,
  activeTab,
  actionPulse,
}) => {
  return (
    <nav className="bottom-navigation">
      <div className={`bottom-nav-column ${activeTab === "dialogs" ? "active" : ""}`}>
        <button onClick={onDialogs} className="bottom-nav-icon" aria-label="Диалоги">
          <ChatIcon />
        </button>
        <span className="bottom-nav-label">Chats</span>
      </div>
      <div className={`bottom-nav-column ${activeTab === "chat" ? "active" : ""}`}>
        <button
          onClick={onAction}
          className={`bottom-nav-action ${actionPulse ? "pulse" : ""}`}
          disabled={actionDisabled}
          aria-label="Главное действие"
        >
          {actionLoading ? <span className="bottom-nav-spinner" /> : <ActionIcon />}
        </button>
        <span className="bottom-nav-label">Action</span>
      </div>
      <div className={`bottom-nav-column ${activeTab === "profile" ? "active" : ""}`}>
        <button onClick={onProfile} className="bottom-nav-icon" aria-label="Профиль">
          <ProfileIcon />
        </button>
        <span className="bottom-nav-label">Profile</span>
      </div>
    </nav>
  );
};

export default BottomNavigation;
