// ds-charts.jsx — charts + the conviction DIAL (your signature)
const { useState: cgS, useEffect: cgE, useRef: cgR, useCallback: cgCB } = React;

/* ============================================================
   ProbabilityChart — eased line + area + soft bloom + pulsing node
   ============================================================ */
function ProbabilityChart({ data, w = 620, h = 200, color = 'var(--yes-400)', id = 'pc' }) {
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / 100) * h]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const [off, setOff] = cgS(1);
  cgE(() => { const t = setTimeout(() => setOff(0), 80); return () => clearTimeout(t); }, []);
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.18"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" y1={h * g} x2={w} y2={h * g} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 6"/>)}
      <path d={area} fill={`url(#${id}-a)`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: off, transition: 'stroke-dashoffset 1.1s var(--ease-stage)' }} />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />
    </svg>
  );
}

/* Sparkline — tiny inline trend */
function Sparkline({ data, w = 110, h = 30, color = 'var(--accent-400)' }) {
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / 100) * h}`).join(' ');
  return <svg width={w} height={h} style={{ display: 'block' }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/* Pool-depth meter — YES vs NO money */
function PoolDepth({ yesPct = 64 }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 12.5, marginBottom: 7 }}><span style={{ color: 'var(--yes-400)' }}>YES · TZS 30.8M</span><span style={{ color: 'var(--no-400)' }}>NO · TZS 17.4M</span></div>
      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', gap: 3 }}><div style={{ width: `${yesPct}%`, background: 'var(--yes-500)', borderRadius: 999 }} /><div style={{ flex: 1, background: 'var(--no-500)', borderRadius: 999 }} /></div>
    </div>
  );
}

/* ============================================================
   CONVICTION DIAL (linear) — draggable gold needle. The "dial".
   ============================================================ */
function ConvictionSlider({ initial = 50, onChange }) {
  const [v, setV] = cgS(initial); const ref = cgR(null); const drag = cgR(false);
  const set = cgCB((clientX) => {
    const el = ref.current; if (!el) return; const r = el.getBoundingClientRect();
    let p = Math.round(((clientX - r.left) / r.width) * 100); p = Math.max(1, Math.min(99, p)); setV(p); onChange && onChange(p);
  }, [onChange]);
  cgE(() => {
    const mv = (e) => { if (drag.current) set(e.touches ? e.touches[0].clientX : e.clientX); };
    const up = () => { drag.current = false; };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', mv, { passive: false }); window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', mv); window.removeEventListener('touchend', up); };
  }, [set]);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 13, fontWeight: 600, marginBottom: 9 }}><span style={{ color: 'var(--yes-400)' }}>YES {v}%</span><span style={{ color: 'var(--no-400)' }}>NO {100 - v}%</span></div>
      <div ref={ref} onMouseDown={(e) => { drag.current = true; set(e.clientX); }} onTouchStart={(e) => { drag.current = true; set(e.touches[0].clientX); }}
        style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
          <div style={{ width: `${v}%`, height: '100%', background: 'linear-gradient(90deg, var(--yes-700), var(--yes-500))' }} />
        </div>
        {/* gold dial handle */}
        <div style={{ position: 'absolute', left: `${v}%`, transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: 999, background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))', border: '2px solid var(--bg)', boxShadow: '0 0 10px oklch(80% 0.13 84 / 0.7), 0 2px 6px oklch(8% 0.05 264 / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 2, height: 9, background: 'var(--gold-text)', borderRadius: 2, opacity: 0.5 }} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 8, textAlign: 'center' }}>Drag the conviction needle · Buruta sindano</div>
    </div>
  );
}

/* CONVICTION DIAL (round) — radial gauge */
function ConvictionDial({ value = 64, size = 132 }) {
  const r = size / 2 - 12; const cx = size / 2; const cy = size / 2;
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25; // 270° arc
  const a = a0 + (a1 - a0) * (value / 100);
  const pt = (ang, rad) => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
  const arc = (s, e) => { const [x0, y0] = pt(s, r); const [x1, y1] = pt(e, r); return `M${x0} ${y0} A${r} ${r} 0 ${e - s > Math.PI ? 1 : 0} 1 ${x1} ${y1}`; };
  const [nx, ny] = pt(a, r);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arc(a0, a1)} fill="none" stroke="var(--bg-inset)" strokeWidth="9" strokeLinecap="round"/>
      <path d={arc(a0, a)} fill="none" stroke="var(--yes-500)" strokeWidth="9" strokeLinecap="round"/>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--gold-400)" strokeWidth="3" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="5" fill="var(--gold-400)"/>
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ ...mono, fontSize: 26, fontWeight: 700, fill: 'var(--text)' }}>{value}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ ...mono, fontSize: 10, letterSpacing: '0.1em', fill: 'var(--text-subtle)' }}>YES %</text>
    </svg>
  );
}

Object.assign(window, { ProbabilityChart, Sparkline, PoolDepth, ConvictionSlider, ConvictionDial });
