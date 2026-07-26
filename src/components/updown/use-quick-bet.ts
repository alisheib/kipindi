"use client";

import { useState, useTransition, useMemo, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { buyPositionAction } from "@/app/markets/actions";
import { formatTzs } from "@/lib/utils";
import { quickStakes, parseStake } from "./stake-math";

// Re-exported so existing importers of these helpers keep working.
export { quickStakes, parseStake } from "./stake-math";

export type PlacedSignal = { side: "UP" | "DOWN"; amount: number; nonce: number };

/**
 * Turns each new placement `nonce` into a short-lived boolean the surface uses to add
 * the success-pulse class, then clears it so a rapid next tap re-fires cleanly. Motion
 * itself is removed under `prefers-reduced-motion` in CSS — this only toggles the class.
 */
export function usePlacePulse(nonce: number | undefined, ms = 260): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!nonce) return;
    setOn(true);
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [nonce, ms]);
  return on;
}

/**
 * The Up & Down quick-bet — the SINGLE money-adjacent client logic, shared by the
 * board card and the round-detail bet box so the two can never drift.
 *
 * A tap places through the SAME `buyPositionAction` the conviction dial uses (no
 * parallel money path). It is OPTIMISTIC and keeps the surface in place: we bump a
 * per-side delta and let the caller's poller reconcile server truth. The delta resets
 * whenever the server value advances (the effect below), so a reconciled refresh never
 * double-counts. Each tap gets a fresh idempotency key — deliberate repeat taps are
 * deliberate repeat bets (the "bet a lot in one tap" ask). A failed tap rolls its
 * optimistic delta back and shows the server's reason.
 *
 * SUCCESS feedback is NOT a toast (it piled up on rapid taps). The hook emits a
 * `justPlaced` signal (side + a monotonic nonce) that the surface turns into a 150–250ms
 * success pulse, fires a short mobile haptic, and sets an `aria-live` message for screen
 * readers. Only FAILURES toast — the user must see those regardless.
 *
 * STAKE can be a preset chip OR a custom typed amount. `customMode` swaps the source;
 * `customValid` gates placement so a bad amount never reaches the server (which also
 * re-validates the bounds — this is UX, not the security boundary).
 */
export function useUpDownQuickBet(opts: {
  marketId?: string;
  minStake?: number;
  maxStake?: number;
  myUpStake?: number;
  myDownStake?: number;
  /** i18n copy — the hook stays language-agnostic. `placed` is the aria-live prefix. */
  copy: { placed: string; failed: string; up: string; down: string };
}) {
  const { marketId, myUpStake = 0, myDownStake = 0, copy } = opts;
  const min = opts.minStake ?? 100;
  const max = opts.maxStake ?? 100_000;
  const stakes = useMemo(() => quickStakes(min, max), [min, max]);
  const [stakeIdx, setStakeIdx] = useState(0);

  // ── Custom amount ──────────────────────────────────────────────────────────
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const customParsed = parseStake(customValue);
  const customValid = customParsed != null && customParsed >= min && customParsed <= max;

  const presetStake = stakes[Math.min(stakeIdx, stakes.length - 1)] ?? min;
  const stake = customMode ? (customValid ? customParsed! : 0) : presetStake;
  /** Placement is allowed only when the chosen amount is usable. */
  const stakeReady = customMode ? customValid : presetStake > 0;

  const [optUp, setOptUp] = useState(0);
  const [optDown, setOptDown] = useState(0);
  const [pending, startBet] = useTransition();
  const { toast } = useToast();

  // Success pulse signal + a screen-reader announcement, in place of the old toast.
  const [justPlaced, setJustPlaced] = useState<PlacedSignal | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const nonce = useRef(0);

  // Server truth advanced (the surface's poller refreshed) ⇒ drop the optimistic
  // deltas; the fresh myUp/myDownStake already contains the bets we placed, so keeping
  // them would double-count. Keyed on the raw server values so it fires only when they
  // actually change — not on every optimistic tap.
  useEffect(() => { setOptUp(0); setOptDown(0); }, [myUpStake, myDownStake]);
  const shownUp = myUpStake + optUp;
  const shownDown = myDownStake + optDown;

  const enterCustom = useCallback(() => { setCustomMode(true); }, []);
  const exitCustom = useCallback(() => { setCustomMode(false); }, []);
  const pickPreset = useCallback((i: number) => { setCustomMode(false); setStakeIdx(i); }, []);

  const place = (side: "UP" | "DOWN") => {
    if (!marketId || !stakeReady) return;
    const amount = stake;
    // Optimistic first — the tap feels instant even before the round-trip returns.
    if (side === "UP") setOptUp((v) => v + amount); else setOptDown((v) => v + amount);
    const key =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `${marketId}-${side}-${amount}-${optUp + optDown}`;
    startBet(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("side", side === "UP" ? "YES" : "NO");
      fd.set("stake", String(amount));
      fd.set("idempotencyKey", key);
      try {
        const r = await buyPositionAction(fd);
        if (r && "ok" in r && r.ok) {
          // Non-intrusive success: a pulse the surface animates, a screen-reader line,
          // and a short haptic where supported. Deliberately NOT a toast.
          nonce.current += 1;
          setJustPlaced({ side, amount, nonce: nonce.current });
          setLiveMessage(`${copy.placed} · ${side === "UP" ? copy.up : copy.down} · ${formatTzs(amount)}`);
          try { (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(12); } catch { /* unsupported */ }
        } else {
          if (side === "UP") setOptUp((v) => Math.max(0, v - amount)); else setOptDown((v) => Math.max(0, v - amount));
          const msg = r && "error" in r ? r.error : copy.failed;
          toast({ title: copy.failed, description: msg, variant: "danger" });
        }
      } catch {
        if (side === "UP") setOptUp((v) => Math.max(0, v - amount)); else setOptDown((v) => Math.max(0, v - amount));
        toast({ title: copy.failed, variant: "danger" });
      }
    });
  };

  return {
    stakes, stakeIdx, setStakeIdx: pickPreset, stake, stakeReady,
    shownUp, shownDown, pending, place,
    // custom amount
    min, max, customMode, customValue, setCustomValue, customValid, enterCustom, exitCustom,
    // feedback
    justPlaced, liveMessage,
  };
}
