/* DESKTOP WIREFRAME · 1440 wide */

function WFDesktop() {
  return (
    <div className="wf" style={{ width: 1440 }}>
      <NavBar />

      {/* §1 HERO */}
      <div className="wf-band" style={{padding:'40px 56px', minHeight:600}}>
        <span className="wf-band-tag">§1 · Hero</span>
        <Pin n="1" top="12" left="12" />
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center', minHeight:520}}>
          <div className="wf-col" style={{gap:18}}>
            <MonoLabel>Live pooled betting · Tanzania</MonoLabel>
            <h1 className="wf-display" style={{fontSize:64}}>
              Bet the window.<br/>Share the pool.
            </h1>
            <Pair en="One sentence supporting the headline." sw="Sentensi moja inayounga mkono." />
            <div className="wf-row" style={{gap:10, marginTop:8}}>
              <div className="wf-box gold" style={{padding:'14px 22px', fontSize:13}}>Try demo · TZS 100,000 →</div>
              <div className="wf-box outline" style={{padding:'14px 22px', fontSize:13}}>Browse matches · /live</div>
            </div>
            <div style={{marginTop:8}}><TrustStrip /></div>
          </div>
          <div className="wf-block" style={{ height: 420 }}>
            HERO VISUAL · ANIMATED MAPIGO WAVEFORM<br/>
            (commit one — waveform · pool counter · live score)<br/>
            reduced-motion: static snapshot
          </div>
        </div>
      </div>

      {/* §2 HOW IT WORKS */}
      <div className="wf-band" style={{padding:'48px 56px'}}>
        <span className="wf-band-tag">§2 · How it works</span>
        <Pin n="2" top="12" left="12" />
        <div className="wf-col" style={{gap:24}}>
          <h2 className="wf-display" style={{fontSize:32}}>How it works · <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>Inafanyaje</em></h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16}}>
            {[
              { i:'⏱', t:'Pick a window', body:'0–15, 15–30, 30–45, 45–60, or full-time. Each window is its own pool.', sw:'Chagua dirisha la dakika' },
              { i:'◉', t:'Pool pays out', body:'When the window settles, the winning pool is shared among everyone who picked the right side.', sw:'Bwawa linagawanywa' },
              { i:'~', t:'Mapigo · live in-play', body:'Read the rhythm of the match. Call SPIKE, DRIFT or CALM. 60 seconds, real cash.', sw:'Soma mapigo ya mechi' },
            ].map(c => (
              <div key={c.t} className="wf-card">
                <span className="wf-icon">{c.i}</span>
                <h3 style={{fontSize:18}}>{c.t}</h3>
                <div style={{fontSize:13,color:'var(--wf-line-strong)',lineHeight:1.5}}>{c.body}</div>
                <Pair en={c.t} sw={c.sw} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* §3 LIVE NOW */}
      <div className="wf-band" style={{padding:'48px 56px'}}>
        <span className="wf-band-tag">§3 · Live now</span>
        <Pin n="3" top="12" left="12" />
        <div className="wf-col" style={{gap:20}}>
          <div className="wf-row" style={{justifyContent:'space-between'}}>
            <h2 className="wf-display" style={{fontSize:32}}>Live now · <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>Sasa hivi</em></h2>
            <MonoLabel>see all → /live</MonoLabel>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16}}>
            {[1,2,3].map(i => (
              <div key={i} className="wf-fixture">
                <div className="wf-row" style={{justifyContent:'space-between'}}>
                  <span className="wf-box outline" style={{padding:'2px 8px',fontSize:10}}>TPL · TZ</span>
                  <MonoLabel><span style={{color:'var(--wf-gold)'}}>● LIVE 67'</span></MonoLabel>
                </div>
                <div className="wf-row" style={{gap:10, alignItems:'center'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--wf-fill-2)'}}/>
                  <span style={{fontSize:13, fontWeight:600}}>Team A</span>
                  <span style={{flex:1, textAlign:'center',color:'var(--wf-gold)',fontFamily:'var(--wf-mono)',fontSize:18,fontWeight:700}}>2 — 1</span>
                  <span style={{fontSize:13, fontWeight:600}}>Team B</span>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--wf-fill-2)'}}/>
                </div>
                <div className="wf-row" style={{justifyContent:'space-between',paddingTop:8,borderTop:'1px solid var(--wf-line)'}}>
                  <div className="wf-col" style={{gap:2}}>
                    <MonoLabel>POOL</MonoLabel>
                    <span style={{fontFamily:'var(--wf-mono)',fontSize:18,color:'var(--wf-gold)',fontWeight:600}}>TZS 398,600</span>
                  </div>
                  <div className="wf-box gold" style={{padding:'8px 18px',fontSize:12}}>Bet · Weka →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* §4 NUMBERS */}
      <div className="wf-band wf-dark" style={{padding:'48px 56px', background:'var(--wf-ink)'}}>
        <span className="wf-band-tag">§4 · Numbers (credibility)</span>
        <Pin n="4" top="12" left="12" />
        <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:24}}>
          {[
            { n:'TZS 4,200M', l:'Paid out · Imelipwa' },
            { n:'142,890', l:'Verified players · Wachezaji' },
            { n:'< 60s', l:'Average withdrawal' },
            { n:'TZ + ZNZ', l:'Mainland + Zanzibar' },
            { n:'ISO 27001', l:'Audit · Q3 2026' },
          ].map(s => (
            <div key={s.l} className="wf-col" style={{gap:6}}>
              <span style={{fontFamily:'var(--wf-mono)',fontSize:28,color:'var(--wf-gold)',fontWeight:700,letterSpacing:'-0.02em'}}>{s.n}</span>
              <MonoLabel>{s.l}</MonoLabel>
            </div>
          ))}
        </div>
      </div>

      {/* §5 MAPIGO SHOWCASE */}
      <div className="wf-band wf-dark" style={{padding:'64px 56px', background:'#000'}}>
        <span className="wf-band-tag">§5 · Mapigo showcase</span>
        <Pin n="5" top="12" left="12" />
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center'}}>
          <div className="wf-col" style={{gap:16}}>
            <MonoLabel>★ Signature game</MonoLabel>
            <h2 className="wf-display" style={{fontSize:48, color:'#fff'}}>The waveform <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>is</em> the game.</h2>
            <div style={{fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.55, maxWidth:'40ch'}}>60-second prediction loop. Read the gold pulse. Call SPIKE, DRIFT, or CALM. Pool splits by stake share.</div>
            <div className="wf-row" style={{gap:8, marginTop:8}}>
              {['SPIKE','DRIFT','CALM'].map(c => <div key={c} className="wf-box outline" style={{padding:'8px 14px',fontSize:12,color:'#fff',borderColor:'rgba(255,255,255,0.3)'}}>{c}</div>)}
            </div>
            <div className="wf-box gold" style={{padding:'14px 22px',fontSize:13,marginTop:8,width:'fit-content'}}>Play Mapigo · Cheza Mapigo →</div>
          </div>
          <div className="wf-block" style={{height:380}}>
            ANIMATED WAVEFORM<br/>+ PREDICTION TRAY PREVIEW<br/>+ "How it works" toggle<br/>+ win-celebration screenshot
          </div>
        </div>
      </div>

      {/* §6 COMPLIANCE BAND */}
      <div className="wf-band" style={{padding:'24px 56px', background:'#fff'}}>
        <span className="wf-band-tag">§6 · Trust + compliance</span>
        <Pin n="6" top="12" left="12" />
        <ComplianceBand />
      </div>

      {/* §7 FOOTER */}
      <div className="wf-band" style={{padding:'40px 56px', background:'var(--wf-fill)'}}>
        <span className="wf-band-tag">§7 · Footer</span>
        <Pin n="7" top="12" left="12" />
        <Footer cols={3} />
      </div>
    </div>
  );
}

window.WFDesktop = WFDesktop;
