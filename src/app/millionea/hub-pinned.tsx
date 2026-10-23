"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ⭐ S5-R2-HUB 26 · THE PINNED PAIR'S EDGE (the lead's design call, 2026-10-23; the tile readers: mid-scroll the rows that
 * read on in the column showed through the pair's fading foot, cut in half under the door). From 1024 the jackpot's head
 * and the door stand pinned at the header's foot on the page's own OPAQUE ground (`kp-mln-pinned`, globals.css), its top
 * at the bar's foot, so nothing that reads on in the column shows through the pair or in the gap above it. While the
 * pair stands pinned, its lower edge is one hairline, the kit's divider (`--border-divider`), so what passes under it
 * leaves at one clean edge. At rest the pair draws no edge: its foot lies in the column's gap, ground on ground.
 * `data-stuck` marks the pinned pair: the page has moved and the pair's top stands at its sticky offset (or above it, as
 * the column's end carries it off). It is only set from 1024, where the pair is pinned at all; below that the wrapper is
 * `contents`, and its blocks are the column's own cells.
 */
export function HubPinned({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const read = () => {
      frame = 0;
      const top = parseFloat(getComputedStyle(el).top);
      setStuck(wide.matches && window.scrollY > 0 && Number.isFinite(top) && el.getBoundingClientRect().top <= top + 0.5);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    wide.addEventListener("change", queue);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      wide.removeEventListener("change", queue);
    };
  }, []);
  return (
    <div ref={ref} className={className} data-testid="millionea-hub-pinned" data-stuck={stuck ? "" : undefined}>
      {children}
    </div>
  );
}
