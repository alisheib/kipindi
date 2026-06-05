// ds-atoms2.jsx — inputs, avatars, badges, progress family, LOADERS, tooltip, prob-bar variants
const { useState: aS, useEffect: aE } = React;

/* ============================================================
   LOADERS / SPINNERS — full set
   ============================================================ */
function Spinner({ size = 22, color = 'var(--accent-400)', track = 'var(--border)', sw = 3 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin .7s linear infinite' }}>
    <circle cx="12" cy="12" r="9" fill="none" stroke={track} strokeWidth={sw}/>
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>
  </svg>;
}
function DotsLoader({ color = 'var(--accent-400)', size = 8 }) {
  return <span style={{ display: 'inline-flex', gap: size * 0.6 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: size, height: size, borderRadius: 999, background: color, animation: `dotBounce 1.1s ${i * 0.14}s ease-in-out infinite` }} />)}</span>;
}
function BarLoader({ w = 160, color = 'var(--accent-400)' }) {
  return <div style={{ width: w, height: 4, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden' }}><div style={{ height: '100%', width: '40%', borderRadius: 999, background: color, animation: 'barSlide 1.2s var(--ease-stage) infinite' }} /></div>;
}
function RingProgress({ value = 64, size = 56, label }) {
  const r = size / 2 - 5; const c = 2 * Math.PI * r;
  return <div style={{ position: 'relative', width: size, height: size }}>
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-inset)" strokeWidth="5"/><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-400)" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .6s var(--ease-stage)' }}/></svg>
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: size * 0.26, fontWeight: 600 }}>{label || value}</span>
  </div>;
}
function Skeleton({ w = '100%', h = 14, r = 6 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg, var(--bg-inset) 25%, var(--bg-elevated2) 37%, var(--bg-inset) 63%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite' }} />;
}
function SkeletonCard() {
  return <div style={{ width: 300, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16 }}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}><Skeleton w={54} h={20} r={999} /><Skeleton w={64} h={20} r={999} /></div>
    <Skeleton w="90%" h={14} /><div style={{ height: 8 }} /><Skeleton w="60%" h={14} />
    <div style={{ height: 16 }} /><Skeleton w="100%" h={8} r={999} />
    <div style={{ height: 16 }} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Skeleton h={44} r={8} /><Skeleton h={44} r={8} /></div>
  </div>;
}

/* ============================================================
   PROGRESS family (tones + sizes) + Stepped + Circular
   ============================================================ */
const TONE = { teal: 'var(--accent-400)', yes: 'var(--yes-400)', no: 'var(--no-400)', gold: 'var(--gold-400)', warning: 'var(--gold-500)', info: 'var(--brand-400)', danger: 'var(--no-500)' };
const TONE_DEEP = { teal: 'var(--accent-600,oklch(46% 0.10 195))', yes: 'var(--yes-700,oklch(48% 0.14 152))', no: 'var(--no-700,oklch(46% 0.17 25))', gold: 'var(--gold-600)', warning: 'var(--gold-600)', info: 'var(--brand-600)', danger: 'var(--no-700,oklch(46% 0.17 25))' };
function ProgressBar({ value = 60, tone = 'teal', size = 'md', label, animate = true }) {
  const h = { sm: 5, md: 9, lg: 14 }[size]; const c = TONE[tone]; const deep = TONE_DEEP[tone] || c;
  const [hover, setHover] = aS(false);
  const [w, setW] = aS(animate ? 0 : value);
  aE(() => { const t = setTimeout(() => setW(value), 80); return () => clearTimeout(t); }, [value]);
  return <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    {label && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-subtle)', marginBottom: 6 }}><span>{label}</span><span style={{ ...mono, color: hover ? c : 'var(--text-subtle)', transition: 'color .2s' }}>{value}%</span></div>}
    <div style={{ position: 'relative', height: h, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden',
      border: `1px solid ${hover ? c : 'var(--border)'}`, transition: 'border-color .25s',
      boxShadow: 'inset 0 1px 2px oklch(8% 0.05 262 / 0.5)' }}>
      <div style={{ position: 'relative', width: `${w}%`, height: '100%', borderRadius: 999, overflow: 'hidden',
        background: `linear-gradient(90deg, ${deep}, ${c})`,
        boxShadow: 'inset 0 1px 0 oklch(98% 0.02 262 / 0.3)',
        transition: 'width .7s var(--ease-stage)' }}>
      </div>
      {w > 1 && w < 100 && <span style={{ position: 'absolute', top: '50%', left: `${w}%`, width: h + 2, height: h + 2,
        transform: 'translate(-50%,-50%)', borderRadius: 999, background: c, border: '1.5px solid var(--bg)' }} />}
    </div>
  </div>;
}
function SteppedProgress({ steps = 4, current = 2 }) {
  return <div style={{ display: 'flex', gap: 6 }}>{[...Array(steps)].map((_, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < current ? 'var(--accent-400)' : i === current ? 'var(--accent-400)' : 'var(--bg-inset)', boxShadow: i === current ? '0 0 8px var(--accent-400)' : 'none', opacity: i <= current ? 1 : 0.5 }} />)}</div>;
}

