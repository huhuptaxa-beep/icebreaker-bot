import React from "react";

interface InterestGradientBarProps {
  value: number;
}

const InterestGradientBar: React.FC<InterestGradientBarProps> = ({ value }) => {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const gradient =
    clamped >= 100
      ? "linear-gradient(90deg, #F7C35F, #FFD977)"
      : "linear-gradient(90deg, #FF2E4D, #FF5A5F)";

  return (
    <div className="interest-gradient-bar">
      <div className="interest-gradient-fill" style={{ width: `${clamped}%`, background: gradient }} />
    </div>
  );
};

export default InterestGradientBar;
