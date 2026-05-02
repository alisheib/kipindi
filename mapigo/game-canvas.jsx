/* Mapigo Game Canvas — assembled mockup */

function GameCanvas() {
  const [selected, setSelected] = React.useState(null);
  const [stake, setStake] = React.useState(1000);
  const [progress, setProgress] = React.useState(0.42);
  const [placed, setPlaced] = React.useState([
    { t: 0.18, v: 0.85, label: 'SPIKE', state: 'won' },
    { t: 0.55, v: 0.10, label: 'CALM',  state: 'lost' },
  ]);

  React.useEffect(() => {
    const id = setInterval(() => setProgress(p => (p + 0.005) % 1), 200);
    return () => clearInterval(id);
  }, []);

  const pools = { spike: 184500, drift: 92300, calm: 121800 };
  const totalPool = pools.spike + pools.drift + pools.calm;

  const rounds = [
    { id: '4218', actual: 'spike', mult: '2.4', you: true,  youWon: true,  youAmt: '2,400' },
    { id: '4217', actual: 'calm',  mult: '1.8', you: true,  youWon: false, youAmt: '1,000' },
    { id: '4216', actual: 'spike', mult: '3.1', you: true,  youWon: true,  youAmt: '3,100' },
    { id: '4215', actual: 'drift', mult: '2.2', you: false },
    { id: '4214', actual: 'spike', mult: '2.8', you: true,  youWon: true,  youAmt: '2,800' },
    { id: '4213', actual: 'calm',  mult: '1.6', you: false },
  ];

  return (
    <div className="game-canvas" data-theme="dark">
      {/* TOP BAR */}
      <header className="gc-topbar">
        <div className="gc-topbar-left">
          <button className="gc-back" aria-label="Back to Kipindi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18 L9 12 L15 6"/></svg>
          </button>
          <MapigoWordmark height={20} />
        </div>

        <div className="gc-match">
          <div className="gc-match-teams">
            <span className="gc-team">Simba SC</span>
            <span className="gc-score mono">2 — 1</span>
            <span className="gc-team">Yanga SC</span>
          </div>
          <div className="gc-match-meta mono">
            <span className="gc-live"><span className="gc-live-dot" />LIVE</span>
            <span>67'</span>
            <span>Premier League · MD 12</span>
          </div>
        </div>

        <div className="gc-topbar-right">
          <StreakBadge count={3} />
          <button className="gc-icon-btn" aria-label="Sound">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9 L5 15 L9 15 L13 19 L13 5 L9 9 Z"/><path d="M16 8 Q19 12 16 16"/></svg>
          </button>
          <button className="gc-icon-btn" aria-label="Help">?</button>
          <div className="gc-balance">
            <span className="gc-balance-label mono">BAL</span>
            <span className="gc-balance-amt">TZS 18,420</span>
          </div>
        </div>
      </header>

      <div className="gc-body">
        {/* MAIN STAGE */}
        <main className="gc-stage">
          <div className="gc-stage-header">
            <div className="gc-round">
              <PoolRing value={progress} />
              <div>
                <div className="gc-round-label mono">ROUND #4219 · OPEN</div>
                <div className="gc-round-pool">
                  <span className="gc-round-pool-amt">TZS {totalPool.toLocaleString()}</span>
                  <span className="gc-round-pool-sub mono">live pool · 47 players</span>
                </div>
              </div>
            </div>
            <div className="gc-intensity">
              <span className="mono mid">INTENSITY</span>
              <div className="gc-intensity-meter">
                <div className="gc-intensity-bar" style={{ width: '64%' }} />
              </div>
              <span className="mono">0.64</span>
            </div>
          </div>

          <MapigoWaveform mode="live" anchors={placed} roundProgress={progress} />

          <div className="gc-tray-section">
            <div className="gc-tray-head">
              <span className="gc-tray-head-title">Call the next 60 seconds</span>
              <span className="gc-tray-head-sub mono mid">one bet per round · {Math.round((1-progress)*60)}s left</span>
            </div>
            <PredictionTray pools={pools} selected={selected} onSelect={setSelected} />
            <StakeInput value={stake} onChange={setStake} call={selected} onPlace={() => {}} />
          </div>
        </main>

        {/* RIGHT RAIL */}
        <aside className="gc-rail">
          <RoundsFeed rounds={rounds} />

          <div className="gc-leaderboard">
            <div className="gc-leaderboard-head">
              <span>Session leaderboard</span>
              <span className="mono mid">top 5</span>
            </div>
            <ol className="gc-leaderboard-list">
              {[
                { name: 'mwanga_22', pts: '+18,400', won: 9 },
                { name: 'kibichi',   pts: '+12,100', won: 7 },
                { name: 'you',       pts: '+ 8,300', won: 5, isYou: true },
                { name: 'ngalimo',   pts: '+ 6,900', won: 4 },
                { name: 'asha_t',    pts: '+ 4,200', won: 3 },
              ].map((r, i) => (
                <li key={i} className={`lb-row ${r.isYou ? 'is-you' : ''}`}>
                  <span className="lb-rank mono">{i+1}</span>
                  <span className="lb-name">{r.name}</span>
                  <span className="lb-won mono mid">{r.won}w</span>
                  <span className="lb-pts mono">{r.pts}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="gc-footer-compliance mono mid">
            18+ · Play responsibly · Set limits · helpline 0800-mapigo
          </div>
        </aside>
      </div>
    </div>
  );
}

window.GameCanvas = GameCanvas;
