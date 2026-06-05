/* Prediction-market microstructure components.
   These are the things that distinguish a real prediction-market UI
   from a generic "platform": order book, price chart, depth, payout
   calculator, resolution source, criterion clause, dispute log.

   All numbers are illustrative. TZS = Tanzanian shilling.
*/

const { useState: useMarketState } = React;

// ── PRICE CHART ─────────────────────────────────────────────────────────
// YES probability over time. Shows the line + an area fill, with hover
// tooltip and right-edge price tag. This is THE primary market viz.
const PriceChart = ({
  data,           // [{t: '2024-03-01', yes: 0.42}, ...]
  width = 720,
  height = 220,
  showArea = true,
}) => {
  const padL = 8, padR = 56, padT = 16, padB = 28;
  const w = width - padL - padR;
  const h = height - padT - padB;

  const xs = data.map((_, i) => padL + (i / (data.length - 1)) * w);
  const ys = data.map(d => padT + (1 - d.yes) * h);

  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${padT + h} L ${xs[0]} ${padT + h} Z`;

  const last = data[data.length - 1];
  const lastY = ys[ys.length - 1];
  const lastPctColor = last.yes >= 0.5 ? 'oklch(70% 0.13 152)' : 'oklch(70% 0.16 22)';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="pc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(58% 0.16 152)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="oklch(58% 0.16 152)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pc-line" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(72% 0.13 152)" />
          <stop offset="100%" stopColor="oklch(58% 0.14 215)" />
        </linearGradient>
      </defs>
      {/* Y gridlines at 0/25/50/75/100 */}
      {[0, 0.25, 0.5, 0.75, 1].map(p => {
        const y = padT + (1 - p) * h;
        return (
          <g key={p}>
            <line x1={padL} y1={y} x2={padL + w} y2={y}
                  stroke={p === 0.5 ? 'oklch(40% 0.013 240)' : 'oklch(28% 0.013 240)'}
                  strokeDasharray={p === 0.5 ? '0' : '2 3'} strokeWidth="0.6" />
            <text x={padL + w + 4} y={y + 3} fontFamily="JetBrains Mono, monospace"
                  fontSize="9" fill="oklch(60% 0.012 240)" letterSpacing="0.05em">
              {Math.round(p * 100)}
            </text>
          </g>
        );
      })}
      {/* X labels */}
      {[0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1].map(i => (
        <text key={i} x={xs[i]} y={height - 8}
              fontFamily="JetBrains Mono, monospace" fontSize="9"
              fill="oklch(60% 0.012 240)" textAnchor="middle">{data[i].t}</text>
      ))}
      {showArea && <path d={areaPath} fill="url(#pc-area)" />}
      <path d={linePath} fill="none" stroke="url(#pc-line)" strokeWidth="2" strokeLinejoin="round" />
      {/* Last point + price tag */}
      <circle cx={xs[xs.length - 1]} cy={lastY} r="4" fill="oklch(72% 0.13 152)"
              stroke="oklch(13% 0.012 240)" strokeWidth="2" />
      <g transform={`translate(${xs[xs.length - 1] + 8}, ${lastY - 10})`}>
        <rect x="0" y="0" width="46" height="20" rx="4"
              fill="oklch(20% 0.04 152)" stroke="oklch(45% 0.10 152)" />
        <text x="23" y="14" textAnchor="middle"
              fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="11"
              fill={lastPctColor} letterSpacing="0.03em">
          {Math.round(last.yes * 100)}%
        </text>
      </g>
    </svg>
  );
};

// Synthetic price history for specimens.
const samplePriceData = (() => {
  const days = ['Feb 12','Feb 14','Feb 16','Feb 18','Feb 20','Feb 22','Feb 24','Feb 26','Feb 28','Mar 1','Mar 3','Mar 5','Mar 7','Mar 9','Mar 11','Mar 13','today'];
  const ys = [0.34, 0.38, 0.42, 0.41, 0.45, 0.49, 0.52, 0.50, 0.48, 0.51, 0.55, 0.58, 0.61, 0.59, 0.60, 0.62, 0.62];
  return days.map((t, i) => ({ t, yes: ys[i] }));
})();

// ── VOLUME SPARKLINE ────────────────────────────────────────────────────
const VolumeSparkline = ({ data, width = 220, height = 38 }) => {
  const max = Math.max(...data);
  const barW = (width - data.length * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {data.map((v, i) => {
        const h = (v / max) * (height - 4);
        return (
          <rect key={i} x={i * (barW + 2)} y={height - h - 2}
                width={barW} height={h} rx="1"
                fill="oklch(45% 0.10 215)" opacity={0.35 + 0.65 * (v / max)} />
        );
      })}
    </svg>
  );
};

// ── ORDER BOOK / DEPTH ──────────────────────────────────────────────────
// A pari-mutuel pool can also be presented as a "depth" view: how much
// stake on each side at each implied price. This is the prediction-market-
// flavor table the user asked for — shows liquidity per-side per-price.
const OrderBook = () => {
  const yesSide = [
    { price: 0.64, size: '180,000', cum: '180,000' },
    { price: 0.63, size: '92,400',  cum: '272,400' },
    { price: 0.62, size: '418,000', cum: '690,400' },
    { price: 0.61, size: '124,500', cum: '814,900' },
    { price: 0.60, size: '88,100',  cum: '903,000' },
  ];
  const noSide = [
    { price: 0.38, size: '146,200', cum: '146,200' },
    { price: 0.39, size: '72,000',  cum: '218,200' },
    { price: 0.40, size: '210,400', cum: '428,600' },
    { price: 0.41, size: '98,300',  cum: '526,900' },
    { price: 0.42, size: '54,200',  cum: '581,100' },
  ];
  const Row = ({ row, side, max }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
      padding: '6px 12px', position: 'relative', alignItems: 'center',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
    }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        [side === 'yes' ? 'right' : 'left']: 0,
        width: `${(parseInt(row.size.replace(/,/g,'')) / max) * 100}%`,
        background: side === 'yes' ? 'oklch(50% 0.14 152 / 0.18)' : 'oklch(52% 0.16 22 / 0.18)',
      }} />
      <span style={{ position: 'relative', color: side === 'yes' ? 'oklch(78% 0.13 152)' : 'oklch(78% 0.14 22)', fontWeight: 700 }}>
        {(row.price * 100).toFixed(1)}¢
      </span>
      <span style={{ position: 'relative', color: 'oklch(85% 0.012 240)', textAlign: 'right' }}>{row.size}</span>
      <span style={{ position: 'relative', color: 'oklch(60% 0.012 240)', textAlign: 'right' }}>{row.cum}</span>
    </div>
  );
  const max = 500000;
  return (
    <div style={{
      background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)',
      borderRadius: 'var(--r-md)', overflow: 'hidden', width: 380,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
        borderBottom: '1px solid oklch(28% 0.013 240)',
        fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600,
        color: 'oklch(85% 0.012 240)',
      }}>
        <span>Order book</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.08em' }}>Spread 2¢ · Mid 62¢</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        padding: '6px 12px', borderBottom: '1px solid oklch(22% 0.013 240)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        <span>Price</span><span style={{ textAlign: 'right' }}>Size (TZS)</span><span style={{ textAlign: 'right' }}>Cum.</span>
      </div>
      {/* NO side first (ascending price) */}
      {[...noSide].reverse().map((r, i) => <Row key={`n-${i}`} row={r} side="no" max={max} />)}
      {/* Spread */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        padding: '8px 12px', background: 'oklch(18% 0.025 215)',
        borderTop: '1px solid oklch(28% 0.013 240)', borderBottom: '1px solid oklch(28% 0.013 240)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
        color: 'oklch(85% 0.04 215)',
      }}>
        <span>62¢</span>
        <span style={{ fontSize: 9, color: 'oklch(65% 0.012 240)', letterSpacing: '0.1em' }}>MID · YES</span>
      </div>
      {/* YES side (descending price) */}
      {yesSide.map((r, i) => <Row key={`y-${i}`} row={r} side="yes" max={max} />)}
    </div>
  );
};

// ── DEPTH CHART ─────────────────────────────────────────────────────────
const DepthChart = ({ width = 380, height = 140 }) => {
  // Cumulative depth on each side, mirrored from center (the mid price).
  const yes = [40, 95, 180, 270, 380, 480];
  const no  = [30, 75, 160, 240, 330, 420];
  const max = Math.max(...yes, ...no);
  const stepW = (width / 2) / yes.length;
  const stepY = v => height - (v / max) * (height - 8) - 4;

  const yesPath = yes.map((v, i) => {
    const x = width / 2 + i * stepW;
    const y = stepY(v);
    return i === 0 ? `M ${width / 2} ${height} L ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ') + ` L ${width} ${height} Z`;

  const noPath = no.map((v, i) => {
    const x = width / 2 - i * stepW;
    const y = stepY(v);
    return i === 0 ? `M ${width / 2} ${height} L ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ') + ` L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <path d={noPath} fill="oklch(52% 0.16 22 / 0.32)" stroke="oklch(70% 0.16 22)" strokeWidth="1.5" />
      <path d={yesPath} fill="oklch(50% 0.14 152 / 0.32)" stroke="oklch(70% 0.13 152)" strokeWidth="1.5" />
      <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="oklch(96% 0.005 240)" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
      <text x={width / 2} y="12" textAnchor="middle" fontFamily="JetBrains Mono, monospace"
            fontSize="9" fill="oklch(85% 0.012 240)" letterSpacing="0.1em">MID 62¢</text>
      <text x="8" y={height - 4} fontFamily="JetBrains Mono, monospace"
            fontSize="9" fill="oklch(70% 0.16 22)">NO depth</text>
      <text x={width - 8} y={height - 4} textAnchor="end" fontFamily="JetBrains Mono, monospace"
            fontSize="9" fill="oklch(72% 0.13 152)">YES depth</text>
    </svg>
  );
};

// ── PAYOUT CALCULATOR ───────────────────────────────────────────────────
// Live calculator: given stake + side + current pool, show payout if-correct,
// effective price, and pool-share %. This is the heart of pari-mutuel UX.
const PayoutCalculator = () => {
  const [side, setSide] = useMarketState('yes');
  const [stake, setStake] = useMarketState(25000);

  // Illustrative pools.
  const yesPool = 4_280_000;
  const noPool = 2_640_000;
  const margin = 0.09; // operator take
  const newSidePool = side === 'yes' ? yesPool + stake : noPool + stake;
  const losingPool = side === 'yes' ? noPool : yesPool;
  const winningsPool = losingPool * (1 - margin);
  const myShare = stake / newSidePool;
  const payoutIfWin = stake + winningsPool * myShare;
  const effectivePrice = stake / payoutIfWin;
  const sharePct = (myShare * 100).toFixed(2);

  return (
    <div style={{
      background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)',
      borderRadius: 'var(--r-lg)', padding: 22, width: 380,
    }}>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'oklch(96% 0.005 240)', marginBottom: 4 }}>
        Payout calculator
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>
        Pool-share · margin {Math.round(margin * 100)}%
      </div>

      {/* Side toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4, background: 'oklch(20% 0.013 240)', borderRadius: 999, marginBottom: 14 }}>
        {['yes', 'no'].map(s => (
          <button key={s} onClick={() => setSide(s)} style={{
            border: 'none', cursor: 'pointer',
            padding: '8px 10px', borderRadius: 999,
            fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            background: side === s ? (s === 'yes' ? 'oklch(50% 0.14 152)' : 'oklch(52% 0.16 22)') : 'transparent',
            color: side === s ? 'oklch(15% 0.05 152)' : 'oklch(70% 0.012 240)',
          }}>{s}</button>
        ))}
      </div>

      {/* Stake input + slider */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(70% 0.012 240)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span>Stake</span><span>TZS {stake.toLocaleString()}</span>
        </div>
        <input type="range" min="1000" max="200000" step="1000" value={stake}
               onChange={e => setStake(parseInt(e.target.value))}
               style={{ width: '100%', accentColor: side === 'yes' ? 'oklch(58% 0.16 152)' : 'oklch(60% 0.18 22)' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[5000, 10000, 25000, 50000, 100000].map(v => (
            <button key={v} onClick={() => setStake(v)} style={{
              flex: 1, padding: '6px 0', border: '1px solid oklch(28% 0.013 240)',
              background: stake === v ? 'oklch(22% 0.013 240)' : 'transparent',
              color: 'oklch(85% 0.012 240)', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            }}>{v / 1000}k</button>
          ))}
        </div>
      </div>

      {/* Output stack */}
      <div style={{ background: 'oklch(18% 0.025 152)', border: `1px solid ${side === 'yes' ? 'oklch(40% 0.10 152)' : 'oklch(40% 0.12 22)'}`, borderRadius: 'var(--r-md)', padding: 14, marginBottom: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(70% 0.10 152)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          If {side.toUpperCase()} resolves true · payout
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: 'oklch(80% 0.13 152)', letterSpacing: '-0.02em' }}>
          TZS {Math.round(payoutIfWin).toLocaleString()}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'oklch(72% 0.10 152)', marginTop: 4 }}>
          +TZS {Math.round(payoutIfWin - stake).toLocaleString()} ({Math.round(((payoutIfWin - stake) / stake) * 100)}% return)
        </div>
      </div>

      {/* Microstats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontFamily: 'JetBrains Mono, monospace' }}>
        {[
          ['Effective price', `${(effectivePrice * 100).toFixed(1)}¢`],
          ['Pool share',      `${sharePct}%`],
          ['If lose',         `−${stake.toLocaleString()}`],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'oklch(20% 0.013 240)', padding: '8px 10px', borderRadius: 6 }}>
            <div style={{ fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 12, color: 'oklch(95% 0.005 240)', fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── RESOLUTION SOURCE CARD ──────────────────────────────────────────────
// Every market has a designated source. This card shows what's being read,
// when, by whom, and the criterion clause in legal-precise language.
const ResolutionSourceCard = () => (
  <div style={{
    background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)',
    borderRadius: 'var(--r-md)', padding: 22, width: 480,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 28, height: 28, borderRadius: 999, background: 'oklch(20% 0.025 152)', display: 'grid', placeItems: 'center' }}>
        <Icon name="shield" size={16} color="oklch(72% 0.13 152)" />
      </div>
      <div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: 'oklch(96% 0.005 240)' }}>Resolution source</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(70% 0.10 152)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Auto-fetched at deadline</div>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px 14px', fontSize: 12, marginBottom: 16 }}>
      <span style={{ color: 'oklch(60% 0.012 240)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Source</span>
      <span style={{ color: 'oklch(96% 0.005 240)' }}>Tanzania Meteorological Authority · daily bulletin</span>

      <span style={{ color: 'oklch(60% 0.012 240)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>URL</span>
      <span style={{ color: 'oklch(78% 0.04 215)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, wordBreak: 'break-all' }}>meteo.go.tz/bulletin/2024-04-15</span>

      <span style={{ color: 'oklch(60% 0.012 240)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Read at</span>
      <span style={{ color: 'oklch(96% 0.005 240)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>15 Apr 2024 · 23:59 EAT</span>

      <span style={{ color: 'oklch(60% 0.012 240)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Resolver</span>
      <span style={{ color: 'oklch(96% 0.005 240)' }}>Two-officer sign-off · A. Mushi + J. Kileo</span>
    </div>

    <div style={{ background: 'oklch(18% 0.013 240)', border: '1px solid oklch(28% 0.013 240)', borderRadius: 'var(--r-sm)', padding: 14 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(75% 0.13 85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
        Resolution criterion · clause
      </div>
      <div style={{ fontSize: 12, color: 'oklch(85% 0.012 240)', lineHeight: 1.6, fontStyle: 'italic' }}>
        "This market resolves <strong style={{ color: 'oklch(80% 0.13 152)', fontStyle: 'normal' }}>YES</strong> if and only if the Tanzania Meteorological Authority publishes a bulletin on or before 15 April 2024 stating that the long rains (masika) have officially commenced in any of the bimodal-rainfall regions. Any other outcome resolves <strong style={{ color: 'oklch(80% 0.14 22)', fontStyle: 'normal' }}>NO</strong>. In the event the source publishes nothing by 23:59 EAT on 15 April, the market resolves NO and a 48-hour objection window opens."
      </div>
    </div>
  </div>
);

// ── DISPUTE / OBJECTION LOG ─────────────────────────────────────────────
const DisputeLog = () => (
  <div style={{
    background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)',
    borderRadius: 'var(--r-md)', padding: 22, width: 480,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
      <div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 600, color: 'oklch(96% 0.005 240)' }}>Objection log</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(70% 0.012 240)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Public · append-only</div>
      </div>
      <Chip variant="objection">3 open · 47h left</Chip>
    </div>

    {[
      { time: '23m ago', who: 'mwangi',   tier: 'gold',   text: 'Source bulletin published 14 Apr at 22:11 — before deadline. Resolution should be YES.', status: 'reviewing' },
      { time: '1h ago',  who: 'asha_m',   tier: 'diamond', text: 'Bulletin only references Mara region; criterion says "any bimodal region" — Mara qualifies.', status: 'acknowledged' },
      { time: '4h ago',  who: 'koyo',     tier: 'gold',   text: 'Backup source (TMA Twitter) confirms onset. Linking screenshot.', status: 'acknowledged' },
    ].map((d, i) => (
      <div key={i} style={{
        padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid oklch(22% 0.013 240)',
        display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 10, alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <TierBadge tier={d.tier} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'oklch(96% 0.005 240)' }}>{d.who}</span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.08em' }}>{d.time}</span>
        </div>
        <span style={{ fontSize: 12, color: 'oklch(85% 0.012 240)', lineHeight: 1.5 }}>{d.text}</span>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          color: d.status === 'reviewing' ? 'oklch(75% 0.13 85)' : 'oklch(70% 0.10 152)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>{d.status}</span>
      </div>
    ))}
  </div>
);

// ── LIQUIDITY HEAT (mini) ───────────────────────────────────────────────
// 24-hour rolling liquidity colored by intensity. Used in market-detail
// and admin dashboard.
const LiquidityHeat = ({ width = 380 }) => {
  const cells = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    intensity: Math.max(0.05, Math.min(1, 0.2 + 0.6 * Math.sin((i - 6) / 6) + Math.random() * 0.2)),
  }));
  return (
    <div style={{ width }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <span>24h liquidity</span>
        <span>peak 21:00 · TZS 2.1M</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
        {cells.map(c => (
          <div key={c.hour} title={`${c.hour}:00`} style={{
            height: 28,
            background: `oklch(${20 + 35 * c.intensity}% ${0.04 + 0.10 * c.intensity} 215)`,
            borderRadius: 2,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)' }}>
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
};

// ── MARKET STATS GRID ───────────────────────────────────────────────────
const MarketStats = () => {
  const stats = [
    { k: 'Volume',        v: '6.92M',     unit: 'TZS',  delta: '+12.4%', tone: 'yes' },
    { k: 'Predictors',    v: '1,247',     unit: '',     delta: '+82',     tone: 'yes' },
    { k: 'Avg stake',     v: '5,548',     unit: 'TZS',  delta: '−3.1%',  tone: 'no'  },
    { k: 'Liquidity',     v: '4.28M',     unit: 'TZS',  delta: '+0.8%',  tone: 'yes' },
    { k: 'Spread',        v: '2.0',       unit: '¢',    delta: '−0.2',   tone: 'yes' },
    { k: 'Time to close', v: '17h 24m',   unit: '',     delta: 'live',   tone: 'live' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: 480 }}>
      {stats.map(s => (
        <div key={s.k} style={{
          background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)',
          borderRadius: 'var(--r-sm)', padding: '12px 14px',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {s.k}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'oklch(96% 0.005 240)', letterSpacing: '-0.02em' }}>{s.v}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(70% 0.012 240)' }}>{s.unit}</span>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, marginTop: 4,
            color: s.tone === 'yes' ? 'oklch(72% 0.10 152)' : s.tone === 'no' ? 'oklch(72% 0.13 22)' : 'oklch(75% 0.13 85)',
          }}>{s.delta}</div>
        </div>
      ))}
    </div>
  );
};

// ── COUNTDOWN TIMER ─────────────────────────────────────────────────────
const Countdown = ({ d = 0, h = 17, m = 24, s = 12, label = 'Closes in' }) => {
  const Cell = ({ v, unit }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 28,
        color: 'oklch(96% 0.005 240)', letterSpacing: '-0.04em', lineHeight: 1,
        background: 'oklch(15% 0.012 240)', border: '1px solid oklch(28% 0.013 240)',
        borderRadius: 6, padding: '10px 12px', minWidth: 48, textAlign: 'center',
      }}>{String(v).padStart(2, '0')}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 6 }}>{unit}</div>
    </div>
  );
  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'oklch(75% 0.13 85)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Cell v={d} unit="Days" />
        <Cell v={h} unit="Hours" />
        <Cell v={m} unit="Min" />
        <Cell v={s} unit="Sec" />
      </div>
    </div>
  );
};

Object.assign(window, {
  PriceChart, samplePriceData, VolumeSparkline, OrderBook, DepthChart,
  PayoutCalculator, ResolutionSourceCard, DisputeLog, LiquidityHeat,
  MarketStats, Countdown,
});
