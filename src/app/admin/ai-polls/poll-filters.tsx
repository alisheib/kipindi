"use client";

import { useT } from "@/lib/i18n";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, POLL_SEARCH } from "@/lib/search";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { RefreshButton } from "@/components/admin/refresh-button";
import { FilterPill } from "@/components/ui/filter-pill";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";

const ALL_STATES = [
  { id: "", label: "All states" },
  { id: "PENDING_REVIEW", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "PUBLISHED", label: "Published" },
  { id: "FILTERED", label: "Didn't pass" },
  { id: "REJECTED", label: "Rejected" },
  { id: "VALIDATION_FAILED", label: "Failed" },
  { id: "GENERATING", label: "Generating" },
] as const;

const ALL_CATEGORIES = [
  { id: "", label: "All categories" },
  { id: "sports", label: "Sports" },
  { id: "macro", label: "Macro" },
  { id: "weather", label: "Weather" },
  { id: "crypto", label: "Crypto" },
  { id: "culture", label: "Culture" },
  { id: "infrastructure", label: "Infra" },
  { id: "tech", label: "Tech" },
] as const;

export function PollFilterToolbar({ totalFiltered, totalAll }: { totalFiltered: number; totalAll: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();
  const [, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") ?? "";
  const currentState = searchParams.get("state") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentDate = searchParams.get("range") ?? searchParams.get("from") ?? "";

  /**
   * ⭐ THE CHIPS ARE REAL LINKS NOW (S-07) — see candidate-filters.tsx for the reasoning.
   * `replace` + `scroll={false}`: a filter is not a navigation (kit README §3). Paging is reset
   * here as `push` used to do, or a narrowed list lands on a page number that no longer exists.
   */
  const hrefFor = useCallback((updates: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page"); // reset pagination on filter change
    const qs = sp.toString();
    return qs ? `/admin/ai-polls?${qs}` : "/admin/ai-polls";
  }, [searchParams]);

  const hasFilters = currentSearch || currentState || currentCategory || currentDate;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        {/* One SearchBox — was a bespoke input + a "Search" button with no
            debounce, and its own 420px cap. The cap now comes from the field
            measure token, and typing filters as you pause.
            ⛔ That change left a `useState` seeded from ?q behind, dead here but still
            wired to a live button on the /admin/candidates clone — where it was inert on
            load and DESTRUCTIVE after a Clear (S-06, scan #1, 2026-08-28). Both copies
            are gone. The atom owns ?q; nothing else in this file may hold it. */}
        <div className="flex-1">
          <SearchBox
            placeholder={t.common.searchPolls}
            ariaLabel={t.common.searchPolls}
            helpFields={fieldNames(POLL_SEARCH)}
            allowRegex
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              startTransition(() => router.push("/admin/ai-polls"));
            }}
            className="btn btn-ghost btn-xs rounded-pill text-text-subtle hover:text-text"
          >
            Clear
          </button>
        )}
        <RefreshButton variant="icon" className="ml-auto" />
      </div>

      {/* Filter chips row */}
      <div className="flex items-center gap-2 flex-wrap" data-filter-rail="poll-state">
        {/* Created-date window — platform date+hour+minute filter (presets + custom). */}
        <DateTimeRangeFilter defaultPreset="all" presetIds={["today", "yesterday", "7d", "30d", "all"]} />

        <span className="w-px h-5 bg-border/60" />

        {/* State filter — the ONE filter language at admin density (S-07). */}
        <div className="flex items-center gap-1 flex-wrap gap-y-1.5">
          <I.filter size={12} className="text-text-subtle mr-0.5" />
          {ALL_STATES.map((s) => (
            <FilterPill
              key={s.id}
              href={hrefFor({ state: s.id })}
              label={s.label}
              on={currentState === s.id}
              rank="dense"
              replace
              scroll={false}
              testId={`state:${s.id}`}
            />
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex items-center gap-1 flex-wrap" data-filter-rail="poll-category">
        {ALL_CATEGORIES.map((c) => (
          <FilterPill
            key={c.id}
            href={hrefFor({ category: c.id })}
            label={c.label}
            on={currentCategory === c.id}
            rank="dense"
            replace
            scroll={false}
            testId={`category:${c.id}`}
          />
        ))}

        {/* Result count */}
        <span className="ml-auto font-mono text-[10.5px] text-text-subtle tabular-nums">
          {totalFiltered === totalAll
            ? `${totalAll.toLocaleString()} polls`
            : `${totalFiltered.toLocaleString()} of ${totalAll.toLocaleString()} polls`}
        </span>
      </div>
    </div>
  );
}

