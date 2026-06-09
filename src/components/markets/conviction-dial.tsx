"use client";

/**
 * ConvictionDial — 1:1 port of `kit/conviction-slider-round.jsx`.
 *
 * A weighted squircle dial. One gesture sets BOTH side and stake:
 *   • Position 0..1 along the track — left = YES, right = NO, centre = NEUTRAL
 *   • Distance from centre maps quadratically to a multiplier (1× → 5×)
 *   • Stake = baseStake × multiplier
 *
 * Theme-adaptive (uses --bar-track / --bar-needle / --text), accessible (slider
 * role + ArrowKey/Home/End), pointer + touch + keyboard, no jank — the
 * multiplier and stake numerals tween critically-damped, no snapping.
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { InfoHint } from "@/components/ui/info-hint";
import { useToast } from "@/components/ui/toast";
import { buyPositionAction } from "@/app/markets/actions";
import { HouseLeanWarning } from "./house-lean-warning";
import { BetConfirmModal } from "./bet-confirm-modal";
import { OperationResultModal } from "./operation-result-modal";
import { payoutFor, leanFor, type LeanLevel } from "@/lib/payout";

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
const NEUTRAL_BAND = 0.01;

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
  /** Player's current spendable balance — used to show an inline
   *  "insufficient balance" warning BEFORE they tap Place, not after. */
  balance?: number;
};

