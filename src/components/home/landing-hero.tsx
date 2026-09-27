/**
 * The landing hero — v3 (docs/design-system/v4-2026-09-26-landing-ten, WP2 + WP8).
 *
 * ── WHAT v3 CHANGED, AND WHY ──────────────────────────────────────────────────────────────────
 * The hero used to open with the brand line and then the proof rail, the conviction bar and a
 * four-row board — so on a phone the first screen held three figures and a list, and the lede, the
 * two CTAs and the one live card all sat below it. A first-time visitor learnt the size of the book
 * before learning what the book IS. v3 puts the order a reader needs first: what 50pick is (eyebrow,
 * brand line, lede) → a live market (the featured card) → what to do (CTAs) → why to trust it (the
 * trust lines). The proof rail, the conviction bar and the closing-soonest board keep every rule
 * they had and move into their own section directly below (`LandingProof`).
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
import { MarketCard } from "@/components/markets/market-card";
import { TippingBar } from "@/components/brand";
import { fill, formatNumber, formatTzs, formatTzsCompact } from "@/lib/utils";
import { pickLocalized } from "@/lib/localized";
import { timeLeftLabel } from "@/lib/markets/time-left";
import { formatEatDate } from "@/lib/eat-day";
import { HELPLINE, HELPLINE_TEL } from "@/lib/support-config";
import type { Dict, Locale } from "@/lib/i18n-dict";
import type { HeroFigures, HeroRow } from "@/lib/markets/hero";
import { sideWord } from "@/lib/side-label";
import { priceState } from "@/lib/markets/price-state";
import { Cash } from "@/components/ui/cash";
import type { LandingPicks } from "@/lib/server/landing-picks";

/**
 * What the signed-in hero knows about the player (landing v3 · WP14 part 2). Each part is null when
 * its read FAILED — and a null part renders nothing, never a zero (B-1).
 */
export type LandingMine = { picks: LandingPicks | null; balance: number | null; held: boolean };

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
};

/** Escape a word for use inside a RegExp — the side words are data, not patterns. */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A line whose YES and NO words wear the outcome accents.
 *
 * The brand line is one dict string, identical in all three locales, and its words are the English
 * YES/NO. ⭐ The sub-line under it (sw and zh only — MOBILE-VISUAL ruling 12) is the reader's own
 * reading and carries the reader's own side words, so it is inked with the SAME words the buttons
 * and the conviction bar use (`sideWord`), not with a second list typed here. Tokenising the shipped
 * sentence keeps each word in ONE home while still colouring it.
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
 * The trust lines — licence and 18+, mobile money, the RG line with the helpline, named sources.
 *
 * ⭐ NOT ONE NEW REGULATED SENTENCE. Every string is read from the key the footer or the trust band
 * already ships (`footer.licensedByGbt`, `footer.stopGambling`, `footer.helpline`, `home.trustCell3H`,
 * `home.trustCell1H`), and the helpline comes from `support-config.ts`, its one home. RG and licence
 * wording is assessed, so a paraphrase would be a new claim to assess.
 * ⭐ THE ORDER IS THE FIRST SCREEN'S. The delivery wants licence, 18+, mobile money AND the helpline on
 * a phone's first screen (its ACCEPTANCE K29 and placement map P15), while its own phone order puts
 * these lines after the CTAs — below 740px. So they come BEFORE the CTAs, in the SOURCE and therefore
 * on screen, at every width: a CSS `order` would have made keyboard and screen-reader order disagree
 * with what is seen (WCAG 1.3.2 / 2.4.3 — the v3 review). Within the list: what a first-time visitor
 * must see first, "named sources" last because the featured card already states its source.
 * INHERIT-MANIFEST L18.
 * ⚠️ The licence NUMBER is not repeated here — the footer carries it on every page (K39), as the
 * delivery's own hero omits it; the line stays short enough for the first screen.
 * ⛔ No `aria-label` on the roundel: "18+" is its text, and ARIA prohibits a label on a generic span.
 * `role="list"`: WebKit drops the list role from a `ul` styled `list-style: none` (VoiceOver on iPhone).
 */
