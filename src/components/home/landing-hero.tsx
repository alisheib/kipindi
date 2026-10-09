/**
 * The landing hero — v3 (docs/design-system/v4-2026-09-26-landing-ten, WP2 + WP8), rebuilt
 * 2026-09-27 from `specs/hero-v3.md` under the owner's rulings R7, R8 and R9 (INHERIT-MANIFEST).
 *
 * ── THE ORDER, AND WHY ───────────────────────────────────────────────────────────────────────
 * claim → h1 → lede → trust rows → featured card → CTAs → sign-off. What 50pick is (the claim,
 * "Tanzania's first licensed prediction market"), the question it asks in the reader's own
 * language (the h1, "NDIO au HAPANA?"), what you do and what happens (the lede, two designed
 * lines), why to trust it (18+ · the Board's licence; the wallets that pay out),
 * then a live market, then what to press, then the brand line as a sign-off. The trust rows sit
 * ABOVE the card since R7: after the card and the CTAs they never reached a phone's first screen
 * (ACCEPTANCE K29). They are the same rows for a visitor and a player. The proof rail and the
 * conviction bar keep every rule they had in their own section directly below (`LandingProof`), and
 * the board is a section of its own after it (`QuestionBoard`, WP9).
 *
 * ⭐ THIS FILE IS A DECLARED FILTER SURFACE (WP9 · R16). `QuestionBoard` renders the board's ordering
 * rail out of `FilterPill`, the product's one filter control language, and is named in
 * `scripts/filter-language.test.mts`'s `SURFACES` so §3.1–§3.5 police the idiom here too. ⛔ The hook
 * `data-filter-rail` must stay on the rail in this file: §0.4 fails on an undeclared hook and §0.5 on
 * a declared surface that has stopped emitting one.
 *
 * ⛔ THE GAMBLING-WARNING SENTENCE IS NOT IN THE HERO (R7(2)). The footer carries it, with the
 * limit links, on every page; the hero keeps one quiet row — 18+ and the licence line (no helpline
 * since the owner's ruling of 2026-10-06). `npm run test:hero-copy` §4 fails if `stopGambling` comes
 * back in here.
 *
 * ⛔ "FIRST" IS GATED. The claim reads `home.heroClaimFirst` only while `FIRST_LICENSED_EVIDENCE()`
 * (support-config.ts, its one home) returns a record — set 2026-09-27 by R9, the owner's attestation.
 * Setting it to null returns every language to "Licensed prediction market · Tanzania" in one change.
 *
 * ⚠️ SPACES. Every space between two elements is an explicit `{" "}` or sits inside a dict string:
 * SWC has dropped the whitespace around JSX expressions on production before.
 * ⚠️ `brand.tsx` is a "use client" module. `FiftyMark` (here) and `FiftyWordmark` (the claim, in
 * `hero-intro.tsx`) are rendered as JSX only — calling a helper exported by a client module from this
 * server component once took every page down while the typecheck and the build stayed green.
 * ⭐ THE CLAIM, THE H1 AND THE TRUST ROWS LIVE IN `hero-intro.tsx` (2026-10-09, R4-J), moved verbatim
 * so the journey's loading ghost for `/` draws the same intro without loading this file.
 *
 * ⭐ ONE DOM, PLACED BY GRID AREAS — never a second copy. Below 1024 the three blocks stack in
 * source order (intro → card → act); from 1024 the intro and the act share the left column and the
 * card takes the right one. A duplicated CTA block would double every link for a screen reader and
 * would be the no-JS render's problem twice (V14).
 *
 * ⛔ THE ONE RULE TO NOT BREAK IN HERE. Two figures on this surface can be a guess, and neither is
 * allowed to be rendered as one: the aggregate conviction share when nothing at all is staked, and a
 * single question's YES price when that market's own pool is empty. `impliedYesPct` returns a
 * hardcoded **50** in both cases — right for a payout projection, a fabricated number on a display
 * surface — so the aggregate comes from `pricedYesPct`, which returns **null**, and a question's own
 * price from `priceState` (WP6), which also withholds it when money sits on ONE side only; each
 * renders an em-dash plus a labelled state instead. Licence condition 1 (DESIGN_AUTHORITY §B6 /
 * law 81) and MOBILE-VISUAL ruling 13. ⛔ There is deliberately no `?? 50` anywhere below.
 *
 * ⛔ THE BACKDROP DRAWING IS GONE ON PURPOSE (Ali, 2026-09-26, INHERIT-MANIFEST R4(1)): the delivery's
 * graphic-design reviewer asks for no decorative illustration, and the ruling reverses PV-01. The
 * hero surface is flat for the same reason (L16). Do not bring either back without a new ruling.
 *
 * Every value comes from a token via a class in `globals.css` — see the `.kp-hero*` block there.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { keepText } from "@/components/ui/keep-run";
import { MarketCard } from "@/components/markets/market-card";
// ⭐ THE ONE FILTER CONTROL LANGUAGE (WP9 · R16). The board's ordering rail is `FilterPill`, not a
// bespoke toggle, and this file is declared to `test:filter-language` because of it — §3.1/§3.2 assert
// that every declared surface imports the primitive and renders it IN ITS OWN SOURCE.
import { FilterPill } from "@/components/ui/filter-pill";
import { FiftyMark, TippingBar } from "@/components/brand";
// The claim, the h1 and the trust rows: the hero's static intro, a module of its own so the loading ghost for `/` can draw
// it too without loading this file's market card (R4-J, 2026-10-09; `hero-intro.tsx` says why).
import { Ask, Claim, TrustLines } from "./hero-intro";
import { fill, formatNumber, formatTzs, formatTzsCompact } from "@/lib/utils";
import { pickLocalized } from "@/lib/localized";
import { timeLeftLabel } from "@/lib/markets/time-left";
import { formatEatDate } from "@/lib/eat-day";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { boardLenses, QUESTION_BOARD_SIZE } from "@/lib/markets/hero";
import type { BoardLens, HeroFigures, HeroRow } from "@/lib/markets/hero";
import { sideWord } from "@/lib/side-label";
import { priceState } from "@/lib/markets/price-state";
import { Cash } from "@/components/ui/cash";
import { DotSeq } from "@/components/ui/dot-seq";
import { keepFigures } from "@/components/ui/keep-words";
import type { LandingPicks } from "@/lib/server/landing-picks";

/**
 * What the signed-in hero knows about the player (landing v3 · WP14 part 2). Each part is null when
 * its read FAILED — and a null part renders nothing, never a zero (B-1).
 */
