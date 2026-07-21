interface ScoreDialProps {
  score: number; // 0..100
  label?: string;
}

/** 270° SVG arc dial for any 0-100 gauge (momentum score, fear & greed…). */
export default function ScoreDial({ score, label = 'SCORE' }: ScoreDialProps) {
  const size = 64;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.75; // 270°
  const track = circumference * arcFraction;
  const fill = track * (score / 100);
  const color = score >= 58 ? 'var(--up)' : score >= 43 ? 'var(--neutral)' : 'var(--down)';
  // rotate so the 270° gap sits at the bottom
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Momentum score ${score} out of 100`}>
      <g transform={`rotate(135 ${c} ${c})`}>
        <circle
          cx={c} cy={c} r={r} fill="none"
          stroke="rgba(148,178,255,0.12)" strokeWidth={stroke}
          strokeDasharray={`${track} ${circumference}`} strokeLinecap="round"
        />
        <circle
          cx={c} cy={c} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circumference}`} strokeLinecap="round"
        />
      </g>
      <text
        x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle"
        fill="var(--text)" fontSize="17" fontWeight="700" fontFamily="var(--font-mono)"
      >
        {score}
      </text>
      <text x={c} y={c + 15} textAnchor="middle" fill="var(--text-faint)" fontSize="7" letterSpacing="1" fontFamily="var(--font-mono)">
        {label}
      </text>
    </svg>
  );
}
