// ds-brand-nav.jsx — brand lockup + navigation chrome
const { useState: nS, useEffect: nE } = React;

/* ============================================================
   BRAND — authentic FiftyMark (ported from brand.tsx). Tilted circle:
   YES emerald wedge / NO rose wedge split by a gilt needle (-14°),
   "50" centered, royal ring + gilt outer hairline.
   ============================================================ */
function FiftyMark({ size = 34, mono: monoTone }) {
  const uid = React.useId().replace(/:/g, '');
  const tilt = -14, r = 50, cx = 50, cy = 50; const rad = tilt * Math.PI / 180;
  const dx = Math.sin(rad) * 80, dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy }, bot = { x: cx - dx, y: cy + dy };
  const yesC = monoTone ? 'var(--text)' : 'oklch(58% 0.16 152)';
  const noC = monoTone ? 'oklch(72% 0.02 268)' : 'oklch(60% 0.18 22)';
  const ringC = 'oklch(48% 0.20 268)';
  const gilt = 'oklch(78% 0.13 86)';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }} aria-label="50pick">
      <defs><clipPath id={`fc${uid}`}><circle cx={cx} cy={cy} r={r - 1} /></clipPath></defs>
      <g clipPath={`url(#fc${uid})`}>
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={yesC} />
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={noC} />
        <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke={monoTone ? ringC : gilt} strokeWidth="2" strokeLinecap="round" />
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontWeight="700" fontSize="30" fill={monoTone ? ringC : 'oklch(99% 0.006 268)'} style={{ letterSpacing: '-0.04em' }}>50</text>
        {!monoTone && <circle cx={cx} cy={cy} r="1.6" fill="oklch(85% 0.13 86)" />}
      </g>
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={ringC} strokeWidth="2" />
      {!monoTone && <circle cx={cx} cy={cy} r={r - 2.4} fill="none" stroke={gilt} strokeWidth="0.5" opacity="0.55" />}
    </svg>
  );
}
const DialMark = FiftyMark;
function Logo({ size = 34 }) { return <FiftyMark size={size} />; }
function Wordmark({ size = 20 }) {
  return <span className="disp" style={{ fontWeight: 700, fontSize: size, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>50pick<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: size * 0.52, marginLeft: size * 0.08, opacity: 0.6, letterSpacing: 0 }}>.tz</span></span>;
}
const BrandLockup = ({ size = 34, gap = 10 }) => <div style={{ display: 'flex', alignItems: 'center', gap }}><Logo size={size} /><Wordmark size={size * 0.58} /></div>;

/* ============================================================
   TOP NAV (56px)
   ============================================================ */
