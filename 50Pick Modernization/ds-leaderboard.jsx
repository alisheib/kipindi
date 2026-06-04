// ds-leaderboard.jsx — Leaderboard page (podium hero + ranked rows + sparklines + rank change)
const { useState: lbS } = React;

const TIERC = window.TIERC;
const sparkSeed = (s) => { let h = 9; const out = []; let v = 50; for (let i = 0; i < 12; i++) { h = (h * 31 + s.charCodeAt(i % s.length)) >>> 0; v = Math.max(20, Math.min(92, v + ((h % 21) - 10))); out.push(v); } return out; };
const LB = [
  { rank: 1, name: 'A. Mwakalukwa', handle: 'amwaka', tier: 'diamond', pts: 9820, acc: 71, chg: 2 },
  { rank: 2, name: 'J. Kessy', handle: 'jkessy', tier: 'gold', pts: 8640, acc: 68, chg: 1 },
  { rank: 3, name: 'R. Temba', handle: 'rtemba', tier: 'gold', pts: 8120, acc: 66, chg: -1 },
  { rank: 4, name: 'F. Nyerere', handle: 'fnyerere', tier: 'gold', pts: 6950, acc: 64, chg: 3 },
  { rank: 5, name: 'S. Mushi', handle: 'smushi', tier: 'silver', pts: 6210, acc: 63, chg: -2 },
  { rank: 6, name: 'D. Ibrahim', handle: 'dibrahim', tier: 'silver', pts: 5870, acc: 61, chg: 0 },
  { rank: 7, name: 'You · Wewe', handle: 'jaykay', tier: 'gold', pts: 2480, acc: 63, chg: 4, me: true },
  { rank: 8, name: 'P. Massawe', handle: 'pmassawe', tier: 'silver', pts: 2310, acc: 60, chg: -1 },
  { rank: 9, name: 'G. Shirima', handle: 'gshirima', tier: 'silver', pts: 2180, acc: 59, chg: 'new' },
  { rank: 10, name: 'L. Mbwana', handle: 'lmbwana', tier: 'bronze', pts: 1990, acc: 58, chg: 2 },
  { rank: 11, name: 'H. Juma', handle: 'hjuma', tier: 'bronze', pts: 1840, acc: 57, chg: -3 },
  { rank: 12, name: 'C. Komba', handle: 'ckomba', tier: 'bronze', pts: 1720, acc: 56, chg: 1 },
  { rank: 13, name: 'N. Ulimboka', handle: 'nulim', tier: 'bronze', pts: 1610, acc: 55, chg: 0 },
  { rank: 14, name: 'B. Salum', handle: 'bsalum', tier: 'bronze', pts: 1530, acc: 55, chg: 'new' },
  { rank: 15, name: 'E. Mtui', handle: 'emtui', tier: 'bronze', pts: 1420, acc: 54, chg: -1 },
  { rank: 16, name: 'V. Lyimo', handle: 'vlyimo', tier: 'bronze', pts: 1360, acc: 53, chg: 2 },
  { rank: 17, name: 'W. Kileo', handle: 'wkileo', tier: 'bronze', pts: 1280, acc: 52, chg: 1 },
  { rank: 18, name: 'O. Mremi', handle: 'omremi', tier: 'bronze', pts: 1190, acc: 51, chg: -2 },
];
const ini = (n) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
function Chg({ c }) {
  if (c === 'new') return <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: 'var(--gold-300)', border: '1px solid oklch(78% 0.13 80 / 0.4)', borderRadius: 'var(--r-xs)', padding: '1px 4px' }}>NEW</span>;
  if (c === 0) return <span style={{ ...mono, fontSize: 11, color: 'var(--text-faint)' }}>—</span>;
  const up = c > 0;
  return <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: up ? 'var(--yes-400)' : 'var(--no-400)', display: 'inline-flex', alignItems: 'center', gap: 1 }}>{(up ? Icon.arrowUp : Icon.arrowDown)({ s: 11 })}{Math.abs(c)}</span>;
}

