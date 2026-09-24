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
import { sideWord } from "@/lib/side-label";

export type HeroCardData = {
  charts: Map<string, { spark?: number[]; move24h?: number }>;
  traders: Map<string, string[]>;
};

type Props = {
  figures: HeroFigures;
  t: Dict;
  locale: Locale;
  isAuthed: boolean;
  /**
   * Σ CONFIRMED payouts + cashouts, TZS — the hero’s third proof figure.
   * **null means the read failed**, and the slot is withheld rather than printed as a zero.
   */
  paidOutTzs: number | null;
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
      {/* ⛔ A MEASURE CEILING, NOT A WIDTH. The row is a grid whose middle track is 1fr, so the
          question grew with the viewport and nothing stopped it: 77 characters per line at 1024
          and 116 at 1280, against a comfortable 45–75 (measured on production 2026-09-24). At 360
          the column is 292px ≈ 44 characters, so this cap cannot touch a phone — it only stops the
          line running away on a desktop. The figures stay right-aligned where the design puts
          them; this is about the length of a line of prose, not about where the money sits.
          🔴 44ch, NOT 68ch, AND THE NUMBER IS CALIBRATED RATHER THAN CHOSEN. `ch` is the advance of
          the digit ZERO, which in Sora at 17px is 12.97px — while the average character advance in
          running text is about 8.9px. A 68ch cap therefore resolved to 882px and still produced 99
          characters per line; measured on production after it shipped, which is the only reason it
          was caught. 44ch ≈ 571px ≈ 64 characters in this face. ⚠️ If the hero question ever changes
          typeface this number is wrong again — V7 in the landing gate is what re-catches it.
          In zh the same cap yields roughly 33 glyphs, comfortably inside the same ceiling. */}
      <span className="kp-qrow__q" style={{ maxWidth: "44ch" }}>{pickLocalized(locale, row.titleEn, row.titleSw, row.titleZh)}</span>
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

export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards, paidOutTzs }: Props) {
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
          {/* 🔴 `text-balance` ON EVERY EYEBROW. These are short uppercase mono labels, and when one
              wraps it drops its last token alone: "TANZANIA · DAR ES SALAAM · TANGU / 2026" and
              "YANAYOFUNGWA KARIBUNI · 8 YANAFUNGA / LEO" at 320, and "BODI YOTE, SASA / HIVI" under
              browser zoom. A one-word second line under a letter-spaced label reads as a mistake
              rather than a wrap. Measured on production 2026-09-24; V8b in the landing gate is what
              found them and what will find the next one.
              ⚠️ Applied at each call site rather than to `.kp-hero__eyebrow` itself, because that
              class lives in globals.css, which another session owns this week. */}
          <p className="kp-hero__eyebrow text-balance">
            <span className="kp-hero__tick" aria-hidden />
            {t.home.heroLocation} · {t.home.heroEst}
          </p>
          <Headline text={t.home.heroHeadline} />
          {/* ⭐ THE BRAND LINE STAYS ENGLISH AND GETS A READING UNDERNEATH IT (owner decision,
              2026-09-24). The headline is the largest thing on the page and Swahili is the DEFAULT
              locale since 8822b648, so on the page most visitors get, the biggest element spoke a
              language they had not chosen. The line is kept — it is the brand — and the meaning is
              now said underneath in the reader’s own language.
              ⛔ RENDERED ONLY WHERE IT SAYS SOMETHING NEW. In English the two strings are identical
              by design, and repeating a sentence directly under itself is worse than not translating
              it. Comparing the two strings rather than testing the locale means a translator who
              fills the key in a new locale gets the subline automatically, and one who leaves it
              equal gets nothing — no locale list to keep in sync in a fourth place. */}
          {t.home.heroHeadlineSub !== t.home.heroHeadline && (
            <p className="kp-hero__lede" style={{ marginTop: "var(--sp-2)" }}>{t.home.heroHeadlineSub}</p>
          )}
        </div>

        {/* ── the proof rail: three measured facts about the live book ─────────────── */}
        <div className="kp-proof">
          <div className="kp-proof__fig">
            {/* Plain text ink (E-400 ⑦f): a count of open markets is not a side; the pip carries the live signal. */}
            {/* 🔴 D51 · THE PIP FOLLOWS THE FIGURE, AND THAT IS WHAT PUTS THE RAIL ON ONE EDGE.
                It used to lead, and at ≤560 the rail is ONE COLUMN — three figures stacked on the
                page's 16px edge with hairlines between them — so the 8px pip plus its 8px gap started
                "36" at x=32 while "TZS 16K" and "8" started at x=16. Measured spread 16px: a ragged
                left edge on the one element whose job is to look like a ledger.
                ⛔ THE TWO FIXES THE REGISTER SUGGESTED WERE BOTH WORSE. Hanging the pip outside the
                flow puts it at x=8 or x=0, off the page's own content edge; giving all three numbers a
                matching 16px leading slot indents the figures while their CAPTIONS stay at 16, which
                trades a spread between rows for a spread inside every row.
                ⭐ Nothing about the signal changes — same pip, same `--live-400`, same gap, still on
                the open-markets figure and no other. It annotates the count instead of announcing it. */}
            <span className="kp-proof__num" style={{ color: "var(--text)" }}>
              {formatNumber(figures.openCount)}
              <span className="kp-proof__pip" aria-hidden />
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
          {/* 🔴 THIS SLOT STATED `Open predictions` AND INVITED THE WRONG ARITHMETIC. Beside an
              open-markets count it reads as a ratio: 35 predictions against 59 markets, measured on
              production 2026-09-24. Both numbers were true and the pair told a reader the platform
              is empty. A count of things not yet decided also SHRINKS every time a market settles,
              so the figure moved the wrong way whenever the product worked.
              ⭐ Money already paid out only grows, it is the number a bettor actually wants, and the
              settled strip lower down proves it row by row with a public source on each one — so the
              hero is not asserting something the page cannot back up.
              ⛔ `figures.openPredictions` is deliberately still computed and still on `HeroFigures`.
              It is a real fact about the book and a future surface may want it; what changed is that
              this slot is no longer the place to say it.
              Gilt because it is real money (ACCEPTANCE §6 / Q5 — gold means money, and money that
              reached a player is the strongest claim on this page). Compact form so it fits at 360
              in all three locales without a second DOM copy, exactly as the pool figure does. */}
          {/* ⛔ WITHHELD WHEN UNKNOWN, NEVER PRINTED AS ZERO. `paidOutTzs` is null when the
              aggregate could not be read, and a printed "TZS 0" would be a figure nobody produced
              on the one rail whose job is proof — the same licence condition that makes
              `pricedYesPct` return null instead of a plausible 50. A genuine zero is a real fact
              and still prints. */}
          {paidOutTzs != null && (
            <div className="kp-proof__fig">
              <span className="kp-proof__num" style={{ color: "var(--gilt)" }}>
                {formatTzsCompact(paidOutTzs)}
              </span>
              <span className="kp-proof__cap">{t.home.heroProofPaid}</span>
            </div>
          )}
        </div>

        {/* ── aggregate conviction ─────────────────────────────────────────────────────
            NOT a new component: `TippingBar`'s own `empty` prop is documented as "a STATE OF
            THIS BAR, not a second component — DESIGN_AUTHORITY B9", and its dashed
            `--bar-empty-track` rail is the platform's one cold-start bar vocabulary. */}
        <div className="kp-conv">
          <p className="kp-hero__eyebrow text-balance">{t.home.heroConvEyebrow}</p>
          {figures.yesShare == null ? (
            <TippingBar empty emptyLabel={t.home.heroConvEmpty} height={10} />
          ) : (
            <TippingBar yesPct={figures.yesShare} height={10} showLabels={false} recastOnHover={false} probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", "MARKET"))} />
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
            {/* 🔴 AN h2, NOT A PARAGRAPH — THE PAGE SKIPPED FROM h1 STRAIGHT TO h3. axe-core reports
                exactly one heading-order violation at both 360 and 1280: the featured card’s
                <h3 class="mcardp-q"> in the hero foot, with no h2 between it and the headline. This
                label names the question board, which is a section, so it IS the missing heading —
                and it sits before the card in DOM order, which is what closes the skip.
                ⛔ The class is unchanged, so nothing moves by a pixel: a heading may be styled as an
                eyebrow, and `test:eyebrow-roles` governs tracking, not tag names. Fixing this by
                demoting the card instead would have meant editing market-card.tsx, which another
                session owns and which /markets renders too. */}
            <h2 className="kp-hero__eyebrow text-balance">
              {t.home.heroBoardEyebrow}
              {figures.closingToday > 0 && (
                <> · {fill(t.home.heroBoardCloseToday, { n: figures.closingToday })}</>
              )}
            </h2>
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
            {/* Same `break-keep` exception as the trust bodies, for the same measured reason: in zh it
                forbids breaking between characters, so the lede renders three ragged lines
                (204 / 238 / 170px) where two would do, costing 26px of the fold. See the note in
                trust-band.tsx. */}
            <p className={`kp-hero__lede [overflow-wrap:anywhere]${locale === "zh" ? "" : " break-keep"}`}>{t.home.heroBody}</p>
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
