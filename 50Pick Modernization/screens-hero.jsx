// screens-hero.jsx — Direction A hero screens for sign-off
// Landing hero · Market detail + bet modal · Win celebration
// Relies on glass-kit.jsx (loaded first).

const { useState: useS, useEffect: useE, useRef: useR } = React;

/* ---------- shared chrome ---------- */
function TopNav({ active = 'Markets' }) {
  const links = ['Markets', 'Live', 'Leaderboard', 'Wallet'];
  const [lang, setLang] = useS('EN');
  return (
    <div className="glass" style={{
      borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
      padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 22,
      position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 6px 24px oklch(8% 0.04 268 / 0.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FiftyMark size={28} /><Wordmark /></div>
      <div style={{ display: 'flex', gap: 4, marginLeft: 14 }}>
        {links.map((l) => (
          <span key={l} style={{ padding: '8px 13px', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: active === l ? 600 : 500,
            color: active === l ? 'var(--text)' : 'var(--text-subtle)', cursor: 'pointer',
            background: active === l ? 'oklch(50% 0.08 268 / 0.18)' : 'transparent' }}>{l}</span>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 'var(--r-pill)', boxShadow: 'none' }}>
        <Glyph.search size={16} style={{ color: 'var(--text-subtle)' }} />
        <span style={{ fontSize: 13.5, color: 'var(--text-subtle)' }}>Search markets…</span>
      </div>
      <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'oklch(30% 0.05 268 / 0.4)', border: '1px solid var(--glass-border)' }}>
        {['EN', 'SW', 'FR'].map((x) => (
          <span key={x} onClick={() => setLang(x)} style={{ padding: '4px 9px', borderRadius: 'var(--r-pill)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            color: lang === x ? 'oklch(20% 0.05 268)' : 'var(--text-subtle)',
            background: lang === x ? 'var(--gold-400)' : 'transparent' }}>{x}</span>
        ))}
      </div>
      <span style={{ color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
        <Glyph.bell size={20} />
        <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: 9, background: 'var(--no-400)', boxShadow: '0 0 6px var(--no-400)' }} />
      </span>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, var(--royal-500), var(--royal-700))',
        border: '1.5px solid var(--gold-400)', boxShadow: 'var(--glow-gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--gold-300)' }}>JK</div>
    </div>
  );
}

