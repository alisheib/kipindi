"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandSpinner, TippingBar } from "@/components/brand";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { marketCategoryLabel, pickLocalized } from "@/lib/localized";
import { useT } from "@/lib/i18n";
import { SearchBox } from "@/components/ui/search-box";
import { QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";
import { keepFigures } from "@/components/ui/keep-words";
import { fieldNames, MARKET_SEARCH } from "@/lib/search";
import { sideWord } from "@/lib/side-label";
import { priceState } from "@/lib/markets/price-state";

type Market = {
  id: string;
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  category: string;
  /** The two POOLS, never a finished price: the card decides its state from them (`priceState`, C1). */
  yesPool: number;
  noPool: number;
  volume: number;
  predictors: number;
  timeLeft: string;
  selectionClosed?: boolean;
  move24h?: number;
  spark?: number[];
  traders?: string[];
  /** Which game this card belongs to — /live is the one board that mixes both. */
  productLine?: "MARKET" | "UPDOWN";
  /** For an Up & Down round: its round id, so the card links to /updown/[roundId]. */
  roundId?: string | null;
};

/**
 * The signature 50pick "wall of bars". Each card reveals on intersection-
 * observer with a 60ms stagger so scrolling feels like the wall waking up
 * one bar at a time.
 */
const BATCH = 24;

export function LivePulseGrid({ markets }: { markets: Market[] }) {
  const { t } = useT();
  /**
   * ⛔ THE FILTER IS GONE FROM HERE — it lives on the server now (PLAYER QUERY, task 4.9). What
   * arrives in `markets` is already the searched set, so this component's only job is to reveal it
   * in batches. Keeping a second filter would be two definitions of "matches", and the one that
   * used to live here matched a SNAPSHOT missing two of the five columns its own chips advertised.
   */
  // Render in batches and append as the user scrolls — keeps the DOM light
  // (a live wall can be thousands of bars) and gives a real "loading more"
  // affordance instead of dumping everything at once.
  const [count, setCount] = useState(() => Math.min(BATCH, markets.length));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const hasMore = count < markets.length;

  /**
   * B-17 — a DATA change only CLAMPS the visible count into range; it never resets it, so the 15s
   * poll tick cannot chop a scrolled reader back to 24 cards.
   *
   * ⚠️ THE OLD "RESET ON A NEW QUERY" EFFECT IS GONE AND IS NOT NEEDED. A new query is now a new
   * URL, so the server re-renders with a different `markets` array and this component remounts its
   * count from the initialiser — the reset happens by navigation instead of by an effect watching
   * a piece of state this file no longer holds.
   */
  useEffect(() => {
    setCount((c) => Math.min(Math.max(c, Math.min(BATCH, markets.length)), Math.max(markets.length, BATCH)));
  }, [markets.length]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !busyRef.current) {
          busyRef.current = true;
          // V-6 — the next batch is in-memory; the 350ms setTimeout here was
          // manufactured latency and is gone. Reveal immediately.
          setCount((c) => Math.min(c + BATCH, markets.length));
          busyRef.current = false;
        }
      },
      { rootMargin: "300px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, markets.length, count]); // re-arm after each append

  return (
    <>
      {/**
        * ⭐ `mode="url"` (THE DEFAULT) — PLAYER QUERY, TASK 4.9. It was `controlled`, with the
        * reason *"the wall is already loaded, so a URL round-trip would buy nothing here."*
        *
        * 🔴 IT BOUGHT MORE THAN A SHAREABLE LINK: IT BOUGHT AN HONEST HEADER. The count line in
        * `page.tsx` was computed over the UNFILTERED board while this component filtered, so
        * typing `zzz` printed "40 live · 6 tipping" and a six-slide featured carousel above an
        * empty grid — `counts.ts`'s opening paragraph, live. With the query in the URL the server
        * filters once and the count, the hero and this wall come from ONE array.
        *
        * ⭐ AND IT REPAIRS THE SEARCH: the snapshot this component received carries neither
        * `resolutionCriterion` nor `status`, while the chips below advertise both. Matching now
        * happens against the stored market, so every advertised field is real.
        *
        * ⚠️ The batch-append reveal is untouched — the URL drives WHICH markets arrive, not how
        * many of them are painted at once.
        */}
      {/* ⚠️ SUSPENSE: in `url` mode `SearchBox` reads `useSearchParams`, which needs a boundary —
          every other surface that uses it wraps it the same way.
          ⭐ THE SEARCH IS A BAND (round 4 of the visual pass, 2026-10-09, R4-C's leftover; tile 205 measured 49px under the
          box): `QUERY_SEARCH_BAND_CLASS`, as on every other page with a search. /live has no query bar, so the box's echo row
          lies 15px into the gap below it (globals.css `.kp-search-band`): on the page's 24px rung the box stands 34 under
          the hero and the wall 34 under the box — 24 + 10 over, 25 − 15 + 24 under — where it stood 24 over and 49 under. */}
      <div className={QUERY_SEARCH_BAND_CLASS}>
        <Suspense>
          <SearchBox
            placeholder={t.common.searchLiveMarkets}
            ariaLabel={t.common.searchLiveMarkets}
            helpFields={fieldNames(MARKET_SEARCH)}
          />
        </Suspense>
      </div>

      {/* ⛔ The search-miss empty state lives in `page.tsx` now, beside the count it must agree
          with. A second one here would be a second definition of "nothing matched". */}
      <div className="market-grid">
        {markets.slice(0, count).map((m, i) => (
          <PulseCard key={m.id} market={m} index={i} />
        ))}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex flex-col items-center gap-2.5 py-8"
          aria-live="polite"
        >
          <BrandSpinner size={30} />
          <p className="font-mono text-micro uppercase tracking-[0.16em] text-text-subtle">
            {t.common.loadingMore}
          </p>
        </div>
      )}
    </>
  );
}

