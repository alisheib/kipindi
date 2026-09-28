/**
 * The landing hero — v3 (docs/design-system/v4-2026-09-26-landing-ten, WP2 + WP8), rebuilt
 * 2026-09-27 from `specs/hero-v3.md` under the owner's rulings R7, R8 and R9 (INHERIT-MANIFEST).
 *
 * ── THE ORDER, AND WHY ───────────────────────────────────────────────────────────────────────
 * claim → h1 → lede → trust rows → featured card → CTAs → sign-off. What 50pick is (the claim,
 * "Tanzania's first licensed prediction market"), the question it asks in the reader's own
 * language (the h1, "NDIO au HAPANA?"), what you do and what happens (the lede, two designed
 * lines), why to trust it (18+ · the Board's licence · the helpline; the wallets that pay out),
 * then a live market, then what to press, then the brand line as a sign-off. The trust rows sit
 * ABOVE the card since R7: after the card and the CTAs they never reached a phone's first screen
 * (ACCEPTANCE K29). They are the same rows for a visitor and a player. The proof rail, the
 * conviction bar and the closing-soonest board keep every rule they had in their own section
 * directly below (`LandingProof`).
 *
 * ⛔ THE GAMBLING-WARNING SENTENCE IS NOT IN THE HERO (R7(2)). The footer carries it, with the
 * helpline and the limit links, on every page; the hero keeps one quiet row — 18+, the licence line,
 * the helpline number. `npm run test:hero-copy` §4 fails if `stopGambling` comes back in here.
 *
 * ⛔ "FIRST" IS GATED. The claim reads `home.heroClaimFirst` only while `FIRST_LICENSED_EVIDENCE()`
 * (support-config.ts, its one home) returns a record — set 2026-09-27 by R9, the owner's attestation.
 * Setting it to null returns every language to "Licensed prediction market · Tanzania" in one change.
 *
 * ⚠️ SPACES. Every space between two elements is an explicit `{" "}` or sits inside a dict string:
 * SWC has dropped the whitespace around JSX expressions on production before.
 * ⚠️ `brand.tsx` is a "use client" module. `FiftyWordmark` and `FiftyMark` are rendered here as JSX
 * only — calling a helper exported by a client module from this server component once took every
 * page down while the typecheck and the build stayed green.
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
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";
import { FiftyMark, FiftyWordmark, TippingBar } from "@/components/brand";
import { fill, formatNumber, formatTzs, formatTzsCompact } from "@/lib/utils";
import { pickLocalized } from "@/lib/localized";
import { timeLeftLabel } from "@/lib/markets/time-left";
import { FIRST_LICENSED_EVIDENCE, HELPLINE, HELPLINE_TEL } from "@/lib/support-config";
import { railListParts } from "@/lib/rail-list";
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
  /**
   * The wallet names the second trust row may print — `heroRailNames()` (server/payout-rails.ts):
   * only rails whose payout path is live and that no officer has paused (R8(6)). Empty → no row.
   */
  rails: readonly string[];
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
 * The claim — "50pick │ Tanzania's first licensed prediction market" (spec §4; R9).
 *
 * ⭐ A CLASS OF ITS OWN, NOT THE SHARED EYEBROW: `.kp-hero__eyebrow` also styles the section labels
 * further down the page, and the claim is the brightest small text on the first screen (`--text`,
 * mono 600), where those are quiet labels. Its tracking joins the one 0.14em list in globals.css.
 * ⭐ THE WORDMARK IS THE LOGO USED AS A LOGO — below 1280 the header shows only the mark, so the name
 * "50pick" reaches the first screen here. From 1280 the header carries the wordmark and this one is
 * hidden (CSS), with its rule.
 * ⛔ "FIRST" IS READ ONLY INSIDE THE EVIDENCE BRANCH BELOW. `test:hero-copy` §1 fails if
 * `heroClaimFirst` is read anywhere else, or if any other string claims a first.
 * The text is stored in sentence case; CSS does the capitals.
 */
function Claim({ t }: { t: Dict }) {
  return (
    <p className="kp-hero__claim">
      <span className="kp-hero__claim-mark"><FiftyWordmark size={15} tz={false} /></span>{" "}
      <span className="kp-hero__claim-rule" aria-hidden />{" "}
      <span className="kp-hero__claim-text">{FIRST_LICENSED_EVIDENCE() ? t.home.heroClaimFirst : t.home.heroClaim}</span>
    </p>
  );
}

