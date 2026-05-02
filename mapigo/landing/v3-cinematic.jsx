/* ─── VARIATION 3 · CINEMATIC MANIFESTO ───────────────────────────────────
   Single dramatic statement. Kanga-inspired geometric pattern at low opacity.
   Hero waveform pulses behind enormous type. Ends in app download. */

function V3Cinematic() {
  return (
    <div className="v3-frame lp-frame">
      {/* layered atmospheric backgrounds */}
      <div className="v3-bg-pattern"/>
      <div className="lp-starfield" style={{ opacity: 0.4 }}/>
      <div className="v3-bg-glow"/>

      <nav className="lp-nav v3-nav">
        <KipindiWordmark height={22}/>
        <div className="lp-nav-links">
          <a className="lp-link" href="#">Live</a>
          <a className="lp-link" href="#">Mapigo</a>
          <a className="lp-link" href="#">Pools</a>
          <a className="lp-link" href="#">Help</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-lang-toggle">EN · SW</button>
          <a className="lp-cta-primary" href="#" style={{ padding: '12px 22px', fontSize: 13 }}>Open account</a>
        </div>
      </nav>

      {/* CINEMATIC HERO */}
      <section className="v3-hero">
        <div className="v3-hero-wf">
          <LandingWaveform height={520} width={1920} stroke={2.4} fill={false} label={false}/>
        </div>

        <div className="v3-hero-content">
          <div className="lp-eyebrow"><span className="lp-eyebrow-dot"/>Kipindi · live pooled betting · Africa</div>
          <h1 className="lp-h1 v3-h1">
            Sport has a <span className="v3-h1-italic">heartbeat</span>.<br/>
            <span className="v3-h1-gold">We made it bettable.</span>
          </h1>
          <div className="v3-tagline-row">
            <div>
              <span className="lp-mono lp-gold">EN</span>
              <span className="v3-tagline">Feel the match. Bet the pulse.</span>
            </div>
            <div className="v3-tagline-divider"/>
            <div>
              <span className="lp-mono lp-gold">SW</span>
              <span className="v3-tagline v3-tagline-sw">Hisi mechi. Cheza mapigo.</span>
            </div>
          </div>
          <div className="v3-cta-row">
            <a className="lp-cta-primary" href="#">
              <MapigoSmallGlyph size={18} color="var(--gold-fg)"/>
              Watch the live waveform →
            </a>
            <a className="lp-cta-secondary" href="#">How pooled betting works</a>
          </div>
        </div>

        {/* live status corner */}
        <div className="v3-hero-status">
          <div className="lp-mono"><span className="lp-live-dot"/>RIGHT NOW</div>
          <div className="v3-hero-status-num">
            <CountUp to={4729}/>
          </div>
          <div className="lp-mono lp-mute">players in live rounds</div>
        </div>
      </section>

      {/* MANIFESTO PILLARS */}
      <section className="v3-manifesto">
        <div className="v3-manifesto-num lp-mono">§ 01 — 04</div>
        <div className="v3-manifesto-grid">
          <div className="v3-pillar">
            <div className="v3-pillar-num">01</div>
            <h3 className="v3-pillar-h">No bookmaker.</h3>
            <p className="v3-pillar-body">Every stake feeds one pool. Winners share by stake share. The math is simple, the fairness verifiable on-chain at settlement.</p>
          </div>
          <div className="v3-pillar">
            <div className="v3-pillar-num">02</div>
            <h3 className="v3-pillar-h">Live by default.</h3>
            <p className="v3-pillar-body">Time-window markets settle every 60 seconds against the live match feed. No wait, no surprise. Wins land in your wallet before the next round opens.</p>
          </div>
          <div className="v3-pillar">
            <div className="v3-pillar-num">03</div>
            <h3 className="v3-pillar-h">Built for the continent.</h3>
            <p className="v3-pillar-body">Mobile-first. Works on any 3G handset. M-Pesa, Tigo Pesa, Airtel Money. English and Kiswahili from day one — every string, every screen.</p>
          </div>
          <div className="v3-pillar">
            <div className="v3-pillar-num">04</div>
            <h3 className="v3-pillar-h">Dignified by design.</h3>
            <p className="v3-pillar-body">Daily limits. Self-exclusion. Reality checks. We frame loss as "the pool grew" — never as failure. Help is one tap away, in both languages.</p>
          </div>
        </div>
      </section>

      {/* MAPIGO SHOWCASE */}
      <section className="v3-mapigo">
        <div className="v3-mapigo-eyebrow lp-mono lp-gold">SIGNATURE GAME · MAPIGO</div>
        <h2 className="lp-h2 v3-mapigo-h">
          The waveform is the <em>game</em>.
        </h2>
        <p className="v3-mapigo-lede">
          Mapigo turns a live match into a 60-second prediction loop. Watch the gold pulse rise and fall. Call the next minute: SPIKE, DRIFT, or CALM. All stakes pool. Winners share. New round opens. Repeat.
        </p>
        <div className="v3-mapigo-stage">
          <LandingWaveform height={320} width={1400} stroke={3.4}/>
        </div>
        <div className="v3-mapigo-calls">
          <div className="v3-mapigo-call" style={{'--c':'var(--bet-hot)'}}>
            <div className="v3-mapigo-call-icon">▲</div>
            <div className="v3-mapigo-call-name">SPIKE</div>
            <div className="v3-mapigo-call-desc">A big peak in the next 60 seconds — shot on goal, attack, near-miss.</div>
          </div>
          <div className="v3-mapigo-call" style={{'--c':'var(--gold)'}}>
            <div className="v3-mapigo-call-icon">~</div>
            <div className="v3-mapigo-call-name">DRIFT</div>
            <div className="v3-mapigo-call-desc">A gradual rise or fall. Possession battles, momentum building, no fireworks.</div>
          </div>
          <div className="v3-mapigo-call" style={{'--c':'var(--bet-cold)'}}>
            <div className="v3-mapigo-call-icon">—</div>
            <div className="v3-mapigo-call-name">CALM</div>
            <div className="v3-mapigo-call-desc">Flatlines. Midfield play, injury time, the lull before a storm.</div>
          </div>
        </div>
      </section>

      {/* APP DOWNLOAD */}
      <section className="v3-app">
        <div className="v3-app-text">
          <div className="lp-eyebrow"><span className="lp-eyebrow-dot"/>The app · iOS · Android</div>
          <h2 className="lp-h2 v3-app-h">Pocket-sized stadium.<br/><span className="lp-gold">Always live.</span></h2>
          <p className="lp-lede" style={{maxWidth:'40ch'}}>
            Push notifications for goal-flash bonuses. Haptics synced to the heartbeat. Streaks travel with you. Built for the bus ride, the chai break, the stoppage time.
          </p>
          <div className="v3-app-badges">
            <div className="v3-app-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 12.5c0-2 1.6-3 1.7-3.1-0.9-1.4-2.4-1.6-2.9-1.6-1.2-0.1-2.4 0.7-3 0.7-0.6 0-1.6-0.7-2.6-0.7-1.4 0-2.6 0.8-3.3 2-1.4 2.4-0.4 6 1 8 0.7 1 1.5 2 2.5 2 1 0 1.4-0.6 2.6-0.6s1.5 0.6 2.6 0.6c1.1 0 1.8-1 2.4-2 0.8-1.1 1.1-2.2 1.1-2.3-0.1 0-2.1-0.8-2.1-3z M15.5 6.4c0.5-0.6 0.9-1.4 0.8-2.3-0.7 0-1.6 0.4-2.1 1-0.5 0.5-0.9 1.4-0.8 2.2 0.8 0.1 1.6-0.4 2.1-0.9z"/></svg>
              <div>
                <div className="lp-mono lp-mute">Download on</div>
                <div className="v3-app-badge-store">App Store</div>
              </div>
            </div>
            <div className="v3-app-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 3 13 12 3.5 21c-0.3-0.2-0.5-0.5-0.5-1V4c0-0.5 0.2-0.8 0.5-1z M14 13l3 3-9.5 5.5c-0.3 0.2-0.6 0.2-0.9 0L14 13z M14 11L7 4c0.3-0.2 0.6-0.2 0.9 0L17 9.5 14 11z M19 10l2.5 1.5c0.6 0.4 0.6 1.2 0 1.6L19 14l-3.5-2 3.5-2z"/></svg>
              <div>
                <div className="lp-mono lp-mute">Get it on</div>
                <div className="v3-app-badge-store">Google Play</div>
              </div>
            </div>
          </div>
        </div>
        <div className="v3-app-phone">
          {/* phone bezel */}
          <div className="v3-phone">
            <div className="v3-phone-notch"/>
            <div className="v3-phone-screen">
              <div className="v3-phone-status lp-mono">
                <span>9:41</span>
                <span className="lp-gold">●●●●● 5G</span>
              </div>
              <div className="v3-phone-app">
                <div className="v3-phone-head">
                  <div>
                    <div className="lp-mono"><span className="lp-live-dot"/>LIVE</div>
                    <div className="v3-phone-match">Simba 2 — 1 Yanga</div>
                  </div>
                  <div className="v3-phone-pool">
                    <div className="lp-mono">POOL</div>
                    <div className="v3-phone-pool-amt">TZS 398,600</div>
                  </div>
                </div>
                <div className="v3-phone-wf">
                  <LandingWaveform height={140} width={320}/>
                </div>
                <div className="v3-phone-calls">
                  <div className="v3-phone-call" style={{'--c':'var(--bet-hot)'}}><span>SPIKE</span><span>184k</span></div>
                  <div className="v3-phone-call" style={{'--c':'var(--gold)'}}><span>DRIFT</span><span>92k</span></div>
                  <div className="v3-phone-call" style={{'--c':'var(--bet-cold)'}}><span>CALM</span><span>121k</span></div>
                </div>
                <button className="v3-phone-cta">Place bet · Weka dau</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="v3-closing">
        <div className="v3-closing-mark">
          <KipindiWordmark height={36}/>
        </div>
        <h2 className="lp-h2 v3-closing-h">
          The match has a heartbeat.<br/>
          <span className="lp-gold">Now you can bet it.</span>
        </h2>
        <a className="lp-cta-primary" href="#" style={{ fontSize: 16, padding: '20px 36px' }}>
          Watch the live waveform →
        </a>
        <div className="lp-mono lp-mute" style={{marginTop:24}}>18+ · Play responsibly · Helpline 0800-kipindi</div>
      </section>

      {/* FOOTER */}
      <footer className="v3-footer">
        <div className="v3-footer-cols">
          <div><KipindiWordmark height={18}/><p className="v3-footer-tagline">Pooled betting · live matches · the pulse of the game.</p></div>
          <div><div className="lp-mono">Play</div><a className="lp-link" href="#">Live</a><a className="lp-link" href="#">Mapigo</a><a className="lp-link" href="#">Pools</a></div>
          <div><div className="lp-mono">Company</div><a className="lp-link" href="#">About</a><a className="lp-link" href="#">Press</a><a className="lp-link" href="#">Careers</a></div>
          <div><div className="lp-mono">Help</div><a className="lp-link" href="#">Support</a><a className="lp-link" href="#">Responsible play</a><a className="lp-link" href="#">Contact</a></div>
        </div>
        <div className="v3-footer-base">
          <span className="lp-mono">18+ · BCLB licensed · © 2026 Kipindi Africa Ltd</span>
          <span className="lp-mono">Made on the continent</span>
        </div>
      </footer>
    </div>
  );
}

window.V3Cinematic = V3Cinematic;
