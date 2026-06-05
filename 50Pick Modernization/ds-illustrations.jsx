// ds-illustrations.jsx — line-art illustrations: empty states + how-it-works
// All currentColor line-art in the brand palette (no cartoons, no fills).

const IL = ({ children, s = 96, c = 'var(--brand-400)' }) => <svg width={s} height={s * 0.78} viewBox="0 0 120 94" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: 'block' }}>{children}</svg>;

// empty: no positions — an empty ledger with a tipping split line
const EmptyPositions = (p) => <IL {...p}><rect x="22" y="14" width="76" height="66" rx="6" /><path d="M22 34h76" /><path d="M60 34v46" stroke="var(--gold-400)" /><path d="M34 50h18M34 60h12M68 50h18M68 62h14" opacity="0.5" /><circle cx="60" cy="34" r="2.5" fill="var(--gold-400)" stroke="none" /></IL>;
// empty: no markets found — magnifier over a split disc
const EmptySearch = (p) => <IL {...p}><circle cx="50" cy="42" r="24" /><path d="M50 18a24 24 0 0 1 0 48" stroke="var(--no-400)" opacity="0.7" /><path d="M50 18a24 24 0 0 0 0 48" stroke="var(--yes-400)" opacity="0.7" /><path d="M67 59l18 18" /><circle cx="88" cy="80" r="2" fill="currentColor" stroke="none" /></IL>;
// leaderboard warming — podium with a rising spark
const EmptyRanks = (p) => <IL {...p}><path d="M30 80h60" /><rect x="36" y="56" width="16" height="24" /><rect x="54" y="44" width="16" height="36" stroke="var(--gold-400)" /><rect x="72" y="64" width="16" height="16" /><path d="M62 36l2-8 2 8" stroke="var(--gold-400)" /></IL>;
// offline — broken signal arcs
const EmptyOffline = (p) => <IL {...p} c="var(--gold-400)"><path d="M60 70h.01" /><path d="M44 56a22 22 0 0 1 32 0" /><path d="M32 44a40 40 0 0 1 56 0" opacity="0.5" /><path d="M84 30l-8 8M76 30l8 8" stroke="var(--no-400)" /></IL>;

function EmptyCard({ art, title, sw, cta }) {
  return <div style={{ width: 300, textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-lg)', padding: '26px 22px', background: 'var(--bg-elevated)' }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>{art}</div>
    <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
    <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--text-subtle)', margin: '5px 0 16px' }}>{sw}</div>
    {cta}
  </div>;
}

// How it works — 3 line-art steps
const HowPick = (p) => <IL {...p} s={72}><circle cx="60" cy="44" r="30" /><path d="M60 14a30 30 0 0 1 0 60" stroke="var(--no-400)" /><path d="M60 14a30 30 0 0 0 0 60" stroke="var(--yes-400)" /><line x1="60" y1="14" x2="60" y2="74" stroke="var(--gold-400)" /></IL>;
const HowStake = (p) => <IL {...p} s={72} c="var(--gold-400)"><rect x="30" y="30" width="60" height="36" rx="6" /><circle cx="60" cy="48" r="9" /><path d="M30 40h60" opacity="0.5" /></IL>;
const HowWin = (p) => <IL {...p} s={72} c="var(--gold-400)"><path d="M44 22h32v10a16 16 0 0 1-32 0z" /><path d="M44 26h-8v6a8 8 0 0 0 8 6M76 26h8v6a8 8 0 0 1-8 6" /><path d="M60 48v10M50 74h20M52 74l1.5-10h13L68 74" /></IL>;

function IllustrationsBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 6 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Illustrations</div></div>
    <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginBottom: 24, maxWidth: 680, lineHeight: 1.6 }}>Line-art in the brand palette \u2014 no cartoons, no fills. Each empty state has a unique illustration (not one template); the tipping split + gilt needle recur as the through-line. Category watermarks now sit behind market cards.</div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 14 }}>EMPTY STATES (unique per surface)</div>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 30 }}>
      <EmptyCard art={<EmptyPositions />} title="No open positions" sw="Chagua upande kuanza" cta={<Btn variant="primary" size="md" live>Browse markets</Btn>} />
      <EmptyCard art={<EmptySearch />} title="No markets found" sw="Hakuna matokeo" cta={<Btn variant="ghost" size="md" live>Clear filters</Btn>} />
      <EmptyCard art={<EmptyRanks />} title="Leaderboard is warming up" sw="Orodha inaandaliwa" />
      <EmptyCard art={<EmptyOffline />} title="You're offline" sw="Hakuna mtandao \u00b7 reconnecting" />
    </div>
    <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 14 }}>HOW IT WORKS (onboarding)</div>
    <div style={{ display: 'flex', gap: 14 }}>
      {[[HowPick, 'Pick a side', 'Drag the conviction dial to set YES or NO and your stake.'], [HowStake, 'Stake TZS', 'Top up with M-Pesa and join the pool in seconds.'], [HowWin, 'Share the pool', 'If you\u2019re right, you split the losing pool \u2014 paid instantly.']].map(([Art, t, d], i) => <div key={t} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><Art /><span style={{ ...mono, fontSize: 22, fontWeight: 700, color: 'var(--gold-300)' }}>{i + 1}</span></div>
        <div className="disp" style={{ fontSize: 16, fontWeight: 600 }}>{t}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>{d}</div>
      </div>)}
    </div>
  </div>;
}
Object.assign(window, { IllustrationsBoard, EmptyCard });
