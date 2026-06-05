// features.jsx — full feature examples on the matched 50pick palette.
const { useState: fS, useEffect: fE } = React;

/* shared frame helpers */
const Screen = ({ children, w, pad = 28, style }) => <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: pad, boxSizing: 'border-box', ...style }}>{children}</div>;
const Hd = ({ children, sub }) => <div style={{ marginBottom: 20 }}><div className="disp" style={{ fontSize: 20, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}</div>;
const Lbl = ({ children }) => <div style={{ ...mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }}>{children}</div>;

/* ============================================================
   MARKETCARD — faithful to the live "Pick a side now" card
   ============================================================ */
function MarketCard({ m, onPick, hoverTone = 'blue', forceHover }) {
  const [hv, setHv] = fS(false);
  const h = forceHover || hv;
  const Cat = Icon[m.catIcon] || Icon.globe;
  const tone = hoverTone === 'gold'
    ? { border: 'var(--gold-500)', glow: 'oklch(80% 0.13 84 / 0.26)' }
    : { border: 'var(--brand-500)', glow: 'oklch(63% 0.18 262 / 0.24)' };
  return (
    <div onMouseEnter={() => setHv(true)} onMouseLeave={() => setHv(false)}
      style={{ background: 'var(--bg-elevated)', border: `1px solid ${h ? tone.border : 'var(--border)'}`, borderRadius: 'var(--r-md)', overflow: 'hidden',
        transform: h ? 'translateY(-3px)' : 'none', boxShadow: h ? `0 0 0 1px ${tone.border}, 0 14px 34px oklch(8% 0.08 264 / 0.6), 0 0 30px ${tone.glow}` : '0 1px 2px oklch(8% 0.07 264 / 0.35)',
        transition: 'transform .2s var(--ease-stage), border-color .2s var(--ease-micro), box-shadow .2s var(--ease-stage)', cursor: 'pointer' }}>
      <span aria-hidden style={{ position: 'absolute', top: -14, right: -10, color: h ? tone.border : 'var(--border-strong)', opacity: h ? 0.16 : 0.07, transition: 'opacity .2s, color .2s', pointerEvents: 'none' }}><Cat s={96} /></span>
      <div style={{ position: 'relative', zIndex: 1, padding: '14px 15px 13px' }}>
        {/* chips row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Chip tone="live">Live</Chip>
            {m.hot ? <Chip tone="hot">Hot</Chip> : <Chip tone="soon">Soon</Chip>}
            <Chip tone="cat" icon={<Cat s={13} />}>{m.cat}</Chip>
          </div>
          <MovePill dir={m.dir} v={m.move} />
        </div>
        {/* title + big % */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 15 }}>
          <div className="disp" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.34, flex: 1 }}>{m.q}</div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ ...mono, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--yes-400)' }}>YES</div>
            <div style={{ ...mono, fontSize: 28, fontWeight: 700, color: 'var(--yes-400)', lineHeight: 1 }}>{m.yes}<span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>%</span></div>
          </div>
        </div>
        <ConvictionBar yes={m.yes} />
        {/* buttons */}
        <div style={{ margin: '15px 0 13px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <SideButton side="yes" price={m.yes} live /><SideButton side="no" price={100 - m.yes} live />
          </div>
        </div>
        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...mono, fontSize: 11, color: 'var(--text-subtle)' }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ marginLeft: i ? -8 : 0, borderRadius: 999, border: '2px solid var(--bg-elevated)', position: 'relative', zIndex: 3 - i }}><Avatar initials="" seed={'mk' + m.id + i} size={18} /></span>)}
            <span style={{ marginLeft: 7 }}>{m.vol !== '0' ? `+${m.vol} staked` : 'be first'}</span>
          </span>
          <span>{m.left} left</span>
        </div>
      </div>
    </div>
  );
}

