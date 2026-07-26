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
import { I } from "@/components/ui/glyphs";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { usePlacePulse, type useUpDownQuickBet } from "./use-quick-bet";
import { stakeChipLabel } from "./stake-math";

type Bet = ReturnType<typeof useUpDownQuickBet>;

export function UpDownStakeControls({
  bet,
  estMultiplier,
  assetName,
  size = "card",
  stopPropagation = false,
}: {
  bet: Bet;
  estMultiplier: number | null;
  assetName: string;
  size?: "card" | "detail";
  /** The board card is itself a link, so its controls must stop click bubbling. */
  stopPropagation?: boolean;
}) {
  const { t } = useT();
  const compact = size === "card";
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

      {/* Inline custom-amount field — appears only in custom mode; no layout jump elsewhere. */}
      {bet.customMode && (
        <div className={cn("mb-2", compact ? "" : "mb-3")}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 transition-colors brand-focus-within",
              compact ? "h-9" : "h-10",
            )}
            style={{ background: "var(--bg-inset)", borderColor: customInvalid ? "var(--no-500)" : "var(--border)" }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.10em] text-text-faint">TZS</span>
            <input
              ref={inputRef}
              type="text" inputMode="numeric" autoComplete="off"
              value={bet.customValue}
              onChange={(e) => bet.setCustomValue(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
              onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
              onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); bet.exitCustom(); } }}
              aria-label={t.market.udCustomAmount}
              aria-invalid={customInvalid}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent font-mono tabular-nums text-text outline-none placeholder:text-text-subtle/40"
              style={{ fontSize: compact ? 13 : 14 }}
            />
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-text-subtle">
              {formatTzs(bet.min)}–{formatTzs(bet.max)}
            </span>
          </div>
          {customInvalid && (
            <p className="mt-1 font-mono text-[10px] text-no-300">{t.market.udStakeRange}</p>
          )}
        </div>
      )}

      {/* Place buttons — disabled until the chosen amount is usable. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button" onClick={guard(() => bet.place("UP"))} disabled={!bet.stakeReady}
          className={cn("btn btn-yes btn-lg", !compact && "justify-center", flash && flashSide === "UP" && "ud-side-flash")}
          aria-label={`${t.market.udUp} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          <I.trendingUp s={compact ? 14 : 15} /> {t.market.udUp}
          {estMultiplier != null && <span className="font-mono text-[12.5px] opacity-85">× {estMultiplier.toFixed(1)} est.</span>}
        </button>
        <button
          type="button" onClick={guard(() => bet.place("DOWN"))} disabled={!bet.stakeReady}
          className={cn("btn btn-no btn-lg", !compact && "justify-center", flash && flashSide === "DOWN" && "ud-side-flash")}
          aria-label={`${t.market.udDown} — ${assetName}${bet.stakeReady ? ` · ${formatTzs(bet.stake)}` : ""}`}
        >
          <I.trendingDown s={compact ? 14 : 15} /> {t.market.udDown}
          {estMultiplier != null && <span className="font-mono text-[12.5px] opacity-85">× {estMultiplier.toFixed(1)} est.</span>}
        </button>
      </div>

      {/* Helper line — streaming while a tap is in flight, else the prompt + the amount. */}
      <p className={cn("mt-1.5 flex items-center gap-1 leading-[1.45] text-text-faint", compact ? "text-[10px]" : "text-[10.5px]")}>
        {bet.pending
          ? <><span className="live-dot" /> {formatTzs(bet.stake)} · {t.market.udStreaming}</>
          : bet.stakeReady
            ? <>{t.market.udTapToBet} · {formatTzs(bet.stake)}</>
            : <>{t.market.udEnterStake}</>}
      </p>
      {!compact && estMultiplier != null && (
        <p className="mt-1 text-[10px] leading-[1.45] text-text-faint">{t.market.udEstimateNote}</p>
      )}

      {/* Screen-reader confirmation — replaces the happy-path toast. */}
      <span aria-live="polite" className="sr-only">{bet.liveMessage}</span>
    </>
  );
}