/**
 * Renders a title with every hyphenated token ("30-day", "month-end?", "Man-City") in a nowrap span, so a balanced
 * wrap can move the whole token but never break after its hyphen (E-400 ⑦b). `hyphenParts` (below) puts the tokens at
 * odd indices and the text between them — spaces included — at even ones, so no space is added or lost.
 * ⭐ ROUND 4 (2026-10-09, edges 197 255): a token stops at an ideograph, its hyphen touches a letter, and the text
 * between the tokens keeps its figures whole. `\S*` ran across Chinese, which has no spaces, so
 * "辛巴俱乐部赢得2026-27赛季NBC超级联赛" was ONE token — the whole title in one nowrap span, wider than any card. A token
 * is now a run of non-space, non-Han characters around a hyphen with a letter on one side ("month-end?", "30-day"); a
 * range of two numbers ("2026-27") is a figure, and `keepFigures` (keep-words.tsx, the cards' and the market page's own
 * rule) shapes the text between the tokens, so "2026-27赛季" and "dakika 28:00" never break inside. A part with no
 * figure renders as the plain text it was (a keyed fragment, no element).
 */
export function KeepHyphenated({ text }: { text: string }) {
  const parts = hyphenParts(text);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : <Fragment key={i}>{keepFigures(part)}</Fragment>))}</>;
}

/* ⭐ THE SPLIT, IN ONE PASS (review 6, B-3 · 2026-10-09). It was one pattern —
       text.split(/([^\s\p{Script=Han}]*(?:\p{L}-[\p{L}\p{N}]|\p{N}-\p{L})[^\s\p{Script=Han}]*)/u)
   — which tried every start of a run that held no hyphen and ran to the run's end from each, so one long unbroken title
   cost the square of its length. `hyphenParts` returns that split's very array (text, token, text, … , text), read once
   over the code points: a token starts where the pattern's would — the first place whose run of non-space, non-Han
   characters reaches a hyphen's core (a letter, "-", a letter or a number; or a number, "-", a letter) — takes the LAST
   core that run reaches (the pattern's greedy start), and runs on to the end of the run after it. */
