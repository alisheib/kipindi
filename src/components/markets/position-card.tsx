"use client";

import Link from "next/link";
import { cn, formatDateTime, formatTzs } from "@/lib/utils";
import { Cash } from "@/components/ui/cash";
import { Chip } from "@/components/ui/chip";
// The kit primitive, replacing this file's own local copy of it (one of three
// hand-rolled label/value pairs across the fee surfaces).
import { Stat } from "@/components/ui/stat";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { PositionShare } from "@/components/markets/position-share";

type Props = {
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  stake: number;
  current: number;          // current value if open, final if settled
  payout: number;           // potentialPayout if open, finalPayout if settled
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  /**
   * True once betting has CLOSED on this market.
   *
   * This is the switch for the whole payout-disclosure policy. While betting is
   * open the pools keep moving, so any figure we showed would be a projection —
   * and D3 (license review 2026-05) says we show none. Once betting closes the
   * pools are FROZEN, so `payout` stops being a projection and becomes the exact
   * amount we will pay, computed by the same function that settles.
   *
   * An OPEN position used to render no money figure at all, in either state.
   */
  bettingClosed?: boolean;
  /** ISO timestamp the bet was placed — shown as a small "Opened …" meta line. */
  placedAt?: string;
  /** Position reference (e.g. pos_a1b2c3d4e5) — the ticket number quoted in emails. */
  positionId?: string;
  /** The viewer's affiliate code, so a share carries their referral link. */
  refCode?: string;
  className?: string;
};

export function PositionCard({ marketId, marketTitle, side, stake, current, payout, status, bettingClosed, placedAt, positionId, refCode, className }: Props) {
  const { t } = useT();
  const statusLabel = {
    OPEN: t.common.pending,
    WIN: t.market.resolvedWin,
    LOSS: t.market.resolvedLoss,
    VOID: t.common.voided,
    CASHED_OUT: t.common.cashedOut,
  }[status];
  return (
    <Link
      href={`/markets/${marketId}` as never}
      className={cn("block w-full rounded-xl border border-border bg-bg-elevated p-4 transition-all duration-200 ease-out hover:-translate-y-[3px] hover:border-[var(--brand-500)] hover:shadow-[0_0_0_1px_var(--brand-500),0_14px_34px_oklch(8%_0.08_264_/_0.6)]", className)}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Chip size="sm" variant={side === "YES" ? "yes" : "no"}>{side}</Chip>
          <Chip size="sm" variant={
            status === "WIN" ? "gold"
            : status === "LOSS" ? "no"
            : status === "OPEN" ? "info"
            : status === "VOID" ? "neutral"
            : "warning"
          }>{statusLabel}</Chip>
        </div>
        <span className="font-mono text-[14px] font-bold tabular-nums text-text">
          <Cash>{formatTzs(stake)}</Cash>
        </span>
      </div>
      <div className="mb-3.5">
        <p className="font-display text-[15px] font-semibold leading-tight tracking-[-0.005em] text-text line-clamp-2">
          {marketTitle}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {positionId && (
            <p className="font-mono text-[10px] tracking-[0.06em] text-text-muted tabular-nums">
              <I.ticket s={10} className="inline -mt-px mr-0.5 opacity-60" />
              {positionId}
            </p>
          )}
          {placedAt && (
            <p className="flex items-center gap-1 font-mono text-[10px] tracking-[0.04em] text-text-faint tabular-nums">
              <I.clock s={10} className="opacity-70 shrink-0" />
              {t.market.opened} {formatDateTime(placedAt)}
            </p>
          )}
        </div>
      </div>
      {/* THE PAYOUT, in the three states it can honestly be in.
          Before this, an OPEN position showed NOTHING — in either state. */}
      {status !== "OPEN" ? (
        // Settled: the real, final, paid amount.
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t.market.finalLabel} value={formatTzs(current)} money />
          <Stat label={t.dialog.payoutLabel} value={formatTzs(payout)} tone={status === "WIN" ? "gold" : "default"} money />
        </div>
      ) : bettingClosed ? (
        // Betting is CLOSED: the pools are frozen, so this figure is exact — it was
        // computed by the same function that will settle it. Not an estimate, and we
        // say so, because "you'll get about X" and "you will get X" are different
        // promises and we are making the second one.
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t.dialog.stakeLabel} value={formatTzs(stake)} money />
          <Stat
            label={t.market.payoutIfWin}
            value={formatTzs(payout)}
            tone="gold"
            money
            hint={t.market.payoutExactNote}
          />
        </div>
      ) : (
        // Betting is OPEN: the pools are still moving, so there is no exact number
        // to give. D3 (license review 2026-05) says we show no projection. Instead
        // of a blank card, tell the player when they WILL get the number.
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t.dialog.stakeLabel} value={formatTzs(stake)} money />
          <Stat label={t.dialog.payoutLabel} value={t.market.payoutAtClose} tone="muted" />
        </div>
      )}

      {/* F5 — share. A WIN shares the REAL settled payout (server-minted signed
          token); an OPEN position shares the pick. Losses/voids get no share. */}
      {(status === "WIN" || status === "OPEN") && (
        <div className="mt-3 flex justify-end border-t border-border/60 pt-3">
          <PositionShare
            marketId={marketId}
            marketTitle={marketTitle}
            side={side}
            positionId={positionId}
            won={status === "WIN"}
            payout={payout}
            refCode={refCode}
          />
        </div>
      )}
    </Link>
  );
}