const MK = [
  { id: 1, cat: 'Culture', catIcon: 'culture', hot: true, dir: 'down', move: '8', q: 'Demo · 5-minute coin flip — will the next 5 minutes resolve YES?', yes: 50, traders: 0, vol: '100,000', left: '1m' },
  { id: 2, cat: 'Culture', catIcon: 'culture', hot: false, dir: 'down', move: '6', q: 'Demo · 5-minute coin flip — will the next 5 minutes resolve YES?', yes: 50, traders: 0, vol: '0', left: '1m' },
  { id: 3, cat: 'Sports', catIcon: 'sports', hot: true, dir: 'down', move: '9', q: 'Demo · 15-minute hot market — will the demo close YES in 15 min?', yes: 50, traders: 0, vol: '100,000', left: '11m' },
  { id: 4, cat: 'Sports', catIcon: 'sports', hot: false, dir: 'down', move: '4', q: 'Demo · 15-minute hot market — will the demo close YES in 15 min?', yes: 50, traders: 0, vol: '0', left: '11m' },
  { id: 5, cat: 'Macro', catIcon: 'macro', hot: false, dir: 'down', move: '5', q: 'Demo · 30-minute warm-up — outcome at 30-min mark?', yes: 50, traders: 0, vol: '0', left: '26m' },
  { id: 6, cat: 'Macro', catIcon: 'macro', hot: false, dir: 'down', move: '7', q: 'Demo · 1-hour TZS spot — TZS-USD higher in 1 hour?', yes: 50, traders: 0, vol: '0', left: '56m' },
];

