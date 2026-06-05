/* ConvictionSliderRound — final.

   A clean, weighted dial. Squircle silhouette (softer than a circle, more
   distinctive than a pill). Live multiplier + side on the face. Subtle
   side-tinted ring grows with conviction. Tilts toward direction of drag.
   Genuine neutral grey at center.

   The multiplier and stake numbers roll smoothly (tween toward target)
   instead of jumping — same vocabulary as FiftyMark's spinning numerals,
   but for the commitment gesture. Tells the user "this is precise; this
   is money."
*/

const { useState: useCSR, useRef: useCSRRef, useEffect: useCSREffect, useCallback: useCSRCb } = React;

// Smoothly tween a value toward a target. Critically-damped style — no
// overshoot, settles in ~150ms. Returns the displayed value.
const useRollingNumber = (target, { stiffness = 0.22 } = {}) => {
  const [value, setValue] = React.useState(target);
  const valueRef = React.useRef(target);
  const targetRef = React.useRef(target);
  const rafRef = React.useRef(null);
  React.useEffect(() => {
    targetRef.current = target;
    if (rafRef.current) return;
    const tick = () => {
      const v = valueRef.current;
      const t = targetRef.current;
      const diff = t - v;
      if (Math.abs(diff) < 0.0008) {
        valueRef.current = t;
        setValue(t);
        rafRef.current = null;
        return;
      }
      const next = v + diff * stiffness;
      valueRef.current = next;
      setValue(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [target, stiffness]);
  React.useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  return value;
};

// Build a smooth squircle path (superellipse n=4) of given radius.
// Returns path commands centered at (0,0).
const squirclePath = (r) => {
  const n = 4;
  const steps = 64;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * r;
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * r;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
  }
  return d + 'Z';
};

const ConvictionSliderRound = ({
  width = 560,
  height = 140,
  baseStake = 5000,
  maxMultiplier = 5,
  initial = 0.5,
  onChange,
}) => {
  const [pos, setPos] = useCSR(initial);
  const [dragging, setDragging] = useCSR(false);
  const [hover, setHover] = useCSR(false);
  const trackRef = useCSRRef(null);

  const distFromCenter = Math.abs(pos - 0.5) * 2;
  const conviction = distFromCenter * distFromCenter; // ease-in
  const multiplierTarget = 1 + conviction * (maxMultiplier - 1);
  const NEUTRAL_BAND = 0.04;
  const isNeutral = distFromCenter < NEUTRAL_BAND;
  const side = isNeutral ? 'NEUTRAL' : (pos < 0.5 ? 'NO' : 'YES');
  const stakeTarget = baseStake * multiplierTarget;

  // Rolling values — what's actually displayed.
  const multiplier = useRollingNumber(multiplierTarget);
  const stakeRolled = useRollingNumber(stakeTarget);
  const stake = Math.round(stakeRolled);

  // Color: stays neutral grey through center, fades into side accent.
  // We use a strength factor that's 0 inside the neutral band, ramps up after.
  const strength = Math.max(0, (distFromCenter - NEUTRAL_BAND) / (1 - NEUTRAL_BAND));
  const sideHue = side === 'YES' ? 152 : side === 'NO' ? 22 : 240;
  const sideChroma = side === 'NEUTRAL' ? 0 : (side === 'YES' ? 0.16 : 0.18);

  // Knob fill: dark steel at neutral, side-tinted at extreme
  const knobBg    = `oklch(${22 + 4 * strength}% ${0.012 + sideChroma * 0.4 * strength} ${sideHue})`;
  const knobBgTop = `oklch(${32 + 6 * strength}% ${0.012 + sideChroma * 0.5 * strength} ${sideHue})`;
  const ringColor = side === 'NEUTRAL'
    ? 'oklch(45% 0.013 240)'
    : (side === 'YES' ? 'oklch(58% 0.16 152)' : 'oklch(60% 0.18 22)');
  const sideAccent = ringColor;
  const sideText = side === 'YES' ? 'oklch(80% 0.13 152)' : side === 'NO' ? 'oklch(80% 0.14 22)' : 'oklch(75% 0.012 240)';

  const setFromClientX = useCSRCb((clientX) => {
    if (!trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const next = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setPos(next);
    onChange && onChange({ pos: next, side: next < 0.5 ? 'NO' : next > 0.5 ? 'YES' : 'NEUTRAL', multiplier });
  }, [onChange, multiplier]);

  useCSREffect(() => {
    if (!dragging) return;
    const move = (e) => { e.preventDefault(); setFromClientX(e.touches ? e.touches[0].clientX : e.clientX); };
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

  // Geometry
  const trackH = 12;
  const trackY = height / 2 - trackH / 2;
  const knobR = 28;
  const knobScale = 1 + 0.08 * conviction + (dragging ? 0.04 : 0);
  const needleX = pos * (width - knobR * 2) + knobR;
  const tilt = (pos - 0.5) * 18;               // ±9°

  const yesFillW = pos > 0.5 ? (pos - 0.5) * width : 0;
  const noFillW  = pos < 0.5 ? (0.5 - pos) * width : 0;

  const sqPath = squirclePath(knobR);

  return (
    <div style={{ width, userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: 'oklch(60% 0.012 240)', letterSpacing: '0.16em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        <span style={{ color: side === 'YES' ? 'oklch(75% 0.13 152)' : 'oklch(48% 0.012 240)', fontWeight: side === 'YES' ? 700 : 400, transition: 'color 200ms' }}>YES</span>
        <span style={{ color: 'oklch(65% 0.012 240)', letterSpacing: '0.18em' }}>· slide to commit ·</span>
        <span style={{ color: side === 'NO' ? 'oklch(75% 0.16 22)' : 'oklch(48% 0.012 240)', fontWeight: side === 'NO' ? 700 : 400, transition: 'color 200ms' }}>NO</span>
      </div>

      <div
        ref={trackRef}
        onMouseDown={(e) => { setDragging(true); setFromClientX(e.clientX); }}
        onTouchStart={(e) => { setDragging(true); setFromClientX(e.touches[0].clientX); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ position: 'relative', height, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="csrf-yes" x1="0" x2="1">
              <stop offset="0%"  stopColor="oklch(40% 0.10 152)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(58% 0.16 152)" />
            </linearGradient>
            <linearGradient id="csrf-no" x1="1" x2="0">
              <stop offset="0%"  stopColor="oklch(40% 0.13 22)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(60% 0.18 22)" />
            </linearGradient>
            <radialGradient id="csrf-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%"  stopColor={sideAccent} stopOpacity="0.55" />
              <stop offset="55%" stopColor={sideAccent} stopOpacity="0.15" />
              <stop offset="100%" stopColor={sideAccent} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="csrf-knob" x1="0.5" x2="0.5" y1="0" y2="1">
              <stop offset="0%"  stopColor={knobBgTop} />
              <stop offset="100%" stopColor={knobBg} />
            </linearGradient>
            <filter id="csrf-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="black" floodOpacity="0.5" />
            </filter>
            <style>{`
              @keyframes csrf-breathe { 0%,100% { opacity: 0.35; } 50% { opacity: 0.7; } }
              .csrf-rest-ring { animation: csrf-breathe 2.4s ease-in-out infinite; }
            `}</style>
          </defs>

          {/* Track */}
          <rect x="0" y={trackY} width={width} height={trackH} rx={trackH / 2}
                fill="oklch(17% 0.013 240)" stroke="oklch(26% 0.013 240)" strokeWidth="1" />

          {/* Subtle midpoint marker only */}
          <line x1={width / 2} x2={width / 2}
                y1={trackY - 4} y2={trackY + trackH + 4}
                stroke="oklch(35% 0.013 240)" strokeWidth="1" />

          {/* Side fills from center */}
          {yesFillW > 0 && (
            <rect x={width / 2} y={trackY} width={yesFillW} height={trackH} rx={trackH / 2}
                  fill="url(#csrf-yes)" />
          )}
          {noFillW > 0 && (
            <rect x={pos * width} y={trackY} width={noFillW} height={trackH} rx={trackH / 2}
                  fill="url(#csrf-no)" />
          )}

          {/* Conviction halo */}
          {strength > 0 && (
            <circle cx={needleX} cy={height / 2}
                    r={knobR * (1.7 + 1.0 * conviction)}
                    fill="url(#csrf-glow)" />
          )}

          {/* Idle breathing ring at center */}
          {!dragging && !hover && isNeutral && (
            <path d={squirclePath(knobR + 6)}
                  transform={`translate(${needleX} ${height / 2})`}
                  fill="none" stroke="oklch(55% 0.012 240)" strokeWidth="1.1"
                  className="csrf-rest-ring" />
          )}

          {/* Knob */}
          <g transform={`translate(${needleX} ${height / 2}) rotate(${tilt}) scale(${knobScale})`}
             filter="url(#csrf-shadow)">
            {/* Squircle body */}
            <path d={sqPath}
                  fill="url(#csrf-knob)"
                  stroke={ringColor}
                  strokeWidth={1.5 + 1.2 * strength} />
            {/* Inner subtle inset */}
            <path d={squirclePath(knobR - 5)}
                  fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.5" opacity="0.12" />
            {/* Multiplier on face — counter-rotated to stay upright */}
            <g transform={`rotate(${-tilt})`}>
              <text x="0" y="-2" textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace" fontWeight="700"
                    fontSize="15" fill="oklch(96% 0.005 240)" letterSpacing="-0.02em">
                {multiplier.toFixed(2)}×
              </text>
              <text x="0" y="11" textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace" fontWeight="500"
                    fontSize="7.5" fill={sideText}
                    letterSpacing="0.16em" opacity="0.9">
                {side === 'NEUTRAL' ? '· · ·' : side}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Readout */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18,
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            {side === 'NEUTRAL' ? 'No conviction' : 'You are picking'}
          </div>
          <div style={{
            fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 24,
            color: sideText, letterSpacing: '-0.025em', lineHeight: 1,
          }}>
            {side === 'NEUTRAL' ? 'drag the dial' : `${side} · ${multiplier.toFixed(1)}×`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'oklch(60% 0.012 240)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            Stake · dau
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 22,
            color: 'oklch(96% 0.005 240)', letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            TZS {stake.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

const ConvictionSliderRoundSpecimen = () => (
  <div className="specimen" style={{ width: 880 }}>
    <div className="display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
      Conviction dial
    </div>
    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 720, lineHeight: 1.6 }}>
      Squircle dial with the live multiplier on its face. One gesture sets BOTH side and stake. Distance from center = conviction (1× → 5×). Center is genuinely neutral; side tint and conviction halo grow as you drag away.
    </div>
    <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 36 }}>
      <ConvictionSliderRound width={620} initial={0.5} baseStake={5000} />
    </div>
  </div>
);

Object.assign(window, { ConvictionSliderRound, ConvictionSliderRoundSpecimen });