export function ConvictionDial({ marketId, yesPool, noPool, baseStake = 500, initial = 0.5, marketTitle, resolutionAt, balance }: Props) {
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
  const maxMultiplier = 200;
  const isNeutral = distFromCenter < NEUTRAL_BAND;
  // Per management spec (license review · 2026-05):
  // slide LEFT → YES, slide RIGHT → NO. Inverted from the original
  // kit prototype because licensed Tanzania conventions place the
  // affirmative ("ndio") on the left.
  const side: Side = isNeutral ? "NEUTRAL" : pos < 0.5 ? "YES" : "NO";
  // Snap on TARGET, not on tweened value — otherwise `stake`
  // momentarily disagrees with itself across two consecutive DOM
  // reads (input.value vs. Place-button text) during the 150 ms
  // settle window. The architect-stress E.1 invariant catches that.
  const stakeTargetFromSlider = baseStake * (1 + conviction * (maxMultiplier - 1));
  const stakeFromSlider = Math.max(100, Math.round(stakeTargetFromSlider / 100) * 100);

  // THREE coordinated inputs share one source of truth:
  //   1 · DRAG the dial         → pos  → stakeFromSlider (snap-to-100)
  //   2 · TYPE a stake (TZS)    → exactStake lock, pos via posFromStake
  //   3 · TYPE a multiplier (×) → exactMultiplier lock, pos via same path
  //
  // exactStake and exactMultiplier are MUTUALLY EXCLUSIVE: typing in
  // one input clears the other's lock, so the player always commits
  // through a single intent. Both clear on drag commit / arrow keys.
  const [stakeText, setStakeText] = useState<string>("");
  const [editingStake, setEditingStake] = useState(false);
  const [exactStake, setExactStakeState] = useState<number | null>(null);
  // Multiplier input mirrors the stake input one-for-one — same kit
  // Input atom, same focus/blur lifecycle, same side-preservation.
  const [multText, setMultText] = useState<string>("");
  const [editingMult, setEditingMult] = useState(false);
  const [exactMultiplier, setExactMultiplierState] = useState<number | null>(null);
  // Mutex setters — picking one unit clears the other so the two
  // exact-locks can never disagree about what the player wanted.
  const setExactStake = useCallback((v: number | null) => {
    setExactStakeState(v);
    if (v !== null) setExactMultiplierState(null);
  }, []);
  const setExactMultiplier = useCallback((v: number | null) => {
    setExactMultiplierState(v);
    if (v !== null) setExactStakeState(null);
  }, []);
  const clearBothLocks = useCallback(() => {
    setExactStakeState(null);
    setExactMultiplierState(null);
  }, []);

  // The effective stake — what gets sent to the server, what's
  // displayed, what powers the payout projection. Priority:
  //   1) typed multiplier (computed stake) → 2) typed stake →
  //   3) slider snap.
  const stake = exactStake !== null
    ? exactStake
    : exactMultiplier !== null
      ? Math.max(baseStake, Math.min(baseStake * maxMultiplier, Math.round(baseStake * exactMultiplier)))
      : stakeFromSlider;
  // Knob multiplier target — when a lock is set, derive truthfully
  // from the typed unit. Otherwise use pos-derived geometry. Tween
  // via useRollingNumber for smooth visual.
  const multiplierTarget = exactMultiplier !== null
    ? exactMultiplier
    : exactStake !== null
      ? exactStake / baseStake
      : 1 + conviction * (maxMultiplier - 1);
  const multiplier = useRollingNumber(multiplierTarget);
  // Side at the moment the input was focused — preserved for the
  // whole editing session so that typing transient stakes that round
  // through the centre (e.g. dropping below baseStake) doesn't flip
  // the dial to the other side. Captured on focus, cleared on blur.
  const editingSideRef = useRef<"left" | "right" | null>(null);
  // Mirror the effective stake / multiplier into their inputs when
  // the user isn't typing in THAT field. We DO mirror during drag
  // because the player wants to see the live value — but we use a
  // ref+RAF coalescer (see `setFromClientX` above) so we update at
  // most once per animation frame regardless of pointer rate.
  useEffect(() => {
    if (!editingStake) setStakeText(String(stake));
  }, [stake, editingStake]);
  useEffect(() => {
    if (!editingMult) setMultText(multiplierTarget.toFixed(2));
  }, [multiplierTarget, editingMult]);

  /** Translate a typed stake (TZS) back to a slider position.
   *
   *  Architectural subtlety: when the player types EXACTLY baseStake
   *  (mult = 1, dist = 0), the unconstrained inverse lands on pos =
   *  0.5 — which is INSIDE NEUTRAL_BAND, so `side` derives as NEUTRAL
   *  and the Place button disappears. To preserve the player's chosen
   *  side, we floor `dist` to just past the neutral band when an
   *  editing intent (or current side) exists. The knob visually
   *  nudges ~2.3% off-centre but the displayed multiplier is
   *  overridden to "1.00×" via exactStake (above) so the player sees
   *  a coherent { side, 1.00×, TZS 500, Place button } state. */
  const posFromStake = useCallback((tzs: number): number => {
    const minDial = baseStake;          // multiplier 1 → baseStake
    const maxDial = baseStake * maxMultiplier; // multiplier 200 → baseStake × 200
    const clamped = Math.max(minDial, Math.min(maxDial, tzs));
    const mult = clamped / baseStake;
    // Inverse of (1 + (maxMult-1)·dist²) → dist = √((mult−1)/(maxMult-1))
    const dist = Math.sqrt(Math.max(0, (mult - 1) / (maxMultiplier - 1)));
    // Side priority: editingSideRef (captured on focus) wins so an
    // in-flight edit can't accidentally cross the centre. Otherwise
    // preserve the current pos's side; default to YES if neutral.
    const fallback = pos === 0.5 ? "right" : pos > 0.5 ? "right" : "left";
    const chosen = editingSideRef.current ?? fallback;
    const goingRight = chosen === "right";
    // If we have a committed side, ensure the resulting pos sits
    // outside NEUTRAL_BAND so the dial preserves it.
    const minDist = NEUTRAL_BAND + 0.005;
    const effDist = chosen ? Math.max(dist, minDist) : dist;
    return Math.max(0, Math.min(1, 0.5 + (goingRight ? effDist : -effDist) / 2));
  }, [baseStake, pos]);

  // Dial's typeable range. Anything outside this can't be represented
  // on the slider; we still let the user type freely (so they see
  // what they're keying), but the slider clamps + the input flashes
  // an "out of range — will adjust" hint until blur or correction.
  const minDial = baseStake;
  const maxDial = baseStake * maxMultiplier;
  const typedNumber = (() => {
    const n = parseInt(stakeText.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  })();
  const isOverMax = editingStake && typedNumber > maxDial;
  const isUnderMin = editingStake && typedNumber > 0 && typedNumber < minDial;
  const isOutOfRange = isOverMax || isUnderMin;

  // Multiplier input range: [1.00, 200.00] matches the dial's geometry.
  const MULT_MIN = 1;
  const MULT_MAX = 200;
  const typedMult = (() => {
    const n = parseFloat(multText);
    return Number.isFinite(n) ? n : 0;
  })();
  const isMultOverMax = editingMult && typedMult > MULT_MAX;
  const isMultUnderMin = editingMult && typedMult > 0 && typedMult < MULT_MIN;
  const isMultOutOfRange = isMultOverMax || isMultUnderMin;

  const onStakeInput = (raw: string) => {
    // Strip everything except digits — players paste " TZS 12,500" all the time.
    // Also cap the visible length at 7 digits — TZS 9,999,999 is well
    // above the platform's hard cap and longer strings are pasted
    // garbage that would push the layout out.
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 7);
    setStakeText(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Empty or zero — clear the exact lock so the slider takes over.
      setExactStake(null);
      return;
    }
    // The slider's position uses the clamped value — posFromStake
    // already clamps to [minDial, maxDial] internally so this is
    // a no-op-safe pass-through.
    setPos(posFromStake(parsed));
    // Lock the EXACT typed value (clamped to dial range) as the
    // effective stake. This is what makes "type 10,475 → bet 10,475"
    // work, instead of snapping to 10,500 via the drag-based round.
    // setExactStake (mutex) clears any active exactMultiplier lock.
    setExactStake(Math.max(minDial, Math.min(maxDial, parsed)));
  };

  /** Translate a typed multiplier (e.g. 2.5) to the equivalent stake
   *  and route through posFromStake. Reuses the same side-preservation
   *  + neutral-band-floor logic so a typed 1.00× doesn't collapse to
   *  NEUTRAL. Mutually exclusive with exactStake. */
  const onMultInput = (raw: string) => {
    // Strip non-digit / non-dot, keep only first decimal point,
    // cap at "X.XX" (4 chars). Decimal precision past 0.01× isn't
    // meaningful since the bet stake is rounded to the shilling.
    const stripped = raw.replace(/[^\d.]/g, "");
    const firstDot = stripped.indexOf(".");
    const oneDot = firstDot === -1
      ? stripped
      : stripped.slice(0, firstDot + 1) + stripped.slice(firstDot + 1).replace(/\./g, "");
    const cleaned = oneDot.slice(0, 4);
    setMultText(cleaned);
    const parsed = parseFloat(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Empty / "." alone / zero — release the multiplier lock so
      // the slider takes over again.
      setExactMultiplier(null);
      return;
    }
    const clampedMult = Math.max(MULT_MIN, Math.min(MULT_MAX, parsed));
    // Route the dial position through posFromStake using the
    // equivalent stake — gives us the same neutral-band-floor and
    // side-preservation guarantees that the stake input has.
    const equivalentStake = Math.round(baseStake * clampedMult);
    setPos(posFromStake(equivalentStake));
    setExactMultiplier(clampedMult);
  };

  /** Settle the input on blur / Enter to the clamped value.
   *
   *  If the player is blurring the input by clicking the slider
   *  track (which fires its own onPointerDown handler), we MUST
   *  NOT re-assert the exact lock here — the drag handler has
   *  already cleared exactStake to null and we'd be undoing it
   *  microseconds later. Detect that by checking whether the
   *  drag is in flight (draggingRef) and skip the re-affirm. */
  const draggingRef = useRef(false);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  const settleStakeOnExit = () => {
    setEditingStake(false);
    editingSideRef.current = null;
    const parsed = parseInt(stakeText.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const clamped = Math.max(minDial, Math.min(maxDial, parsed));
    if (clamped !== parsed) setStakeText(String(clamped));
    // Only re-affirm the exact lock if the blur is NOT caused by
    // a drag starting. If draggingRef is true, leave exactStake
    // null so the slider's snapped value wins.
    if (!draggingRef.current) setExactStake(clamped);
  };

  /** Settle the multiplier input on blur / Enter. Mirror of
   *  settleStakeOnExit — clamps to [1.00, 5.00], normalises the
   *  display text to 2-decimal form, and re-affirms the lock
   *  unless a drag is in flight. */
  const settleMultOnExit = () => {
    setEditingMult(false);
    editingSideRef.current = null;
    const parsed = parseFloat(multText);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const clamped = Math.max(MULT_MIN, Math.min(MULT_MAX, parsed));
    setMultText(clamped.toFixed(2));
    if (!draggingRef.current) setExactMultiplier(clamped);
  };

  // Whole-pool projection — payout AND warning level. Single source of
  // truth lives in `@/lib/payout` so the dial, the confirm modal, the
  // position card, and the server settlement engine never disagree.
  const proj = side === "NEUTRAL"
    ? { payout: 0, ratio: 0 }
    : payoutFor({ yesPool, noPool, side, stake });
  const lean: LeanLevel = side === "NEUTRAL" ? "fair" : leanFor(proj.ratio);
  const payoutRolled = useRollingNumber(proj.payout);
  const payoutDisplay = Math.max(0, Math.round(payoutRolled));

  // Strength curve (calmed): linear ramp out of the neutral band, then
  // tapered after a 0.7 peak so the side glow stops escalating into an
  // alarm at the extremes. Matches the design handoff's halo softening.
  const rawStrength = Math.max(0, (distFromCenter - NEUTRAL_BAND) / (1 - NEUTRAL_BAND));
  const haloStrength = rawStrength < 0.7
    ? rawStrength
    : 0.7 - (rawStrength - 0.7) * 0.5;
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

  // RAF-throttled pos update — pointermove can fire > 60 fps on
  // high-rate trackpads, and each setState cascades through the
  // rolling-tween + mirror-effect chain. Coalescing into one
  // update per animation frame keeps drag butter-smooth.
  const pendingClientXRef = useRef<number | null>(null);
  const rafScheduledRef = useRef(false);
  const setFromClientX = useCallback((clientX: number) => {
    pendingClientXRef.current = clientX;
    if (rafScheduledRef.current) return;
    rafScheduledRef.current = true;
    requestAnimationFrame(() => {
      rafScheduledRef.current = false;
      const cx = pendingClientXRef.current;
      pendingClientXRef.current = null;
      if (cx === null || !trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      const next = Math.max(0, Math.min(1, (cx - r.left) / r.width));
      setPos(next);
    });
  }, []);

  // Tap-vs-drag discrimination. A pure click on the track (no
  // movement) MUST NOT overwrite a typed exact value with the
  // slider's snap-to-100, otherwise typing 6,210 → clicking
  // anywhere on the dial silently becomes 6,200. We commit to
  // slider mode only after the pointer crosses DRAG_COMMIT_PX.
  //
  // The previous version used two refs (`dragStartXRef` + a
  // `dragCommittedRef` boolean) which could in principle drift
  // out of sync. Now they live in a single discriminated union —
  // impossible to be `committed` without a `startX`, impossible
  // to read `startX` when idle.
  const DRAG_COMMIT_PX = 4;
  type DragMode =
    | { kind: "idle" }
    | { kind: "pending_commit"; startX: number }
    | { kind: "committed"; startX: number };
  const dragModeRef = useRef<DragMode>({ kind: "idle" });

  // Pointer events handle mouse + touch + pen uniformly
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      const mode = dragModeRef.current;
      if (mode.kind === "pending_commit") {
        if (Math.abs(e.clientX - mode.startX) < DRAG_COMMIT_PX) return;
        // Crossed the threshold — this is a real drag. Take over
        // slider mode: clear BOTH typed-exact locks (stake AND
        // multiplier) so snap-to-100 governs from here.
        dragModeRef.current = { kind: "committed", startX: mode.startX };
        clearBothLocks();
      }
      setFromClientX(e.clientX);
    };
    const up = () => {
      setDragging(false);
      dragModeRef.current = { kind: "idle" };
    };
    // `passive: false` on pointermove so e.preventDefault() actually
    // works on mobile — passive listeners silently ignore it, and
    // Chrome 56+ defaults touch listeners to passive on window.
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, setFromClientX]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent default FIRST — stops mobile browsers from initiating
    // scroll, pull-to-refresh, or long-press menus that compete with
    // the drag gesture. Must fire before any state updates.
    e.preventDefault();
    setDragging(true);
    // Always exit any in-flight input edit — clicking the dial is
    // unambiguously a "done with both inputs" intent.
    setEditingStake(false);
    setEditingMult(false);
    editingSideRef.current = null;
    if (exactStake !== null || exactMultiplier !== null) {
      // Player has a typed exact value (either unit) to protect.
      // Don't jump the knob and don't clear the locks yet — defer
      // both to the pointermove handler once a real drag is detected.
      dragModeRef.current = { kind: "pending_commit", startX: e.clientX };
    } else {
      // No typed value at risk — classic slider behaviour: jump the
      // knob to the click position immediately and treat the rest
      // of the gesture as a drag.
      dragModeRef.current = { kind: "committed", startX: e.clientX };
      setFromClientX(e.clientX);
    }
    // Capture on the CONTAINER div, not e.target — e.target may be
    // an SVG child (<path>, <text>) where setPointerCapture is buggy
    // on mobile WebKit/Blink, silently firing pointercancel and
    // ending the drag mid-slide. The container div is a regular
    // HTMLElement with reliable capture support.
    trackRef.current?.setPointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.10 : 0.02;
    // Any slider-driven movement clears BOTH typed-exact locks —
    // the player has shifted back to "slide to a vibe" mode, and
    // the snap-to-100 should re-apply.
    const move = (next: number) => { clearBothLocks(); setPos(next); };
    if (e.key === "ArrowLeft")  { e.preventDefault(); move(Math.max(0, pos - step)); }
    if (e.key === "ArrowRight") { e.preventDefault(); move(Math.min(1, pos + step)); }
    if (e.key === "Home")       { e.preventDefault(); move(0); }
    if (e.key === "End")        { e.preventDefault(); move(1); }
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
  // SVG horizontal padding — gives the halo glow, drop shadow, and
  // breathing ring room to render past the track edges without being
  // clipped by the container's overflow-hidden. The viewBox extends
  // PAD px on each side; the container stays the same visual width.
  const PAD = 40;
  const knobScale = 1 + 0.08 * conviction + (dragging ? 0.04 : 0);
  const needleX = PAD + pos * (width - knobR * 2) + knobR;
  const tilt = (pos - 0.5) * 18;
  // YES fills the LEFT half (pos < 0.5), NO fills the RIGHT half (pos > 0.5).
  // Matches the side-derivation flip above.
  const yesFillW = pos < 0.5 ? (0.5 - pos) * width : 0;
  const noFillW  = pos > 0.5 ? (pos - 0.5) * width : 0;
  const sqPath = squirclePath(knobR);

  // Locked quote — captured the moment the player opens the confirm
  // modal. Any subsequent dial/input edit DOES NOT change what
  // the modal displays or what the server gets. Prevents the
  // "open modal at TZS 5,000 → change dial behind it → bet TZS
  // 25,000" UX-tamper / scam vector that abuse testing surfaced.
  const [lockedQuote, setLockedQuote] = useState<{
    stake: number;
    side: "YES" | "NO";
    multiplier: number;
  } | null>(null);

  const openConfirm = () => {
    if (side === "NEUTRAL" || pending) return;
    setLockedQuote({ stake, side, multiplier: multiplierTarget });
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
        body: "Too many attempts in a row. Try again in a moment · Jaribu tena baada ya muda kidogo.",
        variant: "warning",
      };
    return { title: "Could not place · Haikuwekwa", body: err, variant: "danger" };
  };

  const submit = () => {
    // Read EXCLUSIVELY from the locked quote captured at modal open.
    // The live `side` / `stake` may have changed if the player
    // tampered with the dial behind the modal — we ignore those.
    if (!lockedQuote || pending) return;
    const q = lockedQuote;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("side", q.side);
      fd.set("stake", String(q.stake));
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
        setResultData({ variant: "danger", side: q.side, stake: q.stake, payoutIfWin: 0, error: t.body });
        setResultOpen(true);
        // Reset dial so the failed stake doesn't linger — the player
        // should re-aim rather than seeing a stale amount.
        setPos(initial);
        setExactStakeState(null);
        setExactMultiplierState(null);
        setStakeText("");
        setMultText("");
        return;
      }
      toast({
        title: `Bet placed · ${q.side} TZS ${fmt(q.stake)}`,
        description: "Payout calculated at resolution.",
        variant: "success",
      });
      setResultData({
        variant: "success",
        side: q.side,
        stake: q.stake,
        payoutIfWin: r.data!.payoutIfWin,
      });
      setResultOpen(true);
      // Reset the dial to its initial neutral position after a
      // successful bet. The previous behaviour kept the dial parked
      // at the user's last conviction, which read as "your bet" the
      // next time they opened the page — misleading. Clear the typed
      // exact-locks too so the stake/multiplier inputs reflect the
      // canonical base again.
      setPos(initial);
      setExactStakeState(null);
      setExactMultiplierState(null);
      setStakeText("");
      setMultText("");
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
        localStorage.setItem(key, JSON.stringify({ side: q.side, stake: q.stake, payoutIfWin: r.data!.payoutIfWin }));
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
        aria-valuetext={`${side === "NEUTRAL" ? "Neutral" : side}, ${multiplierTarget.toFixed(2)} times, TZS ${fmt(stake)}`}
        aria-disabled={closedNow ? "true" : "false"}
        onPointerDown={closedNow ? undefined : onPointerDown}
        onKeyDown={closedNow ? undefined : onKeyDown}
        onPointerEnter={closedNow ? undefined : () => setHover(true)}
        onPointerLeave={closedNow ? undefined : () => setHover(false)}
        className={`relative w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md touch-none transition-opacity ${closedNow ? "opacity-40" : ""}`}
        style={{ height, cursor: closedNow ? "not-allowed" : (dragging ? "grabbing" : "grab") }}
      >
        <svg viewBox={`0 0 ${width + PAD * 2} ${height}`} width="100%" height={height} className="block overflow-visible">
          <defs>
            {/* YES gradient: bright at LEFT (knob), dim at centre. */}
            <linearGradient id={`csrf-yes-${marketId}`} x1="1" x2="0">
              <stop offset="0%"  stopColor="oklch(40% 0.10 152)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(58% 0.16 152)" />
            </linearGradient>
            {/* NO gradient: bright at RIGHT (knob), dim at centre. */}
            <linearGradient id={`csrf-no-${marketId}`} x1="0" x2="1">
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

          {/* Track group — offset by PAD so the track aligns with the
              container while the viewBox extends PAD px on each side for
              the knob's halo/shadow to render without clipping. */}
          <g transform={`translate(${PAD}, 0)`}>
          {/* Track */}
          <rect x="0" y={trackY} width={width} height={trackH} rx={trackH / 2}
                fill="var(--bar-track)" stroke="var(--bar-track-border)" strokeWidth="1" />

          {/* Inactive-side hint tint */}
          <rect x="0" y={trackY} width={width / 2} height={trackH} rx={trackH / 2}
                fill="oklch(58% 0.16 152)" opacity="0.10" />
          <rect x={width / 2} y={trackY} width={width / 2} height={trackH} rx={trackH / 2}
                fill="oklch(60% 0.18 22)" opacity="0.10" />

          {/* Midpoint marker */}
          <line x1={width / 2} x2={width / 2}
                y1={trackY - 4} y2={trackY + trackH + 4}
                stroke="var(--bar-track-border)" strokeWidth="1" />

          {/* Tachymeter detents */}
          {[1000, 5000, 10000, 25000, 50000, 100000].flatMap((tzs) => {
            const m = tzs / baseStake;
            const dist = Math.sqrt(Math.max(0, (m - 1) / (maxMultiplier - 1)));
            const isEdge = tzs === baseStake * maxMultiplier;
            return ["YES", "NO"].map((s) => {
              const px = s === "YES" ? (0.5 - 0.5 * dist) * width : (0.5 + 0.5 * dist) * width;
              return (
                <g key={`${s}-${m}`} aria-hidden>
                  <line
                    x1={px} x2={px}
                    y1={trackY - 4} y2={trackY + trackH + 4}
                    stroke="var(--text-muted)"
                    strokeWidth={isEdge ? 1 : 0.75}
                    opacity={isEdge ? 0.55 : 0.32}
                  />
                  {!isEdge && (
                    <text
                      x={px} y={trackY - 8}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="500"
                      fontSize="7.5"
                      fill="var(--text-muted)"
                      opacity={0.55}
                      letterSpacing="0.04em"
                    >
                      {tzs >= 1000 ? `${tzs / 1000}k` : String(tzs)}
                    </text>
                  )}
                </g>
              );
            });
          })}

          {/* Side fills from center — YES fills LEFT (from pos*width back to centre),
              NO fills RIGHT (from centre forward). */}
          {yesFillW > 0 && (
            <rect x={pos * width} y={trackY} width={yesFillW} height={trackH} rx={trackH / 2}
                  fill={`url(#csrf-yes-${marketId})`} />
          )}
          {noFillW > 0 && (
            <rect x={width / 2} y={trackY} width={noFillW} height={trackH} rx={trackH / 2}
                  fill={`url(#csrf-no-${marketId})`} />
          )}
          </g>{/* end track group */}

          {/* Conviction halo — softened curve. Peaks at ~70% conviction
              and eases back to ~55% at the extremes so the glow stops
              escalating into an alarm. The number leads, not the light. */}
          {haloStrength > 0 && (
            <circle cx={needleX} cy={height / 2}
                    r={knobR * (1.4 + 0.8 * haloStrength)}
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
                {/* During an active drag the knob text snaps to the
                    target directly — no tween lag behind the cursor.
                    When the player releases, the gentle critically-
                    damped roll resumes for the next change. */}
                {(dragging ? multiplierTarget : multiplier).toFixed(2)}×
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

      {/* Readout — `grid-cols-[1fr_auto]` so the stake input keeps
          whatever width its content needs, instead of being squeezed
          into a fixed 50% column where "TZS 25,000" gets clipped.
          Text scales down on narrow viewports so "drag the dial" /
          "TZS 25,000" don't collide at < 360 px container widths. */}
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 mt-5 items-center">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1">
            {side === "NEUTRAL" ? "No conviction" : "You are picking"}
          </p>
          <p
            className="font-display font-bold text-[15px] sm:text-[22px] leading-[1.05] break-words"
            style={{ color: sideText, letterSpacing: "-0.025em" }}
          >
            {side === "NEUTRAL" ? "Pick side" : `${side}`}
          </p>
        </div>
        <div className="text-right min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1.5">
            Stake · dau
            <InfoHint
              size={10}
              label="The TZS amount you'd lose if your side doesn't win. Drag the dial further from centre to increase it. · Kiasi cha TZS unachoweza kupoteza."
            />
          </p>
          {/*
            Kit `Input` atom — the SAME form field players have already
            seen on /auth, /wallet, /profile/kyc, /wallet/deposit. The
            universal "this is a form field" affordance solves the
            "doesn't look modifiable" report without inventing a new
            visual pattern: border-border at rest, focus-within
            lights border-aqua + a 3px aqua glow shadow,
            error={isOutOfRange} swaps to border-no-500. The "TZS"
            prefix sits in a separated sub-cell, and the trailing
            pencil icon adds an extra "yes, you can edit" cue.
          */}
          <Input
            mono
            size="sm"
            prefix="TZS"
            // Pencil trailing icon dropped — it duplicated affordance the
            // border + focus ring already provide, and its 24-px padded
            // cell was eating room so the actual amount got clipped.
            // The atom's prefix cell alone occupies ~49 px; the input
            // needs the rest of the outer width to render "25,000" with
            // room to breathe.
            error={isOutOfRange}
            value={editingStake ? stakeText : fmt(stake)}
            inputMode="numeric"
            pattern="[0-9]*"
            onFocus={(e) => {
              setEditingStake(true);
              setStakeText(String(stake));
              editingSideRef.current = pos < 0.5 ? "left" : "right";
              requestAnimationFrame(() => (e.target as HTMLInputElement).select());
            }}
            onBlur={settleStakeOnExit}
            onChange={(e) => onStakeInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
            }}
            aria-label={`Stake amount in TZS — type or use the dial (min ${minDial}, max ${maxDial})`}
            aria-invalid={isOutOfRange}
            // Tabular-nums prevents digit-width jitter across the 5-
            // character span; the inner input flexes to fill whatever's
            // left between the "TZS" prefix and the pencil trailing
            // cell, so we no longer pin an explicit width here.
            className="text-right font-bold tabular-nums px-2"
            // Fixed outer width + 44 px height (WCAG 2.5.5 touch target)
            // so the stake and multiplier inputs read as a matched pair.
            containerClassName="ml-auto h-11 w-[172px]"
          />
          {/*
            Range helper line — switches to a corrective hint when the
            typed value is outside the dial range. The hint tells the
            player exactly what the slider settled to, so the clamp
            never feels arbitrary.
          */}
          {/* Range chip — replaces the tiny gray text with a kit-grade
              gradient indicator. Out-of-range states swap the gradient
              for a no-300 chip to make the clamp un-missable. */}
          {isOverMax || isUnderMin ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-no-700 bg-no-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-no-300 whitespace-nowrap">
              {isOverMax ? `Max ${fmt(maxDial)}` : `Min ${fmt(minDial)}`}
            </span>
          ) : (
            <span className="mt-1 inline-flex items-center gap-1 font-mono text-[9.5px] text-text-subtle whitespace-nowrap" data-testid="stake-range-chip">
              <span data-testid="stake-range-min" className="tabular-nums font-bold text-text-muted">{fmt(minDial)}</span>
              <span aria-hidden className="inline-block h-[2px] w-5 rounded-pill bg-gradient-to-r from-yes-500 to-gold-500" />
              <span data-testid="stake-range-max" className="tabular-nums font-bold text-text-muted">{fmt(maxDial)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Multiplier input — third coordinated entry point. Type a
          conviction strength directly (e.g. "2.50×") and the dial
          + stake both move in lock-step. Mutually exclusive with
          the stake-text lock above. Same kit Input atom for visual
          consistency. */}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle">
          Multiplier · Mara
          <InfoHint
            size={10}
            label="How strong your conviction is — 1× is a base bet (TZS 500), drag further for up to TZS 100,000. Higher conviction means higher stake AND higher payout share if you're right. · Imani ya juu, dau kubwa."
          />
        </p>
        <div className="text-right min-w-0">
          <Input
            mono
            size="sm"
            trailing="×"
            error={isMultOutOfRange}
            value={editingMult ? multText : multiplierTarget.toFixed(2)}
            inputMode="decimal"
            pattern="[0-9.]*"
            onFocus={(e) => {
              setEditingMult(true);
              setMultText(multiplierTarget.toFixed(2));
              editingSideRef.current = pos < 0.5 ? "left" : "right";
              requestAnimationFrame(() => (e.target as HTMLInputElement).select());
            }}
            onBlur={settleMultOnExit}
            onChange={(e) => onMultInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
            }}
            aria-label={`Conviction multiplier — type ${MULT_MIN.toFixed(2)}× to ${MULT_MAX.toFixed(2)}×`}
            aria-invalid={isMultOutOfRange}
            className="text-right font-bold tabular-nums px-2"
            // Same outer width + 44 px height (WCAG 2.5.5 touch target)
            // as the stake input — matched pair.
            containerClassName="ml-auto h-11 w-[172px]"
          />
          {isMultOverMax || isMultUnderMin ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-no-700 bg-no-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-no-300 whitespace-nowrap">
              {isMultOverMax ? `Max ${MULT_MAX.toFixed(2)}×` : `Min ${MULT_MIN.toFixed(2)}×`}
            </span>
          ) : (
            <span className="mt-1 inline-flex items-center gap-1 font-mono text-[9.5px] text-text-subtle whitespace-nowrap" data-testid="mult-range-chip">
              <span data-testid="mult-range-min" className="tabular-nums font-bold text-text-muted">{MULT_MIN.toFixed(2)}×</span>
              <span aria-hidden className="inline-block h-[2px] w-5 rounded-pill bg-gradient-to-r from-text-subtle to-gold-500" />
              <span data-testid="mult-range-max" className="tabular-nums font-bold text-text-muted">{MULT_MAX.toFixed(2)}×</span>
            </span>
          )}
        </div>
      </div>

      {/* Payout disclosure — per management spec (license review · 2026-05)
          the potential winning is NOT shown until the event has resolved.
          During placement the player sees their stake, multiplier, and side;
          the actual payout is communicated post-resolution via notification
          + the Positions page. */}
      {side !== "NEUTRAL" && (
        <div className="mt-3 rounded-md border border-border bg-bg-overlay px-3 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-subtle mb-1">
            Payout · Lipo
          </p>
          <p className="text-[12px] leading-relaxed text-text-muted">
            Calculated at resolution from the final pool share.
            <br />
            <span className="text-text-subtle">Itahesabiwa baada ya tukio kukamilika.</span>
          </p>
        </div>
      )}

      {/* Inline balance warning — shown BEFORE the player taps Place so
          they know immediately rather than seeing an error after the click. */}
      {side !== "NEUTRAL" && balance !== undefined && stake > balance && (
        <div className="mt-3 rounded-md border border-no-700 bg-no-500/10 px-3 py-2">
          <p className="text-[11px] font-medium text-no-300">
            Insufficient balance · Salio halitoshi
          </p>
          <p className="text-[10px] text-text-subtle mt-0.5">
            You need TZS {fmt(stake)} but have TZS {fmt(balance)}. Deposit to continue.
          </p>
        </div>
      )}

      {/* Compact place-bet pill — opens the confirm modal. Sits inline with
          a hint instead of taking the full width with a giant gold slab. */}
      <div className="mt-4 flex items-center gap-3">
        <p className="flex-1 min-w-0 text-[11px] text-text-subtle leading-snug">
          {closedNow
            ? "Market closed · Soko limefungwa"
            : side === "NEUTRAL"
              ? "Drag the dial · Vuta dial kuanza"
              : balance !== undefined && stake > balance
                ? "Top up your wallet to place this stake."
                : "Pool-share payout. Confirm in a popup."}
        </p>
        <button
          type="button"
          onClick={closedNow ? undefined : openConfirm}
          disabled={closedNow || pending || side === "NEUTRAL" || (balance !== undefined && stake > balance)}
          aria-label={
            closedNow ? "Market closed — awaiting settlement"
            : side === "NEUTRAL" ? "Drag the dial to commit"
            : `Place ${side} for TZS ${fmt(stake)}`
          }
          className={`${closedNow ? "btn btn-ghost btn-md" : (side === "NEUTRAL" ? "btn btn-ghost btn-md" : "btn btn-gold btn-md")} whitespace-normal`}
          // 44 px min-height meets WCAG 2.5.5 tap-target on mobile;
          // btn-md alone caps at 38 px.
          style={{ borderRadius: 999, minWidth: 140, minHeight: 44, fontVariantNumeric: "tabular-nums" }}
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
        // Display the LOCKED quote captured at modal open — never
        // the live `side`/`stake`/`multiplier` that the player could
        // have shifted under the modal.
        side={lockedQuote?.side ?? (side === "NEUTRAL" ? "YES" : side)}
        stake={lockedQuote?.stake ?? stake}
        multiplier={lockedQuote?.multiplier ?? multiplierTarget}
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
          eyebrow={resultData.variant === "success" ? "Bet placed · Dau lipo" : "Could not place bet · Haikuwekwa"}
          title={resultData.variant === "success" ? `${resultData.side} · TZS ${fmt(resultData.stake)}` : (resultData.error ?? "Try again · Jaribu tena")}
          subtitle={
            resultData.variant === "success"
              ? (marketTitle ?? "Position open. We'll notify you on resolution.")
              : "Your stake hasn't moved · Dau lako halijaondoka."
          }
          details={resultData.variant === "success" ? [
            { label: "Stake", sw: "Dau", value: `TZS ${fmt(resultData.stake)}` },
            { label: "Payout", sw: "Lipo", value: "At resolution" },
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
