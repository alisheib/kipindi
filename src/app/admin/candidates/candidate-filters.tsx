"use client";

import { useT } from "@/lib/i18n";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, CANDIDATE_SEARCH } from "@/lib/search";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { RefreshButton } from "@/components/admin/refresh-button";
import { FilterPill } from "@/components/ui/filter-pill";
import { CANDIDATE_CATEGORIES, CANDIDATE_STATES, CATEGORY_LABEL, STATE_LABEL } from "@/lib/ai/poll-vocabulary";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";

/* ⭐ DERIVED, NOT RE-TYPED (S-08, scan #1, 2026-08-28). This rail offered 7 of `CandidateState`'s
   8 arms: `VERIFYING` was missing — and that is precisely the state a candidate sits in when
   verification hangs or fails, i.e. the one an officer most needs to find.
   ⛔ THE CATEGORIES ARE THE NARROWER SET, AND THAT IS CORRECT. The scan read this rail's six as
   "missing tech and other". It is not: a MarketCandidate can only ever hold the six in
   CANDIDATE_CATEGORIES, so adding the poll set's extra two would offer two filters that always
   return zero rows — a narrowing control that cannot narrow. Two vocabularies, two lists. */
const ALL_STATES = [
  { id: "", label: "All states" },
  ...CANDIDATE_STATES.map((id) => ({ id, label: STATE_LABEL[id] ?? id })),
];

const ALL_CATEGORIES = [
  { id: "", label: "All categories" },
  ...CANDIDATE_CATEGORIES.map((id) => ({ id, label: CATEGORY_LABEL[id] ?? id })),
];

export function CandidateFilterToolbar({ totalFiltered, totalAll }: { totalFiltered: number; totalAll: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();
  const [, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") ?? "";
  const currentState = searchParams.get("state") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentDate = searchParams.get("range") ?? searchParams.get("from") ?? "";

  /**
   * ⭐ THE CHIPS ARE REAL LINKS NOW (S-07). `FilterPill` renders a `next/link` and requires an
   * `href` — which is not an obstacle to work around, it is the better shape: a filter that
   * owns a URL should be middle-clickable, copyable and focusable as a link, and an admin
   * narrowing a list is exactly the person who wants to open two states in two tabs.
   *
   * ⚠️ `replace` and `scroll={false}` because a filter is not a navigation (kit README §3) —
   * the same props the player rails pass. Paging is reset here, as `push` used to do, or a
   * narrowed list would land on a page number that no longer exists.
   */
  const hrefFor = useCallback((updates: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    return qs ? `/admin/candidates?${qs}` : "/admin/candidates";
  }, [searchParams]);

  const hasFilters = currentSearch || currentState || currentCategory || currentDate;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        {/* One SearchBox — see poll-filters.tsx, which lost the same button first.
            ⛔ NO "Search" BUTTON HERE, and it is not an omission (S-06, scan #1,
            2026-08-28). The atom runs mode="url": it holds the input in its own state
            and debounces it into ?q, so it OWNS the param. The button this file used to
            carry pushed a SECOND copy held in a local useState that nothing wrote
            except Clear — inert on load, and destructive after a Clear, because it then
            pushed "" over whatever had since been typed. Re-adding a control that
            writes ?q re-creates two owners of one value; `test:search-adoption` §6
            fails on the state that makes it possible. */}
        <div className="flex-1">
          <SearchBox
            placeholder={t.common.searchCandidates}
            ariaLabel={t.common.searchCandidates}
            helpFields={fieldNames(CANDIDATE_SEARCH)}
            allowRegex
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              startTransition(() => router.push("/admin/candidates"));
            }}
            className="btn btn-ghost btn-xs rounded-pill text-text-subtle hover:text-text"
          >
            Clear
          </button>
        )}
        <RefreshButton variant="icon" className="ml-auto" />
      </div>

      {/* Filter chips — the ONE filter language at admin density (S-07). See `href` above. */}
      <div className="flex items-center gap-2 flex-wrap" data-filter-rail="candidate-state">
        {/* Created-date window — platform date+hour+minute filter (presets + custom). */}
        <DateTimeRangeFilter defaultPreset="all" presetIds={["today", "yesterday", "7d", "30d", "all"]} />

        <span className="w-px h-5 bg-border/60" />

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
      <div className="flex items-center gap-1 flex-wrap" data-filter-rail="candidate-category">
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
        <span className="ml-auto font-mono text-[10.5px] text-text-subtle tabular-nums">
          {totalFiltered === totalAll
            ? `${totalAll.toLocaleString()} candidates`
            : `${totalFiltered.toLocaleString()} of ${totalAll.toLocaleString()} candidates`}
        </span>
      </div>
    </div>
  );
}
