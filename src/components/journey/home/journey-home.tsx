/**
 * THE JOURNEY HOME ON `/` — the deck's home (frame 1) for a journey reader, in 50pick's look (the Vodacom plan S7:
 * VODACOM-PLAN §3.2 and SJ-6/SJ-7; `S7-PLAN.md` WP7 with amendments A5(c), A7, A16, A17 and A24; the S4 boards
 * pick-1-home, s4-3-home-desktop, s4-3-home-chips, s4-3-home-empty and s4-3-home-end). `app/page.tsx` renders it for a
 * journey request alone, inside a Suspense boundary whose fallback is the home's ghost; every other reader is served the
 * classic landing, untouched.
 *
 * ⭐ THE ORDER IS THE DECK'S, AT EVERY WIDTH (§3.2's order; A16 item 1): the How-to card, the headline, the topic chips,
 * the search line when a search is set, the questions, "Onyesha zaidi" — or, where there are no questions, one of three
 * empty states. Below 1024 the head is a column; from 1024 CSS draws the headline left of the How-to card on one row
 * (`order: -1`, the desktop board's flex values), the markup unchanged, so the tab order is too.
 * ⭐ IT DECIDES NOTHING ITSELF — WP3's pure rules do (`home-list.ts`): the address's category, search and page
 * (`parseHomeParams`, against the platform's closed category list), the questions that take a bet now in the home's
 * order (`homeBook`, handed the bet path's own test, `bettableAt`), the chips (`homeChips`), what one page of
 * "Onyesha zaidi" reaches and which empty state applies (`homeView`, through the one paging rule, `pageCumulative`, at
 * the product's page of twelve), and every link (`homeHref`: only what is set, always cat, q, page). The search is the
 * product's one grammar over the stored question (`MARKET_SEARCH`, as `/live` matches it), so a field chip it advertises
 * matches here too.
 * ⭐ ONE READ OF THE BOOK, ON THE PRODUCT DEFAULT: `listMarkets({ status: "LIVE" })` reads long-form questions only (the
 * player boards' protection, `test:product-line` MUST_STAY_DEFAULT names this file): Up & Down rounds stay on Juu/Chini.
 * ⛔ No `.catch()`: a failed read throws to the route's error boundary, never "no open questions right now" drawn over a
 * live book (B-1, `/live`'s rule).
 * ⭐ ITS CLIENT PARTS COME THROUGH THE HOME'S LAZY MODULE ALONE (`home-lazy.tsx`, WP6): the How-to card and its sheet, the
 * 30-second refresh, the kit's empty state and the chips rail's framing — so a classic visitor's first load of `/` gains
 * that small module's declarations and none of their code (§0h point 20). The rest is server markup: the journey card
 * (WP5), the journey's one show-more control (`show-more.tsx`, journey /live's too), the kit's FilterPill and Link.
 * ⭐ THE REFRESH IS THE POLLER ALONE (A7): every 30 seconds, and no listener for the odds event — the SSE patch for cards
 * on screen is S8's, beside the bet sheet's own listener (`test:journey-home` §7 refuses one here or on the card).
 * ⛔ A SETTING IS NEVER APPLIED OUT OF SIGHT (§0h point 23's lesson): a selected category keeps its chip, a search is said
 * in a line of its own with its way out (or, when it matched nothing, by the empty state that names it).
 * `test:journey-home` §6 (the route file) and §7 (this view) hold it.
 */
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { JourneyCard } from "@/components/journey/cards/journey-card";
import { ShowMore } from "@/components/journey/show-more";
import { LinkPending } from "@/components/ui/link-pending";
import { I } from "@/components/ui/glyphs";
import { PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { getServerT } from "@/lib/i18n-server";
import { getSession } from "@/lib/server/session";
import { listMarkets, type StoredMarket } from "@/lib/server/market-service";
import { bettableAt, journeyCardState, type SheetSeed } from "@/lib/server/journey-sheet";
import { formatBreakEnd, type BreakState } from "@/lib/break-end";
import { keepText } from "@/components/ui/keep-run";
import { homeBook, homeChips, homeHref, homeView, parseHomeParams, type HomeChip, type HomeParams, type HomeSearch, type HomeView } from "@/lib/journey/home-list";
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { fieldNames, matchesQuery, MARKET_SEARCH, parseQuery } from "@/lib/search";
import { marketCategoryLabel } from "@/lib/localized";
import { fill } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { LazyEmptyState, LazyHowToCard, LazyRefreshPoller, LazyStripAutoScroll } from "./home-lazy";
import { HomeChips } from "./home-chips";
import { HomeHeadline } from "./home-headline";

/** The home's refresh (§3.2): a server re-render every 30 seconds while the tab is visible. */
const REFRESH_MS = 30_000;

/** The reads, then the drawing. */
export async function JourneyHome({ searchParams }: { searchParams: Promise<HomeSearch> }) {
  const [{ t, locale }, session, live, sp] = await Promise.all([
    getServerT(),
    // Signed in only decides where the How-to sheet's "Weka mipaka" goes (WP6 step 4).
    getSession(),
    listMarkets({ status: "LIVE" }),
    searchParams,
  ]);
  const nowMs = Date.now();
  const params = parseHomeParams(sp, MARKET_CATEGORIES);
  const book = homeBook(live, nowMs, bettableAt);
  const search = parseQuery(params.q, { fields: fieldNames(MARKET_SEARCH) });
  const view = homeView(book, params, PLAYER_PER_PAGE, (m) =>
    matchesQuery(search, m as unknown as Record<string, string | null | undefined>, MARKET_SEARCH));
  const { onBreak, seeds } = await journeyCardState(view.shown, nowMs, session?.userId);
  return (
    <JourneyHomeView
      t={t}
      locale={locale}
      nowMs={nowMs}
      params={params}
      chips={homeChips(book, params.cat)}
      view={view}
      signedIn={session !== null}
      onBreak={onBreak}
      seeds={seeds}
    />
  );
}

/** The home as the reads leave it: the server markup, its lazy parts placed where the deck puts them. */
export function JourneyHomeView({ t, locale, nowMs, params, chips, view, signedIn, onBreak = null, seeds }: {
  t: Dict;
  locale: Locale;
  /** The render's clock: every card reads it (WP5). */
  nowMs: number;
  params: HomeParams;
  chips: readonly HomeChip[];
  view: HomeView<StoredMarket>;
  signedIn: boolean;
  onBreak?: BreakState | null;
  seeds?: ReadonlyMap<string, SheetSeed>;
}) {
  const { cat, q } = params;
  /* The way out of a search, wherever it is said: the same address with the search gone, the category kept. */
  const clearSearch = (
    <Link href={homeHref({ cat }) as never} replace scroll={false} className="btn btn-ghost btn-md">
      <I.x s={16} edge="start" />
      {t.common.clearSearch}
      <LinkPending />
    </Link>
  );
  return (
    <PageContainer tier="board">
      <div className="kp-jhome" data-testid="journey-home">
        {onBreak && (() => {
          const date = formatBreakEnd(Date.parse(onBreak.until), nowMs, t.common.monthsShort, locale);
          return <div className="kp-jhome__break rounded-xl border border-border bg-bg-elevated p-4 text-body-sm" role="status" data-testid="journey-home-break">
            {/* The sentence is ONE flex item (S8-PLAN A25 item 16, tile 059): its kept runs were each their own item, so the
                row's 8px gap opened between "until" and its date — a 12px hole in a sentence. */}
            <p className="font-semibold text-text flex items-start gap-2"><I.lock s={16} /><span>{keepText(fill(onBreak.exclusion ? t.rg.exclusionActive : t.journey.homeBreakTitle, { date }), [date])}</span></p>
            {!onBreak.exclusion && <p className="mt-1 text-text-muted">{t.journey.homeBreakBody}</p>}
          </div>;
        })()}
        <div className="kp-jhome__head">
          <LazyHowToCard signedIn={signedIn} />
          <HomeHeadline t={t} />
        </div>
        <HomeChips chips={chips} selected={cat} q={q} t={t} />
        {q !== "" && view.empty !== "q" && (
          <div className="kp-jhome__query">
            <p className="kp-jhome__query-text text-body-sm">{fill(t.journey.homeQueryLine, { q })}</p>
            {clearSearch}
          </div>
        )}
        {view.empty === null ? (
          <>
            <ul role="list" className="kp-jgrid">
              {view.shown.map((m) => (
                <li key={m.id}>
                  <JourneyCard m={m} nowMs={nowMs} t={t} locale={locale} from="home" sheet={seeds?.get(m.id)} onBreak={onBreak} />
                </li>
              ))}
            </ul>
            {view.more && <ShowMore href={homeHref({ cat, q, page: view.page + 1 })} t={t} />}
          </>
        ) : view.empty === "cat" && cat !== null ? (
          <LazyEmptyState
            fill
            kind="markets"
            title={fill(t.journey.homeEmptyCatTitle, { cat: marketCategoryLabel(t, cat) })}
            body={t.journey.homeEmptyBody}
            action={(
              <Link href={homeHref({ q }) as never} replace scroll={false} className="btn btn-ghost btn-md">
                {t.journey.homeEmptyAll}
                <LinkPending />
              </Link>
            )}
          />
        ) : view.empty === "q" ? (
          <LazyEmptyState fill kind="markets" title={fill(t.journey.homeQueryNone, { q })} action={clearSearch} />
        ) : (
          <LazyEmptyState fill kind="markets" title={t.journey.homeEmptyTitle} body={t.journey.homeEmptyBody} />
        )}
        <LazyStripAutoScroll />
        <LazyRefreshPoller intervalMs={REFRESH_MS} />
      </div>
    </PageContainer>
  );
}
