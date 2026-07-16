"use client";

/**
 * BetConfirmModal — last-mile confirmation popup for placing a bet.
 *
 *   • Locked-quote countdown — the user has 10 seconds to confirm at the
 *     price they saw on the dial. After that, the modal closes and the
 *     dial timer restarts so they can re-aim. Mirrors how serious
 *     markets handle quote freshness without faking certainty. 10 s
 *     gives a player time to read the side + stake + payout block
 *     without rushing; 5 s was too tight (Ali's report).
 *   • Kit-faithful (border-border, bg-bg-elevated, gold confirm gradient,
 *     OKLCH hues, mono numerals).
 *   • Portal-rendered to escape any backdrop-filter containing-block trap.
 *   • Esc closes; Confirm + Enter submit; tab is trapped to within the modal.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";
import { useModalLock } from "@/lib/use-modal-lock";
import { HouseLeanWarning } from "./house-lean-warning";
import { useT } from "@/lib/i18n";
import { DEFAULT_CASHOUT_FEE_RATE, DEFAULT_FREE_EXIT_GRACE_MINUTES, DEFAULT_PAID_EXIT_WINDOW_MINUTES, type LeanLevel, type PollRates } from "@/lib/payout";
import { formatTzs, formatNumber } from "@/lib/utils";

const QUOTE_HOLD_MS = 10_000;

type Props = {
  open: boolean;
  side: "YES" | "NO";
  stake: number;
  multiplier: number;
  lean: LeanLevel;
  /** When true, suppress the thin-upside notice — settlement will refund at 0% fee. */
  isOneSided?: boolean;
  /** THIS POLL'S frozen rates — the free-exit terms quoted here must be the ones
   *  we will actually honour, not a hardcoded "5 minutes / 9%". */
  rates?: PollRates;
  pending: boolean;
  marketTitle?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// `payout` and `ratio` are gone from Props. They were passed in from the dial and
