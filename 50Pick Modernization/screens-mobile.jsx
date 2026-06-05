// screens-mobile.jsx — 393px mobile variants in Android frames
// Mobile: Landing (1) · Market grid (2) · Win celebration (4)
// Relies on glass-kit.jsx + screens-hero.jsx (ParticleBurst) + android-frame.jsx.

const { useState: mS, useEffect: mE } = React;

function MobileTopBar({ search }) {
  return (
    <div className="glass" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--glass-border)',
      padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20 }}>
      <FiftyMark size={26} /><Wordmark size={17} />
      <div style={{ flex: 1 }} />
      {search && <div className="glass" style={{ width: 36, height: 36, borderRadius: 'var(--r-pill)', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)' }}><Glyph.search size={17} /></div>}
      <div style={{ position: 'relative', color: 'var(--text-muted)' }}><Glyph.bell size={20} /><span style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, borderRadius: 9, background: 'var(--no-400)', boxShadow: '0 0 6px var(--no-400)' }} /></div>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, var(--royal-500), var(--royal-700))', border: '1.5px solid var(--gold-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--gold-300)' }}>JK</div>
    </div>
  );
}
function MobileNav({ active = 'Markets' }) {
  const items = [['Markets', Glyph.markets], ['Live', Glyph.bolt], ['Wallet', Glyph.wallet], ['Ranks', Glyph.trophy], ['Profile', Glyph.profile]];
  return (
    <div className="glass" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--glass-border)',
      position: 'sticky', bottom: 0, zIndex: 20, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', padding: '8px 6px 10px' }}>
      {items.map(([l, G]) => {
        const on = l === active;
        return (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: on ? 'var(--gold-300)' : 'var(--text-subtle)' }}>
            <G size={21} style={on ? { filter: 'drop-shadow(0 0 8px oklch(85% 0.13 82 / 0.5))' } : null} />
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{l}</span>
          </div>
        );
      })}
    </div>
  );
}
const Phone = ({ children }) => (
  <AndroidDevice width={409} height={864} dark>
    <div className="glass-screen" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>{children}</div>
  </AndroidDevice>
);

/* ---- Mobile 1 · Landing ---- */
function MobileLanding() {
  const trend = [38, 44, 41, 48, 46, 53, 50, 58, 56, 64];
  return (
    <Phone>
      <MobileTopBar search />
      <div style={{ flex: 1, padding: '20px 16px 24px' }}>
        <Chip kind="resolved" icon={<Glyph.shieldcheck size={12} />}>Provably resolved</Chip>
        <h1 className="disp" style={{ fontSize: 34, lineHeight: 1.06, fontWeight: 700, margin: '16px 0 0', letterSpacing: '-0.03em' }}>
          Predict events.<br /><span style={{ background: 'linear-gradient(100deg, var(--gold-300), var(--gold-600))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Not chance.</span>
        </h1>
        <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-subtle)', margin: '12px 0 0', lineHeight: 1.5 }}>Tabiri matukio halisi. Weka dau, shiriki mfuko — ukiwa sahihi, unalipwa.</p>
        <div style={{ display: 'flex', gap: 10, margin: '20px 0 26px' }}>
          <GlassButton variant="gold" size="lg" full leading={<Glyph.bolt size={17} />}>Try the demo</GlassButton>
        </div>
        <div className="glass" style={{ padding: 18, boxShadow: 'var(--glow-gold-soft), var(--shadow-lift)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Chip kind="live">Featured</Chip><span className="mono" style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>2d 4h</span>
          </div>
          <div className="disp" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>Will Simba SC win the Kariakoo derby?</div>
          <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--text-subtle)', margin: '4px 0 14px' }}>Je, Simba SC watashinda dabi?</div>
          <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'oklch(14% 0.04 268 / 0.5)', border: '1px solid var(--glass-border)', padding: '10px 4px 2px', marginBottom: 14 }}>
            <ProbabilityChart data={trend} w={330} h={90} id="mhero" color="var(--yes-400)" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 12 }}><span className="mono" style={{ color: 'var(--yes-300)', fontWeight: 600 }}>YES 64%</span><span className="mono" style={{ color: 'var(--no-300)', fontWeight: 600 }}>NO 36%</span></div>
          <ProbabilityBar yes={64} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            <GlassButton variant="yes" full>YES · 0.64</GlassButton><GlassButton variant="no" full>NO · 0.36</GlassButton>
          </div>
        </div>
      </div>
      <MobileNav active="Markets" />
    </Phone>
  );
}

