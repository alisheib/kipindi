/* Landing-page primitives shared across all three variations */

const { useState, useEffect, useRef, useMemo } = React;

/* ─── Live waveform hero (loops continuously) ──────────────────────────── */
function LandingWaveform({
  height = 360,
  width = 1280,
  stroke = 3,
  glow = true,
  fill = true,
  label = true,
  speed = 1
}) {
  const [tick, setTick] = useState(0);
  const samplesRef = useRef(new Float32Array(240));
  const spikeRef = useRef({ active: false, decay: 0, peak: 0 });
  const cooldownRef = useRef(40);

  useEffect(() => {
    let raf, last = performance.now(), acc = 0;
    const loop = (now) => {
      const dt = Math.min(60, now - last); last = now;
      acc += dt * speed;
      while (acc > 220) {
        acc -= 220;
        const arr = samplesRef.current;
        const next = new Float32Array(240);
        next.set(arr.subarray(1), 0);
        const tt = now / 1000;
        let v = Math.sin(tt * 1.4) * 0.14 + Math.sin(tt * 0.5) * 0.06;
        cooldownRef.current--;
        if (cooldownRef.current <= 0 && Math.random() < 0.08) {
          spikeRef.current = { active: true, decay: 1, peak: 0.7 + Math.random() * 0.25 };
          cooldownRef.current = 30 + Math.random() * 50;
        }
        if (spikeRef.current.active) {
          v += spikeRef.current.peak * spikeRef.current.decay;
          spikeRef.current.decay *= 0.78;
          if (spikeRef.current.decay < 0.05) spikeRef.current.active = false;
        }
        next[239] = v;
        samplesRef.current = next;
      }
      setTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  const { path, fillPath } = useMemo(() => {
    const samples = samplesRef.current;
    const stepX = width / (samples.length - 1);
    const midY = height * 0.55;
    const amp = height * 0.38;
    let p = '', f = `M0 ${height}`;
    for (let i = 0; i < samples.length; i++) {
      const x = i * stepX;
      const y = midY - samples[i] * amp;
      p += (i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` L${x.toFixed(1)} ${y.toFixed(1)}`);
      f += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    f += ` L${width} ${height} Z`;
    return { path: p, fillPath: f };
  }, [tick, width, height]);

  const id = useMemo(() => 'wf-' + Math.random().toString(36).slice(2, 8), []);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
         style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F4EAC9"/>
          <stop offset="50%" stopColor="#DEBC54"/>
          <stop offset="100%" stopColor="#B58A21"/>
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(222,188,84,0.30)"/>
          <stop offset="100%" stopColor="rgba(222,188,84,0)"/>
        </linearGradient>
        <filter id={`${id}-glow`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* faint horizontal grid */}
      {[0.25, 0.5, 0.75].map(y => (
        <line key={y} x1="0" x2={width} y1={height*y} y2={height*y}
              stroke="rgba(247,248,251,0.05)" strokeDasharray="2 6" strokeWidth="1"/>
      ))}
      {fill && <path d={fillPath} fill={`url(#${id}-fill)`}/>}
      <path d={path} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth={stroke}
            strokeLinejoin="round" strokeLinecap="round"
            filter={glow ? `url(#${id}-glow)` : undefined}/>
      {label && (
        <g>
          <text x="16" y="24" fontSize="10" fontFamily="JetBrains Mono, monospace"
                fill="rgba(247,248,251,0.5)" letterSpacing="2">LIVE INTENSITY</text>
          <text x={width - 16} y="24" textAnchor="end" fontSize="10"
                fontFamily="JetBrains Mono, monospace" fill="#DEBC54" letterSpacing="2">60s WINDOW</text>
        </g>
      )}
    </svg>
  );
}

/* ─── Kipindi wordmark (separate from Mapigo glyph) ────────────────────── */
function KipindiWordmark({ height = 22, color = 'var(--text-primary)', accent = 'var(--gold)' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.4, height }}>
      {/* Kipindi mark: a vertical pulse-bar set */}
      <svg width={height * 1.05} height={height} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2"  y="9"  width="3" height="6"  rx="1" fill={accent} opacity="0.45"/>
        <rect x="7"  y="6"  width="3" height="12" rx="1" fill={accent} opacity="0.7"/>
        <rect x="12" y="2"  width="3" height="20" rx="1" fill={accent}/>
        <rect x="17" y="7"  width="3" height="10" rx="1" fill={accent} opacity="0.55"/>
      </svg>
      <span style={{
        fontFamily: 'Sora, sans-serif',
        fontWeight: 600,
        fontSize: height * 0.86,
        color, letterSpacing: '-0.02em', lineHeight: 1
      }}>kipindi</span>
    </div>
  );
}

/* ─── Mapigo small glyph for inline use ────────────────────────────────── */
function MapigoSmallGlyph({ size = 24, color = 'var(--gold)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="transparent" stroke={color} strokeWidth="1.5"/>
      <path d="M10 36 L22 36 L26 35 L29 36 L31 14 L32 50 L33 30 L36 36 L40 35 L54 36"
            fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Country / league pills ───────────────────────────────────────────── */
const FIXTURES = [
  { league: 'TPL · Tanzania',  home: 'Simba SC',     away: 'Yanga SC',         time: 'LIVE 67\'',  score: '2 — 1', hot: true },
  { league: 'PSL · Nigeria',   home: 'Kano Pillars', away: 'Enyimba',          time: 'LIVE 23\'',  score: '0 — 0' },
  { league: 'EPL · England',   home: 'Arsenal',      away: 'Liverpool',        time: 'TODAY 19:30', odds: '2.40' },
  { league: 'La Liga · Spain', home: 'Real Madrid',  away: 'Atlético',         time: 'TODAY 21:00', odds: '1.85' },
  { league: 'BPL · Botswana',  home: 'Township R.',  away: 'Gaborone United',  time: 'TOMORROW',    odds: '2.10' },
  { league: 'PSL · S.Africa',  home: 'Mamelodi Sun.', away: 'Kaizer Chiefs',   time: 'TODAY 17:00', odds: '1.95' },
];

window.LandingWaveform = LandingWaveform;
window.KipindiWordmark = KipindiWordmark;
window.MapigoSmallGlyph = MapigoSmallGlyph;
window.FIXTURES = FIXTURES;
