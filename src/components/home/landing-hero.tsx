/**
 * The landing hero — round-2 kit README §1a, replacing the full-bleed photograph.
 *
 * WHAT THIS REPLACED AND WHY. `page.tsx:72-212` was a 75vh F1 champagne-spray photo under a
 * hand-typed oklch gradient stack. Two problems, both real: the image leaned "casino win"
 * against RULES law 7 (the code's own comment admitted it and called itself INTERIM), and it
 * stated **nothing** — a first-time visitor could not learn one thing about what Tanzania is
 * predicting today. It also painted the word "wisdom" in a gilt gradient, and gold on this
 * platform means money that was EARNED (Q5), never a decorative headline word.
 *
 * ⛔ THE ONE RULE TO NOT BREAK IN HERE. Two figures on this surface can be a guess, and neither
 * is allowed to be rendered as one:
 *   - the aggregate conviction share, when nothing at all is staked, and
 *   - a single question's YES price, when that market's own pool is empty.
 * `impliedYesPct` returns a hardcoded **50** in both cases (`market-service.ts:232-236`). That is
 * the right answer for a payout projection and a fabricated number on a display surface, so this
 * component consumes `pricedYesPct` — which returns **null** — and renders an em-dash plus a
 * labelled state instead. Licence condition 1, and the fourth consumer of the cold-start rule
 * (DESIGN_AUTHORITY §B6 / law 81). ⛔ There is deliberately no `?? 50` anywhere below; the two
 * states are separate branches so neither can be reached by accident.
 *
 * Every value comes from a token via a class in `globals.css` — see the `.kp-hero*` block there.
 */
import Link from "next/link";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { TippingBar } from "@/components/brand";
import { fill, formatNumber, formatTzs, formatTzsCompact } from "@/lib/utils";
import { pickLocalized } from "@/lib/localized";
import { timeLeftLabel } from "@/lib/markets/time-left";
import type { Dict, Locale } from "@/lib/i18n-dict";
import type { HeroFigures, HeroRow } from "@/lib/markets/hero";

export type HeroCardData = {
  charts: Map<string, { spark?: number[]; move24h?: number }>;
  traders: Map<string, string[]>;
};

type Props = {
  figures: HeroFigures;
  t: Dict;
  locale: Locale;
  isAuthed: boolean;
  nowMs: number;
  cards: HeroCardData;
};

/**
 * The headline is one dict string in all three locales, and YES/NO inside it wear the outcome
 * accents. Tokenising the shipped sentence keeps the words in ONE home while still colouring
 * them — the alternative was three fragment keys, which a translator cannot read.
 * `\b` anchors so a future word containing "no" is not repainted.
 */
