import React, { useEffect, useRef } from 'react';

const getColor = (score) => {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

export default function ScoreRing({ score, size = 72 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = getColor(score);

  return (
    <div className="score-ring-wrap">
      <div className="score-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle className="track" cx={size / 2} cy={size / 2} r={r} />
          <circle
            className="fill"
            cx={size / 2} cy={size / 2} r={r}
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease' }}
          />
        </svg>
        <div className="score-label">
          <span className="num" style={{ color }}>{Math.round(score)}</span>
          <span className="pct">/ 100</span>
        </div>
      </div>
    </div>
  );
}
