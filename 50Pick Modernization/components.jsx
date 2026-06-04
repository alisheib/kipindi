// components.jsx — Focused refresh: BUTTONS · STATS · POPUPS
// Keeps the existing (pretty) market card + the existing dark royal palette.
// Clean & flat — no heavy glass. Loaded after design-canvas.jsx.

const { useState: cS, useEffect: cE, useRef: cR } = React;

/* ===== their palette, clean/flat dark ===== */
/* ===== matched to the live 50pick platform (deep navy + green/red + gold needle) ===== */
const T = {
  page: 'oklch(14% 0.075 263)',
  card: 'oklch(19.5% 0.085 263)',
  cardAlt: 'oklch(16.5% 0.075 263)',
  inset: 'oklch(12% 0.065 263)',
  border: 'oklch(31% 0.075 263)',
  borderStrong: 'oklch(42% 0.090 263)',
  text: 'oklch(97% 0.012 263)',
  muted: 'oklch(64% 0.045 263)',
  subtle: 'oklch(54% 0.045 263)',
  accent: 'oklch(62% 0.150 262)', accentSoft: 'oklch(34% 0.095 262)', accentDeep: 'oklch(46% 0.150 262)', accentBright: 'oklch(72% 0.150 262)',
  gold: 'oklch(80% 0.125 85)',
  goldDim: 'oklch(70% 0.130 82)',
  goldText: 'oklch(22% 0.060 80)',
  goldFill: 'linear-gradient(180deg, oklch(85% 0.12 86) 0%, oklch(75% 0.135 82) 100%)',
  yes: 'oklch(61% 0.155 150)', yesSoft: 'oklch(30% 0.080 150)', yesDeep: 'oklch(47% 0.140 150)', yesBright: 'oklch(70% 0.150 150)',
  no: 'oklch(58% 0.195 25)', noSoft: 'oklch(31% 0.105 25)', noDeep: 'oklch(45% 0.175 25)', noBright: 'oklch(67% 0.185 25)',
  strip: 'linear-gradient(90deg, oklch(62% 0.155 262), oklch(80% 0.125 85))',
  r: 12,
};
const mono = { fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' };
const disp = { fontFamily: 'Sora, sans-serif', letterSpacing: '-0.02em' };

/* tiny icons */
const Ic = ({ d, s = 16, sw = 1.85, fill = 'none' }) => <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={d} /></svg>;
const IcCheck = (p) => <Ic d="M5 12.5l4.5 4.5L19 7" sw={2.6} {...p} />;
const IcClock = (p) => <Ic d="M12 7v5l3 2" {...p} />;
const Spinner = ({ c }) => <svg width="17" height="17" viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}><circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeOpacity="0.25" strokeWidth="3"/><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"/></svg>;

/* ============================================================
   BUTTON — refreshed. variant: gold|yes|no|ghost|outline
   state (for spec rows): rest|hover|press|disabled|loading
   ============================================================ */
