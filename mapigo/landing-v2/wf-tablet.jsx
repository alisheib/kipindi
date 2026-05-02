/* TABLET WIREFRAME · 768 wide */

function WFTablet() {
  return (
    <div className="wf" style={{ width: 768 }}>
      <NavBar compact />

      <div className="wf-band" style={{padding:'32px 32px', minHeight:480}}>
        <span className="wf-band-tag">§1 Hero</span>
        <div className="wf-col" style={{gap:16}}>
          <MonoLabel>Live pooled betting · Tanzania</MonoLabel>
          <h1 className="wf-display" style={{fontSize:48}}>Bet the window.<br/>Share the pool.</h1>
          <Pair en="One sentence supporting the headline." sw="Sentensi moja inayounga mkono." />
          <div className="wf-row" style={{gap:10}}>
            <div className="wf-box gold" style={{padding:'12px 20px',fontSize:13}}>Try demo · TZS 100,000 →</div>
            <div className="wf-box outline" style={{padding:'12px 20px',fontSize:13}}>Browse matches</div>
          </div>
          <div className="wf-block" style={{height:240,marginTop:8}}>HERO VISUAL · ANIMATED WAVEFORM (full-width below CTAs at 768)</div>
          <TrustStrip />
        </div>
      </div>

      <div className="wf-band" style={{padding:'32px'}}>
        <span className="wf-band-tag">§2 How it works</span>
        <div className="wf-col" style={{gap:18}}>
          <h2 className="wf-display" style={{fontSize:26}}>How it works · <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>Inafanyaje</em></h2>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            {['Pick a window','Pool pays out','Mapigo · live'].map((t,i)=>(
              <div key={t} className="wf-card" style={{gridColumn: i===2 ? '1 / -1' : 'auto'}}>
                <span className="wf-icon">{['⏱','◉','~'][i]}</span>
                <h3 style={{fontSize:15}}>{t}</h3>
                <div style={{fontSize:12,color:'var(--wf-line-strong)',lineHeight:1.5}}>2-line description goes here. Pool / window / Mapigo specifics.</div>
                <Pair en={t} sw={['Chagua dirisha','Bwawa linagawanywa','Soma mapigo'][i]}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wf-band" style={{padding:'32px'}}>
        <span className="wf-band-tag">§3 Live now</span>
        <div className="wf-col" style={{gap:14}}>
          <div className="wf-row" style={{justifyContent:'space-between'}}>
            <h2 className="wf-display" style={{fontSize:24}}>Live now · <em style={{color:'var(--wf-gold)',fontStyle:'italic'}}>Sasa hivi</em></h2>
            <MonoLabel>see all →</MonoLabel>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            {[1,2].map(i=>(
              <div key={i} className="wf-fixture">
                <div className="wf-row" style={{justifyContent:'space-between'}}>
                  <span className="wf-box outline" style={{padding:'2px 6px',fontSize:9}}>TPL</span>
                  <MonoLabel><span style={{color:'var(--wf-gold)'}}>● LIVE 67'</span></MonoLabel>
                </div>
                <div className="wf-row">
                  <span style={{fontSize:12,fontWeight:600}}>Team A</span>
                  <span style={{flex:1,textAlign:'center',color:'var(--wf-gold)',fontFamily:'var(--wf-mono)',fontSize:16,fontWeight:700}}>2 — 1</span>
                  <span style={{fontSize:12,fontWeight:600}}>Team B</span>
                </div>
                <div className="wf-row" style={{justifyContent:'space-between',paddingTop:6,borderTop:'1px solid var(--wf-line)'}}>
                  <span style={{fontFamily:'var(--wf-mono)',fontSize:14,color:'var(--wf-gold)',fontWeight:600}}>TZS 398K</span>
                  <div className="wf-box gold" style={{padding:'4px 10px',fontSize:11}}>Bet →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wf-band wf-dark" style={{padding:'32px', background:'var(--wf-ink)'}}>
        <span className="wf-band-tag">§4 Numbers</span>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:18}}>
          {[
            ['TZS 4.2B','Paid out · Imelipwa'],
            ['142,890','Verified players'],
            ['< 60s','Avg withdrawal'],
            ['ISO 27001','Audit Q3 26'],
          ].map(([n,l])=>(
            <div key={l} className="wf-col" style={{gap:4}}>
              <span style={{fontFamily:'var(--wf-mono)',fontSize:22,color:'var(--wf-gold)',fontWeight:700}}>{n}</span>
              <MonoLabel>{l}</MonoLabel>
            </div>
          ))}
        </div>
      </div>

      <div className="wf-band wf-dark" style={{padding:'40px 32px', background:'#000'}}>
        <span className="wf-band-tag">§5 Mapigo</span>
        <div className="wf-col" style={{gap:14}}>
          <MonoLabel>★ Signature game</MonoLabel>
          <h2 className="wf-display" style={{fontSize:32, color:'#fff'}}>The waveform is the game.</h2>
          <div className="wf-block" style={{height:200}}>WAVEFORM + TRAY</div>
          <div className="wf-box gold" style={{padding:'12px 18px',fontSize:12,width:'fit-content'}}>Play Mapigo →</div>
        </div>
      </div>

      <div className="wf-band" style={{padding:'18px 32px'}}>
        <span className="wf-band-tag">§6 Compliance</span>
        <ComplianceBand stack/>
      </div>

      <div className="wf-band" style={{padding:'32px'}}>
        <span className="wf-band-tag">§7 Footer</span>
        <Footer cols={3} />
      </div>
    </div>
  );
}

window.WFTablet = WFTablet;
