"use client";

import { useT } from "@/lib/i18n";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, POLL_SEARCH } from "@/lib/search";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { RefreshButton } from "@/components/admin/refresh-button";
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

  const push = useCallback((updates: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page"); // reset pagination on filter change
    startTransition(() => {
      router.push(`/admin/ai-polls?${sp.toString()}`);
    });
  }, [router, searchParams, startTransition]);

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
      <div className="flex items-center gap-2 flex-wrap">
        {/* Created-date window — platform date+hour+minute filter (presets + custom). */}
        <DateTimeRangeFilter defaultPreset="all" presetIds={["today", "yesterday", "7d", "30d", "all"]} />

        <span className="w-px h-5 bg-border/60" />

        {/* State filter */}
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

