"use client";

import { useState } from "react";
import Link from "next/link";
import { TippingBar } from "@/components/brand";
import { IdentityAvatar } from "@/components/ui/identity-avatar";
import { I, categoryGlyph } from "@/components/ui/glyphs";
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
  /** A few trader seeds (user ids) for the live crest-stack (optional). */
  traders?: string[];
  className?: string;
};

function getSignalBadge(
  status: Props["status"], yesPct: number, volume: number, predictors: number, timeLeft: string,
): { kind: "hot" | "soon" | "tipping"; label: string } | null {
  if (status !== "LIVE") return null;
  if (volume >= 30_000 || predictors >= 40) return { kind: "hot", label: "Hot" };
  if (/^\d+m left$/.test(timeLeft) || /^\d+s left$/.test(timeLeft)) return { kind: "soon", label: "Soon" };
  if (Math.abs(yesPct - 50) <= 3) return { kind: "tipping", label: "Tipping" };
  return null;
}

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

/** Line-art 24h move chip. */
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

/** Small info icon that opens a brief "how betting works" popup. */
function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative" style={{ zIndex: 2 }}>
      <button
        type="button"
        aria-label="How it works"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center justify-center rounded-sm transition-colors hover:text-text-muted"
        style={{ width: 18, height: 18, color: "var(--text-faint)" }}
      >
        <I.info s={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 bottom-6 z-[91] w-[260px] rounded-lg p-3.5 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.5)]"
            style={{ background: "#fff", color: "#1a1a2e" }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
              className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-sm hover:bg-black/10 transition-colors"
              style={{ color: "#666" }}
            >
              <I.x s={12} />
            </button>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>How it works</p>
            <p style={{ fontSize: 11.5, lineHeight: 1.55, color: "#444" }}>
              Pick YES or NO. Your stake joins the pool. If your side wins, you share the losing pool minus a 9% operator margin.
            </p>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: "#888", marginTop: 6, fontStyle: "italic" }}>
              Payout depends on the final pool, not the odds shown now. Only stake what you can afford. 18+.
            </p>
          </div>
        </>
      )}
    </span>
  );
}

export function MarketCard({
  id, titleEn, titleSw, category, yesPct, volume, predictors, timeLeft, status, move24h, traders, className,
}: Props) {
  const signal = getSignalBadge(status, yesPct, volume, predictors, timeLeft);
  const live = status === "LIVE";
  const isResolved = status === "RESOLVED";
  const CatIco = I[categoryGlyph(category)];
  const go = (side: "YES" | "NO") => (e: React.MouseEvent) => { e.preventDefault(); window.location.href = `/markets/${id}?side=${side}`; };
  return (
    <Link href={`/markets/${id}` as never} className={cn("mcardp group", className)}>
      {/* Kit signature — large faint category glyph watermark (brightens on hover). */}
      <span className="mcardp-watermark" aria-hidden><CatIco /></span>

      <div className="mcardp-top">
        <span
          className={cn(
            "chip",
            status === "LIVE" && "chip-live",
            status === "RESOLVED" && "chip-resolved",
            (status === "CLOSED" || status === "DRAFT") && "chip-pending",
            status === "VOIDED" && "chip-objection",
          )}
        >
          {live && <span className="live-dot" />}
          {live ? "Live" : isResolved ? "Resolved" : status === "VOIDED" ? "Void" : "Pending"}
        </span>
        {signal && (
          <span
            aria-label={signal.label}
            className={cn("chip", signal.kind === "hot" && "chip-objection", signal.kind === "soon" && "chip-pending", signal.kind === "tipping" && "chip-signal")}
            style={{ fontWeight: 700 }}
          >
            {signal.label}
          </span>
        )}
        <span className="mcardp-catico" style={{ marginLeft: 2 }}><CatIco /></span>
        <span className="mcardp-cat">{category}</span>
        {move24h !== undefined && live && <span style={{ marginLeft: "auto" }}><MoveChip move={move24h} /></span>}
      </div>

      <div className="mcardp-head">
        <div className="mcardp-qwrap">
          <h3 className="mcardp-q">{titleEn}</h3>
        </div>
        <div className="mcardp-prob">
          <div className="mcardp-pctcap">YES</div>
          <div className="mcardp-pct">{yesPct}<span className="u">%</span></div>
        </div>
      </div>

      <TippingBar yesPct={yesPct} height={7} resolved={isResolved} showLabels={false} recastOnHover={false} />

      {live ? (
        <div className="mcardp-actions">
          <button type="button" aria-label={`Back YES at ${yesPct}%`} onClick={go("YES")} className="btn btn-yes btn-md">
            YES <span className="font-mono" style={{ opacity: 0.92, fontSize: 14 }}>{yesPct}</span>
          </button>
          <button type="button" aria-label={`Back NO at ${100 - yesPct}%`} onClick={go("NO")} className="btn btn-no btn-md">
            NO <span className="font-mono" style={{ opacity: 0.92, fontSize: 14 }}>{100 - yesPct}</span>
          </button>
        </div>
      ) : (
        <div className="btn btn-ghost btn-md" style={{ justifyContent: "center", pointerEvents: "none", opacity: 0.85 }}>
          <I.resolved s={15} /> {isResolved ? `Resolved ${yesPct >= 50 ? "YES" : "NO"}` : "Closed"}
        </div>
      )}

      <div className="mcardp-meta">
        <span>{predictors.toLocaleString()} traders</span>
        <span className="dot" />
        <span>{fmtTzs(volume)}</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }} className={live ? "live" : undefined}>
          {timeLeft}
          {live && <HowItWorks />}
        </span>
      </div>
    </Link>
  );
}