function Btn({ variant = 'gold', size = 'md', children, state, leading, live }) {
  const [h, setH] = cS(false); const [p, setP] = cS(false);
  const hover = live ? h : state === 'hover';
  const press = live ? p : state === 'press';
  const disabled = state === 'disabled'; const loading = state === 'loading';
  const H = { sm: 36, md: 44, lg: 52 }[size];
  const pad = { sm: 16, md: 22, lg: 28 }[size];
  const fs = { sm: 13, md: 15, lg: 16 }[size];

  let bg, color, border = 'none', shadow = 'none', filter = 'none', weight = 700;
  if (variant === 'gold') { bg = T.goldFill; color = T.goldText; shadow = hover ? `0 6px 18px oklch(80% 0.13 80 / 0.32)` : `0 1px 0 oklch(95% 0.06 84 / 0.4) inset, 0 3px 0 ${T.goldDim}`; }
  else if (variant === 'yes') { bg = T.yes; color = '#06130d'; shadow = hover ? `0 5px 16px ${T.yes}40` : `0 3px 0 ${T.yesDeep}`; filter = press ? 'brightness(0.94)' : 'none'; }
  else if (variant === 'no') { bg = T.no; color = '#180607'; shadow = hover ? `0 5px 16px ${T.no}40` : `0 3px 0 ${T.noDeep}`; filter = press ? 'brightness(0.94)' : 'none'; }
  else if (variant === 'blue') { bg = T.accent; color = '#fff'; shadow = hover ? `0 5px 16px ${T.accent}45` : `0 3px 0 ${T.accentDeep}`; filter = press ? 'brightness(0.96)' : 'none'; }
  else if (variant === 'ghost') { bg = hover ? T.accentSoft : 'transparent'; color = T.text; border = `1px solid ${T.border}`; weight = 600; }
  else { bg = 'transparent'; color = T.accent; border = `1px solid ${T.accent}66`; weight = 600; }

  return (
    <button disabled={disabled || loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      style={{ height: H, padding: `0 ${pad}px`, borderRadius: T.r - 3, border, background: bg, color, filter,
        font: `${weight} ${fs}px Inter, sans-serif`, letterSpacing: (variant === 'yes' || variant === 'no') ? '0.03em' : 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, boxShadow: shadow,
        transform: press ? 'translateY(2px) scale(0.99)' : hover && !disabled ? 'translateY(-1px)' : 'none',
        transition: 'transform .12s cubic-bezier(.2,.8,.2,1), box-shadow .18s, background .18s, filter .12s' }}>
      {loading ? <Spinner c={color} /> : leading}{children}
    </button>
  );
}

/* clean split bar — YES left (emerald), NO right (rose). Same logic as the
   existing card; no needle. A crisp page-colored seam keeps the two sides
   distinct. */
function ProbBar({ yes, h = 12 }) {
  return (
    <div style={{ position: 'relative', height: h, display: 'flex', borderRadius: 999, overflow: 'hidden', background: T.inset, border: `1px solid ${T.border}` }}>
      <div style={{ width: `${yes}%`, background: T.yes, transition: 'width .5s cubic-bezier(.16,1,.3,1)' }} />
      <div style={{ width: 2, background: T.card, flexShrink: 0 }} />
      <div style={{ flex: 1, background: T.no }} />
    </div>
  );
}

/* conviction bar — green fill + thin GOLD needle on a dark track (yours). */
function ConvictionBar({ yes, h = 7 }) {
  return (
    <div style={{ position: 'relative', height: h }}>
      <div style={{ height: h, borderRadius: 999, overflow: 'hidden', background: T.inset, border: `1px solid ${T.border}` }}>
        <div style={{ width: `${yes}%`, height: '100%', background: `linear-gradient(90deg, ${T.yesDeep}, ${T.yes})`, transition: 'width .5s cubic-bezier(.16,1,.3,1)' }} />
      </div>
      <div style={{ position: 'absolute', left: `${yes}%`, top: -3, bottom: -3, width: 3, transform: 'translateX(-50%)', background: T.gold, borderRadius: 2, boxShadow: `0 0 6px ${T.gold}aa` }} />
    </div>
  );
}
function Chip({ tone = 'cat', children }) {
  const map = { live: [T.no, T.no + '1f'], cat: [T.muted, T.cardAlt], gold: [T.gold, T.gold + '1f'], yes: [T.yes, T.yes + '1f'] };
  const [fg, bg] = map[tone] || map.cat;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: fg, background: bg, border: `1px solid ${fg}33` }}>{tone === 'live' && <span style={{ width: 6, height: 6, borderRadius: 9, background: T.no, animation: 'lpulse 1.5s infinite' }} />}{children}</span>;
}