export type LandingMine = {
  picks: LandingPicks | null; balance: number | null; held: boolean;
  /** R4-I · the reader's own break or exclusion, its end already said by the page in the reader's words (`formatBreakEnd`);
   *  null when none runs or the read failed (it fails open). Optional, so a caller that does not know draws the block as
   *  before. */
  breakEnd?: { exclusion: boolean; date: string } | null;
};

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
  /** Signed in only — see LandingMine. */
  mine?: LandingMine | null;
  /**
   * The wallet names the second trust row may print — `heroRailNames()` (server/payout-rails.ts):
   * only rails whose payout path is live and that no officer has paused (R8(6)). Empty → no row.
   */
  rails: readonly string[];
  /**
   * The request is shown the journey (`resolveSimpleJourney`). It names one door only: the signed-in block's link to
   * /positions takes the journey tab's own name (see `SignedInAct`). Omitted, today's words.
   */
  journey?: boolean;
};

/** Escape a word for use inside a RegExp — the side words are data, not patterns. */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A line whose YES and NO words wear the outcome accents — the sign-off, "The wisdom of YES & NO."
 *
 * The brand line is one dict string, identical in all three locales, and its words are the English
 * YES/NO, so it is inked with those two words. Tokenising the shipped sentence keeps each word in
 * ONE home while still colouring it. (Until 2026-09-27 this also inked the sw/zh sub-line under the
 * English h1; R7(3) retired both — the h1 is now the question in the reader's language, `Ask`.)
 * ⚠️ The boundaries are Unicode letter lookarounds, not `\b`: `\b` knows only ASCII, so it could
 * never isolate 是 or 否, and an ASCII-only matcher is exactly how a translated line silently loses
 * its inks. A word inside a longer word ("NOTE") is still not repainted.
 */
function Inked({ text, yes, no }: { text: string; yes: string; no: string }) {
  const re = new RegExp(`(?<!\\p{L})(${esc(yes)}|${esc(no)})(?!\\p{L})`, "gu");
  return (
    <>
      {text.split(re).map((part, i) =>
        part === yes ? (
          <span key={i} style={{ color: "var(--hero-yes-accent)" }}>{part}</span>
        ) : part === no ? (
          <span key={i} style={{ color: "var(--hero-no-accent)" }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * ONE ROW OF THE CLOSING-SOONEST BOARD (landing v3 · WP4).
 *
 * ⭐ AN `<li>` HOLDING THREE SIBLING ZONES, NEVER ONE LINK (WP17). The row used to BE a `<Link>`, which
 * left no room for a side to be picked from it: an `<a>` may not hold another control. Now:
 *   · the head link — the question and its meta line ("Closes 27 Sep · Settles on {source} · Pool TZS n ·
 *     n predictors"), the concept's tap target, at least `--h-control-md` tall so a one-line question is
 *     never a 21px target (V4);
 *   · the reading — the price or the labelled state, the time left, and the 6px bar (not interactive);
 *   · the pick — YES@ / NO@ as two real links to `/markets/{id}?side=…`, which locks the side for a player
 *     and keeps it through sign-up for a visitor, until D3's pick slip takes the tap (WP5).
 * ⭐ THE ROW'S PRICE STATE COMES FROM ITS POOLS, exactly as the card's does (`price-state.ts`, WP6): both
 *   sides → the price within 1–99 (L14) and the figures on the buttons; one side → "One side only", the
 *   dashed rail, bare buttons and the refund rule; empty → "No bets yet" only where nobody ever bet, else
 *   "No pool yet" (the D29 rule: `predictorCount` is never decremented, so a cashed-out market has a pool
 *   of 0 and a predictor). ONE label, read by the price slot and the rail alike, and in the CARDS' own keys
 *   (`market.noBetsYet` / `market.noPoolYet`): one state has one wording on the page (B9). The row's own
 *   `home.heroNoPrice` said the never-bet state in other words than the cards and was retired 2026-09-27.
 * ⭐ NO 24h MARK ON A ROW (the concept draws none) and no share (WP14b: the footer share is the cards').
 * ⛔ `row.yesPct` is the rounded share — 100 on a one-sided pool — and is never read here.
 * The gate's V18 reads the row through `data-market-surface` / `data-market-part`, never through a word.
 */
function QuestionRow({ row, t, locale, nowMs }: { row: HeroRow; t: Dict; locale: Locale; nowMs: number }) {
  const price = priceState(row.yesPool, row.noPool);
  const title = pickLocalized(locale, row.titleEn, row.titleSw, row.titleZh);
  const yesWord = sideWord(t, "YES", "MARKET");
  const noWord = sideWord(t, "NO", "MARKET");
  const timeLeft = row.selectionClosed ? t.home.waitingForResults : timeLeftLabel(row.bettableUntilMs, nowMs, {
    closed: t.market.closed, days: t.market.timeLeftD, hours: t.market.timeLeftH, minutes: t.market.timeLeftM,
  }, fill);
  // The instant the countdown counts to, as a day (the Gaming Board's "a timer names its instant").
  const closes = fill(t.market.closesOn, { date: formatEatDate(row.bettableUntilMs, nowMs, t.common.monthsShort, locale) });
  const [settlesPre = "", settlesPost = ""] = t.market.settlesOn.split("{source}");
  const emptyLabel = price.kind === "oneSided" ? t.market.oneSideOnly : row.predictors === 0 ? t.market.noBetsYet : t.market.noPoolYet;
  const oneSidedNote = price.kind === "oneSided" ? t.market.oneSidedNote.replace("{side}", sideWord(t, price.emptySide, "MARKET")) : null;
  // The card's own names for the pair, so one control has one vocabulary: no figure without a price.
  const yesAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", yesWord);
  const noAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(100 - price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", noWord);
  /* ⭐ THE META LINE BREAKS ONLY BETWEEN ITS FACTS (round 4 of the visual pass, 2026-10-09, edges tiles 248 249 257 258 266
     267): "Closes 27 Sep · Settles on {source} · Pool TZS n · n predictors" was one sentence of text, so at 360 its first
     line ended on the dot ("…Linatatuliwa kwa bot.go.tz ·" / "Bwawa TZS 0 · 0 watabiri"). It is `DotSeq` now, the one
     idiom for "A · B · C" (dot-seq.tsx): each fact one flex item, its dot hanging in the gap, so no line ends or opens on
     "·". The facts are the same words and wear the same classes and `data-market-part` hooks, through `renderPart`. */
  const settles = row.sourceName ? `${settlesPre}${row.sourceName}${settlesPost}` : null;
  const pool = `${t.common.pool} ${formatTzs(row.pool)}`;
  const depth = `${formatNumber(row.predictors)} ${row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}`;
  const metaPart = (part: string) =>
    part === closes ? <span className="kp-qrow__close">{closes}</span>
    : part === settles ? (
      <span className="kp-qrow__src">
        {settlesPre}
        <span className="kp-qrow__srcname" data-market-part="source">{row.sourceName}</span>
        {settlesPost}
      </span>
    )
    // The pool is REAL even when it is zero, so it is always stated (V18, K48). Each part draws its words as the row
    // always did (the same expressions; the strings above are only how DotSeq knows which part it is holding).
    : part === pool ? <span className="kp-qrow__pool" data-market-part="pool">{t.common.pool}{" "}{formatTzs(row.pool)}</span>
    : part === depth ? (
      <span className="kp-qrow__depth" data-market-part="predictors">
        {formatNumber(row.predictors)}{" "}{row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}
      </span>
    )
    : part;
  return (
    <li className="kp-qrow" data-price={price.kind} data-market-surface="board" data-row-id={row.id}>
      <Link href={`/markets/${row.id}` as never} className="kp-qrow__head">
        {/* `keepFigures` (round 4, edges 197 255): "2026-27" and "dakika 28:00" never break inside. */}
        <span className="kp-qrow__q">{keepFigures(title)}</span>
        <DotSeq text={[closes, settles, pool, depth].filter(Boolean).join(" · ")} className="kp-qrow__meta" renderPart={metaPart} />
      </Link>
      <div className="kp-qrow__read">
        <div className="kp-qrow__line">
          <span className="kp-qrow__price" data-market-part={price.kind === "priced" ? "price" : undefined}>
            {price.kind === "priced" ? (
              <>
                <span className="kp-qrow__num">{price.yesPct}</span>
                <span className="kp-qrow__unit">{"% "}{t.common.yes}</span>
              </>
            ) : (
              <>
                {/* Em-dash PLUS a labelled state — licence condition 1's exact prescription for an
                    unknown. The dash alone would read to a screen reader as nothing at all. */}
                <span className="kp-qrow__num" aria-hidden>—</span>
                <span className="kp-qrow__unit kp-qrow__unit--label" data-market-part="state">{emptyLabel}</span>
              </>
            )}
          </span>
          {/* Time is not a side: the neutral ink, never the betting pair (`test:betting-ink`). */}
          <span className="kp-qrow__left" data-market-part="time">{timeLeft}</span>
        </div>
        {/* The bar repeats the line above it, so it is hidden from a screen reader rather than named twice
            on four rows. No price → the dashed rail, named by the same label (one-sided or empty). */}
        <div className="kp-qrow__bar" aria-hidden>
          {price.kind === "priced" ? (
            <TippingBar yesPct={price.yesPct} height={6} showLabels={false} recastOnHover={false} />
          ) : (
            <TippingBar empty emptyLabel={emptyLabel} height={6} />
          )}
        </div>
      </div>
      {/* Two real links until D3 (WP5's slip). `prefetch={false}`: four rows × two query variants would
          otherwise prefetch eight detail pages. A one-sided or empty row keeps both — taking the empty
          side is exactly what gives it a price — but neither carries a figure. */}
      <div className="kp-qrow__act" data-market-part="pick">
        <Link href={`/markets/${row.id}?side=YES&from=home` as never} prefetch={false} className="btn btn-yes btn-md kp-qrow__btn" aria-label={yesAria}>
          {yesWord}{price.kind === "priced" && <span className="kp-qrow__at">{" @ "}{price.yesPct}%</span>}
        </Link>
        <Link href={`/markets/${row.id}?side=NO&from=home` as never} prefetch={false} className="btn btn-no btn-md kp-qrow__btn" aria-label={noAria}>
          {noWord}{price.kind === "priced" && <span className="kp-qrow__at">{" @ "}{100 - price.yesPct}%</span>}
        </Link>
      </div>
      {/* The refund rule (L22), the card's one conditional sentence, at the reading floor. */}
      {oneSidedNote && <p className="kp-qrow__note">{oneSidedNote}</p>}
    </li>
  );
}

export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards, mine, rails, journey = false }: Props) {
  const { featured } = figures;
  const chart = featured ? cards.charts.get(featured.id) : undefined;

  return (
    <section className="kp-hero" data-band="hero">
      {/* `--solo`: an empty book has no featured market, and a two-column grid would leave its right
          half blank (and a doubled gap on a phone) — the pitch and the CTAs take the whole width. */}
      <div className={featured ? "kp-hero__inner" : "kp-hero__inner kp-hero__inner--solo"}>
        <div className="kp-hero__intro">
          {/* The claim and the h1 are one heading group: the claim names what 50pick is, the h1 asks
              the question it exists for. `hgroup` allows a paragraph before its heading. */}
          <hgroup className="kp-hero__lockup">
            <Claim t={t} />
            <Ask t={t} />
          </hgroup>
          {/* Two designed lines, each short enough never to wrap at 360 in any language: the product's
              own verbs ("weka dau" is the stake button's word), then what happens. Two spans, one
              sentence pair: the explicit space keeps the text whole for a screen reader. */}
          <p className="kp-hero__lede">
            <span className="kp-hero__lede-l">{t.home.heroLedeAct}</span>{" "}
            <span className="kp-hero__lede-l kp-hero__lede-l--pay">{t.home.heroLedePay}</span>
          </p>
          <TrustLines t={t} locale={locale} rails={rails} />
        </div>

        {/* THE SAME MARKET THAT LEADS THE BOARD'S ORDERING — the most contested open market, never an
            editorial pick (INHERIT-MANIFEST R4(4)). A pinned favourite would stop the hero being an
            instrument. Its question is the page's first h2 (`featured` sets it), so the heading
            order runs h1 → h2 with no gap. */}
        {featured && (
          <div className="kp-hero__card">
            <MarketCard
              productLine={"MARKET"}
              featured
              id={featured.id}
              titleEn={featured.titleEn}
              titleSw={featured.titleSw}
              titleZh={featured.titleZh}
              category={featured.category}
              // The pools, never `yesPct ?? 0` (WP6): the card decides empty / one-sided / priced
              // from them itself (`price-state.ts`), and a one-sided featured market reads "One side
              // only" with the refund rule instead of "YES 100%".
              yesPool={featured.yesPool}
              noPool={featured.noPool}
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
              // The same deadline and clock as the label, so SOON fires in every locale (L17).
              msLeft={featured.selectionClosed ? undefined : featured.bettableUntilMs - nowMs}
              status="LIVE"
              selectionClosed={featured.selectionClosed}
              sourceUrl={featured.sourceUrl}
              // WP3 · the meta line: the close as a day, and the NAMED source (resolved on the server).
              closesOn={fill(t.market.closesOn, { date: formatEatDate(featured.bettableUntilMs, nowMs, t.common.monthsShort, locale) })}
              sourceName={featured.sourceName}
              spark={chart?.spark}
              move24h={chart?.move24h}
              traders={cards.traders.get(featured.id)}
            />
          </div>
        )}

        <div className="kp-hero__act">
          {/* TWO CTAs, not three — `Sign in` lives in the header at every width. Below 1024 they
              follow the card (the delivery's placement map P4); from 1024 they sit in the left column
              under the intro. A player gets their own block instead, with Set limits (WP14 part 2). */}
          {isAuthed ? (
            <SignedInAct t={t} mine={mine ?? null} journey={journey} />
          ) : (
            <>
              <div className="kp-hero__ctas">
                <Link href={"/auth/register" as never} className="btn btn-primary btn-xl rounded-pill kp-hero__cta">
                  {t.home.heroStart}
                  <I.arrowRight s={16} />
                </Link>
                <Link href={"/markets" as never} className="btn btn-ghost btn-xl rounded-pill kp-hero__cta">
                  {fill(t.home.heroBrowseAll, { n: figures.openCount })}
                </Link>
              </div>
              {/* THE SIGN-OFF — the brand line, which was the h1 until R7(3) (2026-09-27). The mark is
                  the logo used as a logo, not decoration (R4(1) untouched), and it is aria-hidden: the
                  line is the sign-off's text. `lang="en"`: the brand line is English in every locale,
                  so a Swahili or Chinese screen reader must pronounce it as English (WCAG 3.1.2) — the
                  only `lang` in the hero (`test:hero-copy` §4). */}
              <p className="kp-hero__signoff">
                <span className="kp-hero__signoff-mark" aria-hidden><FiftyMark size={20} simplified /></span>{" "}
                <span lang="en"><Inked text={t.home.heroHeadline} yes="YES" no="NO" /></span>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * The payment method's name as `sentence` spells it — "pesa ya simu", "mobile money" — found by the Wallet's own label for
 * it (`wallet.mobileMoneyOnly`, in any case), as the one run `keepText` keeps whole; none when the sentence names it
 * otherwise (R5-B, 2026-10-09). No new words: both strings are the dictionary's.
 */
export function methodRunIn(sentence: string, method: string): string[] {
  const at = sentence.toLowerCase().indexOf(method.toLowerCase());
  return at < 0 || method.length === 0 ? [] : [sentence.slice(at, at + method.length)];
}

/**
 * THE SIGNED-IN HERO (landing v3 · WP14 part 2 — the delivery's wallet scenario §4a and §4c).
 *
 * Where a visitor is offered "Create account", a player sees their own POSITION: Your picks (open ·
 * awaiting result · paid this week), then My positions and Set limits.
 *
 * ⭐ R17 (Ali, 2026-09-28) · THE DEPOSIT/WITHDRAW PAIR IS CUT, AND SO IS THE BALANCE BESIDE IT.
 * Counted on one signed-in phone viewport before this: the header capsule (which opens a Wallet holding
 * Deposit and Withdraw side by side at equal size), the bottom rail's centre coin, AND this block's own
 * gilt pair — THREE money-in routes on the page whose job is the book, against the delivery's own "one
 * Deposit per screen" (V25, which exempted the hero from 640 up). ⛔ The pair was also the only one of
 * the three that SCROLLS AWAY, so it was the least reachable and the most repetitive; and three gilt
 * controls in one viewport dilute the one signal that means money (`test:gold-is-money`).
 * ⭐ REACHABILITY IS UNCHANGED, WHICH IS WHY THIS COSTS NOTHING. Money IN is still one tap — the rail's
 * coin, permanent, in thumb reach on every page. Money OUT is still two — the capsule, then Withdraw —
 * exactly as before, because a control that has scrolled off the screen was never the shorter path.
 * V19's rule ("Withdraw as reachable and as large as Deposit") is satisfied where R1 put it: inside the
 * Wallet, where the two are literally the same size.
 * ⛔ THE BALANCE WENT WITH IT because the header states it at EVERY value, zero included (R10) — two
 * statements of one figure on one screen is what R10's own reasoning is against. What this block says
 * that nothing else on the page says is the player's picks, so that is what it keeps.
 * ⚠️ SUPERSEDES the "then the balance with Deposit and Withdraw side by side" half of L21/R1 for THIS
 * surface only; the Wallet sheet's pair is untouched and is still the pair V19 measures.
 *
 * ⛔ A FAILED READ SHOWS NOTHING, NEVER ZEROS (B-1): null `picks` hides the figures. A player with no
 * picks at all gets one sentence, not three zeros — a row of zeros is advertised emptiness, the dead
 * state the gate's V11 exists for.
 * ⚠️ The trust lines stay above it for a player too: R4(5) puts the RG line in the hero's trust lines,
 * and a player holding money is who it is for (INHERIT-MANIFEST L21).
 * ⛔ A frozen wallet still says so, and still gets no money control — the same rule as the Wallet
 * (`wallet-sheet.tsx`), now trivially true because this block has none at all.
 */
function SignedInAct({ t, mine, journey }: { t: Dict; mine: LandingMine | null; journey: boolean }) {
  const picks = mine?.picks ?? null;
  const balance = mine?.balance ?? null;
  const held = !!mine?.held;
  // R4-I · the reader's break, its end already in the reader's words (the page says it, `formatBreakEnd`).
  const breakEnd = mine?.breakEnd ?? null;
  const onBreak = !!breakEnd;
  const noPicks = !!picks && picks.open === 0 && picks.awaiting === 0 && picks.paidThisWeekTzs === 0;
  // At zero the empty-balance prompt already says what to do next; the no-picks sentence beside it said it twice.
  // ⛔ R4-I · not during a break either: "Add funds … to make your next pick" invites both things a break pauses.
  const emptyWallet = !held && !onBreak && balance !== null && balance <= 0;
  // ⛔ AND A FROZEN WALLET IS NOT INVITED TO PICK (round 3's tiles 090 091 095 096 099 100, 2026-10-08): "Choose a side
  // on a market to make your first" stood directly above "Your wallet is frozen" — an invitation the platform refuses.
  // The held notice speaks alone, as the Wallet and the journey header withhold their money invitations for a held
  // wallet (`wallet-sheet.tsx`, `header-state.ts`). No new words: the sentence is simply not shown.
  // ⛔ …AND NEITHER IS A PLAYER ON A BREAK (R4-I, 2026-10-09; edges E19, tiles 013 016 019 046 049 052 079 082 085): "Bado
  // huna chaguo. Chagua upande…" asked a player who had just paused their own betting to bet now. The break gets the held
  // wallet's whole treatment: the invitation is not shown, and the break's own notice speaks in its place — the title the
  // sign-in page gives it (`auth.coolingOff`) over the sentence /wallet/deposit and the limits page give it
  // (`rg.breakActive`, with its end); an exclusion its own pair. No new words.
  return (
    <div className="kp-mine" data-testid="landing-mine">
      {picks && (noPicks ? (
        held || emptyWallet || onBreak ? null : <p className="kp-mine__lead">{t.home.picksNone}</p>
      ) : (
        <div>
          <p className="kp-mine__eyebrow">{t.home.yourPicks}</p>
          <ul className="kp-mine__stats" role="list">
            <li className="kp-mine__stat">
              <span className="kp-mine__n">{formatNumber(picks.open)}</span>
              <span className="kp-mine__l">{t.home.picksOpen}</span>
            </li>
            <li className="kp-mine__stat">
              <span className="kp-mine__n">{formatNumber(picks.awaiting)}</span>
              <span className="kp-mine__l">{t.home.picksAwaiting}</span>
            </li>
            <li className="kp-mine__stat">
              <span className="kp-mine__n kp-mine__n--gold"><Cash>{formatTzs(picks.paidThisWeekTzs)}</Cash></span>
              <span className="kp-mine__l">{t.home.picksPaidWeek}</span>
            </li>
          </ul>
        </div>
      ))}
      {/* ⛔ NO MONEY CONTROL AND NO BALANCE IN HERE SINCE R17 — see the header. A frozen wallet still
          says so, and an empty one still says what to do; both are SENTENCES, and the controls they
          point at are the header capsule and the rail's coin, which are on the screen at every scroll
          position. ⚠️ `emptyBalance` names the METHOD and not a location on purpose: the control is the
          rail's coin below 1024 and the header's pill from 1024, so a sentence saying "below" would be
          false at one of the two widths. */}
      {held ? (
        <div className="kp-mine__held" role="status">
          <p className="kp-mine__held-t">{t.kycGate.frozenTitle}</p>
          <p className="kp-mine__held-b">{t.kycGate.frozenBody}</p>
        </div>
      ) : breakEnd ? (
        <div className="kp-mine__held" role="status" data-testid="landing-mine-break">
          <p className="kp-mine__held-t">{breakEnd.exclusion ? t.auth.selfExclusionActive : t.auth.coolingOff}</p>
          <p className="kp-mine__held-b">{keepText(fill(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, { date: breakEnd.date }), [breakEnd.date])}</p>
        </div>
      ) : emptyWallet ? (
        /* ⭐ THE PAYMENT METHOD'S NAME STAYS WHOLE (round 5 of the visual pass, R5-B, 2026-10-09, tiles 079 083): balanced
           at 1024–1280 the lead broke inside it — "…kwa pesa ya" / "simu au kadi…", "…by mobile" / "money or card…" — the
           way the trust line above never breaks a rail's name (`.kp-hero__rail`). It is one run now (`keepText`), found by
           the Wallet's own label for it (`methodRunIn`); the lines become "…kwa pesa ya simu" / "au kadi…" (382 | 282px)
           and "…Add funds by" / "mobile money or card…" (295 | 367). At 390 the run cannot end the first line, so the lead
           takes three lines there, as it already does at 320. Chinese names it 手机钱包, which `keep-all` keeps. */
        <p className="kp-mine__lead">{keepText(t.home.emptyBalance, methodRunIn(t.home.emptyBalance, t.wallet.mobileMoneyOnly))}</p>
      ) : null}
      {/* The block's two doors, and neither is money: the player's own positions — which is what the
          figures above are ABOUT — and the RG limits, one tap from the first screen (K37). */}
      <div className="kp-mine__links">
        {/* ⭐ ONE PAGE, ONE NAME (round 4 of the visual pass, 2026-10-09, edges E4): in the journey /positions is the tab
            "Tiketi zangu / My tickets / 我的注单" — its h1 and its tab say so — so this link takes the tab's own key, where
            it read "Nafasi zangu / My positions / 我的持仓". A classic reader keeps today's words (the classic nav names
            the page "Nafasi", and its home link "Nafasi zangu"). No new words. */}
        <Link href={"/positions" as never} className="kp-mine__limits">
          {journey ? t.journey.tabTickets : t.home.myPositions}
          <I.arrowRight s={14} />
        </Link>
        <Link href="/profile/responsible-gambling" className="kp-mine__limits">
          {t.footer.setLimits}
          <I.arrowRight s={14} />
        </Link>
      </div>
    </div>
  );
}

/**
 * The proof section — the three measured figures and the whole book's conviction. It used to live
 * INSIDE the hero, above the lede; v3 moved it directly below the hero so the first screen shows the
 * pitch and a live market (V15).
 *
 * ⚠️ THE BOARD LEFT THIS SECTION IN WP9, and it is not a tidy-up. The board took the deleted grid
 * band's section header — an eyebrow, an h2 and an "All N markets" link — and a section header inside
 * a section whose own `aria-label` is "The whole board, right now" announced a market list as part of
 * a conviction reading. It is `QuestionBoard` below, with its own `data-band`. `locale` and `nowMs`
 * left with it: nothing else here reads a clock or a localised title.
 */
export function LandingProof({ figures, t, paidOutTzs }: {
  figures: HeroFigures;
  t: Dict;
  /**
   * Σ CONFIRMED payouts + cashouts, TZS — the third proof figure.
   * **null means the read failed**, and the slot is withheld rather than printed as a zero.
   */
  paidOutTzs: number | null;
}) {
  const convRead = figures.yesShare == null
    ? t.home.heroConvEmpty
    : fill(t.home.heroConvRead, {
        yesPct: figures.yesShare,
        noPct: 100 - figures.yesShare,
        yesWord: t.common.yes,
        noWord: t.common.no,
      });
  return (
    <section className="kp-band kp-lproof" data-band="proof" aria-label={t.home.heroConvEyebrow}>
      <div className="kp-band__inner kp-lproof__inner">
        {/* ── the proof rail: three measured facts about the live book ─────────────────────────
            Below 640 each figure is a LEDGER ROW — caption left, figure right — so three figures cost
            three short rows instead of three stacked blocks; from 640 they are three columns. The
            markup order (figure, then caption) is unchanged, so `test:betting-ink` §1 still reads
            the figure markup it pins; the ledger is pure CSS. */}
        <div className="kp-proof">
          <div className="kp-proof__fig">
            {/* Plain text ink (E-400 ⑦f): a count of open markets is not a side; the pip carries the live signal. */}
            {/* 🔴 D51 · THE PIP FOLLOWS THE FIGURE. It used to lead, which put "36" 16px right of the
                other two figures on the rail's left edge. It annotates the count; it does not announce it. */}
            <span className="kp-proof__num" style={{ color: "var(--text)" }}>
              {formatNumber(figures.openCount)}
              <span className="kp-proof__pip" aria-hidden />
            </span>
            <span className="kp-proof__cap">{t.home.heroProofOpen}</span>
          </div>
          {/* Gilt is correct on a pool: it is real money on the platform right now. Compact form so the
              figure fits in all three locales without a second DOM copy. */}
          <div className="kp-proof__fig">
            <span className="kp-proof__num" style={{ color: "var(--gilt)" }}>
              {formatTzsCompact(figures.poolTzs)}
            </span>
            <span className="kp-proof__cap">{t.home.heroProofPool}</span>
          </div>
          {/* ⭐ Money already paid out only grows, and it is the number a bettor wants. It replaced an
              "Open predictions" count that read, beside the open-markets count, as an invitation to
              divide. ⚠️ The settled strip corroborates the CLAIM (money reaches players, with a
              public source on each row), not this TOTAL: the strip is polls only, this is the whole
              ledger. ⛔ WITHHELD WHEN UNKNOWN, NEVER PRINTED AS ZERO — a printed "TZS 0" would be a
              figure nobody produced on the one rail whose job is proof. A genuine zero still prints. */}
          {paidOutTzs != null && (
            <div className="kp-proof__fig">
              <span className="kp-proof__num" style={{ color: "var(--gilt)" }}>
                {formatTzsCompact(paidOutTzs)}
              </span>
              <span className="kp-proof__cap">{t.home.heroProofPaid}</span>
            </div>
          )}
        </div>

        {/* ── aggregate conviction ─────────────────────────────────────────────────────────────
            NOT a new component: `TippingBar`'s own `empty` prop is its cold-start state, and its dashed
            `--bar-empty-track` rail is the platform's one cold-start bar vocabulary.
            ⭐ The bar's accessible name is the WHOLE reading printed under it (WP8) — "70% YES · 30% NO,
            every open market, weighted by the money on it" — not "YES probability 70%", which named
            one side of a split and dropped what the split is OF. */}
        <div className="kp-conv">
          <p className="kp-hero__eyebrow text-balance">{t.home.heroConvEyebrow}</p>
          {figures.yesShare == null ? (
            <TippingBar empty emptyLabel={t.home.heroConvEmpty} height={10} as="img" />
          ) : (
            <TippingBar yesPct={figures.yesShare} height={10} showLabels={false} recastOnHover={false} probabilityLabel={convRead} as="img" />
          )}
          <p className="kp-conv__read">{convRead}</p>
        </div>
        {/* ⛔ NO MARKET LIST HERE SINCE WP9 — it is `QuestionBoard`, the next section. */}
      </div>
    </section>
  );
}

/**
 * THE BOARD — the landing's ONE market list (landing v3 · WP9, ruling R15).
 *
 * ⭐ WHAT CHANGED, AND WHY IT IS ONE LIST NOW. `/` used to state the same open book in three shapes:
 * the featured card, this board at four rows, and a `.market-grid` of three cards under its own
 * heading. R15 deletes the grid — `landingGrid` and the hero's board were the same book in two shapes,
 * and the delivery's reason ("three lists of one thing") is true of them — and KEEPS the topic tiles,
 * which list TOPICS, a different axis, and repeat no market. The board grows 4 → 7, so the page still
 * shows exactly EIGHT markets (1 featured + 7), the budget `landing.ts` chose deliberately.
 *
 * ⭐ IT TAKES THE DELETED BAND'S SECTION HEADER, because that header is the one part of the band worth
 * keeping: a list under a heading that states its ordering is a CLAIM, and a list under nothing is a
 * sample. So the section carries `.kp-shead` — the live fact ("{n} close today"), the h2, and "All N
 * markets" — and the ordering is stated by the rail below it.
 *
 * ⭐ THE ORDERING IS STATED EXACTLY ONCE, BY THE RAIL. The grid band printed its lens in the eyebrow
 * (`home.gridEyebrowPool` / `gridEyebrowNew`); the board's pills print the same three strings, so the
 * page gained a control and did not gain a second copy of the sentence. ⛔ Two statements of one
 * ordering 8px apart is how they start disagreeing — and they would have, in Swahili: `market.sortPool`
 * reads "Pesa nyingi" where the landing's own key reads "Bwawa kubwa kwanza". The landing's reviewed
 * words are kept and NO new key is minted.
 *
 * ⭐ R16 · THE RAIL IS `FilterPill`, NOT A `role="tablist"`. The v4 delivery and R15 ask for a tablist.
 * This repo has none, deliberately: ruling A5 (`ui/tabs.tsx`) stripped `role="tablist"`/`role="tab"`/
 * `aria-selected` from all three Tabs variants because the ARIA tab pattern needs a roving tabindex and
 * an `aria-controls` naming a `role="tabpanel"` the primitive does not own — "the fix is to STOP
 * CLAIMING THE WIDGET". And DESIGN_AUTHORITY §K rule 7c settles which language a rail speaks: "the
 * underline is the section language; the capsule is the filter language". This rail orders a list, so
 * it is the capsule — `FilterPill`, 44px (above the 40 the delivery asks for, because that is this
 * product's chip floor), `semantics="tab"` so the pill in force says `aria-current="page"` rather than
 * lying about being a toggle a reader can un-press.
 *
 * ⭐ AND IT IS A URL, WHICH IS R15'S BINDING HALF KEPT AND ITS SHAPE OVERRULED. R15 says the orderings
 * are computed on the SERVER and "never re-sorted in the browser", because `boardOrdering` picks by
 * price tier with a degeneracy floor and a client-side re-sort would be a second, quietly different
 * implementation of a rule about money. A `<Link replace scroll={false}>` is exactly the mechanism the
 * discovery bar's own header prescribes for this — *"a filter is not a navigation"* — and it keeps
 * three properties a client switcher costs: the ordering is a real shareable URL, the control needs no
 * JavaScript, and the DOM holds ONE ordering, so source order still equals screen order (the WCAG 1.3.2
 * reason L18 removed a CSS `order` for) and the row anchors `red:one-sided` injects into still resolve
 * exactly once. A client switcher holding both orderings would have doubled every one of them.
 *
 * ⛔ NOT A `<Reveal>`, unlike the band it replaces. The grid band rose on first intersection, which is
 * why §0 trap 13 exists — a component below the fold photographs BLANK if the camera never scrolls, and
 * this is now the only market list on the page. A list of live markets is not an entrance.
 */
export function QuestionBoard({ figures, t, locale, nowMs }: {
  figures: HeroFigures;
  t: Dict;
  locale: Locale;
  /** The page's one clock — the rows' time left and close dates read it, as the hero's card does. */
  nowMs: number;
}) {
  if (figures.board.length === 0) return null;
  // ⭐ ONE VARIABLE FEEDS THE PILL'S WORDS, so the rail and the ordering cannot drift: `figures.lens`
  // is what `boardOrdering` actually ran, narrowed in `heroFigures` against this same offered pair.
  //
  // 🔴 THESE ARE `/markets`' OWN SORT WORDS, AND THE FIRST BUILD USED THE LANDING'S INSTEAD.
  // Measured on production at 360 in Swahili: the landing's own strings rendered pills of 182px and
  // 176px against a 328px rail, so the rail wrapped — and an unselected pill is text on transparent
  // (the governing rule in `filter-pill.tsx`), so the second option sat alone on line two and read as a
  // caption rather than a control. At 1280 the identical idiom reads correctly on one line, which is how
  // we know the idiom was right and the LABELS were wrong. `market.sortClosing` / `sortPool` / `sortNew`
  // measure about 160 + 112, which fits.
  // ⭐ AND IT COSTS NOTHING IN CONSISTENCY — IT BUYS SOME. The landing used to name its ordering twice
  // (the grid band's eyebrow AND, now, this rail), so borrowing `/markets`' words would have put two
  // different Swahili names for one ordering on one page. WP9 moved the eyebrow onto the board's live
  // fact instead, so the rail is the ONLY place the ordering is named — and naming it with the same
  // words `/markets`, `/positions`, `/proposals` and `/watchlist` use is B9 (one state, one wording).
  // The three landing-only strings this replaced are RETIRED from the dictionary in the same commit,
  // keys and values, in all three locales — `hero-copy` §5b asserts both halves.
  const LABEL: Record<BoardLens, string> = {
    closing: t.market.sortClosing,
    pool: t.market.sortPool,
    new: t.market.sortNew,
  };
  return (
    <section className="kp-band kp-band--tight" data-band="board">
      <div className="kp-band__inner">
        <div className="kp-shead">
          <div className="min-w-0">
            {/* The board's own live fact, not its ordering — the rail states that. No eyebrow when
                nothing closes today, rather than an eyebrow reading "0". */}
            {figures.closingToday > 0 && (
              <p className="kp-hero__eyebrow text-balance">
                <span className="kp-hero__tick" aria-hidden />
                {fill(t.home.heroBoardCloseToday, { n: figures.closingToday })}
              </p>
            )}
            {/* `text-balance` for the reason every `.kp-shead__h` carries it: without it "Chagua
                upande / sasa" drops its last word onto line two at 360 sw (measured on production). */}
            <h2 className="kp-shead__h text-balance">{t.home.pickASideNow}</h2>
          </div>
          {/* The board's ordering travels to /markets, so "all of them" arrives sorted as here. */}
          <Link href={`/markets?sort=${figures.lens}` as never} className="kp-shead__link">
            {fill(t.home.gridSeeAll, { n: figures.openCount })}
            <I.chevronRight s={14} />
          </Link>
        </div>

        {/* ⛔ `data-filter-rail` IS THE DECLARATION, NOT DECORATION — `test:filter-language` §0.4 fails
            on a hook it does not know about and §0.5 on a declared surface that has dropped one.
            ⚠️ The default lens links to `/` rather than `?sort=closing`: one state, one URL, and the
            canonical stays the clean one. ⚠️ No `count` on either pill — both orderings show the same
            seven rows of the same book, so a count would be the same number twice, and FilterPill's
            rule is to omit a count where no honest one exists rather than invent one. */}
        <nav data-filter-rail aria-label={t.market.sortAria} className="kp-qboard__lens">
          {boardLenses(figures.poolTzs).map((l) => (
            <FilterPill
              key={l}
              href={l === "closing" ? "/" : `/?sort=${l}`}
              label={LABEL[l]}
              on={figures.lens === l}
              semantics="tab"
              testId={`sort:${l}`}
              replace
              scroll={false}
            />
          ))}
        </nav>

        {/* `role="list"`: WebKit drops the list role from a `ul` styled `list-style: none`.
            ⭐ THE PROMISE IS PUBLISHED SO AN INSTRUMENT CAN CHECK IT AGAINST THE DELIVERY — the same
            reason `data-result-count` exists on the shared query bar ("a board once printed '40 live'
            above ZERO cards at nine of nine viewport × locale combinations; the number was true and the
            board was still a lie"). `data-board-size` is the row count this page INTENDS
            (`QUESTION_BOARD_SIZE`), `data-board-open` the size of the open book it is drawing from; the
            gate's V18 asserts the rendered rows equal min(size, open − 1 for the featured card). ⛔
            Without it a board that quietly fell back to four rows on a full book would read as normal:
            the row count was reported by every instrument and asserted by none. */}
        <ul
          className="kp-qboard"
          role="list"
          data-board-size={QUESTION_BOARD_SIZE}
          data-board-open={figures.openCount}
        >
          {figures.board.map((row) => (
            <QuestionRow key={row.id} row={row} t={t} locale={locale} nowMs={nowMs} />
          ))}
        </ul>
      </div>
    </section>
  );
}