function TopNav({ active = 'Markets' }) {
  const links = ['Markets', 'Live', 'Positions', 'Leaderboard'];
  const [lang, setLang] = nS('EN');
  return (
    <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px', background: 'color-mix(in oklab, var(--panel) 78%, transparent)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)', backdropFilter: 'blur(14px) saturate(1.3)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 30 }}>
      <BrandLockup size={30} />
      <div style={{ display: 'flex', gap: 2, marginLeft: 10 }}>
        {links.map((l) => <span key={l} style={{ padding: '7px 12px', borderRadius: 'var(--r-sm)', fontSize: 13.5, fontWeight: active === l ? 600 : 500, color: active === l ? 'var(--text)' : 'var(--text-subtle)', background: active === l ? 'oklch(40% 0.08 264 / 0.4)' : 'transparent', cursor: 'pointer' }}>{l}</span>)}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 13px', borderRadius: 'var(--r-pill)', background: 'var(--bg-inset)', border: '1px solid var(--border)', minWidth: 200 }}>
        <Icon.search s={15} style={{ color: 'var(--text-subtle)' }} /><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Search markets…</span>
      </div>
      <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
        {['EN', 'SW', 'FR'].map((x) => <span key={x} onClick={() => setLang(x)} style={{ padding: '4px 9px', borderRadius: 'var(--r-pill)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: lang === x ? '#fff' : 'var(--text-subtle)', background: lang === x ? 'var(--brand-500)' : 'transparent' }}>{x}</span>)}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', borderRadius: 'var(--r-pill)', background: 'var(--bg-inset)', border: '1px solid oklch(78% 0.13 80 / 0.35)' }}>
        <span style={{ color: 'var(--gold-400)' }}>{Icon.wallet({ s: 15 })}</span>
        <Cash style={{ ...mono, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>TZS 84,200</Cash>
        <CashEye bare size={14} style={{ marginLeft: 1, color: 'var(--gold-300)' }} />
      </div>
      <button aria-label="Notifications" style={{ color: 'var(--text-muted)', position: 'relative', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'inline-flex' }}><Icon.bell s={20} /><span style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, borderRadius: 9, background: 'var(--no-400)' }} /></button>
      <div style={{ width: 34, height: 34, borderRadius: 999, background: 'linear-gradient(135deg, var(--bg-elevated2), var(--bg-inset))', border: '1.5px solid var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...disp, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>JK</div>
    </div>
  );
}

/* ============================================================
   BOTTOM NAV (64px, mobile)
   ============================================================ */
function BottomNav({ active = 'Markets' }) {
  const items = [['Markets', Icon.chart], ['Live', Icon.bolt], ['Positions', Icon.trophy], ['Ranks', Icon.trophy], ['Profile', Icon.shield]];
  return (
    <div style={{ height: 64, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', alignItems: 'center', padding: '0 6px', background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
      {items.map(([l, G]) => { const on = l === active; return <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: on ? 'var(--accent-400)' : 'var(--text-subtle)', cursor: 'pointer' }}><G s={21} />{<span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{l}</span>}</div>; })}
    </div>
  );
}

/* ============================================================
   LIVE TICKER (32px)
   ============================================================ */
function LiveTicker() {
  const items = ['TZS 25,000 just predicted YES on Simba SC derby', 'TZS 10,000 predicted NO on TZS/USD < 2,700', 'TZS 50,000 predicted YES on Bitcoin > $90k'];
  const [i, setI] = nS(0);
  nE(() => { const t = setInterval(() => setI((x) => (x + 1) % items.length), 2800); return () => clearInterval(t); }, []);
  return (
    <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', background: 'var(--bg-inset)', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--live-400)' }}><LiveDot c="var(--live-400)" /> LIVE</span>
      <div style={{ position: 'relative', flex: 1, height: 16, overflow: 'hidden' }}><div key={i} className="mono" style={{ position: 'absolute', fontSize: 12, color: 'var(--text-muted)', animation: 'tickerUp 2.8s ease-in-out' }}>{items[i]}</div></div>
    </div>
  );
}

/* ============================================================
   TABS + SEGMENTED
   ============================================================ */
function Tabs({ items = ['All', 'Football', 'Crypto', 'Forex', 'Weather'], value, onChange }) {
  const [v, setV] = nS(value || items[0]);
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
      {items.map((t) => { const on = v === t; return <button key={t} onClick={() => { setV(t); onChange && onChange(t); }} style={{ position: 'relative', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', font: `${on ? 600 : 500} 14px var(--font-body)`, color: on ? 'var(--text)' : 'var(--text-subtle)' }}>{t}{on && <span style={{ position: 'absolute', left: 8, right: 8, bottom: -1, height: 2, borderRadius: 2, background: 'var(--accent-400)' }} />}</button>; })}
    </div>
  );
}
function Segmented({ items = ['1H', '1D', '1W', 'ALL'], value }) {
  const [v, setV] = nS(value || items[1]);
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
      {items.map((t) => { const on = v === t; return <button key={t} onClick={() => setV(t)} style={{ padding: '6px 12px', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', font: '600 12.5px var(--font-mono)', color: on ? 'var(--text)' : 'var(--text-subtle)', background: on ? 'oklch(40% 0.08 264 / 0.55)' : 'transparent' }}>{t}</button>; })}
    </div>
  );
}

/* ---------- Logo lockups + app icons showcase ---------- */
function LogoShowcase() {
  return (
    <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 22 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Logo</div><div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>The emblem is a conviction dial — green YES arc + rose NO arc meeting at a gold needle. Ties the brand to the core mechanic.</div></div>
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', marginBottom: 14, letterSpacing: '0.1em' }}>PRIMARY LOCKUP</div><BrandLockup size={44} /></div>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', marginBottom: 14, letterSpacing: '0.1em' }}>STACKED</div><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><Logo size={48} /><Wordmark size={22} /></div></div>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', marginBottom: 14, letterSpacing: '0.1em' }}>EMBLEM ONLY</div><DialMark size={48} /></div>
      </div>
      <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', margin: '26px 0 14px', letterSpacing: '0.1em' }}>APP ICON · SIZES</div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
        {[64, 48, 32, 24].map((s) => <div key={s} style={{ textAlign: 'center' }}><Logo size={s} /><div style={{ ...mono, fontSize: 9.5, color: 'var(--text-subtle)', marginTop: 6 }}>{s}</div></div>)}
        <div style={{ width: 64, height: 64, borderRadius: 14, background: 'linear-gradient(150deg, var(--brand-600), var(--brand-500))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DialMark size={42} mono="#fff" /></div>
      </div>
      <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', margin: '26px 0 14px', letterSpacing: '0.1em' }}>MONOCHROME · ON-LIGHT</div>
      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ width: 70, height: 56, borderRadius: 10, background: 'var(--bg-elevated2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}><DialMark size={38} mono="currentColor" /></div>
        <div style={{ width: 70, height: 56, borderRadius: 10, background: 'var(--gold-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-text)' }}><DialMark size={38} mono="currentColor" /></div>
        <div style={{ width: 70, height: 56, borderRadius: 10, background: '#f4f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BrandLockupLight /></div>
      </div>
    </div>
  );
}
const BrandLockupLight = () => <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><DialMark size={26} /><span className="disp" style={{ fontWeight: 700, fontSize: 15, color: '#141a44' }}>50<span style={{ color: 'var(--accent-600)' }}>pick</span></span></div>;

Object.assign(window, { Logo, DialMark, FiftyMark, Wordmark, BrandLockup, LogoShowcase, TopNav, BottomNav, LiveTicker, Tabs, Segmented });
