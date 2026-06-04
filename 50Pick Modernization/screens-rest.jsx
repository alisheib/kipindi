// screens-rest.jsx — Market grid · Loss modal · Wallet · Leaderboard
// Relies on glass-kit.jsx + screens-hero.jsx (TopNav) loaded first.

const { useState: uS, useEffect: uE } = React;

/* small shared bits */
function Avatar({ initials, tier = 'silver', size = 38 }) {
  const ring = { bronze: 'oklch(62% 0.10 60)', silver: 'oklch(72% 0.02 268)', gold: 'var(--gold-400)', diamond: 'var(--aqua-300)' }[tier];
  return (
    <div style={{ width: size, height: size, borderRadius: 'var(--r-pill)', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--royal-500), var(--royal-800))',
      border: `1.5px solid ${ring}`, boxShadow: tier === 'gold' ? 'var(--glow-gold-soft)' : tier === 'diamond' ? '0 0 14px oklch(78% 0.10 195 / 0.3)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.36, color: 'var(--text)' }}>{initials}</div>
  );
}
function TierBadge({ tier }) {
  const c = { bronze: 'oklch(62% 0.10 60)', silver: 'oklch(78% 0.02 268)', gold: 'var(--gold-300)', diamond: 'var(--aqua-300)' }[tier];
  return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c }}>{tier}</span>;
}
function GlassCheck({ on }) {
  return (
    <span style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--btn-gold-glass)' : 'oklch(30% 0.05 268 / 0.4)', border: `1px solid ${on ? 'oklch(90% 0.08 84 / 0.6)' : 'var(--glass-border)'}`,
      boxShadow: on ? 'var(--glow-gold-soft)' : 'none' }}>
      {on && <Glyph.check size={13} style={{ color: 'oklch(22% 0.06 80)' }} sw={3} />}
    </span>
  );
}

/* ============================================================
   SCREEN 4 — Market grid + filter sidebar
   ============================================================ */
