import React from "react";

interface BottomNavigationProps {
  onDialogs: () => void;
  onAction: () => void;
  onProfile?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  onDialogs,
  onAction,
  onProfile,
  actionDisabled,
  actionLoading,
}) => {
  return (
    <nav className="bottom-navigation">
      <button onClick={onDialogs} className="bottom-nav-btn">
        Диалоги
      </button>
      <button
        onClick={onAction}
        className="bottom-nav-action"
        disabled={actionDisabled}
      >
        {actionLoading ? "..." : "Сделать шаг"}
      </button>
      <button onClick={onProfile} className="bottom-nav-btn">
        Профиль
      </button>
    </nav>
  );
};

export default BottomNavigation;