function LiveTicker() {
  const items = [
    'TZS 25,000 just predicted YES on Simba SC derby',
    'TZS 10,000 just predicted NO on TZS/USD < 2,700',
    'TZS 50,000 just predicted YES on Bitcoin > $90k',
    'TZS 5,000 just predicted YES on Dar es Salaam heat',
  ];
  const [i, setI] = useS(0);
  useE(() => { const t = setInterval(() => setI((x) => (x + 1) % items.length), 2800); return () => clearInterval(t); }, []);
  return (
    <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px',
      borderBottom: '1px solid var(--glass-border)', background: 'oklch(13% 0.04 268 / 0.5)', overflow: 'hidden' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--no-300)', textTransform: 'uppercase' }}>
        <LiveDot /> Live
      </span>
      <div style={{ position: 'relative', flex: 1, height: 18, overflow: 'hidden' }}>
        <div key={i} className="mono" style={{ position: 'absolute', fontSize: 12.5, color: 'var(--text-muted)', animation: 'floatUp 2.8s ease-in-out' }}>{items[i]}</div>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 1 — Landing hero
   ============================================================ */
function LandingHero() {
  const [pick, setPick] = useS(null);
  const trend = [38, 42, 40, 47, 45, 52, 49, 58, 55, 61, 60, 64];
  return (
    <div className="glass-screen" style={{ width: 1280, minHeight: 860 }}>
      <TopNav active="Markets" />
      <LiveTicker />
      <div style={{ padding: '64px 56px 48px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Chip kind="resolved" icon={<Glyph.shieldcheck size={13} />}>Provably resolved</Chip>
            <Chip kind="cat" icon={<Glyph.globe size={13} />}>Licensed in Tanzania</Chip>
          </div>
          <h1 className="disp" style={{ fontSize: 60, lineHeight: 1.04, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
            Predict events.<br /><span style={{ background: 'linear-gradient(100deg, var(--gold-300), var(--gold-600))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Not chance.</span>
          </h1>
          <p style={{ fontSize: 17, fontStyle: 'italic', color: 'var(--text-subtle)', margin: '18px 0 0', maxWidth: 460, lineHeight: 1.5 }}>
            Tabiri matukio halisi. Weka dau, shiriki mfuko — ukiwa sahihi, unalipwa.
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', margin: '14px 0 32px', maxWidth: 470, lineHeight: 1.6 }}>
            Stake TZS on real-world outcomes and share the pool if you're right. Football, forex, crypto and weather — settled transparently.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            <GlassButton variant="gold" size="xl" leading={<Glyph.bolt size={18} />}>Try the demo</GlassButton>
            <GlassButton variant="ghost" size="xl" trailing={<Glyph.markets size={18} />}>Browse markets</GlassButton>
          </div>
          <div style={{ display: 'flex', gap: 36, marginTop: 40 }}>
            {[['TZS 1.2B', 'Predicted this month'], ['38,400', 'Active predictors'], ['9%', 'House margin, fixed']].map(([a, b]) => (
              <div key={b}>
                <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{a}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginTop: 2 }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
        {/* featured market preview */}
        <div className="glass" style={{ padding: 24, boxShadow: 'var(--glow-gold-soft), var(--shadow-lift)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Chip kind="live">Featured · Live</Chip>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}><Glyph.clock size={13} />2d 4h left</span>
          </div>
          <div className="disp" style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.3 }}>Will Simba SC win the Kariakoo derby?</div>
          <div style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--text-subtle)', margin: '4px 0 18px' }}>Je, Simba SC watashinda dabi ya Kariakoo?</div>
          <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'oklch(14% 0.04 268 / 0.5)', border: '1px solid var(--glass-border)', padding: '14px 8px 6px' }}>
            <ProbabilityChart data={trend} w={520} h={150} id="hero" color="var(--yes-400)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 0 8px', fontSize: 13 }}>
            <span className="mono" style={{ color: 'var(--yes-300)', fontWeight: 600 }}>YES 64%</span>
            <span className="mono" style={{ color: 'var(--no-300)', fontWeight: 600 }}>NO 36%</span>
          </div>
          <ProbabilityBar yes={64} size="large" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            <GlassButton variant="yes" size="lg" onClick={() => setPick('yes')}>YES · 0.64</GlassButton>
            <GlassButton variant="no" size="lg" onClick={() => setPick('no')}>NO · 0.36</GlassButton>
          </div>
          <div className="mono" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 12 }}>
            TZS 48.2M pool · 1,284 predictors
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 2 — Market detail + bet confirmation modal (open)
   ============================================================ */
function BetModal({ side = 'yes', stake = 25000, onClose }) {
  const [shown, setShown] = useS(false);
  useE(() => { const t = setTimeout(() => setShown(true), 30); return () => clearTimeout(t); }, []);
  const yes = side === 'yes';
  const price = yes ? 0.64 : 0.36;
  const payout = Math.round(stake / price);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: shown ? 'oklch(8% 0.03 268 / 0.55)' : 'oklch(8% 0.03 268 / 0)',
      WebkitBackdropFilter: `blur(${shown ? 16 : 0}px)`, backdropFilter: `blur(${shown ? 16 : 0}px)`,
      transition: 'background var(--dur-enter) var(--ease-smooth), backdrop-filter var(--dur-enter) var(--ease-smooth)' }}>
      <div className="glass" style={{ width: 440, padding: 28, background: 'var(--glass-bg-strong)',
        boxShadow: 'var(--shadow-modal)', transformOrigin: 'center',
        transform: shown ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(8px)', opacity: shown ? 1 : 0,
        transition: 'transform var(--dur-enter) var(--ease-spring), opacity var(--dur-enter) var(--ease-smooth)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 6 }}>Confirm prediction</div>
            <Chip kind={yes ? 'yes' : 'no'} glow>{yes ? 'YES' : 'NO'} · {price.toFixed(2)}</Chip>
          </div>
          <span onClick={onClose} style={{ color: 'var(--text-subtle)', cursor: 'pointer' }}><Glyph.x size={20} /></span>
        </div>
        <div className="disp" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>Will Simba SC win the Kariakoo derby?</div>
        <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-subtle)', marginBottom: 20 }}>Je, Simba SC watashinda dabi ya Kariakoo?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
          {[['Your stake', `TZS ${stake.toLocaleString()}`, 'var(--text)'],
            ['Share of pool', '0.41%', 'var(--text-muted)'],
            ['If correct, you receive', `TZS ${payout.toLocaleString()}`, 'var(--gold-300)']].map(([l, v, c], idx) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: idx === 2 ? 14 : 13, color: 'var(--text-subtle)', fontWeight: idx === 2 ? 600 : 400 }}>{l}</span>
              <span className="mono" style={{ fontSize: idx === 2 ? 19 : 14, fontWeight: 600, color: c }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <GlassButton variant="gold" size="xl" full leading={<Glyph.check size={18} />}>Confirm · TZS {stake.toLocaleString()}</GlassButton>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
          Pool-share payout. Outcome may differ from current odds.<br /><span style={{ fontStyle: 'italic' }}>Malipo ya mfuko. Matokeo yanaweza kutofautiana.</span>
        </p>
      </div>
    </div>
  );
}

function MarketDetail() {
  const trend = [50, 48, 52, 49, 55, 53, 58, 56, 60, 59, 62, 64];
  return (
    <div className="glass-screen" style={{ width: 1280, minHeight: 900, position: 'relative' }}>
      <TopNav active="Markets" />
      <div style={{ padding: '28px 56px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-subtle)', marginBottom: 22 }}>
          <span style={{ cursor: 'pointer' }}>Markets</span><Glyph.chevdown size={14} style={{ transform: 'rotate(-90deg)' }} /><span style={{ color: 'var(--text-muted)' }}>Football</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 372px', gap: 36, alignItems: 'start' }}>
          {/* left — chart + info */}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Chip kind="live">Live</Chip><Chip kind="cat" icon={<Glyph.football size={13} />}>Football</Chip><Chip kind="hot" icon={<Glyph.flame size={13} />}>Hot</Chip>
            </div>
            <h1 className="disp" style={{ fontSize: 33, fontWeight: 700, lineHeight: 1.18, margin: 0, letterSpacing: '-0.02em' }}>Will Simba SC win the Kariakoo derby?</h1>
            <div style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--text-subtle)', margin: '8px 0 24px' }}>Je, Simba SC watashinda dabi ya Kariakoo?</div>
            <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                <div>
                  <div className="mono" style={{ fontSize: 40, fontWeight: 600, color: 'var(--yes-300)', lineHeight: 1 }}>64%</div>
                  <div style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 6 }}>YES probability</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['1H', '1D', '1W', 'ALL'].map((t, i) => (
                    <span key={t} style={{ padding: '5px 11px', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      color: i === 2 ? 'var(--text)' : 'var(--text-subtle)', background: i === 2 ? 'oklch(50% 0.08 268 / 0.25)' : 'transparent',
                      border: '1px solid ' + (i === 2 ? 'var(--glass-border-strong)' : 'transparent') }}>{t}</span>
                  ))}
                </div>
              </div>
              <ProbabilityChart data={trend} w={680} h={210} id="detail" color="var(--yes-400)" />
              <div style={{ marginTop: 18 }}><ProbabilityBar yes={64} size="large" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[['TZS 48.2M', 'Total pool', Glyph.cash], ['1,284', 'Predictors', Glyph.profile], ['2d 4h', 'Resolves in', Glyph.clock]].map(([a, b, G]) => (
                <div key={b} className="glass" style={{ padding: '16px 18px', boxShadow: 'var(--shadow-rest)' }}>
                  <span style={{ color: 'var(--text-subtle)' }}><G size={17} /></span>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>{a}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
          {/* right — buy tray */}
          <div className="glass" style={{ padding: 22, position: 'sticky', top: 84 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 14 }}>Place a prediction</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 5, borderRadius: 'var(--r-md)', background: 'oklch(14% 0.04 268 / 0.6)', border: '1px solid var(--glass-border)', marginBottom: 18 }}>
              <div style={{ padding: '11px 0', textAlign: 'center', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: 14,
                background: 'var(--btn-yes-glass)', color: 'var(--yes-300)', border: '1px solid oklch(72% 0.14 152 / 0.45)', boxShadow: 'var(--glow-yes-soft)' }}>YES · 0.64</div>
              <div style={{ padding: '11px 0', textAlign: 'center', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: 14, color: 'var(--text-subtle)' }}>NO · 0.36</div>
            </div>
            <div className="glass" style={{ padding: '14px 16px', boxShadow: 'none', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: 15, color: 'var(--text-subtle)' }}>TZS</span>
              <span className="mono" style={{ fontSize: 26, fontWeight: 600, flex: 1 }}>25,000</span>
            </div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
              {['1k', '5k', '10k', '25k', '50k'].map((c, i) => (
                <span key={c} className="mono" style={{ padding: '6px 12px', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  color: i === 3 ? 'oklch(20% 0.05 268)' : 'var(--text-muted)', background: i === 3 ? 'var(--gold-400)' : 'oklch(30% 0.05 268 / 0.4)',
                  border: '1px solid var(--glass-border)' }}>{c}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 0', borderTop: '1px solid var(--glass-border)', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--text-subtle)' }}>Share of pool</span><span className="mono" style={{ fontWeight: 600 }}>0.41%</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 13.5, color: 'var(--text-subtle)' }}>If correct, you receive</span><span className="mono" style={{ fontSize: 19, fontWeight: 600, color: 'var(--gold-300)' }}>TZS 39,062</span></div>
            </div>
            <GlassButton variant="gold" size="xl" full>Confirm · TZS 39,062</GlassButton>
            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>Pool-share payout. Outcome may differ from current odds.</p>
          </div>
        </div>
      </div>
      <BetModal side="yes" stake={25000} onClose={() => {}} />
    </div>
  );
}

