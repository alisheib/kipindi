"use client";

/**
 * ProbabilityChart + Sparkline — the signature "tipping line" chart from
 * Claude Design's market-surfaces handoff, ported to TSX against the kit.
 * Gilt 50% reference, emerald-above / rose-below half-plane fill, soft-glow
 * YES line that draws in on mount (snaps under reduced-motion), aqua live
 * point, range tabs + hover crosshair. Styling lives in globals.css (.pchart
 * / .spark). Dependency-free SVG.
 */
import { useState, useRef, useId, useEffect } from "react";
import { SignalPip } from "@/components/brand";

export type ProbPoint = { t: string; p: number };

/** Light Catmull-Rom smoothing → cubic beziers. Low tension: reads as data. */
function smoothPath(pts: number[][]): string {
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

export function ProbabilityChart({
  series,
  defaultRange,
  width: widthProp,
  height = 256,
  ranges = ["1D", "1W", "1M", "ALL"],
}: {
  series: Record<string, ProbPoint[]>;
  defaultRange?: string;
  width?: number;
  height?: number;
  ranges?: string[];
}) {
  const uid = useId().replace(/:/g, "");
  const [range, setRange] = useState(defaultRange || ranges[ranges.length - 2] || ranges[0]);
  const [hover, setHover] = useState<number | null>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(widthProp ?? 640);

  useEffect(() => {
    if (widthProp) return; // explicit width takes priority
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width);
        if (w > 0) setMeasuredWidth(w);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [widthProp]);

  const width = widthProp ?? measuredWidth;

  const data = series[range] || [];
  const padL = 34, padR = 14, padT = 16, padB = 24;
  const W = width - padL - padR, H = height - padT - padB;
  const n = data.length;

  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (p: number) => padT + (1 - p / 100) * H;
  const baseline = y(50);

  const pts = data.map((d, i) => [x(i), y(d.p)]);
  const linePath = smoothPath(pts);
  const areaPath = pts.length
    ? `${linePath} L ${x(n - 1).toFixed(2)} ${baseline.toFixed(2)} L ${x(0).toFixed(2)} ${baseline.toFixed(2)} Z`
    : "";

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const len = el.getTotalLength ? el.getTotalLength() : W;
    el.style.setProperty("--pchart-len", `${len}px`);
    el.classList.remove("is-drawn");
    void el.getBoundingClientRect();
    el.classList.add("is-drawn");
  }, [range, width, height, W]);

  const last = data[n - 1];
  const lastY = last ? y(last.p) : baseline;
  const lastX = last ? x(n - 1) : padL;
  const tickIdx = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : data.map((_, i) => i);

  // Pointer scrubbing — works for mouse, touch and pen. `touch-action: pan-y`
  // (set on the svg) lets the page still scroll vertically while we read the
  // horizontal position, so dragging across the chart on mobile reads the value.
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!n) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let idx = Math.round(((px - padL) / W) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover(idx);
  };

  const hv = hover != null ? data[hover] : null;
  const hvLeanNo = hv ? hv.p < 50 : false;

  // Edge-aware horizontal anchoring so the readout + value flag never spill past
  // (and get clipped by) the chart's edges. Near the start we align the box's
  // LEFT edge to the point (it opens rightward, into the chart); near the end we
  // align its RIGHT edge (opens leftward); in the middle we center it. `gap` is
  // the px offset between the point and the box on the center→edge transition.
  const edgeShift = (frac: number, gap = 0, yShift = "0") => {
    if (frac < 0.2) return `translate(${gap}px, ${yShift})`;
    if (frac > 0.8) return `translate(calc(-100% - ${gap}px), ${yShift})`;
    return `translate(-50%, ${yShift})`;
  };
  const hoverFrac = hover != null ? x(hover) / width : 0.5;
  const lastFrac = last ? lastX / width : 1;

  return (
    <div ref={wrapRef} className={"pchart" + (hover != null ? " is-hover" : "")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <SignalPip size={7} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-subtle)" }}>YES probability · over time</span>
        </div>
        {ranges.length > 1 && (
          <div className="pchart-ranges" role="tablist" aria-label="Time range">
            {ranges.map((rg) => (
              <button key={rg} role="tab" aria-selected={rg === range} className={"pchart-range" + (rg === range ? " is-active" : "")} onClick={() => setRange(rg)}>{rg}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${width} ${height}`} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: "pan-y" }} role="img" aria-label={`YES probability over time, currently ${last ? last.p : 0} percent`}>
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

          <g className="pchart-grid">
            {[0, 25, 75, 100].map((p) => (<line key={p} x1={padL} y1={y(p)} x2={padL + W} y2={y(p)} />))}
          </g>
          <g className="pchart-axis" textAnchor="end">
            {[0, 50, 100].map((p) => (<text key={p} x={padL - 8} y={y(p) + 3}>{p}</text>))}
          </g>

          {areaPath && (<>
            <path d={areaPath} fill={`url(#yesfill-${uid})`} clipPath={`url(#above-${uid})`} />
            <path d={areaPath} fill={`url(#nofill-${uid})`} clipPath={`url(#below-${uid})`} />
          </>)}

          <line className="pchart-tip" x1={padL} y1={baseline} x2={padL + W} y2={baseline} />
          <text className="pchart-tip-cap" x={padL + W} y={baseline - 5} textAnchor="end">TIPPING · 50</text>

          {linePath && <path key={range} ref={lineRef} className="pchart-line is-drawn" d={linePath} />}

          <g className="pchart-axis" textAnchor="middle">
            {tickIdx.map((i) => (<text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{data[i] && data[i].t}</text>))}
          </g>

          {hover != null && (<>
            <line className="pchart-cross" x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + H} />
            <circle className="pchart-cross-dot" cx={x(hover)} cy={y(data[hover].p)} r="4" />
          </>)}

          {last && (<>
            <circle className="pchart-dot-halo" cx={lastX} cy={lastY} r="7" />
            <circle className="pchart-dot" cx={lastX} cy={lastY} r="3.5" />
          </>)}
        </svg>

        {hv && (
          <div className="pchart-readout" style={{ left: `${(x(hover!) / width) * 100}%`, transform: edgeShift(hoverFrac) }}>
            <span style={{ color: "var(--text-subtle)" }}>{hv.t}</span>{"  "}
            <b className={hvLeanNo ? "lean-no" : undefined}>{hv.p}%</b>
            <span style={{ color: "var(--text-subtle)" }}> · {hvLeanNo ? "leans no" : "leans yes"}</span>
          </div>
        )}
        {last && (
          <div style={{ position: "absolute", top: `${(lastY / height) * 100}%`, left: `${(lastX / width) * 100}%`, transform: edgeShift(lastFrac, 10, "-50%"), fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--gilt)", pointerEvents: "none", whiteSpace: "nowrap" }}>
            {last.p}%
          </div>
        )}
      </div>
    </div>
  );
}

/** Card-sized variant of the same idea. */
export function Sparkline({ data, width = 72, height = 26 }: { data: number[]; width?: number; height?: number }) {
  const uid = useId().replace(/:/g, "");
  const pad = 3;
  const W = width - pad * 2, H = height - pad * 2;
  const n = data.length;
  if (n < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = Math.max(1, max - min);
  const x = (i: number) => pad + (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (p: number) => pad + (1 - (p - min) / span) * H;
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
