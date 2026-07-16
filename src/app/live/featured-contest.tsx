"use client";

/**
 * /live featured-contest carousel — the "hot poll on the large one".
 *
 * The aqua hero used to show only the single most-contested market. This lets
 * you swap through the top-N most-contested markets: it AUTO-ADVANCES (pausing
 * while hovered/focused), takes a left/right SWIPE on touch, and still offers the
 * aesthetic arrows, ←/→ keys and a dot rail. Each swap re-draws the TippingBar.
 * Reduced-motion: no auto-advance at all, and the cross-fade is CSS-guarded.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { TippingBar } from "@/components/brand";
import { I } from "@/components/ui/glyphs";

export type FeaturedMarket = { id: string; title: string; yesPct: number };

const AUTO_ADVANCE_MS = 6000;
const SWIPE_THRESHOLD = 40;

/** True if the OS OR the in-app "reduce motion" setting asks to limit motion. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const root = document.documentElement;
  if (root.classList.contains("kp-reduce-motion")) return true;
  const dm = root.getAttribute("data-motion");
  if (dm && dm !== "full") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function FeaturedContest({
  markets,
  eyebrow,
  openLabel,
}: {
  markets: FeaturedMarket[];
  eyebrow: string;
  openLabel: string;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = markets.length;
  const multi = n > 1;
  const go = useCallback((d: number) => setIdx((i) => (i + d + n) % n), [n]);

  // Auto-advance through the contested markets — but only when motion is allowed
  // and the player isn't hovering/focusing the hero (never yank a slide away
  // mid-read). Fully disabled under reduced-motion.
  useEffect(() => {
    if (!multi || paused || prefersReducedMotion()) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [multi, paused, n]);

  // Touch swipe: a horizontal drag past the threshold flips one slide.
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };

  if (n === 0) return null;
  const m = markets[Math.min(idx, n - 1)];

  return (
    <div
      className="mt-4"
      role="region"
      aria-label={eyebrow}
      aria-roledescription="carousel"
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={multi ? onTouchStart : undefined}
      onTouchEnd={multi ? onTouchEnd : undefined}
    >
      {/* Eyebrow + arrow controls */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-aqua-300">{eyebrow}</p>
        {multi && (
          <div className="flex items-center gap-2">
            <Arrow dir="prev" onClick={() => go(-1)} />
            <span className="font-mono text-[10.5px] tabular-nums text-text-subtle select-none">
              {idx + 1}<span className="text-text-tertiary"> / {n}</span>
            </span>
            <Arrow dir="next" onClick={() => go(1)} />
          </div>
        )}
      </div>

      {/* Featured market — keyed so the bar redraws on swap */}
      <div key={m.id} className="max-w-[64ch] contest-fade">
        <Link href={`/markets/${m.id}` as Route} className="group block">
          <h2 className="mb-4 font-display text-[19px] lg:text-[24px] font-semibold leading-tight text-text group-hover:text-aqua-100">
            {m.title}
          </h2>
        </Link>
        <TippingBar yesPct={m.yesPct} height={32} showLabels />
        <div className="mt-4 flex items-center gap-3">
          <Link href={`/markets/${m.id}` as Route} className="btn btn-primary btn-md inline-flex">
            {openLabel}
          </Link>
          {multi && (
            <div className="flex items-center gap-1.5" aria-hidden>
              {markets.map((mm, i) => (
                <button
                  key={mm.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === idx ? 18 : 6,
                    background: i === idx ? "var(--aqua-400)" : "var(--border-strong)",
                  }}
                  tabIndex={-1}
                  aria-label={`Show market ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Arrow({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const Icon = dir === "prev" ? I.chevronLeft : I.chevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous market" : "Next market"}
      className="grid h-11 w-11 place-items-center rounded-full border transition-colors hover:bg-[color-mix(in_oklab,var(--aqua-400)_14%,transparent)]"
      style={{ borderColor: "color-mix(in oklab, var(--aqua-400) 55%, transparent)", color: "var(--aqua-300)" }}
    >
      <Icon s={16} />
    </button>
  );
}