const NOT_IN_TOKEN = /[\s\p{Script=Han}]/u;
const LETTER = /\p{L}/u;
const NUMBER = /\p{N}/u;
export function hyphenParts(text: string): string[] {
  const cp = Array.from(text);
  const n = cp.length;
  // runEnd[i]: where the run of non-space, non-Han characters starting at i ends (i itself when cp[i] is neither).
  const runEnd = new Array<number>(n + 1);
  runEnd[n] = n;
  for (let i = n - 1; i >= 0; i--) runEnd[i] = NOT_IN_TOKEN.test(cp[i]) ? i : runEnd[i + 1];
  const core = (i: number) => i + 2 < n && cp[i + 1] === "-"
    && ((LETTER.test(cp[i]) && (LETTER.test(cp[i + 2]) || NUMBER.test(cp[i + 2]))) || (NUMBER.test(cp[i]) && LETTER.test(cp[i + 2])));
  // lastCore[i]: the last place at or before i where a core starts, or −1.
  const lastCore = new Array<number>(n + 1);
  for (let i = 0; i <= n; i++) lastCore[i] = core(i) ? i : i > 0 ? lastCore[i - 1] : -1;
  const parts: string[] = [];
  let from = 0;
  for (let q = 0; q < n; ) {
    const at = lastCore[runEnd[q]];
    if (at < q) { q++; continue; }
    const end = runEnd[at + 3];
    parts.push(cp.slice(from, q).join(""), cp.slice(q, end).join(""));
    from = q = end;
  }
  parts.push(cp.slice(from).join(""));
  return parts;
}

/**
 * ⭐ ONE TOP ROW IN EITHER STATE (2026-10-09, the visual pass's round 4, tile 178 at 1280). The Up & Down tag is a boxed
 * chip — 2px of padding and a 1px rule above and below its 14px line, 20px — and a market's category was the bare 14px
 * line, so a grid row holding both set its titles 724 against 719, its bars 797 against 792 and its captions 816 against
 * 811. The bare label now takes the chip's vertical box with a clear rule, so the row is 20px either way and every row
 * under it levels across the wall. One constant, so the two can never disagree again.
 */
const TAG_BOX_Y = "py-0.5 border-y";

/**
 * C1e — the DENSE TippingBar-wall card that gives /live its own identity (so it
 * stops being /markets with a different URL): category + time · title · the bar ·
 * the @ prices. No spark / trader crest / KPI strip / big buttons — the point is
 * a fast, scannable wall of live odds. Uniform height via the 2-line title clamp.
 * Entrance is the pure-CSS staggered rise (.kp-rise) — always ends at opacity 1.
 */
