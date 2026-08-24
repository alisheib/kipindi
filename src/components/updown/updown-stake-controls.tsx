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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { usePlacePulse, type useUpDownQuickBet } from "./use-quick-bet";
import { UpDownBetBlockedModal } from "./updown-bet-blocked-modal";
import { UpDownBetReceiptModal } from "./updown-bet-receipt-modal";
import type { UpDownReceiptInfo } from "@/lib/updown-receipt";
import { stakeChipLabel } from "./stake-math";
// ⭐ D2 · ONE RULE for "what would I be paid", shared with the card, the round page and the
// server's own `myExactPayout`. Never re-derived here — see `@/lib/updown-pricing`.
import { impliedMultiplier, emptySideOf, formatMultiplier, type UpDownPricing } from "@/lib/updown-pricing";

type Bet = ReturnType<typeof useUpDownQuickBet>;

/**
 * ⭐ E-196 · THE SIDE BUTTONS' PADDING FOLLOWS THE DENSITY, ON THE CARD ONLY.
 *
 * 🔴 THE DEFECT, measured on production 2026-08-24 as a SIGNED-OUT visitor at 1024px: the DOWN
 * button clipped its own payout figure. `Down × 1.00 est.` is **144px of content in a 133px
 * box**; Swahili `Chini × 1.00 est.` was +9px; English was still +4px at 1100. Clean at 768 and
 * 1280+, clean in ZH (short words), and clean SIGNED IN — a player with a position sees a
 * different card. So the population it hit was the one deciding whether to sign up.
 *
 * ⛔ THE CLIPPED TEXT IS A MONEY FIGURE. `× 1.00 est.` is the estimated payout multiple, and the
 * D2 note above calls the UP/DOWN asymmetry (`× 1.00` against `× 16.6`) the whole point of the
 * control. Truncating it paints a shorter number; hiding it on a narrow card removes the one
 * thing the button is there to say. Neither is available.
 *
 * ⭐ SO THE PADDING YIELDS, AND `compact` IS ALREADY THE NAME FOR THAT. This component's density
 * knob already drives the icon size, the chip sizes and every text step — it simply never
 * reached the padding, while `.btn-lg`'s `0 20px` is sized for a full-width control and the
 * board's card gives these two grid children 133px each. 20px → `--sp-3` (12px) returns **16px
 * per button**, against the 11px English needed and the 9px Swahili needed.
 *
 * ⛔ IT IS AN INLINE STYLE ON THIS COMPONENT, NOT A NEW KIT CLASS, and that is the point: it
 * changes nothing about `.btn-lg` anywhere else in the product, adds no arbitrary Tailwind
 * utility for `test:type-scale` to ratchet, and spends an existing token rather than a new
 * number. ⚠️ The height is untouched, so the 44px tap floor is unaffected (the control measures
 * 133×46 today).
 */
