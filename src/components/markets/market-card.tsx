"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TippingBar } from "@/components/brand";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { pickLocalized } from "@/lib/localized";

type Props = {
  id: string;
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  category: string;
  yesPct: number;
  volume: number;
  predictors: number;
  timeLeft: string;
  status: "LIVE" | "RESOLVED" | "CLOSED" | "VOIDED" | "DRAFT";
  /** The SETTLED outcome, straight from `PredictionMarket.resolvedOutcome`.
   *
   *  Required for correctness on a resolved card. This card used to derive the
   *  outcome from `yesPct >= 50` — i.e. from the crowd's money split — which is a
   *  completely independent quantity. Every upset (crowd 70% YES, settles NO)
   *  rendered the OPPOSITE of the truth, so the board and the detail page
   *  contradicted each other on real money. Never infer this. */
  resolvedOutcome?: "YES" | "NO" | "VOID" | null;
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
  /** Visible comment count (optional — shown in the meta row when > 0). */
  comments?: number;
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

/** Demoted 24h move — mono micro-text, right-aligned above the bar (Part B-2:
 *  it no longer competes as a chip in the header). Green up / rose down. */
function MoveText({ move, label }: { move: number; label: string }) {
  const dir = move > 0 ? "up" : move < 0 ? "down" : "flat";
  const color = dir === "up" ? "var(--yes-400)" : dir === "down" ? "var(--no-400)" : "var(--text-subtle)";
  return (
    <span className="mcardp-move" title={label} style={{ color }}>
      {dir === "up" ? <I.trendingUp s={10} /> : dir === "down" ? <I.trendingDown s={10} /> : <I.arrowRight s={10} />}
      {move > 0 ? "+" : ""}{move}<span className="u">pt</span>
    </span>
  );
}

/** Catmull-Rom → cubic-bezier smoothing — a clean sparkline with no kinks. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  const f = (v: number) => v.toFixed(1);
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/** 24h YES% history as a full-width sparkline under the bar. Aqua = live
 *  heartbeat (never gold). The caller hides it when the series has <4 real
 *  points — this only ever renders the true YES% history, never a synthetic
 *  walk (honesty rule A-5). Draws in on mount via mcardp-spark-line. */
function Spark({ data }: { data: number[] }) {
  const W = 300, H = 28, pad = 4;
  const n = data.length;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => ({
    x: n === 1 ? W / 2 : +((i / (n - 1)) * W).toFixed(1),
    y: +(H - pad - ((v - min) / span) * (H - 2 * pad)).toFixed(1),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[n - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  return (
    <svg className="mcardp-spark" width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill="var(--aqua-400)" fillOpacity={0.06} stroke="none" />
      <path className="mcardp-spark-line" d={line} pathLength={1} fill="none" stroke="var(--aqua-400)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Deterministic 2-char face for an anonymous trader crest (no name is leaked —
 *  the crest visual is seeded from the id, the label is just a couple of chars). */
function initialsFor(seed: string): string {
  const s = seed.replace(/[^a-zA-Z0-9]/g, "");
  return (s.slice(-2) || "50").toUpperCase();
}

/** Small info icon that opens a brief "how betting works" popup.
 *
 *  DESIGN_AUTHORITY B10 (2026-07-29): this used to be a hand-rolled
 *  `createPortal` + its own scrim + its own `0 16px 40px -8px oklch(…)`
 *  drop-shadow + its own rise animation, hand-positioned off a
 *  getBoundingClientRect. It was the last bespoke popup in a player surface —
 *  and being bespoke, it had NO focus trap, NO focus return, and none of the
 *  Android scroll/zoom lock the shared primitive gives every other dialog.
 *
 *  It now goes through <Modal>, so it inherits all of that plus the one
 *  shadow/radius/motion vocabulary. The visible change: it presents as the
 *  product's standard centred dialog instead of a card-anchored bubble. The
 *  copy is unchanged. */
function HowItWorks() {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t.common.howItWorks}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="mcardp-info"
        data-open={open || undefined}
      >
        <I.info s={12} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel={t.common.howItWorks}
        maxWidth={320}
      >
        <p className="mb-1.5 font-display text-[13px] font-bold text-text">{t.common.howItWorks}</p>
        <p className="text-[11.5px] leading-[1.55] text-text-muted">
          {t.common.howItWorksBody}
        </p>
        <p className="mt-1.5 text-[10.5px] leading-[1.5] text-text-subtle italic">
          {t.common.howItWorksFine}
        </p>
      </Modal>
    </>
  );
}

export function MarketCard({
  id, titleEn, titleSw, titleZh, category, yesPct, volume, predictors, timeLeft, status, resolvedOutcome, spark, move24h, traders, selectionClosed, comments, className,
}: Props) {
  const router = useRouter();
  const { t, locale } = useT();
  const title = pickLocalized(locale, titleEn, titleSw, titleZh);
  const signal = getSignalBadge(status, yesPct, volume, predictors, timeLeft, {
    hot: t.common.hot, soon: t.common.soon, tipping: t.market.tipping,
  });
  const live = status === "LIVE" && !selectionClosed;
  const isResolved = status === "RESOLVED";
  /** The settled side, or null when we genuinely don't know. Never inferred from
   *  yesPct — see the `resolvedOutcome` prop doc. When null we show "RESOLVED"
   *  with no side rather than risk stating the wrong one on a money surface. */
  const outcomeLabel =
    resolvedOutcome === "YES" ? t.common.yes
    : resolvedOutcome === "NO" ? t.common.no
    : resolvedOutcome === "VOID" ? t.market.statusVoid
    : null;
  // Real YES% history only, ≥4 points (else hide — A-5 no-fabrication rule).
  const showSpark = Array.isArray(spark) && spark.length >= 4;
  // Trader crest — avatars when we have seeds; the predictor-count row renders
  // on EVERY card (with or without avatars) so cards stay the same shape in a
  // grid. The count moves out of the meta row and into this row.
  const hasTraders = Array.isArray(traders) && traders.length > 0;
  const CatIco = I[categoryGlyph(category)];
  const go = (side: "YES" | "NO") => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    // Micro-interaction: brief press-pop on the button before navigating
    const btn = e.currentTarget as HTMLElement;
    btn.classList.add("press-pop");
    window.dispatchEvent(new Event("50pick:navigating"));
    // Small delay lets the press animation land visually before the route change
    setTimeout(() => router.push(`/markets/${id}?side=${side}`), 80);
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
            status === "VOIDED" && "chip-pending",
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
      </div>

      <div className="mcardp-head">
        <div className="mcardp-qwrap">
          <h3 className="mcardp-q">{title}</h3>
        </div>
        <div className="mcardp-prob">
          <div className="mcardp-pctcap">{isResolved ? t.market.result : t.common.yes}</div>
          <div className="mcardp-pct">{isResolved ? (outcomeLabel ?? "—") : <>{yesPct}<span className="u">%</span></>}</div>
        </div>
      </div>

      {/* Move-line slot — always present on live cards (reserved height) so the
          bar sits at the same offset whether or not a 24h move exists. */}
      {live && (
        <div className="mcardp-moveline">
          {move24h !== undefined && <MoveText move={move24h} label={t.market.twentyFourHourMove} />}
        </div>
      )}

      <TippingBar yesPct={yesPct} height={7} resolved={isResolved} showLabels={false} recastOnHover={false} />

      {showSpark && <Spark data={spark!} />}

      {/* Trader row — rendered on every card (min-height fixed) so the grid stays
          even. Avatars only when we have seeds; the count is always shown here. */}
      <div className="mcardp-traders">
        {hasTraders && (
          <span className="av-stack">
            {traders!.slice(0, 3).map((uid) => (
              <Avatar key={uid} size="xs" seed={uid} initials={initialsFor(uid)} />
            ))}
          </span>
        )}
        <span className="t-txt"><b>{predictors.toLocaleString()}</b> {t.market.predictorsCount}</span>
      </div>

      {live ? (
        <div className="mcardp-actions">
          <button type="button" aria-label={t.market.backYesAria.replace("{pct}", String(yesPct))} onClick={go("YES")} className="btn btn-yes btn-md">
            {t.common.yes} <span className="font-mono text-[11.5px] opacity-85">@ {yesPct}%</span>
          </button>
          <button type="button" aria-label={t.market.backNoAria.replace("{pct}", String(100 - yesPct))} onClick={go("NO")} className="btn btn-no btn-md">
            {t.common.no} <span className="font-mono text-[11.5px] opacity-85">@ {100 - yesPct}%</span>
          </button>
        </div>
      ) : (
        // Single-column actions wrapper so the resolved status pill occupies the
        // exact same vertical rhythm as the live YES/NO row (card-height parity).
        <div className="mcardp-actions" style={{ gridTemplateColumns: "1fr" }}>
          <div className="btn btn-ghost btn-md justify-center pointer-events-none opacity-85">
            <I.resolved s={15} /> {isResolved ? [t.market.statusResolved, outcomeLabel].filter(Boolean).join(" ") : t.market.statusClosed}
          </div>
        </div>
      )}

      <div className="mcardp-meta">
        <span>{formatTzs(volume)}</span>
        {comments != null && comments > 0 && (
          <>
            <span className="dot" />
            <span className="inline-flex items-center gap-1"><I.comment s={10} />{comments}</span>
          </>
        )}
        <span className="mcardp-meta-right">
          <span className={live ? "live" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {timeLeft}
            {live && <HowItWorks />}
          </span>
        </span>
      </div>
      {/* Footer row on every card (card-height parity live vs resolved). Live is a
          real link (card body uses onClick nav); the resolved card is already a
          full <Link>, so its footer is a decorative span to avoid a nested anchor. */}
      {live ? (
        <a
          href={`/markets/${id}`}
          onClick={(e) => e.stopPropagation()}
          className="mcardp-details"
          style={{ color: "var(--accent-400)" }}
        >
          {t.market.details}
          <I.chevronRight s={11} />
        </a>
      ) : (
        <span className="mcardp-details" style={{ color: "var(--accent-400)" }} aria-hidden>
          {t.market.details}
          <I.chevronRight s={11} />
        </span>
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
      aria-label={title}
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
