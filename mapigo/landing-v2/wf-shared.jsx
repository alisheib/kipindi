/* shared wireframe primitives — used by all 3 breakpoints */

function MonoLabel({ children }) { return <span className="wf-mono">{children}</span>; }

function Pair({ en, sw }) {
  return <div className="wf-pair">{en} · <em>{sw}</em></div>;
}

function NavBar({ compact = false }) {
  return (
    <div className="wf-nav">
      <div className="wf-logo">
        <span style={{width:18,height:18,border:'1.5px solid var(--wf-gold)',borderRadius:'50%',display:'inline-block'}}/>
        kipindi
      </div>
      {!compact && (
        <div className="wf-row" style={{gap:14, fontSize:12, color:'var(--wf-line-strong)'}}>
          <span>Live</span><span>Mapigo</span><span>Pools</span><span>Help</span>
        </div>
      )}
      <div className="wf-row" style={{gap:8}}>
        <span className="wf-mono">EN·SW·FR</span>
        <span className="wf-box outline" style={{padding:'4px 10px',fontSize:11}}>Sign in</span>
        <span className="wf-box blue" style={{padding:'4px 10px',fontSize:11}}>Open account</span>
      </div>
    </div>
  );
}

function NavMobile() {
  return (
    <div className="wf-nav" style={{padding:'10px 12px'}}>
      <div className="wf-logo" style={{fontSize:13}}>
        <span style={{width:14,height:14,border:'1.5px solid var(--wf-gold)',borderRadius:'50%',display:'inline-block'}}/>
        kipindi
      </div>
      <div className="wf-row" style={{gap:6}}>
        <span className="wf-mono" style={{fontSize:9}}>EN·SW</span>
        <span className="wf-box outline" style={{padding:'3px 6px',fontSize:10}}>≡</span>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="wf-trust-strip">
      <span>★ Gaming Board TZ</span>
      <span>NIDA verified</span>
      <span>18+</span>
      <span>Helpline +255 22 211 5811</span>
    </div>
  );
}

function ComplianceBand({ stack = false }) {
  const items = [
    { i:'🛡', t:'NIDA KYC' },
    { i:'💳', t:'M-Pesa · Tigo · Airtel · HaloPesa · Mixx' },
    { i:'⚖', t:'Tanzania Gaming Board' },
    { i:'🆘', t:'18+ Responsible play' },
    { i:'🇹🇿', t:'PDPA compliant' },
  ];
  return (
    <div className={'wf-row'} style={{flexWrap:stack?'wrap':'nowrap', gap:stack?6:12, justifyContent:'space-between'}}>
      {items.map(x => (
        <div key={x.t} className="wf-row" style={{gap:6, fontSize:10, color:'var(--wf-line-strong)', whiteSpace: stack?'normal':'nowrap'}}>
          <span style={{opacity:0.7}}>{x.i}</span>
          <span>{x.t}</span>
        </div>
      ))}
    </div>
  );
}

function Footer({ cols = 3 }) {
  const blocks = [
    { h:'Company', items:['Kipindi Africa Ltd','Dar es Salaam · Posta','TIN xxx-xxx-xxx','Press · Careers'] },
    { h:'Legal',   items:['Terms','Privacy','Responsible Gambling','AML / KYC'] },
    { h:'Help',    items:['Phone +255 22 211 5811','support@kipindi.africa','Helpline','Twitter · Instagram'] },
  ];
  return (
    <div className="wf-col" style={{gap:14}}>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap: cols === 1 ? 12 : 24 }}>
        {blocks.map(b => (
          <div key={b.h} className="wf-col" style={{gap:6}}>
            <MonoLabel>{b.h}</MonoLabel>
            {b.items.map(i => <div key={i} style={{fontSize:11,color:'var(--wf-line-strong)'}}>{i}</div>)}
          </div>
        ))}
      </div>
      <div className="wf-row" style={{justifyContent:'space-between', borderTop:'1px solid var(--wf-line)', paddingTop:10}}>
        <MonoLabel>© 2026 Kipindi · v2.0 · deploy 02-May-26</MonoLabel>
        <MonoLabel>Made in Tanzania</MonoLabel>
      </div>
    </div>
  );
}

function Pin({ n, top, left, right }) {
  return <div className="wf-pin" style={{ top, left, right }}>{n}</div>;
}

window.MonoLabel = MonoLabel;
window.Pair = Pair;
window.NavBar = NavBar;
window.NavMobile = NavMobile;
window.TrustStrip = TrustStrip;
window.ComplianceBand = ComplianceBand;
window.Footer = Footer;
window.Pin = Pin;
