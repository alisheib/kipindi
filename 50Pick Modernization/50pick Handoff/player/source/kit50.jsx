// kit50.jsx — atoms matched to the live 50pick platform.
// Classy sportsbook YES/NO buttons · conviction bar w/ gold needle · chips · primary/gold.
const { useState: kS, useEffect: kE, useRef: kR } = React;

/* ---------- icons (1.6px line, currentColor) ---------- */
const Svg = ({ s = 16, sw = 1.85, children, style }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>{children}</svg>;
const Icon = {
  /* categories — heraldic family (canonical) */
  football: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5l3.2 2.4-1.2 3.8h-4l-1.2-3.8z" /><path d="M12 7.5V4.5M15.2 9.9l2.8-1M13.8 13.7l1.8 2.5M10.2 13.7l-1.8 2.5M8.8 9.9l-2.8-1" /></Svg>,
  politics: (p) => <Svg {...p}><path d="M3 9l9-5 9 5" /><path d="M4 9h16" /><path d="M6 9v8M10 9v8M14 9v8M18 9v8" /><path d="M3 21h18M4 17h16" /></Svg>,
  forex: (p) => <Svg {...p}><path d="M4 8h12l-3-3M20 16H8l3 3" /><path d="M7.5 11.5v1M7 12h1" /></Svg>,
  weather: (p) => <Svg {...p}><path d="M7 16a4 4 0 1 1 1-7.9 5 5 0 0 1 9.6 1.4A3.3 3.3 0 0 1 17 16H7z" /><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" /></Svg>,
  economy: (p) => <Svg {...p}><path d="M4 4v16h16" /><path d="M7 15l3.5-4 3 2.5L20 7" /><path d="M20 7v3.5M20 7h-3.5" /></Svg>,
  crypto: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 6.5v11M9.5 9h4a1.8 1.8 0 0 1 0 3.6h-4M9.5 12.6h4.5a1.8 1.8 0 0 1 0 3.6H9.5" /></Svg>,
  entertainment: (p) => <Svg {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" /></Svg>,
  tech: (p) => <Svg {...p}><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" /></Svg>,
  trade: (p) => <Svg {...p}><path d="M8 4v16M8 20l-3-3M8 20l3-3" /><path d="M16 20V4M16 4l-3 3M16 4l3 3" /></Svg>,
  watch: (p) => <Svg {...p}><path d="M6 4h12v16l-6-4-6 4z" /></Svg>,
  share: (p) => <Svg {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></Svg>,
  comment: (p) => <Svg {...p}><path d="M5 5h14v10H9l-4 4z" /><path d="M8.5 10h7M8.5 7.5h4" /></Svg>,
  filter: (p) => <Svg {...p}><path d="M4 5h16l-6 7v5l-4 2v-7z" /></Svg>,
  plus: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 8.5v7M8.5 12h7" /></Svg>,
  home: (p) => <Svg {...p}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></Svg>,
  markets: (p) => <Svg {...p}><path d="M12 4v16" /><path d="M6 7h12" /><path d="M6 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M18 7l-2.5 6a2.5 2.5 0 0 0 5 0z" /><path d="M8.5 20h7" /></Svg>,
  portfolio: (p) => <Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18M14 12v2.5h-4V12" /></Svg>,
  trophy: (p) => <Svg {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /><path d="M12 13v3M9 20h6M10 20l.5-4h3l.5 4" /></Svg>,
  profile: (p) => <Svg {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" /></Svg>,
  live: (p) => <Svg {...p}><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6 6 0 0 0 0 9M16.5 7.5a6 6 0 0 1 0 9M5 5a9 9 0 0 0 0 14M19 5a9 9 0 0 1 0 14" /></Svg>,
  tipping: (p) => <Svg {...p}><path d="M12 4v16M7 20h10" /><path d="M5 8l-2 4.5a2.3 2.3 0 0 0 4 0z" /><path d="M19 8l-2 4.5a2.3 2.3 0 0 0 4 0z" /><path d="M5 8l7-2 7 2" /></Svg>,
  hot: (p) => <Svg {...p}><path d="M12 3c.5 2.5 2 4 3.5 5.5S18 12 18 14a6 6 0 0 1-12 0c0-1.2.4-2.3 1-3 .2 1 .8 1.8 1.6 2.2C8.3 11 9 8.5 8.5 6.5c2 .8 3 2.4 3.2 4 .6-.6 1-1.6 1-2.8 0-1.6-.7-3.2-.7-4.7z" /></Svg>,
  soon: (p) => <Svg {...p}><path d="M7 3h10M7 21h10" /><path d="M8 3c0 4 8 4.5 8 9s-8 5-8 9M16 3c0 4-8 4.5-8 9s8 5 8 9" /></Svg>,
  resolved: (p) => <Svg {...p}><path d="M12 3l1.9 1.4 2.3-.3 1 2.1 2.1 1-.3 2.3L21 13l-1.4 1.9.3 2.3-2.1 1-1 2.1-2.3-.3L12 21l-1.9-1.4-2.3.3-1-2.1-2.1-1 .3-2.3L3 13l1.4-1.9-.3-2.3 2.1-1 1-2.1 2.3.3z" /><path d="M9 12.5l2 2 4-4.5" /></Svg>,
  void: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></Svg>,
  shieldcheck: (p) => <Svg {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /><path d="M9 11.5l2 2 4-4.5" /></Svg>,
  shield: (p) => <Svg {...p}><path d="M12 3l7 2.5v5c0 5-3.4 8.4-7 9.5-3.6-1.1-7-4.5-7-9.5v-5z" /><path d="M9 11.5l2 2 4-4.5" /></Svg>,
  bolt: (p) => <Svg {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6z" /></Svg>,
  wallet: (p) => <Svg {...p}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h.01M3 9h13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3" /></Svg>,
  crown: (p) => <Svg {...p}><path d="M4 18h16M5 18l-1.5-9 5 4 3.5-7 3.5 7 5-4L19 18z" /><circle cx="3.5" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="20.5" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" /></Svg>,
  sparkle: (p) => <Svg {...p}><path d="M12 3c.4 4 1.5 5.1 5.5 5.5C13.5 8.9 12.4 10 12 14c-.4-4-1.5-5.1-5.5-5.5C10.5 8.1 11.6 7 12 3z" fill="currentColor" stroke="none" /><path d="M18.5 14c.2 2 .8 2.6 2.8 2.8-2 .2-2.6.8-2.8 2.8-.2-2-.8-2.6-2.8-2.8 2-.2 2.6-.8 2.8-2.8z" fill="currentColor" stroke="none" /></Svg>,
  star: (p) => <Svg {...p}><path d="M12 3.5l2.5 5.1 5.6.8-4.05 3.95.96 5.6L12 16.3 6.99 18.95l.96-5.6L3.9 9.4l5.6-.8z" /></Svg>,
  flame2: (p) => <Svg {...p}><path d="M12 3c1 3 3 4.5 3 8a3 3 0 1 1-6 0c0-1 .3-1.8.8-2.4C9 11 10 12.5 11 12c-.5-2 .5-7 1-9z" /></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>,
  arrowDown: (p) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6"/></Svg>,
  arrowUp: (p) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6"/></Svg>,
  check: (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7"/></Svg>,
  x: (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18"/></Svg>,
  info: (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></Svg>,
  ext: (p) => <Svg {...p}><path d="M14 5h5v5M19 5l-8 8M12 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-6"/></Svg>,
  bell: (p) => <Svg {...p}><path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5 2 6H5c.5-1 2-2 2-6z" /><path d="M10.5 20a1.7 1.7 0 0 0 3 0" /></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Svg>,
  phone: (p) => <Svg {...p}><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></Svg>,
  globe: (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 2.6 15 0 18M12 3c-2.6 2.5-2.6 15 0 18"/></Svg>,
  chart: (p) => <Svg {...p}><path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6"/></Svg>,
};
Icon.sports = Icon.football; Icon.culture = Icon.entertainment; Icon.macro = Icon.economy; Icon.flame = Icon.flame2; Icon.spark = Icon.sparkle;
const CATEGORY_GLYPH = { sports: 'football', football: 'football', politics: 'politics', macro: 'economy', economy: 'economy', forex: 'forex', weather: 'weather', crypto: 'crypto', culture: 'entertainment', entertainment: 'entertainment', tech: 'tech' };
const categoryGlyph = (c) => Icon[CATEGORY_GLYPH[(c || '').toLowerCase()] || 'markets'];

const mono = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const disp = { fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' };

/* ---------- LiveDot ---------- */
const LiveDot = ({ c = 'var(--no-400)', s = 6 }) => <span style={{ width: s, height: s, borderRadius: 999, background: c, color: c, animation: 'lpulse 1.5s ease-in-out infinite', flexShrink: 0 }} />;

/* ---------- Chip ---------- */
function Chip({ tone = 'cat', icon, children }) {
  const map = {
    live: ['oklch(96% 0.04 25)', 'oklch(55% 0.20 25 / 0.30)', 'oklch(62% 0.20 25 / 0.6)'],
    hot: ['var(--gold-300)', 'oklch(72% 0.13 80 / 0.22)', 'oklch(80% 0.13 80 / 0.5)'],
    soon: ['var(--brand-300)', 'oklch(54% 0.165 262 / 0.26)', 'oklch(63% 0.18 262 / 0.55)'],
    tipping: ['var(--aqua-300, oklch(82% 0.09 195))', 'oklch(74% 0.11 195 / 0.20)', 'oklch(78% 0.10 195 / 0.5)'],
    resolved: ['oklch(24% 0.06 80)', 'linear-gradient(180deg, var(--gold-300), var(--gold-500))', 'oklch(60% 0.10 78)'],
    yes: ['var(--yes-300)', 'oklch(52% 0.15 150 / 0.22)', 'oklch(61% 0.16 150 / 0.5)'],
    no: ['var(--no-300)', 'oklch(50% 0.19 25 / 0.22)', 'oklch(58% 0.2 25 / 0.5)'],
    cat: ['var(--text-muted)', 'oklch(34% 0.09 268 / 0.5)', 'var(--border)'],
  };
  const [fg, bg, bd] = map[tone] || map.cat;
  const status = tone === 'live' || tone === 'hot' || tone === 'soon' || tone === 'resolved';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: status ? 23 : 21, padding: status ? '0 9px' : '0 8px', borderRadius: 'var(--r-pill)',
      font: `700 ${status ? 11 : 10.5}px var(--font-body)`, letterSpacing: '0.07em', textTransform: 'uppercase', color: fg,
      background: bg, border: `1px solid ${bd}` }}>
      {tone === 'live' && <LiveDot />}{icon}{children}
    </span>
  );
}

/* ---------- ConvictionBar — green fill + thin GOLD needle (signature) ---------- */
function ConvictionBar({ yes = 50, h = 10, reveal = true, resolved }) {
  const [w, setW] = kS(reveal ? 0 : yes);
  kE(() => { const t = setTimeout(() => setW(yes), 60); return () => clearTimeout(t); }, [yes]);
  return (
    <div role="progressbar" aria-valuenow={yes} aria-valuemin={0} aria-valuemax={100} aria-label={`YES probability ${yes}%`} style={{ position: 'relative', height: h }}>
      <div style={{ height: h, borderRadius: 'var(--r-pill)', overflow: 'hidden', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
        <div style={{ width: `${w}%`, height: '100%', borderRadius: 'var(--r-pill)',
          background: 'linear-gradient(90deg, var(--yes-700), var(--yes-500))',
          transition: 'width .5s var(--ease-stage)', position: 'relative', overflow: 'hidden' }}>
          {resolved && <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 35%, oklch(90% 0.1 84 / 0.5) 50%, transparent 65%)', backgroundSize: '200% 100%', animation: 'goldShimmer 1.6s linear infinite' }} />}
        </div>
      </div>
      {/* gold needle */}
      <div style={{ position: 'absolute', left: `${w}%`, top: -3, bottom: -3, width: 3, transform: 'translateX(-50%)', background: 'linear-gradient(180deg, var(--gold-300), var(--gold-600))', borderRadius: 2, transition: 'left .5s var(--ease-stage)' }} />
    </div>
  );
}

/* ============================================================
   YES / NO buttons — classy sportsbook treatment.
   Side label (bold) + price in a recessed mono chip. Machined edges.
   ============================================================ */
function SideButton({ side = 'yes', price = '50', size = 'md', live, state }) {
  const [h, setH] = kS(false); const [p, setP] = kS(false);
  const hover = live ? h : state === 'hover'; const press = live ? p : state === 'press';
  const yes = side === 'yes';
  const H = { sm: 38, md: 44, lg: 50 }[size];
  const c = yes
    ? { base: 'oklch(57% 0.155 150)', hi: 'oklch(80% 0.14 152 / 0.4)', glow: 'oklch(60% 0.16 150 / 0.5)' }
    : { base: 'oklch(56% 0.200 25)', hi: 'oklch(80% 0.15 25 / 0.4)', glow: 'oklch(57% 0.20 25 / 0.5)' };
  return (
    <button aria-label={`${yes ? 'YES' : 'NO'} at ${price}`}
      onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      style={{ height: H, width: '100%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        borderRadius: 8, color: '#fff', background: c.base,
        filter: press ? 'brightness(0.93)' : hover ? 'brightness(1.07)' : 'none',
        boxShadow: press
          ? 'inset 0 2px 5px oklch(20% 0.08 262 / 0.4)'
          : hover
            ? `inset 0 1px 0 ${c.hi}, 0 5px 16px ${c.glow}`
            : `inset 0 1px 0 ${c.hi}, 0 1px 2px oklch(10% 0.05 264 / 0.35)`,
        transform: press ? 'translateY(1px)' : hover ? 'translateY(-1px)' : 'none',
        transition: 'transform .1s var(--ease-micro), box-shadow .16s var(--ease-micro), filter .12s' }}>
      <span style={{ font: `700 ${size === 'sm' ? 13 : 15}px var(--font-body)`, letterSpacing: '0.06em', textShadow: '0 1px 1px oklch(20% 0.1 264 / 0.32)' }}>{yes ? 'YES' : 'NO'}</span>
      <span style={{ ...mono, fontSize: size === 'sm' ? 12.5 : 14, fontWeight: 600, color: '#fff', opacity: 0.92, lineHeight: 1, textShadow: '0 1px 1px oklch(20% 0.1 264 / 0.3)' }}>{price}</span>
    </button>
  );
}
const SidePair = (props) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
    <SideButton side="yes" {...props} /><SideButton side="no" {...props} />
  </div>
);

/* ============================================================
   Button — primary (teal-green) · gold (payout) · ghost · outline
   ============================================================ */
function Btn({ variant = 'primary', size = 'md', children, leading, trailing, full, state, live, style }) {
  const [h, setH] = kS(false); const [p, setP] = kS(false);
  const hover = live ? h : state === 'hover'; const press = live ? p : state === 'press';
  const disabled = state === 'disabled'; const loading = state === 'loading';
  const H = { sm: 30, md: 38, lg: 46, xl: 56 }[size];
  const fs = { sm: 13, md: 14, lg: 15, xl: 16.5 }[size];
  let bg, color, border = 'none', shadow = 'none', filter = 'none';
  // shared flat-solid language with SideButton (filled: gold/yes/no) ----------
  const solid = (base, hi, glow, txt) => {
    bg = base; color = txt;
    filter = press ? 'brightness(0.93)' : hover ? 'brightness(1.07)' : 'none';
    shadow = press ? 'inset 0 2px 5px oklch(20% 0.08 262 / 0.4)'
      : hover ? `inset 0 1px 0 ${hi}, 0 5px 16px ${glow}`
      : `inset 0 1px 0 ${hi}, 0 1px 2px oklch(10% 0.05 262 / 0.35)`;
  };
  if (variant === 'gold') solid('var(--gold-500)', 'oklch(95% 0.06 86 / 0.55)', 'oklch(80% 0.13 82 / 0.5)', 'var(--gold-text)');
  else if (variant === 'yes') solid('oklch(57% 0.155 150)', 'oklch(80% 0.14 152 / 0.4)', 'oklch(60% 0.16 150 / 0.5)', '#fff');
  else if (variant === 'no') solid('oklch(56% 0.200 25)', 'oklch(80% 0.15 25 / 0.4)', 'oklch(57% 0.20 25 / 0.5)', '#fff');
  // chrome family (tinted / outline) — same radius + motion -------------------
  else if (variant === 'primary') { bg = press ? 'oklch(48% 0.20 268)' : 'linear-gradient(180deg, oklch(60% 0.20 268), oklch(48% 0.20 268))'; color = 'var(--pearl-50, oklch(99% 0.006 268))'; border = '1px solid oklch(40% 0.20 268)'; }
  else if (variant === 'ghost') { bg = hover ? 'oklch(40% 0.07 264 / 0.35)' : 'transparent'; color = 'var(--text)'; border = '1px solid var(--border)'; }
  else { bg = 'transparent'; color = 'var(--brand-300)'; border = '1px solid var(--brand-500)'; }
  return (
    <button disabled={disabled || loading} onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      style={{ height: H, width: full ? '100%' : undefined, padding: `0 ${size === 'xl' ? 24 : 18}px`, borderRadius: 8, border, background: bg, color, filter,
        font: `600 ${fs}px var(--font-body)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, boxShadow: shadow, transform: press ? 'translateY(1px)' : hover && !disabled ? 'translateY(-1px)' : 'none',
        transition: 'transform .1s var(--ease-micro), box-shadow .16s var(--ease-micro), filter .12s, background .16s', whiteSpace: 'nowrap', ...style }}>
      {loading ? <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin .7s linear infinite' }}><circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="3"/><path d="M21 12a9 9 0 00-9-9" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"/></svg> : leading}{children}{trailing}
    </button>
  );
}

/* ---------- rolling number ---------- */
function RollNum({ value, prefix = '', dur = 850 }) {
  const [d, setD] = kS(0); const raf = kR();
  kE(() => { const s = performance.now(); const tick = (n) => { const pr = Math.min(1, (n - s) / dur); setD(Math.round(value * (1 - Math.pow(1 - pr, 3)))); if (pr < 1) raf.current = requestAnimationFrame(tick); }; raf.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf.current); }, [value]);
  return <span style={mono}>{prefix}{d.toLocaleString('en-US')}</span>;
}

/* ---------- movement pill (↓ -8 pt) ---------- */
function MovePill({ dir = 'down', v = '8' }) {
  const down = dir === 'down';
  const C = down ? Icon.arrowDown : Icon.arrowUp;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, ...mono, fontSize: 11, color: 'var(--text-subtle)', background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '3px 8px' }}><C s={11} sw={2} /> -{v} pt</span>;
}

Object.assign(window, { Icon, Svg, mono, disp, LiveDot, Chip, ConvictionBar, SideButton, SidePair, Btn, RollNum, MovePill, categoryGlyph });
