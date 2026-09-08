"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandSpinner, TippingBar } from "@/components/brand";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { pickLocalized } from "@/lib/localized";
import { useT } from "@/lib/i18n";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, MARKET_SEARCH } from "@/lib/search";
import { sideWord } from "@/lib/side-label";

type Market = {
  id: string;
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  category: string;
  /** 0..100, or **null** when the pool is empty — there is no crowd price to state (PV-06). */
  yesPct: number | null;
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
 *
 * Tipping markets (within 8 of 50/50) get a subtle warning-amber border
 * because they're the most contested — the most interesting stories.
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
          every other surface that uses it wraps it the same way. */}
      <Suspense>
        <SearchBox
          placeholder={t.common.searchLiveMarkets}
          ariaLabel={t.common.searchLiveMarkets}
          helpFields={fieldNames(MARKET_SEARCH)}
        />
      </Suspense>

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
  const yes = market.yesPct;
  const isUpDown = market.productLine === "UPDOWN";
  // Up & Down rounds link to their OWN page (via roundId), never the poll detail.
  const href = isUpDown ? (market.roundId ? `/updown/${market.roundId}` : "/updown") : `/markets/${market.id}`;
  return (
    <Link
      href={href as never}
      className="kp-rise group flex flex-col rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-micro uppercase eyebrow text-text-subtle">
          {isUpDown ? (
            // The game tag — so a mixed wall reads as two games at a glance.
            <span className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-bold tracking-[0.10em]"
                  style={{ background: "var(--pill-active)", border: "1px solid var(--brand-500)", color: "var(--brand-200)" }}>
              <I.trendingUp s={11} /> {t.market.udTitle}
            </span>
          ) : (
            <><Cat s={13} />{market.category}</>
          )}
        </span>
        <span className={`inline-flex items-center gap-1 font-mono text-[10px] tabular-nums ${market.selectionClosed ? "text-gold-300" : "text-text-subtle"}`}>
          {market.selectionClosed && <I.hourglassOff s={11} />}
          {market.timeLeft}
        </span>
      </div>
      <h3 className="min-h-[2.6em] font-display text-[13.5px] font-semibold leading-snug text-text line-clamp-2 group-hover:text-aqua-200">
        {title}
      </h3>
      {/* 🔴 PV-06, second pass · 2026-09-03. This bar carried NO `empty` prop, so the kit's
          cold-start rail was structurally UNREACHABLE on this wall no matter what the pool
          held — and `yesPct` arrived from `impliedYesPct`, which hands out a hardcoded 50 on
          an empty one. An untouched market therefore advertised "@ 50% · @ 50%" here as a
          crowd price, on the board whose entire purpose is to show where the crowd is.
          ⛔ The percentages go with it: a price nobody set must not be printed either. */}
      <div className="mt-3">
        {yes === null ? (
          <TippingBar height={9} showLabels={false} recastOnHover={false}
            empty emptyLabel={t.market.noBetsYet} />
        ) : (
          <TippingBar yesPct={yes} height={9} showLabels={false} recastOnHover={false}
            probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", isUpDown ? "UPDOWN" : "MARKET"))} />
        )}
      </div>
      {/* ⚠️ THE `mt-2.5` IS HOISTED ONTO THE WRAPPER, NOT REPEATED IN BOTH ARMS — caught by
          `test:spacing-scale`, which ratchets "inverted" keys downward only. The scale is
          OVERRIDDEN here (tailwind.config.ts), so `2.5` paints 10px while `2` paints 12px: a key
          that reads bigger and paints smaller. Writing it in each branch added a 562nd usage
          against a ceiling of 561. One wrapper is also simply the right structure. */}
      <div className="mt-2.5">
        {yes === null ? (
          <div className="text-center font-mono text-[12px] text-text-subtle">{t.market.noBetsYet}</div>
        ) : (
          <div className="flex items-center justify-between font-mono text-[12px] tabular-nums">
            <span className="font-bold text-yes-300">{isUpDown ? t.market.udUp : t.common.yes} <span className="opacity-75">@ {yes}%</span></span>
            <span className="font-bold text-no-300">{isUpDown ? t.market.udDown : t.common.no} <span className="opacity-75">@ {100 - yes}%</span></span>
          </div>
        )}
      </div>
    </Link>
  );
}
