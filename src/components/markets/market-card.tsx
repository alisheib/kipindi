"use client";

import { useRef, useState } from "react";
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
  /**
   * COLD-START override. A LIVE market with no activity yet (volume 0,
   * predictors 0) has NO real crowd price — its 50% is an artefact of the
   * default, not a signal. When fresh, the card must NOT assert a 50% split,
   * a centred needle, or a "TIPPING" badge: all three read as "contested" on a
   * market nobody has touched, and a board full of them looks dead. Instead it
   * shows a NEW badge, an em-dash, a neutral awaiting-first-bet bar, and an
   * invitation — honest per RULES law 5 (real data or nothing).
   *
   * Optional: when omitted the card DERIVES it from volume/predictors, so the
   * fix is correct at every call site, including the ones that don't know to
   * pass it.
   */
  isNew?: boolean;
  /**
   * Lead card of a board. Spans two columns from `md` up and takes a slightly
   * stronger edge + the royal wash, so a board has somewhere for the eye to
   * land and a SHORT board still reads composed rather than as leftovers.
   *
   * A state of this card, never a second component (B9) — and deliberately
   * restrained: no type-size change, no new glow. A "featured" card that
   * restyled itself would be a second design to keep in sync forever.
   */
  featured?: boolean;
  className?: string;
};

function getSignalBadge(
  status: Props["status"], yesPct: number, volume: number, predictors: number, timeLeft: string, fresh: boolean,
  labels: { hot: string; soon: string; tipping: string; new: string },
): { kind: "hot" | "soon" | "tipping" | "new"; label: string } | null {
  if (status !== "LIVE") return null;
  // A brand-new market is NEW, never "tipping" — it isn't balanced, it's empty.
  if (fresh) return { kind: "new", label: labels.new };
  if (volume >= 30_000 || predictors >= 40) return { kind: "hot", label: labels.hot };
  if (/^\d+m left$/.test(timeLeft) || /^\d+s left$/.test(timeLeft)) return { kind: "soon", label: labels.soon };
  // "Tipping" REQUIRES A REAL POOL — an empty 50/50 is not a contest.
  // ⛔ The test used to be `volume > 0 || predictors > 0`, and the OR is the defect:
  // "tipping" is a claim about money sitting on both sides, and `predictors` is not
  // money. At volume 0 with predictors 1 — the ordinary state of a market whose only
  // bettor cashed out, since predictorCount is never decremented — the left side
  // passed on the count while `yesPct` was the hardcoded 50 that `impliedYesPct`
  // returns for an empty pool. The card then badged a fabricated dead-heat as the
  // most contested market on the board.
  if (volume > 0 && Math.abs(yesPct - 50) <= 3) return { kind: "tipping", label: labels.tipping };
  return null;
}

/** Demoted 24h move — mono micro-text, right-aligned above the bar (Part B-2:
 *  it no longer competes as a chip in the header). Green up / rose down. */
