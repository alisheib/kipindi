import Link from "next/link";
import { cn, formatDateTime } from "@/lib/utils";
import { Cash } from "@/components/ui/cash";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";

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
  className?: string;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export function PositionCard({ marketId, marketTitle, side, stake, current, payout, status, placedAt, className }: Props) {
  const statusLabel = {
    OPEN: "Pending",
    WIN: "Resolved · Win",
    LOSS: "Resolved · Loss",
    VOID: "Voided",
    CASHED_OUT: "Cashed out",
  }[status];
  return (
    <Link
      href={`/markets/${marketId}` as never}
      className={cn("block w-full rounded-xl border border-border bg-bg-elevated p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--brand-500)] hover:shadow-[0_0_0_1px_var(--brand-500),0_14px_34px_oklch(8%_0.08_264_/_0.6),0_0_30px_oklch(63%_0.18_262_/_0.24)]", className)}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <Chip size="sm" variant={side === "YES" ? "yes" : "no"}>{side}</Chip>
        <Chip size="sm" variant={
          status === "WIN" ? "gold"
          : status === "LOSS" ? "no"
          : status === "OPEN" ? "info"
          : status === "VOID" ? "neutral"
          : "warning"
        }>{statusLabel}</Chip>
      </div>
      <div className="mb-3.5">
        <p className="font-display text-[15px] font-semibold leading-tight tracking-[-0.005em] text-text line-clamp-2">
          {marketTitle}
        </p>
        {placedAt && (
          <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] tracking-[0.04em] text-text-faint tabular-nums">
            <I.clock s={11} className="opacity-70 shrink-0" />
            Opened {formatDateTime(placedAt)}
          </p>
        )}
      </div>
      {/* Open positions: per management spec (license review · 2026-05)
          the potential payout is NOT shown until the event has resolved.
          Settled positions show the actual final payout. */}
      {status === "OPEN" ? (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Stake" value={`TZS ${fmt(stake)}`} money />
          <Stat label="Payout" value="At resolution" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Stake" value={`TZS ${fmt(stake)}`} money />
          <Stat label="Final" value={`TZS ${fmt(current)}`} money />
          <Stat label="Payout" value={`TZS ${fmt(payout)}`} tone={status === "WIN" ? "gold" : "default"} money />
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
