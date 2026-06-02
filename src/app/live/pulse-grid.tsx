"use client";

import { useEffect, useRef, useState } from "react";
import { BrandSpinner } from "@/components/brand";
import { MarketCard } from "@/components/markets/market-card";

type Market = {
  id: string;
  titleEn: string;
  titleSw: string;
  category: string;
  yesPct: number;
  volume: number;
  predictors: number;
  timeLeft: string;
  move24h?: number;
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
  // Render in batches and append as the user scrolls — keeps the DOM light
  // (a live wall can be thousands of bars) and gives a real "loading more"
  // affordance instead of dumping everything at once.
  const [count, setCount] = useState(() => Math.min(BATCH, markets.length));
  const [appending, setAppending] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const hasMore = count < markets.length;

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
            setCount((c) => Math.min(c + BATCH, markets.length));
            setAppending(false);
            busyRef.current = false;
          }, 350);
        }
      },
      { rootMargin: "300px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, markets.length, count]); // re-arm after each append

  return (
    <>
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
          aria-busy={appending}
        >
          <BrandSpinner size={30} />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-subtle">
            Loading more · Inapakia zaidi
          </p>
        </div>
      )}
    </>
  );
}

/**
 * The same canonical MarketCard used on /markets and the homepage — wrapped in
 * an intersection-observer reveal so scrolling the live wall feels like it wakes
 * up one card at a time (snaps in immediately under reduced-motion).
 */
function PulseCard({ market, index }: { market: Market; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setRevealed(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTimeout(() => setRevealed(true), Math.min(index, 12) * 60);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 600ms cubic-bezier(.2,.8,.2,1), transform 600ms cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <MarketCard
        id={market.id}
        titleEn={market.titleEn}
        titleSw={market.titleSw}
        category={market.category}
        yesPct={market.yesPct}
        volume={market.volume}
        predictors={market.predictors}
        timeLeft={market.timeLeft}
        status="LIVE"
        move24h={market.move24h}
      />
    </div>
  );
}
