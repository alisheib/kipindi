"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TippingBar, BrandSpinner } from "@/components/brand";
import { ExternalLink } from "lucide-react";

type Market = {
  id: string;
  titleEn: string;
  titleSw: string;
  category: string;
  yesPct: number;
  volume: number;
  predictors: number;
  timeLeft: string;
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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

function PulseCard({ market, index }: { market: Market; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
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

  const tipping = Math.abs(market.yesPct - 50) < 8;

  return (
    <Link
      ref={ref}
      href={`/markets/${market.id}` as never}
      className={`group relative block rounded-lg border bg-bg-elevated p-4 transition-all duration-stage hover:-translate-y-[2px] hover:shadow-e4 ${
        tipping ? "border-warning-border" : "border-border hover:border-teal-500"
      }`}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 600ms cubic-bezier(.2,.8,.2,1), transform 600ms cubic-bezier(.2,.8,.2,1), border-color 200ms",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${
          tipping ? "border-warning-border bg-warning-bg/40 text-warning-fg" : "border-border bg-bg-overlay text-text-muted"
        }`}>
          {tipping ? "tipping" : market.category}
        </span>
        <span className="font-mono text-[10px] text-text-subtle">{market.timeLeft}</span>
        <ExternalLink size={12} className="ml-auto text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <h3 className="font-display text-[14px] font-semibold leading-tight text-text mb-1 line-clamp-2 min-h-[34px]">
        {market.titleEn}
      </h3>
      {market.titleSw && (
        <p className="text-[11px] italic text-text-subtle line-clamp-1 mb-3">{market.titleSw}</p>
      )}

      <TippingBar yesPct={market.yesPct} height={14} animate={revealed} showLabels={false} />

      <div className="mt-2.5 flex items-center justify-between font-mono text-[10px]">
        <span className="text-yes-300 font-bold">YES {market.yesPct}%</span>
        <span className="text-text-subtle">{market.predictors} predictors</span>
        <span className="text-no-300 font-bold">{100 - market.yesPct}% NO</span>
      </div>
    </Link>
  );
}
