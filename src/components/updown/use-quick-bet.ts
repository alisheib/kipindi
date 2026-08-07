"use client";

import { useState, useTransition, useMemo, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { buyPositionAction } from "@/app/markets/actions";
import { formatTzs } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { quickStakes, parseStake } from "./stake-math";
// UD-4 · the ONE code→copy map, shared by every bet surface. The server string is
// audit truth; the player reads the dictionary.
import { udBetErrorCopy, type UdBetFailure } from "./updown-bet-errors";
// UD-2 · the server-anchored clock, the same one the card's phase runs on.
import { useServerNow } from "./round-countdown";

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
 * SUCCESS feedback is FOUR channels (E-64, 2026-08-05): a `justPlaced` signal the surface
 * turns into a 150–250ms pulse, a short mobile haptic, an `aria-live` message for screen
 * readers, and a 3-second `variant: "success"` toast naming the side and the amount.
 *
 * ⛔ THE TOAST WAS ABSENT FOR A REASON THAT DID NOT SURVIVE CONTACT WITH PLAYERS. It was
 * removed because it piled up on rapid taps, leaving only the three quiet channels — none
 * of which a sighted player reliably notices. Ali, relaying real users: *"there is not
 * popup nothing on placing bet on up and down."* Measured by staking a real TZS 500: zero
 * toasts, zero dialogs, while a FAILED bet toasted `danger` loudly. Loud when nothing
 * happened, silent when money left the wallet. The pile-up is a DURATION problem and is
 * fixed with `durationMs: 3000`; it was never a reason to say nothing.
 * 🔒 `npm run test:updown-bet-feedback` asserts this inside the success branch specifically —
 * the file has always contained `toast(` on its failure paths, so a file-level check for the
 * symbol would be green over the exact defect.
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
  /**
   * UD-1 · the viewer's wallet balance, threaded from the server payload. `null` /
   * `undefined` = unknown (a failed read must never render as zero — B-1), and the
   * gate simply does not arm; the server stays the security boundary either way.
   */
  walletBalance?: number | null;
  /**
   * UD-2 · the round's lock instant + the server clock, so a tap after the lock is
   * refused HERE — no optimistic flash, no network round-trip — on every surface,
   * covering the final-second race the phase-aware panels cannot (they flip the
   * presentation; this refuses the money call itself).
   */
  selectionClosesAtMs?: number | null;
  serverNowMs?: number;
  /** i18n copy — the hook stays language-agnostic. `placed` is the aria-live prefix. */
  copy: { placed: string; failed: string; up: string; down: string; insufficient?: string };
  /** UD-4 · the udErr* dictionary slice for `udBetErrorCopy`. */
  errCopy: Parameters<typeof udBetErrorCopy>[2];
}) {
  const { marketId, myUpStake = 0, myDownStake = 0, copy, errCopy } = opts;
  const min = opts.minStake ?? 1_000;
  const max = opts.maxStake ?? 1_000_000;
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

  // ── UD-1/UD-2/UD-3 · pre-flight + refusal state ────────────────────────────
  //
  // A tap that cannot succeed must never look like a placed bet: these gates refuse
  // BEFORE the optimistic apply and before any network call. They are UX only —
  // `buyPosition` re-validates every one of them — exactly like `stake-math`'s bounds.
  const serverNow = useServerNow(opts.serverNowMs);
  /** The lock has passed on the server-anchored clock — betting is over on this round. */
  const lockPassed =
    opts.selectionClosesAtMs != null && serverNow != null && serverNow >= opts.selectionClosesAtMs;
  /** The server refused with SELECTION_CLOSED — it has spoken; don't wait for the poll. */
  const [lockedByServer, setLockedByServer] = useState(false);
  /** The chosen stake exceeds the known balance. Unknown balance (null) never gates. */
  const insufficient =
    opts.walletBalance != null && stakeReady && stake > opts.walletBalance;
  /** UD-3 · a compliance/account block the surface must present as an acknowledge-modal. */
  const [blocked, setBlocked] = useState<Extract<UdBetFailure, { kind: "blocked" }> | null>(null);
  const clearBlocked = useCallback(() => setBlocked(null), []);

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
    // ── UD-2 · the lock, refused at the tap ──────────────────────────────────
    // The surfaces flip their presentation at the lock instant; this is the belt under
    // that braces — the final-second race where a tap lands as the clock crosses zero.
    // No optimistic flash, no request: announce for SRs and stop. (The buttons are
    // normally already disabled/replaced by the time this can fire.)
    if (lockPassed || lockedByServer) {
      setLiveMessage(errCopy.udErrSelectionClosed);
      return;
    }
    // ── UD-1 · the balance, consulted before the wallet is asked ─────────────
    // Insufficient balance is the most common real-money refusal, and it is
    // PREDICTABLE — round-tripping it made a doomed tap look placed for a beat.
    // Factual register (a fact about the wallet, not an alarm), aria-live for SRs,
    // and the surface shows the inline reason + deposit route via `insufficient`.
    if (insufficient) {
      const msg = copy.insufficient ?? errCopy.udErrInvalid;
      setLiveMessage(msg);
      toast({ title: msg, variant: "factual" });
      return;
    }
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
          // E-64 · FOUR channels, because money left the wallet: a pulse the surface
          // animates, a screen-reader line, a short haptic, and — since 2026-08-05 — a
          // visible toast. It used to be the first three only, on the reasoning that a
          // toast piled up on rapid taps. That reasoning was half right and the omission
          // was wrong: a FAILED bet toasted loudly two lines below while a SUCCESSFUL one
          // said nothing a sighted player could see, so the screen read "nothing happened"
          // at the exact moment TZS left the wallet — and the natural response is to tap
          // again. The pile-up is solved by the 3s `durationMs`, not by silence.
          nonce.current += 1;
          setJustPlaced({ side, amount, nonce: nonce.current });
          setLiveMessage(`${copy.placed} · ${side === "UP" ? copy.up : copy.down} · ${formatTzs(amount)}`);
          // ⛔ The toast does NOT replace the line above. A toast is a transient region a
          // screen reader may never voice; `aria-live` is the announcement, this is the
          // sighted equivalent. Both, always.
          toast({
            title: copy.placed,
            description: `${side === "UP" ? copy.up : copy.down} · ${formatTzs(amount)}`,
            variant: "success",
            durationMs: 3000,
          });
          // Named token from the central vocabulary (respects the master switch,
          // per-token prefs and reduced-motion) — not a raw navigator.vibrate.
          haptics.confirm();
        } else {
          if (side === "UP") setOptUp((v) => Math.max(0, v - amount)); else setOptDown((v) => Math.max(0, v - amount));
          // UD-3/UD-4 · the refusal, in the player's own language, presented per the §5
          // matrix: race/transient → STICKY danger toast (a money refusal stays until
          // read); compliance/account block → the acknowledge-modal the surface hosts.
          const code = r && "code" in r ? (r as { code?: string }).code : undefined;
          const serverError = r && "error" in r ? (r as { error?: string }).error : undefined;
          const fail = udBetErrorCopy(code, serverError, errCopy);
          if (fail.kind === "blocked") {
            setBlocked(fail);
          } else {
            if (fail.lockNow) setLockedByServer(true);
            setLiveMessage(fail.description);
            toast({ title: copy.failed, description: fail.description, variant: "danger", durationMs: 0 });
          }
        }
      } catch {
        if (side === "UP") setOptUp((v) => Math.max(0, v - amount)); else setOptDown((v) => Math.max(0, v - amount));
        // Transport-level failure — no server verdict at all. Sticky, like every
        // money-path failure: the player must be able to read why nothing happened.
        toast({ title: copy.failed, description: errCopy.udErrBusy, variant: "danger", durationMs: 0 });
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
    // pre-flight + refusal state (UD-1/UD-2/UD-3)
    /** True when the chosen stake exceeds the KNOWN balance — surfaces disable + explain. */
    insufficient,
    /** The lock has passed (server-anchored clock) or the server said SELECTION_CLOSED. */
    locallyLocked: lockPassed || lockedByServer,
    /** A compliance/account block to present as the acknowledge-modal. */
    blocked, clearBlocked,
  };
}
