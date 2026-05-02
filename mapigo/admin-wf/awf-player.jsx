/* WF #3 — /admin/players/[id] */

function WFPlayer({ size = 1440 }) {
  return (
    <div className="awf" style={{ width: size }}>
      <Sidebar active="players"/>
      <div className="awf-main">
        <ConfBand/>
        <TopBar crumbs={['Admin','Players','p_4F92A1']}/>
        <PageHead title="Player profile" sw="Wasifu wa mchezaji" period={false}
          actions={<span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>↓ Export user data · GDPR Art 15</span>}/>

        <div className="awf-body" style={{position:'relative'}}>
          <Pin n="1" top="-8" left="-8"/>
          {/* §A — Identity card */}
          <Card>
            <div style={{display:'flex',gap:18,alignItems:'center'}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:'var(--awf-fill-2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora',fontWeight:700,fontSize:22,color:'var(--awf-line-strong)'}}>NM</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Sora',fontWeight:700,fontSize:22}}>Neema Mwangosi</div>
                <div className="awf-mono" style={{marginTop:4}}>p_4F92A1B7 · +255 712 ••• 482 · Mainland TZ · Dar es Salaam · joined 14-Mar-25</div>
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  <span className="awf-chip success">● ACTIVE</span>
                  <span className="awf-chip royal">KYC · TIER 2</span>
                  <span className="awf-chip neutral">NIDA verified</span>
                  <span className="awf-chip warn">limit set · 500K/day</span>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="awf-mono">RISK SCORE</div>
                <div style={{fontFamily:'JetBrains Mono',fontWeight:700,fontSize:30,color:'var(--awf-gold)'}}>42</div>
                <div className="awf-mono" style={{color:'var(--awf-line-strong)'}}>medium · review monthly</div>
              </div>
            </div>
          </Card>

          <Pin n="2" top="148" left="-8"/>
          {/* §B — Quick stats strip */}
          <div className="awf-grid-4">
            <KPI label="Lifetime deposit" sw="Jumla ya amana" num="TZS 4.82M" gold delta="last 18 days"/>
            <KPI label="Lifetime withdrawal" sw="Jumla ya utoaji" num="TZS 3.61M" delta="last 12 days"/>
            <KPI label="NGR contribution" sw="Mchango wa mapato" num="TZS 218k" gold delta="+5%"/>
            <KPI label="Bets · count" sw="Idadi ya beti" num="1,402" delta="last bet 14m ago"/>
          </div>

          <Pin n="3" top="380" left="-8"/>
          {/* §C — Tabs */}
          <Card padding={0}>
            <div className="awf-tabs" style={{padding:'0 18px'}}>
              <span className="active">Activity</span>
              <span>Bets · 1,402</span>
              <span>Transactions · 89</span>
              <span>KYC</span>
              <span>Limits</span>
              <span>Self-exclusion</span>
              <span>Audit · 2,140</span>
            </div>
            <div style={{padding:18}}>
              <div className="awf-feed">
                {[
                  ['09:42:18', 'gold',   'BET',     'Placed Mapigo · DRIFT · TZS 5,000 · round #4219'],
                  ['09:39:11', 'royal',  'WALLET',  'Deposit TZS 250,000 · M-Pesa · ref X-9821'],
                  ['09:32:48', 'gold',   'BET',     'Settled W_30_45 · won TZS 12,400 · pool share 8.2%'],
                  ['08:18:02', 'royal',  'AUTH',    'Sign-in · 4G · Dar es Salaam · device #c84'],
                  ['07:11:35', 'neutral','LIMIT',   'Reality-check shown after 45m session · acknowledged'],
                ].map((r,i)=>(
                  <div key={i} className="awf-feed-row">
                    <span className="ts">{r[0]}</span>
                    <span className={'chip ' + r[1]}>{r[2]}</span>
                    <span className="body">{r[3]}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Pin n="4" top="720" left="-8"/>
          {/* §D — Sticky actions + 2-person approval */}
          <Card title="Privileged actions · two-person approval required" sw="Vitendo vya udhibiti · idhini ya watu wawili">
            <div className="awf-approval">
              <span className="ico">2P</span>
              <div style={{flex:1,fontSize:12}}>
                Two-person approval queue · all wallet / KYC overrides require a second compliance officer countersign within 30 minutes. Pending requests appear here and in the Compliance officer's queue.
              </div>
              <span className="awf-chip gold">0 PENDING ON THIS PLAYER</span>
            </div>
            <div className="awf-sticky-actions">
              <span className="awf-mono" style={{color:'rgba(255,255,255,0.55)'}}>EVERY ACTION GENERATES AN AUDIT ENTRY · REASON FIELD REQUIRED</span>
              <div style={{display:'flex',gap:6}}>
                <span className="btn">Freeze wallet</span>
                <span className="btn">Refund</span>
                <span className="btn">Manual self-exclude</span>
                <span className="btn">Force KYC re-verify</span>
                <span className="btn danger">Close account</span>
                <span className="btn gold">Request approval →</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.WFPlayer = WFPlayer;
