"use client";

/**
 * Markets search — URL-driven (?q=) so results are SSR-rendered, shareable,
 * and survive a refresh, matching how the board's category/when filters already
 * work. Typing debounces into the URL (router.replace, so keystrokes don't pile
 * up in history); Enter searches immediately; the × clears. The server grid
 * (SearchAwareGrid) reads ?q and filters by title (EN/SW) + category, ignoring
 * the time-window so a market the player remembers is never hidden behind it.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";

export function MarketSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    const v = value.trim();
    if (v) sp.set("q", v);
    else sp.delete("q");
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `/markets?${qs}` : "/markets"));
  };

  // Debounce typing into the URL so the grid filters as you type.
  useEffect(() => {
    if ((searchParams.get("q") ?? "") === q.trim()) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(q), 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="relative">
      <I.search s={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (debounce.current) clearTimeout(debounce.current); push(q); } }}
        placeholder="Search markets — team, topic, keyword…"
        aria-label="Search markets · Tafuta soko"
        enterKeyHint="search"
        autoComplete="off"
        className="w-full h-11 pl-10 pr-10 rounded-pill border border-border bg-bg-elevated/60 font-mono text-[13px] text-text placeholder:text-text-subtle outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
      />
      {q && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setQ(""); if (debounce.current) clearTimeout(debounce.current); push(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"
        >
          <I.x s={15} />
        </button>
      )}
    </div>
  );
}
