/* 50pick.tz brand system — logo, wordmark, banners, signature shapes.

   Visual idea: every mark encodes the "tipping point" — a circle split
   slightly off-center where YES (emerald) meets NO (rose), with "50"
   sitting on the divider. The slash of "50/50" doubles as the divider.

   Naming: <FiftyMark>, <FiftyWordmark>, <FiftyLockup>, <FiftyFavicon>,
           <TippingBar> (signature progress), <ConfidenceDial>,
           <BannerHero>, <BannerSocial>, <BannerLaunch>, <BannerRegulator>.
*/

// ── Logo: the mark ──────────────────────────────────────────────────────
// A circle split by a tilted divider. YES fills the upper-left wedge,
// NO fills the lower-right wedge. The "50" sits centered on the divider.
const FiftyMark = ({ size = 64, mono = false, inverted = false }) => {
  // Tilt angle of the divider (in degrees from vertical). Positive = leans right at top.
  const tilt = -14;
  const r = 50;
  const cx = 50, cy = 50;

  // Divider line endpoints (extends beyond circle so we can clip).
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 80;
  const dy = Math.cos(rad) * 80;

  // Compute the two wedge paths via SVG arcs.
  // For the YES wedge (upper-left), we go: top-of-divider → arc left → bottom-of-divider → close.
  const top = { x: cx + dx, y: cy - dy };
  const bot = { x: cx - dx, y: cy + dy };

  const yesColor = mono ? (inverted ? 'oklch(96% 0.005 240)' : 'oklch(20% 0.01 240)') : 'oklch(58% 0.16 152)';
  const noColor  = mono ? (inverted ? 'oklch(70% 0.005 240)' : 'oklch(50% 0.01 240)') : 'oklch(60% 0.18 22)';
  const ringColor = mono ? (inverted ? 'oklch(96% 0.005 240)' : 'oklch(20% 0.01 240)') : 'oklch(20% 0.01 240)';
  const numberColor = mono ? (inverted ? 'oklch(15% 0.01 240)' : 'oklch(96% 0.005 240)') : 'oklch(96% 0.005 240)';

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <clipPath id={`fc-${size}`}>
          <circle cx={cx} cy={cy} r={r - 1} />
        </clipPath>
      </defs>
      <g clipPath={`url(#fc-${size})`}>
        {/* YES wedge */}
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={yesColor} />
        {/* NO wedge */}
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={noColor} />
        {/* Divider stroke */}
        <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke={ringColor} strokeWidth="2.4" strokeLinecap="round" />
        {/* The 50 — bisected by the divider */}
        <text
          x={cx} y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontWeight="700"
          fontSize="30"
          fill={numberColor}
          style={{ letterSpacing: '-0.04em' }}
        >50</text>
      </g>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={ringColor} strokeWidth="2" />
    </svg>
  );
};

// ── Logo: the wordmark ──────────────────────────────────────────────────
const FiftyWordmark = ({ size = 32, color = 'currentColor' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'baseline',
    fontFamily: 'Sora, ui-sans-serif, system-ui',
    fontWeight: 700,
    fontSize: size,
    letterSpacing: '-0.03em',
    color,
    lineHeight: 1,
  }}>
    50pick
    <span style={{
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontWeight: 500,
      fontSize: size * 0.55,
      marginLeft: size * 0.04,
      opacity: 0.7,
      letterSpacing: 0,
    }}>.tz</span>
  </span>
);

// ── Logo: lockup (mark + wordmark, side by side) ────────────────────────
const FiftyLockup = ({ size = 36, color = 'currentColor', mono = false, inverted = false }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32 }}>
    <FiftyMark size={size * 1.18} mono={mono} inverted={inverted} />
    <FiftyWordmark size={size} color={color} />
  </div>
);

// ── Favicon variants ────────────────────────────────────────────────────
const FiftyFavicon = ({ size = 32 }) => <FiftyMark size={size} />;

