"use client";

import Link from "next/link";
import { ExternalLink, Flame, Clock, Scale } from "lucide-react";
import { TippingBar } from "@/components/brand";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  titleEn: string;
  titleSw: string;
  category: string;
  yesPct: number;
  volume: number;
  predictors: number;
  timeLeft: string;
  status: "LIVE" | "RESOLVED" | "CLOSED" | "VOIDED" | "DRAFT";
  sourceUrl?: string;
  className?: string;
};

/** Compute an at-a-glance signal badge for a LIVE market.
 *
 *   "hot"     — pool volume above ~30k or predictors ≥ 40
 *   "soon"    — under 60 minutes to resolution (matches timeLeft string)
 *   "tipping" — implied probability within 3 % of 50/50
 *
 *  Returns the most attention-worthy single badge — multiple would
 *  crowd the chip row. Priority: hot > soon > tipping. */
function getSignalBadge(
  status: Props["status"],
  yesPct: number,
  volume: number,
  predictors: number,
  timeLeft: string,
): { kind: "hot" | "soon" | "tipping"; label: string } | null {
  if (status !== "LIVE") return null;
  if (volume >= 30_000 || predictors >= 40) return { kind: "hot", label: "Hot" };
  if (/^\d+m left$/.test(timeLeft) || /^\d+s left$/.test(timeLeft)) return { kind: "soon", label: "Ending soon" };
  if (Math.abs(yesPct - 50) <= 3) return { kind: "tipping", label: "Tipping" };
  return null;
}

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

export function MarketCard({
  id,
  titleEn,
  titleSw,
  category,
  yesPct,
  volume,
  predictors,
  timeLeft,
  status,
  sourceUrl,
  className,
}: Props) {
  const signal = getSignalBadge(status, yesPct, volume, predictors, timeLeft);
  return (
    <Link
      href={`/markets/${id}` as never}
      className={cn(
        "group block rounded-lg border border-border bg-bg-elevated p-4 transition-all duration-stage",
        "hover:-translate-y-[2px] hover:border-gold-700 hover:shadow-[0_18px_36px_-12px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "chip",
              status === "LIVE" && "chip-live",
              status === "RESOLVED" && "chip-resolved",
              (status === "CLOSED" || status === "DRAFT") && "chip-pending",
              status === "VOIDED" && "chip-objection",
            )}
          >
            {status === "LIVE" && <span className="live-dot" style={{ width: 6, height: 6 }} />}
            {status === "LIVE" ? "Live" : status === "RESOLVED" ? "Resolved" : status === "VOIDED" ? "Void" : "Pending"}
          </span>
          <span className="chip">
            {category}
          </span>
          {signal && (
            <span
              aria-label={signal.label}
              className={cn(
                "chip",
                signal.kind === "hot" && "chip-objection",
                signal.kind === "soon" && "chip-pending",
                signal.kind === "tipping" && "chip-signal",
              )}
              style={{ fontWeight: 700 }}
            >
              {signal.kind === "hot" && <Flame size={10} aria-hidden />}
              {signal.kind === "soon" && <Clock size={10} aria-hidden />}
              {signal.kind === "tipping" && <Scale size={10} aria-hidden />}
              {signal.label}
            </span>
          )}
        </div>
        {sourceUrl && (
          <button
            type="button"
            aria-label="Open resolution source"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(sourceUrl, "_blank", "noopener,noreferrer");
            }}
            className="text-text-subtle hover:text-text-muted transition-colors"
          >
            <ExternalLink size={16} aria-hidden />
          </button>
        )}
      </div>

      <h3 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-text">{titleEn}</h3>
      {titleSw && <p className="mt-1 text-[13px] italic text-text-subtle">{titleSw}</p>}

      <div className="mt-3.5">
        <TippingBar
          yesPct={yesPct}
          height={14}
          resolved={status === "RESOLVED"}
          showLabels={false}
        />
        <div className="mt-2 flex items-baseline justify-between font-mono text-[11px]">
          <span className="text-yes-300">YES <strong className="font-bold">{yesPct}¢</strong></span>
          <span className="text-text-subtle uppercase tracking-wider italic text-[9px]">
            {Math.abs(yesPct - 50) < 4 ? "tipping" : yesPct > 50 ? "leans yes" : "leans no"}
          </span>
          <span className="text-no-300"><strong className="font-bold">{100 - yesPct}¢</strong> NO</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 font-mono text-[12px] text-text-muted">
        <span>vol {fmtTzs(volume)}</span>
        <span>·</span>
        <span>{predictors.toLocaleString()} predictors</span>
        <span className="ml-auto">{timeLeft}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          aria-label={`Buy YES at ${yesPct}%`}
          onClick={(e) => { e.preventDefault(); window.location.href = `/markets/${id}?side=YES`; }}
          className="btn btn-yes btn-sm"
        >
          YES · {yesPct}¢
        </button>
        <button
          type="button"
          aria-label={`Buy NO at ${100 - yesPct}%`}
          onClick={(e) => { e.preventDefault(); window.location.href = `/markets/${id}?side=NO`; }}
          className="btn btn-no btn-sm"
        >
          NO · {100 - yesPct}¢
        </button>
      </div>
    </Link>
  );
}
