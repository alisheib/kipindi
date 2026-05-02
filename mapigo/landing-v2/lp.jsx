/* Kipindi Landing v2 — hi-fi · primitives & full page */

/* ──── ATOMS ──── */

function Logo({ size = 32 }) {
  return (
    <a href="/" className="lpv2-logo" aria-label="Kipindi">
      <span className="lpv2-logo-mark" style={{ width: size, height: size }}/>
      <span>kipindi</span>
    </a>
  );
}

function LangToggle({ active = 'EN' }) {
  return (
    <button className="lpv2-lang" type="button">
      {['EN', 'SW', 'FR'].map((l, i) => (
        <React.Fragment key={l}>
          <span className={l === active ? 'active' : ''}>{l}</span>
          {i < 2 && <span style={{margin:'0 4px',opacity:0.4}}>·</span>}
        </React.Fragment>
      ))}
    </button>
  );
}

function Nav() {
  return (
    <nav className="lpv2-nav">
      <Logo />
      <div className="lpv2-nav-links">
        <a href="#live">Live</a>
        <a href="#mapigo">Mapigo</a>
        <a href="#how">How it works</a>
        <a href="#help">Help</a>
      </div>
      <div className="lpv2-nav-actions">
        <LangToggle active="EN" />
        <a href="/auth/sign-in" className="lpv2-btn lpv2-btn-secondary lpv2-btn-sm">Sign in</a>
        <a href="/auth/demo" className="lpv2-btn lpv2-btn-primary lpv2-btn-sm">Try demo</a>
      </div>
    </nav>
  );
}

/* ──── WAVEFORM ──── */

