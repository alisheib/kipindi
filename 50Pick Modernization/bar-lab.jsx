// bar-lab.jsx — Probability-bar exploration. Eight distinct treatments,
// all reinstating a GOLD NEEDLE at the YES/NO price boundary.
// YES = emerald (left), NO = rose (right), always. yes% = current price.
// Loaded after glass-kit.jsx.

const { useState: bS, useEffect: bE } = React;

/* shared fills */
const YES_FILL = 'linear-gradient(90deg, oklch(56% 0.15 152 / 0.55), oklch(72% 0.155 152 / 0.92))';
const NO_FILL  = 'linear-gradient(90deg, oklch(68% 0.18 22 / 0.92), oklch(56% 0.17 22 / 0.55))';
const TRACK    = 'oklch(30% 0.05 268 / 0.45)';

/* ---- A · Gilt Seam : split fills meet at a luminous gold needle + diamond cap ---- */
function BarGiltSeam({ yes = 64, h = 28 }) {
  return (
    <div style={{ position: 'relative', height: h, paddingTop: 7 }}>
      <div style={{ position: 'relative', height: h, borderRadius: 'var(--r-pill)', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)' }}>
        <div style={{ width: `${yes}%`, background: YES_FILL, boxShadow: 'var(--glow-yes-soft)' }} />
        <div style={{ flex: 1, background: NO_FILL, boxShadow: 'var(--glow-no-soft)' }} />
      </div>
      {/* needle */}
      <div style={{ position: 'absolute', left: `${yes}%`, top: -2, bottom: -2, width: 3, transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, var(--gold-300), var(--gold-600))', borderRadius: 2,
        boxShadow: '0 0 10px oklch(85% 0.14 82 / 0.7), 0 0 3px oklch(92% 0.1 84)' }} />
      <div style={{ position: 'absolute', left: `${yes}%`, top: -2, width: 9, height: 9, transform: 'translate(-50%,-50%) rotate(45deg)',
        background: 'linear-gradient(135deg, var(--gold-300), var(--gold-500))', borderRadius: 2, boxShadow: '0 0 8px oklch(85% 0.14 82 / 0.8)' }} />
    </div>
  );
}