// used ONLY to compute a `net` and a `netColor` that were never rendered — D3
// (license review 2026-05) hides the payout figure until betting closes, so the
// modal shows copy, not numbers. Threading a payout in here just to throw it away
// invited someone to "helpfully" render it one day and break the policy.
export function BetConfirmModal({
  open, side, stake, multiplier, lean, isOneSided, rates, pending, marketTitle, onConfirm, onCancel,
}: Props) {
  useModalLock(open);
  const { t } = useT();

  // The exit terms, stated at THIS POLL'S rates: free window, fee, and the total
  // window after which selling LOCKS and the bet rides to settlement. The copy
  // used to hardcode "within 5 minutes … a 9% fee applies" in all three locales
  // (and the Swahili silently dropped the "full refund" half of the promise).
  const graceMins = rates?.freeExitGraceMinutes ?? DEFAULT_FREE_EXIT_GRACE_MINUTES;
  const lockMins = graceMins + (rates?.paidExitWindowMinutes ?? DEFAULT_PAID_EXIT_WINDOW_MINUTES);
  const exitPct = +((rates?.cashOutFeeRate ?? DEFAULT_CASHOUT_FEE_RATE) * 100).toFixed(1);
  const freeExitBody = t.dialog.freeExitBody
    .replace(/\{mins\}/g, String(graceMins))
    .replace(/\{lock\}/g, String(lockMins))
    .replace(/\{pct\}/g, String(exitPct));
  const [mounted, setMounted] = useState(false);
  const [remainingMs, setRemainingMs] = useState(QUOTE_HOLD_MS);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Direct-DOM target for the gilt countdown strip. Driving its
  // transform through React state caused stair-stepping: every RAF
  // triggered a full modal re-render AND a CSS transition that
  // interpolated between values, so overlapping 80ms transitions
  // fought the next frame's setState. Now we mutate the ref in the
  // RAF loop and let React state only update the seconds label
  // (~1Hz) — animation is smooth, label is correct.
  const stripRef = useRef<HTMLDivElement>(null);
  const lastSecLabelRef = useRef<number>(Math.ceil(QUOTE_HOLD_MS / 1000));

  // Pin the latest callbacks + pending flag so the timer effect only
  // restarts when `open` actually flips. Otherwise the parent re-creating
  // its onCancel arrow each render would restart the countdown forever
  // and the quote would never auto-expire.
  const onCancelRef = useRef(onCancel);
  const onConfirmRef = useRef(onConfirm);
  const pendingRef = useRef(pending);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  useEffect(() => { setMounted(true); }, []);

  // Quote-hold timer — runs while the modal is open.
  useEffect(() => {
    if (!open) return;
    startedAtRef.current = performance.now();
    setRemainingMs(QUOTE_HOLD_MS);
    lastSecLabelRef.current = Math.ceil(QUOTE_HOLD_MS / 1000);
    if (stripRef.current) stripRef.current.style.transform = "scaleX(1)";
    const tick = () => {
      // Pause the countdown while the bet submission is in flight —
      // keeps the timer frozen so the player doesn't see "0 s" while
      // their bet is still being placed. We bank the elapsed time and
      // resume from there once the server responds.
      if (pendingRef.current) {
        // Shift the start time forward so elapsed stays frozen
        startedAtRef.current = performance.now() - (QUOTE_HOLD_MS - (lastSecLabelRef.current * 1000));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = performance.now() - startedAtRef.current;
      const left = Math.max(0, QUOTE_HOLD_MS - elapsed);
      // Direct DOM transform — no React render, no CSS transition.
      // Each frame paints the exact instantaneous scale, no overlap.
      if (stripRef.current) {
        const pct = Math.max(0, Math.min(1, left / QUOTE_HOLD_MS));
        stripRef.current.style.transform = `scaleX(${pct})`;
      }
      // React state only when the seconds label would change — once
      // per second instead of once per frame. Keeps the modal stable.
      const nextSec = Math.ceil(left / 1000);
      if (nextSec !== lastSecLabelRef.current) {
        lastSecLabelRef.current = nextSec;
        setRemainingMs(left);
      }
      if (left <= 0) {
        rafRef.current = null;
        if (!pendingRef.current) onCancelRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // Belt-and-braces: a setTimeout backstop in case RAF is throttled
    // (e.g. backgrounded tab, headless test runners). Fires at the same
    // 10 s mark and dismisses if the RAF loop somehow missed it.
    const backstop = setTimeout(() => {
      if (!pendingRef.current) onCancelRef.current();
    }, QUOTE_HOLD_MS + 50);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      clearTimeout(backstop);
    };
  }, [open]);

  // Focus + keybinds. Esc cannot fire while a submit is in flight.
  useEffect(() => {
    if (!open) return;
    const f = setTimeout(() => confirmRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingRef.current) { e.preventDefault(); onCancelRef.current(); }
      if (e.key === "Enter" && !pendingRef.current) { e.preventDefault(); onConfirmRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(f); window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!mounted || !open) return null;

  const sideTone = side === "YES"
    ? { fg: "oklch(78% 0.13 152)", bg: "oklch(40% 0.10 152 / 0.18)", brd: "oklch(45% 0.13 152)" }
    : { fg: "oklch(78% 0.16 22)",  bg: "oklch(40% 0.13 22 / 0.18)",  brd: "oklch(48% 0.15 22)" };
  const seconds = Math.ceil(remainingMs / 1000);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-busy={pending}
      aria-label={t.dialog.confirmPrediction}
      className="fixed inset-0 z-[100] flex justify-center px-3 py-4 overflow-y-auto overscroll-contain"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label={t.common.cancel}
        onClick={() => { if (!pending) onCancel(); }}
        disabled={pending}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity disabled:cursor-wait"
        style={{ animation: "bcm-fade 160ms ease-out" }}
      />

      {/* Card — `overflow-hidden` clips the gold countdown strip to
          the popup's rounded corners. Without it, subpixel mismatch
          between the strip's `rounded-t-2xl` and the popup's
          `rounded-xl` + 1px border lets the strip's ends protrude
          past the popup's curved corners (Ali's report). */}
      <div
        className="relative my-auto w-full max-w-[440px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
        // Kit `--ease-arrive` — same entry curve as the result modal,
        // so the pre-confirm and post-place beats feel like one
        // continuous motion language.
        style={{ animation: "bcm-rise 240ms var(--ease-arrive)" }}
      >
        {/* Quote-hold progress strip — driven directly via stripRef
            from the RAF loop. No CSS transition (would overlap with
            the next frame's render and stair-step). */}
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl">
          <div
            ref={stripRef}
            className="h-full origin-left"
            style={{
              width: "100%",
              transform: "scaleX(1)",
              background: "linear-gradient(90deg, var(--brand-600), var(--brand-400))",
              willChange: "transform",
            }}
          />
        </div>

        <div className="p-5 lg:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
                {t.common.confirmPrediction}
              </p>
              {marketTitle && (
                <p className="mt-1 font-display text-[15px] font-semibold text-text leading-snug line-clamp-2">
                  {marketTitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label={t.common.cancel}
              className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
            >
              <I.x s={16} />
            </button>
          </div>

          {/* Side + stake summary */}
          <div className="rounded-lg border p-4" style={{ borderColor: sideTone.brd, background: sideTone.bg }}>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">{t.common.youArePicking}</p>
                <p className="font-display font-bold text-[26px] leading-none" style={{ color: sideTone.fg, letterSpacing: "-0.025em" }}>
                  {side}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">{t.dialog.stakeLabel}</p>
                <p className="font-mono font-bold text-[22px] tabular-nums leading-none text-text">TZS {formatNumber(stake)}</p>
                <p className="mt-1 font-mono text-[10px] text-text-subtle">{multiplier.toFixed(2)}× {t.dialog.conviction}</p>
              </div>
            </div>
          </div>

          {/* Payout disclosure — per management spec (license review · 2026-05)
              the potential winning is NOT shown until the event has resolved.
              Player commits on stake + multiplier + side; final payout
              communicated post-resolution. */}
          <div className="mt-3 rounded-lg border border-border bg-bg-overlay p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">
              {t.common.payout2}
            </p>
            {/* Pool-share invariant (micro-spec §10.2) — side-aware, mandatory
                on the medium confirm: the player must see that a win means
                sharing the pool, not a fixed odds payout. */}
            <p className="text-[12.5px] font-semibold leading-relaxed text-text">
              {t.dialog.poolShareIfWins.replace(
                "{side}",
                side === "YES" ? t.market.sideYesWord.toUpperCase() : t.market.sideNoWord.toUpperCase(),
              )}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
              {t.dialog.payoutCalcBody}
            </p>
          </div>

          {/* Grace period disclosure */}
          <div className="mt-2 rounded-lg border border-brand-500/30 bg-brand-500/[0.07] px-3 py-2.5 flex items-start gap-2">
            <I.shieldcheck s={13} className="shrink-0 mt-0.5 text-brand-300" />
            <p className="text-[11px] leading-relaxed text-text-muted">
              <span className="font-semibold text-brand-300">{t.dialog.freeExitLabel} · </span>
              {freeExitBody}
            </p>
          </div>

          {/* D3: Lean warning (qualitative, no payout figure).
              Suppressed when one-sided — settlement issues a full refund. */}
          {lean !== "fair" && !isOneSided && <HouseLeanWarning level={lean} />}

          {/* Quote-hold caption */}
          <div className="mt-4 flex items-center gap-2 text-[12px] text-text-subtle">
            <I.shieldcheck s={14} />
            <span>
              {t.dialog.quoteHeldFor} <strong className="font-mono text-brand-300">{seconds}s</strong> · {t.dialog.thenReaim}
            </span>
          </div>

          {/* CTAs — confirm is full-width (primary action, easy tap target),
              cancel is secondary below. Side (YES/NO) omitted from button
              text — it's shown in the summary card above. */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              ref={confirmRef}
              type="button"
              onClick={() => { haptics.confirm(); onConfirm(); }}
              disabled={pending || remainingMs <= 0}
              className="btn btn-gold btn-lg w-full"
            >
              {pending ? t.dialog.placing : `${t.common.confirm} · ${formatTzs(stake)}`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="btn btn-ghost btn-md w-full min-h-11"
            >
              {t.common.cancel}
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-text-subtle">
            {t.dialog.poolSharePayout}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bcm-rise { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes bcm-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body,
  );
}