export const SIDE_BTN_COMPACT = { paddingInline: "var(--sp-3)" } as const;

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
  // ── D2 · THE HONEST MULTIPLIER ────────────────────────────────────────────
  //
  // 🔴 These two used to be ONE flat number, the same on both buttons whatever the pool held.
  // They are now priced against the stake the player has actually chosen, through the same
  // `payoutFor` settlement pays with — so on a round holding UP 36,000 / DOWN 0 the UP button
  // reads `× 1.00` (your stake, back) and the DOWN button `× 16.6`. That asymmetry IS the
  // information; nothing else on the card could have carried it.
  //
  // ⚠️ It moves with every later bet, which is what `udEstimateNote` now says. It is never a
  // promise — the LOCK freezes the pool and `myExactPayout` replaces it with arithmetic.
  const multUp = impliedMultiplier(pricing, "UP", bet.stake);
  const multDown = impliedMultiplier(pricing, "DOWN", bet.stake);
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
  const chipBase = compact
    ? "shrink-0 whitespace-nowrap rounded-md px-2 py-1 min-h-[44px] inline-flex items-center justify-center font-mono text-[10.5px] font-semibold tabular-nums transition-colors"
    : "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 min-h-[44px] inline-flex items-center justify-center font-mono text-[11.5px] font-semibold tabular-nums transition-colors";
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
          <span className="uppercase tracking-[0.10em] text-text-faint">{t.market.udYoureIn}</span>
          {bet.shownUp > 0 && <span className="chip chip-yes tabular-nums">{t.market.udUp} {formatTzs(bet.shownUp)}</span>}
          {bet.shownDown > 0 && <span className="chip chip-no tabular-nums">{t.market.udDown} {formatTzs(bet.shownDown)}</span>}
        </div>
      )}

      {/* Stake selector — preset chips + a Custom toggle. Compact magnitude labels
          (no per-chip "TZS") keep the whole row on one line at 360px. */}
      <div className={cn("flex items-center gap-1", compact ? "mb-2" : "mb-2 gap-1.5")} role="radiogroup" aria-label={t.market.udStake}>
        <span className={cn("mr-0.5 shrink-0 font-mono uppercase tracking-[0.12em] text-text-faint", compact ? "text-[8.5px]" : "text-[9px]")}>
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
          <p className={cn("mt-1 font-mono text-[10px] tabular-nums", customInvalid ? "text-no-300" : "text-text-subtle")}>
            {customInvalid ? `${t.market.udStakeRange} · ` : ""}{formatTzs(bet.min)} – {formatTzs(bet.max)}
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
          style={compact ? SIDE_BTN_COMPACT : undefined}
          aria-label={`${t.market.udUp} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          {bet.pendingSide === "UP" ? <Spinner size={12} /> : <I.trendingUp s={compact ? 14 : 15} />} {t.market.udUp}
          {multUp != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(multUp)} est.</span>}
        </button>
        <button
          type="button" onClick={guard(() => bet.place("DOWN"))} disabled={!bet.stakeReady || bet.insufficient || bet.locallyLocked}
          className={cn("btn btn-no btn-lg", !compact && "justify-center", flash && flashSide === "DOWN" && "ud-side-flash")}
          style={compact ? SIDE_BTN_COMPACT : undefined}
          aria-label={`${t.market.udDown} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          {bet.pendingSide === "DOWN" ? <Spinner size={12} /> : <I.trendingDown s={compact ? 14 : 15} />} {t.market.udDown}
          {multDown != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(multDown)} est.</span>}
        </button>
      </div>

      {/* Helper line — streaming while a tap is in flight; the lock notice once betting is
          over; the balance shortfall with its deposit route (UD-1 — same faint factual
          register as the empty-side note: a fact about the wallet, not an alarm); else the
          prompt + the amount. */}
      {bet.insufficient && !bet.locallyLocked ? (
        <p className={cn("mt-1.5 flex items-start gap-1 leading-[1.45] text-text-faint", compact ? "text-[10px]" : "text-[10.5px]")}>
          <I.info s={compact ? 10 : 11} className="mt-[2px] shrink-0" />
          <span>
            {t.market.udInsufficientBalance}{" "}
            <Link
              href="/wallet/deposit"
              className="underline decoration-[color:var(--border-strong)] underline-offset-2 hover:text-text-muted"
              onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
            >
              {t.market.udDepositCta}
            </Link>
          </span>
        </p>
      ) : (
        <p className={cn("mt-1.5 flex items-center gap-1 leading-[1.45] text-text-faint", compact ? "text-[10px]" : "text-[10.5px]")}>
          {bet.pending
            // UD-9 · staged: past ~2.5s in flight the line escalates to the queued
            // message — the admission queue can legitimately hold a bet for seconds,
            // and the UI must never read as failed while the request is alive.
            ? bet.pendingSlow
              ? <><span className="live-dot" /> {t.market.udStillPlacing}</>
              : <><span className="live-dot" /> {formatTzs(bet.stake)} · {t.market.udStreaming}</>
            : bet.locallyLocked
              ? <>{t.market.udErrSelectionClosed}</>
              : bet.stakeReady
                ? <>{t.market.udTapToBet} · {formatTzs(bet.stake)}</>
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
        <p className={cn("mt-1.5 flex items-start gap-1 leading-[1.45] text-text-faint", compact ? "text-[10px]" : "text-[10.5px]")}>
          <I.info s={compact ? 10 : 11} className="mt-[2px] shrink-0" />
          <span>{emptyCopy}</span>
        </p>
      )}
      {/* ⛔ THE NOTE NOW RENDERS ON THE CARD TOO. It used to be `!compact`, so the board card —
          the surface a quick-bet is actually placed from — carried a bare "× 1.5 est." with
          nothing saying what the figure was. Now that the number moves with every later bet
          (G3), the sentence that says so has to travel with it. */}
      {(multUp != null || multDown != null) && (
        <p className={cn("mt-1 leading-[1.45] text-text-faint", compact ? "text-[10px]" : "text-[10.5px]")}>{t.market.udEstimateNote}</p>
      )}

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