/* ---- B · Floating Handle : slider thumb with a gold price pill ---- */
function BarFloatingHandle({ yes = 64, h = 28 }) {
  return (
    <div style={{ position: 'relative', height: h, marginTop: 22 }}>
      <div style={{ height: h, borderRadius: 'var(--r-pill)', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)' }}>
        <div style={{ width: `${yes}%`, background: YES_FILL }} />
        <div style={{ flex: 1, background: NO_FILL }} />
      </div>
      {/* gold pill above */}
      <div className="mono" style={{ position: 'absolute', left: `${yes}%`, top: -20, transform: 'translateX(-50%)',
        padding: '2px 8px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600, color: 'oklch(22% 0.06 80)',
        background: 'var(--btn-gold-glass)', border: '1px solid oklch(92% 0.08 84 / 0.6)', boxShadow: 'var(--glow-gold-soft)', whiteSpace: 'nowrap' }}>{yes}%</div>
      {/* thumb */}
      <div style={{ position: 'absolute', left: `${yes}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 14, height: h + 8, borderRadius: 7,
        background: 'var(--btn-gold-glass)', border: '1px solid oklch(92% 0.08 84 / 0.7)', boxShadow: 'var(--glow-gold-soft), 0 2px 8px oklch(8% 0.04 268 / 0.5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 5, height: 1.5, borderRadius: 2, background: 'oklch(40% 0.08 80 / 0.6)' }} />)}
      </div>
    </div>
  );
}

/* ---- C · Segmented Gap : two segments, gold ruler-tick needle in the gap ---- */
function BarSegmentedGap({ yes = 64, h = 28 }) {
  return (
    <div style={{ position: 'relative', height: h, paddingTop: 6 }}>
      <div style={{ display: 'flex', gap: 8, height: h }}>
        <div style={{ width: `calc(${yes}% - 4px)`, background: YES_FILL, borderRadius: 'var(--r-sm)', boxShadow: 'var(--glow-yes-soft)' }} />
        <div style={{ flex: 1, background: NO_FILL, borderRadius: 'var(--r-sm)', boxShadow: 'var(--glow-no-soft)' }} />
      </div>
      <div style={{ position: 'absolute', left: `${yes}%`, top: -1, bottom: -1, transform: 'translateX(-50%)', width: 2,
        background: 'var(--gold-400)', boxShadow: '0 0 8px oklch(85% 0.14 82 / 0.8)' }} />
      {[-3, h + 1].map((t, i) => <div key={i} style={{ position: 'absolute', left: `${yes}%`, top: t, transform: 'translateX(-50%)', width: 10, height: 2, borderRadius: 2, background: 'var(--gold-300)', boxShadow: '0 0 6px oklch(88% 0.12 84 / 0.7)' }} />)}
    </div>
  );
}

/* ---- D · Inset Gem : recessed glassy groove, faceted gold gem marker ---- */
function BarInsetGem({ yes = 64, h = 28 }) {
  return (
    <div style={{ position: 'relative', height: h }}>
      <div style={{ height: h, borderRadius: 'var(--r-pill)', overflow: 'hidden', display: 'flex', background: TRACK,
        boxShadow: 'inset 0 2px 5px oklch(6% 0.03 268 / 0.7), inset 0 -1px 0 oklch(60% 0.06 268 / 0.15)' }}>
        <div style={{ width: `${yes}%`, background: 'linear-gradient(90deg, oklch(50% 0.13 152 / 0.4), oklch(66% 0.15 152 / 0.7))' }} />
        <div style={{ flex: 1, background: 'linear-gradient(90deg, oklch(62% 0.17 22 / 0.7), oklch(50% 0.16 22 / 0.4))' }} />
      </div>
      {/* faceted gem */}
      <div style={{ position: 'absolute', left: `${yes}%`, top: '50%', width: 16, height: 16, transform: 'translate(-50%,-50%) rotate(45deg)', borderRadius: 3,
        background: 'linear-gradient(135deg, var(--gold-300) 0%, var(--gold-500) 50%, var(--gold-600) 100%)',
        boxShadow: '0 0 12px oklch(85% 0.14 82 / 0.8), inset 1px 1px 2px oklch(96% 0.06 84 / 0.8), inset -1px -1px 2px oklch(50% 0.10 80 / 0.5)', border: '0.5px solid oklch(92% 0.08 84 / 0.5)' }} />
    </div>
  );
}

/* ---- E · Cursor Line : Bloomberg-crisp crosshair needle + floating price ---- */
function BarCursorLine({ yes = 64, h = 10 }) {
  return (
    <div style={{ position: 'relative', height: 50, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: h, borderRadius: 'var(--r-pill)', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)' }}>
        <div style={{ width: `${yes}%`, background: YES_FILL }} />
        <div style={{ flex: 1, background: 'oklch(55% 0.16 22 / 0.35)' }} />
      </div>
      {/* crosshair */}
      <div style={{ position: 'absolute', left: `${yes}%`, top: 4, bottom: 4, width: 1.5, transform: 'translateX(-50%)', background: 'var(--gold-400)', boxShadow: '0 0 8px oklch(85% 0.14 82 / 0.7)' }} />
      <div style={{ position: 'absolute', left: `${yes}%`, top: 4, width: 6, height: 6, borderRadius: 9, transform: 'translate(-50%,-50%)', background: 'var(--gold-300)', boxShadow: '0 0 8px oklch(88% 0.12 84)' }} />
      <div className="mono" style={{ position: 'absolute', left: `${yes}%`, top: -4, transform: 'translateX(-50%)', fontSize: 12, fontWeight: 600, color: 'var(--gold-300)' }}>{yes}%</div>
    </div>
  );
}

/* ---- F · Refraction Meniscus : light blooming where two glass liquids meet ---- */
function BarRefraction({ yes = 64, h = 28 }) {
  return (
    <div style={{ position: 'relative', height: h, overflow: 'visible' }}>
      <div style={{ height: h, borderRadius: 'var(--r-pill)', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)',
        WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}>
        <div style={{ width: `${yes}%`, background: 'linear-gradient(90deg, oklch(56% 0.15 152 / 0.5), oklch(74% 0.155 152 / 0.85) 92%, oklch(92% 0.1 84 / 0.9))' }} />
        <div style={{ flex: 1, background: 'linear-gradient(90deg, oklch(92% 0.1 84 / 0.9), oklch(70% 0.18 22 / 0.85) 8%, oklch(56% 0.17 22 / 0.5))' }} />
      </div>
      {/* bright gold core + wide bloom */}
      <div style={{ position: 'absolute', left: `${yes}%`, top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)', background: 'oklch(96% 0.08 86)',
        boxShadow: '0 0 4px oklch(94% 0.08 84), 0 0 22px oklch(86% 0.13 82 / 0.7), 0 0 44px oklch(82% 0.13 82 / 0.3)' }} />
    </div>
  );
}

/* ---- G · Ticker Notches : market-depth ruler + bold gold notch + momentum ▲ ---- */
function BarTickerNotch({ yes = 64, h = 28 }) {
  const notches = 'repeating-linear-gradient(90deg, transparent 0 calc(5% - 1px), oklch(70% 0.05 268 / 0.18) calc(5% - 1px) 5%)';
  return (
    <div style={{ position: 'relative', height: h, paddingTop: 9 }}>
      <div style={{ position: 'relative', height: h, borderRadius: 'var(--r-sm)', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)' }}>
        <div style={{ width: `${yes}%`, background: YES_FILL }} />
        <div style={{ flex: 1, background: NO_FILL }} />
        <div style={{ position: 'absolute', inset: 0, background: notches, pointerEvents: 'none' }} />
      </div>
      <div style={{ position: 'absolute', left: `${yes}%`, top: 5, bottom: 0, width: 3, transform: 'translateX(-50%)', background: 'var(--gold-400)', boxShadow: '0 0 9px oklch(85% 0.14 82 / 0.8)' }} />
      <div style={{ position: 'absolute', left: `${yes}%`, top: -1, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '7px solid var(--gold-300)', filter: 'drop-shadow(0 0 4px oklch(88% 0.12 84))' }} />
    </div>
  );
}

/* ---- H · Live Pulse : needle that breathes, expanding ring at base (live markets) ---- */
function BarLivePulse({ yes = 64, h = 28 }) {
  return (
    <div style={{ position: 'relative', height: h, paddingTop: 4 }}>
      <div style={{ height: h, borderRadius: 'var(--r-pill)', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)' }}>
        <div style={{ width: `${yes}%`, background: YES_FILL, boxShadow: 'var(--glow-yes-soft)' }} />
        <div style={{ flex: 1, background: NO_FILL, boxShadow: 'var(--glow-no-soft)' }} />
      </div>
      <div style={{ position: 'absolute', left: `${yes}%`, top: 0, bottom: 0, width: 3, transform: 'translateX(-50%)', background: 'linear-gradient(180deg, var(--gold-300), var(--gold-600))', borderRadius: 2,
        boxShadow: '0 0 10px oklch(85% 0.14 82 / 0.7)', animation: 'livePulse 1.5s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', left: `${yes}%`, top: '50%', width: 10, height: 10, borderRadius: 9, transform: 'translate(-50%,-50%)', border: '1.5px solid var(--gold-300)', animation: 'ringExpand 1.8s ease-out infinite' }} />
      <div style={{ position: 'absolute', left: `${yes}%`, top: '50%', width: 6, height: 6, borderRadius: 9, transform: 'translate(-50%,-50%)', background: 'var(--gold-300)', boxShadow: '0 0 8px oklch(88% 0.12 84)' }} />
    </div>
  );
}

const BARS = [
  ['A · Gilt Seam', 'Split fills meet at a luminous gold needle capped with a diamond. Closest to your original — the needle, amplified.', BarGiltSeam],
  ['B · Floating Handle', 'Slider-thumb needle carrying a gold price pill. Most tactile — reads as draggable, invites interaction.', BarFloatingHandle],
  ['C · Segmented Gap', 'Two rounded segments with a gap; gold ruler-tick needle bridges them. Crisp, structured, Kalshi-grade clarity.', BarSegmentedGap],
  ['D · Inset Gem', 'Recessed glassy groove with a faceted gold gem at the price. Jewel-like, premium, distinctly ours.', BarInsetGem],
  ['E · Cursor Line', 'Thin track + crosshair needle + floating price. Bloomberg-terminal restraint for dense lists.', BarCursorLine],
  ['F · Refraction Meniscus', 'Light blooms where the two glass liquids meet. The most "Dark Glass" — the needle is pure light.', BarRefraction],
  ['G · Ticker Notches', 'Market-depth ruler notches + bold gold needle + momentum triangle. Reads like a live trading instrument.', BarTickerNotch],
  ['H · Live Pulse', 'Needle breathes with an expanding ring — for live markets only. Motion = the market is alive right now.', BarLivePulse],
];

function BarVariantFrame({ label, desc, Comp }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: 26, background: 'var(--bg-base)', boxSizing: 'border-box',
      backgroundImage: 'radial-gradient(120% 100% at 50% -20%, oklch(19% 0.08 268 / 0.5), transparent 60%)' }}>
      <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-300)', marginBottom: 18 }}>{label}</div>
      {/* hero context */}
      <div className="glass" style={{ padding: 18, marginBottom: 16 }}>
        <div className="disp" style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 12 }}>Will Simba SC win the Kariakoo derby?</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12.5 }}>
          <span className="mono" style={{ color: 'var(--yes-300)', fontWeight: 600 }}>YES 64%</span>
          <span className="mono" style={{ color: 'var(--no-300)', fontWeight: 600 }}>NO 36%</span>
        </div>
        <Comp yes={64} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span className="mono">TZS 48.2M pool</span><span className="mono">needle = 0.64 price</span>
        </div>
      </div>
      {/* dense list micro */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 8 }}>In a dense list</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[58, 41].map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 92, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i ? 'TZS/USD < 2,700' : 'Bitcoin > $90k'}</span>
            <div style={{ flex: 1 }}><Comp yes={v} h={i ? 14 : 14} /></div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5, marginTop: 18 }}>{desc}</div>
    </div>
  );
}

Object.assign(window, {
  BarGiltSeam, BarFloatingHandle, BarSegmentedGap, BarInsetGem, BarCursorLine, BarRefraction, BarTickerNotch, BarLivePulse,
  BARS, BarVariantFrame,
});
