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
  /** Recent YES% series for the sparkline (optional). */
  spark?: number[];
  /** 24h move in probability points (optional). */
  move24h?: number;
  className?: string;
};

function getSignalBadge(
  status: Props["status"], yesPct: number, volume: number, predictors: number, timeLeft: string,
): { kind: "hot" | "soon" | "tipping"; label: string } | null {
  if (status !== "LIVE") return null;
  if (volume >= 30_000 || predictors >= 40) return { kind: "hot", label: "Hot" };
  if (/^\d+m left$/.test(timeLeft) || /^\d+s left$/.test(timeLeft)) return { kind: "soon", label: "Ending soon" };
  if (Math.abs(yesPct - 50) <= 3) return { kind: "tipping", label: "Tipping" };
  return null;
}

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

/** Line-art move arrow (no emoji) — matches the handoff. */
function MoveChip({ move }: { move: number }) {
  const dir = move > 0 ? "up" : move < 0 ? "down" : "flat";
  const cls = dir === "up" ? "mcard-move-up" : dir === "down" ? "mcard-move-down" : "mcard-move-flat";
  return (
    <span className={`mcard-move ${cls}`} title="24h move · Mwenendo wa saa 24">
      {dir === "flat" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === "up" ? "none" : "rotate(180deg)" }}>
          <path d="M12 5 L12 19 M6 11 L12 5 L18 11" />
        </svg>
      )}
      {move > 0 ? "+" : ""}{move}<span style={{ opacity: 0.7 }}>pt</span>
    </span>
  );
}

export function MarketCard({
  id, titleEn, titleSw, category, yesPct, volume, predictors, timeLeft, status, sourceUrl, move24h, className,
}: Props) {
  const signal = getSignalBadge(status, yesPct, volume, predictors, timeLeft);
  const live = status === "LIVE";
  return (
    <Link href={`/markets/${id}` as never} className={cn("mcard group", className)}>
      <div className="mcard-top">
        <span
          className={cn(
            "chip",
            status === "LIVE" && "chip-live",
            status === "RESOLVED" && "chip-resolved",
            (status === "CLOSED" || status === "DRAFT") && "chip-pending",
            status === "VOIDED" && "chip-objection",
          )}
        >
          {live && <span className="live-dot" style={{ width: 6, height: 6 }} />}
          {live ? "Live" : status === "RESOLVED" ? "Resolved" : status === "VOIDED" ? "Void" : "Pending"}
        </span>
        {signal && (
          <span
            aria-label={signal.label}
            className={cn("chip", signal.kind === "hot" && "chip-objection", signal.kind === "soon" && "chip-pending", signal.kind === "tipping" && "chip-signal")}
            style={{ fontWeight: 700 }}
          >
            {signal.kind === "hot" && <Flame size={10} aria-hidden />}
            {signal.kind === "soon" && <Clock size={10} aria-hidden />}
            {signal.kind === "tipping" && <Scale size={10} aria-hidden />}
            {signal.label}
          </span>
        )}
        <span className="chip mcard-cat">{category}</span>
        {sourceUrl && (
          <button
            type="button"
            aria-label="Open resolution source"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(sourceUrl, "_blank", "noopener,noreferrer"); }}
            className="text-text-subtle hover:text-text-muted transition-colors"
          >
            <ExternalLink size={15} aria-hidden />
          </button>
        )}
      </div>

      <div className="mcard-head">
        <div className="mcard-qwrap">
          <h3 className="mcard-q">{titleEn}</h3>
          {titleSw && <p className="mcard-q-sw">{titleSw}</p>}
        </div>
        <div className="mcard-prob">
          <div className="mcard-pct-label">YES · Ndio</div>
          <div className="mcard-pct">{yesPct}<span className="unit">%</span></div>
          {move24h !== undefined && live && <MoveChip move={move24h} />}
        </div>
      </div>

      <TippingBar yesPct={yesPct} height={7} resolved={status === "RESOLVED"} showLabels={false} recastOnHover={false} />

      {live && (
        <div className="mcard-actions">
          <button
            type="button"
            aria-label={`Back YES at ${yesPct}%`}
            onClick={(e) => { e.preventDefault(); window.location.href = `/markets/${id}?side=YES`; }}
            className="btn btn-yes btn-md"
          >
            YES <span className="font-mono" style={{ opacity: 0.85, fontSize: 13 }}>{yesPct}</span>
          </button>
          <button
            type="button"
            aria-label={`Back NO at ${100 - yesPct}%`}
            onClick={(e) => { e.preventDefault(); window.location.href = `/markets/${id}?side=NO`; }}
            className="btn btn-no btn-md"
          >
            NO <span className="font-mono" style={{ opacity: 0.85, fontSize: 13 }}>{100 - yesPct}</span>
          </button>
        </div>
      )}

      <div className="mcard-meta">
        <span>{fmtTzs(volume)} vol</span>
        <span className="dot-sep" />
        <span>{predictors.toLocaleString()} traders</span>
        <span style={{ marginLeft: "auto" }}>{timeLeft}</span>
      </div>
    </Link>
  );
}
