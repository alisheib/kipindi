/* ─── VARIATION 2 · KINETIC STADIUM ─────────────────────────────────────
   Dense, alive. Live ticker, animated stats, three-column layout, dual-language band. */

function useTicker() {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), 1200);
    return () => clearInterval(id);
  }, []);
  return t;
}

function CountUp({ to, prefix = '', suffix = '', duration = 1800 }) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    let raf, start;
    const step = (now) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{prefix}{v.toLocaleString()}{suffix}</span>;
}

function V2Kinetic() {
  const tickerItems = [
    { league: 'TPL', match: 'Simba 2 — 1 Yanga', minute: '67\'', call: 'SPIKE', color: 'var(--bet-hot)' },
    { league: 'EPL', match: 'Arsenal 1 — 1 Liverpool', minute: '34\'', call: 'DRIFT', color: 'var(--gold)' },
    { league: 'LaLiga', match: 'Madrid 0 — 0 Atletico', minute: '12\'', call: 'CALM', color: 'var(--bet-cold)' },
    { league: 'PSL', match: 'Sundowns 3 — 0 Chiefs', minute: '78\'', call: 'SPIKE', color: 'var(--bet-hot)' },
    { league: 'PSL', match: 'Pillars 2 — 1 Enyimba', minute: '55\'', call: 'DRIFT', color: 'var(--gold)' },
  ];

  return (
    <div className="v2-frame lp-frame">
      <div className="lp-starfield"/>

      {/* live ticker bar */}
      <div className="v2-ticker">
        <div className="v2-ticker-label lp-mono"><span className="lp-live-dot"/>LIVE FEED</div>
        <div className="v2-ticker-track">
          <div className="v2-ticker-items">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <div key={i} className="v2-ticker-item">
                <span className="lp-mono lp-gold">{t.league}</span>
                <span>{t.match}</span>
                <span className="lp-mono lp-mute">{t.minute}</span>
                <span className="v2-ticker-call" style={{ color: t.color }}>{t.call} →</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <nav className="lp-nav">
        <KipindiWordmark height={22}/>
        <div className="lp-nav-links">
          <a className="lp-link" href="#">Live</a>
          <a className="lp-link" href="#">Mapigo</a>
          <a className="lp-link" href="#">Pools</a>
          <a className="lp-link" href="#">Leagues</a>
          <a className="lp-link" href="#">Help</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-lang-toggle">EN · SW</button>
          <a className="lp-link" href="#">Sign in</a>
          <a className="lp-cta-primary" href="#" style={{ padding: '12px 22px', fontSize: 13 }}>Open account</a>
        </div>
      </nav>

      {/* HERO with three columns */}
      <section className="v2-hero">
        <div className="v2-hero-left">
          <div className="lp-eyebrow"><span className="lp-eyebrow-dot"/>Live pooled betting · Africa</div>
          <h1 className="lp-h1 v2-h1">
            Bet <span className="v2-h1-gold">live</span>.<br/>
            Share the <span className="v2-h1-gold">pool</span>.<br/>
            Read the <span className="v2-h1-gold">pulse</span>.
          </h1>
          <p className="lp-lede v2-lede">
            Africa's live pooled-betting platform. No bookmaker on the other side — every stake feeds the same pool, winners share by stake share. Built mobile-first, settled in seconds.
          </p>
          <div className="v2-cta-row">
            <a className="lp-cta-primary" href="#">
              <MapigoSmallGlyph size={18} color="var(--gold-fg)"/>
              Watch the live waveform
            </a>
            <a className="lp-cta-secondary" href="#">Browse fixtures</a>
          </div>
        </div>

        <div className="v2-hero-center">
          <div className="v2-stage">
            <div className="v2-stage-head">
              <div>
                <div className="lp-mono"><span className="lp-live-dot"/>LIVE · TPL</div>
                <div className="v2-stage-match">Simba SC <span className="lp-mute">vs</span> Yanga SC</div>
                <div className="lp-mono">67' · 2 — 1</div>
              </div>
              <div className="v2-stage-pool">
                <div className="lp-mono">ROUND #4219</div>
                <div className="v2-stage-pool-amt">TZS <CountUp to={398600}/></div>
                <div className="lp-mono lp-mute">47 players · 23s left</div>
              </div>
            </div>
            <div className="v2-stage-canvas">
              <LandingWaveform height={280} width={760}/>
            </div>
            <div className="v2-stage-foot">
              {['SPIKE','DRIFT','CALM'].map((k, i) => {
                const colors = ['var(--bet-hot)','var(--gold)','var(--bet-cold)'];
                const amts = [184500, 92300, 121800];
                return (
                  <div key={k} className="v2-call" style={{ '--c': colors[i] }}>
                    <div className="v2-call-bar"/>
                    <div className="v2-call-info">
                      <span className="v2-call-label">{k}</span>
                      <span className="v2-call-amt"><CountUp to={amts[i]} prefix="TZS "/></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="v2-hero-right">
          <div className="v2-feed-head">
            <span className="lp-mono">RECENT WINS</span>
            <span className="lp-mono lp-mute">last hour</span>
          </div>
          <ul className="v2-feed">
            {[
              { who: 'mwanga_22', amt: '+18,400', call: 'SPIKE', mult: '×2.4' },
              { who: 'kibichi',   amt: '+12,100', call: 'DRIFT', mult: '×2.2' },
              { who: 'asha_t',    amt: '+ 8,300', call: 'CALM',  mult: '×1.8' },
              { who: 'ngalimo',   amt: '+ 6,900', call: 'SPIKE', mult: '×3.1' },
              { who: 'lekule',    amt: '+ 5,200', call: 'DRIFT', mult: '×2.0' },
              { who: 'jumanne',   amt: '+ 4,800', call: 'SPIKE', mult: '×2.6' },
              { who: 'fadhili',   amt: '+ 3,100', call: 'CALM',  mult: '×1.6' },
            ].map((r, i) => (
              <li key={i} className="v2-feed-row">
                <div className="v2-feed-avatar">{r.who[0]}</div>
                <div className="v2-feed-mid">
                  <span>{r.who}</span>
                  <span className="lp-mono lp-mute">{r.call} {r.mult}</span>
                </div>
                <span className="v2-feed-amt">{r.amt}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* DUAL-LANGUAGE STATEMENT BAND */}
      <section className="v2-band">
        <div className="v2-band-side">
          <span className="lp-mono lp-gold">EN</span>
          <h2 className="lp-h2 v2-band-h">"Feel the match. Bet the pulse."</h2>
        </div>
        <div className="v2-band-divider"/>
        <div className="v2-band-side">
          <span className="lp-mono lp-gold">SW</span>
          <h2 className="lp-h2 v2-band-h v2-band-sw">"Hisi mechi. Cheza mapigo."</h2>
        </div>
      </section>

      {/* STATS */}
      <section className="v2-stats">
        <h2 className="lp-h2 v2-stats-h">Trusted by <span className="lp-gold">142,000+</span> players across the continent</h2>
        <div className="v2-stats-grid">
          <div className="v2-stat">
            <div className="v2-stat-num"><CountUp to={142890}/></div>
            <div className="lp-mono">Active players</div>
            <div className="v2-stat-sub">across 8 countries</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-num"><CountUp to={4200} prefix="TZS " suffix="M"/></div>
            <div className="lp-mono">Paid out · 30d</div>
            <div className="v2-stat-sub">average settle: 2.3s</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-num"><CountUp to={38}/></div>
            <div className="lp-mono">Leagues covered</div>
            <div className="v2-stat-sub">Africa · Europe · world</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-num"><CountUp to={998} suffix="‱"/></div>
            <div className="lp-mono">Settlement uptime</div>
            <div className="v2-stat-sub">99.8% over 30d</div>
          </div>
        </div>
      </section>

      {/* MAPIGO SHOWCASE */}
      <section className="v2-mapigo">
        <div className="v2-mapigo-text">
          <div className="lp-eyebrow"><span className="lp-eyebrow-dot"/>Signature game · introducing</div>
          <div className="v2-mapigo-mark">
            <MapigoSmallGlyph size={56} color="var(--gold)"/>
            <span style={{ fontFamily: 'Sora', fontSize: 56, fontWeight: 600, letterSpacing: '-0.02em' }}>mapigo</span>
          </div>
          <p className="lp-lede v2-mapigo-lede">
            Watch a live intensity waveform of the match you love. Every 60 seconds, a new round opens. <strong style={{color:'var(--bet-hot)'}}>SPIKE</strong>, <strong style={{color:'var(--gold)'}}>DRIFT</strong>, or <strong style={{color:'var(--bet-cold)'}}>CALM</strong>? You call it. The pool decides.
          </p>
          <div className="v2-mapigo-rules">
            <div><span className="lp-mono lp-gold">01</span> One bet per round</div>
            <div><span className="lp-mono lp-gold">02</span> 60-second windows</div>
            <div><span className="lp-mono lp-gold">03</span> Pool splits by stake share</div>
            <div><span className="lp-mono lp-gold">04</span> Goals trigger gold-flash bonus</div>
          </div>
          <a className="lp-cta-primary" href="#" style={{ marginTop: 8 }}>Try a demo round →</a>
        </div>
        <div className="v2-mapigo-screen">
          <LandingWaveform height={400} width={680}/>
        </div>
      </section>

      {/* CTA + FOOTER */}
      <section className="v2-closing">
        <h2 className="lp-h2 v2-closing-h">
          The match has a heartbeat.<br/>
          <span className="lp-gold">Now you can bet it.</span>
        </h2>
        <div className="v2-closing-cta">
          <a className="lp-cta-primary" href="#">Watch the live waveform →</a>
          <a className="lp-cta-secondary" href="#">Get the app · Pata app</a>
        </div>
      </section>

      <footer className="v2-footer">
        <div className="v2-footer-cols">
          <div><KipindiWordmark height={18}/><p className="v2-footer-tagline">Pooled betting · live matches · the pulse of the game.</p></div>
          <div><div className="lp-mono">Play</div><a className="lp-link" href="#">Live</a><a className="lp-link" href="#">Mapigo</a><a className="lp-link" href="#">Pools</a></div>
          <div><div className="lp-mono">Company</div><a className="lp-link" href="#">About</a><a className="lp-link" href="#">Press</a><a className="lp-link" href="#">Careers</a></div>
          <div><div className="lp-mono">Help</div><a className="lp-link" href="#">Support</a><a className="lp-link" href="#">Responsible play</a><a className="lp-link" href="#">Contact</a></div>
        </div>
        <div className="v2-footer-base">
          <span className="lp-mono">18+ · Play responsibly · Helpline 0800-kipindi · BCLB licensed</span>
          <span className="lp-mono">© 2026 Kipindi Africa Ltd</span>
        </div>
      </footer>
    </div>
  );
}

window.V2Kinetic = V2Kinetic;
