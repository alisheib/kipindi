// ds-hero.jsx — HeroConstellation landing (ported & adapted from the user's
// landing/hero-constellation.tsx). Read-only ConfidenceDial constellation on a
// radial gilt field: drift particles (aqua patina), hover scrim + tooltip,
// rolling predictor counter, cycling verdict tape. Uses navy/gilt tokens.
const { useState: hS, useEffect: hE, useRef: hR, useMemo: hM } = React;

/* read-only confidence dial — 270° arc, green fill, gold needle */
function ConfidenceDial({ yesPct = 64, size = 64 }) {
  const cx = 50, cy = 50, r = 38;
  const a0 = 135, a1 = 405; // 270°
  const a = a0 + (a1 - a0) * (yesPct / 100);
  const pt = (deg, rad) => [cx + Math.cos(deg * Math.PI / 180) * rad, cy + Math.sin(deg * Math.PI / 180) * rad];
  const arc = (s, e) => { const [x0, y0] = pt(s, r); const [x1, y1] = pt(e, r); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const [nx, ny] = pt(a, r);
  return <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
    <circle cx={cx} cy={cy} r={r} fill="oklch(16% 0.06 268 / 0.75)" />
    <path d={arc(a0, a1)} fill="none" stroke="oklch(30% 0.04 268)" strokeWidth="6" strokeLinecap="round" />
    <path d={arc(a0, a)} fill="none" stroke="oklch(64% 0.16 152)" strokeWidth="6" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px oklch(64% 0.16 152 / 0.6))' }} />
    <line x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)} stroke="oklch(80% 0.14 82)" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx={cx} cy={cy} r="4" fill="oklch(80% 0.14 82)" />
    <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 19, fontWeight: 700, fill: 'oklch(96% 0.012 268)' }}>{yesPct}</text>
    <text x={cx} y={cy + 9} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', fill: 'oklch(72% 0.045 268)' }}>YES%</text>
  </svg>;
}

function HRoll({ value, fontSize = 22 }) {
  const [d, setD] = hS(0); const raf = hR();
  hE(() => { const start = performance.now(); const from = d; const tick = (t) => { const k = Math.min(1, (t - start) / 1200); const e = 1 - Math.pow(1 - k, 3); setD(Math.round(from + (value - from) * e)); if (k < 1) raf.current = requestAnimationFrame(tick); }; raf.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf.current); }, [value]);
  return <span style={{ ...disp, fontSize, fontWeight: 600, ...mono }}>{d.toLocaleString('en-US')}</span>;
}

const HC_MARKETS = [
  { id: 'afcon', x: 0.20, y: 0.36, size: 92, yes: 57, title: 'TZ hosts AFCON 2027 group stage', date: '27 Mar' },
  { id: 'rains', x: 0.43, y: 0.66, size: 70, yes: 64, title: 'Long rains begin before 15 Apr', date: '15 Apr' },
  { id: 'bot', x: 0.33, y: 0.19, size: 56, yes: 71, title: 'BoT holds rate at next MPC', date: '02 May' },
  { id: 'usd', x: 0.63, y: 0.26, size: 62, yes: 38, title: 'USD/TZS closes < 2,650 in Q2', date: '30 Jun' },
  { id: 'simba', x: 0.77, y: 0.58, size: 58, yes: 31, title: 'Simba SC lifts NBC Premier', date: '18 Jul' },
  { id: 'kili', x: 0.87, y: 0.32, size: 46, yes: 64, title: 'Kilimanjaro tops 50k climbs', date: 'EOY' },
];
const HC_VERDICTS = [
  { side: 'YES', amount: 2840000, holders: 412, title: 'TZ to host AFCON 2027 group stage', odds: 84 },
  { side: 'NO', amount: 720000, holders: 256, title: 'Simba SC did not lift NBC Premier', odds: 69 },
  { side: 'YES', amount: 1980000, holders: 374, title: 'Long rains began before 15 Apr', odds: 64 },
];

