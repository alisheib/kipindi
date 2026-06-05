// ds-admin.jsx — Admin shell (sidebar + topbar + KPIs + chart + markets table + resolver queue)
const { useState: adS } = React;

const NAV = [['Dashboard', 'chart', true], ['Markets', 'markets'], ['Resolver', 'shieldcheck'], ['Users', 'profile'], ['Finance', 'wallet'], ['Compliance', 'shield'], ['Settings', 'tech']];
const KPI = [['Total staked · 7d', 'TZS 1.24B', '+12%', 'up'], ['Active markets', '142', '+8', 'up'], ['Predictors', '38,402', '+1,204', 'up'], ['House margin', '9.0%', 'fixed', 'flat'], ['Pending resolution', '6', '2 urgent', 'warn']];
const ROWS = [
  ['Will Simba SC win the Kariakoo derby?', 'Football', 'live', '48.2M', 1284, '2d 4h'],
  ['Will Bitcoin close above $90,000 this month?', 'Crypto', 'live', '72.9M', 2103, '12d'],
  ['Will TZS/USD stay below 2,700 by Friday?', 'Forex', 'live', '31.7M', 906, '3d'],
  ['Will Dar es Salaam exceed 33°C this weekend?', 'Weather', 'review', '12.4M', 421, 'ended'],
  ['Will the BoT hold the policy rate at 6.0%?', 'Economy', 'soon', '9.1M', 287, '6d'],
];

function AdminBoard() {
  const [period, setPeriod] = adS('7d');
  const vol = [38, 44, 41, 52, 48, 60, 57, 66, 63, 72, 70, 78];
  const W = 640, H = 150;
  const pts = vol.map((v, i) => [(i / (vol.length - 1)) * W, H - (v / 100) * H]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', display: 'flex' }}>
    {/* sidebar */}
    <div style={{ width: 216, flexShrink: 0, background: 'var(--panel)', borderRight: '1px solid var(--border)', padding: '18px 14px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px 18px' }}><BrandLockup size={26} /><span style={{ ...mono, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--gold-400)', border: '1px solid var(--border-gold)', borderRadius: 'var(--r-xs)', padding: '1px 5px' }}>ADMIN</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(([l, ic, on]) => <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? 'var(--text)' : 'var(--text-subtle)', background: on ? 'oklch(40% 0.12 268 / 0.5)' : 'transparent' }}>{(Icon[ic] || Icon.markets)({ s: 17 })}{l}</div>)}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 8px', borderTop: '1px solid var(--border)' }}><Avatar initials="OP" tier="gold" size={30} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>Operator</div><div style={{ ...mono, fontSize: 10, color: 'var(--text-faint)' }}>compliance · L2</div></div></div>
    </div>
    {/* main */}
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {/* topbar */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <div className="disp" style={{ fontSize: 18, fontWeight: 700 }}>Dashboard</div>
        <div style={{ flex: 1 }} />
        <Segmented items={['Today', '7d', '30d', 'All']} value="7d" />
        <button aria-label="Notifications" style={{ color: 'var(--text-muted)', position: 'relative', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex' }}>{Icon.bell({ s: 19 })}<span style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, borderRadius: 9, background: 'var(--no-400)' }} /></button>
      </div>
      <div style={{ padding: 24, overflow: 'auto' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          {KPI.map(([k, v, d, dir]) => <div key={k} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>{k}</div>
            <div style={{ ...mono, fontSize: 21, fontWeight: 700 }}>{v}</div>
            <div style={{ ...mono, fontSize: 11, marginTop: 4, color: dir === 'up' ? 'var(--yes-400)' : dir === 'warn' ? 'var(--gold-400)' : 'var(--text-subtle)' }}>{d}</div>
          </div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* volume chart */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>Daily volume · TZS</span><span style={{ ...mono, fontSize: 13, fontWeight: 700, color: 'var(--yes-400)' }}>+18% w/w</span></div>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}><defs><linearGradient id="adv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand-400)" stopOpacity="0.25"/><stop offset="1" stopColor="var(--brand-400)" stopOpacity="0"/></linearGradient></defs>{[0.33, 0.66].map(g => <line key={g} x1="0" y1={H * g} x2={W} y2={H * g} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 6"/>)}<path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#adv)"/><path d={line} fill="none" stroke="var(--brand-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          {/* resolver queue */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid oklch(78% 0.13 80 / 0.3)', borderRadius: 'var(--r-lg)', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span style={{ color: 'var(--gold-400)' }}>{Icon.shieldcheck({ s: 17 })}</span><span style={{ fontSize: 13.5, fontWeight: 600 }}>Resolver queue · two-officer</span></div>
            {[['Dar es Salaam heat · ended', 'awaiting 2nd officer'], ['Arusha rainfall · ended', 'source check']].map(([q, s], i) => <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{q}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ ...mono, fontSize: 10.5, color: 'var(--gold-300)' }}>{s}</span><div style={{ display: 'flex', gap: 6 }}><Btn variant="yes" size="sm" live>YES</Btn><Btn variant="no" size="sm" live>NO</Btn></div></div>
            </div>)}
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-faint)', marginTop: 10, lineHeight: 1.5 }}>Both officers must agree · 24h objection window</div>
          </div>
        </div>
        {/* markets table */}
        <div role="table" aria-label="Markets" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 14, fontWeight: 600 }}>Markets</span><Btn variant="gold" size="sm" live leading={Icon.plus({ s: 14 })}>New market</Btn></div>
          <div role="row" style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 0.9fr 1fr 1fr 0.9fr 0.6fr', gap: 12, padding: '10px 18px', ...mono, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>
            <span role="columnheader">Question</span><span role="columnheader">Category</span><span role="columnheader">Status</span><span role="columnheader" style={{ textAlign: 'right' }}>Pool</span><span role="columnheader" style={{ textAlign: 'right' }}>Predictors</span><span role="columnheader" style={{ textAlign: 'right' }}>Closes</span><span role="columnheader"></span>
          </div>
          {ROWS.map((r, i) => { const [q, cat, st, pool, preds, closes] = r; return <div key={i} role="row" style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 0.9fr 1fr 1fr 0.9fr 0.6fr', gap: 12, padding: '12px 18px', alignItems: 'center', borderTop: i ? '1px solid oklch(30% 0.08 268 / 0.5)' : 'none', fontSize: 13 }}>
            <span role="cell" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q}</span>
            <span role="cell" style={{ color: 'var(--text-muted)' }}>{cat}</span>
            <span role="cell">{st === 'live' ? <Chip tone="live">Live</Chip> : st === 'review' ? <Chip tone="resolved">Review</Chip> : <Chip tone="soon">Soon</Chip>}</span>
            <span role="cell" className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>TZS {pool}</span>
            <span role="cell" className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{preds.toLocaleString()}</span>
            <span role="cell" className="mono" style={{ textAlign: 'right', color: 'var(--text-subtle)' }}>{closes}</span>
            <button role="cell" aria-label={`Open ${q}`} style={{ textAlign: 'right', color: 'var(--text-subtle)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'inline-flex', justifyContent: 'flex-end' }}>{Icon.ext({ s: 15 })}</button>
          </div>; })}
        </div>
      </div>
    </div>
  </div>;
}
Object.assign(window, { AdminBoard });
