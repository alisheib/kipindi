/**
 * Abstract top-down football pitch — no team marks, no real broadcast.
 * Pure geometric, brand-aligned.
 */
export function PitchGraphic({ className }: { className?: string }) {
  const stroke = "var(--gold)";
  return (
    <svg viewBox="0 0 320 480" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id="kp-pitch-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0A1838" />
          <stop offset="50%"  stopColor="#102356" />
          <stop offset="100%" stopColor="#060F24" />
        </linearGradient>
        <linearGradient id="kp-pitch-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#DEBC54" stopOpacity={0.18} />
          <stop offset="50%"  stopColor="#DEBC54" stopOpacity={0} />
          <stop offset="100%" stopColor="#DEBC54" stopOpacity={0.18} />
        </linearGradient>
      </defs>
      <rect width={320} height={480} rx={16} fill="url(#kp-pitch-bg)" />
      <rect width={320} height={480} rx={16} fill="url(#kp-pitch-glow)" />
      <g fill="none" stroke={stroke} strokeOpacity={0.55} strokeWidth={1.25}>
        {/* outer */}
        <rect x={20} y={20} width={280} height={440} rx={2} />
        {/* halfway */}
        <line x1={20} y1={240} x2={300} y2={240} />
        <circle cx={160} cy={240} r={42} />
        <circle cx={160} cy={240} r={2} fill={stroke} />
        {/* top box (penalty) */}
        <rect x={70} y={20} width={180} height={68} />
        <rect x={120} y={20} width={80} height={26} />
        <path d="M 130 88 A 30 30 0 0 0 190 88" />
        <circle cx={160} cy={62} r={1.5} fill={stroke} />
        {/* bottom box */}
        <rect x={70} y={392} width={180} height={68} />
        <rect x={120} y={434} width={80} height={26} />
        <path d="M 130 392 A 30 30 0 0 1 190 392" />
        <circle cx={160} cy={418} r={1.5} fill={stroke} />
        {/* corners */}
        <path d="M 20 28 A 8 8 0 0 1 28 20" />
        <path d="M 300 28 A 8 8 0 0 0 292 20" />
        <path d="M 20 452 A 8 8 0 0 0 28 460" />
        <path d="M 300 452 A 8 8 0 0 1 292 460" />
      </g>
      {/* heatmap dots — abstract event clusters */}
      <g fill="#DEBC54">
        <circle cx={130} cy={120} r={4} opacity={0.28} />
        <circle cx={195} cy={155} r={6} opacity={0.45} />
        <circle cx={170} cy={210} r={3} opacity={0.22} />
        <circle cx={150} cy={290} r={5} opacity={0.35} />
        <circle cx={210} cy={345} r={8} opacity={0.55} />
        <circle cx={140} cy={400} r={4} opacity={0.30} />
      </g>
      {/* flowing motion line */}
      <path
        d="M 130 120 Q 200 180 195 155 Q 180 200 170 210 Q 160 280 150 290 Q 195 320 210 345 Q 175 380 140 400"
        stroke="#DEBC54"
        strokeWidth={1}
        strokeOpacity={0.4}
        strokeDasharray="3 3"
        fill="none"
      />
    </svg>
  );
}
