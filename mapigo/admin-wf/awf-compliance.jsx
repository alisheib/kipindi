/* WF #4 — /admin/compliance */

function WFCompliance({ size = 1440 }) {
  return (
    <div className="awf" style={{ width: size }}>
      <Sidebar active="compliance"/>
      <div className="awf-main">
        <ConfBand/>
        <TopBar crumbs={['Admin','Compliance']}/>
        <PageHead title="Compliance" sw="Kanuni"
          actions={
            <div style={{display:'flex',gap:6}}>
              <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>↓ GBT monthly</span>
              <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>↓ TRA tax</span>
              <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>↓ FIU SAR</span>
            </div>
          }/>

        <div className="awf-body" style={{position:'relative'}}>
          <Pin n="1" top="-8" left="-8"/>
          {/* §A — Audit chain + backup status row */}
          <div className="awf-grid-2">
            <Card title="Audit chain · integrity" sw="Mlolongo wa ukaguzi">
              <div style={{display:'flex',gap:18,alignItems:'center'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(34,139,90,0.14)',color:'#228B5A',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono',fontWeight:700,fontSize:14}}>OK</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Sora',fontWeight:700,fontSize:14}}>Chain valid · 4,218,902 entries</div>
                  <div className="awf-mono" style={{color:'var(--awf-line-strong)'}}>last verify 09:38 EAT · officer grace.m · HMAC-SHA256</div>
                </div>
                <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>verify now →</span>
              </div>
            </Card>
            <Card title="Backup status" sw="Hali ya nakala">
              <div style={{display:'flex',gap:18,alignItems:'center'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(34,139,90,0.14)',color:'#228B5A',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono',fontWeight:700,fontSize:14}}>✓</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Sora',fontWeight:700,fontSize:14}}>Last snapshot 32 minutes ago</div>
                  <div className="awf-mono" style={{color:'var(--awf-line-strong)'}}>14 in rolling history · 4.2GB · S3 · encrypted</div>
                </div>
                <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>history →</span>
              </div>
            </Card>
          </div>

          <Pin n="2" top="170" left="-8"/>
          {/* §B — KYC funnel + AML queue */}
          <div className="awf-grid-2-asym">
            <Card title="KYC conversion funnel" sw="Hatua za uthibitisho · viwango">
              <Block tall>
                FUNNEL CHART (NEW component) · 4 steps<br/>
                REGISTERED 24,180 → STARTED 21,402 (88.6%) →<br/>
                PENDING 1,890 (8.8%) → APPROVED 19,512 (91.2%)<br/>
                + lateral drop-off counts at each step
              </Block>
            </Card>
            <Card title="AML queue · 7-day"  sw="Foleni ya AML">
              <div className="awf-grid-2" style={{gap:8}}>
                <KPI label="Pending"  sw="Inasubiri"  num="3"   spark={false}  pulse/>
                <KPI label="Approved" sw="Imekubaliwa" num="42"  spark={false}/>
                <KPI label="Rejected" sw="Imekataliwa" num="6"   spark={false}/>
                <KPI label="Avg time" sw="Wastani"     num="14m" spark={false}/>
              </div>
              <div style={{padding:'10px 0',borderTop:'1px dashed var(--awf-line)'}}>
                <div className="awf-mono" style={{marginBottom:6}}>NEXT IN QUEUE</div>
                <div className="awf-feed-row">
                  <span className="ts">09:41</span>
                  <span className="chip danger">AML</span>
                  <span className="body">p_8C12 · withdraw TZS 5.2M · threshold breach · two-person</span>
                </div>
                <div className="awf-feed-row">
                  <span className="ts">08:18</span>
                  <span className="chip danger">AML</span>
                  <span className="body">p_2B41 · rapid-cycle pattern detected · 3 deposits 12m</span>
                </div>
              </div>
            </Card>
          </div>

          <Pin n="3" top="540" left="-8"/>
          {/* §C — Responsible-gambling row */}
          <div className="awf-grid-4">
            <Card title="Self-exclusion" sw="Kujizuia">
              <div style={{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700}}>89</div>
              <div className="awf-mono">active · 12 expiring this week</div>
            </Card>
            <Card title="Cooling-off" sw="Kupumzika">
              <div style={{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700}}>34</div>
              <div className="awf-mono">in progress · avg 4 days</div>
            </Card>
            <Card title="Limit-increase deferrals" sw="Kuongeza kikomo">
              <div style={{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700,color:'var(--awf-gold)'}}>17</div>
              <div className="awf-mono">pending 24h cool-down</div>
            </Card>
            <Card title="Reality-check engagement" sw="Tahadhari ya hali halisi">
              <div className="awf-stack" style={{height:14}}>
                <div style={{flex:62, background:'var(--awf-line-strong)'}}/>
                <div style={{flex:24, background:'var(--awf-gold)'}}/>
                <div style={{flex:14, background:'var(--awf-loss)'}}/>
              </div>
              <div className="awf-mono" style={{fontSize:9}}>62% continued · 24% break · 14% self-excluded</div>
            </Card>
          </div>

          <Pin n="4" top="800" left="-8"/>
          {/* §D — Match integrity + report exports */}
          <div className="awf-grid-2">
            <Card title="Match-integrity alerts · 30 days" sw="Tahadhari za uadilifu">
              <div className="awf-table">
                <div className="awf-thead" style={{gridTemplateColumns:'80px 1fr 100px 110px 80px'}}>
                  <span>When</span><span>Match · league</span><span>Signal</span><span>Severity</span><span>Action</span>
                </div>
                {[
                  ['2 May', 'Coastal Union vs Mwadui · TPL', 'odds shift',     'medium', 'review'],
                  ['28 Apr','Azam vs Singida · TPL',          'late stake spike','high',   'voided'],
                  ['22 Apr','Geita vs Tanzania Prisons · TPL','injury news',   'low',    'monitor'],
                ].map((r,i)=>(
                  <div key={i} className="awf-tr" style={{gridTemplateColumns:'80px 1fr 100px 110px 80px'}}>
                    <span className="awf-mono" style={{fontSize:10}}>{r[0]}</span>
                    <span>{r[1]}</span>
                    <span className="awf-mono" style={{fontSize:10}}>{r[2]}</span>
                    <span><span className={'awf-chip ' + (r[3]==='high'?'danger':r[3]==='medium'?'warn':'neutral')}>{r[3]}</span></span>
                    <span className="awf-mono" style={{color:'var(--awf-royal)',fontSize:10}}>open →</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Regulator report exports" sw="Ripoti za udhibiti">
              <div className="awf-feed">
                {[
                  ['GBT monthly summary',  '01-Apr → 30-Apr · 12 sheets · signed JSON', 'gold'],
                  ['TRA withholding tax',  '01-Apr → 30-Apr · CSV · ready', 'royal'],
                  ['FIU SAR · suspicious', '7-day rolling · 2 entries pending review', 'danger'],
                  ['ISO 27001 audit log',  'last 90 days · CSV', 'neutral'],
                  ['KYC re-verify roster', '142 due in 14 days', 'neutral'],
                  ['Self-exclusion register','cross-operator format · monthly', 'neutral'],
                ].map((r,i)=>(
                  <div key={i} className="awf-feed-row">
                    <span className={'chip ' + r[2]}>↓</span>
                    <span className="body" style={{display:'flex',justifyContent:'space-between',gap:10}}>
                      <span style={{fontWeight:600}}>{r[0]}</span>
                      <span className="awf-mono" style={{color:'var(--awf-line-strong)'}}>{r[1]}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

window.WFCompliance = WFCompliance;