/* ============================================================
   SCREEN 3 — Win celebration (signature moment)
   ============================================================ */
function ParticleBurst({ n = 22, go }) {
  const parts = useR([...Array(n)].map((_, i) => {
    const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 120 + Math.random() * 130;
    return { tx: Math.cos(ang) * dist, ty: Math.sin(ang) * dist, sz: 4 + Math.random() * 6, dur: 900 + Math.random() * 500, delay: Math.random() * 120, ts: 0.2 + Math.random() * 0.5 };
  })).current;
  if (!go) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {parts.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: '50%', top: '42%', width: p.sz, height: p.sz, borderRadius: 999,
          background: i % 3 === 0 ? 'var(--gold-300)' : 'var(--gold-400)',
          boxShadow: '0 0 10px var(--gold-400), 0 0 4px var(--gold-300)',
          '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, '--ts': p.ts,
          animation: `burst ${p.dur}ms var(--ease-decel) ${p.delay}ms forwards`,
        }} />
      ))}
    </div>
  );
}

function WinCelebration() {
  const [go, setGo] = useS(false);
  const replay = () => { setGo(false); requestAnimationFrame(() => setGo(true)); };
  useE(() => { const t = setTimeout(() => setGo(true), 250); return () => clearTimeout(t); }, []);
  return (
    <div className="glass-screen" style={{ width: 920, height: 640, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* dimmed market behind */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.25, filter: 'blur(2px)', padding: 28 }}>
        <div className="glass" style={{ padding: 18 }}><div className="disp" style={{ fontSize: 17 }}>Will Simba SC win the Kariakoo derby?</div><div style={{ height: 12 }} /><ProbabilityBar yes={64} reveal={false} /></div>
      </div>
      {/* frosted overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'oklch(8% 0.03 268 / 0.5)', WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)' }} />
      {/* gold bloom that the glass catches */}
      <div style={{ position: 'absolute', left: '50%', top: '42%', width: 360, height: 360,
        background: 'radial-gradient(circle, oklch(85% 0.14 82 / 0.45) 0%, transparent 70%)',
        animation: go ? 'bloomPulse 1200ms var(--ease-decel) forwards' : 'none', pointerEvents: 'none' }} />
      <ParticleBurst go={go} />
      {/* modal */}
      <div className="glass" key={go ? 'a' : 'b'} style={{ position: 'relative', width: 400, padding: '36px 32px 28px', textAlign: 'center',
        background: 'var(--glass-bg-strong)', borderColor: 'oklch(84% 0.12 82 / 0.5)',
        boxShadow: 'var(--glow-gold-bloom), var(--shadow-modal)',
        transform: go ? 'scale(1)' : 'scale(0.9)', opacity: go ? 1 : 0,
        transition: 'transform var(--dur-enter) var(--ease-spring), opacity var(--dur-enter) var(--ease-smooth)' }}>
        {/* check disc */}
        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 22px' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 72, height: 72, borderRadius: 999, border: '2px solid var(--gold-400)',
            animation: go ? 'ringExpand 1000ms var(--ease-decel) 200ms forwards' : 'none' }} />
          <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--btn-gold-glass)', border: '1px solid oklch(92% 0.08 84 / 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-gold-soft), inset 0 1px 0 oklch(98% 0.04 80 / 0.5)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="oklch(22% 0.06 80)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: go ? 0 : 1, transition: 'stroke-dashoffset 420ms var(--ease-decel) 350ms' }} />
            </svg>
          </div>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 10 }}>Resolved · YES</div>
        <div className="disp" style={{ fontSize: 28, fontWeight: 700, marginBottom: 14 }}>You were right</div>
        <div className="mono" style={{ fontSize: 44, fontWeight: 600, color: 'var(--gold-300)', lineHeight: 1, textShadow: '0 0 30px oklch(85% 0.14 82 / 0.5)' }}>
          +TZS {go ? <RollingCounter value={39062} /> : '0'}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '14px 0 26px' }}>Imelipwa · Paid to your wallet</div>
        <GlassButton variant="gold" size="xl" full onClick={replay}>Continue</GlassButton>
      </div>
      {/* replay affordance for the canvas */}
      <button onClick={replay} title="Replay animation" style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 5,
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer',
        background: 'oklch(30% 0.05 268 / 0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', font: '600 12px var(--font-body)',
        WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}>
        <Glyph.bolt size={13} /> Replay
      </button>
    </div>
  );
}

Object.assign(window, { TopNav, LiveTicker, LandingHero, MarketDetail, BetModal, WinCelebration, ParticleBurst });