function HeroConstellation({ width = 1180, height = 520 }) {
  const [hover, setHover] = hS(null);
  const [vi, setVi] = hS(0);
  hE(() => { const id = setInterval(() => setVi((i) => (i + 1) % HC_VERDICTS.length), 6000); return () => clearInterval(id); }, []);
  const particles = hM(() => Array.from({ length: 14 }).map((_, i) => { const s = i * 137; return { x: ((s * 53) % 1000) / 1000, y: ((s * 31) % 1000) / 1000, sz: 0.8 + ((s * 17) % 100) / 60, dur: [70, 60, 52][i % 3] + ((s * 11) % 12), delay: -((s * 7) % 60), op: [0.18, 0.32, 0.46][i % 3] }; }), []);
  const horizonY = height * 0.58;
  const v = HC_VERDICTS[vi];
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-xl)', width: '100%', height,
      background: 'radial-gradient(ellipse 90% 70% at 42% 46%, oklch(24% 0.115 268) 0%, oklch(19% 0.095 268) 60%, oklch(15% 0.085 268) 100%)',
      border: '1px solid oklch(78% 0.13 80 / 0.6)', boxShadow: 'inset 0 1px 0 oklch(78% 0.13 80 / 0.30), 0 24px 60px -30px oklch(8% 0.05 268 / 0.7)' }}>
      {/* drift particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((p, i) => <span key={i} style={{ position: 'absolute', left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: p.sz, height: p.sz, borderRadius: 999, background: 'oklch(80% 0.10 195)', opacity: p.op, animation: `hcDrift ${p.dur}s linear infinite`, animationDelay: `${p.delay}s` }} />)}
      </div>
      {/* gilt horizon */}
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} preserveAspectRatio="none">
        <defs><linearGradient id="hcHor" x1="0" x2="1"><stop offset="0" stopColor="oklch(78% 0.13 80)" stopOpacity="0" /><stop offset="0.25" stopColor="oklch(78% 0.13 80)" stopOpacity="0.5" /><stop offset="0.75" stopColor="oklch(78% 0.13 80)" stopOpacity="0.5" /><stop offset="1" stopColor="oklch(78% 0.13 80)" stopOpacity="0" /></linearGradient></defs>
        <line x1="0" y1={horizonY} x2={width} y2={horizonY} stroke="url(#hcHor)" strokeWidth="1" />
      </svg>
      {/* hover scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'oklch(11% 0.09 268 / 0.55)', opacity: hover ? 1 : 0, transition: 'opacity 320ms ease', pointerEvents: 'none', zIndex: 1 }} />
      {/* dials */}
      {HC_MARKETS.map((m) => {
        const isH = hover === m.id; const dim = hover && !isH;
        const left = m.x * width, top = m.y * height;
        const tipLeft = m.x > 0.55;
        const short = m.title.length > 26 ? m.title.slice(0, 25) + '…' : m.title;
        return <div key={m.id} style={{ position: 'absolute', left, top, transform: 'translate(-50%,-50%)', zIndex: isH ? 5 : 2 }}>
          <div onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)}
            style={{ cursor: 'help', opacity: dim ? 0.18 : 1, filter: dim ? 'blur(1px)' : (isH ? 'drop-shadow(0 0 22px oklch(78% 0.13 86 / 0.6))' : 'drop-shadow(0 6px 18px oklch(8% 0.06 268 / 0.55))'), transform: isH ? 'scale(1.06)' : 'scale(1)', transition: 'opacity .32s, transform .45s var(--ease-stage), filter .45s' }}>
            <ConfidenceDial yesPct={m.yes} size={m.size} />
          </div>
          {/* rest label */}
          <div style={{ position: 'absolute', left: '50%', top: m.size / 2 + 4, transform: 'translateX(-50%)', width: m.size + 30, textAlign: 'center', opacity: hover ? 0 : 1, transition: 'opacity .28s', pointerEvents: 'none' }}>
            <div style={{ ...mono, fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(72% 0.045 268)', marginBottom: 2 }}>{m.date}</div>
            <div style={{ ...disp, fontSize: 10.5, fontWeight: 500, color: 'oklch(96% 0.012 268)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{short}</div>
          </div>
          {/* tooltip */}
          <div style={{ position: 'absolute', top: '50%', [tipLeft ? 'right' : 'left']: m.size / 2 + 14, transform: 'translateY(-50%)', opacity: isH ? 1 : 0, transition: 'opacity .28s', pointerEvents: 'none', zIndex: 3, textAlign: tipLeft ? 'right' : 'left', width: 180 }}>
            <div style={{ ...mono, fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(78% 0.13 80)', marginBottom: 4 }}>Resolves {m.date}</div>
            <div style={{ ...disp, fontSize: 13, fontWeight: 500, color: 'oklch(99% 0.006 268)', lineHeight: 1.3 }}>{m.title}</div>
            <div style={{ ...mono, fontSize: 10, marginTop: 4 }}><span style={{ color: 'oklch(72% 0.13 152)' }}>YES {m.yes}¢</span><span style={{ opacity: 0.4, margin: '0 6px' }}>·</span><span style={{ color: 'oklch(78% 0.16 22)' }}>NO {100 - m.yes}¢</span></div>
          </div>
        </div>;
      })}
      {/* eyebrow */}
      <div style={{ position: 'absolute', top: 22, left: 28, display: 'flex', alignItems: 'center', gap: 10, ...mono, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'oklch(78% 0.13 80)', zIndex: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'oklch(72% 0.10 200)', boxShadow: '0 0 10px oklch(72% 0.10 200)', animation: 'aquaPulse 3s infinite' }} /> The Tipping Field
      </div>
      {/* predictors counter */}
      <div style={{ position: 'absolute', top: 22, right: 28, textAlign: 'right', zIndex: 4 }}>
        <div style={{ ...mono, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(78% 0.13 80)', marginBottom: 2 }}>predictors live</div>
        <div style={{ color: 'oklch(99% 0.006 268)' }}><HRoll value={47312} fontSize={22} /></div>
      </div>
      {/* headline */}
      <div style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', maxWidth: 330, zIndex: 4, pointerEvents: 'none' }}>
        <h1 className="disp" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', margin: 0, color: 'oklch(98% 0.012 268)' }}>Predict events.<br /><span style={{ color: 'oklch(80% 0.14 82)' }}>Not chance.</span></h1>
        <p style={{ ...mono, fontSize: 11.5, color: 'oklch(74% 0.04 268)', marginTop: 10, lineHeight: 1.5 }}>Tabiri matukio halisi · share the pool if you're right.</p>
      </div>
      {/* verdict tape */}
      <div style={{ position: 'absolute', left: 28, right: 28, bottom: 44, height: 48, zIndex: 4, display: 'flex', alignItems: 'center', borderTop: '1px solid oklch(78% 0.13 80 / 0.28)', borderBottom: '1px solid oklch(78% 0.13 80 / 0.28)' }}>
        <span style={{ ...mono, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'oklch(78% 0.13 80)', opacity: 0.7, paddingRight: 14, marginRight: 14, borderRight: '1px solid oklch(78% 0.13 80 / 0.28)', whiteSpace: 'nowrap' }}>Latest verdict</span>
        <div key={vi} style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 12, animation: 'hcVerdictIn 700ms var(--ease-spring, cubic-bezier(.34,1.56,.64,1)) both', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ ...disp, fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 4, background: v.side === 'YES' ? 'oklch(58% 0.16 152 / 0.22)' : 'oklch(60% 0.18 22 / 0.22)', color: v.side === 'YES' ? 'oklch(72% 0.13 152)' : 'oklch(78% 0.16 22)' }}>{v.side}</span>
          <span style={{ ...disp, fontSize: 14, fontWeight: 500, color: 'oklch(99% 0.006 268)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</span>
          <span style={{ ...mono, fontSize: 11, color: 'oklch(72% 0.045 268)' }}>at {v.odds}¢</span>
          <span style={{ flex: 1 }} />
          <span style={{ ...disp, fontSize: 17, fontWeight: 600, color: 'oklch(80% 0.14 82)', display: 'inline-flex', alignItems: 'baseline', gap: 4 }}><span>+TZS</span><HRoll value={v.amount} fontSize={17} /></span>
          <span style={{ ...mono, fontSize: 10, color: 'oklch(72% 0.045 268)', textTransform: 'uppercase', letterSpacing: '0.22em' }}>paid · {v.holders}</span>
        </div>
      </div>
      {/* plate mark */}
      <div style={{ position: 'absolute', bottom: 16, right: 28, display: 'flex', alignItems: 'center', gap: 10, zIndex: 4 }}>
        <div style={{ width: 14, height: 14, borderRadius: 999, border: '1px solid oklch(78% 0.13 80)', display: 'grid', placeItems: 'center', ...mono, fontSize: 7, fontWeight: 700, color: 'oklch(78% 0.13 80)' }}>50</div>
        <div style={{ ...mono, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'oklch(78% 0.13 80)', opacity: 0.85 }}>Plate I · MMXXVI</div>
      </div>
    </div>
  );
}

function HeroBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
    <NewsBanner />
    <TopNav active="Markets" />
    <div style={{ padding: '24px 28px 32px' }}>
      <HeroConstellation />
    </div>
  </div>;
}

Object.assign(window, { ConfidenceDial, HeroConstellation, HeroBoard });