/**
 * The h1 — the question in the reader's language: "NDIO au HAPANA?" · "YES or NO?" · "是还是否？"
 * (INHERIT-MANIFEST R7(3)).
 *
 * ⭐ THE SIDE WORDS ARE THE BUTTONS' OWN WORDS BY CONSTRUCTION: `sideWord(t, …, "MARKET")` fills them,
 * so the headline cannot say "NDIYO" while the buttons say "NDIO". Each wears its outcome ink (§B2);
 * the connective ("au" / "or" / "还是") is the quiet word, one weight of the same face.
 * ⭐ TWO GROUPS THAT DO NOT BREAK INSIDE: "NDIO au" and "HAPANA?". The only break is the dict string's
 * own space after the connective (none in zh, which fits one line), so a narrow screen reads two
 * designed lines, never "NDIO" alone over "au HAPANA?".
 * ⛔ No `lang` attribute: since R7(3) the h1 IS in the page's language.
 * `test:hero-copy` §2 pins `{yes}` before `{no}`, each exactly once, in every locale; the fallback
 * below only keeps a malformed string readable.
 */
function Ask({ t }: { t: Dict }) {
  const yes = sideWord(t, "YES", "MARKET");
  const no = sideWord(t, "NO", "MARKET");
  const s = t.home.heroAsk;
  const a = s.indexOf("{yes}");
  const b = s.indexOf("{no}");
  if (a < 0 || b < a) return <h1 className="kp-hero__headline">{fill(s, { yes, no })}</h1>;
  const between = s.slice(a + "{yes}".length, b);
  const conn = between.trimEnd();
  const gap = between.slice(conn.length);
  return (
    <h1 className="kp-hero__headline">
      {s.slice(0, a)}
      <span className="kp-hero__grp">
        <span className="kp-hero__side" data-side="yes">{yes}</span>
        <span className="kp-hero__conn">{conn}</span>
      </span>
      {gap}
      <span className="kp-hero__grp">
        <span className="kp-hero__side" data-side="no">{no}</span>
        <span className="kp-hero__q">{s.slice(b + "{no}".length)}</span>
      </span>
    </h1>
  );
}

/**
 * The trust rows — ONE list, the same for a visitor and a player, above the featured card.
 *
 *   row 1 · 18+ · "Licensed by the Gaming Board of Tanzania." · the helpline, a `tel:` link
 *   row 2 · "Deposit and withdraw with M-Pesa, Airtel Money, HaloPesa or Mixx by Yas."
 *
 * ⭐ ROW 1 IS THE FOOTER'S OWN WORDS. `footer.eighteenPlus`, `footer.licensedByGbt` and
 * `footer.helpline` are assessed keys, reused verbatim, and the number is `HELPLINE()` from
 * `support-config.ts`, its one home. The gambling-warning SENTENCE is not here (R7(2)): the footer
 * keeps it on every page. The licence NUMBER stays in the footer too (K39).
 * ⭐ ROW 2 NAMES ONLY WALLETS THAT PAY OUT (R8(6)). `rails` is computed on the server from the money
 * path's own definitions (`server/payout-rails.ts`) and joined by `Intl.ListFormat` in the reader's
 * language (`rail-list.ts`): the names are never typed into the dictionary, and a rail an officer has
 * paused is not named while it is paused. No rails → no row, never "Deposit and withdraw with ."
 * ⭐ WHY ABOVE THE CARD: on a phone the rows after the card and the CTAs began below the first screen,
 * so 18+, the licence and the helpline never reached it (K29, P15). In the SOURCE, not by CSS
 * `order` — keyboard and screen-reader order must match the screen (WCAG 1.3.2).
 * ⚠️ Label and number are separate unbreakable runs, so under large text the line breaks BETWEEN
 * them and never inside "0800 11 0011" (the footer's own shape).
 * ⛔ No `aria-label` on the roundel: "18+" is its text, and ARIA prohibits a label on a generic span.
 * `role="list"`: WebKit drops the list role from a `ul` styled `list-style: none` (VoiceOver on iPhone).
 * ⚠️ `ul.kp-hero__trust` is read by the landing gate (V8's text map, V21) and by capture.mjs.
 */