function MarketGrid() {
  const cats = [['football', 'Football', 18], ['forex', 'Forex', 9], ['crypto', 'Crypto', 14], ['weather', 'Weather', 6], ['economy', 'Economy', 7], ['tech', 'Tech', 4]];
  const [on, setOn] = uS({ football: true, crypto: true });
  const [status, setStatus] = uS('live');
  return (
    <div className="glass-screen" style={{ width: 1280, minHeight: 940 }}>
      <TopNav active="Markets" />
      <LiveTicker />
      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 28, padding: '28px 40px 48px', alignItems: 'start' }}>
        {/* filter sidebar */}
        <div className="glass" style={{ padding: 20, position: 'sticky', top: 84 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Glyph.filter size={17} style={{ color: 'var(--gold-400)' }} />
            <span className="disp" style={{ fontSize: 16, fontWeight: 600 }}>Filters</span>
          </div>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', borderRadius: 'var(--r-md)', boxShadow: 'none', marginBottom: 20 }}>
            <Glyph.search size={15} style={{ color: 'var(--text-subtle)' }} /><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Search…</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 12 }}>Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 22 }}>
            {cats.map(([k, label, n]) => {
              const G = Glyph[k];
              return (
                <div key={k} onClick={() => setOn((o) => ({ ...o, [k]: !o[k] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                    background: on[k] ? 'oklch(40% 0.07 268 / 0.18)' : 'transparent' }}>
                  <GlassCheck on={on[k]} />
                  <G size={15} style={{ color: on[k] ? 'var(--gold-400)' : 'var(--text-subtle)' }} />
                  <span style={{ fontSize: 13.5, flex: 1, color: on[k] ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{n}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 12 }}>Status</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
            {['live', 'soon', 'resolved'].map((s) => (
              <span key={s} onClick={() => setStatus(s)} style={{ padding: '6px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                color: status === s ? 'var(--text)' : 'var(--text-subtle)', background: status === s ? 'oklch(50% 0.08 268 / 0.25)' : 'oklch(30% 0.05 268 / 0.3)',
                border: '1px solid ' + (status === s ? 'var(--glass-border-strong)' : 'var(--glass-border)') }}>{s}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 12 }}>Min pool (TZS)</div>
          <input type="range" defaultValue="35" style={{ width: '100%', accentColor: 'var(--gold-500)' }} />
          <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}><span>0</span><span>100M+</span></div>
        </div>
        {/* grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 className="disp" style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>All markets</h1>
              <div className="mono" style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 3 }}>58 live · soko 58 hai</div>
            </div>
            <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 'var(--r-md)', boxShadow: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sort: <b style={{ color: 'var(--text)' }}>Volume</b></span><Glyph.chevdown size={15} style={{ color: 'var(--text-subtle)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {MARKETS.map((m) => <MarketCard key={m.id} m={m} wide />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 5 — Loss modal (gentle, no harsh red)
   ============================================================ */
function LossModal() {
  const [go, setGo] = uS(false);
  const replay = () => { setGo(false); requestAnimationFrame(() => setTimeout(() => setGo(true), 20)); };
  uE(() => { const t = setTimeout(() => setGo(true), 250); return () => clearTimeout(t); }, []);
  return (
    <div className="glass-screen" style={{ width: 920, height: 640, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.22, filter: 'blur(2px)', padding: 28 }}>
        <div className="glass" style={{ padding: 18 }}><div className="disp" style={{ fontSize: 17 }}>Will TZS/USD stay below 2,700?</div><div style={{ height: 12 }} /><ProbabilityBar yes={41} reveal={false} /></div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'oklch(8% 0.03 268 / 0.5)', WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)' }} />
      <div className="glass" key={go ? 'a' : 'b'} style={{ position: 'relative', width: 400, padding: '36px 32px 28px', textAlign: 'center', background: 'var(--glass-bg-strong)',
        borderColor: go ? 'var(--glass-border)' : 'oklch(70% 0.16 22 / 0.5)', boxShadow: 'var(--shadow-modal)',
        transform: go ? 'translateY(0)' : 'translateY(10px)', opacity: go ? 1 : 0,
        transition: 'transform var(--dur-enter) var(--ease-smooth), opacity var(--dur-enter) var(--ease-smooth), border-color 900ms var(--ease-smooth)' }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 22px', borderRadius: 'var(--r-pill)',
          background: 'oklch(40% 0.10 22 / 0.18)', border: '1px solid oklch(68% 0.16 22 / 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Glyph.arrowdown size={28} style={{ color: 'var(--no-300)' }} />
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--no-300)', marginBottom: 10 }}>Resolved · NO</div>
        <div className="disp" style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Not this time</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 22, fontStyle: 'italic' }}>Si safari hii — karibu tena.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '16px 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Your prediction</span><Chip kind="yes">YES</Chip></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Stake</span><span className="mono" style={{ fontWeight: 600 }}>TZS 25,000</span></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <GlassButton variant="ghost" onClick={replay}>View resolution</GlassButton>
          <GlassButton variant="ghost" style={{ borderColor: 'var(--glass-border-strong)' }} onClick={replay}>Browse markets</GlassButton>
        </div>
      </div>
      <button onClick={replay} title="Replay" style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 5, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer', background: 'oklch(30% 0.05 268 / 0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', font: '600 12px var(--font-body)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}><Glyph.bolt size={13} /> Replay</button>
    </div>
  );
}

/* ============================================================
   SCREEN 6 — Wallet (balance + transaction history)
   ============================================================ */
const TXNS = [
  ['payout', 'Payout · Bitcoin > $90k', 'Malipo', '+TZS 41,200', 'var(--gold-300)', 'Today · 14:22', Glyph.trophy],
  ['stake', 'Stake · Simba SC derby', 'Dau', '−TZS 25,000', 'var(--no-300)', 'Today · 09:10', Glyph.markets],
  ['deposit', 'Deposit · M-Pesa', 'Amana', '+TZS 100,000', 'var(--yes-300)', 'Yesterday · 18:40', Glyph.arrowdown],
  ['payout', 'Payout · Dar es Salaam heat', 'Malipo', '+TZS 13,700', 'var(--gold-300)', '2 Jun · 21:05', Glyph.trophy],
  ['stake', 'Stake · TZS/USD < 2,700', 'Dau', '−TZS 10,000', 'var(--no-300)', '2 Jun · 11:30', Glyph.markets],
  ['withdraw', 'Withdrawal · Airtel Money', 'Utoaji', '−TZS 50,000', 'var(--text-muted)', '1 Jun · 08:15', Glyph.arrowup],
];
function Wallet() {
  const bal = [120, 95, 110, 130, 118, 150, 142, 168, 160, 184];
  return (
    <div className="glass-screen" style={{ width: 1280, minHeight: 900 }}>
      <TopNav active="Wallet" />
      <div style={{ padding: '32px 56px 48px', display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 28, alignItems: 'start' }}>
        {/* balance column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass" style={{ padding: 28, boxShadow: 'var(--glow-gold-soft), var(--shadow-lift)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>Available balance · Salio</div>
            <div className="mono" style={{ fontSize: 46, fontWeight: 600, margin: '10px 0 2px', color: 'var(--text)' }}>
              <span style={{ fontSize: 22, color: 'var(--text-subtle)', marginRight: 6 }}>TZS</span><RollingCounter value={184500} />
            </div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--text-subtle)' }}>TZS 25,000 held in open predictions</div>
            <div style={{ margin: '20px 0', height: 56, borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'oklch(14% 0.04 268 / 0.4)', border: '1px solid var(--glass-border)' }}>
              <ProbabilityChart data={bal} w={420} h={56} id="wallet" color="var(--gold-400)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <GlassButton variant="gold" size="lg" leading={<Glyph.arrowdown size={17} />}>Deposit</GlassButton>
              <GlassButton variant="ghost" size="lg" leading={<Glyph.arrowup size={17} />}>Withdraw</GlassButton>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Net P/L · 30d', '+TZS 58,900', 'var(--gold-300)'], ['Total staked', 'TZS 312,000', 'var(--text)']].map(([l, v, c]) => (
              <div key={l} className="glass" style={{ padding: '18px 18px', boxShadow: 'var(--shadow-rest)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{l}</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 600, marginTop: 6, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* transactions */}
        <div className="glass" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="disp" style={{ fontSize: 18, fontWeight: 600 }}>Transactions · Miamala</span>
            <span style={{ fontSize: 12.5, color: 'var(--gold-400)', cursor: 'pointer' }}>Export</span>
          </div>
          <div>
            {TXNS.map(([k, label, sw, amt, c, date, G], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 0', borderTop: i ? '1px solid var(--glass-border)' : 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'oklch(30% 0.05 268 / 0.4)', border: '1px solid var(--glass-border)', color: c }}><G size={17} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{sw} · {date}</div>
                </div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: c }}>{amt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 7 — Leaderboard
   ============================================================ */
const LEADERS = [
  ['MwanzaPredicts', 'MP', 'diamond', '+187%', '14', 312, 1],
  ['DerbyKing_TZ', 'DK', 'gold', '+142%', '9', 287, 2],
  ['ZanziForex', 'ZF', 'gold', '+118%', '7', 241, 3],
  ['KariakooQueen', 'KQ', 'silver', '+96%', '5', 198, 4],
  ['BongoStats', 'BS', 'silver', '+71%', '4', 176, 5],
  ['SokoSmart', 'SS', 'bronze', '+44%', '3', 152, 6],
  ['PembaPunter', 'PP', 'bronze', '−8%', '0', 141, 7],
];
function Leaderboard() {
  const [period, setPeriod] = uS('Week');
  const top3 = LEADERS.slice(0, 3);
  return (
    <div className="glass-screen" style={{ width: 1280, minHeight: 900 }}>
      <TopNav active="Leaderboard" />
      <div style={{ padding: '32px 56px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Glyph.trophy size={24} style={{ color: 'var(--gold-400)' }} />
              <h1 className="disp" style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Leaderboard</h1>
            </div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 4 }}>Top predictors by ROI · Watabiri bora</div>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--r-pill)', background: 'oklch(30% 0.05 268 / 0.4)', border: '1px solid var(--glass-border)' }}>
            {['Week', 'Month', 'All'].map((p) => (
              <span key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                color: period === p ? 'oklch(20% 0.05 268)' : 'var(--text-subtle)', background: period === p ? 'var(--gold-400)' : 'transparent' }}>{p}</span>
            ))}
          </div>
        </div>
        {/* podium */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 24 }}>
          {top3.map(([name, init, tier, roi, streak, resolved, rank]) => (
            <div key={name} className="glass" style={{ padding: 22, textAlign: 'center',
              boxShadow: rank === 1 ? 'var(--glow-gold-soft), var(--shadow-lift)' : 'var(--shadow-rest)',
              borderColor: rank === 1 ? 'oklch(82% 0.10 82 / 0.5)' : 'var(--glass-border)' }}>
              <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto 12px' }}>
                {rank === 1 && <Glyph.crown size={20} style={{ color: 'var(--gold-300)', position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)' }} />}
                <Avatar initials={init} tier={tier} size={62} />
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: rank === 1 ? 'var(--gold-300)' : 'var(--text-subtle)' }}>#{rank}</div>
              <div className="disp" style={{ fontSize: 17, fontWeight: 600, margin: '4px 0 2px' }}>{name}</div>
              <TierBadge tier={tier} />
              <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: 'var(--gold-300)', marginTop: 12 }}>{roi}</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>ROI · {resolved} resolved</div>
            </div>
          ))}
        </div>
        {/* rows */}
        <div className="glass" style={{ padding: '6px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 110px 90px 90px 110px', gap: 14, padding: '14px 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', borderBottom: '1px solid var(--glass-border)' }}>
            <span>Rank</span><span>Predictor</span><span style={{ textAlign: 'right' }}>ROI</span><span style={{ textAlign: 'right' }}>Streak</span><span style={{ textAlign: 'right' }}>Resolved</span><span style={{ textAlign: 'right' }}>Follow</span>
          </div>
          {LEADERS.map(([name, init, tier, roi, streak, resolved, rank]) => {
            const neg = roi.startsWith('−');
            return (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 110px 90px 90px 110px', gap: 14, padding: '13px 0', alignItems: 'center', borderTop: rank > 1 ? '1px solid oklch(40% 0.05 268 / 0.18)' : 'none' }}>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: rank <= 3 ? 'var(--gold-300)' : 'var(--text-subtle)' }}>{rank}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar initials={init} tier={tier} size={34} />
                  <div><div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div><TierBadge tier={tier} /></div>
                </div>
                <span className="mono" style={{ textAlign: 'right', fontSize: 14.5, fontWeight: 600, color: neg ? 'var(--no-300)' : 'var(--gold-300)' }}>{roi}</span>
                <span className="mono" style={{ textAlign: 'right', fontSize: 13.5, color: 'var(--text-muted)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>{streak !== '0' && <Glyph.flame size={13} style={{ color: 'var(--gold-400)' }} />}{streak}</span>
                <span className="mono" style={{ textAlign: 'right', fontSize: 13.5, color: 'var(--text-muted)' }}>{resolved}</span>
                <div style={{ textAlign: 'right' }}><span style={{ fontSize: 12, color: 'var(--text-tertiary)', border: '1px dashed var(--glass-border)', padding: '5px 10px', borderRadius: 'var(--r-pill)' }}>Follow · soon</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Avatar, TierBadge, GlassCheck, MarketGrid, LossModal, Wallet, Leaderboard });
