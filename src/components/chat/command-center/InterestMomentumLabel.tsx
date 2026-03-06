import React from "react";

interface InterestMomentumLabelProps {
  tone: "positive" | "neutral" | "negative";
  children: React.ReactNode;
}

const toneColors: Record<InterestMomentumLabelProps["tone"], string> = {
  positive: "rgba(74, 222, 128, 0.9)",
  neutral: "rgba(200, 200, 220, 0.65)",
  negative: "rgba(248, 113, 113, 0.9)",
};

const InterestMomentumLabel: React.FC<InterestMomentumLabelProps> = ({ tone, children }) => {
  return (
    <span
      className="interest-momentum-label"
      style={{
        color: toneColors[tone],
        borderColor: toneColors[tone],
      }}
    >
      {children}
    </span>
  );
};

export default InterestMomentumLabel;
