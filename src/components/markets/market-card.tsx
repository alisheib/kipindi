"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
  return (
    <Link
      href={`/markets/${id}` as never}
      className={cn(
        "group block rounded-lg border border-border bg-bg-elevated p-4 transition-all duration-stage",
        "hover:-translate-y-[2px] hover:border-teal-500 hover:shadow-e4",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[12px] font-semibold",
              status === "LIVE" && "border-danger-border bg-danger-bg/40 text-danger-fg",
              status === "RESOLVED" && "border-gold-subtleHover bg-gold-subtle text-gold-300",
              (status === "CLOSED" || status === "DRAFT") && "border-info-border bg-info-bg/40 text-info-fg",
              status === "VOIDED" && "border-border bg-bg-overlay text-text-muted",
            )}
          >
            {status === "LIVE" && <span className="live-dot" style={{ width: 6, height: 6 }} />}
            {status === "LIVE" ? "Live" : status === "RESOLVED" ? "Resolved" : status === "VOIDED" ? "Void" : "Pending"}
          </span>
          <span className="inline-flex items-center rounded-pill border border-border bg-bg-elevated px-2.5 py-0.5 text-[12px] font-medium text-text-muted">
            {category}
          </span>
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
        <TippingBar yesPct={yesPct} height={14} resolved={status === "RESOLVED"} showLabels={false} />
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
          className="h-8 rounded-md bg-yes-500 text-[12px] font-bold text-yes-950 transition-colors hover:bg-yes-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
        >
          YES · {yesPct}¢
        </button>
        <button
          type="button"
          aria-label={`Buy NO at ${100 - yesPct}%`}
          onClick={(e) => { e.preventDefault(); window.location.href = `/markets/${id}?side=NO`; }}
          className="h-8 rounded-md bg-no-500 text-[12px] font-bold text-white transition-colors hover:bg-no-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
        >
          NO · {100 - yesPct}¢
        </button>
      </div>
    </Link>
  );
}
