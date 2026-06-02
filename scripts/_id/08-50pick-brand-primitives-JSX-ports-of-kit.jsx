/* 50pick brand primitives — JSX ports of kit/brand/brand.tsx + the
   probability-chart sparkline. Faithful to the handoff: inline styles +
   globals.css classes, OKLCH only. Exported to window for the other files. */
const { useState, useEffect, useRef, useId } = React;

/* ── FiftyMark ── tilted YES/NO split disc with the "50" on the divider ── */
function FiftyMark({ size = 64, mono = false, inverted = false }) {
  const tilt = -14, r = 50, cx = 50, cy = 50;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 80, dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy }, bot = { x: cx - dx, y: cy + dy };
  const yesColor = mono ? (inverted ? "oklch(99% 0.006 268)" : "oklch(48% 0.20 268)") : "oklch(58% 0.16 152)";
  const noColor  = mono ? (inverted ? "oklch(72% 0.020 268)" : "oklch(78% 0.045 268)") : "oklch(60% 0.18 22)";
  const ringColor = mono ? (inverted ? "oklch(99% 0.006 268)" : "oklch(48% 0.20 268)") : "oklch(48% 0.20 268)";
  const numberColor = mono ? (inverted ? "oklch(44% 0.20 268)" : "oklch(99% 0.006 268)") : "oklch(99% 0.006 268)";
  const giltStroke = "oklch(78% 0.13 86)", giltPip = "oklch(85% 0.13 86)";
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-label="50pick">
      <defs><clipPath id={`fc-${id}`}><circle cx={cx} cy={cy} r={r - 1} /></clipPath></defs>
      <g clipPath={`url(#fc-${id})`}>
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={yesColor} />
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill={noColor} />
        <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke={mono ? ringColor : giltStroke} strokeWidth="2" strokeLinecap="round" />
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={700} fontSize="30" fill={numberColor} style={{ letterSpacing: "-0.04em" }}>50</text>
        {!mono && <circle cx={cx} cy={cy} r={1.6} fill={giltPip} />}
      </g>
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke={ringColor} strokeWidth="2" />
      {!mono && <circle cx={cx} cy={cy} r={r - 2.4} fill="none" stroke={giltStroke} strokeWidth="0.5" opacity="0.55" />}
    </svg>
  );
}

/* ── SignalPip ── aqua finishing pulse ── */
function SignalPip({ size = 8 }) {
  return <span aria-hidden style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: "var(--aqua-300)", boxShadow: "0 0 0 0 var(--aqua-glow)", animation: "aqua-pulse 2.2s ease-in-out infinite" }} />;
}

/* ── TippingBar ── signature progress rail with the tilting gilt needle,
      hover-recast gesture (collapse to 50/50, overshoot back, gilt sweep). ── */
