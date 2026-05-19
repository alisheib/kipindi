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
import { HouseLeanWarning } from "./house-lean-warning";
import { BetConfirmModal } from "./bet-confirm-modal";
import { OperationResultModal } from "./operation-result-modal";

type Side = "YES" | "NO" | "NEUTRAL";

const TAX_RATE = 0.04;
const COMMISSION_RATE = 0.05;
const THIN_PROFIT_RATIO = 1.05;
type LeanLevel = "fair" | "thin" | "negative";

/** Mirror of payoutForWhole for client-side projection. */
function projectWhole(yesPool: number, noPool: number, side: "YES" | "NO", stake: number): { payout: number; ratio: number } {
  const yp = side === "YES" ? yesPool + stake : yesPool;
  const np = side === "NO"  ? noPool  + stake : noPool;
  const gross = yp + np;
  const winning = side === "YES" ? yp : np;
  if (winning <= 0) return { payout: 0, ratio: 0 };
  const net = gross * (1 - TAX_RATE - COMMISSION_RATE);
  const payout = Math.round((stake / winning) * net);
  return { payout, ratio: stake > 0 ? payout / stake : 0 };
}

function leanFor(ratio: number): LeanLevel {
  if (ratio < 1.0) return "negative";
  if (ratio < THIN_PROFIT_RATIO) return "thin";
  return "fair";
}

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
  /** Used in the confirm modal headline. */
  marketTitle?: string;
  /** ISO timestamp when this market closes — when the wall clock crosses
   *  this, the dial freezes and shows a "Closed — awaiting settlement"
   *  state on the next render so the player sees the transition without
   *  a hard refresh. */
  resolutionAt?: string;
};

