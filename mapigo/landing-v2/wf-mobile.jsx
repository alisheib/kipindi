/* MOBILE WIREFRAME · 393 wide */

function WFMobile() {
  return (
    <div className="wf" style={{ width: 393 }}>
      <NavMobile />

      <div className="wf-band" style={{padding:'24px 18px'}}>
        <span className="wf-band-tag">§1 Hero · ATF</span>
        <div className="wf-col" style={{gap:14}}>
          <MonoLabel>Live pooled betting · TZ</MonoLabel>
          <h1 className="wf-display" style={{fontSize:34}}>Bet the window.<br/>Share the pool.</h1>
          <Pair en="One supporting line." sw="Mstari mmoja wa msaada." />
          <div className="wf-block" style={{height:160}}>HERO VISUAL · static fallback for reduced-motion · reserves space (no CLS)</div>
          <div className="wf-box gold" style={{padding:'14px',fontSize:13,textAlign:'center',fontWeight:700}}>Try demo · TZS 100,000 →</div>
          <div className="wf-box outline" style={{padding:'12px',fontSize:12,textAlign:'center'}}>Browse matches · /live</div>
          <TrustStrip />
        </div>
      </div>

      <div className="wf-band" style={{padding:'24px 18px'}}>
        <span className="wf-band-tag">§2 How</span>
        <div className="wf-col" style={{gap:12}}>
          <h2 className="wf-display" style={{fontSize:22}}>How it works · <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>Inafanyaje</em></h2>
          {['Pick a window','Pool pays out','Mapigo · in-play'].map((t,i)=>(
            <div key={t} className="wf-card">
              <div className="wf-row" style={{gap:10}}>
                <span className="wf-icon">{['⏱','◉','~'][i]}</span>
                <h3 style={{fontSize:14}}>{t}</h3>
              </div>
              <div style={{fontSize:12,color:'var(--wf-line-strong)',lineHeight:1.5}}>2-line description.</div>
              <Pair en={t} sw={['Chagua dirisha','Bwawa linagawanywa','Soma mapigo'][i]}/>
            </div>
          ))}
        </div>
      </div>

      <div className="wf-band" style={{padding:'24px 0 24px 18px'}}>
        <span className="wf-band-tag">§3 Live · scroll</span>
        <div className="wf-col" style={{gap:12}}>
          <div className="wf-row" style={{justifyContent:'space-between',paddingRight:18}}>
            <h2 className="wf-display" style={{fontSize:20}}>Live now · <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>Sasa hivi</em></h2>
            <MonoLabel>see all →</MonoLabel>
          </div>
          <div style={{display:'flex',gap:10,overflowX:'auto',paddingRight:18}}>
            {[1,2,3].map(i=>(
              <div key={i} className="wf-fixture" style={{minWidth:240,flexShrink:0}}>
                <div className="wf-row" style={{justifyContent:'space-between'}}>
                  <span className="wf-box outline" style={{padding:'2px 6px',fontSize:9}}>TPL</span>
                  <MonoLabel><span style={{color:'var(--wf-gold)'}}>● LIVE</span></MonoLabel>
                </div>
                <div className="wf-row">
                  <span style={{fontSize:12,fontWeight:600}}>Team A</span>
                  <span style={{flex:1,textAlign:'center',color:'var(--wf-gold)',fontFamily:'var(--wf-mono)',fontSize:16,fontWeight:700}}>2 — 1</span>
                  <span style={{fontSize:12,fontWeight:600}}>Team B</span>
                </div>
                <div className="wf-row" style={{justifyContent:'space-between',paddingTop:6,borderTop:'1px solid var(--wf-line)'}}>
                  <span style={{fontFamily:'var(--wf-mono)',fontSize:13,color:'var(--wf-gold)',fontWeight:600}}>TZS 398K</span>
                  <div className="wf-box gold" style={{padding:'4px 10px',fontSize:11}}>Bet →</div>
                </div>
              </div>
            ))}
            <div style={{minWidth:18,flexShrink:0}}/>
          </div>
        </div>
      </div>

      <div className="wf-band wf-dark" style={{padding:'24px 18px', background:'var(--wf-ink)'}}>
        <span className="wf-band-tag">§4 Numbers</span>
        <div className="wf-col" style={{gap:14}}>
          {[
            ['TZS 4.2B','Paid out · Imelipwa'],
            ['142,890','Verified players · Wachezaji'],
            ['< 60s','Average withdrawal'],
            ['ISO 27001','Audit · Q3 2026'],
          ].map(([n,l])=>(
            <div key={l} className="wf-row" style={{justifyContent:'space-between',borderBottom:'1px solid rgba(255,255,255,0.10)',paddingBottom:8}}>
              <MonoLabel>{l}</MonoLabel>
              <span style={{fontFamily:'var(--wf-mono)',fontSize:18,color:'var(--wf-gold)',fontWeight:700}}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wf-band wf-dark" style={{padding:'32px 18px', background:'#000'}}>
        <span className="wf-band-tag">§5 Mapigo</span>
        <div className="wf-col" style={{gap:12}}>
          <MonoLabel>★ Signature game</MonoLabel>
          <h2 className="wf-display" style={{fontSize:26, color:'#fff'}}>The waveform <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>is</em> the game.</h2>
          <div className="wf-block" style={{height:160}}>WAVEFORM</div>
          <div className="wf-row" style={{gap:6}}>
            {['SPIKE','DRIFT','CALM'].map(c=><div key={c} className="wf-box outline" style={{flex:1,padding:'8px',fontSize:11,textAlign:'center',color:'#fff',borderColor:'rgba(255,255,255,0.3)'}}>{c}</div>)}
          </div>
          <div className="wf-box gold" style={{padding:'14px',fontSize:13,textAlign:'center',fontWeight:700}}>Play Mapigo · Cheza Mapigo →</div>
        </div>
      </div>

      <div className="wf-band" style={{padding:'18px'}}>
        <span className="wf-band-tag">§6 Compliance</span>
        <ComplianceBand stack/>
      </div>

      <div className="wf-band" style={{padding:'24px 18px'}}>
        <span className="wf-band-tag">§7 Footer</span>
        <Footer cols={1} />
      </div>
    </div>
  );
}

window.WFMobile = WFMobile;
