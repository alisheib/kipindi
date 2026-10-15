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
import { formatNumber } from "@/lib/utils";

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
            {formatNumber(current + 1)}<span className="text-text-faint"> / {formatNumber(n)}</span>
          </span>
          <Arrow dir="next" onClick={() => go(1)} label={nextLabel} />
        </div>
      )}

      {/* 🔴 EVERY SLIDE IS IN THE DOCUMENT; ONLY ONE IS SHOWN. It rendered `{slides[current]}`,
          so on page one up to TWO settled markets existed nowhere in the document — and this
          page's own note beside `data-result-count` records the consequence: its stated total
          "cannot be reconstructed from the DOM". §3 rule 5 asks the opposite of that: the count
          is published precisely so an instrument can check the promise against the delivery, and
          `qa:player-filters` measured it as **promised 8, delivered 5**.
          ⛔ `hidden`, not unmounted: the campaign's own instrumentation reads `[data-row-id]`
          without regard to visibility, so the rows become countable while nothing changes on
          screen. It also means a player with no JavaScript, and a crawler, now see all three
          notable results instead of one.
          ⚠️ `aria-hidden` on the inactive slides keeps a screen reader from reading three cards
          where a sighted reader sees one, and `responsive-audit` skips zero-width boxes, so no
          false overflow is introduced. */}
      {/* 🔴 THE SLIDES ARE STACKED IN ONE GRID CELL, so this box is always as tall as the
          TALLEST notable result and the grid below it does not move when a dot is tapped.
          Measured on production 2026-09-24 at 360 in Swahili: the three slides rendered 458 /
          436 / 413px and the results grid sat at 919 / 897 / 874 — **45px of travel per tap**, on
          a control whose entire purpose is "show me the next one".
          ⚠️ CLS SCORES THAT ZERO and always will: the move happens within 500ms of the tap, so
          `hadRecentInput` excludes it. A player asked to see another result, not to have the
          board slide out from under the one they were reading. Do not reach for the metric here.
          ⛔ `visibility: hidden` REPLACES THE `hidden` ATTRIBUTE, and the swap is exact for every
          reason the paragraph below gives: the slides stay in the DOM, so `[data-row-id]` is
          still countable and a crawler still sees all three; they stay out of the a11y tree and
          out of the tab order, so a screen reader still meets one card and Tab cannot reach the
          share button on a card nobody can see. What changes is only that a hidden slide still
          contributes its BOX — which is the whole point, and which `responsive-audit` is already
          built for: it skips `visibility: hidden` explicitly in all three of its checks (the
          overflow pass, the clipped-ancestor pass and the tap-target pass), not merely by
          zero-size, so no false overflow is introduced by laying them out. */}
      <div className="kp-slide-stack">
        {slides.map((s, i) => (
          <div key={i} data-slide-active={i === current ? "" : undefined} aria-hidden={i !== current || undefined}>
            {s}
          </div>
        ))}
      </div>

      {/* F05: the dot remains 6px (18px active), centred inside a 40×40 target. The loading drawing uses the same target size. */}
      {multi && (
        <div className="mt-2.5 flex items-center justify-center" aria-hidden>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              tabIndex={-1}
              aria-label={t.market.showResultN.replace("{n}", String(i + 1))} /* V-7 */
              className="grid h-[40px] min-w-[40px] place-items-center rounded-md px-[9px]"
            >
              {/* The current slide is "this one": the brand family's pip (`--brand-400`, the journey rail's dot), never gold
                  — a carousel's place is not money (Q5; R5-C, the second gold audit, 2026-10-09). The /live twin
                  (`featured-contest.tsx`) reads the same ink, so two carousels agree. */}
              <span
                className="block h-[6px] rounded-full transition-[width,background-color] duration-quick ease-glide"
                style={{
                  width: i === current ? 18 : 6,
                  background: i === current ? "var(--brand-400)" : "var(--border-strong)",
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
      /* The arrows are controls, in the brand family (R5-C, 2026-10-09) — the /live twin's arrows read the same. */
      className="grid h-[44px] w-[44px] place-items-center rounded-full border transition-colors hover:bg-[color-mix(in_oklab,var(--brand-400)_14%,transparent)]"
      style={{ borderColor: "color-mix(in oklab, var(--brand-400) 55%, transparent)", color: "var(--brand-300)" }}
    >
      <Icon s={16} />
    </button>
  );
}