function PulseCard({ market, index }: { market: Market; index: number }) {
  const { t, locale } = useT();
  const title = pickLocalized(locale, market.titleEn, market.titleSw, market.titleZh);
  const Cat = I[categoryGlyph(market.category)];
  const isUpDown = market.productLine === "UPDOWN";
  const productLine = isUpDown ? "UPDOWN" : "MARKET";
  // ⭐ C1 · the card's rule: a price only where both pools hold money; otherwise the dashed rail NAMED for
  // its state — "One side only" where money sits on one side, "No bets yet" only where nobody ever bet,
  // "No pool yet" where a cash-out emptied it.
  const price = priceState(market.yesPool, market.noPool);
  const noPriceWord = price.kind === "oneSided" ? t.market.oneSideOnly
    : market.predictors === 0 ? t.market.noBetsYet : t.market.noPoolYet;
  // Up & Down rounds link to their OWN page (via roundId), never the poll detail.
  const href = isUpDown ? (market.roundId ? `/updown/${market.roundId}` : "/updown") : `/markets/${market.id}`;
  return (
    <Link
      href={href as never}
      data-price-state={price.kind}
      className="kp-rise group flex flex-col rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">
          {isUpDown ? (
            // The game tag — so a mixed wall reads as two games at a glance.
            <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 ${TAG_BOX_Y} font-bold tracking-[0.10em]`}
                  style={{ background: "var(--pill-active)", border: "1px solid var(--brand-500)", color: "var(--brand-200)" }}>
              <I.trendingUp s={11} /> {t.market.udTitle}
            </span>
          ) : (
            // The translated category, never the stored id (that printed CRYPTO / SPORTS on sw and zh pages).
            <span className={`inline-flex items-center gap-1.5 ${TAG_BOX_Y} border-transparent`}>
              <Cat s={13} />{marketCategoryLabel(t, market.category)}
            </span>
          )}
        </span>
        {/* A closed selection is CLOSED — royal (§B11), the dictionary's word ink, never gold (Q5; R5-C, 2026-10-09). */}
        <span className={`inline-flex items-center gap-1 font-mono text-[10px] tabular-nums ${market.selectionClosed ? "text-brand-300" : "text-text-subtle"}`}>
          {market.selectionClosed && <I.hourglassOff s={11} />}
          {market.timeLeft}
        </span>
      </div>
      {/* text-balance: "by month-end?" broke at its hyphen and left "end?" alone on line two (visual pass 2).
          🔴 AND BALANCING STILL BROKE AT A HYPHEN (2026-09-14, register E-400 ⑦b): "30-" / "day". A title is market
          data, not dictionary copy, so the fix cannot be a word joiner in a string — `KeepHyphenated` keeps each
          hyphenated token on one line at render. And the two-line clamp cut a long Swahili question before its
          deadline, which is the word a bettor needs: Swahili gets three lines, with the minimum height moved with it
          so every card in the wall keeps one height.
          ⚠️ The minimum is an EXACT multiple of `leading-snug` (1.375): it was 2.6em, a hair under two lines, so a
          one-line title sat 2px shorter than a two-line one (measured 35 vs 37px) and the bars below them did not line up. */}
      <h3
        className={`font-display text-[13.5px] font-semibold leading-snug text-text text-balance group-hover:text-aqua-200 ${
          locale === "sw" ? "min-h-[4.125em] line-clamp-3" : "min-h-[2.75em] line-clamp-2"
        }`}
        data-title-lines={locale === "sw" ? 3 : 2}
      >
        <KeepHyphenated text={title} />
      </h3>
      {/* 🔴 PV-06, second pass · 2026-09-03: this bar carried NO `empty` prop, so an untouched market
          advertised "@ 50% · @ 50%" here as a crowd price. ⛔ C1: nor may a one-sided pool print
          "@ 100% · @ 0%" — a price needs two sides (ruling 13). The percentages go with the bar. */}
      <div className="mt-3">
        {price.kind !== "priced" ? (
          <TippingBar height={9} showLabels={false} recastOnHover={false}
            empty emptyLabel={noPriceWord} />
        ) : (
          <TippingBar yesPct={price.yesPct} height={9} showLabels={false} recastOnHover={false}
            probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", productLine))} />
        )}
      </div>
      {/* ⚠️ THE `mt-2.5` IS HOISTED ONTO THE WRAPPER, NOT REPEATED IN BOTH ARMS — caught by
          `test:spacing-scale`, which ratchets "inverted" keys downward only. The scale is
          OVERRIDDEN here (tailwind.config.ts), so `2.5` paints 10px while `2` paints 12px: a key
          that reads bigger and paints smaller. Writing it in each branch added a 562nd usage
          against a ceiling of 561. One wrapper is also simply the right structure. */}
      <div className="mt-2.5">
        {price.kind !== "priced" ? (
          <div className="text-center font-mono text-[12px] text-text-subtle">{noPriceWord}</div>
        ) : (
          <div className="flex items-center justify-between font-mono text-[12px] tabular-nums">
            <span className="font-bold text-yes-300">{sideWord(t, "YES", productLine)} <span className="opacity-75">@ {price.yesPct}%</span></span>
            <span className="font-bold text-no-300">{sideWord(t, "NO", productLine)} <span className="opacity-75">@ {100 - price.yesPct}%</span></span>
          </div>
        )}
      </div>
      {/* L22 · the refund rule on every unsettled one-sided card (/live shows no settled row). Up & Down tiles
          read the same sentence in their own side words: `udNobodyBacked` addresses a stake-holder. */}
      {price.kind === "oneSided" && (
        <p className="mcardp-onesided-note mt-2">{t.market.oneSidedNote.replace("{side}", sideWord(t, price.emptySide, productLine))}</p>
      )}
    </Link>
  );
}