/* ===== section helpers ===== */
const Board = ({ children }) => <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 28, background: T.page, color: T.text, fontFamily: 'Inter, sans-serif' }}>{children}</div>;
const H = ({ children, sub }) => <div style={{ marginBottom: 22 }}><div style={{ ...disp, fontSize: 19, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 13, color: T.subtle, marginTop: 3 }}>{sub}</div>}</div>;
const Lbl = ({ children }) => <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.subtle, marginBottom: 11 }}>{children}</div>;
const Panel = ({ children, pad = 18, style }) => <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, padding: pad, ...style }}>{children}</div>;

/* ============================================================
   ANCHOR — the existing market card (kept)
   ============================================================ */
function MarketCardKept() {
  const [h, setH] = cS(false);
  const cat = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.subtle }}>
      <Ic d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18M3 12h18" s={13} sw={1.6} /> Sports
    </span>
  );
  return (
    <Board>
      <H sub="Recreated from your screenshot in your exact colours — deep navy, green/red, gold conviction needle. Same layout & logic.">Market card · your colours</H>
      <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ background: T.card, border: `1px solid ${h ? T.borderStrong : T.border}`, borderRadius: T.r, overflow: 'hidden', transition: 'transform .2s, border-color .2s, box-shadow .2s',
          transform: h ? 'translateY(-2px)' : 'none', boxShadow: h ? '0 12px 32px oklch(6% 0.05 263 / 0.5)' : 'none' }}>
        <div style={{ padding: '15px 16px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Chip tone="live">Live</Chip><Chip tone="gold">Hot</Chip>{cat}</div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, ...mono, color: T.subtle, background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 999, padding: '3px 8px' }}><Ic d="M12 5v14M6 13l6 6 6-6" s={11} sw={2} /> -8 pt</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <div style={{ ...disp, fontSize: 16, fontWeight: 600, lineHeight: 1.32 }}>Demo · 15-minute hot market — will the demo close YES in 15 min?</div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: T.yes }}>YES</div>
              <div style={{ ...mono, fontSize: 30, fontWeight: 700, color: T.yes, lineHeight: 1 }}>50<span style={{ fontSize: 14, color: T.subtle }}>%</span></div>
            </div>
          </div>
          <ConvictionBar yes={50} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0 14px' }}>
            <Btn variant="yes" size="md" live>YES&nbsp;&nbsp;<span style={mono}>50</span></Btn>
            <Btn variant="no" size="md" live>NO&nbsp;&nbsp;<span style={mono}>50</span></Btn>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, ...mono, color: T.subtle }}><span>0 traders · TZS 100,000</span><span>11m left</span></div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 14, lineHeight: 1.5 }}>Your card, rebuilt from the screenshot. Confirm the colours read right — then pick a button treatment below →</div>
    </Board>
  );
}

/* ============================================================
   BUTTONS — refreshed (variants + states + sizes)
   ============================================================ */
