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
 *   • A11: the dialog chrome (portal, scrim, Android scroll/zoom lock, focus
 *     trap, focus-return, Esc, kit rise/fade) is the shared <Modal> primitive;
 *     the panel is `overflow-hidden !p-0` so the gilt quote-hold strip still
 *     clips flush to the rounded corners. Enter-to-confirm stays bespoke here.
 *     The 10 s quote-hold RAF loop and all bet logic are UNCHANGED.
 */

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";
import { HouseLeanWarning } from "./house-lean-warning";
import { useT } from "@/lib/i18n";
import { sideWord } from "@/lib/side-label";
import { DEFAULT_CASHOUT_FEE_RATE, DEFAULT_FREE_EXIT_GRACE_MINUTES, DEFAULT_PAID_EXIT_WINDOW_MINUTES, type LeanLevel, type PollRates } from "@/lib/payout";
import { formatTzs, formatNumber } from "@/lib/utils";

const QUOTE_HOLD_MS = 10_000;
/** How long a bet may wait before we explain the wait. Short enough that the
 *  pause never feels like a hang, long enough that an ordinary fast bet never
 *  flashes a "busy" message at the player. */
const BUSY_HINT_MS = 1_500;

type Props = {
  open: boolean;
  side: "YES" | "NO";
  stake: number;
  multiplier: number;
  lean: LeanLevel;
  /** When true, suppress the thin-upside notice — settlement will refund at 0% fee. */
  isOneSided?: boolean;
  /** True when this bet will actually get a free-exit window — i.e. the poll closes
   *  at least one full grace period from now, which is the SERVER rule
   *  (market-service.ts hadRunway). False means no Sell control will ever appear. */
  hasExitRunway?: boolean;
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
  open, side, stake, multiplier, lean, isOneSided, rates, pending, marketTitle, hasExitRunway = true, onConfirm, onCancel,
}: Props) {
  const { t } = useT();

  // The exit terms, stated at THIS POLL'S rates: free window, fee, and the total
  // window after which selling LOCKS and the bet rides to settlement. The copy
  // used to hardcode "within 5 minutes … a 9% fee applies" in all three locales
  // (and the Swahili silently dropped the "full refund" half of the promise).
  const graceMins = rates?.freeExitGraceMinutes ?? DEFAULT_FREE_EXIT_GRACE_MINUTES;
  const paidMins = rates?.paidExitWindowMinutes ?? DEFAULT_PAID_EXIT_WINDOW_MINUTES;
  const lockMins = graceMins + paidMins;
  const exitPct = +((rates?.cashOutFeeRate ?? DEFAULT_CASHOUT_FEE_RATE) * 100).toFixed(1);
  // Default policy has NO paid tail (paidExitWindowMinutes = 0): the exit locks at
  // the free window. Only a poll that froze a paid window shows the fee terms.
  const freeExitBody = (paidMins > 0 ? t.dialog.freeExitBody : t.dialog.freeExitBodyLocked)
    .replace(/\{mins\}/g, String(graceMins))
    .replace(/\{lock\}/g, String(lockMins))
    .replace(/\{pct\}/g, String(exitPct));
  // The LABEL takes the same figure as the body. It used to read "5-min free exit"
  // while the sentence under it interpolated the poll's own frozen window — so any
  // poll with a different grace contradicted itself inside a single disclosure.
  const exitLabel = t.dialog.freeExitLabel.replace(/\{mins\}/g, String(graceMins));
  const [remainingMs, setRemainingMs] = useState(QUOTE_HOLD_MS);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Direct-DOM target for the gilt countdown strip. Driving its
  // transform through React state caused stair-stepping: every RAF
  // triggered a full modal re-render AND a CSS transition that
  // interpolated between values, so overlapping 80ms transitions
  // fought the next frame's render. Now we mutate the ref in the
  // RAF loop and let React state only update the seconds label
  // (~1Hz) — animation is smooth, label is correct.
  const stripRef = useRef<HTMLDivElement>(null);
  const lastSecLabelRef = useRef<number>(Math.ceil(QUOTE_HOLD_MS / 1000));

  // Quote-clock freeze + the "we're holding your place" hint. The dialog STAYS
  // OPEN while a bet waits for admission, so the player must be told why — an
  // unexplained multi-second pause on a money action reads as a hang, and a
  // player who force-refreshes there is the one most likely to double-submit.
  const frozenElapsedRef = useRef<number | null>(null);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBusy, setShowBusy] = useState(false);

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
        // Freeze by banking the REAL elapsed time once, on the pending edge, and
        // holding it. The old version re-derived it every frame from the
        // Math.ceil'd seconds LABEL, so the clock quantised to whole seconds and
        // rounded backwards — handing the player up to ~1s of extra quote on each
        // submit. It also spun a RAF for the whole network call to re-assign the
        // same value.
        if (frozenElapsedRef.current === null) {
          frozenElapsedRef.current = performance.now() - startedAtRef.current;
          // Surface the wait only once it is long enough to be worth explaining.
          busyTimerRef.current = setTimeout(() => setShowBusy(true), BUSY_HINT_MS);
        }
        startedAtRef.current = performance.now() - frozenElapsedRef.current;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      // Resumed (or never paused) — drop the freeze and any busy hint.
      if (frozenElapsedRef.current !== null) {
        frozenElapsedRef.current = null;
        if (busyTimerRef.current) { clearTimeout(busyTimerRef.current); busyTimerRef.current = null; }
        setShowBusy(false);
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
      if (busyTimerRef.current) { clearTimeout(busyTimerRef.current); busyTimerRef.current = null; }
      frozenElapsedRef.current = null;
      setShowBusy(false);
    };
  }, [open]);

  // Enter-to-confirm is bespoke to this flow; Esc / focus / scroll-lock all live
  // in <Modal>. Enter cannot fire while a submit is in flight.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !pendingRef.current) { e.preventDefault(); onConfirmRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // DS-5 — composed from the YES/NO semantic families (the same lit-glass
  // recipe as the ORM crest), not hand-typed oklch triples that drift the
  // moment the palette moves.
  const sideTone = side === "YES"
    ? { fg: "var(--yes-300)", bg: "color-mix(in oklab, var(--yes-500) 18%, transparent)", brd: "color-mix(in oklab, var(--yes-500) 62%, transparent)" }
    : { fg: "var(--no-300)",  bg: "color-mix(in oklab, var(--no-500) 18%, transparent)",  brd: "color-mix(in oklab, var(--no-500) 62%, transparent)" };
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <Modal
      open={open}
      onClose={() => { if (!pending) onCancel(); }}
      ariaLabel={t.dialog.confirmPrediction}
      ariaBusy={pending}
      maxWidth={440}
      closeOnScrim={!pending}
      showClose={false}
      initialFocus={confirmRef}
      panelClassName="overflow-hidden !p-0"
    >
      {/* Quote-hold progress strip — driven directly via stripRef from the RAF
          loop (no CSS transition, no stair-step). The panel's `overflow-hidden`
          clips it flush to the rounded corners. */}
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
            <p className="font-mono text-micro uppercase tracking-[0.16em] font-bold text-text-subtle">
              {t.common.confirmPrediction}
            </p>
            {marketTitle && (
              /* 🔴 `line-clamp-2` REMOVED (E-236). This is the MARKET TITLE — the sentence the
                 payout turns on — inside the dialog where the player commits money, and it was
                 clamped to two lines. Measured live in this very dialog: *"Will the USD/TZS
                 exchange rate close above 2,650 on any day before 30 September 2026, per Bank of
                 Tanzania official rates?"* — and Swahili and Chinese are longer than English.
                 ⛔ Ali's rule is that no text leaves its allocated location "no matter the amount
                 of lines needed", and the highest-stakes popup in the product was the one
                 breaching it. ⚠️ SAFE BECAUSE THE MODAL SCROLLS: `modal.tsx:264` gives the
                 container `overflow-y-auto overscroll-contain`, and the panel's own
                 `overflow-hidden` exists for the gilt strip's rounded corners on a panel with no
                 fixed height. A taller title grows the panel and the container scrolls; it does
                 not push the confirm button out of reach. */
              <p className="mt-1 font-display text-[15px] font-semibold text-text leading-snug">
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
              {/* ⛔ THIS USED TO PRINT THE STORED ENUM. On the Chinese money-commit dialog the
                  26px headline read "YES" while the pool-share sentence three rows below read
                  "是" — one fact, two answers, one screen. Both now come out of §L's one map,
                  so they cannot disagree again. This modal is poll-only (its sole caller is
                  `conviction-dial.tsx`; Up & Down confirms through `UpDownBetReceiptModal`). */}
              <p className="font-display font-bold text-[26px] leading-none" style={{ color: sideTone.fg, letterSpacing: "-0.025em" }}>
                {sideWord(t, side, "MARKET")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">{t.dialog.stakeLabel}</p>
              <p className="font-mono font-bold text-[22px] tabular-nums leading-none text-text">TZS {formatNumber(stake)}</p>
              <p className="mt-1 font-mono text-[10px] text-text-subtle">{multiplier.toFixed(2)}× {t.dialog.conviction}</p>
            </div>
          </div>
        </div>

        {/* Payout disclosure.
            - capped-commission (D3, license review · 2026-05): NO figure pre-bet —
              only the qualitative pool-share copy.
            - loser-share (owner decision 2026-07-23): show the fixed estimate
              = stake × (1 + estimatedWinningsRate) with a mandatory disclaimer that
              it is an estimate. See docs/COMPLIANCE-DECISIONS.md. */}
        {rates?.feeModel === "loser-share" && rates?.showEstimatedWinnings !== false ? (
          <div className="mt-3 rounded-lg border border-border bg-bg-overlay p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">
              {t.dialog.estimatedWinningsLabel}
            </p>
            <p className="text-[18px] font-bold tabular-nums text-text leading-none">
              TZS {formatNumber(Math.round(stake * (1 + (rates?.estimatedWinningsRate ?? 0))))}
            </p>
            <p className="mt-1.5 text-body-sm leading-relaxed text-text-muted">
              {t.dialog.estimateDisclaimer}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-border bg-bg-overlay p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">
              {t.common.payout2}
            </p>
            {/* Pool-share invariant (micro-spec §10.2) — side-aware, mandatory
                on the medium confirm: the player must see that a win means
                sharing the pool, not a fixed odds payout. */}
            <p className="text-body-sm font-semibold leading-relaxed text-text">
              {t.dialog.poolShareIfWins.replace("{side}", sideWord(t, side, "MARKET"))}
            </p>
            <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
              {t.dialog.payoutCalcBody}
            </p>
          </div>
        )}

        {/* Exit terms — a PROMISE or its absence, never a promise that will not hold.
            ⛔ This block used to render the free-exit offer unconditionally. The server
            grants an exit only when the poll had a full grace window left at the moment
            of the bet, so on a poll closing sooner than that the player was promised a
            sale on the commit screen and then found no Sell control at all. */}
        <div className={`mt-2 rounded-lg border px-3 py-2.5 flex items-start gap-2 ${
          hasExitRunway ? "border-brand-500/30 bg-brand-500/[0.07]" : "border-border bg-bg-overlay/40"
        }`}>
          <I.shieldcheck s={13} className={`shrink-0 mt-0.5 ${hasExitRunway ? "text-brand-300" : "text-text-subtle"}`} />
          <p className="text-body-sm leading-relaxed text-text-muted">
            <span className={`font-semibold ${hasExitRunway ? "text-brand-300" : "text-text-subtle"}`}>
              {hasExitRunway ? exitLabel : t.dialog.noExitWindowLabel} ·{" "}
            </span>
            {hasExitRunway ? freeExitBody : t.dialog.noExitWindowBody}
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

        {/* Saturation hint. The dialog deliberately STAYS OPEN while a bet waits
            for a slot, so after ~1.5s of waiting we explain the pause rather than
            leave the player staring at a frozen money dialog. The reassurance
            ("your stake hasn't moved") is literally true: admission takes its slot
            BEFORE any transaction opens, so a queued bet has touched nothing. */}
        {showBusy && (
          <div className="mt-4">
            <Callout tone="info" glyph="clock" live>
              {t.dialog.busyHolding}
            </Callout>
          </div>
        )}

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
            /* `btn-lg` matches the gold confirm above, so the escape hatch and the
               money commit are the same height. This was `btn-md min-h-11`, and
               because the spacing scale is OVERRIDDEN (tailwind.config.ts:200-215)
               `min-h-11` is a 96px floor — cancel shipped at more than twice the
               height of the confirm it sits under. ⛔ No per-call height here: the
               --h-control-* token owns it. Twin: sell-confirm-modal.tsx. */
            className="btn btn-ghost btn-lg w-full"
          >
            {t.common.cancel}
          </button>
        </div>
        <p className="mt-2.5 text-center text-body-sm text-text-subtle">
          {t.dialog.poolSharePayout}
        </p>
      </div>
    </Modal>
  );
}
