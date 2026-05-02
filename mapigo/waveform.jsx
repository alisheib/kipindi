/* MapigoWaveform — the signature canvas component.
   SVG-based, scrolls right→left. Generates a continuous path from a ring
   buffer of samples. Spikes are punchy; calm is a gentle sine wiggle. */

const WF_W = 1200;   // viewBox width
const WF_H = 360;    // viewBox height
const WF_SAMPLES = 240; // 60s at 4 samples/sec

function useWaveformSamples(running, mode) {
  const [samples, setSamples] = React.useState(() => {
    const arr = new Float32Array(WF_SAMPLES);
    for (let i = 0; i < WF_SAMPLES; i++) arr[i] = 0;
    return arr;
  });
  const tRef = React.useRef(0);
  const spikeRef = React.useRef({ active: false, decay: 0, peak: 0 });

  React.useEffect(() => {
    if (!running) return;
    let raf;
    let last = performance.now();
    let spikeCooldown = 60;
    const tick = (now) => {
      const dt = Math.min(60, now - last);
      last = now;
      if (dt > 240) { raf = requestAnimationFrame(tick); return; }
      tRef.current += dt;
      // ~4 samples/sec advance
      if (tRef.current > 250) {
        tRef.current = 0;
        setSamples(prev => {
          const next = new Float32Array(WF_SAMPLES);
          next.set(prev.subarray(1), 0);
          // base value
          const tt = now / 1000;
          let v = 0;
          if (mode === 'calm') {
            v = Math.sin(tt * 1.6) * 0.10 + Math.sin(tt * 0.7) * 0.04;
          } else if (mode === 'drift') {
            v = Math.sin(tt * 0.4) * 0.35 + Math.sin(tt * 1.2) * 0.06;
          } else { // live mix
            v = Math.sin(tt * 1.4) * 0.14 + Math.sin(tt * 0.5) * 0.06;
            spikeCooldown--;
            if (spikeCooldown <= 0 && Math.random() < 0.04) {
              spikeRef.current = { active: true, decay: 1, peak: 0.7 + Math.random() * 0.25 };
              spikeCooldown = 30 + Math.random() * 60;
            }
          }
          // apply spike
          if (spikeRef.current.active) {
            v += spikeRef.current.peak * spikeRef.current.decay;
            spikeRef.current.decay *= 0.78;
            if (spikeRef.current.decay < 0.05) spikeRef.current.active = false;
          }
          next[WF_SAMPLES - 1] = v;
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, mode]);

  return samples;
}

function pathFromSamples(samples) {
  const stepX = WF_W / (WF_SAMPLES - 1);
  const midY = WF_H * 0.55;
  const amp = WF_H * 0.38;
  let d = '';
  for (let i = 0; i < samples.length; i++) {
    const x = i * stepX;
    const y = midY - samples[i] * amp;
    d += (i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return d;
}

function fillPathFromSamples(samples) {
  const stepX = WF_W / (WF_SAMPLES - 1);
  const midY = WF_H * 0.55;
  const amp = WF_H * 0.38;
  let d = `M0 ${WF_H}`;
  for (let i = 0; i < samples.length; i++) {
    const x = i * stepX;
    const y = midY - samples[i] * amp;
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += ` L${WF_W} ${WF_H} Z`;
  return d;
}

function MapigoWaveform({ mode = 'live', anchors = [], roundProgress = 0, paused = false, showRoundBand = true }) {
  const samples = useWaveformSamples(!paused, mode);
  const path = React.useMemo(() => pathFromSamples(samples), [samples]);
  const fillPath = React.useMemo(() => fillPathFromSamples(samples), [samples]);

  // Round band: covers the whole visible window (60s)
  const bandX = 0;
  const bandW = WF_W * roundProgress;

  return (
    <div className="wf-wrap">
      <svg viewBox={`0 0 ${WF_W} ${WF_H}`} className="wf-svg" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="wf-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F0CE6A" />
            <stop offset="100%" stopColor="#B58A21" />
          </linearGradient>
          <linearGradient id="wf-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(222,188,84,0.30)" />
            <stop offset="100%" stopColor="rgba(222,188,84,0.00)" />
          </linearGradient>
          <filter id="wf-glow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint horizontal grid lines @ 25/50/75 */}
        {[0.25, 0.5, 0.75].map((y) => (
          <line key={y} x1="0" x2={WF_W} y1={WF_H * y} y2={WF_H * y}
                stroke="var(--mapigo-grid-line)" strokeDasharray="2 6" strokeWidth="1" />
        ))}

        {/* tick markers every 10s (= every WF_W/6) */}
        {[1,2,3,4,5].map(i => (
          <line key={i} x1={WF_W*i/6} x2={WF_W*i/6} y1={WF_H-12} y2={WF_H-2}
                stroke="var(--mapigo-grid-tick)" strokeWidth="1" />
        ))}

        {/* round band */}
        {showRoundBand && (
          <g>
            <rect x={bandX} y="0" width={bandW} height={WF_H}
                  fill="var(--mapigo-round-band-fill)" />
            <line x1={bandW} x2={bandW} y1="0" y2={WF_H}
                  stroke="var(--mapigo-round-band-border)" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        )}

        {/* area fill */}
        <path d={fillPath} fill="url(#wf-fill)" />

        {/* main waveform */}
        <path d={path} fill="none" stroke="url(#wf-grad)" strokeWidth="3"
              strokeLinejoin="round" strokeLinecap="round" filter="url(#wf-glow)" />

        {/* anchors */}
        {anchors.map((a, i) => {
          const cx = WF_W * a.t;
          const cy = WF_H * 0.55 - (a.v ?? 0.2) * WF_H * 0.38;
          const color = a.state === 'won' ? 'var(--mapigo-anchor-won)' :
                        a.state === 'lost' ? 'var(--mapigo-anchor-lost)' :
                        'var(--gold)';
          return (
            <g key={i} opacity={a.state === 'lost' ? 0.45 : 1}>
              <line x1={cx} x2={cx} y1={cy} y2={WF_H - 24}
                    stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
              <g transform={`translate(${cx} ${cy}) rotate(45)`}>
                <rect x="-5" y="-5" width="10" height="10" fill={color}
                      stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
              </g>
              <g transform={`translate(${cx} ${WF_H - 22})`}>
                <rect x="-22" y="-9" width="44" height="16" rx="3"
                      fill="rgba(11,18,38,0.85)" stroke={color} strokeWidth="0.5" />
                <text x="0" y="2" textAnchor="middle" fontSize="9"
                      fontFamily="JetBrains Mono, monospace" fill={color} letterSpacing="0.5">
                  {a.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* time labels */}
      <div className="wf-time-axis">
        <span>−60s</span><span>−50</span><span>−40</span>
        <span>−30</span><span>−20</span><span>−10</span><span>now</span>
      </div>
    </div>
  );
}

window.MapigoWaveform = MapigoWaveform;