function StateCell({ label, children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>{children}<span style={{ fontSize: 10.5, color: T.subtle, fontWeight: 600 }}>{label}</span></div>;
}
function ButtonsBoard() {
  return (
    <Board>
      <H sub="Solid gold for the one CTA (confirm / payout). YES/NO tinted, fill on press. Spring on hover, scale on press.">Buttons · refreshed</H>
      <Lbl>Primary CTA — states</Lbl>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
        <StateCell label="Rest"><Btn variant="gold" leading={<IcCheck s={17} />}>Confirm · TZS 25,000</Btn></StateCell>
        <StateCell label="Hover"><Btn variant="gold" state="hover" leading={<IcCheck s={17} />}>Confirm · TZS 25,000</Btn></StateCell>
        <StateCell label="Press"><Btn variant="gold" state="press" leading={<IcCheck s={17} />}>Confirm · TZS 25,000</Btn></StateCell>
        <StateCell label="Loading"><Btn variant="gold" state="loading">Placing…</Btn></StateCell>
        <StateCell label="Disabled"><Btn variant="gold" state="disabled" leading={<IcCheck s={17} />}>Confirm</Btn></StateCell>
      </div>
      <Lbl>YES / NO — rest · hover · pressed (fills)</Lbl>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 24 }}>
        <StateCell label="Rest"><div style={{ display: 'flex', gap: 8 }}><Btn variant="yes">YES 0.64</Btn><Btn variant="no">NO 0.36</Btn></div></StateCell>
        <StateCell label="Hover"><div style={{ display: 'flex', gap: 8 }}><Btn variant="yes" state="hover">YES 0.64</Btn><Btn variant="no" state="hover">NO 0.36</Btn></div></StateCell>
        <StateCell label="Pressed"><div style={{ display: 'flex', gap: 8 }}><Btn variant="yes" state="press">YES 0.64</Btn><Btn variant="no" state="press">NO 0.36</Btn></div></StateCell>
      </div>
      <Lbl>Secondary &amp; brand blue</Lbl>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <Btn variant="blue" live leading={<Ic d="M4 7h13l-3-3M20 17H7l3 3" s={16} sw={2} />}>Place prediction</Btn><Btn variant="ghost" live>Cancel</Btn><Btn variant="outline" live>View resolution</Btn><Btn variant="ghost" state="disabled">Follow · soon</Btn>
      </div>
      <Lbl>Sizes</Lbl>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Btn variant="gold" size="sm" live>Small</Btn><Btn variant="gold" size="md" live>Medium</Btn><Btn variant="gold" size="lg" live>Large</Btn>
      </div>
      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 22, lineHeight: 1.5 }}>Try the live ones (Secondary + Sizes) — hover & click to feel the 120ms spring + press-scale. Radius {T.r - 3}px, mono prices.</div>
    </Board>
  );
}

/* ============================================================
   STATS — refreshed
   ============================================================ */
function RollNum({ value, prefix = '' }) {
  const [d, setD] = cS(0); const raf = cR();
  cE(() => { const s = performance.now(); const tick = (n) => { const p = Math.min(1, (n - s) / 850); setD(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf.current = requestAnimationFrame(tick); }; raf.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf.current); }, [value]);
  return <span style={mono}>{prefix}{d.toLocaleString('en-US')}</span>;
}
function StatTile({ icon, label, value, accent }) {
  return (
    <div style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: T.r - 2, padding: '15px 16px' }}>
      <span style={{ color: accent || T.subtle }}>{icon}</span>
      <div style={{ ...mono, fontSize: 21, fontWeight: 600, marginTop: 9, color: accent || T.text }}>{value}</div>
      <div style={{ fontSize: 11.5, color: T.subtle, marginTop: 2 }}>{label}</div>
    </div>
  );
}
function StatsBoard() {
  return (
    <Board>
      <H sub="Mono tabular figures, clear hierarchy, gold reserved for value-to-you. Numbers roll on change.">Stats · refreshed</H>
      <Lbl>Stat tiles</Lbl>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <StatTile icon={<Ic d="M3 6h18v12H3zM3 9h18M16 13h2" s={17} />} label="Total pool" value={<RollNum prefix="TZS " value={48200000 / 1000} />} />
        <StatTile icon={<Ic d="M9 11a3 3 0 100-6 3 3 0 000 6zM4 20a5 5 0 0110 0" s={17} />} label="Predictors" value={<RollNum value={1284} />} />
        <StatTile icon={<IcClock s={17} />} label="Resolves in" value="2d 4h" />
      </div>
      <Lbl>Probability readout</Lbl>
      <Panel style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.subtle }}>YES probability</div>
            <div style={{ ...mono, fontSize: 46, fontWeight: 700, lineHeight: 1.05, marginTop: 4 }}>64<span style={{ fontSize: 22, color: T.subtle }}>%</span></div></div>
          <span style={{ ...mono, fontSize: 13, color: T.yes, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Ic d="M12 20V4M6 10l6-6 6 6" s={14} sw={2.2} /> +6 today</span>
        </div>
        <ProbBar yes={64} h={14} />
      </Panel>
      <Lbl>Pool meter</Lbl>
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, ...mono, marginBottom: 8 }}><span style={{ color: T.yes }}>YES · TZS 30.8M</span><span style={{ color: T.no }}>NO · TZS 17.4M</span></div>
        <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', gap: 3 }}><div style={{ width: '64%', background: T.yes, borderRadius: 999 }} /><div style={{ flex: 1, background: T.no, borderRadius: 999 }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.subtle, marginTop: 8 }}><span>Operator margin 9% from losing pool</span><span style={{ color: T.gold, ...mono }}>Distributed TZS 43.9M</span></div>
      </Panel>
    </Board>
  );
}

