// ds-positions.jsx — Positions / Portfolio page
const { useState: poS } = React;

const POS = [
  { status: 'live', cat: 'football', q: 'Will Simba SC win the Kariakoo derby?', side: 'YES', entry: 0.58, yes: 64, stake: 25000, value: 27586, pnl: 2586 },
  { status: 'live', cat: 'crypto', q: 'Will Bitcoin close above $90,000 this month?', side: 'YES', entry: 0.52, yes: 58, stake: 50000, value: 55769, pnl: 5769 },
  { status: 'live', cat: 'forex', q: 'Will TZS/USD stay below 2,700 by Friday?', side: 'NO', entry: 0.55, yes: 41, stake: 10000, value: 8475, pnl: -1525 },
  { status: 'won', cat: 'weather', q: 'Will Dar es Salaam exceed 33°C this weekend?', side: 'YES', entry: 0.70, yes: 100, stake: 15000, value: 21428, pnl: 6428 },
  { status: 'lost', cat: 'football', q: 'Will Yanga top the NBC Premier this round?', side: 'YES', entry: 0.47, yes: 0, stake: 8000, value: 0, pnl: -8000 },
];

function PositionCard({ p }) {
  const yes = p.side === 'YES';
  const sideC = yes ? 'var(--yes-400)' : 'var(--no-400)';
  const won = p.status === 'won', lost = p.status === 'lost', live = p.status === 'live';
  const pnlC = p.pnl > 0 ? 'var(--yes-400)' : p.pnl < 0 ? 'var(--no-400)' : 'var(--text-muted)';
  const G = Icon[p.cat] || Icon.markets;
  return <div style={{ background: 'var(--bg-elevated)', border: `1px solid ${won ? 'oklch(78% 0.13 80 / 0.4)' : 'var(--border)'}`, borderRadius: 'var(--r-lg)', padding: 16,
    boxShadow: won ? '0 0 20px oklch(78% 0.13 80 / 0.12)' : 'none' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
      <div style={{ display: 'flex', gap: 7 }}>
        {live ? <Chip tone="live">Live</Chip> : won ? <Chip tone="resolved">Won</Chip> : <Chip tone="no">Lost</Chip>}
        <Chip tone="cat" icon={G({ s: 13 })}>{p.cat}</Chip>
      </div>
      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: sideC, border: `1px solid ${sideC}`, opacity: 0.9, borderRadius: 'var(--r-pill)', padding: '2px 9px' }}>{p.side} · {p.entry.toFixed(2)}</span>
    </div>
    <div className="disp" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 12, minHeight: 38 }}>{p.q}</div>
    <div style={{ marginBottom: 12 }}><ConvictionBar yes={p.yes} h={7} /></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
      {[['Stake', `TZS ${p.stake.toLocaleString()}`, 'var(--text)'], [lost ? 'Final' : 'Value', lost ? 'TZS 0' : `TZS ${p.value.toLocaleString()}`, 'var(--text)'], ['P&L', `${p.pnl >= 0 ? '+' : '−'}TZS ${Math.abs(p.pnl).toLocaleString()}`, pnlC]].map(([k, v, c]) => <div key={k}><div style={{ ...mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{k}</div><div style={{ ...mono, fontSize: 13.5, fontWeight: 700, color: c }}>{v}</div></div>)}
    </div>
    {live ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Btn variant="ghost" size="md" live>Sell · Uza</Btn><Btn variant="outline" size="md" live>View</Btn></div>
      : <div style={{ ...mono, fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', padding: '6px 0' }}>{won ? 'Paid to wallet · Imelipwa' : 'Settled · Imetatuliwa'}</div>}
  </div>;
}

function PositionsBoard() {
  const [tab, setTab] = poS('Open');
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
    <TopNav active="Positions" />
    <div style={{ padding: '26px 32px 36px' }}>
      {/* portfolio summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '20px 24px', borderRadius: 'var(--r-xl)', marginBottom: 24,
        background: 'linear-gradient(135deg, oklch(23% 0.075 268), oklch(16% 0.05 268))', border: '1px solid oklch(78% 0.13 80 / 0.3)', boxShadow: 'inset 0 1px 0 oklch(92% 0.06 84 / 0.15), 0 12px 34px oklch(8% 0.05 264 / 0.5)' }}>
        <div><div style={{ ...mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 6 }}>Open value · Thamani</div><div style={{ ...mono, fontSize: 32, fontWeight: 700 }}>TZS 91,830</div></div>
        <div style={{ height: 40, width: 1, background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: 26 }}>
          {[['Open P&L', '+TZS 6,830', 'var(--yes-400)'], ['Realized', '+TZS 6,428', 'var(--gold-300)'], ['Win rate', '63%', 'var(--text)'], ['Open bets', '3', 'var(--text)']].map(([k, v, c]) => <div key={k}><div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{k}</div><div style={{ ...mono, fontSize: 17, fontWeight: 700, color: c }}>{v}</div></div>)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="disp" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Your positions · Nafasi zako</h1>
        <Segmented items={['Open', 'Resolved', 'All']} value="Open" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {POS.map((p, i) => <PositionCard key={i} p={p} />)}
      </div>
    </div>
  </div>;
}
Object.assign(window, { PositionsBoard, PositionCard });