export function ConvictionDial({ marketId, yesPool, noPool, baseStake = 5_000, initial = 0.5, marketTitle, resolutionAt }: Props) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  // closedNow flips the moment the wall clock crosses resolutionAt.
  // Tick once a second — cheap, and the dial's already mounted as a
  // client component. We compute lazily on mount + tick so SSR returns
  // the open state and the client takes over without flicker.
  const [closedNow, setClosedNow] = useState(false);
  useEffect(() => {
    if (!resolutionAt) return;
    const closeTs = Date.parse(resolutionAt);
    const update = () => setClosedNow(Date.now() >= closeTs);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [resolutionAt]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    variant: "success" | "danger";
    side: "YES" | "NO";
    stake: number;
    payoutIfWin: number;
    error?: string;
  } | null>(null);
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

  // Manual stake input — bidirectional bridge to the dial position.
  // The slider can't easily land on a specific shilling amount
  // (it's continuous), so we let the player type the number directly
  // and translate it back to a dial position using the inverse of
  // the multiplier curve. Keystrokes update the slider live so the
  // two stay locked.
  const [stakeText, setStakeText] = useState<string>("");
  const [editingStake, setEditingStake] = useState(false);
  // Side at the moment the input was focused — preserved for the
  // whole editing session so that typing transient stakes that round
  // through the centre (e.g. dropping below baseStake) doesn't flip
  // the dial to the other side. Captured on focus, cleared on blur.
  const editingSideRef = useRef<"left" | "right" | null>(null);
  // Mirror the rolling stake into the input whenever the user isn't
  // actively typing — keeps the field in step with slider drags.
  useEffect(() => {
    if (!editingStake) setStakeText(String(stake));
  }, [stake, editingStake]);

  /** Translate a typed stake (TZS) back to a slider position. */
  const posFromStake = useCallback((tzs: number): number => {
    const minDial = baseStake;          // multiplier 1 → baseStake
    const maxDial = baseStake * 5;      // multiplier 5 → baseStake × 5
    const clamped = Math.max(minDial, Math.min(maxDial, tzs));
    const mult = clamped / baseStake;
    // Inverse of (1 + 4·dist²) → dist = √((mult−1)/4)
    const dist = Math.sqrt(Math.max(0, (mult - 1) / 4));
    // Side priority: editingSideRef (captured on focus) wins so an
    // in-flight edit can't accidentally cross the centre. Otherwise
    // preserve the current pos's side; default to YES if neutral.
    const fallback = pos === 0.5 ? "right" : pos > 0.5 ? "right" : "left";
    const goingRight = (editingSideRef.current ?? fallback) === "right";
    return Math.max(0, Math.min(1, 0.5 + (goingRight ? dist : -dist) / 2));
  }, [baseStake, pos]);

  const onStakeInput = (raw: string) => {
    // Strip everything except digits — players paste " TZS 12,500" all the time.
    const cleaned = raw.replace(/[^\d]/g, "");
    setStakeText(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setPos(posFromStake(parsed));
  };

  // Whole-pool projection — payout AND warning level
  const proj = side === "NEUTRAL"
    ? { payout: 0, ratio: 0 }
    : projectWhole(yesPool, noPool, side, stake);
  const lean: LeanLevel = side === "NEUTRAL" ? "fair" : leanFor(proj.ratio);
  const payoutRolled = useRollingNumber(proj.payout);
  const payoutDisplay = Math.max(0, Math.round(payoutRolled));

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
    // Resuming a drag means the player is back to slider control —
    // exit any in-flight stake-input edit so the input goes back to
    // mirroring the dragged value live. Without this, the input
    // stays frozen at whatever the player last typed even though
    // the slider has moved.
    setEditingStake(false);
    editingSideRef.current = null;
    setFromClientX(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.10 : 0.02;
    if (e.key === "ArrowLeft")  { e.preventDefault(); setPos((p) => Math.max(0, p - step)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => Math.min(1, p + step)); }
    if (e.key === "Home")       { e.preventDefault(); setPos(0); }
    if (e.key === "End")        { e.preventDefault(); setPos(1); }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); openConfirm(); }
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

  const openConfirm = () => {
    if (side === "NEUTRAL" || pending) return;
    setConfirmOpen(true);
  };

  /** Translate a server error message into a user-friendly title + body
   *  + variant. International betting platforms always close the betting
   *  popup on resolution and fire a clear toast — never leave a half-open
   *  modal with a generic banner inside. */
  const errorToToast = (err: string): { title: string; body: string; variant: "danger" | "warning" } => {
    const e = err.toLowerCase();
    if (e.includes("balance") || e.includes("funds") || e.includes("wallet"))
      return {
        title: "Insufficient balance · Salio halitoshi",
        body: "Top up your wallet to place this stake. Tap Wallet → Deposit.",
        variant: "danger",
      };
    if (e.includes("closed") || e.includes("resolv") || e.includes("voided"))
      return {
        title: "Market is closed · Soko limefungwa",
        body: "This market has stopped accepting predictions.",
        variant: "warning",
      };
    if (e.includes("self") && e.includes("exclu"))
      return {
        title: "Account in self-exclusion",
        body: "Predictions are paused. Manage in Profile → Responsible gambling.",
        variant: "warning",
      };
    if (e.includes("rate") || e.includes("limit"))
      return {
        title: "Slow down · Subiri",
        body: "Too many attempts in a row. Try again in a moment.",
        variant: "warning",
      };
    return { title: "Could not place", body: err, variant: "danger" };
  };

  const submit = () => {
    if (side === "NEUTRAL" || pending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("side", side);
      fd.set("stake", String(stake));
      const r = await buyPositionAction(fd);
      // Whether success or failure, the modal MUST close — leaving it
      // open with the same locked quote was racing into double-place.
      setConfirmOpen(false);
      if (!r.ok) {
        const t = errorToToast(r.error);
        // Centered failure modal — a corner toast alone is too easy to miss
        // for a money-handling failure. Toast still fires as a secondary
        // signal in the corner so the user has both.
        toast({ title: t.title, description: t.body, variant: t.variant });
        setResultData({ variant: "danger", side: side === "NEUTRAL" ? "YES" : side, stake, payoutIfWin: 0, error: t.body });
        setResultOpen(true);
        return;
      }
      toast({
        title: `Bet placed · ${side} TZS ${fmt(stake)}`,
        description: `If correct, you receive TZS ${fmt(r.data!.payoutIfWin)}.`,
        variant: "success",
      });
      setResultData({
        variant: "success",
        side: side as "YES" | "NO",
        stake,
        payoutIfWin: r.data!.payoutIfWin,
      });
      setResultOpen(true);
      // Record the side the user took on this market — the NotifyPoller
      // uses this to fire the WinCelebration only when the resolution
      // matches what the user actually picked.
      //
      // Also add this market to the notify-watch list so the poller
      // actually checks it on its next tick. Without this, only markets
      // the user explicitly opted into via NotifyPrompt would fire the
      // celebration — so the most common path (place bet → win) was
      // silently skipping the popup. Ali's report fixed in this line.
      try {
        const key = `50pick-bet-${marketId}`;
        localStorage.setItem(key, JSON.stringify({ side, stake, payoutIfWin: r.data!.payoutIfWin }));
        const WATCH_KEY = "50pick-notify-markets";
        const watchRaw = localStorage.getItem(WATCH_KEY);
        const watch: string[] = watchRaw ? (JSON.parse(watchRaw) as string[]) : [];
        if (!watch.includes(marketId)) {
          watch.push(marketId);
          localStorage.setItem(WATCH_KEY, JSON.stringify(watch));
        }
      } catch { /* private browsing */ }
      // Tell the bell to repoll immediately — the bet-placed receipt
      // server-side fires synchronously inside buyPositionAction, so
      // by the time this event dispatches the notification is already
      // available. Eliminates the 5 s "where's my receipt?" gap.
      try { window.dispatchEvent(new Event("50pick:refresh-notifications")); } catch {}
      router.refresh();
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
        tabIndex={closedNow ? -1 : 0}
        aria-label="Drag to set side and conviction"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaValue}
        aria-disabled={closedNow ? "true" : "false"}
        onPointerDown={closedNow ? undefined : onPointerDown}
        onKeyDown={closedNow ? undefined : onKeyDown}
        onPointerEnter={closedNow ? undefined : () => setHover(true)}
        onPointerLeave={closedNow ? undefined : () => setHover(false)}
        className={`relative w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-md touch-none transition-opacity ${closedNow ? "opacity-40" : ""}`}
        style={{ height, cursor: closedNow ? "not-allowed" : (dragging ? "grabbing" : "grab") }}
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
            {side === "NEUTRAL" ? "drag the dial" : `${side}`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1">
            Stake · dau
          </p>
          <div className="inline-flex items-baseline justify-end gap-1.5">
            <span className="font-mono text-[14px] font-semibold text-text-muted leading-none">TZS</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={editingStake ? stakeText : fmt(stake)}
              onFocus={(e) => {
                setEditingStake(true);
                setStakeText(String(stake));
                // Capture the side at focus time so the whole editing
                // session stays on the user's currently-chosen side
                // — typing a value that maps to a position near the
                // centre won't accidentally flip YES↔NO. Neutral
                // (pos === 0.5) defaults to right (YES).
                editingSideRef.current = pos < 0.5 ? "left" : "right";
                // Select all on focus so the player can replace the
                // amount in one tap — keeps the interaction "type the
                // exact number" friction-free.
                requestAnimationFrame(() => e.target.select());
              }}
              onBlur={() => {
                setEditingStake(false);
                editingSideRef.current = null;
                // No snap on blur — the slider is already at the
                // typed-value position (keystrokes drove setPos
                // live). Snapping again would overwrite any drag
                // the player did after typing.
              }}
              onChange={(e) => onStakeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                // Bubble-stop arrow keys so the dial's keyboard
                // handler doesn't also shift position while the
                // player is editing the number.
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
              }}
              aria-label="Stake amount in TZS"
              className="font-mono font-bold text-[20px] tabular-nums leading-none text-text bg-transparent text-right outline-none w-[7.5ch] focus:bg-bg-overlay focus:rounded-md focus:px-1.5 focus:py-0.5 transition-all"
              style={{ letterSpacing: "-0.02em" }}
            />
          </div>
          <p className="mt-1 font-mono text-[9px] text-text-subtle">
            {fmt(baseStake)} – {fmt(baseStake * 5)} · type or slide
          </p>
        </div>
      </div>

      {/* Projected payout (whole-pool) */}
      {side !== "NEUTRAL" && (
        <div className="mt-3 grid grid-cols-2 gap-3 items-baseline rounded-md border border-border bg-bg-overlay px-3 py-2.5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1">If correct · Ukishinda</p>
            <p
              className="font-mono font-bold text-[18px] tabular-nums leading-none"
              style={{
                letterSpacing: "-0.02em",
                color:
                  lean === "negative" ? "var(--no-300)"
                  : lean === "thin"   ? "var(--warning-fg)"
                  : "var(--gold-300)",
              }}
            >
              TZS {fmt(payoutDisplay)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1">Net</p>
            <p
              className="font-mono font-bold text-[14px] tabular-nums leading-none"
              style={{
                color:
                  payoutDisplay - stake < 0 ? "var(--no-300)"
                  : payoutDisplay - stake < (THIN_PROFIT_RATIO - 1) * stake ? "var(--warning-fg)"
                  : "var(--gold-300)",
              }}
            >
              {payoutDisplay - stake >= 0 ? "+" : "−"}TZS {fmt(Math.abs(payoutDisplay - stake))}
            </p>
          </div>
        </div>
      )}

      {/* House-lean disclosure — only when ratio is sub-fair */}
      {side !== "NEUTRAL" && (
        <HouseLeanWarning level={lean} payout={proj.payout} stake={stake} />
      )}

      {/* Compact place-bet pill — opens the confirm modal. Sits inline with
          a hint instead of taking the full width with a giant gold slab. */}
      <div className="mt-4 flex items-center gap-3">
        <p className="flex-1 text-[11px] text-text-subtle leading-snug">
          {closedNow
            ? "Market closed · Soko limefungwa"
            : side === "NEUTRAL"
              ? "Drag the dial · Vuta dial kuanza"
              : "Pool-share payout. Confirm in a popup."}
        </p>
        <button
          type="button"
          onClick={closedNow ? undefined : openConfirm}
          disabled={closedNow || pending || side === "NEUTRAL"}
          aria-label={
            closedNow ? "Market closed — awaiting settlement"
            : side === "NEUTRAL" ? "Drag the dial to commit"
            : `Place ${side} for TZS ${fmt(stake)}`
          }
          className={closedNow ? "btn btn-ghost btn-md" : (side === "NEUTRAL" ? "btn btn-ghost btn-md" : "btn btn-gold btn-md")}
          style={{ borderRadius: 999, minWidth: 168, fontVariantNumeric: "tabular-nums" }}
        >
          {closedNow
            ? "Closed · awaiting settle"
            : side === "NEUTRAL"
              ? "—"
              : (
                <>
                  <span>Place {side}</span>
                  <span className="font-mono opacity-90">TZS {fmt(stake)}</span>
                </>
              )}
        </button>
      </div>

      <BetConfirmModal
        open={confirmOpen}
        side={side === "NEUTRAL" ? "YES" : side}
        stake={stake}
        multiplier={multiplier}
        payout={proj.payout}
        ratio={proj.ratio}
        lean={lean}
        pending={pending}
        marketTitle={marketTitle}
        onConfirm={submit}
        onCancel={() => { if (!pending) setConfirmOpen(false); }}
      />

      {resultData && (
        <OperationResultModal
          open={resultOpen}
          variant={resultData.variant}
          eyebrow={resultData.variant === "success" ? "Bet placed · Dau lipo" : "Could not place bet"}
          title={resultData.variant === "success" ? `${resultData.side} · TZS ${fmt(resultData.stake)}` : (resultData.error ?? "Try again")}
          subtitle={
            resultData.variant === "success"
              ? (marketTitle ?? "Position open. We'll notify you on resolution.")
              : "Your stake hasn't moved · Dau lako halijaondoka."
          }
          details={resultData.variant === "success" ? [
            { label: "If correct", sw: "Ukishinda", value: `TZS ${fmt(resultData.payoutIfWin)}`, tone: "good" },
            { label: "Net profit", sw: "Faida", value: `+TZS ${fmt(Math.max(0, resultData.payoutIfWin - resultData.stake))}`, tone: "good" },
          ] : undefined}
          footnote={resultData.variant === "success" ? "Bahati njema · Good luck." : undefined}
          primaryLabel={resultData.variant === "success" ? "Done · Sawa" : "Close"}
          secondaryLabel={resultData.variant === "success" ? "View positions" : undefined}
          onSecondary={resultData.variant === "success" ? () => router.push("/positions") : undefined}
          onClose={() => setResultOpen(false)}
          // Bet-placed gets the longer 10 s hold — gives the player
          // time to read the payout block AND notice the bell
          // notification, so the two signals never feel out of sync.
          autoCloseMs={resultData.variant === "success" ? 10_000 : undefined}
        />
      )}

      <style>{`
        @keyframes csrf-breathe { 0%,100% { opacity: 0.35; } 50% { opacity: 0.7; } }
        .csrf-rest-ring { animation: csrf-breathe 2.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