/* ============================================================
   POPUPS — refreshed (clean, flat, no heavy glass)
   ============================================================ */
function ModalShell({ children, w = 380 }) {
  // subtle dim + light 4px blur backdrop, flat modal card
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'oklch(10% 0.03 268 / 0.55)', WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: w, background: T.card, border: `1px solid ${T.borderStrong}`, borderRadius: T.r + 2,
        boxShadow: '0 24px 70px oklch(6% 0.03 268 / 0.6)', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}
function MiniBackdrop() {
  return <div style={{ position: 'absolute', inset: 0, padding: 26, opacity: 0.5 }}>
    <Panel><div style={{ ...disp, fontSize: 16, fontWeight: 600 }}>Will Simba SC win the Kariakoo derby?</div><div style={{ height: 12 }} /><ProbBar yes={64} /></Panel></div>;
}

function ConfirmPopup() {
  return (
    <Board><div style={{ position: 'relative', height: '100%', margin: -28 }}>
      <MiniBackdrop />
      <ModalShell w={400}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.subtle, marginBottom: 8 }}>Confirm prediction</div><Chip tone="yes">YES · 0.64</Chip></div>
            <span style={{ color: T.subtle, cursor: 'pointer' }}><Ic d="M6 6l12 12M18 6L6 18" s={18} /></span>
          </div>
          <div style={{ ...disp, fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>Will Simba SC win the Kariakoo derby?</div>
          <div style={{ fontSize: 13, fontStyle: 'italic', color: T.subtle, margin: '4px 0 20px' }}>Je, Simba SC watashinda dabi ya Kariakoo?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
            {[['Your stake', 'TZS 25,000', T.text], ['Share of pool', '0.41%', T.muted], ['If correct, you receive', 'TZS 39,062', T.gold]].map(([l, v, c], i) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: i === 2 ? 14 : 13, color: T.subtle, fontWeight: i === 2 ? 600 : 400 }}>{l}</span><span style={{ ...mono, fontSize: i === 2 ? 19 : 14, fontWeight: 600, color: c }}>{v}</span></div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}><Btn variant="gold" size="lg" live leading={<IcCheck s={18} />}>Confirm · TZS 25,000</Btn></div>
          <p style={{ fontSize: 11.5, color: T.subtle, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>Pool-share payout. Outcome may differ from current odds.</p>
        </div>
      </ModalShell>
    </div></Board>
  );
}

function WinPopup() {
  const [go, setGo] = cS(false);
  const replay = () => { setGo(false); requestAnimationFrame(() => setTimeout(() => setGo(true), 20)); };
  cE(() => { const t = setTimeout(() => setGo(true), 250); return () => clearTimeout(t); }, []);
  return (
    <Board><div style={{ position: 'relative', height: '100%', margin: -28 }}>
      <MiniBackdrop />
      <ModalShell w={380}>
        <div key={go ? 'a' : 'b'} style={{ padding: '34px 30px 26px', textAlign: 'center', transform: go ? 'scale(1)' : 'scale(0.94)', opacity: go ? 1 : 0, transition: 'transform .28s cubic-bezier(.34,1.56,.64,1), opacity .28s' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: 999, background: T.goldFill, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.goldText, boxShadow: `0 6px 18px oklch(80% 0.13 80 / 0.3)` }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: go ? 0 : 1, transition: 'stroke-dashoffset .45s ease .35s' }} /></svg>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold, marginBottom: 9 }}>Resolved · YES</div>
          <div style={{ ...disp, fontSize: 26, fontWeight: 700, marginBottom: 12 }}>You were right</div>
          <div style={{ ...mono, fontSize: 40, fontWeight: 600, color: T.gold, lineHeight: 1 }}>+TZS {go ? <RollNum value={39062} /> : '0'}</div>
          <div style={{ width: 40, height: 2, background: T.gold, borderRadius: 2, margin: '16px auto', opacity: 0.6 }} />
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 22 }}>Imelipwa · Paid to your wallet</div>
          <Btn variant="gold" size="lg" live>Continue</Btn>
        </div>
      </ModalShell>
      <button onClick={replay} style={{ position: 'absolute', bottom: 0, right: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', background: T.cardAlt, border: `1px solid ${T.border}`, color: T.muted, font: '600 12px Inter' }}>↻ Replay</button>
    </div></Board>
  );
}

