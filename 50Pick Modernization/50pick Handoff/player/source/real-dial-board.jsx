// real-dial-board.jsx — showcases the REAL 50pick conviction dial (user's component)
// Their ConvictionSlider / ConvictionSliderRound are loaded from real-dial-*.jsx
// and are authoritative. This board just frames them on the navy canvas.
const { useState: rdS } = React;

function RealDialBoard() {
  const [base, setBase] = rdS(5000);
  const stakes = [1000, 2000, 5000, 10000, 25000, 50000];
  return (
    <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 8 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>The conviction dial · main feature</div></div>
      <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginBottom: 22, maxWidth: 680, lineHeight: 1.6 }}>
        Production component — unchanged mechanic. One gesture sets <b style={{ color: 'var(--text)' }}>both side and stake</b>: distance from center is conviction (1×→5×, quadratic ease), the half it lands on is the side. Center is genuinely neutral. Numbers roll; the knob tilts and its halo grows with conviction.
      </div>

      {/* Round (final) */}
      <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>ROUND DIAL — FINAL · DRAG IT</div>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 32, marginBottom: 24 }}>
        <ConvictionSliderRound width={640} baseStake={base} initial={0.5} />
      </div>

      {/* Base stake chips */}
      <div style={{ ...mono, fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Base stake · dau msingi</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 26 }}>
        {stakes.map((s) => <button key={s} onClick={() => setBase(s)} style={{ padding: '7px 15px', borderRadius: 999, cursor: 'pointer', ...mono, fontSize: 12, fontWeight: 600,
          border: `1px solid ${base === s ? 'var(--brand-500)' : 'var(--border)'}`,
          background: base === s ? 'oklch(40% 0.08 264 / 0.45)' : 'transparent',
          color: base === s ? 'var(--text)' : 'var(--text-muted)' }}>{s >= 1000 ? `${s / 1000}k` : s}</button>)}
      </div>

      {/* Linear variant */}
      <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>LINEAR VARIANT</div>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 24 }}>
        <ConvictionSlider width={560} baseStake={base} initial={0.5} />
      </div>

      {/* Preset states */}
      <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.1em', marginBottom: 12 }}>STATES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[[0.08, 'Strong NO'], [0.5, 'Neutral'], [0.92, 'Strong YES']].map(([p, label]) => (
          <div key={label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16 }}>
            <div style={{ ...mono, fontSize: 9.5, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
            <ConvictionSliderRound width={250} height={120} baseStake={5000} initial={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { RealDialBoard });