function Podium() {
  const medal = { 1: ['var(--gold-300)', 'oklch(78% 0.13 80 / 0.5)'], 2: ['oklch(86% 0.02 268)', 'oklch(72% 0.02 268 / 0.5)'], 3: ['oklch(76% 0.09 60)', 'oklch(64% 0.10 60 / 0.5)'] };
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 12, alignItems: 'stretch' }}>
    {[LB[1], LB[0], LB[2]].map((p) => { const [mc, mb] = medal[p.rank]; const first = p.rank === 1;
      return <div key={p.handle} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: first ? '22px 14px 18px' : '18px 12px 16px', borderRadius: 'var(--r-lg)',
        alignSelf: first ? 'start' : 'end',
        background: first ? 'radial-gradient(120% 90% at 50% 0%, oklch(28% 0.10 268), var(--bg-elevated))' : 'var(--bg-elevated)',
        border: `1px solid ${first ? 'oklch(78% 0.13 80 / 0.45)' : 'var(--border)'}`, boxShadow: first ? 'var(--shadow-card, 0 10px 28px -10px oklch(4% 0.04 268 / 0.7))' : 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 999, ...mono, fontSize: 12, fontWeight: 700, color: mc, border: `1.5px solid ${mb}` }}>{p.rank}</span>
        <Avatar initials={ini(p.name)} seed={p.handle} tier={p.tier} size={first ? 60 : 48} />
        <div style={{ textAlign: 'center' }}><div style={{ ...disp, fontSize: 14, fontWeight: 600 }}>{p.name.split(' ').slice(-1)}</div><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.tier} · {p.acc}%</div></div>
        <div style={{ ...mono, fontSize: first ? 20 : 16, fontWeight: 700, color: 'var(--gold-300)' }}>{p.pts.toLocaleString()}</div>
        <Sparkline data={sparkSeed(p.handle)} w={first ? 140 : 110} h={26} color={first ? 'var(--gold-400)' : 'var(--brand-300)'} />
      </div>; })}
  </div>;
}

function LeaderboardBoard() {
  const [period, setPeriod] = lbS('Week');
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
    <TopNav active="Leaderboard" />
    <div style={{ padding: '24px 32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div><h1 className="disp" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Leaderboard</h1><div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 2 }}>Ranked by season score · Orodha ya washindi</div></div>
        <Segmented items={['Today', 'Week', 'Season', 'All-Time']} value="Week" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.5fr', gap: 28, alignItems: 'start' }}>
        <div>
          <Podium />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {[['38,402', 'Predictors'], ['TZS 1.2B', 'Staked'], ['64%', 'Avg acc.']].map(([a, b]) => <div key={b} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '11px 13px' }}><div style={{ ...mono, fontSize: 15, fontWeight: 700 }}>{a}</div><div style={{ fontSize: 10.5, color: 'var(--text-subtle)', marginTop: 1 }}>{b}</div></div>)}
          </div>
        </div>
        <div role="table" aria-label="Leaderboard rankings">
          <div role="row" style={{ display: 'grid', gridTemplateColumns: '30px 40px 1fr 86px 60px 64px', gap: 10, padding: '0 14px 9px', ...mono, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            <span role="columnheader">#</span><span role="columnheader">7d</span><span role="columnheader">Predictor</span><span role="columnheader">Trend</span><span role="columnheader" style={{ textAlign: 'right' }}>Acc.</span><span role="columnheader" style={{ textAlign: 'right' }}>Points</span>
          </div>
          <div role="rowgroup" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 560, overflow: 'auto' }}>
            {LB.map((p) => <div key={p.handle} role="row" style={{ display: 'grid', gridTemplateColumns: '30px 40px 1fr 86px 60px 64px', gap: 10, alignItems: 'center', padding: '9px 14px', borderRadius: 'var(--r-md)',
              background: p.me ? 'linear-gradient(90deg, oklch(34% 0.10 268 / 0.5), var(--bg-elevated))' : (p.rank <= 3 ? 'var(--bg-elevated)' : 'transparent'),
              border: `1px solid ${p.me ? 'var(--brand-500)' : (p.rank <= 3 ? 'var(--border)' : 'transparent')}` }}>
              <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: p.rank <= 3 ? 'var(--gold-400)' : 'var(--text-muted)' }}>{p.rank}</span>
              <Chg c={p.chg} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar initials={ini(p.name)} seed={p.handle} tier={p.tier} size={30} />
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><div style={{ ...mono, fontSize: 10, color: TIERC[p.tier], textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.tier}</div></div>
              </div>
              <Sparkline data={sparkSeed(p.handle)} w={86} h={22} color={p.chg !== 'new' && p.chg < 0 ? 'var(--no-400)' : 'var(--yes-400)'} />
              <span style={{ ...mono, fontSize: 12.5, textAlign: 'right', color: 'var(--text-muted)' }}>{p.acc}%</span>
              <span style={{ ...mono, fontSize: 13, fontWeight: 700, textAlign: 'right', color: 'var(--gold-300)' }}>{p.pts.toLocaleString()}</span>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </div>;
}
Object.assign(window, { LeaderboardBoard, Podium });
