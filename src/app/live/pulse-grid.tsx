"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandSpinner, TippingBar } from "@/components/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { pickLocalized } from "@/lib/localized";
import { useT } from "@/lib/i18n";

type Market = {
  id: string;
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  category: string;
  yesPct: number;
  volume: number;
  predictors: number;
  timeLeft: string;
  selectionClosed?: boolean;
  move24h?: number;
  spark?: number[];
  traders?: string[];
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
  // Search-only (no filter tab): instant client-side filter of the already-loaded
  // live wall by question text (EN/SW) or category. Same kit search primitives as
  // the Markets board so height, sunken bg, focus ring, and iOS font polish match.
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter(
      (m) =>
        m.titleEn.toLowerCase().includes(q) ||
        (m.titleSw ?? "").toLowerCase().includes(q) ||
        (m.titleZh ?? "").toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q),
    );
  }, [markets, query]);

  // Render in batches and append as the user scrolls — keeps the DOM light
  // (a live wall can be thousands of bars) and gives a real "loading more"
  // affordance instead of dumping everything at once.
  const [count, setCount] = useState(() => Math.min(BATCH, markets.length));
  const [appending, setAppending] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const hasMore = count < filtered.length;

  // Reset the visible batch whenever the filtered set changes (new query).
  useEffect(() => {
    setCount(Math.min(BATCH, filtered.length));
  }, [filtered.length, query]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !busyRef.current) {
          busyRef.current = true;
          setAppending(true);
          // a short, kit-consistent loader beat, then reveal the next batch
          window.setTimeout(() => {
            setCount((c) => Math.min(c + BATCH, filtered.length));
            setAppending(false);
            busyRef.current = false;
          }, 350);
        }
      },
      { rootMargin: "300px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, filtered.length, count]); // re-arm after each append

  return (
    <>
      <div className="input-group market-search max-w-[460px]">
        <span className="prefix" aria-hidden>
          <I.search s={16} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.common.searchLiveMarkets}
          aria-label={t.common.searchLiveMarkets}
          enterKeyHint="search"
          autoComplete="off"
          className="input input-mono"
        />
        {query && (
          <button
            type="button"
            aria-label={t.common.clearSearch}
            className="clear-btn"
            onClick={() => setQuery("")}
          >
            <I.x s={15} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          kind="markets"
          title={`${t.market.noLiveMatch} “${query.trim()}”`}
          action={
            <button type="button" className="btn btn-ghost btn-sm btn-pill" onClick={() => setQuery("")}>
              {t.common.clearSearch}
            </button>
          }
        />
      ) : (
        <div className="market-grid">
          {filtered.slice(0, count).map((m, i) => (
            <PulseCard key={m.id} market={m} index={i} />
          ))}
        </div>
      )}

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex flex-col items-center gap-2.5 py-8"
          aria-live="polite"
          aria-busy={appending}
        >
          <BrandSpinner size={30} />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-subtle">
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
  return (
    <Link
      href={`/markets/${market.id}` as never}
      className="kp-rise group flex flex-col rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
          <Cat s={13} />
          {market.category}
        </span>
        <span className={`inline-flex items-center gap-1 font-mono text-[10px] tabular-nums ${market.selectionClosed ? "text-gold-300" : "text-text-subtle"}`}>
          {market.selectionClosed && <I.hourglassOff s={11} />}
          {market.timeLeft}
        </span>
      </div>
      <h3 className="min-h-[2.6em] font-display text-[13.5px] font-semibold leading-snug text-text line-clamp-2 group-hover:text-aqua-200">
        {title}
      </h3>
      <div className="mt-3">
        <TippingBar yesPct={yes} height={9} showLabels={false} recastOnHover={false} />
      </div>
      <div className="mt-2.5 flex items-center justify-between font-mono text-[12px] tabular-nums">
        <span className="font-bold text-yes-300">{t.common.yes} <span className="opacity-75">@ {yes}%</span></span>
        <span className="font-bold text-no-300">{t.common.no} <span className="opacity-75">@ {100 - yes}%</span></span>
      </div>
    </Link>
  );
}
