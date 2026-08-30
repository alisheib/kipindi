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
import { sideWord } from "@/lib/side-label";
import { TippingBar } from "@/components/brand";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

// ⛔ `productLine` is REQUIRED, not optional. /live carries both products (see `pulse-grid`),
// and this type used to drop the field — so the hero named its sides in poll vocabulary over an
// Up & Down round. An optional field with a `?? "MARKET"` at the render would be the same bug
// wearing a default; required means `tsc` makes /live state it.
export type FeaturedMarket = { id: string; title: string; yesPct: number; productLine: "MARKET" | "UPDOWN" };

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
  const { t } = useT(); // V-7 — SR labels come from the dictionary now
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
        {/* min-w-0 + truncate lets the eyebrow yield at the smallest widths (≤320) so the
            44px arrow controls are never pushed off the panel edge; shrink-0 pins them. */}
        <p className="min-w-0 truncate font-mono text-micro uppercase eyebrow font-bold text-aqua-300">{eyebrow}</p>
        {multi && (
          <div className="flex shrink-0 items-center gap-2">
            <Arrow dir="prev" onClick={() => go(-1)} />
            <span className="font-mono text-[10.5px] tabular-nums text-text-subtle select-none">
              {idx + 1}<span className="text-text-faint"> / {n}</span>
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
        <TippingBar yesPct={m.yesPct} height={32} showLabels
          probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", m.productLine))}
          labels={{ yes: sideWord(t, "YES", m.productLine), no: sideWord(t, "NO", m.productLine), tipping: t.market.tipping, leansYes: t.market.leansYes, leansNo: t.market.leansNo }} />
        {/* `flex-wrap` (2026-08-21): the dot rail below grew from ~88px to 144px when its dots
            gained real hit areas (six slides at 24px, against six 6/18px dots on 8px gaps), so
            at 360 — where this panel has ~296px of content width — it can no longer be certain
            of sharing a line with the CTA. Wrapping is the correct yield: §A6 forbids
            horizontal overflow, and a squeezed rail would re-create the tiny targets the
            padding just removed. */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href={`/markets/${m.id}` as Route} className="btn btn-primary btn-md inline-flex">
            {openLabel}
          </Link>
          {/* 🔴 THE PAGER SAID TWO OPPOSITE THINGS ABOUT ITSELF, AND SHIPPED BOTH.
              The rail was `aria-hidden` — "there is nothing here" — while every dot inside it
              carried an `aria-label` and an `onClick`, which is a claim that each one is a
              named control. Written together, those cancel: the labels were unreachable (an
              aria-hidden subtree is removed from the tree wholesale, `tabIndex={-1}` or not),
              so a screen-reader user exploring by touch on a phone landed on six live buttons
              that announced nothing at all. The dots are REAL — they jump the carousel — so
              the contradiction is resolved in the direction of the truth: the subtree is
              exposed, the labels do their job, and `aria-current` carries the selected state
              that was previously signalled by colour and width alone (§A4).

              ⭐ THE HIT AREA IS PADDING, NOT A BIGGER DOT (§A2). The dot keeps its drawn size —
              6px wide, 18px when active — because a 40px dot is a different design. The BUTTON
              around it is 40px tall and 24px wide, which is the floor this repo actually
              instruments (`responsive-audit.mjs`: `height < 40 || width < 24`). The row's `gap`
              is dropped because the padding now provides the separation; ⛔ do not re-add one,
              it would stack on top of the padding and widen the rail a second time.
              ⚠️ `results/notable-carousel.tsx` is this component's declared twin and still
              carries the old shape; it is out of this change's scope, so the two are knowingly
              out of step until it gets the same treatment. */}
          {multi && (
            <div className="flex items-center">
              {markets.map((mm, i) => (
                <button
                  key={mm.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className="grid h-[40px] w-[24px] place-items-center rounded-md"
                  aria-current={i === idx ? "true" : undefined}
                  aria-label={t.market.showMarketN.replace("{n}", String(i + 1))}
                >
                  <span
                    className="block h-1.5 rounded-full transition-all"
                    style={{
                      width: i === idx ? 18 : 6,
                      background: i === idx ? "var(--aqua-400)" : "var(--border-strong)",
                    }}
                  />
                </button>
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
  const { t } = useT(); // V-7
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? t.market.prevMarket : t.market.nextMarket}
      /* ⚠️ LITERALS, not `h-11 w-11` — spacing is overridden (tailwind.config.ts:200-215),
         so `h-11` was 96px. Twin of results/notable-carousel.tsx — keep the two in step. */
      className="grid h-[44px] w-[44px] place-items-center rounded-full border transition-colors hover:bg-[color-mix(in_oklab,var(--aqua-400)_14%,transparent)]"
      style={{ borderColor: "color-mix(in oklab, var(--aqua-400) 55%, transparent)", color: "var(--aqua-300)" }}
    >
      <Icon s={16} />
    </button>
  );
}