/* ---------- the live "Pick a side now" section ---------- */
function PickASide() {
  return (
    <Screen pad={32}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--live-400)', display: 'flex', alignItems: 'center', gap: 7 }}><LiveDot c="var(--live-400)" /> LIVE · HAI</div>
          <div className="disp" style={{ fontSize: 30, fontWeight: 700, marginTop: 8 }}>Pick a side now</div>
        </div>
        <span style={{ ...mono, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--accent-400)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>VIEW ALL →</span>
      </div>
      <div className="stagger-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {MK.map((m) => <MarketCard key={m.id} m={m} />)}
      </div>
      {/* how it works band */}
      <div style={{ marginTop: 28, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 26, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 26 }}>
        {[['01', 'CHAGUA UPANDE, WEKA DAU', 'Pick a side, stake TZS', 'Price Competition pool. Min TZS 100. Drag the conviction needle on any market.', 'chart'],
          ['02', 'UTATUZI WA MAAFISA WAWILI', 'Two-officer resolution', 'Every market resolves against a public source URL with two officer signatures.', 'shield'],
          ['03', 'PATA MALIPO KWA M-PESA', 'Get paid via M-Pesa', "Winners share the losers' pool minus a 9% margin. Withdrawals in seconds.", 'phone']].map(([n, sw, t, b, ic]) => {
          const G = Icon[ic];
          return (
            <div key={n} style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-400)', flexShrink: 0 }}><G s={24} /></div>
              <div>
                <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--gold-500)' }}>{n}&nbsp;&nbsp;<span style={{ fontStyle: 'italic' }}>{sw}</span></div>
                <div className="disp" style={{ fontSize: 17, fontWeight: 700, margin: '5px 0 5px' }}>{t}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{b}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

/* ============================================================
   BUTTON SHOWCASE — the classy YES/NO + system
   ============================================================ */
function ButtonShowcase() {
  return (
    <Screen>
      <Hd sub="Sportsbook treatment: bold side label + price in a recessed mono chip, machined top highlight, seats down 2px on press. Gold reserved for confirm-payout.">Buttons</Hd>
      <Lbl>YES / NO · rest → hover → pressed</Lbl>
      <div style={{ display: 'flex', gap: 22, marginBottom: 26 }}>
        {[['Rest', undefined], ['Hover', 'hover'], ['Pressed', 'press']].map(([lab, st]) => (
          <div key={lab} style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <SideButton side="yes" price="64" size="lg" state={st} /><SideButton side="no" price="36" size="lg" state={st} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', fontWeight: 600 }}>{lab}</div>
          </div>
        ))}
      </div>
      <Lbl>Primary CTA — confirm-payout (gold) · states</Lbl>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 26, alignItems: 'center' }}>
        <Btn variant="gold" size="lg" live leading={<Icon.check s={17} sw={2.4} />}>Confirm · TZS 25,000</Btn>
        <Btn variant="gold" size="lg" state="hover" leading={<Icon.check s={17} sw={2.4} />}>Hover</Btn>
        <Btn variant="gold" size="lg" state="loading">Placing…</Btn>
        <Btn variant="gold" size="lg" state="disabled" leading={<Icon.check s={17} sw={2.4} />}>Disabled</Btn>
      </div>
      <Lbl>Chrome — primary (teal-green) · ghost · outline</Lbl>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn variant="primary" size="lg" live leading={<Icon.play s={16} />}>Try the demo</Btn>
        <Btn variant="ghost" size="lg" live>Cancel</Btn>
        <Btn variant="outline" size="lg" live trailing={<span style={{ fontSize: 16 }}>→</span>}>View all markets</Btn>
      </div>
      <Lbl>Sizes</Lbl>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        {['sm', 'md', 'lg', 'xl'].map((s) => <Btn key={s} variant="primary" size={s} live>{s.toUpperCase()}</Btn>)}
      </div>
    </Screen>
  );
}

/* ============================================================
   BUY TRAY
   ============================================================ */
function BuyTray() {
  const [side, setSide] = fS('yes'); const [amt, setAmt] = fS(25000);
  const price = side === 'yes' ? 0.64 : 0.36; const payout = Math.round(amt / price);
  return (
    <Screen>
      <Hd sub="YES/NO segmented control · TZS mono input · quick-chips · gold payout line · gold confirm.">Buy tray</Hd>
      <div style={{ maxWidth: 340, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 5, borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)', marginBottom: 16 }}>
          {['yes', 'no'].map((s) => {
            const on = side === s; const yes = s === 'yes';
            return <button key={s} onClick={() => setSide(s)} style={{ height: 40, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', font: '700 14px var(--font-body)', letterSpacing: '0.05em',
              color: on ? '#fff' : (yes ? 'var(--yes-400)' : 'var(--no-400)'),
              background: on ? `linear-gradient(180deg, ${yes ? 'oklch(64% 0.16 150)' : 'oklch(61% 0.2 25)'}, ${yes ? 'oklch(54% 0.15 150)' : 'oklch(51% 0.19 25)'})` : 'transparent',
              boxShadow: on ? `inset 0 1px 0 oklch(85% 0.13 ${yes ? 152 : 25} / 0.5)` : 'none', transition: 'all .15s' }}>{yes ? 'YES' : 'NO'} · {yes ? '0.64' : '0.36'}</button>;
          })}
        </div>
        <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ ...mono, fontSize: 14, color: 'var(--text-subtle)' }}>TZS</span>
          <span style={{ ...mono, fontSize: 24, fontWeight: 600, flex: 1 }}>{amt.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {[1000, 5000, 10000, 25000, 50000, 100000].map((c) => {
            const on = amt === c;
            return <button key={c} onClick={() => setAmt(c)} style={{ ...mono, fontSize: 12, fontWeight: 600, padding: '6px 11px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
              color: on ? 'var(--gold-text)' : 'var(--text-muted)', background: on ? 'var(--gold-500)' : 'var(--bg-elevated2)', border: '1px solid var(--border)', transition: 'all .12s' }}>{c >= 1000 ? c / 1000 + 'k' : c}</button>;
          })}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--text-subtle)' }}>Share of pool</span><span style={mono}>0.41%</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 13.5, color: 'var(--text-subtle)' }}>If correct, you receive</span><span style={{ ...mono, fontSize: 18, fontWeight: 700, color: 'var(--gold-400)' }}>TZS {payout.toLocaleString()}</span></div>
        </div>
        <Btn variant="gold" size="xl" full live>Confirm · TZS {payout.toLocaleString()}</Btn>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>Pool-share payout. Outcome may differ from current odds.</p>
      </div>
    </Screen>
  );
}

/* ============================================================
   POSITION CARDS + LEADERBOARD
   ============================================================ */
function PositionsLeaderboard() {
  const pos = [
    { side: 'yes', status: 'Pending', q: 'Will Simba SC win the Kariakoo derby?', stake: '25,000', cur: '28,400', max: '39,062', up: true },
    { side: 'no', status: 'Resolved · Win', q: 'Will TZS/USD stay below 2,700 Friday?', stake: '10,000', cur: '16,950', max: '16,950', win: true },
  ];
  const lead = [['MwanzaPredicts', 'diamond', '+187%', 14, 312, 1], ['DerbyKing_TZ', 'gold', '+142%', 9, 287, 2], ['ZanziForex', 'gold', '+118%', 7, 241, 3], ['KariakooQueen', 'silver', '+96%', 5, 198, 4], ['BongoStats', 'silver', '-8%', 0, 176, 5]];
  const tierC = { diamond: 'var(--accent-400)', gold: 'var(--gold-400)', silver: 'oklch(78% 0.02 264)', bronze: 'oklch(62% 0.10 60)' };
  return (
    <Screen>
      <Hd sub="Position cards (side + status, 3-up stat grid) and leaderboard rows (gold ROI, tier badges).">Positions &amp; leaderboard</Hd>
      <Lbl>Positions</Lbl>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        {pos.map((p, i) => (
          <div key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Chip tone={p.side}>{p.side.toUpperCase()}</Chip>
              <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: p.win ? 'var(--gold-400)' : 'var(--text-muted)' }}>{p.status}</span>
            </div>
            <div className="disp" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 14 }}>{p.q}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['Stake', p.stake, 'var(--text)'], [p.win ? 'Final' : 'Current', p.cur, p.win ? 'var(--gold-400)' : (p.up ? 'var(--yes-400)' : 'var(--text)')], ['Max payout', p.max, 'var(--text-muted)']].map(([l, v, c]) => (
                <div key={l}><div style={{ ...mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{l}</div><div style={{ ...mono, fontSize: 13, fontWeight: 600, color: c, marginTop: 4 }}>{v}</div></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Lbl>Leaderboard · this week</Lbl>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '4px 16px' }}>
        {lead.map(([name, tier, roi, streak, resolved, rank], i) => {
          const neg = roi.startsWith('-');
          return (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 84px 64px 70px', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: i ? '1px solid oklch(33% 0.05 264 / 0.5)' : 'none' }}>
              <span style={{ ...mono, fontSize: 14, fontWeight: 600, color: rank <= 3 ? 'var(--gold-400)' : 'var(--text-subtle)' }}>{rank}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: 'linear-gradient(135deg, var(--bg-elevated2), var(--bg-inset))', border: `1.5px solid ${tierC[tier]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...disp, fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{name.slice(0, 2).toUpperCase()}</div>
                <div><div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tierC[tier] }}>{tier}</div></div>
              </div>
              <span style={{ ...mono, fontSize: 14, fontWeight: 600, color: neg ? 'var(--no-300)' : 'var(--gold-400)', textAlign: 'right' }}>{roi}</span>
              <span style={{ ...mono, fontSize: 13, color: 'var(--text-muted)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>{streak > 0 && <Icon.flame s={12} style={{ color: 'var(--gold-500)' }} />}{streak}</span>
              <span style={{ ...mono, fontSize: 13, color: 'var(--text-muted)', textAlign: 'right' }}>{resolved}</span>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

/* ============================================================
   RESOLUTION PANEL
   ============================================================ */
function ResolutionPanel() {
  return (
    <Screen>
      <Hd sub="Two-officer resolution against a public source · 9% margin from losing pool · settlement table.">Resolution</Hd>
      <div style={{ maxWidth: 460, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div className="disp" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, maxWidth: 300 }}>Will TZS/USD stay below 2,700 by Friday?</div>
          <Chip tone="resolved" icon={<Icon.check s={12} sw={2.6} />}>Resolved · NO</Chip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'linear-gradient(135deg, var(--bg-elevated2), var(--bg-inset))', border: '1.5px solid var(--accent-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...disp, fontWeight: 700, fontSize: 13 }}>AM</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 500 }}>A. Mwakalindile</div><div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Compliance Officer · 2-officer rule satisfied</div></div>
          <Btn variant="outline" size="sm" live leading={<Icon.ext s={13} />}>Source</Btn>
        </div>
        <div style={{ padding: '16px 0 4px' }}>
          {[['YES pool', 'TZS 17.4M', 'var(--text-muted)'], ['NO pool', 'TZS 30.8M', 'var(--text-muted)'], ['Operator margin (9% of losing pool)', 'TZS 1.57M', 'var(--text-subtle)'], ['Distributed to NO winners', 'TZS 46.6M', 'var(--gold-400)']].map(([l, v, c], i, a) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i === a.length - 1 ? '1px solid var(--border)' : 'none', marginTop: i === a.length - 1 ? 6 : 0 }}>
              <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>{l}</span><span style={{ ...mono, fontSize: i === a.length - 1 ? 16 : 13.5, fontWeight: 600, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

/* ============================================================
   WIN + LOSS + TOASTS
   ============================================================ */
function WinLoss() {
  const [go, setGo] = fS(false);
  const replay = () => { setGo(false); requestAnimationFrame(() => setTimeout(() => setGo(true), 20)); };
  fE(() => { const t = setTimeout(() => setGo(true), 300); return () => clearTimeout(t); }, []);
  return (
    <Screen>
      <Hd sub="Resolved-winner = gold moment (check, rolling +TZS, paid sublabel). Loss is calm, never punitive. No confetti/casino imagery.">Resolution moments</Hd>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* WIN */}
        <div key={go ? 'g' : 'b'} style={{ position: 'relative', background: 'var(--bg-elevated)', border: '1px solid oklch(80% 0.13 84 / 0.45)', borderRadius: 'var(--r-lg)', padding: '30px 26px', textAlign: 'center', overflow: 'hidden',
          boxShadow: '0 0 50px oklch(80% 0.13 82 / 0.12)', animation: go ? 'pop .3s var(--ease-celebrate)' : 'none' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 60% at 50% 0%, oklch(80% 0.13 84 / 0.14), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 18px', borderRadius: 999, background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-text)', boxShadow: '0 6px 20px oklch(80% 0.13 82 / 0.4)' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: go ? 0 : 1, transition: 'stroke-dashoffset .5s var(--ease-celebrate) .3s' }} /></svg>
          </div>
          <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--gold-400)', marginBottom: 9 }}>RESOLVED · YES</div>
          <div className="disp" style={{ fontSize: 23, fontWeight: 700, marginBottom: 6 }}>You were right</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.35 }}>Will Simba SC win the Kariakoo derby?</div>
          <div style={{ ...mono, fontSize: 36, fontWeight: 700, color: 'var(--gold-300)', lineHeight: 1 }}>+TZS {go ? <RollNum value={39062} /> : '0'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '14px 0 20px' }}>Imelipwa · Paid to your wallet</div>
          <Btn variant="gold" size="lg" full live>Continue</Btn>
          <button onClick={replay} style={{ position: 'absolute', top: 12, right: 12, ...mono, fontSize: 11, color: 'var(--text-subtle)', background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 9px', cursor: 'pointer' }}>↻</button>
        </div>
        {/* LOSS */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '30px 26px', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 18px', borderRadius: 999, background: 'var(--no-soft)', border: '1px solid oklch(58% 0.2 25 / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--no-300)' }}><Icon.arrowDown s={24} sw={2} /></div>
          <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--no-300)', marginBottom: 9 }}>RESOLVED · NO</div>
          <div className="disp" style={{ fontSize: 23, fontWeight: 700, marginBottom: 6 }}>Not this time</div>
          <div style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 20 }}>Si safari hii — karibu tena.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Your prediction</span><Chip tone="yes">YES</Chip></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Stake</span><span style={{ ...mono, fontWeight: 600 }}>TZS 25,000</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Btn variant="ghost" live>View resolution</Btn><Btn variant="primary" live>Browse markets</Btn></div>
        </div>
      </div>
      <Lbl>Toasts</Lbl>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
        {[['var(--yes-400)', 'var(--yes-soft)', Icon.check, 'Prediction placed', 'TZS 25,000 on YES · Simba SC derby'],
          ['var(--gold-400)', 'var(--gold-soft)', Icon.trophy, 'You won TZS 39,062', 'Paid to your wallet · Imelipwa'],
          ['var(--accent-400)', 'var(--accent-soft)', Icon.info, 'Market resolves in 1 hour', 'Bitcoin > $90k · last call to predict']].map(([c, soft, G, t, s], i) => (
          <div key={i} style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '13px 14px', overflow: 'hidden' }}>
            <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: soft, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><G s={18} sw={2.2} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 1 }}>{s}</div></div>
            <span style={{ color: 'var(--text-subtle)', cursor: 'pointer' }}><Icon.x s={15} /></span>
            <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: '100%', background: c, opacity: 0.5 }} />
          </div>
        ))}
      </div>
    </Screen>
  );
}

/* ---------- card hover comparison: gold vs blue ---------- */
function HoverCompare() {
  return (
    <Screen>
      <Hd sub="Same card, frame-on-hover shown live. Which reads better for the brand — true gold, or blue? Hover either; the left pair is pinned to the hovered state so you can compare at rest.">Card hover frame · gold vs blue</Hd>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        {[['blue', 'Blue frame', 'Brand-blue border + blue glow. Ties the hover to the canvas; calm, modern, cohesive.'],
          ['gold', 'Gold frame', 'True-gold border + gold glow. Premium, high-energy; borrows the win/payout colour.']].map(([tone, name, desc]) => (
          <div key={tone}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: tone === 'gold' ? 'var(--gold-400)' : 'var(--brand-400)', marginBottom: 12 }}>{name}</div>
            <div style={{ marginBottom: 12 }}><MarketCard m={MK[2]} hoverTone={tone} forceHover /></div>
            <MarketCard m={MK[0]} hoverTone={tone} />
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 12 }}>{desc} <span style={{ color: 'var(--text-subtle)' }}>(top = pinned hover, bottom = hover me)</span></div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

Object.assign(window, { MarketCard, PickASide, ButtonShowcase, BuyTray, PositionsLeaderboard, ResolutionPanel, WinLoss, HoverCompare, Screen, Hd, Lbl, MK });