function Waveform({ stroke = 2.4, animate = true }) {
  const [phase, setPhase] = React.useState(0);
  const reduceMotion = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  React.useEffect(() => {
    if (!animate || reduceMotion) return;
    let raf;
    const tick = () => { setPhase(p => p + 0.012); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, reduceMotion]);

  // deterministic spike profile + flowing motion
  const W = 800, H = 200, mid = H / 2;
  const points = [];
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * W;
    // base wave
    let y = Math.sin(t * 18 + phase * 2) * 12 +
            Math.sin(t * 7 + phase * 3.4) * 18 +
            Math.sin(t * 3.2 + phase) * 26;
    // narrow gold spike around 60%
    const spikeT = t - (0.55 + Math.sin(phase * 0.6) * 0.05);
    const spike = Math.exp(-spikeT * spikeT * 220) * -90;
    y += spike;
    points.push([x, mid + y]);
  }
  const path = points.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `L${p[0]} ${p[1]}`)).join(' ');
  const fillPath = path + ` L${W} ${H} L0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="lpv2-wfs" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="#F4EAC9"/>
          <stop offset="50%"  stopColor="#DEBC54"/>
          <stop offset="100%" stopColor="#B58A21"/>
        </linearGradient>
        <linearGradient id="lpv2-wff" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="rgba(222,188,84,0.40)"/>
          <stop offset="100%" stopColor="rgba(222,188,84,0)"/>
        </linearGradient>
        <filter id="lpv2-glow"><feGaussianBlur stdDeviation="2.5"/></filter>
      </defs>
      <path d={fillPath} fill="url(#lpv2-wff)"/>
      <path d={path} fill="none" stroke="url(#lpv2-wfs)" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" filter="url(#lpv2-glow)" opacity="0.55"/>
      <path d={path} fill="none" stroke="url(#lpv2-wfs)" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

/* ──── HERO ──── */

function Hero() {
  return (
    <section className="lpv2-hero">
      <div className="lpv2-hero-left">
        <div className="lpv2-eyebrow"><span className="lpv2-eyebrow-dot"/>Live pooled betting · Tanzania</div>
        <h1 className="lpv2-h1">
          Bet the <em>window</em>.<br/>
          Share the <span className="gold">pool</span>.
        </h1>
        <div className="lpv2-pair">
          <div className="lpv2-pair-en">No bookmaker on the other side. Stakes pool, winners share by stake share — settled in seconds.</div>
          <div className="lpv2-pair-sw">Hakuna kampuni inakubali. Wachezaji wanagawa bwawa pamoja — kwa sekunde chache.</div>
        </div>
        <div className="lpv2-cta-row">
          <a href="/auth/demo" className="lpv2-btn lpv2-btn-primary large">Try demo · TZS 100,000 →</a>
          <a href="/live" className="lpv2-btn lpv2-btn-secondary large">Browse matches</a>
        </div>
        <div className="lpv2-trust">
          <span className="lpv2-trust-item"><span className="ico">★</span> Tanzania Gaming Board</span>
          <span className="lpv2-trust-item"><span className="ico">✓</span> NIDA verified</span>
          <span className="lpv2-trust-item"><span className="ico">⚑</span> 18+ only</span>
          <span className="lpv2-trust-item"><span className="ico">☎</span> Helpline +255 22 211 5811</span>
        </div>
      </div>
      <div className="lpv2-hero-visual">
        <div className="lpv2-hero-visual-top">
          <div>
            <div className="lpv2-hero-mono lpv2-hero-live"><span className="lpv2-hero-live-dot"/>LIVE · TPL 67'</div>
            <div className="lpv2-hero-match">Simba SC <span style={{opacity:0.4,fontWeight:400}}>vs</span> Yanga SC</div>
            <div className="lpv2-hero-mono" style={{color:'var(--gold)',marginTop:4}}>2 — 1</div>
          </div>
          <div className="lpv2-hero-pool">
            <div className="lpv2-hero-mono">ROUND #4219</div>
            <div className="lpv2-hero-pool-amt">TZS 398,600</div>
            <div className="lpv2-hero-mono" style={{marginTop:2}}>47 players</div>
          </div>
        </div>
        <div className="lpv2-hero-wf"><Waveform stroke={2.4}/></div>
        <div className="lpv2-hero-bottom">
          {[
            ['SPIKE', '184k', '#F87171'],
            ['DRIFT', '92k',  '#DEBC54'],
            ['CALM',  '121k', '#67E8F9'],
          ].map(([n,a,c]) => (
            <div key={n} className="lpv2-hero-call" style={{ '--c': c }}>
              <span className="lpv2-hero-call-name">{n}</span>
              <span className="lpv2-hero-call-amt">TZS {a}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──── HOW IT WORKS ──── */

function IconClock() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}
function IconCoins() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/><path d="M11 9a2 2 0 0 1-2 2"/></svg>;
}
function IconWave() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 4-4"/></svg>;
}

function HowItWorks() {
  const cards = [
    { n:'01', icon:<IconClock/>,  h:'Pick a window',         body:'Bet the 0–15, 15–30, 30–45, 45–60, or full-time. Each window is its own pool.', sw:'Chagua dirisha la dakika.' },
    { n:'02', icon:<IconCoins/>,  h:'Pool pays out',         body:'When the window settles, the winning pool is shared among everyone who picked the right side. Fair, transparent, no opaque odds.', sw:'Bwawa la washindi linagawanywa kwa wote.' },
    { n:'03', icon:<IconWave/>,   h:'Mapigo · live in-play', body:'Read the rhythm of the match. Call SPIKE, DRIFT or CALM. 60 seconds, real cash.', sw:'Soma mapigo ya mechi. Sekunde 60, pesa halisi.' },
  ];
  return (
    <section id="how" className="lpv2-section">
      <div className="lpv2-section-head">
        <h2 className="lpv2-h2">How it works · <em>Inafanyaje</em></h2>
        <a href="/learn" className="lpv2-section-link">Full guide →</a>
      </div>
      <div className="lpv2-how-grid">
        {cards.map(c => (
          <div key={c.n} className="lpv2-how-card">
            <span className="lpv2-how-num">{c.n}</span>
            <span className="lpv2-how-icon">{c.icon}</span>
            <h3 className="lpv2-how-h">{c.h}</h3>
            <p className="lpv2-how-body">{c.body}</p>
            <div className="lpv2-how-pair">{c.h} · <em>{c.sw}</em></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──── LIVE NOW ──── */

function FixtureTile({ league, home, away, homeAbbr, awayAbbr, score, minute, pool, status = 'LIVE' }) {
  return (
    <div className="lpv2-fix">
      <div className="lpv2-fix-head">
        <span className="lpv2-fix-league">{league}</span>
        <span className="lpv2-hero-mono lpv2-hero-live"><span className="lpv2-hero-live-dot"/>{status} {minute}</span>
      </div>
      <div className="lpv2-fix-teams">
        <div className="lpv2-fix-badge">{homeAbbr}</div>
        <span className="lpv2-fix-name">{home}</span>
        <span className="lpv2-fix-score">{score}</span>
        <span className="lpv2-fix-name" style={{textAlign:'right'}}>{away}</span>
        <div className="lpv2-fix-badge">{awayAbbr}</div>
      </div>
      <div className="lpv2-fix-foot">
        <div className="lpv2-fix-pool">
          <span className="lpv2-hero-mono">POOL</span>
          <span className="lpv2-fix-pool-amt">TZS {pool}</span>
        </div>
        <a href="/live" className="lpv2-btn lpv2-btn-primary lpv2-btn-sm">Bet · Weka →</a>
      </div>
    </div>
  );
}

function LiveNow({ scroller = false }) {
  const tiles = [
    { league:'TPL · TZ',     home:'Simba SC',    away:'Yanga SC',    homeAbbr:'SIM', awayAbbr:'YAN', score:'2 — 1', minute:"67'", pool:'398,600' },
    { league:'EPL',          home:'Arsenal',     away:'Liverpool',   homeAbbr:'ARS', awayAbbr:'LIV', score:'1 — 1', minute:"34'", pool:'612,400' },
    { league:'PSL · ZA',     home:'Sundowns',    away:'Pirates',     homeAbbr:'SUN', awayAbbr:'PIR', score:'3 — 0', minute:"78'", pool:'241,900' },
  ];
  return (
    <section id="live" className="lpv2-section">
      <div className="lpv2-section-head">
        <h2 className="lpv2-h2">Live now · <em>Sasa hivi</em></h2>
        <a href="/live" className="lpv2-section-link">All matches →</a>
      </div>
      <div className={scroller ? 'lpv2-fix-scroller' : 'lpv2-fix-grid'}>
        {tiles.map((t,i) => <FixtureTile key={i} {...t}/>)}
      </div>
    </section>
  );
}

/* ──── NUMBERS ──── */

function Numbers() {
  const stats = [
    { n:'TZS 4.2B',  l:'Paid out',                sw:'Imelipwa' },
    { n:'142,890',   l:'Verified players',         sw:'Wachezaji' },
    { n:'< 60s',     l:'Average withdrawal',       sw:'Wastani wa kutoa' },
    { n:'TZ + ZNZ',  l:'Mainland + Zanzibar',      sw:'Bara + Visiwani' },
    { n:'ISO 27001', l:'Audit · Q3 2026',          sw:'Ukaguzi' },
  ];
  return (
    <section className="lpv2-section lpv2-numbers">
      <div className="lpv2-numbers-grid">
        {stats.map(s => (
          <div key={s.l} className="lpv2-stat">
            <div className="lpv2-stat-num">{s.n}</div>
            <div className="lpv2-stat-label">{s.l}</div>
            <div className="lpv2-stat-sw">{s.sw}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──── MAPIGO ──── */

function Mapigo() {
  return (
    <section id="mapigo" className="lpv2-mapigo">
      <div className="lpv2-mapigo-inner">
        <div className="lpv2-mapigo-text">
          <div className="lpv2-eyebrow"><span className="lpv2-eyebrow-dot"/>★ Signature game · Mapigo</div>
          <h2 className="lpv2-mapigo-h">The waveform <em>is</em> the game.</h2>
          <p className="lpv2-mapigo-lede">A 60-second prediction loop, layered onto the match you're watching. Read the gold pulse. Call SPIKE, DRIFT, or CALM. Pool splits by stake share. New round opens. Repeat.</p>
          <div className="lpv2-mapigo-calls">
            <span className="lpv2-mapigo-call" style={{'--c':'#F87171'}}>▲ SPIKE</span>
            <span className="lpv2-mapigo-call" style={{'--c':'#DEBC54'}}>~ DRIFT</span>
            <span className="lpv2-mapigo-call" style={{'--c':'#67E8F9'}}>— CALM</span>
          </div>
          <a href="/mapigo" className="lpv2-btn lpv2-btn-primary large" style={{marginTop:8,width:'fit-content'}}>Play Mapigo · Cheza Mapigo →</a>
        </div>
        <div className="lpv2-mapigo-stage">
          <div className="lpv2-mapigo-stage-head">
            <div>
              <div className="lpv2-hero-mono lpv2-hero-live"><span className="lpv2-hero-live-dot"/>LIVE · ROUND #4219</div>
              <div className="lpv2-hero-match" style={{color:'#fff'}}>Simba SC <span style={{opacity:0.4,fontWeight:400}}>vs</span> Yanga SC</div>
            </div>
            <div className="lpv2-hero-pool">
              <div className="lpv2-hero-mono">POOL</div>
              <div className="lpv2-hero-pool-amt">TZS 398,600</div>
            </div>
          </div>
          <div className="lpv2-mapigo-stage-wf"><Waveform stroke={3.0}/></div>
          <div className="lpv2-mapigo-stage-tray">
            <div className="lpv2-mapigo-stage-call" style={{'--c':'#F87171'}}>
              <span className="lpv2-mapigo-stage-call-name">▲ SPIKE</span>
              <span className="lpv2-mapigo-stage-call-amt">TZS 184k</span>
            </div>
            <div className="lpv2-mapigo-stage-call active" style={{'--c':'#DEBC54'}}>
              <span className="lpv2-mapigo-stage-call-name">~ DRIFT</span>
              <span className="lpv2-mapigo-stage-call-amt">your call · 92k</span>
            </div>
            <div className="lpv2-mapigo-stage-call" style={{'--c':'#67E8F9'}}>
              <span className="lpv2-mapigo-stage-call-name">— CALM</span>
              <span className="lpv2-mapigo-stage-call-amt">TZS 121k</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──── COMPLIANCE BAND ──── */

function ComplianceBand() {
  const items = [
    { ico:'🛡', t:'NIDA-verified KYC' },
    { ico:'💳', t:'M-Pesa · Tigo · Airtel · HaloPesa · Mixx' },
    { ico:'⚖', t:'Tanzania Gaming Board licensed' },
    { ico:'🆘', t:'18+ Responsible play' },
    { ico:'🇹🇿', t:'PDPA compliant' },
  ];
  return (
    <section id="help" className="lpv2-compliance">
      <div className="lpv2-compliance-row">
        {items.map(i => (
          <div key={i.t} className="lpv2-comp-item">
            <span className="lpv2-comp-icon" aria-hidden="true">{i.ico}</span>
            <span>{i.t}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──── FOOTER ──── */

function Footer() {
  return (
    <footer className="lpv2-footer">
      <div className="lpv2-footer-grid">
        <div className="lpv2-footer-brand">
          <Logo size={28}/>
          <p className="lpv2-footer-tagline">Pool-based time-window betting on football you love. Mainland Tanzania, Zanzibar, and the diaspora — in your language.</p>
          <div className="lpv2-footer-tagline" style={{fontFamily:'JetBrains Mono',fontSize:11,letterSpacing:'0.08em',color:'var(--text-tertiary)',marginTop:8}}>
            Kipindi Africa Ltd · Posta House, Dar es Salaam<br/>
            TIN xxx-xxx-xxx · BCLB licence #pending
          </div>
        </div>
        <div className="lpv2-footer-col">
          <span className="lpv2-footer-h">Play</span>
          <a href="/live">Live matches</a>
          <a href="/mapigo">Mapigo</a>
          <a href="/pools">Pools</a>
          <a href="/leagues">Leagues</a>
        </div>
        <div className="lpv2-footer-col">
          <span className="lpv2-footer-h">Legal</span>
          <a href="/legal/terms">Terms of service</a>
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/responsible-gambling">Responsible gambling</a>
          <a href="/legal/aml-kyc">AML / KYC</a>
        </div>
        <div className="lpv2-footer-col">
          <span className="lpv2-footer-h">Help</span>
          <a href="tel:+255222115811">+255 22 211 5811</a>
          <a href="mailto:support@kipindi.africa">support@kipindi.africa</a>
          <a href="/help">Help centre</a>
          <a href="https://twitter.com/kipindi">Twitter · Instagram</a>
        </div>
      </div>
      <div className="lpv2-footer-base">
        <span>© 2026 Kipindi Africa Ltd · all rights reserved</span>
        <span>v2.0 · deploy 02-May-2026 · 14:32 EAT</span>
      </div>
    </footer>
  );
}

/* ──── PAGE ──── */

function LandingPage({ theme = 'dark', size = 'desktop' }) {
  const cls = `lpv2 ${size}`;
  const reduceMotion = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className={cls} data-theme={theme}>
      <div className="lpv2-sokoni" aria-hidden="true"/>
      <Nav />
      <Hero />
      <HowItWorks />
      <LiveNow scroller={size === 'mobile'} />
      <Numbers />
      <Mapigo />
      <ComplianceBand />
      <Footer />
    </div>
  );
}

window.LandingPage = LandingPage;
