"use client";

/**
 * UpDownStakeControls — the shared quick-bet control used by BOTH the board card and
 * the round-detail bet box, so the two never drift. Renders, top to bottom:
 *   · "you're in" (the viewer's own live stake per side)
 *   · the stake selector: preset chips + a "＋ Custom" chip that expands an inline,
 *     validated numeric field (bounded to the chain's min/max)
 *   · the Up / Down place buttons (disabled until the chosen amount is usable)
 *   · a helper line, a success pulse on the tapped side, and a visually-hidden
 *     aria-live announcement (the confirmation for screen readers)
 *
 * ⚠️ THIS HEADER USED TO SAY THE aria-live LINE WAS THERE "in place of a toast". It has not
 * been true since 2026-08-05 (E-64), when the success toast was restored — and a stale
 * comment naming an absent channel is how the next reader concludes the gap is deliberate.
 * A placed bet now answers on FIVE channels: the pulse, the aria-live line, the haptic, the
 * 3-second toast, and — since UD-22 — the centred `OperationResultModal` receipt hosted at
 * the bottom of this component, which is the house rule every other consequential mutation
 * has always followed.
 *
 * Presentational only — all money logic + the placement/validation state come from
 * `useUpDownQuickBet`, passed in as `bet`. Two sizes: "card" (compact, on the board)
 * and "detail" (roomier, on /updown/[roundId]).
 */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { usePlacePulse, type useUpDownQuickBet } from "./use-quick-bet";
import { UpDownBetBlockedModal } from "./updown-bet-blocked-modal";
import { UpDownBetReceiptModal } from "./updown-bet-receipt-modal";
import type { UpDownReceiptInfo } from "@/lib/updown-receipt";
import { stakeChipLabel } from "./stake-math";
import { noticeBody } from "@/components/ui/empty-state-text";
// ⭐ D2 · ONE RULE for "which side is empty", read from the round's RAW pools and shared with the card and the round
// page — see `@/lib/updown-pricing`. The buttons quote no multiplier (the owner's ruling of 2026-10-14).
import { emptySideOf, type UpDownPricing } from "@/lib/updown-pricing";

type Bet = ReturnType<typeof useUpDownQuickBet>;

/**
 * ⭐ E-196 · THE ARROW NEVER SHRINKS. A flex row crushes an unprotected `<svg>` before anything else gives: driven on
 * production as a signed-out visitor, the side button's arrow was **0px wide at every width, 1920 included**, because
 * the button's content (then "Down × 1.00 est.") overflowed and the icon was the shock absorber. `shrink-0` restored it.
 * ⛔ Two wrong answers came first and are worth keeping: shrinking `.btn-lg`'s padding bought zero pixels (`.btn` centres
 * its content, so an overflowing row spills both edges whatever the padding), and the first repair went into THIS
 * component while the broken pair was the signed-out card's own copy (`updown-card.tsx`).
 * ⚠️ The payout chip that made that content too wide is gone — since the owner's ruling of 2026-10-14 both pairs say the
 * side's word and nothing else — but the rule stays: Swahili at 320 is still a flex row with an icon in it.
 *
 * ⚠️ Applied to the settled-outcome arrow on the card too (`updown-card.tsx`), not only to the
 * two side buttons — it is an icon in a flex row, which is the same crush, and naming the
 * constant for what it DOES rather than where it started keeps that honest.
 */
export const GLYPH_NO_SHRINK = "shrink-0";

