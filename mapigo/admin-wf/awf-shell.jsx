/* Shared admin wireframe shell + atoms */

const NAV_ITEMS = [
  { group: 'OVERVIEW · MUHTASARI', items: [
    { label: 'Overview',    href: '/admin',                key: 'overview' },
    { label: 'Live ops',    href: '/admin/live',           key: 'live' },
  ]},
  { group: 'MONEY · PESA', items: [
    { label: 'Finance',     href: '/admin/finance',        key: 'finance' },
    { label: 'Reports',     href: '/admin/reports',        key: 'reports' },
  ]},
  { group: 'PLAYERS · WACHEZAJI', items: [
    { label: 'Roster',      href: '/admin/players',        key: 'players' },
    { label: 'Cohorts',     href: '/admin/players/cohorts',key: 'cohorts' },
  ]},
  { group: 'GAMES · MICHEZO', items: [
    { label: 'Match betting', href: '/admin/games/match',  key: 'match' },
    { label: 'Window pools',  href: '/admin/games/window', key: 'window' },
    { label: 'Mapigo',        href: '/admin/games/mapigo', key: 'mapigo' },
  ]},
  { group: 'COMPLIANCE · KANUNI', items: [
    { label: 'Compliance',   href: '/admin/compliance',    key: 'compliance', badge: '7' },
    { label: 'AML queue',    href: '/admin/aml',           key: 'aml',         badge: '3' },
    { label: 'Self-exclusions', href: '/admin/self-exclusions', key: 'sx' },
    { label: 'Audit log',    href: '/admin/audit',         key: 'audit' },
  ]},
  { group: 'SYSTEM · MFUMO', items: [
    { label: 'System',       href: '/admin/system',        key: 'system' },
    { label: 'Approvals',    href: '/admin/approvals',     key: 'approvals', badge: '2' },
  ]},
];

function ConfBand() {
  return (
    <div className="awf-conf">
      <span><span className="gold">●</span> STAFF · CONFIDENTIAL · INTERNAL ONLY</span>
      <span>Kipindi Africa · session #4F2A · officer · grace.m@kipindi.africa</span>
    </div>
  );
}

function Sidebar({ active }) {
  return (
    <aside className="awf-side">
      <div className="awf-side-logo">
        <span className="dot"/>
        kipindi · admin
      </div>
      {NAV_ITEMS.map(g => (
        <React.Fragment key={g.group}>
          <div className="awf-side-section">{g.group}</div>
          {g.items.map(it => (
            <div key={it.key} className={'awf-side-link ' + (it.key === active ? 'active' : '')}>
              <span>{it.label}</span>
              {it.badge && <span className="badge">{it.badge}</span>}
            </div>
          ))}
        </React.Fragment>
      ))}
      <div className="awf-side-foot">
        <div>v2.4.0 · deploy 02-May-26</div>
        <div style={{marginTop:4}}>EN · SW · FR</div>
      </div>
    </aside>
  );
}

function TopBar({ crumbs = [] }) {
  return (
    <div className="awf-topbar">
      <div className="awf-crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span>/</span>}
            <span className={i === crumbs.length - 1 ? '' : ''}>{i === crumbs.length - 1 ? <b>{c}</b> : c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="awf-top-actions">
        <input className="awf-search" placeholder="Search players · IDs · audit · ⌘K" readOnly/>
        <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6}}>EN·<span style={{color:'var(--awf-gold)',fontWeight:700}}>SW</span>·FR</span>
        <span className="awf-mono" style={{padding:'6px 10px',border:'1px solid var(--awf-line)',borderRadius:6,background:'#fff'}}>● Grace M.</span>
      </div>
    </div>
  );
}

function PageHead({ title, sw, period = true, actions }) {
  return (
    <div className="awf-page-head">
      <div>
        <h1>{title}</h1>
        <div className="awf-pair" style={{marginTop:4}}>{title} · <em>{sw}</em></div>
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        {period && (
          <div className="awf-period">
            <span>Today</span>
            <span className="active">7d</span>
            <span>28d</span>
            <span>QTD</span>
            <span>Custom</span>
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}

function KPI({ label, sw, num, gold, delta, deltaDir = 'up', spark = true, pulse = false }) {
  return (
    <div className="awf-kpi">
      <div className="awf-kpi-label">
        <span className="awf-mono">{label}</span>
        {pulse && <span className="awf-pulse">live</span>}
      </div>
      <div className={'awf-kpi-num ' + (gold ? 'gold' : '')}>{num}</div>
      <div className="awf-pair" style={{fontSize:10}}>{label} · <em>{sw}</em></div>
      <div className="awf-kpi-foot">
        {spark && <div className="awf-kpi-spark"/>}
        {delta && <span className={'awf-delta ' + deltaDir}>{deltaDir === 'up' ? '▲' : '▼'} {delta}</span>}
      </div>
    </div>
  );
}

function Block({ tall, med, short, children }) {
  const cls = tall ? 'tall' : (short ? 'short' : 'med');
  return <div className={'awf-block ' + cls}>{children}</div>;
}

function Card({ title, sw, action, children, padding = 16 }) {
  return (
    <div className="awf-card" style={{padding}}>
      <div className="awf-card-h">
        <div>
          <div className="awf-card-title">{title}</div>
          {sw && <div className="awf-pair" style={{fontSize:10}}>{title} · <em>{sw}</em></div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pin({ n, top, left, right }) {
  return <div className="awf-pin" style={{ top, left, right }}>{n}</div>;
}

Object.assign(window, { ConfBand, Sidebar, TopBar, PageHead, KPI, Block, Card, Pin });
