// ds-showcase.jsx — atom/loader/chart/dial/nav specimen boards
const Screen2 = ({ children, pad = 32 }) => <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: pad, boxSizing: 'border-box' }}>{children}</div>;
const H2 = ({ children, sub }) => <div style={{ marginBottom: 22 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3 }}>{sub}</div>}</div>;
const S2 = ({ children }) => <div style={{ ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '22px 0 12px' }}>{children}</div>;

/* LOADERS board */
function LoadersBoard() {
  return <Screen2>
    <H2 sub="Spinner · dots · bar · ring · skeleton. One family, used everywhere a fetch or hold happens.">Loaders &amp; spinners</H2>
    <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
      <div style={{ textAlign: 'center' }}><Spinner size={28} /><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', marginTop: 10 }}>spinner</div></div>
      <div style={{ textAlign: 'center' }}><DotsLoader /><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', marginTop: 10 }}>dots</div></div>
      <div style={{ textAlign: 'center' }}><BarLoader /><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', marginTop: 10 }}>bar</div></div>
      <div style={{ textAlign: 'center' }}><RingProgress value={64} /><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', marginTop: 10 }}>ring</div></div>
      <div style={{ textAlign: 'center' }}><Spinner size={28} color="var(--gold-400)" /><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', marginTop: 10 }}>on confirm</div></div>
    </div>
    <S2>Skeleton (card-loading shape)</S2>
    <SkeletonCard />
  </Screen2>;
}

/* ATOMS board: inputs, avatars, badges, progress, tooltip, prob-bar variants */
function AtomsBoard() {
  return <Screen2>
    <H2 sub="Inputs, avatars + tiers, progress family, tooltip, probability-bar variants.">Atoms</H2>
    <S2>Inputs</S2>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 560 }}><div style={{ flex: 1, minWidth: 220 }}><Input icon={<Icon.search s={15} />} placeholder="Search markets…" /></div><div style={{ width: 160 }}><Input prefix="TZS" value="25,000" /></div></div>
    <S2>Avatars &amp; tiers</S2>
    <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>{['bronze', 'silver', 'gold', 'diamond'].map((t) => <div key={t} style={{ textAlign: 'center' }}><Avatar initials="JK" tier={t} /><div style={{ marginTop: 6 }}><TierBadge tier={t} /></div></div>)}</div>
    <S2>Progress</S2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
      <ProgressBar value={72} tone="teal" label="KYC review" /><ProgressBar value={45} tone="gold" label="Objection window" /><ProgressBar value={88} tone="info" size="sm" />
      <div style={{ marginTop: 6 }}><SteppedProgress steps={4} current={2} /></div>
    </div>
    <S2>Tooltip · chips</S2>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><Tooltip /><Chip tone="live">Live</Chip><Chip tone="hot">Hot</Chip><Chip tone="soon">Soon</Chip><Chip tone="resolved">Resolved</Chip><Chip tone="yes">YES</Chip><Chip tone="no">NO</Chip></div>
    <S2>Probability bar — 4 variants</S2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
      {[['split', 'split (default)'], ['segmented', 'segmented'], ['minimal', 'minimal (dense lists)'], ['resolved', 'resolved (gold shimmer)']].map(([v, n]) => <div key={v}><div style={{ ...mono, fontSize: 10, color: 'var(--text-subtle)', marginBottom: 5 }}>{n}</div><ProbabilityBar yes={64} variant={v} /></div>)}
    </div>
  </Screen2>;
}

/* CHARTS board (the dial now lives in its own section, using the real component) */
function ChartsBoard() {
  const trend = [42, 46, 44, 50, 48, 55, 52, 58, 56, 61, 60, 64];
  return <Screen2>
    <H2 sub="Probability line chart, sparkline, pool depth. The conviction dial has its own section (real production component).">Charts</H2>
    <S2>Probability chart</S2>
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18 }}><ProbabilityChart data={trend} w={560} h={170} id="dsx" /></div>
    <div style={{ display: 'flex', gap: 24, marginTop: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div><S2>Sparkline</S2><Sparkline data={trend} /></div>
      <div style={{ flex: 1, minWidth: 240 }}><S2>Pool depth</S2><PoolDepth yesPct={64} /></div>
    </div>
    <S2>Read-only conviction bar (in cards)</S2>
    <div style={{ maxWidth: 460 }}><ConvictionBar yes={64} /></div>
  </Screen2>;
}

/* NAV board */
function NavBoard() {
  return <Screen2 pad={0}>
    <TopNav active="Markets" />
    <LiveTicker />
    <div style={{ padding: 28 }}>
      <H2 sub="Top nav (56px), live ticker (32px), tabs, segmented, bottom nav (64px, mobile).">Navigation</H2>
      <S2>Tabs</S2><Tabs />
      <S2>Segmented</S2><Segmented />
    </div>
    <div style={{ maxWidth: 393, margin: '0 28px 28px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}><BottomNav active="Markets" /></div>
  </Screen2>;
}

Object.assign(window, { LoadersBoard, AtomsBoard, ChartsBoard, NavBoard });