function MoveText({ move, label }: { move: number; label: string }) {
  const dir = move > 0 ? "up" : move < 0 ? "down" : "flat";
  const color = dir === "up" ? "var(--yes-400)" : dir === "down" ? "var(--no-400)" : "var(--text-subtle)";
  /* M5 directional primitive — nudge on a data CHANGE only, never on mount
     (the keyframe's own rule). Static until the refreshed board flips `dir`. */
  const prevDirRef = useRef(dir);
  const dirChangedRef = useRef(false);
  if (dir !== prevDirRef.current) { dirChangedRef.current = true; prevDirRef.current = dir; }
  const nudge = dirChangedRef.current;
  return (
    <span className="mcardp-move" title={label} style={{ color }}>
      {dir === "up" ? <I.trendingUp s={10} className={nudge ? "g-nudge-up" : undefined} /> : dir === "down" ? <I.trendingDown s={10} className={nudge ? "g-nudge-down" : undefined} /> : <I.arrowRight s={10} />}
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
  id, titleEn, titleSw, titleZh, category, yesPct, volume, predictors, timeLeft, status, resolvedOutcome, spark, move24h, traders, selectionClosed, comments, isNew, featured, className,
}: Props) {
  const router = useRouter();
  const { t, locale } = useT();
  const title = pickLocalized(locale, titleEn, titleSw, titleZh);
  const live = status === "LIVE" && !selectionClosed;
  const isResolved = status === "RESOLVED";
  // COLD-START: a LIVE, still-open market with genuinely no activity. Derived
  // when the caller doesn't pass it, so the fix holds everywhere the card is
  // used. We show emptiness; we never invent a price (RULES law 5).
  // 🔴 TWO DIFFERENT QUESTIONS, AND THEY WERE ANSWERED BY ONE FLAG.
  //
  // `fresh` means "nobody has touched this yet" — it drives the NEW badge, hides the
  // sparkline and hides the trader crest. That correctly needs volume AND predictors
  // to be zero.
  //
  // `noPrice` means "there is no crowd price to state". That is a question about the
  // POOL ALONE, because `impliedYesPct` returns a hardcoded 50 when the pool is empty
  // (market-service.ts:223) — an artefact of the default, not a signal.
  //
  // ANDing the two let a market with an empty pool but a non-zero predictor count
  // assert a 50% split, a centred needle and a TIPPING badge as if they were real.
  // ⛔ That state is reachable and ordinary: `predictorCount` is never DECREMENTED on
  // cash-out (market-service.ts:1923 debits the pool and closes the position, and
  // nothing touches the count), so a market whose only bettor cashes out sits at
  // volume 0 with predictors 1 — and stated a fabricated 50% to every player on the
  // board. It is also the shape the pre-launch data purge leaves behind.
  //
  // RULES law 5 is real data or nothing, so the price gate is now the pool.
  const fresh = live && (isNew ?? (volume === 0 && predictors === 0));
  const noPrice = live && (isNew ?? volume === 0);
  const signal = getSignalBadge(status, yesPct, volume, predictors, timeLeft, fresh, {
    hot: t.common.hot, soon: t.common.soon, tipping: t.market.tipping, new: t.common.newBadge,
  });
  /** The settled side, or null when we genuinely don't know. Never inferred from
   *  yesPct — see the `resolvedOutcome` prop doc. When null we show "RESOLVED"
   *  with no side rather than risk stating the wrong one on a money surface. */
  const outcomeLabel =
    resolvedOutcome === "YES" ? t.common.yes
    : resolvedOutcome === "NO" ? t.common.no
    : resolvedOutcome === "VOID" ? t.market.statusVoid
    : null;
  // Real YES% history only, ≥4 points (else hide — A-5 no-fabrication rule).
  // A fresh market has no history, so never draw the spark on one.
  const showSpark = !fresh && Array.isArray(spark) && spark.length >= 4;
  // Trader crest — avatars when we have seeds; the predictor-count row renders
  // on EVERY card (with or without avatars) so cards stay the same shape in a
  // grid. The count moves out of the meta row and into this row.
  const hasTraders = !fresh && Array.isArray(traders) && traders.length > 0;
  const CatIco = I[categoryGlyph(category)];
  // Localised category label — a Swahili player must not read "SPORTS" over a
  // "MICHEZO" filter chip (POLISH-BACKLOG §1.1, the most-seen untranslated token
  // in the product). Built inline from the dictionary rather than via
  // categoryLabel(), which has no "other" arm and renders blank for it.
  const CAT_LABEL: Record<string, string> = {
    SPORTS: t.market.catSports, MACRO: t.market.catMacro, WEATHER: t.market.catWeather,
    CRYPTO: t.market.catCrypto, CULTURE: t.market.catCulture, TECH: t.market.catTech, OTHER: t.market.catOther,
  };
  const catLabel = CAT_LABEL[(category ?? "").toUpperCase()] ?? t.market.catOther;
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
            className={cn(
              "chip chip-strong",
              signal.kind === "hot" && "chip-hot-rose",
              signal.kind === "soon" && "chip-pending",
              signal.kind === "tipping" && "chip-signal",
              signal.kind === "new" && "chip-new",
            )}
          >
            {signal.label}
          </span>
        )}
        <span className="mcardp-catico"><CatIco /></span>
        <span className="mcardp-cat">{catLabel}</span>
      </div>

      <div className="mcardp-head">
        <div className="mcardp-qwrap">
          <h3 className="mcardp-q">{title}</h3>
        </div>
        <div className="mcardp-prob">
          {noPrice ? (
            // No crowd price — an honest em-dash, never a fabricated 50%.
            // No "YES" caption either: there is no figure for it to label.
            // ⚠️ Gated on `noPrice` (empty POOL), not `fresh`: a market whose only
            // bettor cashed out has volume 0 with predictors 1, and its 50% is the
            // default, not a price.
            <div className="mcardp-pct mcardp-pct--empty" aria-label={t.market.noBetsYet}>—</div>
          ) : (
            <>
              <div className="mcardp-pctcap">{isResolved ? t.market.result : t.common.yes}</div>
              <div className="mcardp-pct">{isResolved ? (outcomeLabel ?? "—") : <>{yesPct}<span className="u">%</span></>}</div>
            </>
          )}
        </div>
      </div>

      {/* Move-line slot — always present on live cards (reserved height) so the
          bar sits at the same offset whether or not a 24h move exists. */}
      {live && (
        <div className="mcardp-moveline">
          {!fresh && move24h !== undefined && <MoveText move={move24h} label={t.market.twentyFourHourMove} />}
        </div>
      )}

      {/* `noPrice`, not `fresh` — a centred bar on an empty pool reads as "contested",
          which is a claim about a crowd that is not there. */}
      <TippingBar yesPct={yesPct} height={7} resolved={isResolved} showLabels={false} recastOnHover={false} empty={noPrice} emptyLabel={t.market.noBetsYet} />
      {noPrice && <div className="mcardp-nobets">{t.market.noBetsYet}</div>}

      {showSpark && <Spark data={spark!} />}

      {/* Trader row — rendered on every card (min-height fixed) so the grid stays
          even. A fresh market invites the first prediction instead of showing 0,
          which reads as failure rather than opportunity. */}
      <div className="mcardp-traders">
        {fresh ? (
          <span className="t-txt mcardp-befirst">{t.market.beFirst}</span>
        ) : (
          <>
            {hasTraders && (
              <span className="av-stack">
                {traders!.slice(0, 3).map((uid) => (
                  <Avatar key={uid} size="xs" seed={uid} initials={initialsFor(uid)} />
                ))}
              </span>
            )}
            <span className="t-txt"><b>{predictors.toLocaleString()}</b> {t.market.predictorsCount}</span>
          </>
        )}
      </div>

      {live ? (
        <div className="mcardp-actions">
          <button type="button" aria-label={noPrice ? t.common.yes : t.market.backYesAria.replace("{pct}", String(yesPct))} onClick={go("YES")} className="btn btn-yes btn-md">
            {t.common.yes}{!noPrice && <span className="font-mono text-[11.5px] opacity-85"> @ {yesPct}%</span>}
          </button>
          <button type="button" aria-label={noPrice ? t.common.no : t.market.backNoAria.replace("{pct}", String(100 - yesPct))} onClick={go("NO")} className="btn btn-no btn-md">
            {t.common.no}{!noPrice && <span className="font-mono text-[11.5px] opacity-85"> @ {100 - yesPct}%</span>}
          </button>
        </div>
      ) : (
        // Single-column actions wrapper so the resolved status pill occupies the
        // exact same vertical rhythm as the live YES/NO row (card-height parity).
        <div className="mcardp-actions mcardp-actions--single">
          <div className="btn btn-ghost btn-md justify-center pointer-events-none opacity-85">
            <I.resolved s={15} /> {isResolved ? [t.market.statusResolved, outcomeLabel].filter(Boolean).join(" ") : t.market.statusClosed}
          </div>
        </div>
      )}

      <div className="mcardp-meta">
        <span>{fresh ? t.market.noPoolYet : formatTzs(volume)}</span>
        {comments != null && comments > 0 && (
          <>
            <span className="dot" />
            <span className="inline-flex items-center gap-1"><I.comment s={10} />{comments}</span>
          </>
        )}
        <span className="mcardp-meta-right">
          <span className={cn("mcardp-timeleft", live && "live")}>
            {timeLeft}
            {live && <HowItWorks />}
          </span>
        </span>
      </div>
      {/* Footer row on every card (card-height parity live vs resolved). Live is a
          real link (card body uses onClick nav); the resolved card is already a
          full <Link>, so its footer is a decorative span to avoid a nested anchor. */}
      {live ? (
        <Link
          href={`/markets/${id}` as never}
          onClick={(e) => e.stopPropagation()}
          className="mcardp-details"
        >
          {t.market.details}
          <I.chevronRight s={11} />
        </Link>
      ) : (
        <span className="mcardp-details" aria-hidden>
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
      className={cn("mcardp group", featured && "mcardp--featured", className)}
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
    <Link href={`/markets/${id}` as never} className={cn("mcardp group", featured && "mcardp--featured", className)}>
      {body}
    </Link>
  );
}
