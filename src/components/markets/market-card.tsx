"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { TippingBar } from "@/components/brand";
import { IdentityAvatar } from "@/components/ui/identity-avatar";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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
  /** True when the selection window has closed but the market is still LIVE
   *  (waiting for outcome). No new bets accepted. */
  selectionClosed?: boolean;
  className?: string;
};

function getSignalBadge(
  status: Props["status"], yesPct: number, volume: number, predictors: number, timeLeft: string,
  labels: { hot: string; soon: string; tipping: string },
): { kind: "hot" | "soon" | "tipping"; label: string } | null {
  if (status !== "LIVE") return null;
  if (volume >= 30_000 || predictors >= 40) return { kind: "hot", label: labels.hot };
  if (/^\d+m left$/.test(timeLeft) || /^\d+s left$/.test(timeLeft)) return { kind: "soon", label: labels.soon };
  if (Math.abs(yesPct - 50) <= 3) return { kind: "tipping", label: labels.tipping };
  return null;
}

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;

/** Line-art 24h move chip. */
function MoveChip({ move }: { move: number }) {
  const { t } = useT();
  const dir = move > 0 ? "up" : move < 0 ? "down" : "flat";
  const cls = dir === "up" ? "mcard-move-up" : dir === "down" ? "mcard-move-down" : "mcard-move-flat";
  return (
    <span className={`mcard-move ${cls}`} title={t.market.twentyFourHourMove}>
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

/** Small info icon that opens a brief "how betting works" popup.
 *  Portaled to body because the card has overflow:hidden (watermark bleed). */
function HowItWorks() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top - 8, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={t.common.howItWorks}
        onClick={toggle}
        className="inline-flex items-center justify-center rounded-md transition-all"
        style={{
          width: 28,
          height: 28,
          // 28px visible + padding gives a 44px touch target (WCAG 2.5.5)
          padding: 8,
          boxSizing: "content-box",
          color: open ? "var(--brand-300)" : "var(--text-subtle)",
          background: open ? "oklch(63% 0.18 262 / 0.18)" : "oklch(40% 0.08 264 / 0.25)",
          border: `1px solid ${open ? "var(--brand-500)" : "var(--border)"}`,
          position: "relative",
          zIndex: 2,
        }}
        onMouseEnter={(e) => { if (!open) { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--brand-400)"; e.currentTarget.style.background = "oklch(63% 0.18 262 / 0.12)"; } }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.color = "var(--text-subtle)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "oklch(40% 0.08 264 / 0.25)"; } }}
      >
        <I.info s={12} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[91] w-[260px] rounded-xl border border-border-strong p-3.5"
            style={{
              bottom: `calc(100vh - ${pos.top}px)`,
              right: pos.right,
              background: "var(--bg-elevated2)",
              boxShadow: "0 16px 40px -8px oklch(6% 0.08 264 / 0.7)",
              animation: "orm-rise 160ms ease-out",
            }}
          >
            <button
              type="button"
              aria-label={t.common.close}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
              className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-sm text-text-subtle hover:text-text transition-colors"
            >
              <I.x s={12} />
            </button>
            <p className="font-display text-[13px] font-bold text-text" style={{ marginBottom: 6 }}>{t.common.howItWorks}</p>
            <p className="text-[11.5px] leading-[1.55] text-text-muted">
              {t.common.howItWorksBody}
            </p>
            <p className="text-[10.5px] leading-[1.5] text-text-subtle italic" style={{ marginTop: 6 }}>
              {t.common.howItWorksFine}
            </p>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

export function MarketCard({
  id, titleEn, titleSw, category, yesPct, volume, predictors, timeLeft, status, move24h, traders, selectionClosed, className,
}: Props) {
  const router = useRouter();
  const { t } = useT();
  const signal = getSignalBadge(status, yesPct, volume, predictors, timeLeft, {
    hot: t.common.hot, soon: t.common.soon, tipping: t.market.tipping,
  });
  const live = status === "LIVE" && !selectionClosed;
  const isResolved = status === "RESOLVED";
  const CatIco = I[categoryGlyph(category)];
  const go = (side: "YES" | "NO") => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.dispatchEvent(new Event("50pick:navigating"));
    router.push(`/markets/${id}?side=${side}`);
  };
  // Clicking the card body anywhere (not the YES/NO buttons, the info popover,
  // or the Details link — all of which stopPropagation) opens the market WITHOUT
  // a side preselected, exactly like the "Details" link. The detail page then
  // shows the pick-a-side gate. YES/NO still enter with that side locked.
  const goDetails = () => {
    window.dispatchEvent(new Event("50pick:navigating"));
    router.push(`/markets/${id}`);
  };
  const body = (
    <>
      {/* Kit signature — large faint category glyph watermark (brightens on hover). */}
      <span className="mcardp-watermark" aria-hidden><CatIco /></span>

      <div className="mcardp-top">
        <span
          className={cn(
            "chip",
            status === "LIVE" && !selectionClosed && "chip-live",
            selectionClosed && "chip-pending",
            status === "RESOLVED" && "chip-resolved",
            (status === "CLOSED" || status === "DRAFT") && !selectionClosed && "chip-pending",
            status === "VOIDED" && "chip-objection",
          )}
        >
          {live && <span className="live-dot" />}
          {selectionClosed ? t.market.statusClosed : live ? t.market.statusLive : isResolved ? t.market.statusResolved : status === "VOIDED" ? t.market.statusVoid : t.market.statusPending}
        </span>
        {signal && (
          <span
            aria-label={signal.label}
            className={cn("chip", signal.kind === "hot" && "chip-hot-rose", signal.kind === "soon" && "chip-pending", signal.kind === "tipping" && "chip-signal")}
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
          <div className="mcardp-pctcap">{isResolved ? t.market.result : t.common.yes}</div>
          <div className="mcardp-pct">{isResolved ? (yesPct >= 50 ? t.common.yes : t.common.no) : <>{yesPct}<span className="u">%</span></>}</div>
        </div>
      </div>

      <TippingBar yesPct={yesPct} height={7} resolved={isResolved} showLabels={false} recastOnHover={false} />

      {live ? (
        <div className="mcardp-actions">
          <button type="button" aria-label={`Back YES at ${yesPct}%`} onClick={go("YES")} className="btn btn-yes btn-md">
            YES <span className="font-mono text-[11.5px] opacity-85">{yesPct}%</span>
          </button>
          <button type="button" aria-label={`Back NO at ${100 - yesPct}%`} onClick={go("NO")} className="btn btn-no btn-md">
            NO <span className="font-mono text-[11.5px] opacity-85">{100 - yesPct}%</span>
          </button>
        </div>
      ) : (
        <div className="btn btn-ghost btn-md justify-center pointer-events-none opacity-85">
          <I.resolved s={15} /> {isResolved ? `${t.market.statusResolved} ${yesPct >= 50 ? t.common.yes : t.common.no}` : t.market.statusClosed}
        </div>
      )}

      <div className="mcardp-meta">
        <span>{predictors.toLocaleString()} {t.market.predictorsCount}</span>
        <span className="dot" />
        <span>{fmtTzs(volume)}</span>
        <span className="mcardp-meta-right">
          <span className={live ? "live" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {timeLeft}
            {live && <HowItWorks />}
          </span>
        </span>
      </div>
      {live && (
        <a
          href={`/markets/${id}`}
          onClick={(e) => e.stopPropagation()}
          className="mcardp-details"
          style={{ color: "var(--accent-400)" }}
        >
          {t.market.details}
          <I.chevronRight s={11} />
        </a>
      )}
    </>
  );

  // LIVE: the whole card opens the market detail (no side preselected); the
  // YES/NO buttons enter with that side locked. Inner controls stopPropagation
  // so they never trigger the card's own navigation.
  // Non-live: keep the whole card a link so results/history stay viewable.
  return live ? (
    <article
      className={cn("mcardp group", className)}
      style={{ cursor: "pointer" }}
      aria-label={titleEn}
      role="link"
      tabIndex={0}
      onClick={goDetails}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          goDetails();
        }
      }}
    >
      {body}
    </article>
  ) : (
    <Link href={`/markets/${id}` as never} className={cn("mcardp group", className)}>
      {body}
    </Link>
  );
}
