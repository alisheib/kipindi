"use client";

/**
 * ConvictionDial — 1:1 port of `kit/conviction-slider-round.jsx`.
 *
 * A weighted squircle dial. One gesture sets BOTH side and stake:
 *   • Position 0..1 along the track — left = NO, right = YES, centre = NEUTRAL
 *   • Distance from centre maps quadratically to a multiplier (1× → 5×)
 *   • Stake = baseStake × multiplier
 *
 * Theme-adaptive (uses --bar-track / --bar-needle / --text), accessible (slider
 * role + ArrowKey/Home/End), pointer + touch + keyboard, no jank — the
 * multiplier and stake numerals tween critically-damped, no snapping.
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { buyPositionAction } from "@/app/markets/actions";

type Side = "YES" | "NO" | "NEUTRAL";

/** Critically-damped tween toward `target`; ~150ms settle, no overshoot. */
function useRollingNumber(target: number, stiffness = 0.22) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    targetRef.current = target;
    if (rafRef.current !== null) return;
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
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );
  return value;
}

/** Squircle path (superellipse n=4) of radius `r`, centred at (0,0). */
function squirclePath(r: number) {
  const n = 4;
  const steps = 64;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * r;
    const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * r;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)} `;
  }
  return `${d}Z`;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const NEUTRAL_BAND = 0.04;

type Props = {
  marketId: string;
  yesPool: number;
  noPool: number;
  /** Baseline stake at 1× multiplier (multiplier reaches 5× at the extremes). */
  baseStake?: number;
  initial?: number;
};

export function ConvictionDial({ marketId, baseStake = 5_000, initial = 0.5 }: Props) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const [pending, startTransition] = useTransition();
  const trackRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const distFromCenter = Math.abs(pos - 0.5) * 2;
  const conviction = distFromCenter * distFromCenter; // ease-in
  const maxMultiplier = 5;
  const multiplierTarget = 1 + conviction * (maxMultiplier - 1);
  const isNeutral = distFromCenter < NEUTRAL_BAND;
  const side: Side = isNeutral ? "NEUTRAL" : pos < 0.5 ? "NO" : "YES";
  const stakeTarget = baseStake * multiplierTarget;

  const multiplier = useRollingNumber(multiplierTarget);
  const stakeRolled = useRollingNumber(stakeTarget);
  const stake = Math.max(100, Math.round(stakeRolled / 100) * 100);

  const strength = Math.max(0, (distFromCenter - NEUTRAL_BAND) / (1 - NEUTRAL_BAND));
  const sideHue = side === "YES" ? 152 : side === "NO" ? 22 : 240;
  const sideChroma = side === "NEUTRAL" ? 0 : side === "YES" ? 0.16 : 0.18;

  const knobBg    = `oklch(${22 + 4 * strength}% ${0.012 + sideChroma * 0.4 * strength} ${sideHue})`;
  const knobBgTop = `oklch(${32 + 6 * strength}% ${0.012 + sideChroma * 0.5 * strength} ${sideHue})`;
  const ringColor = side === "NEUTRAL"
    ? "oklch(45% 0.013 240)"
    : side === "YES" ? "oklch(58% 0.16 152)" : "oklch(60% 0.18 22)";
  const sideAccent = ringColor;
  const sideText = side === "YES" ? "oklch(80% 0.13 152)" : side === "NO" ? "oklch(80% 0.14 22)" : "oklch(75% 0.012 240)";

  const setFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const next = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setPos(next);
  }, []);

  // Pointer events handle mouse + touch + pen uniformly
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => { e.preventDefault(); setFromClientX(e.clientX); };
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, setFromClientX]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    setFromClientX(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.10 : 0.02;
    if (e.key === "ArrowLeft")  { e.preventDefault(); setPos((p) => Math.max(0, p - step)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => Math.min(1, p + step)); }
    if (e.key === "Home")       { e.preventDefault(); setPos(0); }
    if (e.key === "End")        { e.preventDefault(); setPos(1); }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); submit(); }
  };

  // Use ResizeObserver to keep the SVG width responsive without re-renders
  // (the SVG itself uses 100% width via viewBox; we just need geometry maths).
  const [width, setWidth] = useState(560);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const height = 140;
  const trackH = 12;
  const trackY = height / 2 - trackH / 2;
  const knobR = 28;
  const knobScale = 1 + 0.08 * conviction + (dragging ? 0.04 : 0);
  const needleX = pos * (width - knobR * 2) + knobR;
  const tilt = (pos - 0.5) * 18;
  const yesFillW = pos > 0.5 ? (pos - 0.5) * width : 0;
  const noFillW  = pos < 0.5 ? (0.5 - pos) * width : 0;
  const sqPath = squirclePath(knobR);

  const submit = () => {
    if (side === "NEUTRAL" || pending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("side", side);
      fd.set("stake", String(stake));
      const r = await buyPositionAction(fd);
      if (!r.ok) {
        toast({ title: "Could not place", description: r.error, variant: "danger" });
      } else {
        toast({
          title: `${side} · TZS ${fmt(stake)}`,
          description: `If correct, you receive TZS ${fmt(r.data!.payoutIfWin)}`,
          variant: "success",
        });
        router.refresh();
      }
    });
  };

  const ariaValue = Math.round(pos * 100);

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-6 select-none">
      {/* Header — the kit's "YES · slide to commit · NO" guidance */}
      <div className="flex items-baseline justify-between mb-3.5 font-mono text-[10px] tracking-[0.16em] uppercase">
        <span
          className="transition-colors duration-200"
          style={{
            color: side === "YES" ? "oklch(75% 0.13 152)" : "var(--text-subtle)",
            fontWeight: side === "YES" ? 700 : 400,
          }}
        >
          YES
        </span>
        <span style={{ color: "var(--text-subtle)", letterSpacing: "0.18em" }}>· slide to commit ·</span>
        <span
          className="transition-colors duration-200"
          style={{
            color: side === "NO" ? "oklch(75% 0.16 22)" : "var(--text-subtle)",
            fontWeight: side === "NO" ? 700 : 400,
          }}
        >
          NO
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Drag to set side and conviction"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaValue}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="relative w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-md touch-none"
        style={{ height, cursor: dragging ? "grabbing" : "grab" }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="block overflow-visible">
          <defs>
            <linearGradient id={`csrf-yes-${marketId}`} x1="0" x2="1">
              <stop offset="0%"  stopColor="oklch(40% 0.10 152)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(58% 0.16 152)" />
            </linearGradient>
            <linearGradient id={`csrf-no-${marketId}`} x1="1" x2="0">
              <stop offset="0%"  stopColor="oklch(40% 0.13 22)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(60% 0.18 22)" />
            </linearGradient>
            <radialGradient id={`csrf-glow-${marketId}`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%"  stopColor={sideAccent} stopOpacity={0.55} />
              <stop offset="55%" stopColor={sideAccent} stopOpacity={0.15} />
              <stop offset="100%" stopColor={sideAccent} stopOpacity={0} />
            </radialGradient>
            <linearGradient id={`csrf-knob-${marketId}`} x1="0.5" x2="0.5" y1="0" y2="1">
              <stop offset="0%"  stopColor={knobBgTop} />
              <stop offset="100%" stopColor={knobBg} />
            </linearGradient>
            <filter id={`csrf-shadow-${marketId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="black" floodOpacity={0.5} />
            </filter>
          </defs>

          {/* Track */}
          <rect x="0" y={trackY} width={width} height={trackH} rx={trackH / 2}
                fill="var(--bar-track)" stroke="var(--bar-track-border)" strokeWidth="1" />

          {/* Midpoint marker */}
          <line x1={width / 2} x2={width / 2}
                y1={trackY - 4} y2={trackY + trackH + 4}
                stroke="var(--bar-track-border)" strokeWidth="1" />

          {/* Side fills from center */}
          {yesFillW > 0 && (
            <rect x={width / 2} y={trackY} width={yesFillW} height={trackH} rx={trackH / 2}
                  fill={`url(#csrf-yes-${marketId})`} />
          )}
          {noFillW > 0 && (
            <rect x={pos * width} y={trackY} width={noFillW} height={trackH} rx={trackH / 2}
                  fill={`url(#csrf-no-${marketId})`} />
          )}

          {/* Conviction halo */}
          {strength > 0 && (
            <circle cx={needleX} cy={height / 2}
                    r={knobR * (1.7 + 1.0 * conviction)}
                    fill={`url(#csrf-glow-${marketId})`} />
          )}

          {/* Idle breathing ring at center */}
          {!dragging && !hover && isNeutral && (
            <path d={squirclePath(knobR + 6)}
                  transform={`translate(${needleX} ${height / 2})`}
                  fill="none" stroke="var(--text-subtle)" strokeWidth="1.1"
                  className="csrf-rest-ring" />
          )}

          {/* Knob */}
          <g transform={`translate(${needleX} ${height / 2}) rotate(${tilt}) scale(${knobScale})`}
             filter={`url(#csrf-shadow-${marketId})`}>
            <path d={sqPath}
                  fill={`url(#csrf-knob-${marketId})`}
                  stroke={ringColor}
                  strokeWidth={1.5 + 1.2 * strength} />
            <path d={squirclePath(knobR - 5)}
                  fill="none" stroke="oklch(96% 0.005 240)" strokeWidth="0.5" opacity="0.12" />
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
                {side === "NEUTRAL" ? "· · ·" : side}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Readout */}
      <div className="grid grid-cols-2 gap-3 mt-5 items-center">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1">
            {side === "NEUTRAL" ? "No conviction" : "You are picking"}
          </p>
          <p
            className="font-display font-bold text-[22px] leading-none"
            style={{ color: sideText, letterSpacing: "-0.025em" }}
          >
            {side === "NEUTRAL" ? "drag the dial" : `${side} · ${multiplier.toFixed(1)}×`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1">Stake · dau</p>
          <p className="font-mono font-bold text-[20px] tabular-nums leading-none text-text" style={{ letterSpacing: "-0.02em" }}>
            TZS {fmt(stake)}
          </p>
        </div>
      </div>

      {/* Confirm button — disabled at neutral */}
      <button
        type="button"
        onClick={submit}
        disabled={pending || side === "NEUTRAL"}
        className="mt-5 w-full h-12 rounded-md font-display font-bold text-[15px] transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: side === "NEUTRAL"
            ? "var(--bg-overlay)"
            : "linear-gradient(180deg, var(--gold-400), var(--gold-600))",
          color: side === "NEUTRAL" ? "var(--text-subtle)" : "var(--gold-fg)",
          borderColor: side === "NEUTRAL" ? "var(--border)" : "var(--gold-700)",
          boxShadow: side === "NEUTRAL" ? "none" : "0 1px 0 oklch(95% 0.08 80) inset",
        }}
      >
        {pending
          ? "Placing…"
          : side === "NEUTRAL"
            ? "Drag the dial to commit"
            : `Confirm ${side} · TZS ${fmt(stake)}`}
      </button>
      <p className="mt-2.5 text-center text-[11px] text-text-subtle">
        Pool-share payout. Outcome may differ from current odds.
      </p>

      <style>{`
        @keyframes csrf-breathe { 0%,100% { opacity: 0.35; } 50% { opacity: 0.7; } }
        .csrf-rest-ring { animation: csrf-breathe 2.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
