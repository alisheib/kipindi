/* ConvictionSlider — drag a needle along the YES↔NO bar to set BOTH
   side AND stake-multiplier in one gesture.

   Geometry: extends the TippingBar shape. Center = 50/50 (no conviction,
   minimum stake multiplier 1×). Edges = maximum conviction (multiplier
   up to 5×). YES half on the left (emerald), NO half on the right (rose).

   The needle is the same vocabulary as TippingBar's tilt-needle, scaled
   up and made interactive. Drops a soft halo at the drop position so the
   user sees where they "landed" before confirming.
*/

const { useState: useCS, useRef: useCSRef, useEffect: useCSEffect, useCallback: useCSCb } = React;

const ConvictionSlider = ({
  width = 520,
  height = 92,
  baseStake = 5000,             // TZS — multiplied by conviction
  maxMultiplier = 5,
  initial = 0.5,                // 0 = NO edge, 1 = YES edge, 0.5 = center
  onChange,
}) => {
  const [pos, setPos] = useCS(initial);
  const [dragging, setDragging] = useCS(false);
  const trackRef = useCSRef(null);

  // Convert pos (0..1) to side + multiplier.
  // Distance from center → conviction strength. Quadratic ease so the
  // needle "snaps" toward extremes only when dragged near the edges.
  const distFromCenter = Math.abs(pos - 0.5) * 2;       // 0..1
  const conviction = distFromCenter * distFromCenter;    // ease-in
  const multiplier = 1 + conviction * (maxMultiplier - 1);
  const side = pos < 0.5 ? 'NO' : pos > 0.5 ? 'YES' : 'NEUTRAL';
  const stake = Math.round(baseStake * multiplier);

  const sideColor = side === 'YES' ? 'oklch(72% 0.13 152)' : side === 'NO' ? 'oklch(72% 0.16 22)' : 'oklch(72% 0.012 240)';
  const sideAccent = side === 'YES' ? 'oklch(58% 0.16 152)' : side === 'NO' ? 'oklch(60% 0.18 22)' : 'oklch(45% 0.013 240)';

  const setFromClientX = useCSCb((clientX) => {
    if (!trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const next = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setPos(next);
    onChange && onChange({ pos: next, side: next < 0.5 ? 'NO' : next > 0.5 ? 'YES' : 'NEUTRAL', multiplier: 1 + Math.pow(Math.abs(next - 0.5) * 2, 2) * (maxMultiplier - 1) });
  }, [onChange, maxMultiplier]);

  useCSEffect(() => {
    if (!dragging) return;
    const move = (e) => setFromClientX(e.touches ? e.touches[0].clientX : e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, setFromClientX]);

  // ── Render ──────────────────────────────────────────────────────────
  const trackH = 28;                          // bar height
  const trackY = (height - trackH) / 2;
  const needleX = pos * width;
  // Tilt the needle slightly toward the edge it's heading for.
  const tilt = (pos - 0.5) * 16;              // ±8°

  // YES fill grows from center-left edge → toward needle if pos > 0.5;
  // NO fill grows from center-right → toward needle if pos < 0.5.
  const yesW = pos > 0.5 ? (pos - 0.5) * width : 0;
  const noW  = pos < 0.5 ? (0.5 - pos) * width : 0;
  const yesX = width / 2;
  const noX  = pos * width;

  return (
    <div style={{ width, userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Top legend */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        <span style={{ color: pos > 0.5 ? 'oklch(72% 0.13 152)' : 'oklch(60% 0.012 240)' }}>YES</span>
        <span style={{ color: 'oklch(70% 0.012 240)' }}>· conviction ·</span>
        <span style={{ color: pos < 0.5 ? 'oklch(72% 0.16 22)' : 'oklch(60% 0.012 240)' }}>NO</span>
      </div>

      {/* Track + needle */}
      <div
        ref={trackRef}
        onMouseDown={(e) => { setDragging(true); setFromClientX(e.clientX); }}
        onTouchStart={(e) => { setDragging(true); setFromClientX(e.touches[0].clientX); }}
        style={{ position: 'relative', height, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="cs-yes" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor="oklch(40% 0.10 152)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(58% 0.16 152)" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="cs-no" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0%"   stopColor="oklch(40% 0.13 22)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(60% 0.18 22)" stopOpacity="1" />
            </linearGradient>
            <radialGradient id="cs-halo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%"  stopColor={sideAccent} stopOpacity="0.55" />
              <stop offset="60%" stopColor={sideAccent} stopOpacity="0.18" />
              <stop offset="100%" stopColor={sideAccent} stopOpacity="0" />
            </radialGradient>
            <filter id="cs-needle-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="black" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Empty track */}
          <rect x="0" y={trackY} width={width} height={trackH} rx={trackH / 2}
                fill="oklch(18% 0.013 240)" stroke="oklch(28% 0.013 240)" strokeWidth="1" />

          {/* Tick marks at quartiles */}
          {[0.25, 0.5, 0.75].map(t => (
            <line key={t} x1={t * width} x2={t * width}
                  y1={trackY + 4} y2={trackY + trackH - 4}
                  stroke="oklch(35% 0.013 240)" strokeWidth="1" strokeDasharray={t === 0.5 ? '0' : '2 2'} />
          ))}

          {/* YES fill */}
          {yesW > 0 && (
            <rect x={yesX} y={trackY} width={yesW} height={trackH} rx={trackH / 2}
                  fill="url(#cs-yes)" />
          )}
          {/* NO fill */}
          {noW > 0 && (
            <rect x={noX} y={trackY} width={noW} height={trackH} rx={trackH / 2}
                  fill="url(#cs-no)" />
          )}

          {/* Halo behind needle — grows with conviction */}
          <circle cx={needleX} cy={height / 2}
                  r={18 + 30 * conviction}
                  fill="url(#cs-halo)" opacity={0.5 + 0.5 * conviction} />

          {/* Needle group — tilted */}
          <g transform={`translate(${needleX} ${height / 2}) rotate(${tilt})`}
             filter="url(#cs-needle-shadow)">
            {/* Needle stem */}
            <line x1="0" y1={-trackH / 2 - 6} x2="0" y2={trackH / 2 + 6}
                  stroke="oklch(96% 0.005 240)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Top cap (small) */}
            <circle cx="0" cy={-trackH / 2 - 8} r="2.5" fill="oklch(96% 0.005 240)" />
            {/* Bottom cap (small) */}
            <circle cx="0" cy={trackH / 2 + 8} r="2.5" fill="oklch(96% 0.005 240)" />
            {/* Center pill — the draggable knob, colored by side */}
            <rect x="-7" y="-12" width="14" height="24" rx="3"
                  fill={sideAccent} stroke="oklch(96% 0.005 240)" strokeWidth="1.5" />
            {/* Knob inner dot — conviction indicator */}
            <circle cx="0" cy="0" r={1.5 + 1.5 * conviction} fill="oklch(96% 0.005 240)" />
          </g>
        </svg>
      </div>

      {/* Bottom readout */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, marginTop: 14,
        alignItems: 'center',
      }}>
        {/* Side */}
        <div style={{
          fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 22,
          color: sideColor, letterSpacing: '-0.02em',
        }}>
          {side === 'NEUTRAL' ? <span style={{ color: 'oklch(60% 0.012 240)' }}>Pick a side</span> : `${side} side`}
        </div>

        {/* Multiplier */}
        <div style={{
          padding: '8px 14px', borderRadius: 999,
          background: 'oklch(20% 0.013 240)', border: `1px solid ${sideAccent}`,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
          color: sideColor, letterSpacing: '0.02em',
        }}>
          {multiplier.toFixed(2)}× conviction
        </div>

        {/* Stake */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
            Stake
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 18,
            color: 'oklch(96% 0.005 240)', letterSpacing: '-0.02em',
          }}>
            TZS {stake.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Specimen for the canvas.
const ConvictionSliderSpecimen = () => {
  const [base, setBase] = useCS(5000);
  const stakes = [1000, 2000, 5000, 10000, 25000, 50000, 100000];
  return (
    <div className="specimen" style={{ width: 880 }}>
      <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
        Conviction slider
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 720, lineHeight: 1.6 }}>
        One gesture sets BOTH side and stake. Drag the needle: distance from center is conviction (1× → {`${5}×`}); side is which half it lands on. Reuses the TippingBar geometry — same vocabulary, now interactive. Center = "no opinion" (locked at base stake).
      </div>

      <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 28, marginBottom: 20 }}>
        <ConvictionSlider width={520} baseStake={base} initial={0.5} />
      </div>

      <div style={{ marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Base stake · dau msingi
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stakes.map(s => (
          <button key={s} onClick={() => setBase(s)} style={{
            padding: '8px 16px', borderRadius: 999,
            border: `1px solid ${base === s ? 'oklch(58% 0.10 215)' : 'var(--border)'}`,
            background: base === s ? 'oklch(20% 0.04 215)' : 'transparent',
            color: base === s ? 'oklch(85% 0.06 215)' : 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}>
            {s >= 1000 ? `${s / 1000}k` : s}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { pos: 0.08, label: 'Strong NO · 4.65×' },
          { pos: 0.5,  label: 'Neutral · 1.00×' },
          { pos: 0.92, label: 'Strong YES · 4.65×' },
        ].map(p => (
          <div key={p.pos} style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 16 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              {p.label}
            </div>
            <ConvictionSlider width={240} height={72} baseStake={5000} initial={p.pos} />
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { ConvictionSlider, ConvictionSliderSpecimen });
