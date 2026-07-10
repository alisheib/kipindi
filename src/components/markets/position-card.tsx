"use client";

import Link from "next/link";
import { cn, formatDateTime, formatTzs } from "@/lib/utils";
import { Cash } from "@/components/ui/cash";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

type Props = {
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  stake: number;
  current: number;          // current value if open, final if settled
  payout: number;           // potentialPayout if open, finalPayout if settled
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  /** ISO timestamp the bet was placed — shown as a small "Opened …" meta line. */
  placedAt?: string;
  /** Position reference (e.g. pos_a1b2c3d4e5) — the ticket number quoted in emails. */
  positionId?: string;
  className?: string;
};

export function PositionCard({ marketId, marketTitle, side, stake, current, payout, status, placedAt, positionId, className }: Props) {
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
      {/* Open positions: per management spec (license review · 2026-05)
          the potential payout is NOT shown until the event has resolved.
          Settled positions show the actual final payout. */}
      {status !== "OPEN" && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t.market.finalLabel} value={formatTzs(current)} money />
          <Stat label={t.dialog.payoutLabel} value={formatTzs(payout)} tone={status === "WIN" ? "gold" : "default"} money />
        </div>
      )}
    </Link>
  );
}

function Stat({ label, value, tone = "default", money }: { label: string; value: string; tone?: "default" | "gold"; money?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{label}</p>
      <p className={cn("font-mono text-[13.5px] font-bold tabular-nums leading-tight", tone === "gold" ? "text-gold-300" : "text-text")}>
        {money ? <Cash>{value}</Cash> : value}
      </p>
    </div>
  );
}