export function UpDownStakeControls({
  bet,
  pricing,
  assetName,
  receipt,
  onWatchRound,
  size = "card",
  stopPropagation = false,
}: {
  bet: Bet;
  /**
   * UD-22 · the round's frozen receipt facts (`BoardRound.receipt`), for the confirmation
   * modal. Optional ONLY so a surface that genuinely has no round context can still render
   * the controls; when it is absent the receipt is skipped and the other four channels
   * still fire. Every real bet surface passes it.
   */
  receipt?: UpDownReceiptInfo;
  /** Ghost CTA on the receipt. Omitted on `/updown/[roundId]` — already there. */
  onWatchRound?: () => void;
  /**
   * The round's raw pools and frozen rates: they name the empty side under the buttons and price the receipt's
   * projected return. ⛔ The buttons themselves quote nothing from it (the owner's ruling of 2026-10-14).
   * ⛔ REQUIRED, not optional, and that is deliberate. The E-99 near-miss was a fourth argument
   * left off one call site: it type-checked perfectly and the feature silently did nothing on
   * half the surfaces it claimed to cover. A required prop makes forgetting it a compile error.
   */
  pricing: UpDownPricing;
  assetName: string;
  size?: "card" | "detail";
  /** The board card is itself a link, so its controls must stop click bubbling. */
  stopPropagation?: boolean;
}) {
  const { t } = useT();
  const compact = size === "card";
  // ── D2 · THE EMPTY SIDE, NOT A MULTIPLIER ──────────────────────────────────
  //
  // ⛔ NO MULTIPLIER ON THESE BUTTONS (Ali's ruling of 2026-10-14: "keep up and down only"). They printed
  // `× N` priced at the chosen stake through `payoutFor` (D2, and before it one flat constant on both); the
  // one payout figure a player is shown before betting closes is now the projected return AT THE COMMIT —
  // the round page's confirm panel and the receipt this control hosts below.
  //
  // ⭐ Which side nobody has backed. Round-wide (not side-aware) because this control offers
  // BOTH sides — the player can see which one is empty and choose. The round PAGE, where the
  // side is already locked, uses `refundWarningFor` instead so it never warns the player who
  // is about to fill the empty side.
  const empty = emptySideOf(pricing);
  const emptyCopy =
    empty === "BOTH" ? t.market.udNobodyBackedEither
    : empty === "UP" ? t.market.udNobodyBacked.replace("{side}", t.market.udUp)
    : empty === "DOWN" ? t.market.udNobodyBacked.replace("{side}", t.market.udDown)
    : null;
  const flash = usePlacePulse(bet.justPlaced?.nonce);
  const flashSide = bet.justPlaced?.side;
  const inputRef = useRef<HTMLInputElement>(null);

  // Move focus into the field the moment custom mode opens.
  useEffect(() => { if (bet.customMode) inputRef.current?.focus(); }, [bet.customMode]);

  const guard = (fn: () => void) => (e: React.MouseEvent | React.KeyboardEvent) => {
    if (stopPropagation) { e.stopPropagation(); }
    if ("preventDefault" in e) e.preventDefault();
    fn();
  };

  // ⛔ DA-3 (E-112) · MIN-HEIGHT 44px, both sizes. These chips DECIDE HOW MUCH A PLAYER
  // STAKES, and they rendered 26px tall against the platform's own 40px money-control
  // floor — the smallest tap targets on the money path, on the surface most bets are
  // placed from. The floor is a class on the chip, not a padding retune, so a font or
  // padding change cannot silently sink it again.
  // ⭐ RAISED 40 → 44: §A2 sets 40 as the floor and 44 as the mobile preference, and adds
  // that "money controls are never the exception". An Up & Down round is the most
  // time-pressured money decision in the product — the chip is tapped against a running
  // countdown, one-handed — so it takes the preferred size, not the minimum survivable one.
  // ⚠️ `compact` is a DENSITY, not a licence to drop below the floor: both arms carry 44.
  // S12 F14 · the narrow card cannot hold the label, four presets and Custom on one
  // line. The rail wraps instead of clipping Custom at 320px; each chip has a 44px
  // width floor as well as the existing height floor.
  const chipBase = compact
    ? "shrink-0 whitespace-nowrap rounded-md px-2 py-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center font-mono text-[11px] font-semibold tabular-nums transition-colors"
    : "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center font-mono text-[12px] font-semibold tabular-nums transition-colors";
  const chipStyle = (on: boolean) => ({
    border: `1px solid ${on ? "var(--border-strong)" : "transparent"}`,
    background: on ? "var(--bg-inset)" : "color-mix(in oklab, var(--bg-inset) 45%, transparent)",
    color: on ? "var(--text)" : "var(--text-subtle)",
  });

  const customInvalid = bet.customMode && bet.customValue.trim() !== "" && !bet.customValid;

  return (
    <>
      {/* "You're in" — the viewer's OWN live stake this round (server + optimistic tap). */}
      {(bet.shownUp > 0 || bet.shownDown > 0) && (
        <div className={cn("flex flex-wrap items-center gap-1.5 font-mono", compact ? "mb-2 text-[10px]" : "mb-3 text-[10.5px]")}>
          <span className="uppercase eyebrow text-text-subtle">{t.market.udYoureIn}</span>
          {bet.shownUp > 0 && <Chip variant="yes" className="tabular-nums">{t.market.udUp} {formatTzs(bet.shownUp)}</Chip>}
          {bet.shownDown > 0 && <Chip variant="no" className="tabular-nums">{t.market.udDown} {formatTzs(bet.shownDown)}</Chip>}
        </div>
      )}

      {/* Stake selector — preset chips + a Custom toggle. Compact magnitude labels
          (no per-chip "TZS") fit on one line where space permits; the rail wraps
          at narrow widths so no money control is cut off. */}
      <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", compact ? "mb-2" : "mb-2 gap-x-1.5")} role="radiogroup" aria-label={t.market.udStake}>
        <span className={cn("mr-0.5 shrink-0 font-mono uppercase eyebrow text-text-subtle", compact ? "text-micro" : "text-micro")}>
          {t.market.udStake}
        </span>
        {bet.stakes.map((s, i) => {
          const on = !bet.customMode && i === Math.min(bet.stakeIdx, bet.stakes.length - 1);
          return (
            <button
              key={s} type="button" role="radio" aria-checked={on}
              onClick={guard(() => bet.setStakeIdx(i))}
              className={chipBase} style={chipStyle(on)} title={formatTzs(s)}
            >
              {stakeChipLabel(s)}
            </button>
          );
        })}
        {/* Custom toggle — opens/closes the inline amount field. */}
        <button
          type="button" role="radio" aria-checked={bet.customMode}
          aria-label={t.market.udCustom}
          onClick={guard(() => (bet.customMode ? bet.exitCustom() : bet.enterCustom()))}
          className={cn(chipBase, "inline-flex items-center gap-0.5")}
          style={chipStyle(bet.customMode)}
        >
          <I.plus s={compact ? 10 : 11} /> {t.market.udCustom}
        </button>
      </div>

      {/* Inline custom-amount field — the SAME kit money Input the conviction dial uses
          (TZS prefix sub-cell + strict numeric filtering + error state). Appears only in
          custom mode; the bounds/error sit on a hint line so it stays narrow at 360px. */}
      {bet.customMode && (
        <div className={cn("mb-2", !compact && "mb-3")}>
          <Input
            ref={inputRef}
            prefix="TZS"
            mono
            size={compact ? "sm" : "md"}
            inputMode="numeric"
            value={bet.customValue}
            onChange={(e) => bet.setCustomValue(e.target.value.slice(0, 9))}
            onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); bet.exitCustom(); } }}
            aria-label={t.market.udCustomAmount}
            aria-invalid={customInvalid}
            error={customInvalid}
            placeholder="0"
          />
          {/* An amount outside its bounds is a form error at the field: the danger ink, never the Down side's rose (§B2a). */}
          {/* ⭐ THE RANGE IS ONE AMOUNT; THE SENTENCE BEFORE IT WRAPS (round 6, 2026-10-09, review C7). The whole line was one
              `.amount` (mono, `white-space: nowrap`), so exactly when the amount was out of bounds — the sentence in front —
              the line ran out of the card and its maximum was clipped: Swahili 58 characters ≈ 348px against a 256px box at
              320 (English ≈ 318px), clipped up to 390. Now the range alone is the amount ("TZS 1,000 – TZS 1,000,000", 150px,
              whole at every width), and the sentence is the line's own words, so it takes a line of its own where the two
              cannot share one. A valid amount's line draws exactly as before. Twin: `round-stake-panel.tsx`. */}
          <p className={cn("mt-1 text-micro", customInvalid ? "text-danger-fg" : "text-text-subtle")}>
            {customInvalid ? `${t.market.udStakeRange} · ` : ""}<span className="amount">{formatTzs(bet.min)} – {formatTzs(bet.max)}</span>
          </p>
        </div>
      )}

      {/* Place buttons — disabled until the chosen amount is usable, when the known
          balance cannot cover it (UD-1: a doomed tap is prevented, never round-tripped),
          and once the lock has passed on the server-anchored clock (UD-2). */}
      <div className="grid grid-cols-2 gap-2">
        {/* UD-9 · the tapped button carries a small spinner while its burst is in flight.
            The buttons stay ENABLED — repeat taps are repeat bets (Ali's standing
            decision; the spinner is additive acknowledgement, never a gate). */}
        <button
          type="button" onClick={guard(() => bet.place("UP"))} disabled={!bet.stakeReady || bet.insufficient || bet.locallyLocked}
          className={cn("btn btn-yes btn-lg", !compact && "justify-center", flash && flashSide === "UP" && "ud-side-flash")}
         
          aria-label={`${t.market.udUp} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          {bet.pendingSide === "UP" ? <Spinner size={12} /> : <I.arrowUp s={compact ? 14 : 15} className={GLYPH_NO_SHRINK} />} {t.market.udUp}
        </button>
        <button
          type="button" onClick={guard(() => bet.place("DOWN"))} disabled={!bet.stakeReady || bet.insufficient || bet.locallyLocked}
          className={cn("btn btn-no btn-lg", !compact && "justify-center", flash && flashSide === "DOWN" && "ud-side-flash")}
         
          aria-label={`${t.market.udDown} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          {bet.pendingSide === "DOWN" ? <Spinner size={12} /> : <I.arrowDown s={compact ? 14 : 15} className={GLYPH_NO_SHRINK} />} {t.market.udDown}
        </button>
      </div>

      {/* Helper line — streaming while a tap is in flight; the lock notice once betting is
          over; the balance shortfall with its deposit route (UD-1 — same faint factual
          register as the empty-side note: a fact about the wallet, not an alarm); else the
          prompt + the amount. */}
      {/* F1 (2026-09-27, the landing band's frame panel) · every line below is a SENTENCE, and on the board card
          (`compact`) all four sat at 10px — under §T4's 12.5px reading floor, on the surface most bets are placed
          from. They take the kit's 13px on both sizes, the size the round page already reads them at. */}
      {bet.insufficient && !bet.locallyLocked ? (
        <p className="mt-1.5 flex items-start gap-1 text-body-sm leading-[1.45] text-text-faint break-keep [overflow-wrap:anywhere]">
          <I.info s={11} className="mt-[2px] shrink-0" />
          <span>
            {t.market.udInsufficientBalance}{" "}
            {/* The link blue, hover included (Ali's ruling (2) of 2026-10-10, §B4c), as round-stake-panel's twin. */}
            <Link
              href="/wallet/deposit?from=low-balance"
              className="text-brand-300 underline underline-offset-2 hover:text-brand-200"
              onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
            >
              {t.market.udDepositCta}
            </Link>
          </span>
        </p>
      ) : (
        <p className="mt-1.5 flex items-center gap-1 text-body-sm leading-[1.45] text-text-faint">
          {bet.pending
            // UD-9 · staged: past ~2.5s in flight the line escalates to the queued
            // message — the admission queue can legitimately hold a bet for seconds,
            // and the UI must never read as failed while the request is alive.
            ? bet.pendingSlow
              ? <><span className="live-dot" /> {t.market.udStillPlacing}</>
              // ⭐ The stake is MONEY in a sentence (§M4; round 4, tile 166: "TZS 1,000" was in the body face, its "1"
              // 4px wide against the "0"'s 7). `.amount` sets it mono and whole, and the sentence stays ONE flex item, so
              // the row's gap never stands in for the space beside the figure.
              : <><span className="live-dot" /> <span><span className="amount">{formatTzs(bet.stake)}</span> · {t.market.udStreaming}</span></>
            : bet.locallyLocked
              ? <>{t.market.udErrSelectionClosed}</>
              : bet.stakeReady
                ? <span>{t.market.udTapToBet} · <span className="amount">{formatTzs(bet.stake)}</span></span>
                : <>{t.market.udEnterStake}</>}
        </p>
      )}
      {/* ⭐ D2 · THE EMPTY-SIDE STATE, SAID BEFORE THE BET.
          A one-sided round refunds everyone whichever way the price goes (E-65), and until now
          the only place that was ever said was the refund notice — AFTER the round. It sits on
          BOTH sizes, because the board card is where most bets are actually placed.
          ⚠️ RG (G5): faint informational ink and the `info` glyph — the same "state a fact"
          register the `factual` toast variant was added for. Not gold (gold is earned money on
          this platform), not an alarm (a refund is not a failure). */}
      {emptyCopy && (
        <p className="mt-1.5 flex items-start gap-1 text-body-sm leading-[1.45] text-text-faint break-keep [overflow-wrap:anywhere]">
          <I.info s={11} className="mt-[2px] shrink-0" />
          {/* R10-B (round 10's read, tile 166): the note holds "dau lako" / "your stake" like every notice body. */}
          <span>{noticeBody(emptyCopy)}</span>
        </p>
      )}
      {/* ⛔ NO ESTIMATE NOTE HERE ANY MORE: it explained the `× N` these buttons no longer print (the owner's ruling of
          2026-10-14). Its sentence now qualifies the projected return where one is shown — the round page's confirm
          panel and the receipt below. */}

      {/* Screen-reader confirmation. ⛔ NOT a replacement for the toast — both, always: a
          toast is a transient region a screen reader may never voice, and this is the
          announcement. (This comment said "replaces the happy-path toast"; the toast has
          been back since E-64.) */}
      <span aria-live="polite" className="sr-only">{bet.liveMessage}</span>

      {/* UD-3 · compliance/account refusals must be READ, not glimpsed — the canonical
          result modal, danger variant, open until dismissed. One host per bet instance. */}
      <UpDownBetBlockedModal blocked={bet.blocked} onClose={bet.clearBlocked} />

      {/* ⭐ UD-22 · and its SIBLING, the success case — the receipt a placed bet ends in.
          Hosted here, beside the refusal, so every bet surface confirms identically.
          ⛔ `key` is the receipt's nonce, and that is what makes a burst COALESCE correctly:
          the modal's auto-close target is anchored once per open cycle, so without a remount
          a second bet would show under the FIRST tap's countdown and could vanish almost
          immediately. Re-keying restarts the 5s for the latest bet while still rendering
          exactly one dialog — never a stack, and never a gate on the next tap. */}
      {receipt && (
        <UpDownBetReceiptModal
          key={bet.placedReceipt?.nonce ?? 0}
          placed={bet.placedReceipt}
          info={receipt}
          pricing={pricing}
          assetName={assetName}
          onClose={bet.clearPlacedReceipt}
          onWatchRound={onWatchRound}
        />
      )}
    </>
  );
}
