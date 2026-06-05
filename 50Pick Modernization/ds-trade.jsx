// ds-trade.jsx — market comments thread + sell-confirm + operation-result modals
const { useState: trS } = React;

const COMMENTS = [
  ['AM', 'amwaka', 'diamond', 'YES', '2m', 'Simba at home with full squad — this is closer to 70% than 64%.', 18],
  ['JK', 'jkessy', 'gold', 'NO', '14m', 'Yanga keeper in great form lately. Holding NO until team news.', 7],
  ['RT', 'rtemba', 'silver', null, '38m', 'What time is the official lineup released?', 3],
  ['FN', 'fnyerere', 'bronze', 'YES', '1h', 'Derby form favours the home side 4 of last 5. In on YES.', 24],
];
const TIERC = window.TIERC;

function CommentsThread() {
  return <div style={{ width: 460, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div className="disp" style={{ fontSize: 16, fontWeight: 700 }}>Discussion · Maoni</div>
      <span style={{ ...mono, fontSize: 11.5, color: 'var(--text-subtle)' }}>312 comments</span>
    </div>
    {/* composer */}
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <Avatar initials="JK" tier="gold" size={34} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-subtle)' }}>Add a comment · Andika maoni…</span>
        <span style={{ color: 'var(--accent-400)' }}>{Icon.bolt({ s: 16 })}</span>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {COMMENTS.map((c, i) => { const [ini, h, tier, side, when, text, up] = c;
        return <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
          <Avatar initials={ini} tier={tier} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>@{h}</span>
              <span style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: TIERC[tier] }}>{tier}</span>
              {side && <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: side === 'YES' ? 'var(--yes-400)' : 'var(--no-400)', border: `1px solid ${side === 'YES' ? 'var(--yes-400)' : 'var(--no-400)'}`, opacity: 0.9, borderRadius: 'var(--r-pill)', padding: '1px 6px' }}>{side}</span>}
              <span style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', marginLeft: 'auto' }}>{when}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 7 }}>{text}</div>
            <div style={{ display: 'flex', gap: 16, ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>{Icon.arrowUp({ s: 13 })}{up}</span>
              <span style={{ cursor: 'pointer' }}>Reply · Jibu</span>
            </div>
          </div>
        </div>; })}
    </div>
  </div>;
}

function SellConfirm() {
  return <div style={{ width: 360, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 22, boxShadow: '0 30px 80px oklch(5% 0.05 268 / 0.65)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div><div style={{ ...mono, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6 }}>Sell position · Uza</div><Chip tone="yes">YES · 0.64</Chip></div>
      <span role="button" tabIndex={0} aria-label="Close" style={{ color: 'var(--text-subtle)', cursor: 'pointer' }}>{Icon.x({ s: 18 })}</span>
    </div>
    <div className="disp" style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 16 }}>Will Simba SC win the Kariakoo derby?</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
      {[['Your stake', 'TZS 25,000', 'var(--text)'], ['Current value', 'TZS 27,586', 'var(--text)'], ['Realized P&L', '+TZS 2,586', 'var(--yes-400)'], ['You receive now', 'TZS 27,586', 'var(--gold-300)']].map(([k, v, c], idx) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: idx === 3 ? 13.5 : 13, color: 'var(--text-subtle)', fontWeight: idx === 3 ? 600 : 400 }}>{k}</span><span style={{ ...mono, fontSize: idx === 3 ? 18 : 13.5, fontWeight: 700, color: c }}>{v}</span></div>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="ghost" size="lg" live>Keep · Shika</Btn><Btn variant="gold" size="lg" live>Sell now · Uza</Btn></div>
    <p style={{ ...mono, fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>Selling early settles at the current market price.</p>
  </div>;
}

function OperationResult() {
  return <div style={{ width: 340, background: 'var(--bg-elevated)', border: '1px solid oklch(78% 0.13 80 / 0.45)', borderRadius: 'var(--r-lg)', padding: '28px 24px', textAlign: 'center', boxShadow: '0 0 40px oklch(78% 0.13 80 / 0.14), 0 30px 80px oklch(5% 0.05 268 / 0.6)' }}>
    <div style={{ width: 54, height: 54, margin: '0 auto 16px', borderRadius: 999, background: 'linear-gradient(180deg, var(--gold-300), var(--gold-600))', display: 'grid', placeItems: 'center', color: 'var(--gold-text)', boxShadow: '0 0 24px oklch(80% 0.14 78 / 0.4)' }}>{Icon.check({ s: 28, sw: 3 })}</div>
    <div className="disp" style={{ fontSize: 19, fontWeight: 700 }}>Position sold</div>
    <div style={{ fontSize: 13, color: 'var(--text-subtle)', margin: '4px 0 14px' }}>Imeuzwa · added to your wallet</div>
    <div style={{ ...mono, fontSize: 30, fontWeight: 700, color: 'var(--gold-300)' }}>+TZS 27,586</div>
    <div style={{ marginTop: 20 }}><Btn variant="gold" size="lg" full live>Done · Sawa</Btn></div>
  </div>;
}

function TradeBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 6 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Comments &amp; trade actions</div></div>
    <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginBottom: 24, maxWidth: 680, lineHeight: 1.6 }}>Market discussion thread (position tags + upvotes), the early-sell confirm modal, and the operation-result moment. Bilingual; gilt reserved for the payout/earned beat.</div>
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <CommentsThread />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>SELL CONFIRM</div><SellConfirm /></div>
        <div><div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>OPERATION RESULT</div><OperationResult /></div>
      </div>
    </div>
  </div>;
}
Object.assign(window, { CommentsThread, SellConfirm, OperationResult, TradeBoard });
