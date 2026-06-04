import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  stake: number;
  current: number;          // current value if open, final if settled
  payout: number;           // potentialPayout if open, finalPayout if settled
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  className?: string;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export function PositionCard({ marketId, marketTitle, side, stake, current, payout, status, className }: Props) {
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
      className={cn("block w-full rounded-lg border border-border bg-bg-elevated p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-[var(--shadow-3),var(--glow-blue)]", className)}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[12px] font-semibold",
            side === "YES"
              ? "border-yes-700 bg-yes-500/15 text-yes-300"
              : "border-no-700 bg-no-500/15 text-no-300",
          )}
        >
          {side}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[12px] font-semibold",
            status === "WIN"  && "border-gold-subtleHover bg-gold-subtle text-gold-300",
            status === "LOSS" && "border-no-700 bg-no-500/15 text-no-300",
            status === "OPEN" && "border-info-border bg-info-bg/40 text-info-fg",
            status === "VOID" && "border-border bg-bg-overlay text-text-muted",
            status === "CASHED_OUT" && "border-warning-border bg-warning-bg/40 text-warning-fg",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <p className="font-display text-[15px] font-semibold leading-tight tracking-[-0.005em] text-text mb-3.5 line-clamp-2">
        {marketTitle}
      </p>
      {/* Open positions: per management spec (license review · 2026-05)
          the potential payout is NOT shown until the event has resolved.
          Settled positions show the actual final payout. */}
      {status === "OPEN" ? (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Stake" value={`TZS ${fmt(stake)}`} />
          <Stat label="Payout" value="At resolution" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Stake" value={`TZS ${fmt(stake)}`} />
          <Stat label="Final" value={`TZS ${fmt(current)}`} />
          <Stat label="Payout" value={`TZS ${fmt(payout)}`} tone={status === "WIN" ? "gold" : "default"} />
        </div>
      )}
    </Link>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "gold" }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{label}</p>
      <p className={cn("font-mono text-[13px] font-semibold tabular-nums leading-tight", tone === "gold" ? "text-gold-300" : "text-text")}>{value}</p>
    </div>
  );
}