// ── Signature progress: TippingBar ──────────────────────────────────────
// Unique to 50pick. YES grows from center-left, NO grows from center-right.
// A tick mark at the boundary tilts based on how far probability has moved
// from 50/50 — tilt direction shows the "lean" of the market.
const TippingBar = ({ yesPct = 50, height = 28, animate = true, showLabels = true, resolved = null }) => {
  const yes = Math.max(0, Math.min(100, yesPct));
  const no = 100 - yes;
  // Tilt: 0° at 50/50, ±18° at extremes. Direction: right when YES leads.
  const tilt = ((yes - 50) / 50) * 18;
  const ease = animate ? 'width 700ms cubic-bezier(.2,.8,.2,1), transform 700ms cubic-bezier(.2,.8,.2,1)' : 'none';

  return (
    <div style={{ width: '100%' }}>
      {/* Bar */}
      <div style={{
        position: 'relative', height,
        background: 'oklch(22% 0.01 240)',
        borderRadius: height / 2,
        overflow: 'visible',
        boxShadow: 'inset 0 0 0 1px oklch(28% 0.013 240)',
      }}>
        {/* YES fill — anchored to center, grows left */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: 0,
          width: `${yes}%`,
          background: 'linear-gradient(90deg, oklch(50% 0.14 152) 0%, oklch(58% 0.16 152) 100%)',
          borderTopLeftRadius: height / 2,
          borderBottomLeftRadius: height / 2,
          transition: ease,
          boxShadow: '0 0 18px oklch(58% 0.16 152 / 0.35)',
        }} />
        {/* NO fill — anchored to right, grows right */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          right: 0,
          width: `${no}%`,
          background: 'linear-gradient(270deg, oklch(52% 0.16 22) 0%, oklch(60% 0.18 22) 100%)',
          borderTopRightRadius: height / 2,
          borderBottomRightRadius: height / 2,
          transition: ease,
          boxShadow: '0 0 18px oklch(60% 0.18 22 / 0.35)',
        }} />
        {/* Tipping needle — sits on the boundary, tilts with lean */}
        <div style={{
          position: 'absolute',
          left: `calc(${yes}% - 1px)`,
          top: -6, bottom: -6,
          width: 3,
          background: 'oklch(96% 0.005 240)',
          borderRadius: 2,
          transformOrigin: '50% 100%',
          transform: `rotate(${tilt}deg)`,
          transition: ease,
          boxShadow: '0 0 10px oklch(96% 0.005 240 / 0.6)',
        }} />
        {/* Resolved gold shimmer */}
        {resolved && (
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: height / 2, overflow: 'hidden', pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, oklch(75% 0.13 85 / 0.5) 50%, transparent 100%)',
              animation: 'tb-shimmer 1.6s ease-out',
            }} />
          </div>
        )}
      </div>
      {showLabels && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.05em',
        }}>
          <span style={{ color: 'oklch(70% 0.10 152)' }}>
            YES <strong style={{ color: 'oklch(80% 0.13 152)' }}>{yes}%</strong>
          </span>
          <span style={{ color: 'oklch(72% 0.04 240)', fontStyle: 'italic', textTransform: 'uppercase', fontSize: 9 }}>
            {Math.abs(yes - 50) < 3 ? 'tipping' : yes > 50 ? 'leans yes' : 'leans no'}
          </span>
          <span style={{ color: 'oklch(68% 0.10 22)' }}>
            <strong style={{ color: 'oklch(78% 0.14 22)' }}>{no}%</strong> NO
          </span>
        </div>
      )}
      <style>{`
        @keyframes tb-shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

// ── ConfidenceDial — circular tipping shape (mini logo as data-viz) ─────
const ConfidenceDial = ({ yesPct = 62, size = 92, label }) => {
  const yes = Math.max(0, Math.min(100, yesPct));
  // Convert pct (0-100) to an angle on the YES side. 50% = 0° tilt.
  const tilt = ((yes - 50) / 50) * 22;
  const r = 44;
  const cx = 50, cy = 50;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 70;
  const dy = Math.cos(rad) * 70;
  const top = { x: cx + dx, y: cy - dy };
  const bot = { x: cx - dx, y: cy + dy };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <clipPath id={`cd-${size}-${yes}`}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="oklch(15% 0.01 240)" />
        <g clipPath={`url(#cd-${size}-${yes})`}>
          <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`}
                fill="oklch(50% 0.14 152)" opacity="0.92" />
          <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`}
                fill="oklch(52% 0.16 22)" opacity="0.92" />
          <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y}
                stroke="oklch(96% 0.005 240)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(28% 0.013 240)" strokeWidth="1.5" />
        <text x={cx} y={cy + 1.5} textAnchor="middle" dominantBaseline="middle"
              fontFamily="'JetBrains Mono', ui-monospace, monospace"
              fontWeight="700" fontSize="22" fill="oklch(96% 0.005 240)"
              style={{ letterSpacing: '-0.04em' }}>{yes}</text>
      </svg>
      {label && <div style={{ fontSize: 10, color: 'oklch(72% 0.04 240)', fontFamily: 'JetBrains Mono, ui-monospace, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>}
    </div>
  );
};

// ── PulseRing — for live-market badges ──────────────────────────────────
const PulseRing = ({ size = 40, color = 'oklch(58% 0.16 152)', children }) => (
  <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      border: `1.5px solid ${color}`, opacity: 0.6,
      animation: 'pr-pulse 2s ease-out infinite',
    }} />
    {children}
    <style>{`
      @keyframes pr-pulse {
        0%   { transform: scale(0.85); opacity: 0.7; }
        70%  { transform: scale(1.25); opacity: 0; }
        100% { transform: scale(1.25); opacity: 0; }
      }
    `}</style>
  </div>
);

Object.assign(window, {
  FiftyMark, FiftyWordmark, FiftyLockup, FiftyFavicon,
  TippingBar, ConfidenceDial, PulseRing,
});
