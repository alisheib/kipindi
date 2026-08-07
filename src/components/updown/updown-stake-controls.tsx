"use client";

/**
 * UpDownStakeControls — the shared quick-bet control used by BOTH the board card and
 * the round-detail bet box, so the two never drift. Renders, top to bottom:
 *   · "you're in" (the viewer's own live stake per side)
 *   · the stake selector: preset chips + a "＋ Custom" chip that expands an inline,
 *     validated numeric field (bounded to the chain's min/max)
 *   · the Up / Down place buttons (disabled until the chosen amount is usable)
 *   · a helper line, a success pulse on the tapped side, and a visually-hidden
 *     aria-live announcement (the confirmation for screen readers, in place of a toast)
 *
 * Presentational only — all money logic + the placement/validation state come from
 * `useUpDownQuickBet`, passed in as `bet`. Two sizes: "card" (compact, on the board)
 * and "detail" (roomier, on /updown/[roundId]).
 */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Input } from "@/components/ui/input";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { usePlacePulse, type useUpDownQuickBet } from "./use-quick-bet";
import { stakeChipLabel } from "./stake-math";
// ⭐ D2 · ONE RULE for "what would I be paid", shared with the card, the round page and the
// server's own `myExactPayout`. Never re-derived here — see `@/lib/updown-pricing`.
import { impliedMultiplier, emptySideOf, formatMultiplier, type UpDownPricing } from "@/lib/updown-pricing";

type Bet = ReturnType<typeof useUpDownQuickBet>;

export function UpDownStakeControls({
  bet,
  pricing,
  assetName,
  size = "card",
  stopPropagation = false,
}: {
  bet: Bet;
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

  const chipBase = compact
    ? "shrink-0 whitespace-nowrap rounded-md px-2 py-1 font-mono text-[10.5px] font-semibold tabular-nums transition-colors"
    : "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11.5px] font-semibold tabular-nums transition-colors";
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

      {/* Place buttons — disabled until the chosen amount is usable AND coverable
          (UD-1: a predictably-doomed tap is prevented, never round-tripped). */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button" onClick={guard(() => bet.place("UP"))} disabled={!bet.stakeReady || bet.insufficient}
          className={cn("btn btn-yes btn-lg", !compact && "justify-center", flash && flashSide === "UP" && "ud-side-flash")}
          aria-label={`${t.market.udUp} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          <I.trendingUp s={compact ? 14 : 15} /> {t.market.udUp}
          {multUp != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(multUp)} est.</span>}
        </button>
        <button
          type="button" onClick={guard(() => bet.place("DOWN"))} disabled={!bet.stakeReady || bet.insufficient}
          className={cn("btn btn-no btn-lg", !compact && "justify-center", flash && flashSide === "DOWN" && "ud-side-flash")}
          aria-label={`${t.market.udDown} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          <I.trendingDown s={compact ? 14 : 15} /> {t.market.udDown}
          {multDown != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(multDown)} est.</span>}
        </button>
      </div>

      {/* Helper line — streaming while a tap is in flight, else the prompt + the amount.
          UD-1: when the stake exceeds the rendered balance, the line states the fact
          (info glyph, faint ink — the empty-side register, not an alarm) + a Deposit
          route. Prevented, so nothing here ever round-trips. */}
      {bet.insufficient ? (
        <p className={cn("mt-1.5 flex items-start gap-1 leading-[1.45] text-text-faint", compact ? "text-[10px]" : "text-[10.5px]")}>
          <I.info s={compact ? 10 : 11} className="mt-[2px] shrink-0" />
          <span>
            {t.market.udInsufficientBalance}{" "}
            <Link
              href="/wallet/deposit"
              className="underline decoration-[color:var(--border-strong)] underline-offset-2 hover:text-text"
              onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
            >
              {t.common.deposit}
            </Link>
          </span>
        </p>
      ) : (
        <p className={cn("mt-1.5 flex items-center gap-1 leading-[1.45] text-text-faint", compact ? "text-[10px]" : "text-[10.5px]")}>
          {bet.pending
            ? <><span className="live-dot" /> {formatTzs(bet.stake)} · {t.market.udStreaming}</>
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

      {/* Screen-reader confirmation — replaces the happy-path toast. */}
      <span aria-live="polite" className="sr-only">{bet.liveMessage}</span>
    </>
  );
}
