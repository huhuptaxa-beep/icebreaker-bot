import React from "react";

interface GirlSwitchDotsProps {
  total?: number;
  currentIndex?: number;
}

const GirlSwitchDots: React.FC<GirlSwitchDotsProps> = ({ total = 0, currentIndex = 0 }) => {
  if (!total || total <= 1) return null;
  return (
    <div className="girl-switch-dots">
      {Array.from({ length: total }).map((_, idx) => (
        <span key={idx} className={idx === currentIndex ? "dot-active" : "dot"} />
      ))}
    </div>
  );
};

export default GirlSwitchDots;
