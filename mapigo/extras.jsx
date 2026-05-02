/* Hub tile, splash, mobile mockup, onboarding, etc. */

function HubTilePortrait() {
  return (
    <div className="tile-portrait">
      <svg viewBox="0 0 480 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="tp-bg" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#1F2A52" />
            <stop offset="55%" stopColor="#0B1226" />
            <stop offset="100%" stopColor="#04081A" />
          </radialGradient>
          <linearGradient id="tp-wf" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F0CE6A" />
            <stop offset="100%" stopColor="#B58A21" />
          </linearGradient>
          <linearGradient id="tp-wf-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(222,188,84,0.35)" />
            <stop offset="100%" stopColor="rgba(222,188,84,0)" />
          </linearGradient>
          <filter id="tp-glow"><feGaussianBlur stdDeviation="6"/></filter>
        </defs>
        <rect width="480" height="600" fill="url(#tp-bg)" />
        {/* stars */}
        {Array.from({length: 60}).map((_, i) => {
          const x = (i * 137) % 480;
          const y = (i * 223) % 600;
          const r = (i % 3 === 0) ? 1.5 : 0.8;
          return <circle key={i} cx={x} cy={y} r={r} fill="#F5F1E6" opacity={0.15 + (i%5)*0.05} />;
        })}
        {/* horizon glow */}
        <ellipse cx="240" cy="600" rx="320" ry="80" fill="rgba(222,188,84,0.10)" />
        {/* big spike glow */}
        <circle cx="240" cy="290" r="100" fill="rgba(222,188,84,0.18)" filter="url(#tp-glow)" />

        {/* waveform */}
        <g transform="translate(0 290)">
          <path d="M0 30 L40 30 L70 28 L100 32 L130 26 L160 30 L185 24 L210 28 L230 -110 L240 -150 L250 -90 L265 28 L290 32 L320 24 L350 30 L380 26 L420 30 L480 28 L480 100 L0 100 Z"
                fill="url(#tp-wf-fill)" />
          <path d="M0 30 L40 30 L70 28 L100 32 L130 26 L160 30 L185 24 L210 28 L230 -110 L240 -150 L250 -90 L265 28 L290 32 L320 24 L350 30 L380 26 L420 30 L480 28"
                fill="none" stroke="url(#tp-wf)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="240" cy="-150" r="4" fill="#F0CE6A" />
        </g>
        {/* 60s tick on right edge */}
        <line x1="450" y1="280" x2="475" y2="280" stroke="#DEBC54" strokeWidth="1" />
        <text x="468" y="276" textAnchor="end" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="#DEBC54" letterSpacing="1">60s</text>

        {/* wordmark stamp */}
        <text x="240" y="450" textAnchor="middle" fontSize="44" fontFamily="Sora, sans-serif" fontWeight="600" fill="#F5F1E6" letterSpacing="-0.5">mapigo</text>
        <text x="240" y="478" textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#DEBC54" letterSpacing="3">FEEL THE MATCH · BET THE PULSE</text>
        <text x="240" y="498" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="rgba(222,188,84,0.55)" letterSpacing="2">HISI MECHI · CHEZA MAPIGO</text>
      </svg>
    </div>
  );
}

function HubTileSmall() {
  return (
    <div className="tile-small">
      <svg viewBox="0 0 320 128" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="ts-bg" cx="30%" cy="40%" r="100%">
            <stop offset="0%" stopColor="#1F2A52" />
            <stop offset="80%" stopColor="#0B1226" />
          </radialGradient>
          <linearGradient id="ts-wf" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F0CE6A" />
            <stop offset="100%" stopColor="#B58A21" />
          </linearGradient>
        </defs>
        <rect width="320" height="128" fill="url(#ts-bg)" />
        {Array.from({length: 25}).map((_, i) => {
          const x = (i * 71) % 320; const y = (i * 53) % 128;
          return <circle key={i} cx={x} cy={y} r="0.7" fill="#F5F1E6" opacity={0.15 + (i%4)*0.06} />;
        })}
        <g transform="translate(0 70)">
          <path d="M10 15 L40 15 L60 13 L80 16 L100 12 L120 15 L138 8 L150 -38 L160 -54 L170 -32 L185 14 L210 16 L240 12 L270 14 L310 13"
                fill="none" stroke="url(#ts-wf)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <text x="20" y="36" fontSize="20" fontFamily="Sora, sans-serif" fontWeight="600" fill="#F5F1E6" letterSpacing="-0.3">mapigo</text>
        <text x="20" y="108" fontSize="8" fontFamily="JetBrains Mono, monospace" fill="#DEBC54" letterSpacing="2">FEEL THE MATCH</text>
      </svg>
    </div>
  );
}

window.HubTilePortrait = HubTilePortrait;
window.HubTileSmall = HubTileSmall;

