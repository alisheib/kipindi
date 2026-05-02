/* WF #2 — /admin/finance */

function WFFinance({ size = 1440 }) {
  return (
    <div className="awf" style={{ width: size }}>
      <Sidebar active="finance"/>
      <div className="awf-main">
        <ConfBand/>
        <TopBar crumbs={['Admin','Finance']}/>
        <PageHead title="Finance" sw="Fedha"
          actions={
            <div style={{display:'flex',gap:6}}>
              <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>↓ CSV · regulator</span>
              <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-gold)',borderRadius:6,background:'rgba(181,138,33,0.10)',color:'var(--awf-gold)'}}>↓ PDF report</span>
            </div>
          }/>
        <div className="awf-body" style={{position:'relative'}}>
          <Pin n="1" top="-8" left="-8"/>
          {/* §A — KPI 7-up */}
          <div className="awf-grid-4">
            <KPI label="Deposits in" sw="Amana"        num="TZS 2.41B"  gold delta="+18%"/>
            <KPI label="Withdrawals out" sw="Utoaji"   num="TZS 1.78B"  delta="+11%"/>
            <KPI label="GGR" sw="Mapato ya jumla"      num="TZS 624M"   gold delta="+14%"/>
            <KPI label="NGR" sw="Mapato halisi"        num="TZS 196M"   gold delta="+8%"/>
          </div>
          <div className="awf-grid-4">
            <KPI label="Tax accrued" sw="Kodi"         num="TZS 31.4M"  delta="TRA · 5%"/>
            <KPI label="Operator margin" sw="Faida"    num="8.1%"       gold delta="+0.4pp"/>
            <KPI label="Wallet liability" sw="Madeni"  num="TZS 412M"   delta="real-time"/>
            <KPI label="Players · paid" sw="Walipwa"   num="11,840"     delta="+6%"/>
          </div>

          <Pin n="2" top="370" left="-8"/>
          {/* §B — Charts row */}
          <div className="awf-grid-2">
            <Card title="Net flow over time" sw="Mtiririko wa pesa">
              <Block tall>AREA CHART · deposits − withdrawals = NGR · 28d daily series</Block>
            </Card>
            <Card title="Operator margin" sw="Faida ya mfumo">
              <Block tall>LINE CHART · margin % · 28d · band 7–10% reference</Block>
            </Card>
          </div>
          <div className="awf-grid-2">
            <Card title="Provider mix over time" sw="Mchanganyiko wa watoa huduma">
              <Block med>STACKED BAR · per-day · M-Pesa · Tigo · Airtel · HaloPesa · Mixx</Block>
            </Card>
            <Card title="Top-10 player concentration" sw="Wachezaji 10 wakubwa">
              <Block med>HORIZONTAL BAR · anonymised p_xxxx · NGR contribution · with risk-flag indicator</Block>
            </Card>
          </div>

          <Pin n="3" top="980" left="-8"/>
          {/* §C — Provider table */}
          <Card title="Provider summary" sw="Muhtasari wa watoa huduma" action={<span className="awf-mono">view as chart →</span>}>
            <div className="awf-table">
              <div className="awf-thead" style={{gridTemplateColumns:'1.4fr repeat(6, 1fr)'}}>
                <span>Provider</span><span>Deposits</span><span>Dep #</span><span>Withdrawals</span><span>WD #</span><span>Fees</span><span>Net</span>
              </div>
              {[
                ['M-Pesa',    '1,012M', '14,892', '742M', '8,140',  '12.4M', '+258M'],
                ['Tigo Pesa', '578M',   '8,402',  '418M', '4,612',  '7.1M',  '+153M'],
                ['Airtel',    '432M',   '6,128',  '328M', '3,420',  '5.6M',  '+98M'],
                ['HaloPesa',  '241M',   '3,180',  '184M', '1,920',  '3.2M',  '+54M'],
                ['Mixx',      '142M',   '1,840',  '102M', '1,012',  '1.8M',  '+38M'],
              ].map((r,i)=>(
                <div key={i} className="awf-tr" style={{gridTemplateColumns:'1.4fr repeat(6, 1fr)'}}>
                  <span style={{fontWeight:600}}>{r[0]}</span>
                  <span className="num">TZS {r[1]}</span>
                  <span className="num">{r[2]}</span>
                  <span className="num">TZS {r[3]}</span>
                  <span className="num">{r[4]}</span>
                  <span className="num loss">−TZS {r[5]}</span>
                  <span className="num gold">{r[6]}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

window.WFFinance = WFFinance;