function TrustLines({ t }: { t: Dict }) {
  return (
    <ul className="kp-hero__trust" role="list">
      <li>
        <span className="kp-rg__18">{t.footer.eighteenPlus}</span>
        <span>{t.footer.licensedByGbt}</span>
      </li>
      <li>
        <span className="kp-hero__trust-glyph" aria-hidden><I.phone s={16} /></span>
        <span>{t.home.trustCell3H}</span>
      </li>
      <li>
        <span className="kp-hero__trust-glyph" aria-hidden><I.headset s={16} /></span>
        <span>
          {t.footer.stopGambling}{" "}
          {/* Label and number are separate unbreakable runs, so under large text the line breaks
              BETWEEN them and never inside the number (the footer's own shape). */}
          <a className="kp-hero__tel" href={`tel:${HELPLINE_TEL()}`}>
            <span>{t.footer.helpline}</span> <span>{HELPLINE()}</span>
          </a>
        </span>
      </li>
      <li>
        <span className="kp-hero__trust-glyph" aria-hidden><I.shieldcheck s={16} /></span>
        <span>{t.home.trustCell1H}</span>
      </li>
    </ul>
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
 *   of 0 and a predictor). ONE label, read by the price slot and the rail alike.
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
  const emptyLabel = price.kind === "oneSided" ? t.market.oneSideOnly : row.predictors === 0 ? t.home.heroNoPrice : t.market.noPoolYet;
  const oneSidedNote = price.kind === "oneSided" ? t.market.oneSidedNote.replace("{side}", sideWord(t, price.emptySide, "MARKET")) : null;
  // The card's own names for the pair, so one control has one vocabulary: no figure without a price.
  const yesAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", yesWord);
  const noAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(100 - price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", noWord);
  return (
    <li className="kp-qrow" data-price={price.kind} data-market-surface="board" data-row-id={row.id}>
      <Link href={`/markets/${row.id}` as never} className="kp-qrow__head">
        <span className="kp-qrow__q">{title}</span>
        <span className="kp-qrow__meta">
          <span className="kp-qrow__close">{closes}</span>
          {row.sourceName && (
            <>
              {" · "}
              <span className="kp-qrow__src">
                {settlesPre}
                <span className="kp-qrow__srcname" data-market-part="source">{row.sourceName}</span>
                {settlesPost}
              </span>
            </>
          )}
          {" · "}
          {/* The pool is REAL even when it is zero, so it is always stated (V18, K48). */}
          <span className="kp-qrow__pool" data-market-part="pool">{t.common.pool}{" "}{formatTzs(row.pool)}</span>
          {" · "}
          <span className="kp-qrow__depth" data-market-part="predictors">
            {formatNumber(row.predictors)}{" "}{row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}
          </span>
        </span>
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
        <Link href={`/markets/${row.id}?side=YES` as never} prefetch={false} className="btn btn-yes btn-md kp-qrow__btn" aria-label={yesAria}>
          {yesWord}{price.kind === "priced" && <span className="kp-qrow__at">{" @ "}{price.yesPct}%</span>}
        </Link>
        <Link href={`/markets/${row.id}?side=NO` as never} prefetch={false} className="btn btn-no btn-md kp-qrow__btn" aria-label={noAria}>
          {noWord}{price.kind === "priced" && <span className="kp-qrow__at">{" @ "}{100 - price.yesPct}%</span>}
        </Link>
      </div>
      {/* The refund rule (L22), the card's one conditional sentence, at the reading floor. */}
      {oneSidedNote && <p className="kp-qrow__note">{oneSidedNote}</p>}
    </li>
  );
}

export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards, mine }: Props) {
  const { featured } = figures;
  const chart = featured ? cards.charts.get(featured.id) : undefined;
  const yes = sideWord(t, "YES", "MARKET");
  const no = sideWord(t, "NO", "MARKET");

  return (
    <section className="kp-hero" data-band="hero">
      {/* `--solo`: an empty book has no featured market, and a two-column grid would leave its right
          half blank (and a doubled gap on a phone) — the pitch and the CTAs take the whole width. */}
      <div className={featured ? "kp-hero__inner" : "kp-hero__inner kp-hero__inner--solo"}>
        <div className="kp-hero__intro">
          {/* 🔴 `text-balance` ON EVERY EYEBROW. These are short uppercase mono labels, and when one
              wraps it drops its last token alone ("TANZANIA · DAR ES SALAAM · TANGU / 2026" at 320).
              A one-word second line under a letter-spaced label reads as a mistake rather than a
              wrap. V8b in the landing gate found them. */}
          <p className="kp-hero__eyebrow text-balance">
            <span className="kp-hero__tick" aria-hidden />
            {t.home.heroLocation} · {t.home.heroEst}
          </p>
          {/* The brand line stays English in every locale; its accents are the English words. */}
          {/* `lang="en"`: the brand line is English in every locale (ruling 12), so a Swahili or Chinese
              screen reader must pronounce it as English (WCAG 3.1.2). */}
          <h1 className="kp-hero__headline" lang="en">
            <Inked text={t.home.heroHeadline} yes="YES" no="NO" />
          </h1>
          {/* ⭐ THE BRAND LINE STAYS ENGLISH AND GETS A READING UNDERNEATH IT (owner decision,
              2026-09-24; MOBILE-VISUAL ruling 12). Rendered only where it says something new: in
              English the two strings are identical by design, and repeating a sentence directly
              under itself is worse than not translating it. Comparing the strings rather than
              testing the locale means a new locale gets the sub-line by filling the key. */}
          {t.home.heroHeadlineSub !== t.home.heroHeadline && (
            <p className="kp-hero__sub">
              <Inked text={t.home.heroHeadlineSub} yes={yes} no={no} />
            </p>
          )}
          {/* Same `break-keep` exception as the trust bodies, for the same measured reason: in zh it
              forbids breaking between characters, so the lede rendered three ragged lines where two
              would do. See the note in trust-band.tsx. */}
          <p className={`kp-hero__lede [overflow-wrap:anywhere]${locale === "zh" ? "" : " break-keep"}`}>{t.home.heroBody}</p>
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
          <TrustLines t={t} />
          {/* TWO CTAs, not three — `Sign in` lives in the header at every width. Below 1024 they
              follow the card and its trust lines (the delivery's placement map P4, and L18); from 1024
              they sit under the lede and the trust lines. */}
          {isAuthed ? (
            <SignedInAct t={t} mine={mine ?? null} />
          ) : (
            <div className="kp-hero__ctas">
              <Link href={"/auth/register" as never} className="btn btn-primary btn-xl rounded-pill kp-hero__cta">
                {t.common.createAccount}
                <I.arrowRight s={16} />
              </Link>
              <Link href={"/markets" as never} className="btn btn-ghost btn-xl rounded-pill kp-hero__cta">
                {fill(t.home.heroBrowseAll, { n: figures.openCount })}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * THE SIGNED-IN HERO (landing v3 · WP14 part 2 — the delivery's wallet scenario §4a and §4c).
 *
 * Where a visitor is offered "Create account", a player sees their own position: Your picks (open ·
 * awaiting result · paid this week), then the balance with Deposit and Withdraw side by side at the
 * SAME size (the Wallet's pair, V19) — or, at zero, the empty-balance prompt with Deposit and My
 * positions. Then Set limits.
 * ⛔ A FAILED READ SHOWS NOTHING, NEVER ZEROS (B-1): null `picks` hides the figures, null `balance`
 * hides the wallet box. A player with no picks at all gets one sentence, not three zeros — a row of
 * zeros is advertised emptiness, the dead state the gate's V11 exists for.
 * ⚠️ The trust lines stay above it for a player too: R4(5) puts the RG line in the hero's trust lines,
 * and a player holding money is who it is for (INHERIT-MANIFEST L21).
 * ⛔ A frozen wallet is offered no money buttons — the same rule as the Wallet (`wallet-sheet.tsx`).
 */
function SignedInAct({ t, mine }: { t: Dict; mine: LandingMine | null }) {
  const picks = mine?.picks ?? null;
  const balance = mine?.balance ?? null;
  const held = !!mine?.held;
  const noPicks = !!picks && picks.open === 0 && picks.awaiting === 0 && picks.paidThisWeekTzs === 0;
  // At zero the empty-balance prompt already says what to do next; the no-picks sentence beside it said it twice.
  const emptyWallet = !held && balance !== null && balance <= 0;
  return (
    <div className="kp-mine" data-testid="landing-mine">
      {picks && (noPicks ? (
        emptyWallet ? null : <p className="kp-mine__lead">{t.home.picksNone}</p>
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
      {held ? (
        <div className="kp-mine__held" role="status">
          <p className="kp-mine__held-t">{t.kycGate.frozenTitle}</p>
          <p className="kp-mine__held-b">{t.kycGate.frozenBody}</p>
        </div>
      ) : balance !== null && balance > 0 ? (
        <div className="kp-mine__wallet">
          <div className="kp-mine__bal">
            <p className="kp-mine__eyebrow">{t.wallet.available}</p>
            <p className="kp-mine__amt"><Cash>{formatTzs(balance)}</Cash></p>
          </div>
          <div className="kp-mine__pair">
            <Link href="/wallet/deposit" className="btn gilt-metal btn-lg kp-mine__act" data-testid="hero-deposit">
              <I.plus s={16} />
              {t.common.deposit}
            </Link>
            <Link href="/wallet/withdraw" className="btn btn-ghost btn-lg kp-mine__act" data-testid="hero-withdraw">
              <I.arrowUpFromLine s={16} />
              {t.common.withdraw}
            </Link>
          </div>
        </div>
      ) : balance !== null ? (
        <div className="kp-mine__empty">
          <p className="kp-mine__lead">{t.home.emptyBalance}</p>
          <div className="kp-hero__ctas">
            <Link href="/wallet/deposit" className="btn gilt-metal btn-xl rounded-pill kp-hero__cta" data-testid="hero-deposit">
              <I.plus s={16} />
              {t.common.deposit}
            </Link>
            <Link href={"/positions" as never} className="btn btn-ghost btn-xl rounded-pill kp-hero__cta">
              {t.home.myPositions}
            </Link>
          </div>
        </div>
      ) : null}
      <Link href="/profile/responsible-gambling" className="kp-mine__limits">
        {t.footer.setLimits}
        <I.arrowRight s={14} />
      </Link>
    </div>
  );
}

/**
 * The proof section — the three measured figures, the whole board's conviction, and the
 * closing-soonest board. It used to live INSIDE the hero, above the lede; v3 moves it directly below
 * the hero so the first screen shows the pitch and a live market (V15). The figures and the conviction
 * bar are unchanged; the board's rows are rebuilt by WP4 (`QuestionRow`): a list of rows with a title
 * link, a reading and a YES@/NO@ pair, each reading its time left from `nowMs`.
 */
export function LandingProof({ figures, t, locale, nowMs, paidOutTzs }: {
  figures: HeroFigures;
  t: Dict;
  locale: Locale;
  /** The page's one clock — the rows' time left and close dates read it, as the hero's card does. */
  nowMs: number;
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

        {/* ── the question board ───────────────────────────────────────────────────────────── */}
        {figures.board.length > 0 && (
          <div>
            {/* An h2: it names the board, which is a section. The class styles it as an eyebrow —
                a heading may look like one, and `test:eyebrow-roles` governs tracking, not tags. */}
            <h2 className="kp-hero__eyebrow text-balance">
              {t.home.heroBoardEyebrow}
              {figures.closingToday > 0 && (
                <> · {fill(t.home.heroBoardCloseToday, { n: figures.closingToday })}</>
              )}
            </h2>
            {/* `role="list"`: WebKit drops the list role from a `ul` styled `list-style: none`. */}
            <ul className="kp-qboard" role="list">
              {figures.board.map((row) => (
                <QuestionRow key={row.id} row={row} t={t} locale={locale} nowMs={nowMs} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
