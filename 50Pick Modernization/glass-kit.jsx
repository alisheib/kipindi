// glass-kit.jsx — Direction A shared primitives for 50pick
// Exports to window at the end so sibling Babel scripts can use them.
// Hues locked; only surface/depth/glow/motion are "Dark Glass".

const { useState, useEffect, useRef, useCallback } = React;

/* ============================================================
   Glyphs — heraldic line icons, 24 viewBox, ~1.9 stroke, currentColor
   ============================================================ */
const Ico = ({ d, size = 20, fill = 'none', sw = 1.9, style, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>{children || <path d={d} />}</svg>
);
const Glyph = {
  football: (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3l2.6 2.2-1 3.3h-3.2l-1-3.3zM3.3 9.8l3.2.2 1.2 3.1-2.4 2.2-2.4-1.6zm17.4 0l-1.6 3.9-2.4-2.2 1.2-3.1 3.2-.2zM8.4 19.4l-1.1-3 2.4-2 2.3 2-1.1 3zm7.2 0l-2.5-.1-1.1-3 2.3-2 2.4 2z"/></Ico>,
  forex: (p) => <Ico {...p}><path d="M4 18V6M4 6l3.5 7L11 6M15 6h5M15 6v12M15 11h4"/><path d="M20 18l-2-2 2-2"/></Ico>,
  crypto: (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h4a2 2 0 010 4h-4zm0 4h4.3a2 2 0 010 4H9.5zM11 6.5v2M11 15.5v2M13 6.5v2M13 15.5v2"/></Ico>,
  weather: (p) => <Ico {...p}><path d="M7 16a4 4 0 01-.5-7.97A5 5 0 0116.5 9 3.5 3.5 0 0117 16z"/><path d="M8 20l-1 1.5M12 20l-1 1.5M16 20l-1 1.5"/></Ico>,
  economy: (p) => <Ico {...p}><path d="M4 19h16M7 19v-6M11 19V8M15 19v-9M19 19V5"/></Ico>,
  entertainment: (p) => <Ico {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></Ico>,
  tech: (p) => <Ico {...p}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></Ico>,
  trade: (p) => <Ico {...p}><path d="M4 7h13l-3-3M20 17H7l3 3"/></Ico>,
  watch: (p) => <Ico {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/></Ico>,
  share: (p) => <Ico {...p}><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6"/></Ico>,
  comment: (p) => <Ico {...p}><path d="M4 5h16v11H9l-4 3z"/></Ico>,
  bell: (p) => <Ico {...p}><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0"/></Ico>,
  search: (p) => <Ico {...p}><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></Ico>,
  filter: (p) => <Ico {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z"/></Ico>,
  plus: (p) => <Ico {...p}><path d="M12 5v14M5 12h14"/></Ico>,
  home: (p) => <Ico {...p}><path d="M4 11l8-7 8 7M6 10v9h12v-9"/></Ico>,
  markets: (p) => <Ico {...p}><path d="M4 19V9l5-4 5 3 6-4v15z"/></Ico>,
  trophy: (p) => <Ico {...p}><path d="M7 4h10v4a5 5 0 01-10 0zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M9 14h6l-1 4h-4z"/></Ico>,
  profile: (p) => <Ico {...p}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0114 0"/></Ico>,
  wallet: (p) => <Ico {...p}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 9h18M16 13h2"/></Ico>,
  bolt: (p) => <Ico {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></Ico>,
  shieldcheck: (p) => <Ico {...p}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M8.5 12l2.5 2.5L16 9"/></Ico>,
  crown: (p) => <Ico {...p}><path d="M4 18h16M4 18l-1-9 5 4 4-7 4 7 5-4-1 9"/></Ico>,
  flame: (p) => <Ico {...p}><path d="M12 3c1 4 5 5 5 9a5 5 0 01-10 0c0-2 1-3 2-4 .5 1.5 1.5 2 2 2 0-2-1-4 1-7z"/></Ico>,
  clock: (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>,
  check: (p) => <Ico {...p}><path d="M5 12.5l4.5 4.5L19 7"/></Ico>,
  x: (p) => <Ico {...p}><path d="M6 6l12 12M18 6L6 18"/></Ico>,
  chevdown: (p) => <Ico {...p}><path d="M5 8l7 7 7-7"/></Ico>,
  arrowdown: (p) => <Ico {...p}><path d="M12 4v16M6 14l6 6 6-6"/></Ico>,
  arrowup: (p) => <Ico {...p}><path d="M12 20V4M6 10l6-6 6 6"/></Ico>,
  spark: (p) => <Ico {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></Ico>,
  globe: (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 2.6 15 0 18M12 3c-2.6 2.5-2.6 15 0 18"/></Ico>,
  cash: (p) => <Ico {...p}><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v6M18 9v6"/></Ico>,
};

/* ============================================================
   Brand — FiftyMark (operator wordmark slot, here "50pick")
   ============================================================ */
const FiftyMark = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="fm-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--gold-300)"/>
        <stop offset="1" stopColor="var(--gold-600)"/>
      </linearGradient>
    </defs>
    <path d="M20 3l14.7 8.5v17L20 37 5.3 28.5v-17z" stroke="var(--royal-400)" strokeWidth="1.4" opacity="0.5"/>
    <path d="M20 8.5l9.9 5.7v11.6L20 31.5l-9.9-5.7V14.2z" fill="oklch(20% 0.08 268 / 0.6)" stroke="url(#fm-g)" strokeWidth="1.6"/>
    <path d="M16 14.5h7.5M16 14.5v4.5h3.5a2.5 2.5 0 010 5H16" stroke="url(#fm-g)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);
const Wordmark = ({ size = 19 }) => (
  <span className="disp" style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.03em', color: 'var(--text)' }}>
    50<span style={{ color: 'var(--gold-400)' }}>pick</span>
  </span>
);

/* ============================================================
   GlassButton — glass + inner glow + spring hover/press
   variants: gold | yes | no | ghost   sizes: sm|md|lg|xl
   ============================================================ */
const BTN_H = { sm: 34, md: 40, lg: 46, xl: 56 };
function GlassButton({ variant = 'ghost', size = 'md', children, leading, trailing, full, onClick, style, title }) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const h = BTN_H[size];
  const isGold = variant === 'gold';
  const fill = { gold: 'var(--btn-gold-glass)', yes: 'var(--btn-yes-glass)', no: 'var(--btn-no-glass)', ghost: 'var(--btn-ghost-glass)' }[variant];
  const fg = isGold ? 'oklch(22% 0.06 80)' : variant === 'yes' ? 'var(--yes-300)' : variant === 'no' ? 'var(--no-300)' : 'var(--text)';
  const ring = { gold: 'var(--glow-gold-soft)', yes: 'var(--glow-yes-soft)', no: 'var(--glow-no-soft)', ghost: 'none' }[variant];
  const borderC = isGold ? 'oklch(92% 0.08 84 / 0.5)' : variant === 'yes' ? 'oklch(72% 0.14 152 / 0.45)' : variant === 'no' ? 'oklch(70% 0.16 22 / 0.45)' : 'var(--glass-border)';
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        height: h, width: full ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        padding: `0 ${size === 'xl' ? 26 : size === 'sm' ? 14 : 20}px`,
        font: `600 ${size === 'xl' ? 17 : size === 'sm' ? 13 : 15}px var(--font-body)`,
        color: fg, cursor: 'pointer', whiteSpace: 'nowrap',
        background: fill,
        border: `1px solid ${borderC}`,
        borderRadius: size === 'sm' ? 'var(--r-sm)' : 'var(--r-md)',
        WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
        transform: press ? 'translateY(0) scale(0.975)' : hover ? 'translateY(-1.5px)' : 'translateY(0)',
        boxShadow: press
          ? `inset 0 2px 6px oklch(35% 0.08 ${isGold ? 80 : 268} / 0.45)`
          : hover
            ? `${ring}, 0 6px 22px oklch(10% 0.04 268 / 0.4), inset 0 1px 0 oklch(98% 0.04 ${isGold ? 80 : 268} / 0.45)`
            : `inset 0 1px 0 oklch(98% 0.04 ${isGold ? 80 : 268} / 0.28), 0 2px 8px oklch(10% 0.04 268 / 0.3)`,
        transition: 'transform var(--dur-micro) var(--ease-spring), box-shadow var(--dur-exit) var(--ease-smooth), background var(--dur-exit) ease',
        ...style,
      }}>
      {leading}{children}{trailing}
    </button>
  );
}

/* ============================================================
   Chip — status pills with soft glow
   ============================================================ */
function Chip({ kind = 'default', children, icon, glow }) {
  const map = {
    live: ['var(--no-300)', 'oklch(67% 0.18 22 / 0.14)', 'oklch(70% 0.16 22 / 0.4)'],
    resolved: ['var(--gold-300)', 'oklch(80% 0.14 80 / 0.14)', 'oklch(84% 0.13 82 / 0.4)'],
    hot: ['var(--gold-300)', 'oklch(80% 0.14 80 / 0.12)', 'oklch(84% 0.13 82 / 0.35)'],
    soon: ['var(--aqua-300)', 'oklch(74% 0.11 195 / 0.12)', 'oklch(78% 0.10 195 / 0.35)'],
    yes: ['var(--yes-300)', 'oklch(70% 0.14 152 / 0.14)', 'oklch(72% 0.14 152 / 0.4)'],
    no: ['var(--no-300)', 'oklch(67% 0.16 22 / 0.14)', 'oklch(70% 0.16 22 / 0.4)'],
    cat: ['var(--royal-200)', 'oklch(40% 0.08 268 / 0.30)', 'var(--glass-border)'],
    default: ['var(--text-muted)', 'oklch(40% 0.06 268 / 0.22)', 'var(--glass-border)'],
  };
  const [fg, bg, bd] = map[kind] || map.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 24, padding: '0 10px', borderRadius: 'var(--r-pill)',
      font: `600 11.5px var(--font-body)`, letterSpacing: '0.04em', textTransform: 'uppercase',
      color: fg, background: bg, border: `1px solid ${bd}`,
      WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)',
      boxShadow: glow ? `0 0 16px ${bd}` : 'none',
    }}>
      {kind === 'live' && <LiveDot />}{icon}{children}
    </span>
  );
}
const LiveDot = ({ c = 'var(--no-400)' }) => (
  <span style={{ width: 7, height: 7, borderRadius: 999, background: c,
    boxShadow: `0 0 8px ${c}`, animation: 'livePulse 1.5s ease-in-out infinite' }} />
);

/* ============================================================
   ProbabilityBar — YES left (emerald) · NO right (rose), always
   ============================================================ */
function ProbabilityBar({ yes = 50, size = 'micro', resolved, reveal = true }) {
  const no = 100 - yes;
  const tall = size === 'large';
  const [w, setW] = useState(reveal ? 0 : yes);
  useEffect(() => { const t = setTimeout(() => setW(yes), 60); return () => clearTimeout(t); }, [yes]);
  return (
    <div role="progressbar" aria-valuenow={yes} aria-valuemin={0} aria-valuemax={100}
      aria-label={`YES probability ${yes}%`}
      style={{ display: 'flex', height: tall ? 24 : 12, borderRadius: 'var(--r-pill)', overflow: 'hidden',
        background: 'oklch(30% 0.05 268 / 0.4)', border: '1px solid var(--glass-border)' }}>
      <div style={{ width: `${w}%`,
        background: 'linear-gradient(90deg, oklch(58% 0.15 152 / 0.55), oklch(72% 0.155 152 / 0.9))',
        boxShadow: 'var(--glow-yes-soft), inset 0 1px 0 oklch(95% 0.05 152 / 0.3)',
        transition: 'width 0.6s var(--ease-decel)',
        position: 'relative', overflow: 'hidden' }}>
        {resolved && <span style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(110deg, transparent 30%, oklch(92% 0.1 80 / 0.4) 50%, transparent 70%)',
          backgroundSize: '200% 100%', animation: 'goldShimmer 1.6s linear infinite' }} />}
      </div>
      <div style={{ flex: 1,
        background: 'linear-gradient(90deg, oklch(68% 0.18 22 / 0.9), oklch(56% 0.17 22 / 0.55))',
        boxShadow: 'var(--glow-no-soft), inset 0 1px 0 oklch(92% 0.06 22 / 0.25)' }} />
    </div>
  );
}

