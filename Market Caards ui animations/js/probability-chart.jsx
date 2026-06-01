/* 50pick — ProbabilityChart + Sparkline
   The signature "tipping line" chart: gilt 50% reference, area that fills
   emerald above the line / rose below (half-plane clip), soft-glow emerald
   YES line, aqua live point. Built only on kit tokens + the .pchart/.spark
   classes added to globals.css. */

const { useState: pcUseState, useRef: pcUseRef, useId: pcUseId, useEffect: pcUseEffect, useMemo: pcUseMemo } = React;

/* Light Catmull-Rom smoothing → cubic beziers. Tension kept low so the line
   reads as data, not decoration. */
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const t = 0.16;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function ProbabilityChart({
  series,                 // { '1W': [{t,p}], ... }
  defaultRange,
  width = 640,
  height = 256,
  ranges = ["1D", "1W", "1M", "ALL"],
}) {
  const uid = pcUseId().replace(/:/g, "");
  const [range, setRange] = pcUseState(defaultRange || ranges[ranges.length - 2] || ranges[0]);
  const [hover, setHover] = pcUseState(null); // index
  const lineRef = pcUseRef(null);

  const data = series[range] || [];
  const padL = 34, padR = 14, padT = 16, padB = 24;
  const W = width - padL - padR, H = height - padT - padB;
  const n = data.length;

  const x = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (p) => padT + (1 - p / 100) * H;
  const baseline = y(50);

  const pts = data.map((d, i) => [x(i), y(d.p)]);
  const linePath = smoothPath(pts);
  const areaPath = pts.length
    ? `${linePath} L ${x(n - 1).toFixed(2)} ${baseline.toFixed(2)} L ${x(0).toFixed(2)} ${baseline.toFixed(2)} Z`
    : "";

  // Draw-in: measure path length, re-key on range change.
  pcUseEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const len = el.getTotalLength ? el.getTotalLength() : W;
    el.style.setProperty("--pchart-len", len + "px");
    el.classList.remove("is-drawn");
    void el.getBoundingClientRect();
    el.classList.add("is-drawn");
  }, [range, width, height]);

  const last = data[n - 1];
  const first = data[0];
  const lastY = last ? y(last.p) : baseline;
  const lastX = last ? x(n - 1) : padL;

  // X ticks — first, middle, last
  const tickIdx = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : data.map((_, i) => i);

  const onMove = (e) => {
    if (!n) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let idx = Math.round(((px - padL) / W) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover(idx);
  };

  const hv = hover != null ? data[hover] : null;
  const hvLeanNo = hv && hv.p < 50;

  return (
    <div className={"pchart" + (hover != null ? " is-hover" : "")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <SignalPip size={7} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-subtle)" }}>YES probability · over time</span>
        </div>
        <div className="pchart-ranges" role="tablist" aria-label="Time range">
          {ranges.map((rg) => (
            <button key={rg} role="tab" aria-selected={rg === range} className={"pchart-range" + (rg === range ? " is-active" : "")} onClick={() => setRange(rg)}>{rg}</button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${width} ${height}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`YES probability over time, currently ${last ? last.p : 0} percent`}>
          <defs>
            <clipPath id={`above-${uid}`}><rect x="0" y={padT - 2} width={width} height={baseline - padT + 2} /></clipPath>
            <clipPath id={`below-${uid}`}><rect x="0" y={baseline} width={width} height={padT + H - baseline + 2} /></clipPath>
            <linearGradient id={`yesfill-${uid}`} x1="0" y1={padT} x2="0" y2={baseline} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--yes-500)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--yes-500)" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id={`nofill-${uid}`} x1="0" y1={baseline} x2="0" y2={padT + H} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--no-500)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--no-500)" stopOpacity="0.30" />
            </linearGradient>
          </defs>

          {/* Gridlines at 0/25/50/75/100 */}
          <g className="pchart-grid">
            {[0, 25, 75, 100].map((p) => (<line key={p} x1={padL} y1={y(p)} x2={padL + W} y2={y(p)} />))}
          </g>
          {/* Y labels */}
          <g className="pchart-axis" textAnchor="end">
            {[0, 50, 100].map((p) => (<text key={p} x={padL - 8} y={y(p) + 3}>{p}</text>))}
          </g>

          {/* Two-tone area */}
          {areaPath && (<>
            <path d={areaPath} fill={`url(#yesfill-${uid})`} clipPath={`url(#above-${uid})`} />
            <path d={areaPath} fill={`url(#nofill-${uid})`} clipPath={`url(#below-${uid})`} />
          </>)}

          {/* The gilt 50% tipping line */}
          <line className="pchart-tip" x1={padL} y1={baseline} x2={padL + W} y2={baseline} />
          <text className="pchart-tip-cap" x={padL + W} y={baseline - 5} textAnchor="end">TIPPING · 50</text>

          {/* The YES line */}
          {linePath && <path key={range} ref={lineRef} className="pchart-line is-drawn" d={linePath} />}

          {/* X labels */}
          <g className="pchart-axis" textAnchor="middle">
            {tickIdx.map((i) => (<text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{data[i] && data[i].t}</text>))}
          </g>

          {/* Hover crosshair */}
          {hover != null && (<>
            <line className="pchart-cross" x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + H} />
            <circle className="pchart-cross-dot" cx={x(hover)} cy={y(data[hover].p)} r="4" />
          </>)}

          {/* Live point */}
          {last && (<>
            <circle className="pchart-dot-halo" cx={lastX} cy={lastY} r="7" />
            <circle className="pchart-dot" cx={lastX} cy={lastY} r="3.5" />
          </>)}
        </svg>

        {/* Hover readout */}
        {hv && (
          <div className="pchart-readout" style={{ left: `${(x(hover) / width) * 100}%` }}>
            <span style={{ color: "var(--text-subtle)" }}>{hv.t}</span>{"  "}
            <b className={hvLeanNo ? "lean-no" : undefined}>{hv.p}%</b>
            <span style={{ color: "var(--text-subtle)" }}> · {hvLeanNo ? "leans no" : "leans yes"}</span>
          </div>
        )}
        {/* Live value flag */}
        {last && (
          <div style={{ position: "absolute", top: `${(lastY / height) * 100}%`, left: `${(lastX / width) * 100}%`, transform: "translate(10px, -50%)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--gilt)", pointerEvents: "none", whiteSpace: "nowrap" }}>
            {last.p}%
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sparkline — the card-sized variant of the same idea ─────────────────── */
function Sparkline({ data, width = 72, height = 26 }) {
  const uid = pcUseId().replace(/:/g, "");
  const pad = 3;
  const W = width - pad * 2, H = height - pad * 2;
  const n = data.length;
  const min = Math.min(...data), max = Math.max(...data);
  const span = Math.max(1, max - min);
  const x = (i) => pad + (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (p) => pad + (1 - (p - min) / span) * H;
  const pts = data.map((p, i) => [x(i), y(p)]);
  const path = smoothPath(pts);
  const last = data[n - 1];
  const lean = last >= 50 ? "yes" : "no";
  const areaPath = `${path} L ${x(n - 1).toFixed(2)} ${height - pad} L ${x(0).toFixed(2)} ${height - pad} Z`;
  return (
    <span className="spark">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <defs>
          <linearGradient id={`sp-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`var(--${lean}-500)`} stopOpacity="0.28" />
            <stop offset="100%" stopColor={`var(--${lean}-500)`} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#sp-${uid})`} />
        <path className={`spark-line spark-line-${lean}`} d={path} />
        <circle className={`spark-dot-${lean}`} cx={x(n - 1)} cy={y(last)} r="2.4" />
      </svg>
    </span>
  );
}

Object.assign(window, { ProbabilityChart, Sparkline, smoothPath });