/* ============================================================
   INPUT / OTP / AVATAR / TIER / TOOLTIP
   ============================================================ */
function Input({ placeholder = 'Search…', prefix, value, icon }) {
  const [f, setF] = aS(false);
  return <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 44, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: `1px solid ${f ? 'var(--brand-500)' : 'var(--border)'}`, boxShadow: f ? '0 0 0 3px oklch(63% 0.18 262 / 0.25)' : 'none', transition: 'border-color .15s, box-shadow .15s' }}>
    {icon && <span style={{ color: 'var(--text-subtle)' }}>{icon}</span>}
    {prefix && <span style={{ ...mono, fontSize: 14, color: 'var(--text-subtle)' }}>{prefix}</span>}
    <input onFocus={() => setF(true)} onBlur={() => setF(false)} defaultValue={value} placeholder={placeholder} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', font: '500 14px var(--font-body)' }} />
  </div>;
}
function OtpBoxes({ filled = 3 }) {
  return <div style={{ display: 'flex', gap: 8 }}>{[...Array(6)].map((_, i) => <div key={i} style={{ width: 44, height: 52, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 20, fontWeight: 600, background: 'var(--bg-inset)', border: `1px solid ${i < filled ? 'var(--brand-500)' : i === filled ? 'var(--accent-500)' : 'var(--border)'}`, color: 'var(--text)' }}>{i < filled ? '•' : ''}</div>)}</div>;
}
const TIERC = window.TIERC;
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Generative seed-based avatar: deterministic gradient + geometric blobs, initials on top.
function Avatar({ initials = 'JK', tier, size = 40, seed, tierGlyph = true }) {
  const key = (seed || initials || 'x').toString();
  const hsh = hashStr(key);
  const h1 = hsh % 360, h2 = (h1 + 50 + (hsh >> 4) % 80) % 360;
  const uid = 'av' + (hsh % 1000000);
  const ring = tier ? TIERC[tier] : 'transparent';
  const ringW = Math.max(1.5, size * 0.045);
  const TG = (window.TIER_GLYPH || {})[tier];
  const showGlyph = tier && tierGlyph && size >= 26 && Icon[TG];
  const badge = Math.round(size * 0.4);
  const bx = 12 + (hsh >> 2) % 16, by = 10 + (hsh >> 6) % 18, br = 10 + (hsh >> 8) % 12;
  return <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ borderRadius: '50%', display: 'block' }}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={`oklch(52% 0.13 ${h1})`} /><stop offset="1" stopColor={`oklch(32% 0.12 ${h2})`} /></linearGradient></defs>
      <rect width="40" height="40" fill={`url(#${uid})`} />
      <circle cx={bx} cy={by} r={br} fill={`oklch(70% 0.14 ${h2})`} opacity="0.45" />
      <circle cx={40 - bx * 0.6} cy={38 - by * 0.5} r={br * 0.7} fill={`oklch(80% 0.10 ${h1})`} opacity="0.30" />
    </svg>
    <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', ...disp, fontWeight: 700, fontSize: size * 0.34, color: '#fff', textShadow: '0 1px 3px oklch(10% 0.05 268 / 0.6)' }}>{initials}</span>
    {tier && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `${ringW}px solid ${ring}`, boxShadow: 'inset 0 0 0 1px oklch(10% 0.05 268 / 0.3)' }} />}
    {showGlyph && <span aria-hidden style={{ position: 'absolute', right: -badge * 0.12, bottom: -badge * 0.12, width: badge, height: badge, borderRadius: '50%', background: ring, border: '1.5px solid var(--bg)', display: 'grid', placeItems: 'center', color: 'oklch(18% 0.04 268)' }}>{Icon[TG]({ s: Math.round(badge * 0.62), sw: 2.4 })}</span>}
  </span>;
}
const TierBadge = ({ tier = 'gold' }) => <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TIERC[tier] }}>{tier}</span>;
function Tooltip({ children = 'TZS 48.2M total pool' }) {
  return <span style={{ display: 'inline-flex', position: 'relative', ...mono, fontSize: 12, color: '#fff', background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', padding: '7px 10px' }}>{children}
    <span style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 9, height: 9, background: 'var(--bg-overlay)', borderRight: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border-strong)' }} /></span>;
}

/* ============================================================
   PROBABILITY BAR — now a thin alias of the canonical kit50 ConvictionBar.
   One implementation, two names. All variants/sizes live in ConvictionBar.
   ============================================================ */
const ProbabilityBar = window.ConvictionBar;

Object.assign(window, { Spinner, DotsLoader, BarLoader, RingProgress, Skeleton, SkeletonCard, ProgressBar, SteppedProgress, Input, OtpBoxes, Avatar, TierBadge, Tooltip, ProbabilityBar, TIERC });