/* ============================================================
   RollingCounter — mono ticker that rolls digits on change
   ============================================================ */
function RollingCounter({ value, prefix = '', duration = 850, style, className }) {
  const [disp, setDisp] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const start = performance.now(); const from = disp; const to = value;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisp(Math.round(from + (to - from) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <span className={`mono ${className || ''}`} style={style}>{prefix}{disp.toLocaleString('en-US')}</span>;
}

/* ============================================================
   ProbabilityChart — glowing line with soft bloom + gradient area
   ============================================================ */
function ProbabilityChart({ data, w = 620, h = 200, color = 'var(--yes-400)', id = 'pc' }) {
  const max = 100, min = 0;
  const pts = data.map((v, i) => [ (i / (data.length - 1)) * w, h - ((v - min) / (max - min)) * h ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const [dash, setDash] = useState(1);
  useEffect(() => { const t = setTimeout(() => setDash(0), 80); return () => clearTimeout(t); }, []);
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        <filter id={`${id}-bloom`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" y1={h * g} x2={w} y2={h * g} stroke="var(--glass-border)" strokeWidth="1" strokeDasharray="2 6"/>)}
      <path d={area} fill={`url(#${id}-area)`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" filter={`url(#${id}-bloom)`}
        strokeLinecap="round" strokeLinejoin="round" pathLength="1"
        style={{ strokeDasharray: 1, strokeDashoffset: dash, transition: 'stroke-dashoffset 1.1s var(--ease-decel)' }} />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      <circle cx={last[0]} cy={last[1]} r="9" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4">
        <animate attributeName="r" values="5;12;5" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

/* ============================================================
   MarketCard — glass panel, gilt-bloom hover lift (signature)
   ============================================================ */
function MarketCard({ m, onPick, wide }) {
  const [hover, setHover] = useState(false);
  const G = Glyph[m.cat] || Glyph.globe;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="glass"
      style={{
        width: wide ? '100%' : 340, padding: 18, cursor: 'pointer',
        transform: hover ? `translateY(calc(-1 * var(--lift)))` : 'translateY(0)',
        borderColor: hover ? 'oklch(82% 0.10 82 / 0.55)' : 'var(--glass-border)',
        boxShadow: hover
          ? `var(--glow-gold-soft), 0 0 0 1px oklch(82% 0.12 82 / 0.30), var(--shadow-lift)`
          : 'var(--shadow-rest)',
        transition: 'transform var(--dur-enter) var(--ease-spring), box-shadow var(--dur-enter) var(--ease-smooth), border-color var(--dur-enter) ease',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {m.status === 'live' ? <Chip kind="live">Live</Chip> : m.status === 'resolved' ? <Chip kind="resolved">Resolved</Chip> : <Chip kind="soon">Soon</Chip>}
          <Chip kind="cat" icon={<G size={13} />}>{m.catLabel}</Chip>
        </div>
        <span style={{ color: hover ? 'var(--gold-400)' : 'var(--text-tertiary)', transition: 'color var(--dur-enter)' }}><Glyph.globe size={16} /></span>
      </div>
      <div className="disp" style={{ fontSize: 17.5, fontWeight: 600, lineHeight: 1.28, marginBottom: 3, color: 'var(--text)' }}>{m.q}</div>
      <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-subtle)', marginBottom: 15, lineHeight: 1.3 }}>{m.qsw}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5 }}>
        <span className="mono" style={{ color: 'var(--yes-300)', fontWeight: 600 }}>YES {m.yes}%</span>
        <span className="mono" style={{ color: 'var(--no-300)', fontWeight: 600 }}>NO {100 - m.yes}%</span>
      </div>
      <ProbabilityBar yes={m.yes} resolved={m.status === 'resolved'} />
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0', fontSize: 12, color: 'var(--text-subtle)' }}>
        <span className="mono">TZS {m.vol}</span>
        <span className="mono">{m.preds} predictors</span>
        <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Glyph.clock size={13} />{m.left}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <GlassButton variant="yes" onClick={(e) => { e.stopPropagation(); onPick && onPick(m, 'yes'); }}>YES · {m.yesPrice}</GlassButton>
        <GlassButton variant="no" onClick={(e) => { e.stopPropagation(); onPick && onPick(m, 'no'); }}>NO · {m.noPrice}</GlassButton>
      </div>
    </div>
  );
}

/* ============================================================
   SpecCard — annotation callout pinned beside each screen
   ============================================================ */
function SpecCard({ title, anim = [], tokens = [], note }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: '26px 24px', background: 'oklch(15% 0.04 268)',
      color: 'var(--text)', fontFamily: 'var(--font-body)', overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <span style={{ color: 'var(--gold-400)' }}><Glyph.spark size={18} /></span>
        <span className="disp" style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ height: 1, background: 'var(--glass-border)', margin: '16px 0' }} />
      <SpecBlock label="Animated elements" color="var(--aqua-300)" items={anim} />
      <div style={{ height: 18 }} />
      <SpecBlock label="Token changes (Δ from classic)" color="var(--gold-300)" items={tokens} mono />
      {note && <><div style={{ height: 18 }} /><div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-subtle)', fontStyle: 'italic' }}>{note}</div></>}
    </div>
  );
}
function SpecBlock({ label, color, items, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-muted)' }}>
            <span style={{ color, marginTop: 6, flexShrink: 0, width: 5, height: 5, borderRadius: 9, background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={mono ? { fontFamily: 'var(--font-mono)', fontSize: 11.5 } : null}
              dangerouslySetInnerHTML={{ __html: it }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Market data — realistic TZS markets, bilingual EN/SW
   ============================================================ */
const MARKETS = [
  { id: 'm1', cat: 'football', catLabel: 'Football', status: 'live', q: 'Will Simba SC win the Kariakoo derby?', qsw: 'Je, Simba SC watashinda dabi ya Kariakoo?', yes: 64, yesPrice: '0.64', noPrice: '0.36', vol: '48.2M', preds: 1284, left: '2d 4h' },
  { id: 'm2', cat: 'forex', catLabel: 'Forex', status: 'live', q: 'Will the TZS/USD rate stay below 2,700 by Friday?', qsw: 'Je, kiwango cha TZS/USD kitabaki chini ya 2,700 ifikapo Ijumaa?', yes: 41, yesPrice: '0.41', noPrice: '0.59', vol: '31.7M', preds: 906, left: '3d 11h' },
  { id: 'm3', cat: 'crypto', catLabel: 'Crypto', status: 'live', q: 'Will Bitcoin close above $90,000 this month?', qsw: 'Je, Bitcoin itafunga juu ya $90,000 mwezi huu?', yes: 58, yesPrice: '0.58', noPrice: '0.42', vol: '72.9M', preds: 2103, left: '12d' },
  { id: 'm4', cat: 'weather', catLabel: 'Weather', status: 'live', q: 'Will Dar es Salaam exceed 33°C this weekend?', qsw: 'Je, Dar es Salaam itazidi 33°C wikendi hii?', yes: 73, yesPrice: '0.73', noPrice: '0.27', vol: '12.4M', preds: 421, left: '1d 8h' },
  { id: 'm5', cat: 'economy', catLabel: 'Economy', status: 'soon', q: 'Will the BoT hold the policy rate at 6.0%?', qsw: 'Je, BoT itashikilia kiwango cha riba kwa 6.0%?', yes: 52, yesPrice: '0.52', noPrice: '0.48', vol: '9.1M', preds: 287, left: '6d' },
  { id: 'm6', cat: 'football', catLabel: 'Football', status: 'live', q: 'Will Taifa Stars qualify for AFCON 2027?', qsw: 'Je, Taifa Stars watafuzu AFCON 2027?', yes: 47, yesPrice: '0.47', noPrice: '0.53', vol: '55.6M', preds: 1677, left: '21d' },
];

Object.assign(window, {
  Glyph, FiftyMark, Wordmark, GlassButton, Chip, LiveDot, ProbabilityBar,
  RollingCounter, ProbabilityChart, MarketCard, SpecCard, SpecBlock, MARKETS,
});
