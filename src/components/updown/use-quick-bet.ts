"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useDeferredToast } from "@/components/ui/toast";
import { buyPositionAction } from "@/app/markets/actions";
import { formatTzs } from "@/lib/utils";

/**
 * Preset quick-stake steps, clamped to the chain's [min, max]. A fast game wants a
 * one-tap amount, not a keyboard — these cover the common stakes and dedupe.
 */
export function quickStakes(min: number, max: number): number[] {
  const base = [min, min * 2, min * 5, min * 10].filter((v) => v <= max);
  const set = Array.from(new Set([...base, max])).filter((v) => v >= min && v <= max).sort((a, b) => a - b);
  return set.slice(0, 4);
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
 */
export function useUpDownQuickBet(opts: {
  marketId?: string;
  minStake?: number;
  maxStake?: number;
  myUpStake?: number;
  myDownStake?: number;
  /** Toast copy — passed in so the hook stays i18n-agnostic. */
  copy: { placed: string; failed: string; up: string; down: string };
}) {
  const { marketId, minStake, maxStake, myUpStake = 0, myDownStake = 0, copy } = opts;
  const stakes = useMemo(() => quickStakes(minStake ?? 100, maxStake ?? 100_000), [minStake, maxStake]);
  const [stakeIdx, setStakeIdx] = useState(0);
  const stake = stakes[Math.min(stakeIdx, stakes.length - 1)] ?? (minStake ?? 100);
  const [optUp, setOptUp] = useState(0);
  const [optDown, setOptDown] = useState(0);
  const [pending, startBet] = useTransition();
  const { toast } = useDeferredToast(pending);
  // Server truth advanced (the surface's poller refreshed) ⇒ drop the optimistic
  // deltas; the fresh myUp/myDownStake already contains the bets we placed, so keeping
  // them would double-count. Keyed on the raw server values so it fires only when they
  // actually change — not on every optimistic tap.
  useEffect(() => { setOptUp(0); setOptDown(0); }, [myUpStake, myDownStake]);
  const shownUp = myUpStake + optUp;
  const shownDown = myDownStake + optDown;

  const place = (side: "UP" | "DOWN") => {
    if (!marketId) return;
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
          toast({ title: copy.placed, description: `${side === "UP" ? copy.up : copy.down} · ${formatTzs(amount)}`, variant: "success" });
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

  return { stakes, stakeIdx, setStakeIdx, stake, shownUp, shownDown, pending, place };
}