function Headline({ text }: { text: string }) {
  return (
    <h1 className="kp-hero__headline">
      {text.split(/\b(YES|NO)\b/g).map((part, i) =>
        part === "YES" ? (
          <span key={i} style={{ color: "var(--hero-yes-accent)" }}>{part}</span>
        ) : part === "NO" ? (
          <span key={i} style={{ color: "var(--hero-no-accent)" }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </h1>
  );
}

function QuestionRow({ row, t, locale }: { row: HeroRow; t: Dict; locale: Locale }) {
  const Glyph = I[categoryGlyph(row.category)];
  return (
    <Link href={`/markets/${row.id}` as never} className="kp-qrow">
      <span className="kp-qrow__glyph" aria-hidden>
        <Glyph s={20} />
      </span>
      <span className="kp-qrow__q">{pickLocalized(locale, row.titleEn, row.titleSw, row.titleZh)}</span>
      {/* The pool is REAL even when it is zero, so it is always stated. Only the PRICE is
          withheld — that is the distinction `market-card.tsx` draws between `fresh` and
          `noPrice`, and the two surfaces have to draw it the same way. */}
      <span className="kp-qrow__sub">{formatTzs(row.pool)}</span>
      <span className="kp-qrow__price">
        {row.yesPct == null ? (
          <>
            {/* Em-dash PLUS a labelled state — licence condition 1's exact prescription for an
                unknown. The dash alone would read to a screen reader as nothing at all. */}
            <span className="kp-qrow__num" aria-hidden>—</span>
            <span className="kp-qrow__unit kp-qrow__unit--label">{t.home.heroNoPrice}</span>
          </>
        ) : (
          <>
            <span className="kp-qrow__num">{row.yesPct}</span>
            <span className="kp-qrow__unit">% {t.common.yes}</span>
          </>
        )}
      </span>
      {/* No lean rule on an unpriced market: a 50%-wide bar would be the same fabricated claim
          drawn instead of written. */}
      {row.yesPct != null && (
        <span className="kp-qrow__lean" style={{ width: `${row.yesPct}%` }} aria-hidden />
      )}
    </Link>
  );
}

export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards }: Props) {
  const { featured } = figures;
  const chart = featured ? cards.charts.get(featured.id) : undefined;

  return (
    <section className="kp-hero" data-band="hero">
      {/* Geometry and opacity only — never recoloured (B1a). The shipped file is used as-is
          because the mark's unequal halves ARE the tipping idea. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark-color.svg" alt="" aria-hidden="true" className="kp-hero__mark" />

      <div className="kp-hero__inner">
        <div>
          <p className="kp-hero__eyebrow">
            <span className="kp-hero__tick" aria-hidden />
            {t.home.heroLocation} · {t.home.heroEst}
          </p>
          <Headline text={t.home.heroHeadline} />
        </div>

        {/* ── the proof rail: three measured facts about the live book ─────────────── */}
        <div className="kp-proof">
          <div className="kp-proof__fig">
            <span className="kp-proof__num" style={{ color: "var(--yes-400)" }}>
              <span className="kp-proof__pip" aria-hidden />
              {formatNumber(figures.openCount)}
            </span>
            <span className="kp-proof__cap">{t.home.heroProofOpen}</span>
          </div>
          {/* Gilt is correct on a pool: it is real money on the platform right now, and
              ACCEPTANCE.md §6 keeps gold on pool figures explicitly. Compact form so the
              figure fits at 360 in all three locales without a second DOM copy. */}
          <div className="kp-proof__fig">
            <span className="kp-proof__num" style={{ color: "var(--gilt)" }}>
              {formatTzsCompact(figures.poolTzs)}
            </span>
            <span className="kp-proof__cap">{t.home.heroProofPool}</span>
          </div>
          <div className="kp-proof__fig">
            <span className="kp-proof__num" style={{ color: "var(--text)" }}>
              {formatNumber(figures.openPredictions)}
            </span>
            <span className="kp-proof__cap">{t.home.heroProofPredictions}</span>
          </div>
        </div>

        {/* ── aggregate conviction ─────────────────────────────────────────────────────
            NOT a new component: `TippingBar`'s own `empty` prop is documented as "a STATE OF
            THIS BAR, not a second component — DESIGN_AUTHORITY B9", and its dashed
            `--bar-empty-track` rail is the platform's one cold-start bar vocabulary. */}
        <div className="kp-conv">
          <p className="kp-hero__eyebrow">{t.home.heroConvEyebrow}</p>
          {figures.yesShare == null ? (
            <TippingBar empty emptyLabel={t.home.heroConvEmpty} height={10} />
          ) : (
            <TippingBar yesPct={figures.yesShare} height={10} showLabels={false} recastOnHover={false} probabilityLabel={t.market.probBarAria} />
          )}
          <p className="kp-conv__read">
            {figures.yesShare == null
              ? t.home.heroConvEmpty
              : fill(t.home.heroConvRead, {
                  yesPct: figures.yesShare,
                  noPct: 100 - figures.yesShare,
                  yesWord: t.common.yes,
                  noWord: t.common.no,
                })}
          </p>
        </div>

        {/* ── the question board ───────────────────────────────────────────────────── */}
        {figures.board.length > 0 && (
          <div>
            <p className="kp-hero__eyebrow">
              {t.home.heroBoardEyebrow}
              {figures.closingToday > 0 && (
                <> · {fill(t.home.heroBoardCloseToday, { n: figures.closingToday })}</>
              )}
            </p>
            <div className="kp-qboard">
              {figures.board.map((row) => (
                <QuestionRow key={row.id} row={row} t={t} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* ── the foot: the lede, two CTAs, and one real card ──────────────────────── */}
        <div className="kp-hero__foot">
          <div>
            <p className="kp-hero__lede">{t.home.heroBody}</p>
            {/* TWO CTAs, not three — `Sign in` lives in the header at every width. */}
            <div className="kp-hero__ctas">
              {isAuthed ? (
                <>
                  <Link href={"/markets" as never} className="btn btn-primary btn-xl rounded-pill kp-hero__cta">
                    {t.home.heroCta}
                    <I.arrowRight s={16} />
                  </Link>
                  <Link href={"/positions" as never} className="btn btn-ghost btn-xl rounded-pill kp-hero__cta">
                    {t.home.myPositions}
                  </Link>
                </>
              ) : (
                <>
                  <Link href={"/auth/register" as never} className="btn btn-primary btn-xl rounded-pill kp-hero__cta">
                    {t.common.createAccount}
                    <I.arrowRight s={16} />
                  </Link>
                  <Link href={"/markets" as never} className="btn btn-ghost btn-xl rounded-pill kp-hero__cta">
                    {fill(t.home.heroBrowseAll, { n: figures.openCount })}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* The SAME market that leads the question board — the kit is explicit that a pinned
              favourite here would stop the hero being an instrument. */}
          {featured && (
            <MarketCard
              productLine={"MARKET"}
              featured
              id={featured.id}
              titleEn={featured.titleEn}
              titleSw={featured.titleSw}
              titleZh={featured.titleZh}
              category={featured.category}
              // The card owns its own cold-start gate: `noPrice = volume === 0` drives the
              // em-dash, the empty bar and the priceless YES/NO buttons (market-card.tsx:238,
              // :328, :348, :376). Since `volume` below IS this row's pool, the fallback here is
              // unreachable — and it is 0 rather than 50 deliberately: if a future edit ever did
              // render it, 0% is visibly absurd and gets caught, whereas 50% looks like a price
              // and would ship. Fail loud, not plausible.
              yesPct={featured.yesPct ?? 0}
              volume={featured.pool}
              predictors={featured.predictors}
              timeLeft={
                featured.selectionClosed
                  ? t.home.waitingForResults
                  : timeLeftLabel(featured.bettableUntilMs, nowMs, {
                      closed: t.market.closed,
                      days: t.market.timeLeftD,
                      hours: t.market.timeLeftH,
                      minutes: t.market.timeLeftM,
                    }, fill)
              }
              status="LIVE"
              selectionClosed={featured.selectionClosed}
              sourceUrl={featured.sourceUrl}
              spark={chart?.spark}
              move24h={chart?.move24h}
              traders={cards.traders.get(featured.id)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
