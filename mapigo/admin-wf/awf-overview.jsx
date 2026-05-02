/* WF #1 — /admin Overview cockpit */

function WFOverview({ size = 1440 }) {
  return (
    <div className="awf" style={{ width: size }}>
      <Sidebar active="overview" />
      <div className="awf-main">
        <ConfBand />
        <TopBar crumbs={['Admin', 'Overview']} />
        <PageHead title="Overview" sw="Muhtasari" actions={<span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>↻ refresh · 5s</span>}/>

        <div className="awf-body" style={{position:'relative'}}>
          <Pin n="1" top="-8" left="-8"/>
          {/* §A — KPI strip */}
          <div className="awf-grid-4">
            <KPI label="Active players" sw="Wachezaji hai" num="14,287" delta="+8.2%" pulse/>
            <KPI label="GGR · 24h" sw="Mapato ya jumla" num="TZS 124.6M" gold delta="+12.4%"/>
            <KPI label="NGR · 24h" sw="Mapato halisi" num="TZS 38.2M" gold delta="−2.1%" deltaDir="down"/>
            <KPI label="AML pending" sw="Mapitio yanayosubiri" num="3" delta="needs review" deltaDir="up" pulse/>
          </div>

          <Pin n="2" top="200" left="-8"/>
          {/* §B — Money flow + activity */}
          <div className="awf-grid-2-asym">
            <Card title="24-hour money flow" sw="Mtiririko wa pesa" action={<span className="awf-mono">view as table →</span>}>
              <Block tall>
                STACKED AREA · TZS / time<br/>
                + deposits / +bets stacked above<br/>
                − withdrawals / −payouts stacked below<br/>
                hover: per-minute breakdown
              </Block>
            </Card>
            <Card title="Live activity feed" sw="Shughuli za moja kwa moja" action={<span className="awf-mono">audit →</span>}>
              <div className="awf-feed" style={{maxHeight:360,overflow:'hidden'}}>
                {[
                  ['09:42:18', 'royal',  'WALLET',     'Player p_4F92 deposited TZS 250,000 via M-Pesa'],
                  ['09:41:52', 'gold',   'BET',        'Mapigo round #4219 settled · 47 players · pool TZS 398,600'],
                  ['09:41:11', 'danger', 'AML',        'Threshold breach · withdraw TZS 5.2M flagged for review'],
                  ['09:40:33', 'royal',  'AUTH',       'Officer grace.m signed in · session #4F2A'],
                  ['09:40:02', 'gold',   'BET',        'Window W_45_60 settled · Simba·Yanga · pool TZS 612,400'],
                  ['09:39:48', 'neutral','KYC',        'NIDA verification confirmed for u_8C12 · auto-approved'],
                  ['09:39:11', 'royal',  'WALLET',     'Withdraw TZS 80,000 to Tigo Pesa · settled'],
                ].map((r,i)=>(
                  <div key={i} className="awf-feed-row">
                    <span className="ts">{r[0]}</span>
                    <span className={'chip ' + r[1]}>{r[2]}</span>
                    <span className="body">{r[3]}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Pin n="3" top="640" left="-8"/>
          {/* §C — Secondary tiles */}
          <div className="awf-grid-4">
            <Card title="KYC funnel" sw="Hatua za uthibitisho">
              <div className="awf-funnel">
                {[['REG','24,180'],['STARTED','21,402'],['PENDING','1,890'],['APPROVED','19,512']].map(([l,n])=>(
                  <div key={l} className="awf-funnel-step"><span className="n">{n}</span><span className="l">{l}</span></div>
                ))}
              </div>
              <div className="awf-pair" style={{fontSize:10}}>conversion 80.6% · <em>uthibitisho</em></div>
            </Card>
            <Card title="Provider mix" sw="Watoa huduma ya simu">
              <div className="awf-stack">
                <div style={{flex:42, background:'var(--awf-royal)'}}>M-Pesa 42%</div>
                <div style={{flex:24, background:'var(--awf-gold)'}}>Tigo 24%</div>
                <div style={{flex:18, background:'#3a4a76'}}>Airtel 18%</div>
                <div style={{flex:10, background:'#7588B1'}}>Halo</div>
                <div style={{flex:6,  background:'#A6B0C8'}}>Mixx</div>
              </div>
              <div className="awf-pair" style={{fontSize:10}}>last 24h volume share · <em>asilimia</em></div>
            </Card>
            <Card title="Self-exclusion" sw="Kujizuia">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700}}>89</span>
                <span className="awf-delta down">▼ 12% mom</span>
              </div>
              <div className="awf-pair" style={{fontSize:10}}>active roster · 12 expiring this week</div>
            </Card>
            <Card title="Match-integrity alerts" sw="Tahadhari za uadilifu">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700,color:'var(--awf-danger)'}}>2</span>
                <span className="awf-mono" style={{color:'var(--awf-danger)'}}>open · last 24h</span>
              </div>
              <div className="awf-pair" style={{fontSize:10}}>Sportradar feed · last sync 38s ago</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

window.WFOverview = WFOverview;
