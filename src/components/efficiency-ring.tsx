const STROKE_FRACTION = 0.11;

interface EfficiencyRingProps {
  /** 0-100, or `null` to render "–" (D7: nothing to average). */
  percent: number | null;
  /** Full accessible description, e.g. "Yesterday: 82% of your plan" or "This week: 77% average". */
  srLabel: string;
  /** Small caption under the number, e.g. "of your plan" or "avg this week". */
  caption?: string;
  size?: number;
}

/**
 * ADR-009 §1.2 ④⑤ "% hiệu quả" ring — shared by the welcome-back dialog
 * (one day) and the Insights efficiency section (one week). A single SVG arc
 * (`role="img"`, the percent is also read as plain text inside it, never
 * color alone) over the track color token; the accent is the same indigo
 * used elsewhere for interactive/progress accents (rating selection,
 * "Show all"), not a new color.
 */
export function EfficiencyRing({ percent, srLabel, caption, size = 128 }: EfficiencyRingProps) {
  const stroke = Math.round(size * STROKE_FRACTION);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const dash = (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={srLabel}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--surface-muted)"
        strokeWidth={stroke}
      />
      {percent !== null && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
      <text
        x={center}
        y={caption ? center - size * 0.04 : center + size * 0.07}
        textAnchor="middle"
        fontSize={size * 0.22}
        fontWeight={700}
        fill="currentColor"
      >
        {percent !== null ? `${percent}%` : '–'}
      </text>
      {caption && (
        <text
          x={center}
          y={center + size * 0.18}
          textAnchor="middle"
          fontSize={size * 0.09}
          fill="#71717a"
        >
          {caption}
        </text>
      )}
    </svg>
  );
}
