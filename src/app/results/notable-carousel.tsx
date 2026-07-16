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
            {current + 1}<span className="text-text-tertiary"> / {n}</span>
          </span>
          <Arrow dir="next" onClick={() => go(1)} label={nextLabel} />
        </div>
      )}

      {slides[current]}

      {multi && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              tabIndex={-1}
              aria-label={`Show notable result ${i + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === current ? 18 : 6,
                background: i === current ? "var(--gold-400)" : "var(--border-strong)",
              }}
            />
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
      className="grid h-11 w-11 place-items-center rounded-full border transition-colors hover:bg-[color-mix(in_oklab,var(--gold-400)_14%,transparent)]"
      style={{ borderColor: "color-mix(in oklab, var(--gold-400) 55%, transparent)", color: "var(--gold-300)" }}
    >
      <Icon s={16} />
    </button>
  );
}