/* ───────────── Mobile mockup ───────────── */
function MobileMockup() {
  const [sel, setSel] = React.useState('spike');
  const pools = { spike: 184500, drift: 92300, calm: 121800 };
  const placed = [
    { t: 0.18, v: 0.85, label: 'SPIKE', state: 'won' },
    { t: 0.55, v: 0.10, label: 'CALM', state: 'lost' },
  ];
  return (
    <div className="mobile-frame">
      <div className="mobile-status mono">
        <span>9:41</span>
        <span style={{display:'flex', gap:6}}>
          <span>●●●●</span><span>5G</span><span>100%</span>
        </span>
      </div>
      <div className="mobile-topbar">
        <button className="gc-back">‹</button>
        <MapigoWordmark height={16} />
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <StreakBadge count={3} />
        </div>
      </div>
      <div className="mobile-match">
        <div className="gc-match-teams" style={{fontSize:14}}>
          <span>Simba SC</span><span className="gc-score" style={{fontSize:14}}>2 — 1</span><span>Yanga SC</span>
        </div>
        <div className="gc-match-meta mono" style={{marginTop:2}}>
          <span className="gc-live"><span className="gc-live-dot" />LIVE</span>
          <span>67'</span>
        </div>
      </div>
      <div className="mobile-round-bar">
        <PoolRing size={42} value={0.42} />
        <div style={{flex:1}}>
          <div className="mono" style={{color:'var(--gold)'}}>ROUND #4219</div>
          <div style={{fontWeight:700, fontFamily:'Sora', fontSize:15}}>TZS 398,600</div>
        </div>
      </div>
      <div style={{padding:'0 12px'}}>
        <MapigoWaveform mode="live" anchors={placed} roundProgress={0.42} />
      </div>
      <div style={{padding:'12px'}}>
        <PredictionTray pools={pools} selected={sel} onSelect={setSel} />
      </div>
      <div className="mobile-nav">
        {['Home','Live','Mapigo','Wallet','Me'].map(n => (
          <div key={n} className={`mn-item ${n==='Mapigo'?'is-active':''}`}>
            {n === 'Mapigo' ? <MapigoGlyph size={20} color={'#F0CE6A'} bg="transparent"/> :
              <div style={{width:20,height:20,border:'1.5px solid currentColor', borderRadius:4, opacity:0.5}}/>}
            <span>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
window.MobileMockup = MobileMockup;

/* ───────────── Onboarding ───────────── */
function Onboarding() {
  const screens = [
    { ttl: 'Watch the pulse of the match', sub: 'Tazama mapigo ya mechi.',
      demo: 'wave' },
    { ttl: 'Will the next 60s spike, drift, or stay calm?', sub: 'Kila dakika, raundi mpya.',
      demo: 'calls' },
    { ttl: 'All stakes pool. Winners share.', sub: 'Madau yote bwawani. Washindi hugawana.',
      demo: 'pool' },
  ];
  return (
    <div className="onboard-row">
      {screens.map((s, i) => (
        <div key={i} className="onboard-card">
          <div className="onboard-step mono">{`0${i+1} / 03`}</div>
          <div className="onboard-demo">
            {s.demo === 'wave' && (
              <svg viewBox="0 0 220 80" width="100%" height="80">
                <path d="M0 50 L40 50 L60 48 L80 52 L100 16 L110 4 L120 30 L140 52 L180 48 L220 50"
                      fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            )}
            {s.demo === 'calls' && (
              <div style={{display:'flex',gap:6,width:'100%'}}>
                {['spike','drift','calm'].map(k => (
                  <div key={k} style={{flex:1, padding:'10px 6px', textAlign:'center',
                    border:`1.5px solid ${CALL_META[k].color}`, borderRadius:8,
                    color: CALL_META[k].color, fontFamily:'Sora', fontWeight:700, fontSize:11, letterSpacing:'0.05em'}}>
                    {CALL_META[k].label}
                  </div>
                ))}
              </div>
            )}
            {s.demo === 'pool' && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:18}}>
                <PoolRing size={64} value={0.7} />
                <div style={{fontFamily:'Sora',fontWeight:700,fontSize:18,color:'var(--gold)'}}>×2.4</div>
              </div>
            )}
          </div>
          <div className="onboard-ttl">{s.ttl}</div>
          <div className="onboard-sub">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
window.Onboarding = Onboarding;

/* ───────────── State gallery (round states + result card) ───────────── */
function StateGallery() {
  const states = [
    { ttl: 'ROUND OPEN', body: <PredictionTray pools={{spike:184500,drift:92300,calm:121800}} selected={null} onSelect={()=>{}} /> },
    { ttl: 'BET PLACED', body:
        <div className="result-card">
          <OutcomePill kind="spike" won />
          <div className="result-card-row">
            <span className="mono mid">Stake</span>
            <span className="mono">TZS 1,000</span>
          </div>
          <div className="result-card-row">
            <span className="mono mid">Pool share</span>
            <span className="mono">0.54%</span>
          </div>
          <div className="result-card-row">
            <span className="mono mid">Resolves in</span>
            <span className="mono" style={{color:'var(--gold)'}}>0:34</span>
          </div>
        </div>
    },
    { ttl: 'ROUND WON', body:
        <div className="result-card win">
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:18,color:'var(--signal-win)'}}>+ TZS 2,400</div>
          <OutcomePill kind="spike" won />
          <div className="result-card-row">
            <span className="mono mid">Multiplier</span><span className="mono" style={{color:'var(--signal-win)'}}>×2.40</span>
          </div>
          <div className="result-card-row">
            <span className="mono mid">Streak</span><span className="mono" style={{color:'var(--gold)'}}>×3</span>
          </div>
        </div>
    },
    { ttl: 'GOAL MOMENT', body:
        <div className="goal-flash-demo">
          <div className="goal-flash-text">GOAL</div>
          <div className="mono mid" style={{marginTop:6}}>67' · Simba SC</div>
        </div>
    },
  ];
  return (
    <div className="state-gallery">
      {states.map((s, i) => (
        <div key={i} className="state-card">
          <div className="state-card-head mono">{s.ttl}</div>
          <div className="state-card-body">{s.body}</div>
        </div>
      ))}
    </div>
  );
}
window.StateGallery = StateGallery;
