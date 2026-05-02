/* ─── VARIATION 1 · EDITORIAL PULSE ────────────────────────────────────────
   Magazine-grade typography. Massive Sora 800 hero. Asymmetric grid.
   Quiet luxury — black/navy/gold, lots of negative space, slow rhythm. */

function V1Editorial() {
  return (
    <div className="v1-frame lp-frame" style={{ background: '#060F24' }}>
      <div className="lp-starfield" style={{ opacity: 0.35 }} />

      {/* nav */}
      <nav className="lp-nav v1-nav">
        <KipindiWordmark height={22} />
        <div className="lp-nav-links">
          <a className="lp-link" href="#">Live</a>
          <a className="lp-link" href="#">Mapigo</a>
          <a className="lp-link" href="#">Pools</a>
          <a className="lp-link" href="#">How it works</a>
          <a className="lp-link" href="#">Help</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-lang-toggle">EN · SW</button>
          <a className="lp-link" href="#">Sign in</a>
          <a className="lp-cta-primary" href="#" style={{ padding: '12px 22px', fontSize: 13 }}>Open account</a>
        </div>
      </nav>

      {/* HERO — asymmetric editorial grid */}
      <section className="v1-hero">
        <div className="v1-hero-meta">
          <div className="lp-eyebrow"><span className="lp-eyebrow-dot"></span>Issue №01 · East Africa · 2026</div>
          <div className="v1-hero-credits">
            <div><span className="lp-mono">Edited by</span><span>Kipindi Editorial</span></div>
            <div><span className="lp-mono">Featuring</span><span>Mapigo · live pulse</span></div>
            <div><span className="lp-mono">Languages</span><span>English · Kiswahili</span></div>
          </div>
        </div>

        <div className="v1-hero-main">
          <h1 className="lp-h1 v1-h1">
            Sport is a <em>rhythm</em>.<br/>
            <span className="v1-h1-gold">We let you bet</span><br/>
            on the music.
          </h1>
          <p className="lp-lede v1-lede">
            Kipindi is the live pooled-betting platform built for African football, and the ones who watch with their whole chest.
            All stakes pool together. Winners share. The math is fair, and the heartbeat is gold.
          </p>
          <div className="v1-cta-row">
            <a className="lp-cta-primary" href="#">
              <MapigoSmallGlyph size={18} color="var(--gold-fg)" />
              Watch the live waveform
            </a>
            <a className="lp-cta-secondary" href="#">How pooled betting works →</a>
          </div>
          <div className="v1-tagline">
            <span className="v1-tagline-en">"Feel the match. Bet the pulse."</span>
            <span className="v1-tagline-sep">·</span>
            <span className="v1-tagline-sw">"Hisi mechi. Cheza mapigo."</span>
          </div>
        </div>

        {/* Side: live waveform card */}
        <aside className="v1-hero-side">
          <div className="v1-wf-card">
            <div className="v1-wf-head">
              <div>
                <div className="lp-mono" style={{ color: '#F87171' }}><span className="lp-live-dot" style={{ marginRight: 6 }}></span>LIVE NOW</div>
                <div className="v1-wf-match">Simba SC <span className="lp-mute">vs</span> Yanga SC</div>
                <div className="lp-mono">TPL · 67' · 2 — 1</div>
              </div>
              <div className="v1-wf-pool">
                <div className="lp-mono">POOL</div>
                <div className="v1-wf-pool-amt">TZS 398,600</div>
              </div>
            </div>
            <div className="v1-wf-canvas">
              <LandingWaveform height={220} width={620}/>
            </div>
            <div className="v1-wf-foot">
              <div className="v1-wf-call">
                <span className="v1-wf-call-icon" style={{ color: 'var(--bet-hot)' }}>▲</span>
                <div>
                  <div className="lp-mono">SPIKE</div>
                  <div className="v1-wf-call-amt">184,500</div>
                </div>
              </div>
              <div className="v1-wf-call">
                <span className="v1-wf-call-icon" style={{ color: 'var(--gold)' }}>~</span>
                <div>
                  <div className="lp-mono">DRIFT</div>
                  <div className="v1-wf-call-amt">92,300</div>
                </div>
              </div>
              <div className="v1-wf-call">
                <span className="v1-wf-call-icon" style={{ color: 'var(--bet-cold)' }}>—</span>
                <div>
                  <div className="lp-mono">CALM</div>
                  <div className="v1-wf-call-amt">121,800</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* STAT STRIP */}
      <section className="v1-stats">
        <div className="v1-stat"><div className="v1-stat-num">142,890</div><div className="lp-mono">Active players</div></div>
        <div className="v1-stat"><div className="v1-stat-num">TZS 4.2B</div><div className="lp-mono">Paid out · 30d</div></div>
        <div className="v1-stat"><div className="v1-stat-num">38</div><div className="lp-mono">Leagues covered</div></div>
        <div className="v1-stat"><div className="v1-stat-num">99.8%</div><div className="lp-mono">Settlement uptime</div></div>
      </section>

      {/* THREE-PANEL EDITORIAL */}
      <section className="v1-panels">
        <article className="v1-panel">
          <div className="v1-panel-num">01</div>
          <h2 className="lp-h2 v1-panel-h">The pool is the house.</h2>
          <p className="v1-panel-body">No bookmaker on the other side. Every stake feeds a single pool. Winners split it by stake share — same simple math as a chama, settled in seconds, not weeks.</p>
        </article>
        <article className="v1-panel v1-panel-feature">
          <div className="v1-panel-num">02</div>
          <h2 className="lp-h2 v1-panel-h">Mapigo. The signature game.</h2>
          <p className="v1-panel-body">A live intensity waveform of the match you love. Every 60 seconds, a new round opens. Will it spike, drift, or stay calm? Read the rhythm. Call the pulse.</p>
          <div className="v1-panel-cta">
            <span className="lp-mono lp-gold">Featured →</span>
            <span>Try a demo round</span>
          </div>
        </article>
        <article className="v1-panel">
          <div className="v1-panel-num">03</div>
          <h2 className="lp-h2 v1-panel-h">Built for the continent.</h2>
          <p className="v1-panel-body">Mobile-first. Works on any 3G handset. M-Pesa, Tigo Pesa, Airtel Money in, instant out. English and Kiswahili from day one — every string, every screen.</p>
        </article>
      </section>

      {/* FIXTURES */}
      <section className="v1-fixtures">
        <header className="v1-fixtures-head">
          <div>
            <div className="lp-eyebrow"><span className="lp-eyebrow-dot"></span>Today on Kipindi</div>
            <h2 className="lp-h2 v1-fixtures-h">Live & upcoming</h2>
          </div>
          <a className="lp-link" href="#">All matches →</a>
        </header>
        <div className="v1-fixtures-grid">
          {FIXTURES.slice(0, 6).map((f, i) => (
            <div key={i} className={`v1-fixture ${f.hot ? 'is-hot' : ''}`}>
              <div className="v1-fixture-league lp-mono">{f.league}</div>
              <div className="v1-fixture-teams">
                <div>{f.home}</div>
                <div>{f.away}</div>
              </div>
              <div className="v1-fixture-foot">
                <span className={`lp-mono ${f.hot ? 'lp-gold' : ''}`}>
                  {f.hot && <span className="lp-live-dot" style={{ marginRight: 6 }}/>}
                  {f.time}
                </span>
                <span className="v1-fixture-side mono">
                  {f.score ?? `× ${f.odds}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSING */}
      <section className="v1-closing">
        <div className="v1-closing-mark">
          <KipindiWordmark height={40}/>
        </div>
        <h2 className="lp-h2 v1-closing-h">
          The match has a heartbeat.<br/>
          <span className="v1-h1-gold">Now you can bet it.</span>
        </h2>
        <a className="lp-cta-primary" href="#">Watch the live waveform →</a>
      </section>

      {/* FOOTER */}
      <footer className="v1-footer">
        <div className="v1-footer-cols">
          <div>
            <KipindiWordmark height={18}/>
            <p className="v1-footer-tagline">Pooled betting · live matches · the pulse of the game.</p>
          </div>
          <div>
            <div className="lp-mono">Play</div>
            <a className="lp-link" href="#">Live matches</a>
            <a className="lp-link" href="#">Mapigo</a>
            <a className="lp-link" href="#">Pools</a>
          </div>
          <div>
            <div className="lp-mono">Company</div>
            <a className="lp-link" href="#">About</a>
            <a className="lp-link" href="#">Press</a>
            <a className="lp-link" href="#">Careers</a>
          </div>
          <div>
            <div className="lp-mono">Help</div>
            <a className="lp-link" href="#">Support</a>
            <a className="lp-link" href="#">Responsible play</a>
            <a className="lp-link" href="#">Contact</a>
          </div>
        </div>
        <div className="v1-footer-base">
          <span className="lp-mono">18+ · Play responsibly · Helpline 0800-kipindi · BCLB licensed</span>
          <span className="lp-mono">© 2026 Kipindi Africa Ltd</span>
        </div>
      </footer>
    </div>
  );
}

window.V1Editorial = V1Editorial;