function TippingBar({ yesPct = 50, height = 28, animate = true, showLabels = true, resolved = false, recastOnHover = true }) {
  const target = Math.max(0, Math.min(100, yesPct));
  const [animYes, setAnimYes] = useState(target);
  const [sweepKey, setSweepKey] = useState(0);
  const recastTimer = useRef(null);
  useEffect(() => { setAnimYes(target); }, [target]);
  useEffect(() => () => { if (recastTimer.current) clearTimeout(recastTimer.current); }, []);
  const handleEnter = () => {
    if (!recastOnHover) return;
    if (recastTimer.current) clearTimeout(recastTimer.current);
    setSweepKey((k) => k + 1);
    setAnimYes(50);
    recastTimer.current = setTimeout(() => { recastTimer.current = null; setAnimYes(target); }, 50);
  };
  const yes = animYes, no = 100 - yes;
  const inner = Math.max(6, Math.min(94, yes));
  const tilt = ((inner - 50) / 44) * 14;
  const ease = animate ? "width 540ms cubic-bezier(.34,1.56,.64,1), transform 540ms cubic-bezier(.34,1.56,.64,1), left 540ms cubic-bezier(.34,1.56,.64,1)" : "none";
  const r = height / 2;
  const yesRadii = target === 100 ? { borderRadius: r } : { borderTopLeftRadius: r, borderBottomLeftRadius: r };
  const noRadii  = target === 0   ? { borderRadius: r } : { borderTopRightRadius: r, borderBottomRightRadius: r };
  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height, background: "oklch(50% 0.20 268)", borderRadius: r, overflow: "visible", boxShadow: "inset 0 0 0 1px oklch(58% 0.17 268)", cursor: recastOnHover ? "default" : undefined }}
        onMouseEnter={handleEnter} role="progressbar" aria-valuenow={target} aria-valuemin={0} aria-valuemax={100} aria-label={`YES probability ${target}%`}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${yes}%`, background: "linear-gradient(90deg, oklch(50% 0.14 152) 0%, oklch(58% 0.16 152) 100%)", ...yesRadii, transition: ease, boxShadow: "0 0 18px oklch(58% 0.16 152 / 0.35)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: `${no}%`, background: "linear-gradient(270deg, oklch(52% 0.16 22) 0%, oklch(60% 0.18 22) 100%)", ...noRadii, transition: ease, boxShadow: "0 0 18px oklch(60% 0.18 22 / 0.35)" }} />
        <div style={{ position: "absolute", left: `calc(${inner}% - 1.5px)`, top: -6, bottom: -6, width: 3, background: "oklch(86% 0.13 82)", borderRadius: 2, transformOrigin: "50% 100%", transform: `rotate(${tilt}deg)`, transition: ease, boxShadow: "0 0 12px oklch(86% 0.13 82 / 0.55)" }} />
        {resolved && (
          <div style={{ position: "absolute", inset: 0, borderRadius: r, overflow: "hidden", pointerEvents: "none" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, oklch(75% 0.13 85 / 0.5) 50%, transparent 100%)", animation: "tb-shimmer 1.6s ease-out" }} />
          </div>
        )}
        {recastOnHover && (
          <div key={sweepKey} aria-hidden style={{ position: "absolute", inset: 0, borderRadius: r, overflow: "hidden", pointerEvents: "none", opacity: sweepKey === 0 ? 0 : undefined }}>
            {sweepKey > 0 && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, oklch(78% 0.13 80 / 0) 20%, oklch(78% 0.13 80 / 0.90) 50%, oklch(78% 0.13 80 / 0) 80%, transparent 100%)", backgroundSize: "35% 100%", backgroundRepeat: "no-repeat", backgroundPosition: "-35% 0", animation: "tb-pbar-sweep 540ms cubic-bezier(.22,1,.36,1) both", mixBlendMode: "screen" }} />}
          </div>
        )}
      </div>
      {showLabels && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.05em" }}>
          <span style={{ color: "var(--bar-label-yes)" }}>YES <strong style={{ color: "var(--bar-label-yes-strong)", fontWeight: target >= 50 ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>{target}%</strong></span>
          <span style={{ color: "var(--bar-label-tipping)", fontStyle: "italic", textTransform: "uppercase", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.10em", opacity: 0.85 }}>{Math.abs(target - 50) < 3 ? "tipping" : target > 50 ? "leans yes" : "leans no"}</span>
          <span style={{ color: "var(--bar-label-no)" }}><strong style={{ color: "var(--bar-label-no-strong)", fontWeight: target < 50 ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>{100 - target}%</strong> NO</span>
        </div>
      )}
      <style>{`
        @keyframes tb-shimmer { from { transform: translateX(-100%);} to { transform: translateX(100%);} }
        @keyframes tb-pbar-sweep { 0%{background-position:-35% 0;opacity:0;} 15%{opacity:0.9;} 100%{background-position:135% 0;opacity:0;} }
      `}</style>
    </div>
  );
}

/* ── ConfidenceDial ── circular split-mark rendering of probability ── */
function ConfidenceDial({ yesPct = 62, size = 92, label }) {
  const yes = Math.max(0, Math.min(100, yesPct));
  const tilt = ((yes - 50) / 50) * 22, r = 44, cx = 50, cy = 50;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 70, dy = Math.cos(rad) * 70;
  const top = { x: cx + dx, y: cy - dy }, bot = { x: cx - dx, y: cy + dy };
  const id = useId().replace(/:/g, "");
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs><clipPath id={`cd-${id}`}><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
        <circle cx={cx} cy={cy} r={r} fill="var(--bar-track)" />
        <g clipPath={`url(#cd-${id})`}>
          <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(50% 0.14 152)" opacity={0.92} />
          <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(52% 0.16 22)" opacity={0.92} />
          <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke="var(--bar-needle)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bar-track-border)" strokeWidth="1.5" />
        <text x={cx} y={cy + 1.5} textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={700} fontSize="22" fill="var(--text)" style={{ letterSpacing: "-0.04em" }}>{yes}</text>
      </svg>
      {label && <div style={{ fontSize: 10, color: "var(--text-subtle)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>}
    </div>
  );
}

/* ── smoothPath + Sparkline ── card-sized "tipping line" ── */
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
function Sparkline({ data, width = 72, height = 26 }) {
  const uid = useId().replace(/:/g, "");
  const pad = 3, W = width - pad * 2, H = height - pad * 2, n = data.length;
  if (n < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = Math.max(1, max - min);
  const x = (i) => pad + (i / (n - 1)) * W;
  const y = (p) => pad + (1 - (p - min) / span) * H;
  const pts = data.map((p, i) => [x(i), y(p)]);
  const path = smoothPath(pts);
  const last = data[n - 1], lean = last >= 50 ? "yes" : "no";
  const areaPath = `${path} L ${x(n - 1).toFixed(2)} ${height - pad} L ${x(0).toFixed(2)} ${height - pad} Z`;
  return (
    <span className="spark">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <defs><linearGradient id={`sp-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={`var(--${lean}-500)`} stopOpacity="0.28" /><stop offset="100%" stopColor={`var(--${lean}-500)`} stopOpacity="0" /></linearGradient></defs>
        <path d={areaPath} fill={`url(#sp-${uid})`} />
        <path className={`spark-line spark-line-${lean}`} d={path} />
        <circle className={`spark-dot-${lean}`} cx={x(n - 1)} cy={y(last)} r="2.4" />
      </svg>
    </span>
  );
}

/* ── MoveChip ── 24h move arrow (line-art, no emoji) ── */
function MoveChip({ move }) {
  const dir = move > 0 ? "up" : move < 0 ? "down" : "flat";
  const cls = dir === "up" ? "mcard-move-up" : dir === "down" ? "mcard-move-down" : "mcard-move-flat";
  return (
    <span className={`mcard-move ${cls}`} title="24h move · Mwenendo wa saa 24">
      {dir === "flat"
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === "up" ? "none" : "rotate(180deg)" }}><path d="M12 5 L12 19 M6 11 L12 5 L18 11" /></svg>}
      {move > 0 ? "+" : ""}{move}<span style={{ opacity: 0.7 }}>pt</span>
    </span>
  );
}

Object.assign(window, { FiftyMark, SignalPip, TippingBar, ConfidenceDial, Sparkline, smoothPath, MoveChip });
