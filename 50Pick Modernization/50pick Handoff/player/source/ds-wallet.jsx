// ds-wallet.jsx — Wallet page (balance + rails + transaction history)
const TX = [
  ['payout', 'Payout · Simba SC derby', 'YES won', '+39,062', 'completed', '2m ago'],
  ['stake', 'Stake · Bitcoin > $90k', 'YES · 0.58', '-25,000', 'completed', '1h ago'],
  ['deposit', 'Deposit · M-Pesa', '+255 7XX', '+100,000', 'completed', '3h ago'],
  ['stake', 'Stake · TZS/USD < 2,700', 'NO · 0.59', '-10,000', 'completed', '5h ago'],
  ['withdraw', 'Withdrawal · M-Pesa', 'to +255 7XX', '-50,000', 'pending', '6h ago'],
  ['refund', 'Refund · Market voided', 'Dar rainfall', '+5,000', 'completed', '1d ago'],
  ['deposit', 'Deposit · Airtel Money', '+255 6XX', '+20,000', 'failed', '2d ago'],
];
function TxIcon({ t }) {
  const map = { payout: ['var(--gold-400)', Icon.trophy], stake: ['var(--text-muted)', Icon.tipping], deposit: ['var(--yes-400)', Icon.arrowDown], withdraw: ['var(--brand-300)', Icon.arrowUp], refund: ['var(--text-muted)', Icon.resolved] };
  const [c, G] = map[t] || ['var(--text-muted)', Icon.wallet];
  return <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--bg-inset)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: c }}>{G({ s: 17 })}</span>;
}
function WalletBoard() {
  const railList = [['M-Pesa', 'oklch(70% 0.15 152)'], ['Airtel Money', 'oklch(67% 0.18 22)'], ['Tigo Pesa', 'oklch(63% 0.18 262)'], ['Halopesa', 'oklch(80% 0.13 82)']];
  const STATUS = { completed: ['var(--yes-400)', 'oklch(52% 0.15 150 / 0.16)'], pending: ['var(--brand-300)', 'oklch(54% 0.165 262 / 0.18)'], failed: ['var(--no-400)', 'oklch(50% 0.19 25 / 0.16)'] };
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
    <TopNav active="Wallet" />
    <div style={{ padding: '26px 32px 36px', display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 28, alignItems: 'start' }}>
      {/* left — balance + rails */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ padding: 24, borderRadius: 'var(--r-xl)', background: 'linear-gradient(135deg, oklch(23% 0.075 268), oklch(16% 0.05 268))', border: '1px solid oklch(78% 0.13 80 / 0.3)', boxShadow: 'inset 0 1px 0 oklch(92% 0.06 84 / 0.15), 0 12px 34px oklch(8% 0.05 264 / 0.5)' }}>
          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 8 }}>Available balance · Salio</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ ...mono, fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' }}>TZS 84,200</span></div>
          <div style={{ display: 'flex', gap: 18, margin: '14px 0 20px' }}>
            {[['In play', 'TZS 35,000'], ['Lifetime won', 'TZS 612,400']].map(([k, v]) => <div key={k}><div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{k}</div><div style={{ ...mono, fontSize: 14, fontWeight: 700 }}>{v}</div></div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Btn variant="gold" size="lg" live leading={Icon.arrowDown({ s: 16, sw: 2.2 })}>Deposit</Btn>
            <Btn variant="ghost" size="lg" live leading={Icon.arrowUp({ s: 16, sw: 2.2 })}>Withdraw</Btn>
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }}>Deposit via · Lipa kwa</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {railList.map(([n, c]) => <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)', cursor: 'pointer' }}><span style={{ width: 9, height: 9, borderRadius: '100%', background: c }} /><span style={{ fontSize: 13, fontWeight: 600 }}>{n}</span></div>)}
          </div>
          <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', marginTop: 12, lineHeight: 1.5 }}>Min TZS 1,000 · instant · no fee on deposit</div>
        </div>
      </div>
      {/* right — transactions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 className="disp" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Transactions</h1>
          <Segmented items={['All', 'Deposits', 'Bets', 'Payouts']} value="All" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {TX.map((t, i) => { const [type, title, sub, amt, status, when] = t; const pos = amt.startsWith('+'); const [sc, sbg] = STATUS[status];
            return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <TxIcon t={type} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div><div style={{ ...mono, fontSize: 11.5, color: 'var(--text-subtle)' }}>{sub} · {when}</div></div>
              <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: sc, background: sbg, border: `1px solid ${sc}`, opacity: 0.9, borderRadius: 'var(--r-pill)', padding: '2px 8px' }}>{status}</span>
              <span style={{ ...mono, fontSize: 14, fontWeight: 700, minWidth: 96, textAlign: 'right', color: type === 'payout' ? 'var(--gold-300)' : pos ? 'var(--yes-400)' : 'var(--text)' }}>{amt.replace(/^([+-])/, '$1TZS ')}</span>
            </div>; })}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}><Btn variant="outline" size="md" live>Load more · Pakua zaidi</Btn></div>
      </div>
    </div>
  </div>;
}
Object.assign(window, { WalletBoard });