function TrustLines({ t, locale, rails }: { t: Dict; locale: Locale; rails: readonly string[] }) {
  const parts = railListParts(locale, rails);
  const at = t.home.heroRails.indexOf("{rails}");
  const before = at < 0 ? t.home.heroRails : t.home.heroRails.slice(0, at);
  const after = at < 0 ? "" : t.home.heroRails.slice(at + "{rails}".length);
  return (
    <ul className="kp-hero__trust" role="list">
      <li>
        <span className="kp-rg__18">{t.footer.eighteenPlus}</span>
        <span>
          {t.footer.licensedByGbt}{" "}
          <a className="kp-hero__tel" href={`tel:${HELPLINE_TEL()}`}>
            <span>{t.footer.helpline}</span>{" "}<span>{HELPLINE()}</span>
          </a>
        </span>
      </li>
      {parts.length > 0 && (
        <li>
          <span className="kp-hero__trust-glyph" aria-hidden><I.mobileMoney s={16} /></span>
          <span>
            {before}
            {parts.map((p, i) => (p.rail ? <span key={i} className="kp-hero__rail">{p.text}</span> : p.text))}
            {after}
          </span>
        </li>
      )}
    </ul>
  );
}

function QuestionRow({ row, t, locale }: { row: HeroRow; t: Dict; locale: Locale }) {
  const Glyph = I[categoryGlyph(row.category)];
  /* ⭐ WP6 · the row's price state comes from its POOLS, exactly as the market card's does
     (`price-state.ts`): empty → "No bets yet"; one side only → "One side only" (ruling 13 — never
     "no bets", money is on it); both sides → the price within 1–99 (L14), and the lean rule drawn
     from that same figure. `row.yesPct` is the rounded share, which reads 100 on a one-sided pool. */
  const price = priceState(row.yesPool, row.noPool);
  return (
    <Link href={`/markets/${row.id}` as never} className="kp-qrow">
      <span className="kp-qrow__glyph" aria-hidden>
        <Glyph s={20} />
      </span>
      {/* ⛔ A MEASURE CEILING, NOT A WIDTH. The row is a grid whose middle track is 1fr, so the
          question grew with the viewport and nothing stopped it: 77 characters per line at 1024
          and 116 at 1280, against a comfortable 45–75 (measured on production 2026-09-24). At 360
          the column is 292px ≈ 44 characters, so this cap cannot touch a phone — it only stops the
          line running away on a desktop.
          🔴 44ch, NOT 68ch, AND THE NUMBER IS CALIBRATED RATHER THAN CHOSEN. `ch` is the advance of
          the digit ZERO, which in Sora at 17px is 12.97px — while the average character advance in
          running text is about 8.9px. A 68ch cap resolved to 882px and still produced 99 characters
          per line. 44ch ≈ 571px ≈ 64 characters in this face. ⚠️ If the question ever changes
          typeface this number is wrong again — V7 in the landing gate is what re-catches it. */}
      <span className="kp-qrow__q" style={{ maxWidth: "44ch" }}>{pickLocalized(locale, row.titleEn, row.titleSw, row.titleZh)}</span>
      {/* The pool is REAL even when it is zero, so it is always stated. Only the PRICE is
          withheld — that is the distinction `market-card.tsx` draws between `fresh` and
          `noPrice`, and the two surfaces have to draw it the same way. */}
      <span className="kp-qrow__sub">{formatTzs(row.pool)}</span>
      <span className="kp-qrow__price">
        {price.kind === "priced" ? (
          <>
            <span className="kp-qrow__num">{price.yesPct}</span>
            <span className="kp-qrow__unit">% {t.common.yes}</span>
          </>
        ) : (
          <>
            {/* Em-dash PLUS a labelled state — licence condition 1's exact prescription for an
                unknown. The dash alone would read to a screen reader as nothing at all. */}
            <span className="kp-qrow__num" aria-hidden>—</span>
            <span className="kp-qrow__unit kp-qrow__unit--label">
              {price.kind === "oneSided" ? t.market.oneSideOnly : t.home.heroNoPrice}
            </span>
          </>
        )}
      </span>
      {/* No lean rule without a price: a 50%-wide bar over an empty pool, or a full-width one over a
          one-sided pool, would be the same fabricated claim drawn instead of written. */}
      {price.kind === "priced" && (
        <span className="kp-qrow__lean" style={{ width: `${price.yesPct}%` }} aria-hidden />
      )}
    </Link>
  );
}

export function LandingHero({ figures, t, locale, isAuthed, nowMs, cards, mine, rails }: Props) {
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
              status="LIVE"
              selectionClosed={featured.selectionClosed}
              sourceUrl={featured.sourceUrl}
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
            <SignedInAct t={t} mine={mine ?? null} />
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
 * the hero so the first screen shows the pitch and a live market (V15). Nothing in it changed meaning.
 */
export function LandingProof({ figures, t, locale, paidOutTzs }: {
  figures: HeroFigures;
  t: Dict;
  locale: Locale;
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
            <div className="kp-qboard">
              {figures.board.map((row) => (
                <QuestionRow key={row.id} row={row} t={t} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
