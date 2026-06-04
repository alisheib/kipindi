// ds-flagship.jsx — assembled Market Detail (international-grade composition)
// Proves the system composes; adds market microstructure (order book, trade tape, last price).
const { useState: fS, useEffect: fE, useRef: fR } = React;

/* ---------- enhanced chart: area + line + last-price pill + y-axis ---------- */
function FlagChart({ data, w = 720, h = 260, color = 'var(--yes-400)' }) {
  const uid = React.useId().replace(/:/g, '');
  const pad = { l: 0, r: 44, t: 10, b: 18 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const pts = data.map((v, i) => [pad.l + (i / (data.length - 1)) * iw, pad.t + ih - (v / 100) * ih]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pad.l + iw} ${pad.t + ih} L${pad.l} ${pad.t + ih} Z`;
  const [off, setOff] = fS(1);
  fE(() => { const t = setTimeout(() => setOff(0), 80); return () => clearTimeout(t); }, []);
  const [hi, setHi] = fS(null);
  const svgRef = fR(null);
  const onMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * w;
    let idx = Math.round(((x - pad.l) / iw) * (data.length - 1));
    idx = Math.max(0, Math.min(data.length - 1, idx));
    setHi(idx);
  };
  const last = pts[pts.length - 1]; const lastV = data[data.length - 1];
  const hp = hi != null ? pts[hi] : null;
  const days = data.length;
  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
      onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <defs><linearGradient id={`fa${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.20"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {[0, 25, 50, 75, 100].map((g) => { const y = pad.t + ih - (g / 100) * ih; return <g key={g}><line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray={g === 50 ? '0' : '2 6'} opacity={g === 50 ? 0.6 : 1}/><text x={pad.l + iw + 8} y={y + 3.5} style={{ ...mono, fontSize: 10, fill: 'var(--text-faint)' }}>{g}</text></g>; })}
      <path d={area} fill={`url(#fa${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: off, transition: 'stroke-dashoffset 1.1s var(--ease-stage)' }}/>
      {/* hover crosshair + tooltip */}
      {hp && <g>
        <line x1={hp[0]} y1={pad.t} x2={hp[0]} y2={pad.t + ih} stroke="var(--text-subtle)" strokeWidth="1" strokeDasharray="3 3"/>
        <circle cx={hp[0]} cy={hp[1]} r="5" fill={color} stroke="var(--bg)" strokeWidth="2"/>
        <g transform={`translate(${Math.min(hp[0] + 8, pad.l + iw - 70)}, ${Math.max(hp[1] - 34, pad.t)})`}>
          <rect width="68" height="30" rx="6" fill="var(--bg-overlay,oklch(22% 0.09 264))" stroke="var(--border-strong)"/>
          <text x="8" y="13" style={{ ...mono, fontSize: 10, fill: 'var(--text-subtle)' }}>{`-${days - 1 - hi}d`}</text>
          <text x="8" y="24" style={{ ...mono, fontSize: 12, fontWeight: 700, fill: color }}>{data[hi]}% YES</text>
        </g>
      </g>}
      {!hp && <line x1={last[0]} y1={pad.t} x2={last[0]} y2={pad.t + ih} stroke={color} strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>}
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color}/>
      <g transform={`translate(${last[0] + 6}, ${last[1] - 10})`}><rect width="40" height="20" rx="5" fill={color}/><text x="20" y="14" textAnchor="middle" style={{ ...mono, fontSize: 11, fontWeight: 700, fill: '#06140d' }}>{lastV}%</text></g>
    </svg>
  );
}

/* ---------- Order book ladder (bid YES / ask NO) ---------- */
function OrderBook() {
  const asks = [[0.67, '4.2M'], [0.66, '7.8M'], [0.65, '12.1M'], [0.65, '3.4M']];
  const bids = [[0.64, '9.6M'], [0.63, '15.3M'], [0.62, '6.1M'], [0.61, '2.9M']];
  const max = 15.3;
  const Row = ({ price, sz, side }) => {
    const c = side === 'bid' ? 'var(--yes-400)' : 'var(--no-400)';
    const fill = side === 'bid' ? 'oklch(61% 0.16 150 / 0.14)' : 'oklch(58% 0.2 25 / 0.14)';
    const pct = (parseFloat(sz) / max) * 100;
    return <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '6px 10px', ...mono, fontSize: 12 }}>
      <span style={{ position: 'absolute', top: 0, bottom: 0, [side === 'bid' ? 'left' : 'right']: 0, width: `${pct}%`, background: fill }} />
      <span style={{ position: 'relative', color: c, fontWeight: 600 }}>{price.toFixed(2)}</span>
      <span style={{ position: 'relative', color: 'var(--text-muted)' }}>TZS {sz}</span>
    </div>;
  };
  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10, letterSpacing: '0.08em', color: 'var(--text-faint)', padding: '0 10px 8px', textTransform: 'uppercase' }}><span>Price</span><span>Depth (TZS)</span></div>
    {asks.map((a, i) => <Row key={'a' + i} price={a[0]} sz={a[1]} side="ask" />)}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '4px 0' }}>
      <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: 'var(--yes-400)' }}>0.64</span>
      <span style={{ ...mono, fontSize: 10.5, color: 'var(--text-subtle)' }}>spread 0.01</span>
      <span style={{ ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>≈ 64% YES</span>
    </div>
    {bids.map((b, i) => <Row key={'b' + i} price={b[0]} sz={b[1]} side="bid" />)}
  </div>;
}

/* ---------- Recent trades tape ---------- */
function TradeTape() {
  const rows = [['12:04:21', 'YES', '0.64', '25,000'], ['12:04:08', 'NO', '0.36', '10,000'], ['12:03:52', 'YES', '0.63', '50,000'], ['12:03:40', 'YES', '0.63', '5,000'], ['12:03:11', 'NO', '0.37', '18,500'], ['12:02:55', 'YES', '0.62', '7,200']];
  return <div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.7fr 1fr', ...mono, fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-faint)', padding: '0 10px 8px', textTransform: 'uppercase' }}><span>Time</span><span>Side</span><span>Price</span><span style={{ textAlign: 'right' }}>TZS</span></div>
    {rows.map((r, i) => { const yes = r[1] === 'YES'; return <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.7fr 1fr', padding: '6px 10px', ...mono, fontSize: 12, borderTop: i ? '1px solid oklch(30% 0.05 264 / 0.4)' : 'none' }}>
      <span style={{ color: 'var(--text-subtle)' }}>{r[0]}</span><span style={{ color: yes ? 'var(--yes-400)' : 'var(--no-400)', fontWeight: 600 }}>{r[1]}</span><span style={{ color: 'var(--text-muted)' }}>{r[2]}</span><span style={{ textAlign: 'right', color: 'var(--text)' }}>{r[3]}</span>
    </div>; })}
  </div>;
}

function MarketDetailPro() {
  const trend = [50, 48, 52, 49, 53, 51, 55, 54, 58, 56, 60, 59, 62, 61, 63, 64];
  const [tab, setTab] = fS('Order book');
  const [stake, setStake] = fS(25000);
  const payout = Math.round(stake / 0.64);
  return (
    <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      <NewsBanner />
      <TopNav active="Markets" />
      <div style={{ padding: '22px 28px 36px' }}>
        {/* breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono, fontSize: 11.5, color: 'var(--text-subtle)', marginBottom: 16 }}><span>Markets</span><span>/</span><span>Football</span><span>/</span><span style={{ color: 'var(--text-muted)' }}>Kariakoo derby</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          {/* LEFT */}
          <div>
            {/* header */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><Chip tone="live">Live</Chip><Chip tone="hot" icon={<Icon.flame s={11} />}>Hot</Chip><Chip tone="cat" icon={<Icon.sports s={13} />}>Football</Chip></div>
            <h1 className="disp" style={{ fontSize: 27, fontWeight: 700, margin: 0, lineHeight: 1.18 }}>Will Simba SC win the Kariakoo derby?</h1>
            <div style={{ fontSize: 14.5, fontStyle: 'italic', color: 'var(--text-subtle)', marginTop: 5 }}>Je, Simba SC watashinda dabi ya Kariakoo?</div>
            {/* price strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ ...mono, fontSize: 40, fontWeight: 700, color: 'var(--yes-400)', lineHeight: 1 }}>64%</span><span style={{ ...mono, fontSize: 13, color: 'var(--yes-400)', display: 'flex', alignItems: 'center', gap: 3 }}><Icon.arrowUp s={13} />+6 today</span></div>
              <div style={{ height: 34, width: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', gap: 22 }}>
                {[['TZS 48.2M', 'Pool'], ['1,284', 'Predictors'], ['TZS 9.6M', 'Liquidity'], ['2d 4h', 'Resolves']].map(([a, b]) => <div key={b}><div style={{ ...mono, fontSize: 15, fontWeight: 600 }}>{a}</div><div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{b}</div></div>)}
              </div>
            </div>
            {/* chart */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>YES probability</span><LiveDot c="var(--live-400)" /></div>
                <Segmented items={['1H', '1D', '1W', '1M', 'ALL']} value="1W" />
              </div>
              <FlagChart data={trend} />
            </div>
            {/* microstructure tabs */}
            <div style={{ marginTop: 18, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                {['Order book', 'Recent trades', 'Rules', 'Comments'].map((t) => { const on = t === tab; return <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 13px', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', font: `${on ? 600 : 500} 12.5px var(--font-body)`, color: on ? 'var(--text)' : 'var(--text-subtle)', background: on ? 'oklch(40% 0.08 264 / 0.5)' : 'transparent' }}>{t}</button>; })}
              </div>
              <div style={{ padding: 12 }}>
                {tab === 'Order book' && <OrderBook />}
                {tab === 'Recent trades' && <TradeTape />}
                {tab === 'Rules' && <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, padding: 4 }}>Resolves <b style={{ color: 'var(--text)' }}>YES</b> if Simba SC wins in regulation or extra time. Settled against the official TPL result feed, confirmed by two compliance officers. 24h objection window. <span style={{ fontStyle: 'italic', color: 'var(--text-subtle)' }}>Hutatuliwa dhidi ya matokeo rasmi ya TPL.</span></div>}
                {tab === 'Comments' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 4 }}>{[['AM', 'Form favours Simba at home.'], ['JK', 'Yanga keeper is doubtful — leaning YES.']].map(([n, c]) => <div key={n} style={{ display: 'flex', gap: 10 }}><Avatar initials={n} size={30} tier="silver" /><div><div style={{ ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>@{n.toLowerCase()}</div><div style={{ fontSize: 13, color: 'var(--text)' }}>{c}</div></div></div>)}</div>}
              </div>
            </div>
          </div>
          {/* RIGHT — sticky buy tray + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ ...mono, fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--text-faint)', textTransform: 'uppercase' }}>Place a prediction</span><span style={{ ...mono, fontSize: 11.5, color: 'var(--text-subtle)' }}>Bal · <b style={{ color: 'var(--text)' }}>TZS 84,200</b></span></div>
              <div style={{ marginBottom: 14 }}><SidePair price="64" live /></div>
              <div style={{ height: 12 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 48, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                <span style={{ ...mono, fontSize: 13, color: 'var(--text-subtle)' }}>TZS</span><span style={{ ...mono, fontSize: 22, fontWeight: 700, flex: 1 }}>{stake.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>{[5000, 10000, 25000, 50000].map((v) => <button key={v} onClick={() => setStake(v)} style={{ flex: 1, padding: '11px 0', borderRadius: 'var(--r-pill)', cursor: 'pointer', ...mono, fontSize: 11.5, fontWeight: 600, border: '1px solid var(--border)', color: stake === v ? 'var(--gold-text)' : 'var(--text-muted)', background: stake === v ? 'var(--gold-500)' : 'var(--bg-elevated2)' }}>{v / 1000}k</button>)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>If correct, you receive</span><span style={{ ...mono, fontSize: 20, fontWeight: 700, color: 'var(--gold-400)' }}>TZS {payout.toLocaleString()}</span>
              </div>
              <Btn variant="gold" size="lg" full live leading={<Icon.check s={16} sw={2.4} />}>Confirm · TZS {stake.toLocaleString()}</Btn>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>Pool-share payout · outcome may differ from current odds</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span style={{ color: 'var(--accent-400)' }}><Icon.shield s={16} /></span><span style={{ fontSize: 13, fontWeight: 600 }}>Resolution source</span></div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Official TPL result feed · two-officer confirmed · <a href="#" style={{ color: 'var(--accent-400)', textDecoration: 'none' }}>view rules →</a></div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 12 }}>Related markets</div>
              {[['Will Yanga finish top 2?', 57], ['Taifa Stars to qualify for AFCON?', 47]].map(([q, y]) => <div key={q} style={{ padding: '8px 0', borderTop: '1px solid oklch(30% 0.05 264 / 0.4)' }}><div style={{ fontSize: 12.5, marginBottom: 6 }}>{q}</div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1 }}><ConvictionBar yes={y} h={6} /></div><span style={{ ...mono, fontSize: 11, color: 'var(--yes-400)', fontWeight: 600 }}>{y}%</span></div></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MarketDetailPro, FlagChart, OrderBook, TradeTape });
