"use client";

/**
 * Markets search — URL-driven (?q=) so results are SSR-rendered, shareable,
 * and survive a refresh, matching how the board's category/when filters already
 * work. Typing debounces into the URL (router.replace + scroll:false, so
 * keystrokes don't pile up in history or jump the page); Enter searches now;
 * the × clears. The server grid (SearchAwareGrid) reads ?q and filters by title
 * (EN/SW) + category + criterion, ignoring the time-window so a market the
 * player remembers is never hidden.
 *
 * Built on the kit's `.input-group` / `.prefix` / `.input` primitives (globals.css,
 * + the `.market-search` cap) so the height, sunken background, focus ring, and
 * iOS 16px font polish all match every other field on the platform.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";

export function MarketSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searching, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    const v = value.trim();
    if (v) sp.set("q", v);
    else sp.delete("q");
    const qs = sp.toString();
    // scroll:false keeps the viewport put while the grid updates beneath.
    startTransition(() => router.replace(qs ? `/markets?${qs}` : "/markets", { scroll: false }));
  };

  // Debounce typing into the URL so the grid filters shortly after you pause.
  useEffect(() => {
    if ((searchParams.get("q") ?? "") === q.trim()) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(q), 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="input-group market-search">
      <span className="prefix" aria-hidden>
        {searching ? <Spinner size={16} /> : <I.search s={16} />}
      </span>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (debounce.current) clearTimeout(debounce.current); push(q); } }}
        placeholder="Search markets · Tafuta soko"
        aria-label="Search markets"
        enterKeyHint="search"
        autoComplete="off"
        className="input input-mono"
      />
      {q && (
        <button
          type="button"
          aria-label="Clear search"
          className="clear-btn"
          onClick={() => { setQ(""); if (debounce.current) clearTimeout(debounce.current); push(""); }}
        >
          <I.x s={15} />
        </button>
      )}
    </div>
  );
}
