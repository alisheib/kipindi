"use client";

import { useT } from "@/lib/i18n";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, CANDIDATE_SEARCH } from "@/lib/search";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { RefreshButton } from "@/components/admin/refresh-button";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";

const ALL_STATES = [
  { id: "", label: "All states" },
  { id: "PENDING_REVIEW", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "PUBLISHED", label: "Published" },
  { id: "FILTERED_OUT", label: "Filtered" },
  { id: "REJECTED", label: "Rejected" },
  { id: "EXTRACTED", label: "Extracted" },
  { id: "SCORED", label: "Scored" },
] as const;

const ALL_CATEGORIES = [
  { id: "", label: "All categories" },
  { id: "sports", label: "Sports" },
  { id: "macro", label: "Macro" },
  { id: "weather", label: "Weather" },
  { id: "crypto", label: "Crypto" },
  { id: "culture", label: "Culture" },
  { id: "infrastructure", label: "Infra" },
] as const;

export function CandidateFilterToolbar({ totalFiltered, totalAll }: { totalFiltered: number; totalAll: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();
  const [, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") ?? "";
  const currentState = searchParams.get("state") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentDate = searchParams.get("range") ?? searchParams.get("from") ?? "";

  const [search, setSearch] = useState(currentSearch);

  const push = useCallback((updates: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    startTransition(() => {
      router.push(`/admin/candidates?${sp.toString()}`);
    });
  }, [router, searchParams, startTransition]);

  const hasFilters = currentSearch || currentState || currentCategory || currentDate;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        {/* One SearchBox — see poll-filters.tsx. */}
        <div className="flex-1">
          <SearchBox
            placeholder={t.common.searchCandidates}
            ariaLabel={t.common.searchCandidates}
            helpFields={fieldNames(CANDIDATE_SEARCH)}
            allowRegex
          />
        </div>
        <button
          type="button"
          onClick={() => push({ q: search })}
          className="btn btn-primary btn-sm rounded-pill min-w-[80px] h-8"
        >
          Search
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              startTransition(() => router.push("/admin/candidates"));
            }}
            className="btn btn-ghost btn-sm rounded-pill text-text-subtle hover:text-text h-8"
          >
            Clear
          </button>
        )}
        <RefreshButton variant="icon" className="ml-auto" />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Created-date window — platform date+hour+minute filter (presets + custom). */}
        <DateTimeRangeFilter defaultPreset="all" presetIds={["today", "yesterday", "7d", "30d", "all"]} />

        <span className="w-px h-5 bg-border/60" />

        <div className="flex items-center gap-1 flex-wrap gap-y-1.5">
          <I.filter size={12} className="text-text-subtle mr-0.5" />
          {ALL_STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => push({ state: s.id })}
              className={`px-2.5 py-1 rounded-pill text-[10.5px] font-mono uppercase tracking-[0.08em] border transition-colors ${
                currentState === s.id
                  ? "border-brand-500 bg-brand-500/10 text-brand-300 font-bold"
                  : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => push({ category: c.id })}
            className={`px-2.5 py-1 rounded-pill text-[10.5px] font-mono uppercase tracking-[0.08em] border transition-colors ${
              currentCategory === c.id
                ? "border-brand-500 bg-brand-500/10 text-brand-300 font-bold"
                : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
            }`}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10.5px] text-text-subtle tabular-nums">
          {totalFiltered === totalAll
            ? `${totalAll.toLocaleString()} candidates`
            : `${totalFiltered.toLocaleString()} of ${totalAll.toLocaleString()} candidates`}
        </span>
      </div>
    </div>
  );
}
