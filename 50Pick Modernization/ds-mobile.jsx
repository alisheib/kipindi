// ds-mobile.jsx — mobile (393px) compositions: market detail, betslip sheet, card grid
const { useState: mbS } = React;

function Phone({ children, label }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 393, height: 760, borderRadius: 30, overflow: 'hidden', position: 'relative', background: 'var(--bg)', border: '8px solid oklch(8% 0.03 268)', boxShadow: '0 24px 60px oklch(6% 0.05 268 / 0.6)' }}>
      {/* status bar */}
      <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', ...mono, fontSize: 11, color: 'var(--text-muted)', background: 'var(--panel)' }}>
        <span>9:41</span><span style={{ ...disp, fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>50<span style={{ color: 'var(--accent-400)' }}>pick</span></span><span>5G ▪ 84%</span>
      </div>
      <div style={{ position: 'absolute', top: 30, left: 0, right: 0, bottom: 56, overflow: 'hidden' }}>{children}</div>
      {/* bottom nav */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', alignItems: 'center', background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
        {[['Markets', Icon.markets, true], ['Live', Icon.live], ['Bets', Icon.portfolio], ['Ranks', Icon.trophy], ['Wallet', Icon.wallet]].map(([l, G, on]) => <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? 'var(--accent-400)' : 'var(--text-subtle)' }}>{G({ s: 20 })}<span style={{ fontSize: 9.5, fontWeight: on ? 600 : 500 }}>{l}</span></div>)}
      </div>
    </div>
    <div style={{ ...mono, fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
  </div>;
}

function MobileDetail() {
  const trend = [50, 52, 49, 55, 53, 58, 56, 61, 60, 64];
  const w = 720, h = 120;
  const pts = trend.map((v, i) => `${(i / (trend.length - 1)) * w},${h - (v / 100) * h}`).join(' ');
  return <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}><Chip tone="live">Live</Chip><Chip tone="cat" icon={Icon.football({ s: 12 })}>Football</Chip></div>
    <div className="disp" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.25 }}>Will Simba SC win the Kariakoo derby?</div>
    <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--text-subtle)', margin: '4px 0 16px' }}>Je, Simba SC watashinda dabi ya Kariakoo?</div>
    {/* dial ABOVE chart */}
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 12 }}>
      <ConvictionSliderRound width={325} height={120} baseStake={5000} initial={0.5} />
    </div>
    {/* chart */}
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={{ ...mono, fontSize: 24, fontWeight: 700, color: 'var(--yes-400)' }}>64%</span><span style={{ ...mono, fontSize: 11, color: 'var(--yes-400)' }}>+6 today</span></div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="var(--yes-400)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-around', ...mono, fontSize: 11, color: 'var(--text-subtle)', marginBottom: 14 }}><span>TZS 48.2M pool</span><span>1,284 predictors</span><span>2d 4h</span></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="yes" size="lg" full live>YES · 0.64</Btn><Btn variant="no" size="lg" full live>NO · 0.36</Btn></div>
  </div>;
}

function MobileBetslip() {
  return <div style={{ height: '100%', position: 'relative' }}>
    {/* dimmed market behind */}
    <div style={{ position: 'absolute', inset: 0, padding: 16, opacity: 0.4, filter: 'blur(1px)' }}>
      <div className="disp" style={{ fontSize: 18, fontWeight: 700 }}>Will Simba SC win the Kariakoo derby?</div>
      <div style={{ height: 10 }} /><ConvictionBar yes={64} h={8} />
    </div>
    <div style={{ position: 'absolute', inset: 0, background: 'oklch(8% 0.03 268 / 0.55)' }} />
    {/* bottom sheet */}
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-strong)', borderRadius: '20px 20px 0 0', padding: 18, boxShadow: '0 -16px 40px oklch(6% 0.05 268 / 0.5)' }}>
      <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border-strong)', margin: '0 auto 16px' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ ...mono, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Confirm prediction</span><span style={{ ...mono, fontSize: 11.5, color: 'var(--text-subtle)' }}>Bal · <b style={{ color: 'var(--text)' }}>TZS 84,200</b></span></div>
      <div style={{ marginBottom: 12 }}><SidePair price="64" live /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 48, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)', marginBottom: 10 }}>
        <span style={{ ...mono, fontSize: 13, color: 'var(--text-subtle)' }}>TZS</span><span style={{ ...mono, fontSize: 22, fontWeight: 700, flex: 1 }}>25,000</span>
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>{['5k', '10k', '25k', '50k'].map((c, i) => <span key={c} style={{ flex: 1, textAlign: 'center', ...mono, fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 'var(--r-pill)', color: i === 2 ? 'var(--gold-text)' : 'var(--text-muted)', background: i === 2 ? 'var(--gold-500)' : 'var(--bg-elevated2)', border: '1px solid var(--border)' }}>{c}</span>)}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)', marginBottom: 14 }}><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>If correct</span><span style={{ ...mono, fontSize: 18, fontWeight: 700, color: 'var(--gold-300)' }}>TZS 39,062</span></div>
      <Btn variant="gold" size="lg" full live leading={Icon.check({ s: 16, sw: 2.4 })}>Hold to confirm · Shikilia</Btn>
    </div>
  </div>;
}

function MobileGrid() {
  const M = [
    ['football', 'Live', 'Will Simba SC win the Kariakoo derby?', 64, '48.2M', '2d 4h'],
    ['crypto', 'Live', 'Will Bitcoin close above $90,000 this month?', 58, '72.9M', '12d'],
    ['weather', 'Live', 'Will Dar es Salaam exceed 33°C this weekend?', 73, '12.4M', '1d 8h'],
  ];
  return <div style={{ height: '100%', overflow: 'auto', padding: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-400)', textTransform: 'uppercase' }}>{Icon.live({ s: 14 })} Live · Hai</span>
      <span style={{ color: 'var(--text-subtle)' }}>{Icon.filter({ s: 18 })}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {M.map((m, i) => { const [cat, st, q, yes, vol, left] = m; return <div key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 14 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}><Chip tone="live">Live</Chip><Chip tone="cat" icon={(Icon[cat]||Icon.markets)({ s: 12 })}>{cat}</Chip></div>
        <div className="disp" style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 10, minHeight: 38 }}>{q}</div>
        <ConvictionBar yes={yes} h={8} />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10.5, color: 'var(--text-subtle)', margin: '8px 0 12px' }}><span>YES {yes}%</span><span>TZS {vol}</span><span>{left}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Btn variant="yes" size="md" full live>YES · 0.{yes}</Btn><Btn variant="no" size="md" full live>NO · 0.{100 - yes}</Btn></div>
      </div>; })}
    </div>
  </div>;
}

function MobileBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 6 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Mobile · 393px</div></div>
    <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginBottom: 24, maxWidth: 680, lineHeight: 1.6 }}>Tanzania is mobile-first. Stacked market detail (dial above chart), betslip bottom-sheet (hold-to-confirm), single-column card grid, 5-tab bottom nav.</div>
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      <Phone label="Market detail · stacked"><MobileDetail /></Phone>
      <Phone label="Betslip bottom sheet"><MobileBetslip /></Phone>
      <Phone label="Market grid · 1-col"><MobileGrid /></Phone>
    </div>
  </div>;
}
Object.assign(window, { MobileBoard, Phone });