/* ---- Mobile 2 · Market grid ---- */
function MobileGrid() {
  const chips = ['All', 'Football', 'Crypto', 'Forex', 'Weather'];
  const [sel, setSel] = mS('All');
  return (
    <Phone>
      <MobileTopBar search />
      <div style={{ flex: 1, padding: '16px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 className="disp" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Markets</h1>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 'var(--r-pill)', boxShadow: 'none', fontSize: 12.5, color: 'var(--text-muted)' }}><Glyph.filter size={14} /> Filters</div>
        </div>
        <div style={{ display: 'flex', gap: 7, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
          {chips.map((c) => (
            <span key={c} onClick={() => setSel(c)} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              color: sel === c ? 'oklch(20% 0.05 268)' : 'var(--text-muted)', background: sel === c ? 'var(--gold-400)' : 'oklch(30% 0.05 268 / 0.4)', border: '1px solid var(--glass-border)' }}>{c}</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MARKETS.slice(0, 3).map((m) => <MarketCard key={m.id} m={m} wide />)}
        </div>
      </div>
      <MobileNav active="Markets" />
    </Phone>
  );
}

/* ---- Mobile 4 · Win celebration ---- */
function MobileWin() {
  const [go, setGo] = mS(false);
  const replay = () => { setGo(false); requestAnimationFrame(() => setTimeout(() => setGo(true), 20)); };
  mE(() => { const t = setTimeout(() => setGo(true), 300); return () => clearTimeout(t); }, []);
  return (
    <Phone>
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'oklch(8% 0.03 268 / 0.5)', WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)' }} />
        <div style={{ position: 'absolute', left: '50%', top: '44%', width: 300, height: 300, background: 'radial-gradient(circle, oklch(85% 0.14 82 / 0.45) 0%, transparent 70%)', animation: go ? 'bloomPulse 1200ms var(--ease-decel) forwards' : 'none', pointerEvents: 'none' }} />
        <ParticleBurst go={go} n={18} />
        <div className="glass" key={go ? 'a' : 'b'} style={{ position: 'relative', width: 320, padding: '32px 26px 24px', textAlign: 'center', margin: '0 16px',
          background: 'var(--glass-bg-strong)', borderColor: 'oklch(84% 0.12 82 / 0.5)', boxShadow: 'var(--glow-gold-bloom), var(--shadow-modal)',
          transform: go ? 'scale(1)' : 'scale(0.9)', opacity: go ? 1 : 0, transition: 'transform var(--dur-enter) var(--ease-spring), opacity var(--dur-enter) var(--ease-smooth)' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: 'var(--r-pill)', background: 'var(--btn-gold-glass)', border: '1px solid oklch(92% 0.08 84 / 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-gold-soft), inset 0 1px 0 oklch(98% 0.04 80 / 0.5)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="oklch(22% 0.06 80)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: go ? 0 : 1, transition: 'stroke-dashoffset 420ms var(--ease-decel) 350ms' }} /></svg>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 8 }}>Resolved · YES</div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>You were right</div>
          <div className="mono" style={{ fontSize: 38, fontWeight: 600, color: 'var(--gold-300)', lineHeight: 1, textShadow: '0 0 28px oklch(85% 0.14 82 / 0.5)' }}>+TZS {go ? <RollingCounter value={39062} /> : '0'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 22px' }}>Imelipwa · Paid to your wallet</div>
          <GlassButton variant="gold" size="lg" full onClick={replay}>Continue</GlassButton>
        </div>
        <button onClick={replay} title="Replay" style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 5, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 'var(--r-pill)', cursor: 'pointer', background: 'oklch(30% 0.05 268 / 0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', font: '600 11px var(--font-body)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}><Glyph.bolt size={12} /> Replay</button>
      </div>
    </Phone>
  );
}

Object.assign(window, { MobileTopBar, MobileNav, MobileLanding, MobileGrid, MobileWin });
