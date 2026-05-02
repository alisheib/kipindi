/* PredictionTray, RoundsFeed, StreakBadge, OutcomePill, RoundResultCard */

const CALL_META = {
  spike: { color: 'var(--mapigo-spike)', label: 'SPIKE',  sub: 'Big peak coming',
           icon: <path d="M9 3 L4 13 L9 13 L7 21 L14 9 L9 9 Z" /> },
  drift: { color: 'var(--mapigo-drift)', label: 'DRIFT',  sub: 'Gradual rise / fall',
           icon: <path d="M3 12 Q9 4 12 12 T21 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /> },
  calm:  { color: 'var(--mapigo-calm)',  label: 'CALM',   sub: 'No big events',
           icon: <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /> },
};

function CallIcon({ kind, size = 22 }) {
  const meta = CALL_META[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={kind === 'spike' ? 'currentColor' : 'none'}
         stroke={kind === 'spike' ? 'none' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {meta.icon}
    </svg>
  );
}

function PredictionTray({ pools, selected, onSelect, disabled }) {
  return (
    <div className="pred-tray">
      {['spike', 'drift', 'calm'].map(k => {
        const m = CALL_META[k];
        const isSel = selected === k;
        return (
          <button key={k}
            className={`pred-btn ${isSel ? 'is-selected' : ''}`}
            style={{ '--accent': m.color }}
            disabled={disabled}
            onClick={() => onSelect(k)}>
            <div className="pred-btn-row">
              <CallIcon kind={k} size={20} />
              <span className="pred-btn-label">{m.label}</span>
            </div>
            <div className="pred-btn-sub">{m.sub}</div>
            <div className="pred-btn-pool">
              <span className="pred-btn-pool-tzs">TZS</span>
              <span className="pred-btn-pool-amt">{pools[k].toLocaleString()}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StakeInput({ value, onChange, onPlace, currency = 'TZS', call }) {
  const chips = [500, 1000, 2500, 5000, 10000];
  return (
    <div className="stake-input">
      <div className="stake-input-row">
        <div className="stake-input-field">
          <span className="stake-input-currency">{currency}</span>
          <input type="text" value={value.toLocaleString()}
                 onChange={(e) => onChange(parseInt(e.target.value.replace(/\D/g,'')) || 0)} />
        </div>
        <button className="stake-place" disabled={!call} style={{ '--accent': call ? CALL_META[call].color : 'var(--text-low)' }}
                onClick={onPlace}>
          {call ? `Place ${CALL_META[call].label}` : 'Pick a call'}
        </button>
      </div>
      <div className="stake-chips">
        {chips.map(c => (
          <button key={c} className="stake-chip" onClick={() => onChange(c)}>+{c.toLocaleString()}</button>
        ))}
      </div>
    </div>
  );
}

function OutcomePill({ kind, won }) {
  const m = CALL_META[kind];
  return (
    <span className="outcome-pill" style={{
      '--accent': m.color,
      opacity: won ? 1 : 0.55
    }}>
      <CallIcon kind={kind} size={11} />
      {m.label}
    </span>
  );
}

function MiniWaveform({ kind }) {
  const paths = {
    spike: 'M0 12 L8 12 L10 11 L12 12 L14 4 L16 18 L18 11 L20 12 L28 12',
    drift: 'M0 16 Q7 14 14 10 T28 4',
    calm:  'M0 12 L4 11 L8 13 L12 11 L16 13 L20 11 L24 13 L28 12'
  };
  return (
    <svg width="32" height="20" viewBox="0 0 28 20">
      <path d={paths[kind]} fill="none" stroke="var(--gold)" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function RoundsFeed({ rounds }) {
  return (
    <div className="rounds-feed">
      <div className="rounds-feed-head">
        <span>Recent rounds</span>
        <span className="mono mid">last 6</span>
      </div>
      <ul className="rounds-feed-list">
        {rounds.map((r, i) => (
          <li key={i} className="round-row">
            <MiniWaveform kind={r.actual} />
            <div className="round-row-mid">
              <span className="mono">#{r.id}</span>
              <OutcomePill kind={r.actual} won />
            </div>
            <div className="round-row-right">
              <span className="mono mid">×{r.mult}</span>
              {r.you && <span className={`round-row-you ${r.youWon ? 'win' : 'lose'}`}>
                {r.youWon ? '+' : '−'}{r.youAmt}
              </span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StreakBadge({ count }) {
  if (!count || count < 3) return null;
  return (
    <div className="streak-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 L4 14 L11 14 L10 22 L20 9 L13 9 Z" />
      </svg>
      Streak ×{count}
    </div>
  );
}

function PoolRing({ size = 56, value = 0.62 }) {
  const r = size/2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pool-ring">
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--border-subtle)" strokeWidth="3" fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--gold)" strokeWidth="3" fill="none"
              strokeDasharray={c} strokeDashoffset={c * (1 - value)}
              strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="54%" textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono, monospace"
            fill="var(--text-hi)" fontWeight="600">
        {Math.round(value * 60)}s
      </text>
    </svg>
  );
}

window.PredictionTray = PredictionTray;
window.StakeInput = StakeInput;
window.RoundsFeed = RoundsFeed;
window.StreakBadge = StreakBadge;
window.OutcomePill = OutcomePill;
window.PoolRing = PoolRing;
window.CallIcon = CallIcon;
window.CALL_META = CALL_META;
