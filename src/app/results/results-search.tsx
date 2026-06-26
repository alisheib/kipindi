"use client";

/**
 * Results search — URL-driven (?q=) with debounced router.replace,
 * same pattern as /markets MarketSearch. Resets to page 1 on search.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";

export function ResultsSearch() {
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
    // Reset to page 1 on new search
    sp.delete("page");
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `/results?${qs}` : "/results", { scroll: false }));
  };

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
        placeholder="Search results · Tafuta matokeo"
        aria-label="Search results"
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
