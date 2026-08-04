"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";

const FEATURES = [
  { id: "", label: "All features" },
  { id: "sentinel", label: "Sentinel" },
  { id: "polls", label: "Poll gen" },
  { id: "chat", label: "Chatbot" },
  { id: "other", label: "Other" },
] as const;

const STATUSES = [
  { id: "", label: "All" },
  { id: "ok", label: "OK" },
  { id: "error", label: "Errors" },
] as const;

const DATE_PRESETS = [
  { id: "", label: "All time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
] as const;

export function AiUsageFilterToolbar({ totalFiltered, totalAll }: { totalFiltered: number; totalAll: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") ?? "";
  const currentFeature = searchParams.get("feature") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentDate = searchParams.get("date") ?? "";

  const [search, setSearch] = useState(currentSearch);

  const push = useCallback((updates: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page"); // reset pagination on filter change
    startTransition(() => router.push(`/admin/ai-usage?${sp.toString()}`));
  }, [router, searchParams, startTransition]);

  const hasFilters = currentSearch || currentFeature || currentStatus || currentDate;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[420px]">
          <I.search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") push({ q: search }); }}
            placeholder="Search model, error, or detail (e.g. sentinel, credit balance)…"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-bg-overlay text-[12.5px] text-text font-mono placeholder:text-text-subtle outline-none admin-focus transition-colors"
          />
        </div>
        <button type="button" onClick={() => push({ q: search })} className="btn btn-gold btn-sm rounded-pill h-9 min-w-[80px]">
          Search
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(""); startTransition(() => router.push("/admin/ai-usage")); }}
            className="btn btn-ghost btn-sm rounded-pill h-9 text-text-subtle hover:text-text"
          >
            Clear
          </button>
        )}
      </div>

      {/* Date presets + status */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <I.calendar size={12} className="text-text-subtle mr-0.5" />
          {DATE_PRESETS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => push({ date: d.id })}
              className={`px-2.5 py-1 rounded-pill text-[10.5px] font-mono uppercase tracking-[0.08em] border transition-colors ${
                currentDate === d.id
                  ? "border-gold bg-gold/10 text-gold-300 font-bold"
                  : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <span className="w-px h-5 bg-border/60" />

        <div className="flex items-center gap-1">
          <I.filter size={12} className="text-text-subtle mr-0.5" />
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => push({ status: s.id })}
              className={`px-2.5 py-1 rounded-pill text-[10.5px] font-mono uppercase tracking-[0.08em] border transition-colors ${
                currentStatus === s.id
                  ? "border-brand-500 bg-brand-500/10 text-brand-300 font-bold"
                  : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {FEATURES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => push({ feature: f.id })}
            className={`px-2.5 py-1 rounded-pill text-[10.5px] font-mono uppercase tracking-[0.08em] border transition-colors ${
              currentFeature === f.id
                ? "border-gold bg-gold/10 text-gold-300 font-bold"
                : "border-border bg-bg-overlay text-text-muted hover:border-text-subtle"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10.5px] text-text-subtle tabular-nums">
          {totalFiltered === totalAll
            ? `${totalAll.toLocaleString()} calls`
            : `${totalFiltered.toLocaleString()} of ${totalAll.toLocaleString()} calls`}
        </span>
      </div>
    </div>
  );
}