function LossPopup() {
  return (
    <Board><div style={{ position: 'relative', height: '100%', margin: -28 }}>
      <MiniBackdrop />
      <ModalShell w={380}>
        <div style={{ padding: '34px 30px 26px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, margin: '0 auto 20px', borderRadius: 999, background: T.noSoft, border: `1px solid ${T.no}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.no }}><Ic d="M12 4v16M6 14l6 6 6-6" s={26} sw={2} /></div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.no, marginBottom: 9 }}>Resolved · NO</div>
          <div style={{ ...disp, fontSize: 25, fontWeight: 700, marginBottom: 6 }}>Not this time</div>
          <div style={{ fontSize: 14, fontStyle: 'italic', color: T.muted, marginBottom: 22 }}>Si safari hii — karibu tena.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '16px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, marginBottom: 22, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 13, color: T.subtle }}>Your prediction</span><Chip tone="yes">YES</Chip></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.subtle }}>Stake</span><span style={{ ...mono, fontWeight: 600 }}>TZS 25,000</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="ghost" size="md" live>View resolution</Btn><Btn variant="blue" size="md" live>Browse markets</Btn></div>
        </div>
      </ModalShell>
    </div></Board>
  );
}

function ToastsPopup() {
  const rows = [['success', T.yes, T.yesSoft, 'M5 12.5l4.5 4.5L19 7', 'Prediction placed', 'TZS 25,000 on YES · Simba SC derby'],
    ['gold', T.gold, T.gold + '24', 'M7 4h10v4a5 5 0 01-10 0zM9 14h6l-1 4h-4z', 'You won TZS 39,062', 'Paid to your wallet · Imelipwa'],
    ['info', T.accent, T.accentSoft, 'M12 8h.01M11 12h1v4h1', 'Market resolves in 1 hour', 'Bitcoin > $90k · last call to predict']];
  return (
    <Board><H sub="Flat card, colored icon disc, progress underline. Top-anchored on mobile, top-right stack on desktop.">Toasts</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(([k, c, soft, d, title, sub]) => (
          <div key={k} style={{ position: 'relative', display: 'flex', gap: 13, alignItems: 'center', background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, padding: '14px 16px', overflow: 'hidden' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: soft, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic d={d} s={18} sw={2.2} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div><div style={{ fontSize: 12, color: T.subtle, marginTop: 1 }}>{sub}</div></div>
            <span style={{ color: T.subtle, cursor: 'pointer' }}><Ic d="M6 6l12 12M18 6L6 18" s={15} /></span>
            <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: '100%', background: c, opacity: 0.5 }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 18, lineHeight: 1.5 }}>Auto-dismiss 4s (progress underline), pause on hover, swipe-right to dismiss on mobile.</div>
    </Board>
  );
}

/* ============================================================
   BUTTON ENHANCEMENT LAB — your green/red, nicer
   ============================================================ */
function EnhBtn({ tone = 'yes', kind = 'flat', size = 'lg' }) {
  const [h, setH] = cS(false); const [p, setP] = cS(false);
  const c = tone === 'yes'
    ? { base: T.yes, deep: T.yesDeep, bright: T.yesBright, text: '#05130c' }
    : { base: T.no, deep: T.noDeep, bright: T.noBright, text: '#190607' };
  const Ht = size === 'lg' ? 50 : 44;
  const label = tone === 'yes' ? 'YES' : 'NO'; const price = '50';
  let st = { height: Ht, borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: c.text,
    font: '700 15px Inter, sans-serif', letterSpacing: '0.03em',
    transition: 'transform .12s cubic-bezier(.2,.8,.2,1), box-shadow .18s, filter .15s, background .18s' };
  let inner = <>{label} <span style={{ ...mono, opacity: 0.9 }}>{price}</span></>;
  if (kind === 'flat') { st = { ...st, background: c.base }; }
  else if (kind === 'bevel') { st = { ...st, background: c.base, boxShadow: p ? `inset 0 2px 5px ${c.deep}` : `inset 0 1px 0 ${c.bright}, 0 ${h ? 4 : 3}px 0 ${c.deep}`, transform: p ? 'translateY(2px)' : h ? 'translateY(-1px)' : 'none' }; }
  else if (kind === 'gloss') { st = { ...st, background: `linear-gradient(180deg, ${c.bright}, ${c.base} 58%, ${c.deep})`, boxShadow: h ? `0 6px 18px ${c.base}59` : `0 2px 6px ${c.deep}99`, filter: p ? 'brightness(0.95)' : 'none', transform: p ? 'scale(0.99)' : h ? 'translateY(-1px)' : 'none' }; }
  else if (kind === 'glow') { st = { ...st, background: c.base, border: `1px solid ${c.bright}`, boxShadow: h ? `0 0 0 1px ${c.base}, 0 0 20px ${c.base}80` : 'none', transform: p ? 'scale(0.98)' : 'none' }; }
  else if (kind === 'inset') { st = { ...st, background: c.base, justifyContent: 'space-between', padding: '0 6px 0 16px', boxShadow: p ? `inset 0 2px 5px ${c.deep}` : `0 3px 0 ${c.deep}`, transform: p ? 'translateY(2px)' : h ? 'translateY(-1px)' : 'none' };
    inner = <><span>{label}</span><span style={{ ...mono, background: 'rgba(0,0,0,0.24)', color: '#fff', padding: '4px 9px', borderRadius: 7, fontSize: 13 }}>{price}</span></>; }
  return <button onMouseEnter={() => setH(true)} onMouseLeave={() => { setH(false); setP(false); }} onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} style={st}>{inner}</button>;
}
function ButtonLab() {
  const kinds = [
    ['flat', 'Baseline (yours)', 'Your current flat solid fill — for comparison.'],
    ['bevel', 'Beveled', 'Inner top highlight + 3px bottom edge; presses down 2px. Tactile, physical.'],
    ['gloss', 'Glossy', 'Soft top→bottom gradient + lift + colour shadow on hover. Premium.'],
    ['glow', 'Glow edge', 'Crisp 1px brighter border + outer colour glow on hover. Clean, modern.'],
    ['inset', 'Price chip', 'Label left, price in an inset chip right. Clearer, sportsbook-style.'],
  ];
  return (
    <Board>
      <H sub="Your green/red — same colours, enhanced. Hover & press each, then pick one (or mix).">Button enhancements</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {kinds.map(([k, name, desc]) => (
          <div key={k}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 9 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span><span style={{ fontSize: 11.5, color: T.subtle }}>{desc}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 400 }}>
              <EnhBtn tone="yes" kind={k} /><EnhBtn tone="no" kind={k} />
            </div>
          </div>
        ))}
      </div>
    </Board>
  );
}

Object.assign(window, { T, Btn, ProbBar, ConvictionBar, Chip, MarketCardKept, ButtonsBoard, StatsBoard, ConfirmPopup, WinPopup, LossPopup, ToastsPopup, EnhBtn, ButtonLab, Board, H, Lbl, Panel, mono, disp, Ic, IcCheck, RollNum });
