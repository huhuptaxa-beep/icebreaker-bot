import React from "react";

interface HeartAnalysisProps {
  percent: number;
  statusText: string;
  diffLabel?: string | null;
  emitParticles?: boolean;
  prefersReducedMotion?: boolean;
}

const HEART_WIDTH = 200;
const HEART_HEIGHT = 180;
const HEART_PATH =
  "M100 170 L25 95 C-5 55 10 0 70 15 C100 25 120 45 100 80 C80 45 100 25 130 15 C190 0 205 55 175 95 Z";

const HeartAnalysis: React.FC<HeartAnalysisProps> = ({
  percent,
  statusText,
  diffLabel,
  emitParticles,
  prefersReducedMotion,
}) => {
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const fillHeight = (clamped / 100) * HEART_HEIGHT;
  const fillY = HEART_HEIGHT - fillHeight;

  const linePositions = [55, 85, 115, 145];

  return (
    <div className="heart-analysis" aria-live="polite">
      {diffLabel && <div className="heart-diff-label">{diffLabel}</div>}
      <div className="heart-stage">
        <svg
          width={HEART_WIDTH}
          height={HEART_HEIGHT}
          viewBox={`0 0 ${HEART_WIDTH} ${HEART_HEIGHT}`}
          className="heart-svg"
        >
          <defs>
            <linearGradient id="heartFillGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#9b7930" />
              <stop offset="35%" stopColor="#c9a14a" />
              <stop offset="100%" stopColor="#f9e076" />
            </linearGradient>
            <clipPath id="heartClip">
              <path d={HEART_PATH} />
            </clipPath>
          </defs>
          <g clipPath="url(#heartClip)">
            <rect
              width={HEART_WIDTH}
              height={fillHeight}
              x={0}
              y={fillY}
              fill="url(#heartFillGradient)"
              style={{
                transition: prefersReducedMotion
                  ? "none"
                  : "height 500ms cubic-bezier(0.33, 1, 0.68, 1), y 500ms cubic-bezier(0.33, 1, 0.68, 1)",
              }}
            />
            {linePositions.map((y) => (
              <line
                key={y}
                x1={35}
                x2={165}
                y1={y}
                y2={y}
                stroke="rgba(201, 161, 74, 0.25)"
                strokeWidth={1.2}
                strokeDasharray="6 8"
              />
            ))}
          </g>
          <path d={HEART_PATH} fill="none" stroke="#C9A14A" strokeWidth={5} />
        </svg>
        {emitParticles && !prefersReducedMotion && (
          <div className="heart-particles">
            {Array.from({ length: 8 }).map((_, idx) => (
              <span key={idx} className={`heart-particle heart-particle-${idx + 1}`} />
            ))}
          </div>
        )}
      </div>
      <p className="heart-status-text">{statusText}</p>
    </div>
  );
};

export default HeartAnalysis;
