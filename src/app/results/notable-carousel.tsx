"use client";

/**
 * /results "notable result" carousel (A19 delighter).
 *
 * Wraps the server-rendered `<FeaturedResult>` cards (passed in as `slides`) in a
 * light client shell that adds gold left/right arrows, ←/→ keys, a dot rail and
 * touch SWIPE. Unlike the /live hero it does NOT auto-advance — a settled result
 * is a thing you read, not a ticker. With a single slide it renders the card
 * plainly (no controls), so small result sets look exactly as before.
 */
import { useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

const SWIPE_THRESHOLD = 40;

export function NotableCarousel({
  slides,
  label,
  prevLabel,
  nextLabel,
}: {
  slides: ReactNode[];
  label: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const { t } = useT(); // V-7 — the dot-rail SR label comes from the dictionary
  const [idx, setIdx] = useState(0);
  const n = slides.length;
  const multi = n > 1;
  const go = useCallback((d: number) => setIdx((i) => (i + d + n) % n), [n]);

  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };

  if (n === 0) return null;
  const current = Math.min(idx, n - 1);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className="mb-5"
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      }}
      onTouchStart={multi ? onTouchStart : undefined}
      onTouchEnd={multi ? onTouchEnd : undefined}
    >
      {multi && (
        <div className="mb-2 flex items-center justify-end gap-2">
          <Arrow dir="prev" onClick={() => go(-1)} label={prevLabel} />
          <span className="font-mono text-[10.5px] tabular-nums text-text-subtle select-none">
            {current + 1}<span className="text-text-faint"> / {n}</span>
          </span>
          <Arrow dir="next" onClick={() => go(1)} label={nextLabel} />
        </div>
      )}

      {slides[current]}

      {/* ⭐ DG-P-07 · §A2 — THE DOT WAS THE BUTTON, SO THE TARGET WAS 6×8px.
          Re-derived: `h-1.5` is 8px on the OVERRIDDEN spacing scale (tailwind.config.ts:207),
          and the inline `width` was 6 inactive / 18 active — so the whole tappable box was the
          paint. ⭐ THE TARGET IS PADDED; THE DOT IS NOT THICKENED. This is the treatment its
          own declared twin already carries — `live/featured-contest.tsx:155-163`, whose comment
          reads "THE HIT AREA IS PADDING, NOT A BIGGER DOT (§A2) … a 40px dot is a different
          design", and which then says this file "still carries the old shape … the two are
          knowingly out of step until it gets the same treatment". This IS that treatment, so
          ⛔ that paragraph in `featured-contest.tsx` is now stale and must be retired.
          ⛔ THE `gap` GOES, and the twin says why in its own words: the 24px button supplies the
          separation, so a gap would stack on top of it and widen the rail a second time.
          ⚠️ 24px WIDE IS THE TWIN'S NUMBER, NOT §A2's. §A2 names ONE number — 40 — while
          `responsive-audit.mjs:292` instruments `height < 40 || width < 24`, and the twin was
          tuned to the guard. Matching the twin keeps two carousels identical and leaves the
          40-vs-24 width question where it belongs: a ruling for Ali, not an edit smuggled in
          by whichever of the two files was touched last.
          ⚠️ WHAT MOVES: the rail goes 8px → 40px tall (+32px under the featured card) and
          46px → 72px wide, still `justify-center`. A bounding box CANNOT prove this fix works
          (globals.css:4788 records exactly that trap) — the 40×24 wrapper measures 40×24
          whether or not the inner span steals the click, so re-prove it with
          `document.elementFromPoint`, the way `qa:toggle-hit` does.
          ⚠️ THE A11Y DIVERGENCE IS LEFT AS FOUND AND REPORTED, NOT SETTLED HERE: this row is
          `aria-hidden` with `tabIndex={-1}` (so the `aria-label` is dead weight) while the twin
          is in the a11y tree with `aria-current`. Two carousels must not disagree about that —
          but that is a semantics ruling, not the tap floor, and it needs one decision applied
          to BOTH files in one pass. */}
      {multi && (
        <div className="mt-2.5 flex items-center justify-center" aria-hidden>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              tabIndex={-1}
              aria-label={t.market.showResultN.replace("{n}", String(i + 1))} /* V-7 */
              className="grid h-[40px] w-[24px] place-items-center rounded-md"
            >
              <span
                className="block h-1.5 rounded-full transition-all"
                style={{
                  width: i === current ? 18 : 6,
                  background: i === current ? "var(--gold-400)" : "var(--border-strong)",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Arrow({ dir, onClick, label }: { dir: "prev" | "next"; onClick: () => void; label: string }) {
  const Icon = dir === "prev" ? I.chevronLeft : I.chevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      /* ⚠️ LITERALS, not `h-11 w-11` — spacing is overridden (tailwind.config.ts:200-215),
         so `h-11` was a 96px round button holding a 16px chevron. 44px = A2's mobile tap size. */
      className="grid h-[44px] w-[44px] place-items-center rounded-full border transition-colors hover:bg-[color-mix(in_oklab,var(--gold-400)_14%,transparent)]"
      style={{ borderColor: "color-mix(in oklab, var(--gold-400) 55%, transparent)", color: "var(--gold-300)" }}
    >
      <Icon s={16} />
    </button>
  );
}
